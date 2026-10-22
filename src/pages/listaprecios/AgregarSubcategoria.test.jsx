import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../../services/api';
import * as servicio from '../../services/listaPreciosService';
import AgregarSubcategoria from './AgregarSubcategoria';

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock('../../services/listaPreciosService', () => ({ guardarDisposicionSubcategorias: vi.fn() }));

const ref = (id, proveedor, subs, retiradas = []) => ({ id, nombre: 'Valencia', proveedor, proveedor_nombre: `Proveedor ${proveedor}`,
  categorias: [{ id: 1, nombre: 'Comedor' }], subcategorias: subs.map((s) => ({ id: s, categoria: 1 })), disposicion: { revision: 3, retiradas, orden: [] } });
const montar = (grupo, props = {}) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
  <AgregarSubcategoria grupo={grupo} visibles={[11]} notify={vi.fn()} onClose={vi.fn()} {...props} /></QueryClientProvider>);

beforeEach(() => {
  vi.resetAllMocks();
  API.get.mockImplementation(async (url) => ({ data: url.includes('subcategorias')
    ? [{ id: 11, nombre: 'Mesa de 6p.', categoria: 1 }, { id: 12, nombre: 'Silla', categoria: 1 }, { id: 13, nombre: 'Base 6p.', categoria: 1 }]
    : [{ id: 1, nombre: 'Comedor' }, { id: 2, nombre: 'Sala' }] }));
  API.patch.mockResolvedValue({ data: {} });
  servicio.guardarDisposicionSubcategorias.mockResolvedValue({});
});

describe('Agregar subcategoría a una referencia', () => {
  it('agrega una existente al proveedor elegido sin repetir las ya asignadas', async () => {
    const onClose = vi.fn();
    montar({ nombre: 'Valencia', referencias: [ref(101, 7, [11]), ref(102, 8, [11, 12])] }, { onClose });
    expect(await screen.findByRole('button', { name: 'Silla' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mesa de 6p.' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Silla' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Elige el proveedor');
    fireEvent.change(screen.getByLabelText('Proveedor'), { target: { value: 'todos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    // Solo al que no la tenía; el otro proveedor ya la tenía asignada.
    expect(API.patch).toHaveBeenCalledTimes(1);
    expect(API.patch).toHaveBeenCalledWith('referencias/101/', { subcategorias: [11, 12], categorias: [1] });
  });

  it('crea una subcategoría nueva con su categoría y la agrega', async () => {
    const nueva = { id: 30, nombre: 'Banco 2p.', categoria: 2 };
    const subs = [{ id: 11, nombre: 'Mesa de 6p.', categoria: 1 }, { id: 12, nombre: 'Silla', categoria: 1 }];
    API.get.mockImplementation(async (url) => ({ data: url.includes('subcategorias') ? subs : [{ id: 1, nombre: 'Comedor' }, { id: 2, nombre: 'Sala' }] }));
    API.post.mockImplementation(async () => { subs.push(nueva); return { data: nueva }; });
    montar({ nombre: 'Valencia', referencias: [ref(101, 7, [11])] });
    await screen.findByRole('button', { name: 'Silla' });
    fireEvent.change(screen.getByLabelText('Buscar subcategoría'), { target: { value: 'Banco 2p.' } });
    fireEvent.change(screen.getByLabelText('Categoría de la nueva subcategoría'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith('/suministros/subcategorias/', { nombre: 'Banco 2p.', categoria: 2 }));
    expect(await screen.findByText('1 elegida')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await waitFor(() => expect(API.patch).toHaveBeenCalledWith('referencias/101/', { subcategorias: [11, 30], categorias: [1, 2] }));
  });

  it('una subcategoría eliminada de la lista vuelve a mostrarse', async () => {
    montar({ nombre: 'Valencia', referencias: [ref(101, 7, [11, 13], [13])] });
    fireEvent.click(await screen.findByRole('button', { name: 'Base 6p.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await waitFor(() => expect(servicio.guardarDisposicionSubcategorias).toHaveBeenCalledWith(101, { revision: 3, retiradas: [] }));
    expect(API.patch).not.toHaveBeenCalled();
  });
});
