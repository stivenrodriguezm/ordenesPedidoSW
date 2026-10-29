import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../services/api';
import DesarrolladorPage from './DesarrolladorPage';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const PLAN = { entendido: 'Agregar la ciudad del cliente en Ventas', pasos: ['Serializer', 'Columna'], archivos: ['frontend/src/pages/Ventas.jsx'],
    riesgo: 'alto', riesgos: ['Puede hacer más lenta la tabla'], cambia_base_datos: true, cambios_pantalla: 'Nueva columna Ciudad', preguntas: [] };
const tarea = (extra = {}) => ({ id: 3, pedido: 'En Ventas agrega la ciudad del cliente', estado: 'plan_listo', estado_nombre: 'Plan listo para aprobar',
    plan: PLAN, resultado: {}, ajustes: [], eventos: [{ t: '2026-10-28T20:00:00Z', texto: 'Plan listo' }], diff: '', vista_previa: '', ...extra });

const montar = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><DesarrolladorPage /></MemoryRouter></QueryClientProvider>);

describe('Desarrollador', () => {
    let actual;
    beforeEach(() => {
        vi.resetAllMocks();
        actual = tarea();
        API.get.mockImplementation(async (url) => ({ data: url.endsWith('/estado/') ? { configurado: true, servicio_activo: true, pendientes: 1 }
            : url.endsWith('/tareas/') ? [actual] : actual }));
    });

    it('muestra el plan con su riesgo y lo aprueba confirmando el riesgo alto', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        API.post.mockResolvedValue({ data: tarea({ estado: 'aprobada', estado_nombre: 'Aprobada, en cola' }) });
        montar();
        const plan = await screen.findByRole('region', { name: 'Plan propuesto' });
        expect(within(plan).getByText('Riesgo alto')).toBeInTheDocument();
        expect(within(plan).getByText(/Cambia la base de datos/)).toBeInTheDocument();
        expect(within(plan).getByText('Puede hacer más lenta la tabla')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Aprobar y aplicar' }));
        expect(window.confirm).toHaveBeenCalled();
        await waitFor(() => expect(API.post).toHaveBeenCalledWith('/desarrollador/tareas/3/aprobar/', {}));
        expect(await screen.findByText('Aprobada, en cola', { selector: '.dv-card .ds-badge' })).toBeInTheDocument();
    });

    it('pide ajustes al plan y envía un pedido nuevo', async () => {
        API.post.mockImplementation(async (url) => ({ data: url.includes('ajustar') ? tarea({ estado: 'planificando', estado_nombre: 'Preparando el plan' }) : tarea({ id: 4 }) }));
        montar();
        fireEvent.click(await screen.findByRole('button', { name: 'Pedir ajustes' }));
        fireEvent.change(screen.getByLabelText('¿Qué cambiarías del plan?'), { target: { value: 'Que salga en el Excel' } });
        fireEvent.click(screen.getByRole('button', { name: 'Enviar ajustes' }));
        await waitFor(() => expect(API.post).toHaveBeenCalledWith('/desarrollador/tareas/3/ajustar/', { texto: 'Que salga en el Excel' }));
        const pedir = screen.getByRole('button', { name: 'Pedir mejora' });
        expect(pedir).toBeDisabled();
        fireEvent.change(screen.getByLabelText('¿Qué quieres mejorar?'), { target: { value: 'Que el botón Guardar sea verde' } });
        fireEvent.click(pedir);
        await waitFor(() => expect(API.post).toHaveBeenCalledWith('/desarrollador/tareas/', { pedido: 'Que el botón Guardar sea verde' }));
    });

    it('aplicada en la plataforma se deshace con confirmación', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        actual = tarea({ estado: 'aplicada', estado_nombre: 'Aplicada en la plataforma', diff: '+ azul',
            resultado: { resumen: 'Sidebar azul', cambios_pantalla: 'Menú lateral', verificaciones: 'Pruebas, lint y build sin errores.' } });
        API.post.mockResolvedValue({ data: tarea({ estado: 'deshaciendo', estado_nombre: 'Deshaciendo' }) });
        montar();
        expect(await screen.findByRole('heading', { name: 'Aplicado en tu plataforma' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Ver vista previa/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Descartar' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
        expect(window.confirm).toHaveBeenCalled();
        await waitFor(() => expect(API.post).toHaveBeenCalledWith('/desarrollador/tareas/3/deshacer/', {}));
    });

    it('en pruebas ofrece la vista previa y los cambios técnicos', async () => {
        actual = tarea({ estado: 'en_pruebas', estado_nombre: 'Lista en pruebas', vista_previa: 'https://pruebas.example/', diff: '+ ciudad',
            resultado: { resumen: 'Columna agregada', cambios_pantalla: 'Ventas → columna Ciudad', verificaciones: 'Pruebas sin errores' } });
        montar();
        expect(await screen.findByRole('link', { name: /Ver vista previa/ })).toHaveAttribute('href', 'https://pruebas.example/');
        expect(screen.getByText('Columna agregada')).toBeInTheDocument();
        expect(screen.getByText('Ver cambios técnicos')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Aprobar y aplicar' })).not.toBeInTheDocument();
    });
});
