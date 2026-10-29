import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../../services/api';
import * as servicio from '../../services/listaPreciosService';
import CategoriaSubcategoria from './CategoriaSubcategoria';

vi.mock('../../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../../services/listaPreciosService', () => ({ cambiarCategoriaSubcategoria: vi.fn() }));

const montar = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
  <CategoriaSubcategoria subcategoria={71} nombre="Silla" categoria={1} categoriaNombre="Salas" referencia={101} /></QueryClientProvider>);

beforeEach(() => {
  vi.resetAllMocks();
  API.get.mockResolvedValue({ data: [{ id: 1, nombre: 'Salas' }, { id: 2, nombre: 'Comedores' }] });
});

describe('Categoría de la subcategoría en una referencia', () => {
  it('cambia la categoría solo para esta referencia', async () => {
    servicio.cambiarCategoriaSubcategoria.mockResolvedValue({ id: 80, categoria: 2 });
    montar();
    const select = screen.getByLabelText('Categoría de Silla');
    expect(select).toHaveValue('1');
    await screen.findByRole('option', { name: 'Comedores' });
    fireEvent.change(select, { target: { value: '2' } });
    await waitFor(() => expect(servicio.cambiarCategoriaSubcategoria).toHaveBeenCalledWith(71, 2, 101));
  });

  it('muestra el error del servidor', async () => {
    servicio.cambiarCategoriaSubcategoria.mockRejectedValue({ response: { status: 400, data: { categoria: ['Esta referencia ya tiene «Silla» en Comedores.'] } } });
    montar();
    await screen.findByRole('option', { name: 'Comedores' });
    fireEvent.change(screen.getByLabelText('Categoría de Silla'), { target: { value: '2' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Comedores');
  });
});
