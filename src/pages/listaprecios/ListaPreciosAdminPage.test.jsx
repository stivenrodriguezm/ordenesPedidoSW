import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as servicio from '../../services/listaPreciosService';
import ListaPreciosAdminPage from './ListaPreciosAdminPage';

vi.mock('../../services/listaPreciosService', async (original) => ({ ...await original(), getLineas: vi.fn(), getLinea: vi.fn(), getReferenciasPrecios: vi.fn(), getGruposTela: vi.fn(), getCategorias: vi.fn(), getMultiplicadores: vi.fn(), updateVariante: vi.fn(), createCargo: vi.fn(), createLinea: vi.fn(), updateLinea: vi.fn() }));
let variante;
const montar = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><ListaPreciosAdminPage /></QueryClientProvider>);
  fireEvent.click(await screen.findByText('Detroit', { exact: true }));
  await screen.findByLabelText('Costo base');
  return client;
};
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  variante = { id: 10, nombre: 'Sofá 235', categoria: 1, categoria_nombre: 'Salas', costo_base: '3000000.00', metraje_tela: '12.00', decimetraje_cuero: null, descuento_maximo: null,
    multiplicador_efectivo: '1.76', cargos: [], precios: [], componentes: [], notas: [], precios_venta: [] };
  servicio.getCategorias.mockResolvedValue([{ id: 1, nombre: 'Salas' }]);
  servicio.getGruposTela.mockResolvedValue([]);
  servicio.getMultiplicadores.mockResolvedValue([{ id: 1, valor: '1.76', es_general: true }]);
  servicio.getLineas.mockImplementation(async () => [{ id: 1, nombre: 'Detroit', activo: true, variantes: [{ ...variante }] }]);
  servicio.getLinea.mockImplementation(async () => ({ id: 1, referencia: 101, nombre: 'Detroit', proveedor_nombre: 'Proveedor demo', categorias: [{ id: 1, nombre: 'Salas' }], subcategorias: [], activo: true, variantes: [{ ...variante }] }));
  servicio.getReferenciasPrecios.mockImplementation(async () => [{ id: 101, referencia: 101, nombre: 'Detroit', proveedor_nombre: 'Proveedor demo', categorias: [{ id: 1, nombre: 'Salas' }], subcategorias: [], linea: { id: 1, referencia: 101, nombre: 'Detroit', proveedor_nombre: 'Proveedor demo', variantes: [{ ...variante }] } }]);
  servicio.updateVariante.mockImplementation(async (_, patch) => { Object.assign(variante, patch); return { ...variante }; });
});

describe('Administración de precios', () => {
  it('carga solo cabeceras y pide cada referencia al abrirla; reabrir reutiliza el detalle', async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ListaPreciosAdminPage /></QueryClientProvider>);
    const cabecera = await screen.findByText('Detroit', { exact: true });
    expect(servicio.getReferenciasPrecios).toHaveBeenCalledTimes(1);
    expect(servicio.getLinea).not.toHaveBeenCalled();
    fireEvent.click(cabecera);
    await screen.findByLabelText('Costo base');
    expect(servicio.getLinea).toHaveBeenCalledTimes(1);
    fireEvent.click(cabecera); fireEvent.click(cabecera);
    expect(screen.getByLabelText('Costo base')).toBeInTheDocument();
    expect(servicio.getLinea).toHaveBeenCalledTimes(1);
  });

  it('confirmar el costo no espera otro GET ni recarga toda la lista', async () => {
    const client = await montar();
    servicio.getLinea.mockImplementation(() => new Promise(() => {}));
    const input = screen.getByLabelText('Costo base');
    fireEvent.change(input, { target: { value: '3500000' } }); fireEvent.blur(input);
    await screen.findByText('Guardado');
    expect(input).toBeEnabled();
    expect(input).toHaveValue('$3.500.000');
    expect(servicio.getReferenciasPrecios).toHaveBeenCalledTimes(1);
    expect(servicio.getLinea).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(['lp-linea', 1]).variantes[0].costo_base).toBe(3500000);
  });

  it('refrescar una variante mantiene intacto el borrador pendiente de otra', async () => {
    const otra = { ...variante, id: 11, nombre: 'Sofá 180', costo_base: '2000000.00' };
    servicio.getLinea.mockImplementation(async () => ({ id: 1, nombre: 'Detroit', activo: true, variantes: [{ ...variante }, otra] }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ListaPreciosAdminPage /></QueryClientProvider>);
    fireEvent.click(await screen.findByText('Detroit', { exact: true }));
    const [primero, segundo] = await screen.findAllByLabelText('Costo base');
    fireEvent.change(segundo, { target: { value: '2450000' } });
    fireEvent.change(primero, { target: { value: '3500000' } }); fireEvent.blur(primero);
    await screen.findByText('Guardado');
    await waitFor(() => expect(servicio.getLinea).toHaveBeenCalledTimes(2));
    expect(segundo).toHaveValue('$2.450.000');
    expect(segundo.closest('[data-estado]')).toHaveAttribute('data-estado', 'pendiente');
  });

  it('guarda un costo entero e invalida la consulta del vendedor', async () => {
    const client = await montar();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    const input = screen.getByLabelText('Costo base');
    expect(input).toHaveValue('$3.000.000');
    fireEvent.change(input, { target: { value: '3500000' } }); fireEvent.blur(input);
    await waitFor(() => expect(servicio.updateVariante).toHaveBeenCalledWith(10, { costo_base: 3500000 }));
    await screen.findByText('Guardado');
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['listaprecios-catalogo'] });
    expect(screen.getByLabelText('Costo base')).toHaveValue('$3.500.000');
  });
  it('activar cuero no inventa un consumo y guardar decímetros no modifica los metros', async () => {
    await montar();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aplica cuero' }));
    expect(servicio.updateVariante).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Decimetraje de cuero'), { target: { value: '120,5' } });
    fireEvent.blur(screen.getByLabelText('Decimetraje de cuero'));
    await screen.findByText('Guardado');
    expect(servicio.updateVariante).toHaveBeenCalledWith(10, { decimetraje_cuero: 120.5 });
    expect(screen.getByLabelText('Metraje de tela')).toHaveValue('12');
  });
  it('serializa dos cambios del mismo producto para evitar que se adelanten las respuestas', async () => {
    let terminar;
    servicio.updateVariante.mockImplementationOnce(() => new Promise((resolve) => { terminar = resolve; })).mockResolvedValue({});
    await montar();
    fireEvent.change(screen.getByLabelText('Costo base'), { target: { value: '3500000' } }); fireEvent.blur(screen.getByLabelText('Costo base'));
    await waitFor(() => expect(servicio.updateVariante).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('Tope Dcto'), { target: { value: '20,5' } }); fireEvent.blur(screen.getByLabelText('Tope Dcto'));
    expect(servicio.updateVariante).toHaveBeenCalledTimes(1);
    await act(async () => terminar({}));
    await waitFor(() => expect(servicio.updateVariante).toHaveBeenCalledTimes(2));
    expect(servicio.updateVariante).toHaveBeenLastCalledWith(10, { descuento_maximo: 20.5 });
  });
  it('«Cojines incluidos» crea el cargo fijo y queda bloqueado', async () => {
    servicio.createCargo.mockImplementation(async (data) => { variante.cargos = [{ id: 5, descripcion: 'Decorativos x2', valor: '0.00', opcional: false, tipo: 'decorativos' }]; return { id: 5, ...data }; });
    await montar();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir Sofá 235' }));
    fireEvent.click(screen.getByRole('button', { name: /Cojines incluidos/ }));
    await waitFor(() => expect(servicio.createCargo).toHaveBeenCalledWith({ variante: 10, tipo: 'decorativos' }));
    expect(await screen.findByText('Incluido · fijo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cojines incluidos/ })).not.toBeInTheDocument();
  });
  it('una nota nueva se guarda con Enter', async () => {
    await montar();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir Sofá 235' }));
    const nueva = screen.getByLabelText('Nueva nota');
    fireEvent.change(nueva, { target: { value: '  En cuero incluye base metálica ' } });
    fireEvent.keyDown(nueva, { key: 'Enter' });
    await waitFor(() => expect(servicio.updateVariante).toHaveBeenCalledWith(10, { notas: ['En cuero incluye base metálica'] }));
  });
  it('la barra de secciones cambia de sección y marca la activa', async () => {
    await montar();
    fireEvent.click(screen.getByRole('tab', { name: /Multiplicadores/ }));
    expect(screen.getByRole('tab', { name: /Multiplicadores/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'lp-tab-multiplicadores');
  });
  it('no pierde un costo con error al intentar cerrar la colección', async () => {
    await montar();
    const input = screen.getByLabelText('Costo base');
    fireEvent.change(input, { target: { value: '' } }); fireEvent.blur(input);
    const captura = input.closest('.lp-variante-card');
    expect(within(captura).getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Detroit', { exact: true }));
    expect(screen.getByLabelText('Costo base')).toBeInTheDocument();
    expect(servicio.updateVariante).not.toHaveBeenCalled();
  });
  it('impide revisar la publicación mientras hay un costo sin confirmar', async () => {
    await montar();
    fireEvent.change(screen.getByLabelText('Costo base'), { target: { value: '3500000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Configurar precios de Detroit' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Costo base')).toHaveValue('$3.500.000');
  });
});


describe('Configurar los precios de una referencia existente', () => {
  const referencia = { id: 101, nombre: 'Detroit', proveedor_nombre: 'Proveedor demo', categorias: [], subcategorias: [], linea: null };
  const inicio = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ListaPreciosAdminPage /></QueryClientProvider>);

  it('selecciona la referencia sin crear otro nombre o proveedor y abre su captura', async () => {
    servicio.getReferenciasPrecios.mockResolvedValue([referencia]);
    servicio.createLinea.mockResolvedValue({ id: 22, referencia: 101, nombre: 'Detroit', proveedor_nombre: 'Proveedor demo', activo: false, categorias: [], subcategorias: [], variantes: [] });
    inicio();
    await screen.findByRole('button', { name: 'Configurar Detroit de Proveedor demo' });
    fireEvent.click(screen.getByRole('button', { name: /Sin precios/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Configurar Detroit de Proveedor demo' }));
    await waitFor(() => expect(servicio.createLinea).toHaveBeenCalledWith({ referencia: 101, activo: false }));
    expect(await screen.findByRole('button', { name: 'Agregar variante' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva Línea' })).not.toBeInTheDocument();
    expect(screen.getByText('Borrador', { exact: true })).toBeInTheDocument();
  });

  it('un error mantiene la referencia disponible para reintentar sin duplicarla', async () => {
    servicio.getReferenciasPrecios.mockResolvedValue([referencia]);
    servicio.createLinea.mockRejectedValueOnce({ response: { status: 400, data: { referencia: ['No se pudo configurar.'] } } }).mockResolvedValueOnce({ id: 22, referencia: 101, nombre: 'Detroit', variantes: [] });
    inicio();
    const boton = await screen.findByRole('button', { name: 'Configurar Detroit de Proveedor demo' });
    fireEvent.click(boton);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo configurar.');
    fireEvent.click(boton);
    expect(await screen.findByRole('button', { name: 'Agregar variante' })).toBeInTheDocument();
    expect(servicio.createLinea).toHaveBeenCalledTimes(2);
  });

  it('busca por proveedor y distingue referencias con el mismo nombre', async () => {
    servicio.getReferenciasPrecios.mockResolvedValue([referencia, { ...referencia, id: 102, proveedor_nombre: 'Otro fabricante' }]);
    inicio();
    expect(await screen.findByRole('button', { name: 'Configurar Detroit de Otro fabricante' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar referencia, proveedor o medida'), { target: { value: 'otro fabricante' } });
    expect(screen.queryByRole('button', { name: 'Configurar Detroit de Proveedor demo' })).not.toBeInTheDocument();
    expect(screen.getByText('Ref. #102 · Sin clasificación · Sin precios')).toBeInTheDocument();
  });

  it('editar precios permite notas y publicación sin editar la identidad de Referencias', async () => {
    servicio.updateLinea.mockImplementation(async (_, patch) => ({ ...await servicio.getLinea(), ...patch }));
    await montar();
    fireEvent.click(screen.getByRole('button', { name: 'Configurar precios de Detroit' }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).queryByLabelText('Nombre')).not.toBeInTheDocument();
    expect(within(modal).getByText('Proveedor demo')).toBeInTheDocument();
    fireEvent.change(within(modal).getByRole('textbox'), { target: { value: 'Nota comercial' } });
    fireEvent.click(within(modal).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(servicio.updateLinea).toHaveBeenCalledWith(1, { notas: 'Nota comercial', activo: true, fotos: [], es_decorativo: false }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
