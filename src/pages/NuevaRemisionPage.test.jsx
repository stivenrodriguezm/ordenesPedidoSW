import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import API from '../services/api';
import { AppContext } from '../AppContext';
import NuevaRemisionPage from './NuevaRemisionPage';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const venta = {
    id: 14036, fecha_venta: '2026-10-06', fecha_entrega: '2026-10-10', valor_total: 1000, saldo: 1000, vendedor: 2,
    vendedor_nombre: 'Ana', vendedores_compartidos_nombres: '',
    cliente: { id: 37, nombre: 'Cliente Prueba', cedula: '123', telefono1: '300', telefono2: '', direccion: '', barrio: '', ciudad: '' },
    inventario: [],
    pedidos: [
        { detalle_id: 1, orden_id: 1, orden_estado: 'recibido', orden_estado_label: 'Recibido', referencia_nombre: 'Sofá Milán', categoria: null,
            subcategoria: null, subcategoria_nombre: '', cantidad: 1, especificaciones: 'Sofá 3 puestos\nTela lino arena', tela: '',
            en_inventario: false, recibidas: 0, remision_previa: null, cantidad_por_remisionar: 1 },
    ],
    remisiones_previas: [],
};

const montar = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AppContext.Provider value={{ notify: vi.fn(), usuario: { role: 'administrador', permissions: ['ALL'] } }}>
            <MemoryRouter initialEntries={['/suministros/remisiones/nueva?venta=14036']}>
                <NuevaRemisionPage />
            </MemoryRouter>
        </AppContext.Provider>
    </QueryClientProvider>,
);

beforeEach(() => {
    vi.resetAllMocks();
    API.get.mockImplementation(async (url) => {
        if (url === '/suministros/remisiones/datos-ventas/') return { data: [venta] };
        if (url === '/suministros/remisiones/catalogo/') return { data: { categorias: [], referencias: [] } };
        return { data: [] };
    });
});

describe('Nueva remisión (orden y diseño compacto, 2026-11-10)', () => {
    it('ordena venta, cliente y entrega, cobro y notas, y productos al final', async () => {
        montar();
        await screen.findByText('Cliente Prueba', { selector: '.nr-venta-fila__cliente' });
        const titulos = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);
        expect(titulos).toEqual(['¿Qué ventas vas a entregar?', 'Cliente y entrega', 'Cobro y notas', 'Productos a entregar']);
        // Con una venta elegida, el buscador de otra venta queda detrás de un enlace.
        expect(screen.queryByLabelText('Buscar venta')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Agregar otra venta en el mismo viaje/ }));
        expect(screen.getByLabelText('Buscar venta')).toBeInTheDocument();
    });

    it('cada producto va en una línea y sus campos se abren con «Editar»', async () => {
        montar();
        const fila = (await screen.findByText('Sofá Milán')).closest('.rp-fila');
        expect(within(fila).getByText('Sofá 3 puestos')).toBeInTheDocument();  // primera línea de la descripción
        expect(within(fila).getByText('1 u.')).toBeInTheDocument();
        expect(screen.queryByLabelText('Descripción')).not.toBeInTheDocument();
        fireEvent.click(within(fila).getByRole('button', { name: 'Editar Sofá Milán' }));
        expect(screen.getByLabelText('Descripción')).toHaveValue('Sofá 3 puestos\nTela lino arena');
        fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
        expect(screen.queryByLabelText('Descripción')).not.toBeInTheDocument();
    });
});
