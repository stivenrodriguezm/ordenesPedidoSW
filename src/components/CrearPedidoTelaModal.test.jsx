import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../services/api';
import CrearPedidoTelaModal from './CrearPedidoTelaModal';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../AppContext', async () => {
  const React = await import('react');
  return { AppContext: React.createContext({ usuario: { role: 'vendedor' } }), usePermissions: () => () => true };
});

const ordenes = [
  { id: 1700, venta: 2700, proveedor_nombre: 'Muebles A', tela: 'Pedida' },
  { id: 1718, venta: 2715, proveedor_nombre: 'Muebles B', tela: 'Sin tela' },
  { id: 1611, venta: 2600, proveedor_nombre: 'Muebles C', tela: 'Pendiente' },
  { id: 1650, venta: null, proveedor_nombre: 'Muebles D', tela: 'Por pedir' },
];

describe('Orden asociada del pedido de tela (2026-11-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    API.get.mockImplementation(async url => ({ data: String(url).startsWith('listar-pedidos') ? ordenes : [] }));
  });

  it('ofrece todas las órdenes abiertas, sin importar su estado de tela, primero las que esperan tela', async () => {
    render(<CrearPedidoTelaModal isOpen onClose={() => {}} onSuccess={() => {}} />);
    const select = await screen.findByLabelText('Orden asociada');
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(5));
    expect(API.get).toHaveBeenCalledWith('listar-pedidos/?estado=en_proceso');
    const textos = within(select).getAllByRole('option').slice(1).map(o => o.textContent);
    expect(textos).toEqual([
      'Orden #1650 - Muebles D (tela: Por pedir)',
      'Orden #1611 · Venta 2600 - Muebles C (tela: Pendiente)',
      'Orden #1718 · Venta 2715 - Muebles B (tela: Sin tela)',
      'Orden #1700 · Venta 2700 - Muebles A (tela: Pedida)',
    ]);
  });
});
