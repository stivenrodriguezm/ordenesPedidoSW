import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgrupacionVariante from './AgrupacionVariante';
import * as servicio from '../../services/listaPreciosService';

vi.mock('../../services/listaPreciosService', () => ({ crearAgrupacion: vi.fn(), guardarComponentes: vi.fn(), simularComponentes: vi.fn(), simularNuevaAgrupacion: vi.fn(), getBibliotecaEspeciales: vi.fn(),
  createCargo: vi.fn(), updateCargo: vi.fn(), deleteCargo: vi.fn(), getNombresCargos: vi.fn(() => Promise.resolve(['Instalación', 'USB'])), ordenarCargos: vi.fn(), ordenarVariantes: vi.fn() }));
const mesa = { id: 1, nombre: 'Mesa', costo_base: '500000.00', multiplicador_efectivo: '2', componentes: [] };
const silla = { id: 2, nombre: 'Silla', costo_base: '100000.00', multiplicador_efectivo: '2', componentes: [], cargos: [{ id: 9, variante: 2, descripcion: 'Instalación', valor: '2000.00', opcional: false, preseleccionado: false, especial: null, tipo: '' }] };
const juego = { id: 3, nombre: 'Comedor', costo_base: '0.00', multiplicador_efectivo: '2', componentes: [{ variante: 1, variante_nombre: 'Mesa', cantidad: 1, costo_unitario: null, multiplicador: null }, { variante: 2, variante_nombre: 'Silla', cantidad: 6, costo_unitario: null, multiplicador: null }] };
const linea = { id: 5, nombre: 'Qatar', variantes: [mesa, silla, juego] };
const montar = (nuevo = false, producto = juego) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(['lp-lineas'], [linea]);
  render(<QueryClientProvider client={client}><AgrupacionVariante linea={linea} variante={nuevo ? { componentes: [] } : producto} nuevo={nuevo} categorias={[{ id: 10, nombre: 'Comedores' }]} notify={vi.fn()} /></QueryClientProvider>);
  if (!nuevo) fireEvent.click(screen.getByText(/^Agrupación ·/));
  return client;
};
const escribir = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
beforeEach(() => {
  vi.resetAllMocks();
  const calculo = { precios_venta: [{ grupo: 1, grupo_nombre: 'Grupo 1', precio: '2420000.00' }] };
  servicio.simularComponentes.mockResolvedValue(calculo); servicio.simularNuevaAgrupacion.mockResolvedValue(calculo);
  servicio.guardarComponentes.mockResolvedValue(juego); servicio.crearAgrupacion.mockResolvedValue({ ...juego, id: 4 });
  servicio.getBibliotecaEspeciales.mockResolvedValue([]);
  servicio.createCargo.mockResolvedValue({}); servicio.updateCargo.mockResolvedValue({});
});
const piezaDe = nombre => within(screen.getByLabelText(`Cantidad de ${nombre}`).closest('.lp-agr-pieza'));
const agregarPieza = id => fireEvent.change(screen.getByLabelText('Agregar pieza'), { target: { value: String(id) } });

describe('Agrupaciones por costos de piezas', () => {
  it('no monta ni simula el editor cerrado; después conserva su borrador al plegarlo', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><AgrupacionVariante linea={linea} variante={juego} notify={vi.fn()} /></QueryClientProvider>);
    expect(screen.queryByLabelText('Costo unitario de Silla')).not.toBeInTheDocument();
    expect(servicio.simularComponentes).not.toHaveBeenCalled();
    const abrir = screen.getByText(/^Agrupación ·/);
    fireEvent.click(abrir);
    escribir('Costo unitario de Silla', '175000');
    fireEvent.click(abrir); fireEvent.click(abrir);
    expect(screen.getByLabelText('Costo unitario de Silla')).toHaveValue('$175.000');
    expect(servicio.guardarComponentes).not.toHaveBeenCalled();
  });

  it('los cargos de la pieza son los del producto: se crean y cambian en la referencia', async () => {
    montar();
    const pieza = piezaDe('Silla');
    fireEvent.click(pieza.getByRole('button', { name: 'Cargos y especiales de Silla' }));
    expect(pieza.getByLabelText('Descripción del cargo')).toHaveValue('Instalación');
    expect(pieza.getByLabelText('Estado de Instalación')).toHaveValue('obligatorio');
    fireEvent.change(pieza.getByLabelText('Estado de Instalación'), { target: { value: 'habilitado' } });
    await waitFor(() => expect(servicio.updateCargo).toHaveBeenCalledWith(9, { opcional: true, preseleccionado: true }));
    fireEvent.click(pieza.getByRole('button', { name: 'Agregar cargo' }));
    await waitFor(() => expect(servicio.createCargo).toHaveBeenCalled());
    expect(servicio.createCargo.mock.calls[0][0]).toEqual({ variante: 2, descripcion: 'Nuevo cargo', valor: 0 });
    expect(servicio.guardarComponentes).not.toHaveBeenCalled();
  });
  it('guarda los especiales de una pieza desde el texto actual sin esperar blur', async () => {
    montar();
    const pieza = piezaDe('Silla');
    fireEvent.click(pieza.getByRole('button', { name: 'Cargos y especiales de Silla' }));
    fireEvent.click(pieza.getByRole('button', { name: 'Nuevo especial', exact: true }));
    fireEvent.change(pieza.getByLabelText('Nombre del especial'), { target: { value: 'Acabado especial' } });
    fireEvent.change(pieza.getByLabelText('Costo del especial'), { target: { value: '10000' } });
    fireEvent.click(pieza.getByRole('checkbox', { name: /Usar multiplicador general/ }));
    fireEvent.change(pieza.getByLabelText('Multiplicador del especial'), { target: { value: '1,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar agrupación' }));
    await waitFor(() => expect(servicio.guardarComponentes).toHaveBeenCalledWith(3, expect.arrayContaining([expect.objectContaining({ variante: 2, adicionales: [
      { tipo: 'especial', nombre: 'Acabado especial', configuracion: { costo_base: '10000', multiplicador: '1.5', sentido: 'sube', metraje_tela: null, decimetraje_cuero: null } },
    ] })])));
  });
  it('copia un especial de la biblioteca a la pieza y lo guarda dentro del conjunto', async () => {
    servicio.getBibliotecaEspeciales.mockResolvedValue([{ id: 50, nombre: 'Motor', origen: 'Otra referencia', configuracion: { costo_base: '250000', multiplicador: '2', sentido: 'sube', metraje_tela: null, decimetraje_cuero: null } }]);
    montar();
    const pieza = piezaDe('Silla');
    fireEvent.click(pieza.getByRole('button', { name: 'Cargos y especiales de Silla' }));
    fireEvent.click(pieza.getByRole('button', { name: 'Usar especial guardado' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Usar Motor de Otra referencia' }));
    expect(servicio.guardarComponentes).not.toHaveBeenCalled();
    expect(pieza.getByLabelText('Costo del especial')).toHaveValue('$250.000');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar agrupación' }));
    await waitFor(() => expect(servicio.guardarComponentes).toHaveBeenCalledWith(3, expect.arrayContaining([expect.objectContaining({ variante: 2, adicionales: [expect.objectContaining({ tipo: 'especial', nombre: 'Motor' })] })])));
  });
  it('quitar todos los adicionales guardados envía una lista vacía explícita', async () => {
    const funda = { tipo: 'especial', nombre: 'Funda', configuracion: { costo_base: '5000', multiplicador: '1.5', sentido: 'sube', metraje_tela: null, decimetraje_cuero: null } };
    montar(false, { ...juego, componentes: [juego.componentes[0], { ...juego.componentes[1], adicionales: [funda] }] });
    const pieza = piezaDe('Silla');
    fireEvent.click(pieza.getByRole('button', { name: 'Cargos y especiales de Silla' }));
    fireEvent.click(pieza.getByRole('button', { name: 'Quitar especial Funda' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar agrupación' }));
    await waitFor(() => expect(servicio.guardarComponentes).toHaveBeenCalledWith(3, expect.arrayContaining([expect.objectContaining({ variante: 2, adicionales: [] })])));
  });
  it('guarda cantidad, costo y múltiplo exclusivos de la agrupación sin escribir sobre la pieza original', async () => {
    montar(); escribir('Cantidad de Silla', '8'); escribir('Costo unitario de Silla', '80000'); escribir('Multiplicador de Silla', '1,5');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar agrupación' }));
    await waitFor(() => expect(servicio.guardarComponentes).toHaveBeenCalledWith(3, [{ variante: 1, cantidad: 1, costo_unitario: null, multiplicador: null }, { variante: 2, cantidad: 8, costo_unitario: '80000', multiplicador: '1.5' }]));
    expect(silla.costo_base).toBe('100000.00');
  });
  it('rechaza cantidades fraccionarias y centavos y conserva la entrada para corregir', () => {
    montar(); escribir('Cantidad de Silla', '6,5'); escribir('Costo unitario de Silla', '80,25');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar agrupación' }));
    expect(servicio.guardarComponentes).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Cantidad de Silla')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Costo unitario de Silla')).toHaveValue('80,25');
  });
  it('conserva los ajustes ante un error del servidor y permite reintentar', async () => {
    servicio.guardarComponentes.mockRejectedValueOnce({ response: { data: { componentes: ['Revisa la composición.'] } } }).mockResolvedValueOnce(juego);
    montar(); escribir('Costo unitario de Silla', '80000');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar agrupación' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa la composición.');
    expect(screen.getByLabelText('Costo unitario de Silla')).toHaveValue('$80.000');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar agrupación' }));
    await waitFor(() => expect(servicio.guardarComponentes).toHaveBeenCalledTimes(2));
  });
  it('vaciar costo y múltiplo propios restablece la herencia; cancelar restaura el borrador guardado', () => {
    montar(); escribir('Costo unitario de Silla', '0'); escribir('Multiplicador de Silla', '1,5');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByLabelText('Costo unitario de Silla')).toHaveValue(''); expect(screen.getByLabelText('Multiplicador de Silla')).toHaveValue('');
    expect(servicio.guardarComponentes).not.toHaveBeenCalled();
  });
  it('simula los datos actuales y crea el conjunto completo solo al confirmar', async () => {
    const client = montar(true);
    escribir('Nombre del conjunto', 'Comedor 6 puestos');
    agregarPieza(1); agregarPieza(2);
    escribir('Cantidad de Silla', '6'); escribir('Costo unitario de Silla', '80000'); escribir('Multiplicador de Silla', '1,5');
    expect(await screen.findByText('$2.420.000')).toBeInTheDocument();
    expect(servicio.crearAgrupacion).not.toHaveBeenCalled();
    expect(servicio.simularNuevaAgrupacion).toHaveBeenLastCalledWith(5, [{ variante: 1, cantidad: 1, costo_unitario: null, multiplicador: null }, { variante: 2, cantidad: 6, costo_unitario: '80000', multiplicador: '1.5' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Crear agrupación' }));
    await waitFor(() => expect(servicio.crearAgrupacion).toHaveBeenCalledWith(5, { nombre: 'Comedor 6 puestos', categoria: 10, componentes: [{ variante: 1, cantidad: 1, costo_unitario: null, multiplicador: null }, { variante: 2, cantidad: 6, costo_unitario: '80000', multiplicador: '1.5' }] }));
    await waitFor(() => expect(client.getQueryData(['lp-lineas'])[0].variantes.at(-1).id).toBe(4));
  });
});

it('crea una subcategoría nueva con piezas de distintos proveedores sin reemplazar fichas', async () => {
  const destino = { ...juego, subcategoria: 103, categoria_nombre: 'Comedor', componentes: [] };
  const unificada = { ...linea, referencia: 50, variantes: [{ ...mesa, subcategoria: 101 }, { ...silla, subcategoria: 102 }, destino] };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['lp-linea', 5], unificada);
  const otro = { id: 6, proveedor_nombre: 'Sillas Sur', variantes: [{ ...silla, id: 20 }] };
  servicio.crearAgrupacion.mockResolvedValue({ ...juego, id: 30, subcategoria: 104 });
  render(<QueryClientProvider client={client}><AgrupacionVariante nuevo linea={{ ...unificada, proveedor_nombre: 'Mesas Norte' }} lineasGrupo={[otro]} variante={{ componentes: [] }} categorias={[{ id: 10, nombre: 'Comedor' }]} notify={vi.fn()} /></QueryClientProvider>);
  expect(screen.queryByLabelText('Subcategoría del conjunto')).not.toBeInTheDocument();
  escribir('Nombre de la nueva subcategoría', 'Comedor de 6p.');
  agregarPieza(1); agregarPieza(20);
  escribir('Cantidad de Silla', '6');
  fireEvent.click(screen.getByRole('button', { name: 'Crear agrupación' }));
  await waitFor(() => expect(servicio.crearAgrupacion).toHaveBeenCalledWith(5, { nombre: 'Comedor de 6p.', categoria: 10, componentes: [
    { variante: 1, cantidad: 1, costo_unitario: null, multiplicador: null },
    { variante: 20, cantidad: 6, costo_unitario: null, multiplicador: null },
  ] }));
  expect(client.getQueryData(['lp-linea', 5]).variantes).toHaveLength(4);
  expect(client.getQueryData(['lp-linea', 5]).variantes.find(v => v.subcategoria === 103).componentes).toEqual([]);
});
