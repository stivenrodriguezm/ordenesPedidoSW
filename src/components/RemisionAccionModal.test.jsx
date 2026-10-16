import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RemisionAccionModal from './RemisionAccionModal';
import API from '../services/api';

vi.mock('../services/api', () => ({ default: { patch: vi.fn() } }));

const remision = {
    id: 7, cliente_nombre: 'Cliente ficticio', direccion_entrega: 'Calle ficticia', nota_transportador: '', costo_entrega: '0',
    ventas_detalle: [{ id: 50, estado: 'pendiente' }],
    inventario_items_detalle: [{ id_referencia: 'ME-1', producto_nombre: 'Mesa comedor' }, { id_referencia: 'SI-1', producto_nombre: 'Silla' }],
    items_manuales: [{ id: 3, referencia: 'Silla tapizada', cantidad: 6, descripcion: '' }],
};

function abrir(onDone = vi.fn()) {
    render(<RemisionAccionModal open accion="finalizada" remision={remision} onClose={vi.fn()} onDone={onDone} puedeCerrarVenta />);
    return onDone;
}

beforeEach(() => vi.resetAllMocks());

describe('Confirmar entrega (P11-03)', () => {
    it('entrega completa: igual que antes, con cierre de la venta', async () => {
        const user = userEvent.setup();
        API.patch.mockResolvedValue({ data: { id: 7 } });
        abrir();
        expect(screen.getByText(/Marcar la venta/)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
        await waitFor(() => expect(API.patch).toHaveBeenCalledWith('/suministros/remisiones/7/', { estado: 'finalizada', cerrar_ventas: [50] }));
    });

    it('lo no entregado exige motivo, viaja con su cantidad y la venta no se cierra', async () => {
        const user = userEvent.setup();
        API.patch.mockResolvedValue({ data: { id: 7 } });
        abrir();
        await user.click(screen.getByLabelText('Silla · SI-1'));
        await user.click(screen.getByLabelText('6 × Silla tapizada'));
        expect(screen.queryByText(/Marcar la venta/)).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
        expect(screen.getByText(/Indica por qué no se entregó/)).toBeInTheDocument();
        expect(API.patch).not.toHaveBeenCalled();

        await user.selectOptions(screen.getByLabelText('Motivo: Silla · SI-1'), 'danado');
        await user.selectOptions(screen.getByLabelText('Motivo: 6 × Silla tapizada'), 'faltante');
        const cantidad = screen.getByLabelText('Cantidad no entregada: 6 × Silla tapizada');
        await user.clear(cantidad);
        await user.type(cantidad, '2');
        await user.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
        await waitFor(() => expect(API.patch).toHaveBeenCalledWith('/suministros/remisiones/7/', {
            estado: 'finalizada',
            no_entregados: [
                { inventario: 'SI-1', motivo: 'danado', detalle: '' },
                { item_manual: 3, motivo: 'faltante', detalle: '', cantidad: 2 },
            ],
        }));
    });

    it('"Otro" exige explicar qué pasó', async () => {
        const user = userEvent.setup();
        abrir();
        await user.click(screen.getByLabelText('Mesa comedor · ME-1'));
        await user.selectOptions(screen.getByLabelText('Motivo: Mesa comedor · ME-1'), 'otro');
        await user.click(screen.getByRole('button', { name: 'Confirmar entrega' }));
        expect(screen.getByText(/Explica qué pasó/)).toBeInTheDocument();
        expect(API.patch).not.toHaveBeenCalled();
    });
});
