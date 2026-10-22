import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as servicio from '../../services/listaPreciosService';
import CargosVariante from './CargosVariante';

vi.mock('../../services/listaPreciosService', () => ({ createCargo: vi.fn(), updateCargo: vi.fn(), deleteCargo: vi.fn(),
  getNombresCargos: vi.fn(), ordenarCargos: vi.fn(), ordenarVariantes: vi.fn() }));

const cargo = (id, descripcion, extra = {}) => ({ id, variante: 10, descripcion, valor: '1000.00', opcional: false, preseleccionado: false, especial: null, tipo: '', ...extra });
const montar = (cargos) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
  <CargosVariante variante={{ id: 10, nombre: 'Sofá', linea: 3, cargos }} notify={vi.fn()} /></QueryClientProvider>);

beforeEach(() => {
  vi.resetAllMocks();
  servicio.getNombresCargos.mockResolvedValue(['Tomacorrientes', 'Brazos de madera']);
  servicio.ordenarCargos.mockResolvedValue({});
});

describe('Cargos del producto', () => {
  it('se reordenan con el asa (teclado) y se guarda la nueva posición', async () => {
    montar([cargo(1, 'USB'), cargo(2, 'Transporte', { tipo: 'transporte' })]);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Mover USB' }), { key: 'ArrowDown' });
    await waitFor(() => expect(servicio.ordenarCargos).toHaveBeenCalledWith(10, [2, 1]));
  });

  it('sugiere los nombres de cargos de otros productos al escribir', async () => {
    const { container } = montar([cargo(1, 'Nuevo cargo')]);
    const nombre = screen.getByLabelText('Descripción del cargo');
    expect(nombre).toHaveValue('');
    expect(nombre).toHaveAttribute('placeholder', 'Nombre del cargo');
    await waitFor(() => expect([...container.querySelectorAll(`#${CSS.escape(nombre.getAttribute('list'))} option`)].map((o) => o.value))
      .toEqual(['Tomacorrientes', 'Brazos de madera']));
  });

  it('el transporte no muestra unidades por transporte', () => {
    montar([cargo(2, 'Transporte', { tipo: 'transporte' })]);
    expect(screen.queryByText(/Unidades por transporte/)).not.toBeInTheDocument();
    expect(screen.queryByText(/se cobra un solo transporte/)).not.toBeInTheDocument();
  });
});
