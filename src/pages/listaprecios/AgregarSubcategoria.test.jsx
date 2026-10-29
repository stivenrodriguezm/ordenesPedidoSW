import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../../services/api';
import * as servicio from '../../services/listaPreciosService';
import AgregarSubcategoria from './AgregarSubcategoria';

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock('../../services/listaPreciosService', () => ({ guardarDisposicionSubcategorias: vi.fn(), agregarSubcategoriaNueva: vi.fn() }));
vi.mock('../../AppContext', () => ({ usePermissions: () => () => true }));

const ref = (id, proveedor, subs, retiradas = []) => ({ id, nombre: 'Valencia', proveedor, proveedor_nombre: `Proveedor ${proveedor}`,
  categorias: [{ id: 1, nombre: 'Comedor' }], subcategorias: subs.map((s) => ({ id: s, categoria: 1 })), disposicion: { revision: 3, retiradas, orden: [] } });
const montar = (grupo, props = {}, catalogo = true) => {
  const r = render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <AgregarSubcategoria grupo={grupo} visibles={[11]} notify={vi.fn()} onClose={vi.fn()} {...props} /></QueryClientProvider>);
  if (catalogo) fireEvent.click(screen.getByRole('button', { name: 'Elegir del catálogo' }));
  return r;
};

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

  it('«Nueva»: crea la subcategoría solo para el proveedor elegido', async () => {
    const onClose = vi.fn();
    servicio.agregarSubcategoriaNueva.mockResolvedValue({ id: 40, nombre: 'Banca' });
    montar({ nombre: 'Valencia', referencias: [ref(101, 7, [11]), ref(102, 8, [11])] }, { onClose }, false);
    fireEvent.change(screen.getByLabelText('Nombre de la subcategoría'), { target: { value: '  Banca ' } });
    expect(await screen.findByRole('option', { name: 'Sala' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Categoría de la subcategoría'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Elige el proveedor');
    fireEvent.change(screen.getByLabelText('Proveedor'), { target: { value: '102' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(servicio.agregarSubcategoriaNueva).toHaveBeenCalledWith(102, { nombre: 'Banca', categoria: 1, todas: false });
    expect(API.patch).not.toHaveBeenCalled();
  });

  it('desde la barra de la lista pide primero la referencia', async () => {
    servicio.agregarSubcategoriaNueva.mockResolvedValue({ id: 40, nombre: 'Butaco', categoria: 2 });
    const onClose = vi.fn();
    const grupos = [{ clave: 'valencia', nombre: 'Valencia', referencias: [ref(101, 7, [11])] }, { clave: 'cairo', nombre: 'Cairo', referencias: [{ ...ref(103, 9, []), nombre: 'Cairo' }] }];
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AgregarSubcategoria grupos={grupos} categoriaInicial="2" notify={vi.fn()} onClose={onClose} /></QueryClientProvider>);
    expect(screen.getByRole('dialog', { name: 'Nueva subcategoría' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nombre de la subcategoría'), { target: { value: 'Butaco' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Elige la referencia');
    fireEvent.change(screen.getByLabelText('Referencia'), { target: { value: 'cairo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(servicio.agregarSubcategoriaNueva).toHaveBeenCalledWith(103, { nombre: 'Butaco', categoria: 2, todas: false });
  });
});
