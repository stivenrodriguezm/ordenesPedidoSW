import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContext } from '../AppContext';
import API from '../services/api';
import UsuariosPage from './UsuariosPage';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
const cuenta = { id: 5, username: 'stiven', first_name: 'Stiven', last_name: 'Rodriguez', role: 'administrador', is_active: true, acceso_rapido_ia: true };
function montar(usuario, reloadUser = vi.fn()) {
    render(<AppContext.Provider value={{ usuario, reloadUser }}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><UsuariosPage /></QueryClientProvider></AppContext.Provider>);
}
beforeEach(() => {
    vi.resetAllMocks();
    API.get.mockResolvedValue({ data: { count: 1, results: [cuenta] } });
    API.put.mockResolvedValue({ data: cuenta });
});
describe('Configuración individual del acceso rápido IA', () => {
    it('un administrador guarda la preferencia de su cuenta y actualiza su sesión', async () => {
        const reloadUser = vi.fn().mockResolvedValue({ ...cuenta, acceso_rapido_ia: false });
        montar(cuenta, reloadUser);
        fireEvent.click(await screen.findByRole('button', { name: 'Editar Usuario' }));
        const toggle = screen.getByRole('checkbox', { name: /Botón de acceso rápido al chat de IA/ });
        expect(toggle).toBeChecked();
        fireEvent.click(toggle);
        fireEvent.click(screen.getByRole('button', { name: 'Guardar Datos' }));
        await waitFor(() => expect(API.put).toHaveBeenCalledWith('/usuarios/5/', expect.objectContaining({ acceso_rapido_ia: false, role: 'administrador' })));
        await waitFor(() => expect(reloadUser).toHaveBeenCalledOnce());
        expect(await screen.findByText('Usuario guardado exitosamente.')).toBeInTheDocument();
    });
    it('el gestor de usuarios sin rol administrador omite esta configuración del formulario y del envío', async () => {
        API.get.mockResolvedValue({ data: { count: 1, results: [{ ...cuenta, id: 8, role: 'vendedor' }] } });
        montar({ id: 10, role: 'marketing', permissions: ['VER_USUARIOS', 'ADMINISTRAR_USUARIOS'] });
        fireEvent.click(await screen.findByRole('button', { name: 'Editar Usuario' }));
        expect(screen.queryByRole('checkbox', { name: /Botón de acceso rápido/ })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar Datos' }));
        await waitFor(() => expect(API.put).toHaveBeenCalledOnce());
        expect(API.put.mock.calls[0][1]).not.toHaveProperty('acceso_rapido_ia');
    });
});
