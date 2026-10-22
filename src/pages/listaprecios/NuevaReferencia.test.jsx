import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../../services/api';
import { AppContext } from '../../AppContext';
import NuevaReferencia from './NuevaReferencia';

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const montar = (props = {}) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <AppContext.Provider value={{ proveedores: [{ id: 7, nombre_empresa: 'John Galindo' }, { id: 8, nombre_empresa: 'Metalisteros' }], fetchProveedores: vi.fn() }}>
      <NuevaReferencia notify={vi.fn()} onClose={vi.fn()} {...props} />
    </AppContext.Provider>
  </QueryClientProvider>,
);

beforeEach(() => {
  vi.resetAllMocks();
  API.get.mockImplementation(async (url) => ({ data: url.includes('subcategorias')
    ? [{ id: 11, nombre: 'Mesa de 6p.', categoria: 1 }, { id: 12, nombre: 'Silla', categoria: 1 }, { id: 21, nombre: 'Sofá 3p.', categoria: 2 }]
    : [{ id: 1, nombre: 'Comedor' }, { id: 2, nombre: 'Sala' }] }));
  API.post.mockResolvedValue({ data: { id: 99, nombre: 'Valencia' } });
});

describe('Nueva referencia desde Administrar lista', () => {
  it('crea la referencia con su proveedor y subcategorías; las categorías salen de las subcategorías', async () => {
    const onCreada = vi.fn();
    montar({ onCreada });
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: '  Valencia ' } });
    fireEvent.change(screen.getByLabelText('Proveedor'), { target: { value: '8' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Mesa de 6p.' }));
    fireEvent.change(screen.getByLabelText('Buscar subcategoría'), { target: { value: 'sila' } });
    expect(screen.queryByRole('button', { name: 'Sofá 3p.' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar subcategoría'), { target: { value: 'silla' } });
    fireEvent.click(screen.getByRole('button', { name: 'Silla' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear referencia' }));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith('referencias/', { nombre: 'Valencia', proveedor: 8, subcategorias: [11, 12], categorias: [1] }));
    await waitFor(() => expect(onCreada).toHaveBeenCalledWith({ id: 99, nombre: 'Valencia' }));
  });

  it('pide nombre, proveedor y al menos una subcategoría antes de guardar', async () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Crear referencia' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Escribe el nombre y elige el proveedor.');
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Valencia' } });
    fireEvent.change(screen.getByLabelText('Proveedor'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear referencia' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Elige al menos una subcategoría');
    expect(API.post).not.toHaveBeenCalled();
  });
});
