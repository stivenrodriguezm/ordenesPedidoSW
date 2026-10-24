import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppContext } from '../AppContext';
import API from '../services/api';
import NuevaVenta from './NuevaVenta';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../hooks/useSharedData', () => ({ useVendedores: () => ({ data: [], isError: false }) }));
vi.mock('../hooks/useBorrador', () => ({ useBorrador: () => ({ limpiarTrasGuardar: vi.fn() }) }));
vi.mock('../hooks/useIdempotencia', () => ({ useIdempotencia: () => ({ cabeceras: () => ({}), confirmar: vi.fn() }) }));

function montar() {
    return render(<MemoryRouter><AppContext.Provider value={{ usuario: { id: 1 }, notify: vi.fn() }}><NuevaVenta /></AppContext.Provider></MemoryRouter>);
}
beforeEach(() => { vi.resetAllMocks(); API.get.mockResolvedValue({ data: { results: [] } }); API.post.mockResolvedValue({ data: { venta_id: 1 } }); });

describe('Cliente en nueva venta', () => {
    it('permite crear una persona jurídica con razón social y NIT', async () => {
        const user = userEvent.setup();
        montar();
        await user.selectOptions(screen.getByLabelText('Tipo de persona'), 'juridica');
        fireEvent.change(screen.getByLabelText('Razón social:'), { target: { value: 'Empresa ficticia SAS' } });
        fireEvent.change(screen.getByLabelText('NIT:'), { target: { value: '900123456-7' } });
        await user.click(screen.getByRole('button', { name: 'Crear Venta' }));
        await waitFor(() => expect(API.post).toHaveBeenCalledWith('/ventas/crear/', expect.objectContaining({
            cliente_nuevo: true, cliente: expect.objectContaining({ nombre: 'Empresa ficticia SAS', cedula: '900123456-7', tipo_persona: 'juridica' }),
        }), expect.anything()));
    });
    it('al encontrar un cliente carga su tipo registrado y lo conserva al guardar', async () => {
        const user = userEvent.setup();
        API.get.mockResolvedValue({ data: { results: [{ id: 7, tipo_persona: 'juridica', nombre: 'Empresa existente', cedula: '900123456-7' }] } });
        montar();
        fireEvent.change(screen.getByLabelText('Cédula:'), { target: { value: '900123456-7' } });
        await waitFor(() => expect(screen.getByLabelText('Tipo de persona')).toHaveValue('juridica'));
        expect(screen.getByLabelText('Razón social:')).toHaveValue('Empresa existente');
        await user.click(screen.getByRole('button', { name: 'Crear Venta' }));
        await waitFor(() => expect(API.post).toHaveBeenCalledWith('/ventas/crear/', expect.objectContaining({
            cliente_nuevo: false, cliente: expect.objectContaining({ id: 7, tipo_persona: 'juridica' }),
        }), expect.anything()));
    });
});
