import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContext } from '../../AppContext';
import * as servicio from '../../services/listaPreciosService';
import ListaPreciosPage from './ListaPreciosPage';
import ConfiguradorPrecio from './ConfiguradorPrecio';
import { formatCOP } from '../../utils/formatCOP';

vi.mock('../../services/listaPreciosService', () => ({ getCatalogo: vi.fn(), getCategoriasPublicas: vi.fn(), getPrecioVariante: vi.fn(), createCotizacion: vi.fn() }));
vi.mock('../../components/CotizacionPrintModal', () => ({ default: ({ open, folio }) => open ? <div>Documento {folio}</div> : null }));
const grupo = (id, precio) => ({ grupo: id, grupo_nombre: `Grupo ${id}`, precio });
const sofa = { id: 1, nombre: 'Detroit', fotos: [], variantes: [
  { id: 10, nombre: 'Sofá 235 cm', categoria: 1, categoria_nombre: 'Salas', precios: [grupo(1, 3000000), grupo(2, 3400000)], opcionales: [{ id: 100, descripcion: 'Reclinable' }], notas: [] },
  { id: 11, nombre: 'Sofá 200 cm', categoria: 1, categoria_nombre: 'Salas', precios: [grupo(2, 2900000)], opcionales: [], notas: [] },
] };
const comedor = { id: 2, nombre: 'Qatar', fotos: [], variantes: [
  { id: 20, nombre: 'Mesa', categoria: 2, categoria_nombre: 'Comedores', precios: [{ grupo: null, grupo_nombre: null, precio: 1000000 }], opcionales: [], notas: [] },
  { id: 21, nombre: 'Comedor 6 puestos', categoria: 2, categoria_nombre: 'Comedores', componentes: '1 Mesa + 6 Sillas', precios: [grupo(1, 2500000)], opcionales: [], notas: [] },
] };
const montar = (ui = <ListaPreciosPage />) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><AppContext.Provider value={{ usuario: { id: 40, username: 'Vendedor' } }}>{ui}</AppContext.Provider></QueryClientProvider>);
const consultar = async (nombre) => { fireEvent.click(await screen.findByRole('button', { name: `Consultar ${nombre}` })); return screen.getByRole('dialog'); };
beforeEach(() => {
  vi.resetAllMocks();
  servicio.getCatalogo.mockResolvedValue([sofa, comedor]);
  servicio.getCategoriasPublicas.mockResolvedValue([{ id: 1, nombre: 'Salas' }, { id: 2, nombre: 'Comedores' }]);
  servicio.getPrecioVariante.mockImplementation(async (id, { grupo: g }) => ({ precio: id === 10 ? (g === 2 ? 3400000 : 3000000) : 1000000, opcionales_incluidos: [] }));
});

describe('Consulta de showroom', () => {
  it('respeta el orden de administración y selecciona la primera variante sin adelantar los conjuntos', async () => {
    montar();
    const modal = await consultar('Qatar');
    const opciones = within(modal).getByRole('region', { name: 'Producto y medida' });
    expect(within(opciones).getAllByRole('button').map(b => b.textContent)).toEqual(['Mesa', 'Comedor 6 puestosConjunto · 1 Mesa + 6 Sillas']);
    expect(within(opciones).getByRole('button', { name: 'Mesa', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });
  it('busca sin tildes por medida, filtra localmente y conserva el precio de la variante filtrada', async () => {
    montar();
    await screen.findByRole('button', { name: 'Consultar Detroit' });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sofa 200' } });
    expect(screen.queryByRole('button', { name: 'Consultar Qatar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Consultar Detroit' })).toHaveTextContent(formatCOP(2900000));
    const modal = await consultar('Detroit');
    expect(within(modal).getByRole('button', { name: 'Sofá 200 cm' })).toHaveAttribute('aria-pressed', 'true');
    expect(servicio.getCatalogo).toHaveBeenCalledTimes(1);
  });

  it('no sustituye una tela inexistente por otro precio al cambiar de medida', async () => {
    montar();
    const modal = await consultar('Detroit');
    fireEvent.click(within(modal).getByRole('button', { name: 'Sofá 200 cm' }));
    expect(within(modal).getByRole('button', { name: 'Agregar', exact: true })).toBeDisabled();
    expect(within(modal).getByText(/Esta medida no ofrece/)).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: /Grupo 2/ }));
    expect(within(modal).getByRole('button', { name: 'Agregar', exact: true })).toBeEnabled();
  });

  it('consulta y agrega diferentes telas sin ofrecer la función de comparar', async () => {
    montar();
    const modal = await consultar('Detroit');
    expect(screen.queryByRole('button', { name: /Comparar/ })).not.toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: 'Agregar', exact: true }));
    fireEvent.click(within(modal).getByRole('button', { name: /Grupo 2/ }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Agregar', exact: true }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Ver cotización' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Cotización · 2 productos');
  });

  it('muestra el comedor completo y permite agregarlo en un paso', async () => {
    montar();
    await screen.findByRole('button', { name: 'Consultar Detroit' });
    fireEvent.click(screen.getByRole('button', { name: 'Conjuntos', exact: true }));
    expect(screen.queryByRole('button', { name: 'Consultar Detroit' })).not.toBeInTheDocument();
    const modal = await consultar('Qatar');
    expect(within(modal).getByRole('button', { name: /Comedor 6 puestos/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(modal).getByText('1 Mesa + 6 Sillas')).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: 'Agregar', exact: true }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Ver cotización' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Incluye: 1 Mesa + 6 Sillas');
  });

  it('edita una combinación sin duplicarla ni alterar otra del mismo sofá', async () => {
    montar();
    let modal = await consultar('Detroit');
    fireEvent.click(within(modal).getByRole('button', { name: 'Agregar', exact: true }));
    fireEvent.click(within(modal).getByRole('button', { name: /Grupo 2/ }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Agregar', exact: true }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Ver cotización' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar Detroit Sofá 235 cm' })[0]);
    modal = screen.getByRole('dialog');
    fireEvent.click(within(modal).getByRole('button', { name: 'Aumentar cantidad', exact: true }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Guardar cambio' }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Ver cotización' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Cotización · 2 productos');
    expect(screen.getByRole('dialog')).toHaveTextContent(formatCOP(9400000));
  });

  it('si falla el guardado conserva la propuesta y no genera un folio ficticio', async () => {
    servicio.createCotizacion.mockRejectedValue(new Error('Sin conexión'));
    montar();
    const modal = await consultar('Detroit');
    fireEvent.click(within(modal).getByRole('button', { name: 'Agregar', exact: true }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Ver cotización' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generar cotización' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('dialog')).toHaveTextContent('Detroit');
    expect(screen.queryByText(/Documento/)).not.toBeInTheDocument();
  });

  it('actualiza un precio cambiado y exige revisar el total antes de emitir', async () => {
    servicio.getPrecioVariante.mockResolvedValue({ precio: 3100000, opcionales_incluidos: [] });
    servicio.createCotizacion.mockResolvedValue({ numero: 'COT-123' });
    montar();
    const modal = await consultar('Detroit');
    fireEvent.click(within(modal).getByRole('button', { name: 'Agregar', exact: true }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Ver cotización' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generar cotización' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Los precios cambiaron');
    expect(servicio.createCotizacion).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent(formatCOP(3100000));
    fireEvent.click(screen.getByRole('button', { name: 'Generar cotización' }));
    await screen.findByText('Documento COT-123');
  });

  it('reúne piezas de referencias diferentes y conserva el conjunto en la cotización emitida', async () => {
    servicio.createCotizacion.mockResolvedValue({ numero: 'COT-CONJUNTO' });
    montar();
    let modal = await consultar('Detroit');
    fireEvent.click(within(modal).getByRole('button', { name: 'Agregar', exact: true }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Cerrar', exact: true }));
    modal = await consultar('Qatar');
    fireEvent.click(within(modal).getByRole('button', { name: 'Mesa', exact: true }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Agregar', exact: true }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Ver cotización' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar Detroit Sofá 235 cm' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar Qatar Mesa' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nombre del conjunto' }), { target: { value: 'Ambiente sala y comedor' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agrupar (2)' }));
    expect(screen.getByText('Ambiente sala y comedor')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Generar cotización' }));
    await screen.findByText('Documento COT-CONJUNTO');
    const payload = servicio.createCotizacion.mock.calls[0][0];
    expect(payload.lineas).toHaveLength(2);
    expect(payload.lineas.every((l) => l.notas.includes('Conjunto: Ambiente sala y comedor'))).toBe(true);
  });

  it('conserva cliente y descuento cuando se edita un producto de la propuesta', async () => {
    montar();
    const modal = await consultar('Detroit');
    fireEvent.click(within(modal).getByRole('button', { name: 'Agregar', exact: true }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Ver cotización' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Cliente (opcional)' }), { target: { value: 'Cliente de prueba' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /Descuento en pesos/ }), { target: { value: '100000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Editar Detroit Sofá 235 cm' }));
    fireEvent.click(screen.getByRole('button', { name: /Grupo 2/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver cotización' }));
    expect(screen.getByRole('textbox', { name: 'Cliente (opcional)' })).toHaveValue('Cliente de prueba');
    expect(screen.getByRole('spinbutton', { name: /Descuento en pesos/ })).toHaveValue(100000);
  });
});

describe('Precio de adicionales', () => {
  it('bloquea agregar durante el cálculo y descarta respuestas tardías al cambiar tela', async () => {
    const respuestas = [];
    servicio.getPrecioVariante.mockImplementation(() => new Promise((resolve) => respuestas.push(resolve)));
    const agregar = vi.fn();
    montar(<ConfiguradorPrecio linea={sofa} onClose={vi.fn()} onAgregar={agregar} onVerCotizacion={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Reclinable/ }));
    expect(screen.getByRole('button', { name: 'Agregar', exact: true })).toBeDisabled();
    await waitFor(() => expect(respuestas).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: /Grupo 2/ }));
    await waitFor(() => expect(respuestas).toHaveLength(2));
    await act(async () => respuestas[0]({ precio: 3300000, opcionales_incluidos: [{ id: 100 }] }));
    expect(screen.getByRole('button', { name: 'Agregar', exact: true })).toBeDisabled();
    await act(async () => respuestas[1]({ precio: 3700000, opcionales_incluidos: [{ id: 100, descripcion: 'Reclinable' }] }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Agregar', exact: true })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Agregar', exact: true }));
    expect(agregar).toHaveBeenCalledWith(expect.objectContaining({ grupoId: 2, precioUnitario: 3700000, opcionales: [{ id: 100, descripcion: 'Reclinable' }] }));
  });
});

describe('Consulta de escritorio', () => {
  it('configura junto al catálogo, cambia de referencia y revisa la propuesta', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    try {
      montar();
      fireEvent.click(await screen.findByRole('button', { name: 'Consultar Detroit' }));
      const panel = screen.getByRole('region', { name: 'Configurar Detroit' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.click(within(panel).getByRole('button', { name: /Grupo 2/ }));
      expect(screen.queryByRole('button', { name: /Comparar/ })).not.toBeInTheDocument();
      fireEvent.click(within(panel).getByRole('button', { name: 'Agregar', exact: true }));
      expect(screen.getByRole('region', { name: 'Resumen de la venta' })).toHaveTextContent(formatCOP(3400000));
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sofa 200' } });
      fireEvent.click(screen.getByRole('button', { name: 'Consultar Detroit' }));
      expect(within(screen.getByRole('region', { name: 'Configurar Detroit' })).getByRole('button', { name: 'Sofá 200 cm' })).toHaveAttribute('aria-pressed', 'true');
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: 'Consultar Qatar' }));
      expect(screen.queryByRole('region', { name: 'Configurar Detroit' })).not.toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Configurar Qatar' })).toHaveTextContent('Comedor 6 puestos');
      fireEvent.click(screen.getByRole('button', { name: 'Ver lista' }));
      expect(screen.getByRole('button', { name: 'Ver lista' })).toHaveAttribute('aria-pressed', 'true');
      fireEvent.change(screen.getByLabelText('Ordenar referencias'), { target: { value: 'precio' } });
      expect(screen.getAllByRole('button', { name: /^Consultar / })[0]).toHaveAccessibleName('Consultar Qatar');
      fireEvent.click(screen.getByRole('button', { name: 'Revisar cotización' }));
      expect(screen.getByRole('dialog')).toHaveTextContent('Detroit');
    } finally { vi.unstubAllGlobals(); }
  });
});

it('bloquea un especial sin consumo compatible al cambiar de material', async () => {
  servicio.getPrecioVariante.mockResolvedValue({ precio: 3100000, opcionales_incluidos: [{ id: 100, descripcion: 'Especial tapizado' }] });
  montar(<ConfiguradorPrecio linea={{ ...sofa, variantes: [{ ...sofa.variantes[0], opcionales: [{ id: 100, descripcion: 'Especial tapizado', precios: [{ grupo: 1, valor: 100000 }] }] }] }} onClose={vi.fn()} onAgregar={vi.fn()} onVerCotizacion={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /Especial tapizado/ }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Agregar', exact: true })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: /Grupo 2/ }));
  expect(screen.getByRole('alert')).toHaveTextContent('no tiene consumo');
  expect(screen.getByRole('button', { name: 'Agregar', exact: true })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /Especial tapizado/ }));
  expect(screen.getByRole('button', { name: 'Agregar', exact: true })).toBeEnabled();
});

it('un opcional habilitado llega seleccionado y se puede quitar; el deshabilitado no', async () => {
  servicio.getPrecioVariante.mockResolvedValue({ precio: 3200000, opcionales_incluidos: [{ id: 100, descripcion: 'USB' }] });
  const onAgregar = vi.fn();
  const variante = { ...sofa.variantes[0], opcionales: [{ id: 100, descripcion: 'USB', valor: 200000, preseleccionado: true }, { id: 101, descripcion: 'Brazos', valor: 50000, preseleccionado: false }] };
  montar(<ConfiguradorPrecio linea={{ ...sofa, variantes: [variante] }} inicial={{ varianteId: 10, grupoId: 1 }} onClose={vi.fn()} onAgregar={onAgregar} onVerCotizacion={vi.fn()} />);
  expect(screen.getByRole('button', { name: /USB/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /Brazos/ })).toHaveAttribute('aria-pressed', 'false');
  await waitFor(() => expect(servicio.getPrecioVariante).toHaveBeenCalledWith(10, { grupo: 1, opcionales: [100] }));
  fireEvent.click(screen.getByRole('button', { name: /USB/ }));
  expect(screen.getByRole('button', { name: /USB/ })).toHaveAttribute('aria-pressed', 'false');
});
