import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContext } from '../AppContext';
import API from '../services/api';
import EditSaleModal from './EditSaleModal';

vi.mock('../services/api', () => ({ default: { put: vi.fn() } }));
const saleData = { id: 123, cliente: { id: 7, tipo_persona: 'natural', nombre: 'Cliente ficticio', cedula: '0012345' },
    fecha_venta: '2026-10-24', fecha_entrega: '2026-10-30', vendedor: 1, estado: 'pendiente', valor_total: '1000000.00' };
function montar(permissions = ['EDITAR_ESTADO_VENTA', 'EDITAR_CLIENTE']) {
    render(<QueryClientProvider client={new QueryClient()}><AppContext.Provider value={{ usuario: { id: 1, role: 'vendedor', permissions } }}>
        <EditSaleModal show saleData={saleData} estados={['pendiente']} vendedores={[]} onClose={vi.fn()} onSaleUpdated={vi.fn()} setNotification={vi.fn()} fetchVentas={vi.fn()} fetchReportSales={vi.fn()} />
    </AppContext.Provider></QueryClientProvider>);
}
beforeEach(() => { vi.resetAllMocks(); API.put.mockResolvedValue({ data: {} }); });
describe('Cliente en el modal de editar venta', () => {
    it('edita tipo, razón social y NIT desde la tabla principal', async () => {
        const user = userEvent.setup(); montar();
        await user.selectOptions(screen.getByLabelText('Tipo de persona'), 'juridica');
        await user.clear(screen.getByLabelText('Razón social:'));
        await user.type(screen.getByLabelText('Razón social:'), 'Empresa ficticia SAS');
        await user.clear(screen.getByLabelText('NIT:'));
        await user.type(screen.getByLabelText('NIT:'), '900123456-7');
        await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
        await waitFor(() => expect(API.put).toHaveBeenCalledWith('/ventas/123/editar/', {
            venta: { estado: 'pendiente' }, cliente: { id: 7, tipo_persona: 'juridica', nombre: 'Empresa ficticia SAS', cedula: '900123456-7' },
        }));
    });
    it('no reenvía datos del cliente cuando no se modifican', async () => {
        const user = userEvent.setup(); montar();
        await user.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
        await waitFor(() => expect(API.put).toHaveBeenCalledWith('/ventas/123/editar/', { venta: { estado: 'pendiente' }, cliente: { id: 7 } }));
    });
    it('respeta permisos de edición del cliente', () => {
        montar(['EDITAR_ESTADO_VENTA']);
        expect(screen.getByLabelText('Tipo de persona')).toBeDisabled();
        expect(screen.getByLabelText('Nombre:')).toBeDisabled();
        expect(screen.getByLabelText('Cédula:')).toBeDisabled();
    });
});
