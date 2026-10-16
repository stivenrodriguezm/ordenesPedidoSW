import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContext } from '../../AppContext';
import API from '../../services/api';
import ChatLateralProvider from './ChatLateralProvider';

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
function Pagina() { const l = useLocation(); return <><output>{l.pathname}</output><Link to="/ventas">Ir a ventas</Link></>; }
function montar(usuario) {
    return render(<AppContext.Provider value={{ usuario }}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
        <MemoryRouter initialEntries={['/clientes']}><ChatLateralProvider><Pagina /></ChatLateralProvider></MemoryRouter>
    </QueryClientProvider></AppContext.Provider>);
}
beforeEach(() => {
    vi.resetAllMocks();
    API.get.mockImplementation(async url => ({ data: url === '/asistente/estado/' ? { configurado: true, general: { visible: true }, modelos: [] } : [] }));
});
describe('Acceso rápido personal a IA', () => {
    it('respeta la preferencia individual incluso para administradores y exige permiso de IA', () => {
        const a = montar({ role: 'administrador', acceso_rapido_ia: false });
        expect(screen.queryByRole('button', { name: 'Abrir chat de IA' })).not.toBeInTheDocument();
        a.unmount();
        montar({ role: 'vendedor', acceso_rapido_ia: true, permissions: [] });
        expect(screen.queryByRole('button', { name: 'Abrir chat de IA' })).not.toBeInTheDocument();
        expect(API.get).not.toHaveBeenCalled();
    });
    it('abre sobre la página actual, conserva el borrador al navegar y lo reinicia al cerrar con X', async () => {
        montar({ role: 'administrador', acceso_rapido_ia: true });
        fireEvent.click(screen.getByRole('button', { name: 'Abrir chat de IA' }));
        await screen.findByRole('region', { name: 'Chat de IA' });
        const entrada = await screen.findByPlaceholderText(/Escribe tu pregunta para/);
        fireEvent.change(entrada, { target: { value: 'Mi borrador' } });
        fireEvent.click(screen.getByRole('link', { name: 'Ir a ventas' }));
        expect(screen.getByText('/ventas')).toBeInTheDocument();
        expect(entrada).toHaveValue('Mi borrador');
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar chat y volver a la plataforma' }));
        await waitFor(() => expect(screen.queryByRole('region', { name: 'Chat de IA' })).not.toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: 'Abrir chat de IA' }));
        expect(await screen.findByPlaceholderText(/Escribe tu pregunta para/)).toHaveValue('');
        expect(API.post).not.toHaveBeenCalled();
    });
    it('muestra un fallo recuperable sin navegar ni abrir un panel vacío', async () => {
        API.get.mockRejectedValueOnce(new Error('Sin red'));
        montar({ role: 'administrador', acceso_rapido_ia: true });
        fireEvent.click(screen.getByRole('button', { name: 'Abrir chat de IA' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo abrir el chat');
        expect(screen.getByText('/clientes')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Abrir chat de IA' })).toBeEnabled();
    });
});
