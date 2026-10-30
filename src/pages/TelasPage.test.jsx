import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../services/api';
import TelasPage from './TelasPage';

const permisos = { actuales: new Set() };
vi.mock('../services/api', () => ({ default: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
vi.mock('../AppContext', async () => {
  const React = await import('react');
  return {
    AppContext: React.createContext({ usuario: { role: 'administrador' } }),
    usePermissions: () => codigo => permisos.actuales.has(codigo),
  };
});
vi.mock('../components/CrearPedidoTelaModal', () => ({ default: () => null }));

const pedido = { id: 1001, estado: 'Pendiente', proveedor: 5, proveedor_nombre: 'Ariatex ficticia', usuario_nombre: 'Ana', direccion_entrega: 'Lottus', detalles: [] };

const abrirEditar = async () => {
  render(<TelasPage />);
  const fila = (await screen.findAllByText('Ariatex ficticia')).find(n => n.closest('tr'));
  fireEvent.click(fila.closest('tr'));
  fireEvent.click(screen.getByTitle('Clic para editar estado del pedido de tela'));
  return screen.getByRole('dialog');
};

describe('Anular un pedido de tela desde Editar estado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permisos.actuales = new Set(['VER_PEDIDOS_TELAS', 'EDITAR_ESTADO_TELA_ORDEN', 'ANULAR_PEDIDO_TELA']);
    API.get.mockImplementation(async url => ({ data: url.startsWith('proveedores-telas') ? [{ id: 5, nombre_empresa: 'Ariatex ficticia' }]
      : url.startsWith('pedidos-telas') ? { results: [{ ...pedido }] } : [] }));
  });

  it('pide el motivo, avisa que no se borra y envía la anulación', async () => {
    API.patch.mockResolvedValue({ data: { ...pedido, estado: 'Anulado', motivo_anulacion: 'Color equivocado', anulado_por_nombre: 'Admin' } });
    const dialogo = await abrirEditar();
    fireEvent.change(within(dialogo).getByLabelText('Nuevo estado del pedido de tela'), { target: { value: 'Anulado' } });
    expect(within(dialogo).getByText(/no se borra/)).toBeInTheDocument();
    const anular = within(dialogo).getByRole('button', { name: 'Anular pedido' });
    expect(anular).toBeDisabled();
    fireEvent.change(within(dialogo).getByLabelText('Motivo de la anulación'), { target: { value: '  Color equivocado ' } });
    fireEvent.click(anular);
    await waitFor(() => expect(API.patch).toHaveBeenCalledWith('pedidos-telas/1001/', { estado: 'Anulado', motivo_anulacion: 'Color equivocado' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Color equivocado')).toBeInTheDocument();
  });

  it('si falla conserva el motivo escrito para reintentar', async () => {
    API.patch.mockRejectedValue({ response: { data: { error: 'No tienes permiso para anular pedidos de tela.' } } });
    const dialogo = await abrirEditar();
    fireEvent.change(within(dialogo).getByLabelText('Nuevo estado del pedido de tela'), { target: { value: 'Anulado' } });
    fireEvent.change(within(dialogo).getByLabelText('Motivo de la anulación'), { target: { value: 'Duplicado' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Anular pedido' }));
    expect(await screen.findByText('No tienes permiso para anular pedidos de tela.')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByLabelText('Motivo de la anulación')).toHaveValue('Duplicado');
  });

  it('sin el permiso de anular no ofrece la opción Anulado', async () => {
    permisos.actuales.delete('ANULAR_PEDIDO_TELA');
    const dialogo = await abrirEditar();
    const opciones = within(within(dialogo).getByLabelText('Nuevo estado del pedido de tela')).getAllByRole('option').map(o => o.value);
    expect(opciones).toEqual(['Pendiente', 'En fabrica', 'En Lottus']);
  });
});

describe('Volver a descargar la imagen del pedido de tela', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    API.get.mockImplementation(async url => ({ data: url.startsWith('proveedores-telas') ? [{ id: 5, nombre_empresa: 'Ariatex ficticia' }]
      : url.startsWith('pedidos-telas') ? { results: [{ ...pedido }] } : [] }));
  });

  const abrir = async () => {
    render(<TelasPage />);
    const fila = (await screen.findAllByText('Ariatex ficticia')).find(n => n.closest('tr'));
    fireEvent.click(fila.closest('tr'));
  };

  it('con el permiso aparece «Descargar» en el pedido abierto', async () => {
    permisos.actuales = new Set(['VER_PEDIDOS_TELAS', 'DESCARGAR_IMAGEN_PEDIDO_TELA']);
    await abrir();
    expect(screen.getAllByRole('button', { name: /descargar/i }).length).toBeGreaterThan(0);
  });

  it('sin el permiso no aparece', async () => {
    permisos.actuales = new Set(['VER_PEDIDOS_TELAS']);
    await abrir();
    expect(screen.queryByRole('button', { name: /descargar/i })).not.toBeInTheDocument();
  });
});
