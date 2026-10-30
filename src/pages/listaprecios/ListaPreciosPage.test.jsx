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
  it('descarta el catálogo del navegador anterior a la unificación de subcategorías', async () => {
    localStorage.setItem('lp_catalogo_40', JSON.stringify({ t: Date.now(), data: [{ ...sofa, id: 555, nombre: 'Colección anterior' }] }));
    servicio.getCatalogo.mockResolvedValue([{ ...sofa, referencia: 101, variantes: [{ ...sofa.variantes[0], subcategoria: 71, nombre: 'Subcategoría actual' }] }]);
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Consultar Detroit' }));
    const region = within(screen.getByRole('dialog')).getByRole('region', { name: 'Subcategoría' });
    expect(within(region).getByRole('button', { name: 'Subcategoría actual' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Consultar Colección anterior' })).not.toBeInTheDocument();
  });
  it('con una categoría elegida, la referencia solo muestra sus subcategorías de esa categoría', async () => {
    servicio.getCatalogo.mockResolvedValue([{ id: 5, referencia: 101, nombre: 'Valencia', fotos: [], variantes: [
      { id: 50, subcategoria: 71, nombre: 'Sofá 3p.', categoria: 1, categoria_nombre: 'Salas', precios: [grupo(1, 3000000)], opcionales: [], notas: [] },
      { id: 51, subcategoria: 72, nombre: 'Silla de comedor', categoria: 2, categoria_nombre: 'Comedores', precios: [grupo(1, 900000)], opcionales: [], notas: [] },
    ] }]);
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Comedores' }));
    const region = within(await consultar('Valencia')).getByRole('region', { name: 'Subcategoría' });
    expect(within(region).getByRole('button', { name: 'Silla de comedor' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(region).queryByRole('button', { name: 'Sofá 3p.' })).not.toBeInTheDocument();
    // Sin filtro vuelve a mostrar todas.
    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    expect(within(within(screen.getByRole('dialog')).getByRole('region', { name: 'Subcategoría' })).getByRole('button', { name: 'Sofá 3p.' })).toBeInTheDocument();
  });
  it('presenta una sola referencia con sus proveedores y busca la ficha del proveedor correcto', async () => {
    servicio.getCatalogo.mockResolvedValue([
      { ...sofa, referencia: 101, proveedor: 7, proveedor_nombre: 'Fabricante Andino', variantes: [{ ...sofa.variantes[0], subcategoria: 71 }] },
      { ...sofa, id: 3, referencia: 102, proveedor: 8, proveedor_nombre: 'Fabricante Costero', variantes: [{ ...sofa.variantes[1], id: 31, subcategoria: 72 }] },
    ]);
    montar();
    // La consulta no menciona proveedores (2026-10-21); se sigue pudiendo buscar por ellos.
    expect(await screen.findByRole('button', { name: 'Consultar Detroit' })).not.toHaveTextContent('proveedores');
    expect(screen.getAllByRole('button', { name: /^Consultar Detroit/ })).toHaveLength(1);
    expect(screen.getByText('1 referencia')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'fabricante costero' } });
    const modal = await consultar('Detroit');
    expect(within(modal).getByRole('button', { name: 'Sofá 200 cm', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(within(modal).queryByText('Fabricante Costero', { exact: true })).not.toBeInTheDocument();
  });

  it('agrupa tres proveedores de Valencia y conserva sus precios e identidades al agregar y editar', async () => {
    const valores = [3168000, 1165120, 12270720];
    const nombres = ['Tapa de 6p.', 'Silla de comedor', 'Comedor 6p.'];
    servicio.getCatalogo.mockResolvedValue([100, 174, 65].map((ref, i) => ({ id: 204 + i, referencia: ref, nombre: 'Valencia', proveedor: 10 + i, proveedor_nombre: ['Gerardo Urrea', 'John Galindo', 'Metalisteros'][i], fotos: [],
      variantes: [{ id: 801 + i, subcategoria: 71 + i, nombre: nombres[i], categoria: 2, categoria_nombre: 'Comedor', precios: [grupo(1, valores[i])], opcionales: [], notas: [] }] })));
    montar();
    const tarjeta = await screen.findByRole('button', { name: 'Consultar Valencia', exact: true });
    expect(tarjeta).not.toHaveTextContent('proveedores');
    expect(tarjeta).toHaveTextContent('3 subcategorías');
    fireEvent.click(tarjeta);
    let modal = screen.getByRole('dialog');
    fireEvent.click(within(modal).getByRole('button', { name: 'Silla de comedor', exact: true }));
    expect(within(modal).queryByText('John Galindo', { exact: true })).not.toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: 'Agregar', exact: true }));
    const [item] = JSON.parse(localStorage.getItem('lp_cotizacion_cart_40'));
    expect(item).toMatchObject({ lineaId: 205, referenciaId: 174, varianteId: 802, precioUnitario: 1165120, proveedorNombre: 'John Galindo' });
    fireEvent.click(within(modal).getByRole('button', { name: 'Ver cotización' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Valencia Silla de comedor' }));
    modal = screen.getByRole('dialog');
    expect(within(modal).getByRole('button', { name: 'Silla de comedor', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(within(modal).queryByText('John Galindo', { exact: true })).not.toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: 'Aumentar cantidad' }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Guardar cambio' }));
    const actualizados = JSON.parse(localStorage.getItem('lp_cotizacion_cart_40'));
    expect(actualizados).toHaveLength(1);
    expect(actualizados[0]).toMatchObject({ referenciaId: 174, varianteId: 802, cantidad: 2, precioUnitario: 1165120 });
  });

  it('la misma subcategoría tiene un selector de proveedor y no mezcla sus precios, notas ni fotos', async () => {
    servicio.getCatalogo.mockResolvedValue([7, 8].map((proveedor, i) => ({ id: 201 + i, referencia: 101 + i, nombre: 'Valencia', proveedor, proveedor_nombre: `Fabricante ${proveedor}`, fotos: [`/foto-${proveedor}.jpg`], notas: `Acabado de ${proveedor}`,
      variantes: [{ id: 801 + i, subcategoria: 71, nombre: 'Mesa de 6', categoria: 2, categoria_nombre: 'Comedor', precios: [grupo(1, 1000000 + i * 500000)], opcionales: [], notas: [] }] })));
    montar();
    const modal = await consultar('Valencia');
    expect(within(modal).getByRole('region', { name: 'Subcategoría' }).querySelectorAll('.lp-variante-opcion')).toHaveLength(1);
    const opcion = within(modal).getByLabelText('Opciones de Mesa de 6');
    expect([...opcion.options].map(o => o.textContent)).toEqual([`Opción 1 · desde ${formatCOP(1000000)}`, `Opción 2 · desde ${formatCOP(1500000)}`]);
    fireEvent.change(opcion, { target: { value: '802' } });
    expect(within(modal).getByText('Acabado de 8')).toBeInTheDocument();
    expect(within(modal).queryByText('Acabado de 7')).not.toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: 'Agregar', exact: true }));
    expect(JSON.parse(localStorage.getItem('lp_cotizacion_cart_40'))[0]).toMatchObject({ lineaId: 202, referenciaId: 102, varianteId: 802, foto: '/foto-8.jpg', precioUnitario: 1500000 });
  });
  it('respeta el orden de administración y selecciona la primera variante sin adelantar los conjuntos', async () => {
    montar();
    const modal = await consultar('Qatar');
    const opciones = within(modal).getByRole('region', { name: 'Subcategoría' });
    expect(within(opciones).getAllByRole('button').map(b => b.textContent)).toEqual(['Mesa', 'Comedor 6 puestos1 Mesa + 6 Sillas']);
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
    expect(within(modal).getAllByText('1 Mesa + 6 Sillas').length).toBeGreaterThan(0);
    expect(within(modal).queryByText(/Conjunto/)).not.toBeInTheDocument();
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
    fireEvent.change(screen.getByRole('textbox', { name: 'Porcentaje de descuento general' }), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Editar Detroit Sofá 235 cm' }));
    fireEvent.click(screen.getByRole('button', { name: /Grupo 2/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver cotización' }));
    expect(screen.getByRole('textbox', { name: 'Cliente (opcional)' })).toHaveValue('Cliente de prueba');
    expect(screen.getByRole('textbox', { name: 'Porcentaje de descuento general' })).toHaveValue('10');
  });

  it('el precio final calcula el % de descuento general y viaja en pesos', async () => {
    montar();
    const modal = await consultar('Detroit');
    fireEvent.click(within(modal).getByRole('button', { name: 'Agregar', exact: true }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Ver cotización' }));
    const final = screen.getByRole('textbox', { name: 'Precio final de la cotización' });
    const subtotal = Number(final.getAttribute('placeholder').replace(/[^0-9]/g, ''));
    const deseado = Math.round(subtotal * 0.9);
    fireEvent.change(final, { target: { value: String(deseado) } });
    expect(screen.getByRole('textbox', { name: 'Porcentaje de descuento general' })).toHaveValue('10');
    fireEvent.change(final, { target: { value: '3.500.000,50' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/sin centavos/);
    expect(screen.getByRole('button', { name: 'Generar cotización' })).toBeDisabled();
    fireEvent.change(final, { target: { value: String(deseado) } });
    fireEvent.click(screen.getByRole('button', { name: 'Generar cotización' }));
    await waitFor(() => expect(servicio.createCotizacion).toHaveBeenCalled());
    expect(servicio.createCotizacion.mock.calls.at(-1)[0].descuento).toBe(subtotal - deseado);
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

it('«Cojines incluidos» opcional da el cupo de decorativos solo al elegirlo', async () => {
  servicio.getPrecioVariante.mockResolvedValue({ precio: 3200000, opcionales_incluidos: [{ id: 300, descripcion: 'Decorativos x2' }] });
  const onAgregar = vi.fn();
  const variante = { ...sofa.variantes[0], decorativos_incluidos: 0, opcionales: [{ id: 300, descripcion: 'Decorativos x2', valor: 200640, preseleccionado: false, decorativos: true }] };
  montar(<ConfiguradorPrecio linea={{ ...sofa, variantes: [variante] }} inicial={{ varianteId: 10, grupoId: 1 }} onClose={vi.fn()} onAgregar={onAgregar} onVerCotizacion={vi.fn()} />);
  expect(screen.queryByText(/Por unidad incluye/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Decorativos x2/ }));
  expect(screen.getByText(/Por unidad incluye 2 productos/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Agregar', exact: true })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Agregar', exact: true }));
  expect(onAgregar).toHaveBeenCalledWith(expect.objectContaining({ decorativosIncluidos: 2 }));
});

describe('Adicionales al elegir la subcategoría (2026-10-21)', () => {
  const variante = (extra = {}) => ({ ...sofa.variantes[0], incluidos: ['Armado'],
    opcionales: [{ id: 100, descripcion: 'Reclino eléctrico', valor: 1000000, preseleccionado: false, multiple: true },
      { id: 101, descripcion: 'Transporte', valor: 211200, preseleccionado: true, multiple: false }], ...extra });

  it('van justo después de la subcategoría, con los obligatorios fijos y los habilitados seleccionados', () => {
    servicio.getPrecioVariante.mockResolvedValue({ precio: 3100000, opcionales_incluidos: [] });
    montar(<ConfiguradorPrecio linea={{ ...sofa, variantes: [variante()] }} inicial={{ varianteId: 10, grupoId: 1 }} onClose={vi.fn()} onAgregar={vi.fn()} onVerCotizacion={vi.fn()} />);
    const secciones = [...document.querySelectorAll('.lp-config-section')].map((s) => s.getAttribute('aria-label'));
    expect(secciones.slice(0, 3)).toEqual(['Subcategoría', 'Adicionales', 'Grupo de tela']);
    expect(screen.getByText('Armado').closest('.lp-opcional-chip')).toHaveClass('lp-opcional-chip--fijo');
    expect(screen.getByRole('button', { name: /Transporte/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('group', { name: 'Unidades de Transporte' })).not.toBeInTheDocument();
  });

  it('un adicional múltiple se puede llevar varias veces', async () => {
    servicio.getPrecioVariante.mockResolvedValue({ precio: 5100000, opcionales_incluidos: [{ id: 100, descripcion: 'Reclino eléctrico', valor: 1000000, cantidad: 2 }] });
    const onAgregar = vi.fn();
    montar(<ConfiguradorPrecio linea={{ ...sofa, variantes: [variante()] }} inicial={{ varianteId: 10, grupoId: 1 }} onClose={vi.fn()} onAgregar={onAgregar} onVerCotizacion={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Reclino eléctrico/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar una unidad de Reclino eléctrico' }));
    expect(within(screen.getByRole('group', { name: 'Unidades de Reclino eléctrico' })).getByText('2')).toBeInTheDocument();
    await waitFor(() => expect(servicio.getPrecioVariante).toHaveBeenLastCalledWith(10, { grupo: 1, opcionales: [100, 100, 101] }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Agregar', exact: true })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Agregar', exact: true }));
    expect(onAgregar).toHaveBeenCalledWith(expect.objectContaining({ opcionales: [expect.objectContaining({ id: 100, cantidad: 2 })] }));
  });

  it('si el catálogo guardado se actualiza, toma los habilitados nuevos mientras no se toquen', () => {
    servicio.getPrecioVariante.mockResolvedValue({ precio: 3100000, opcionales_incluidos: [] });
    const sinHabilitar = variante({ opcionales: [{ id: 101, descripcion: 'Transporte', valor: 211200, preseleccionado: false, multiple: false }] });
    const props = { inicial: { varianteId: 10, grupoId: 1 }, onClose: vi.fn(), onAgregar: vi.fn(), onVerCotizacion: vi.fn() };
    const { rerender } = montar(<ConfiguradorPrecio linea={{ ...sofa, variantes: [sinHabilitar] }} {...props} />);
    expect(screen.getByRole('button', { name: /Transporte/ })).toHaveAttribute('aria-pressed', 'false');
    // Misma consulta abierta (mismo componente), con el catálogo fresco que llega después.
    rerender(<QueryClientProvider client={new QueryClient()}><AppContext.Provider value={{ usuario: { id: 40, username: 'Vendedor' } }}>
      <ConfiguradorPrecio linea={{ ...sofa, variantes: [variante()] }} {...props} /></AppContext.Provider></QueryClientProvider>);
    expect(screen.getByRole('button', { name: /Transporte/ })).toHaveAttribute('aria-pressed', 'true');
  });
});

it('la nota del producto va con el ítem y en las notas de la cotización', async () => {
  const { notasCotizacion } = await import('../../utils/consultaPrecios');
  servicio.getPrecioVariante.mockResolvedValue({ precio: 3000000, opcionales_incluidos: [] });
  const onAgregar = vi.fn();
  montar(<ConfiguradorPrecio linea={sofa} inicial={{ varianteId: 10, grupoId: 1 }} onClose={vi.fn()} onAgregar={onAgregar} onVerCotizacion={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Nota del producto'), { target: { value: '  Patas en roble ' } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Agregar', exact: true })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Agregar', exact: true }));
  const item = onAgregar.mock.calls[0][0];
  expect(item.notaVendedor).toBe('Patas en roble');
  expect(notasCotizacion(item)).toContain('Nota: Patas en roble');
  expect(screen.getByLabelText('Nota del producto')).toHaveValue('');
});
