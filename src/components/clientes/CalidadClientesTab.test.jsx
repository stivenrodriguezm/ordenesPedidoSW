import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContext } from '../../AppContext';
import API from '../../services/api';
import CalidadClientesTab from './CalidadClientesTab';

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const cliente = { id: 1, nombre: '  María  López ', cedula: '001.234-56', telefono1: '301 234 5678', ciudad: 'Bogotá' };
const otro = { ...cliente, id: 2, nombre: 'Maria Lopez', cedula: '00123456' };
const ficha = {
    cliente, version: 'version-1',
    cambios: { nombre: { antes: cliente.nombre, despues: 'María López' }, telefono1: { antes: cliente.telefono1, despues: '3012345678' } },
};
const pagina = results => ({ count: results.length, results, next: null, previous: null });
const permisos = ['VER_CLIENTES', 'VER_CALIDAD_CLIENTES', 'EDITAR_CLIENTE', 'NORMALIZAR_CLIENTES'];
const grupo = { id: '1-2', razones: ['Documento coincidente al comparar espacios'], clientes: [cliente, otro] };

function montar(permissions = permisos) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
    return render(<QueryClientProvider client={client}>
        <AppContext.Provider value={{ usuario: { id: 8, role: 'auxiliar', permissions } }}><CalidadClientesTab /></AppContext.Provider>
    </QueryClientProvider>);
}

async function abrirFicha(user) {
    await user.click(await screen.findByRole('tab', { name: 'Fichas por corregir' }));
    await user.click(await screen.findByRole('button', { name: 'Revisar cliente 1' }));
    await screen.findByLabelText('Corregir Teléfono 1');
    return screen.getByRole('dialog');
}

beforeEach(() => {
    vi.resetAllMocks();
    API.get.mockImplementation(async (url) => {
        if (url === '/calidad-clientes/candidatos/') return { data: { ...pagina([grupo]), clientes_revisados: 2 } };
        if (url === '/calidad-clientes/') return { data: pagina([ficha]) };
        if (url === '/calidad-clientes/1/') return { data: ficha };
        if (url === '/calidad-clientes/1/historial/') return { data: pagina([]) };
        if (url === '/calidad-clientes/comparar/') return { data: { origen: cliente, destino: otro, conflictos: ['nombre', 'cedula'], ventas_visibles: { origen: 1, destino: 2 } } };
        throw new Error(`Ruta no prevista: ${url}`);
    });
    API.post.mockResolvedValue({ data: { revision: 23 } });
});

describe('Calidad de clientes (pestaña de Bases de datos)', () => {
    it('abre en posibles duplicados con el motivo corto y compara dos fichas sin fusionar', async () => {
        const user = userEvent.setup();
        montar();
        expect(await screen.findByText('Mismo documento')).toBeInTheDocument();
        expect(screen.getByLabelText('Elegir ficha 1')).toBeChecked();
        await user.click(screen.getByRole('button', { name: 'Comparar las 2 elegidas' }));
        expect(await screen.findAllByText('Diferente')).toHaveLength(2);
        expect(API.get).toHaveBeenCalledWith('/calidad-clientes/comparar/', { params: { origen: 1, destino: 2 } });
        expect(screen.getByText(/no une fichas ni mueve documentos/)).toBeInTheDocument();
        expect(API.post).not.toHaveBeenCalled();
    });

    it('fichas por corregir: solo las que tienen cambios y guarda únicamente lo elegido', async () => {
        const user = userEvent.setup();
        montar();
        const modal = await abrirFicha(user);
        expect(API.get).toHaveBeenCalledWith('/calidad-clientes/', { params: { buscar: '', page: 1, con_correcciones: 1 } });
        const guardar = within(modal).getByRole('button', { name: 'Guardar correcciones seleccionadas' });
        expect(guardar).toBeDisabled();
        await user.click(within(modal).getByLabelText('Corregir Teléfono 1'));
        await user.click(guardar);
        await waitFor(() => expect(API.post).toHaveBeenCalledWith('/calidad-clientes/1/normalizar/',
            { version: 'version-1', campos: ['telefono1'] }, { headers: { 'Idempotency-Key': expect.any(String) } }));
        expect(await screen.findByText(/Correcciones guardadas/)).toBeInTheDocument();
    });

    it.each(['EDITAR_CLIENTE', 'NORMALIZAR_CLIENTES'])('sin %s queda en modo lectura', async (permiso) => {
        const user = userEvent.setup();
        montar(permisos.filter(p => p !== permiso));
        const modal = await abrirFicha(user);
        expect(within(modal).getByLabelText('Corregir Teléfono 1')).toBeDisabled();
        expect(within(modal).queryByRole('button', { name: 'Guardar correcciones seleccionadas' })).not.toBeInTheDocument();
    });

    it('tras perder la respuesta reintenta con la misma clave', async () => {
        const user = userEvent.setup();
        API.post.mockRejectedValueOnce(new Error('Sin respuesta'));
        montar();
        await abrirFicha(user);
        await user.click(screen.getByLabelText('Corregir Teléfono 1'));
        await user.click(screen.getByRole('button', { name: 'Guardar correcciones seleccionadas' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Sin respuesta del servidor');
        await user.click(screen.getByRole('button', { name: 'Guardar correcciones seleccionadas' }));
        await screen.findByText(/Correcciones guardadas/);
        expect(API.post.mock.calls[0]).toEqual(API.post.mock.calls[1]);
    });

    it('un conflicto permite recargar la ficha y borra la selección', async () => {
        const user = userEvent.setup();
        API.post.mockRejectedValueOnce({ response: { status: 409, data: { detail: 'El cliente cambió después de la vista previa.' } } });
        montar();
        await abrirFicha(user);
        await user.click(screen.getByLabelText('Corregir Teléfono 1'));
        await user.click(screen.getByRole('button', { name: 'Guardar correcciones seleccionadas' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('El cliente cambió');
        API.get.mockResolvedValueOnce({ data: { ...ficha, version: 'version-2' } });
        await user.click(screen.getByRole('button', { name: 'Volver a cargar ficha' }));
        await waitFor(() => expect(screen.getByLabelText('Corregir Teléfono 1')).not.toBeChecked());
        expect(API.post).toHaveBeenCalledTimes(1);
    });

    it('un error de revisión no se muestra como lista vacía', async () => {
        API.get.mockRejectedValue({ response: { status: 413, data: { detail: 'La revisión supera 5000 clientes.' } } });
        montar();
        expect(await screen.findByText('La revisión supera 5000 clientes.')).toBeInTheDocument();
        expect(screen.queryByText(/No se encontraron/)).not.toBeInTheDocument();
    });
});
