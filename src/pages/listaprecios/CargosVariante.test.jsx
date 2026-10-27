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

  it('un cargo normal cambia a %, lleva tela/cuero, se oculta en agrupaciones y limita sus unidades (2026-10-27)', async () => {
    servicio.updateCargo.mockResolvedValue({});
    montar([cargo(1, 'Reclino', { opcional: true, modo_valor: 'pesos', en_agrupacion: true }), cargo(2, 'Transporte', { tipo: 'transporte' })]);
    fireEvent.change(screen.getByLabelText('Tipo de valor de Reclino'), { target: { value: 'porcentaje' } });
    await waitFor(() => expect(servicio.updateCargo).toHaveBeenCalledWith(1, { modo_valor: 'porcentaje' }));
    fireEvent.change(screen.getByLabelText('Reclino en agrupaciones'), { target: { value: 'no' } });
    await waitFor(() => expect(servicio.updateCargo).toHaveBeenCalledWith(1, { en_agrupacion: false }));
    // Tela y cuero no vienen habilitados: se marcan para indicar el consumo.
    expect(screen.queryByLabelText('Tela de Reclino')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Cuero de Reclino')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Reclino lleva tela'));
    const tela = screen.getByLabelText('Tela de Reclino');
    fireEvent.change(tela, { target: { value: '1,5' } });
    fireEvent.blur(tela);
    await waitFor(() => expect(servicio.updateCargo).toHaveBeenCalledWith(1, { metraje_tela: 1.5 }));
    const maximo = screen.getByLabelText('Máximo de unidades de Reclino');
    fireEvent.change(maximo, { target: { value: '3' } });
    fireEvent.blur(maximo);
    await waitFor(() => expect(servicio.updateCargo).toHaveBeenCalledWith(1, { cantidad_maxima: 3 }));
    // El transporte solo va en pesos, sin tela ni máximo de unidades.
    expect(screen.queryByLabelText('Tipo de valor de Transporte')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Transporte lleva tela')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Máximo de unidades de Transporte')).not.toBeInTheDocument();
  });

  it('un cargo en % muestra su porcentaje y acepta negativos', async () => {
    servicio.updateCargo.mockResolvedValue({});
    montar([cargo(1, 'Descuento tela', { modo_valor: 'porcentaje', valor: '15.00' })]);
    const pct = screen.getByLabelText('Porcentaje de Descuento tela');
    expect(pct).toHaveValue('15');
    fireEvent.change(pct, { target: { value: '-5' } });
    fireEvent.blur(pct);
    await waitFor(() => expect(servicio.updateCargo).toHaveBeenCalledWith(1, { valor: -5 }));
  });

  it('un cargo con tela la muestra marcada y al desmarcarla quita el consumo', async () => {
    servicio.updateCargo.mockResolvedValue({});
    montar([cargo(1, 'Faldón', { metraje_tela: '1.50', decimetraje_cuero: null })]);
    expect(screen.getByLabelText('Faldón lleva tela')).toBeChecked();
    expect(screen.getByLabelText('Tela de Faldón')).toHaveValue('1,5');
    expect(screen.getByLabelText('Faldón lleva cuero')).not.toBeChecked();
    fireEvent.click(screen.getByLabelText('Faldón lleva tela'));
    await waitFor(() => expect(servicio.updateCargo).toHaveBeenCalledWith(1, { metraje_tela: null }));
    expect(screen.queryByLabelText('Tela de Faldón')).not.toBeInTheDocument();
  });
});
