import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as servicio from '../../services/listaPreciosService';
import ListaPreciosAdminPage from './ListaPreciosAdminPage';

vi.mock('../../services/listaPreciosService', async (original) => ({ ...await original(), getLineas: vi.fn(), getLinea: vi.fn(), getReferenciasPrecios: vi.fn(), getGruposTela: vi.fn(), getCategorias: vi.fn(), getMultiplicadores: vi.fn(), updateVariante: vi.fn(), createCargo: vi.fn(), createLinea: vi.fn(), updateLinea: vi.fn(), sincronizarSubcategorias: vi.fn(), guardarDisposicionSubcategorias: vi.fn(), renombrarSubcategoria: vi.fn(), simularComponentes: vi.fn() }));
let variante;
const vistaProveedor = async () => {
  await screen.findByRole('button', { name: 'Expandir referencia Detroit' });
  fireEvent.change(screen.getByLabelText('Agrupar por'), { target: { value: 'proveedor' } });
  fireEvent.change(screen.getByLabelText('Buscar referencia, proveedor o medida'), { target: { value: 'Detroit' } });
};
const montar = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><ListaPreciosAdminPage /></QueryClientProvider>);
  await vistaProveedor();
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
    await vistaProveedor();
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
    await vistaProveedor();
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
  it('«Cojines incluidos» crea el cargo con su valor y se edita como los demás cargos', async () => {
    servicio.createCargo.mockImplementation(async (data) => { variante.cargos = [{ id: 5, descripcion: 'Decorativos x2', valor: '114000.00', opcional: false, preseleccionado: false, tipo: 'decorativos' }]; return { id: 5, ...data }; });
    await montar();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir Sofá 235' }));
    fireEvent.click(screen.getByRole('button', { name: /Cojines incluidos/ }));
    await waitFor(() => expect(servicio.createCargo).toHaveBeenCalledWith({ variante: 10, tipo: 'decorativos' }));
    expect(await screen.findByLabelText('Estado de Decorativos x2')).toHaveValue('obligatorio');
    expect(screen.getByLabelText('Valor de Decorativos x2')).toHaveValue('$114.000');
    expect(screen.queryByRole('button', { name: /Cojines incluidos/ })).not.toBeInTheDocument();
  });
  it('«Transporte» agrega el cargo de $120.000 una sola vez', async () => {
    servicio.createCargo.mockImplementation(async (data) => { variante.cargos = [{ id: 6, descripcion: 'Transporte', valor: '120000.00', opcional: false, preseleccionado: false, tipo: 'transporte', unidades_por_transporte: null }]; return { id: 6, ...data }; });
    await montar();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir Sofá 235' }));
    fireEvent.click(screen.getByRole('button', { name: 'Transporte' }));
    await waitFor(() => expect(servicio.createCargo).toHaveBeenCalledWith({ variante: 10, tipo: 'transporte' }));
    expect(await screen.findByLabelText('Valor de Transporte')).toHaveValue('$120.000');
    expect(screen.queryByText('Unidades por transporte')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transporte' })).not.toBeInTheDocument();
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
  const inicio = async () => { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ListaPreciosAdminPage /></QueryClientProvider>); await vistaProveedor(); };

  it('selecciona la referencia sin crear otro nombre o proveedor y abre su captura', async () => {
    servicio.getReferenciasPrecios.mockResolvedValue([referencia]);
    servicio.createLinea.mockResolvedValue({ id: 22, referencia: 101, nombre: 'Detroit', proveedor_nombre: 'Proveedor demo', activo: false, categorias: [], subcategorias: [], variantes: [] });
    await inicio();
    await screen.findByRole('button', { name: 'Configurar Detroit de Proveedor demo' });
    fireEvent.click(screen.getByRole('button', { name: /Sin precios/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Configurar Detroit de Proveedor demo' }));
    await waitFor(() => expect(servicio.createLinea).toHaveBeenCalledWith({ referencia: 101, activo: false }));
    expect(await screen.findByRole('button', { name: 'Crear agrupación' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nueva Línea' })).not.toBeInTheDocument();
    expect(screen.getByText('Borrador', { exact: true })).toBeInTheDocument();
  });

  it('un error mantiene la referencia disponible para reintentar sin duplicarla', async () => {
    servicio.getReferenciasPrecios.mockResolvedValue([referencia]);
    servicio.createLinea.mockRejectedValueOnce({ response: { status: 400, data: { referencia: ['No se pudo configurar.'] } } }).mockResolvedValueOnce({ id: 22, referencia: 101, nombre: 'Detroit', variantes: [] });
    await inicio();
    const boton = await screen.findByRole('button', { name: 'Configurar Detroit de Proveedor demo' });
    fireEvent.click(boton);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo configurar.');
    fireEvent.click(boton);
    expect(await screen.findByRole('button', { name: 'Crear agrupación' })).toBeInTheDocument();
    expect(servicio.createLinea).toHaveBeenCalledTimes(2);
  });

  it('busca por proveedor y distingue referencias con el mismo nombre', async () => {
    servicio.getReferenciasPrecios.mockResolvedValue([referencia, { ...referencia, id: 102, proveedor_nombre: 'Otro fabricante' }]);
    await inicio();
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
    await waitFor(() => expect(servicio.updateLinea).toHaveBeenCalledWith(1, { notas: 'Nota comercial', fotos: [], es_decorativo: false }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});


describe('Subcategorías y agrupación del catálogo', () => {
  it('usa la identidad de la subcategoría sin otro nombre o selector de variante', async () => {
    await montar();
    expect(screen.getByLabelText('Subcategoría')).toHaveValue('Sofá 235');
    expect(screen.queryByLabelText('Producto / medida')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tipo de Sofá 235')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar variante' })).not.toBeInTheDocument();
  });

  it('muestra juntas referencias del mismo nombre y separa cada proveedor al cambiar agrupación', async () => {
    const refs = [
      { id: 1, nombre: 'Valencia', proveedor: 10, proveedor_nombre: 'Muebles Norte', categorias: [], subcategorias: [{ id: 1, nombre: 'Silla', categoria_nombre: 'Comedor' }], linea: null },
      { id: 2, nombre: 'Valencia', proveedor: 11, proveedor_nombre: 'Muebles Sur', categorias: [], subcategorias: [{ id: 2, nombre: 'Sofá', categoria_nombre: 'Sala' }], linea: null },
    ];
    servicio.getReferenciasPrecios.mockResolvedValue(refs);
    render(<QueryClientProvider client={new QueryClient()}><ListaPreciosAdminPage /></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText('Buscar referencia, proveedor o medida'), { target: { value: 'Valencia' } });
    expect(await screen.findByRole('button', { name: 'Contraer referencia Valencia' })).toBeInTheDocument();
    expect(screen.getByLabelText('Proveedor de Silla')).toHaveValue('1');
    expect(screen.getByLabelText('Proveedor de Sofá')).toHaveValue('2');
    expect(screen.queryByRole('button', { name: 'Configurar Valencia de Muebles Norte' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('listitem', { name: 'Silla' })).getByLabelText('Subcategoría')).toHaveValue('Silla');
    fireEvent.change(screen.getByLabelText('Agrupar por'), { target: { value: 'proveedor' } });
    expect(screen.getByRole('button', { name: 'Contraer proveedor Muebles Norte' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contraer proveedor Muebles Sur' })).toBeInTheDocument();
    expect(servicio.getLinea).not.toHaveBeenCalled();
  });

  it('cambiar agrupación o cerrar el grupo conserva los costos pendientes', async () => {
    await montar();
    fireEvent.change(screen.getByLabelText('Costo base'), { target: { value: '4250000' } });
    fireEvent.change(screen.getByLabelText('Agrupar por'), { target: { value: 'referencia' } });
    expect(screen.getByLabelText('Agrupar por')).toHaveValue('proveedor');
    fireEvent.click(screen.getByRole('button', { name: 'Contraer proveedor Proveedor demo' }));
    expect(screen.getByLabelText('Costo base')).toHaveValue('$4.250.000');
    expect(screen.getByRole('button', { name: 'Contraer proveedor Proveedor demo' })).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('Una referencia con proveedor independiente por subcategoría', () => {
  let lineas;
  const montarUnificada = async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><ListaPreciosAdminPage /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Expandir referencia Valencia' }));
    return client;
  };
  beforeEach(() => {
    const subcategorias = [{ id: 11, nombre: 'Mesa de 6', categoria: 1, categoria_nombre: 'Comedor' }, { id: 12, nombre: 'Silla', categoria: 1, categoria_nombre: 'Comedor' }];
    lineas = [1, 2].map(id => ({ id, referencia: id + 100, nombre: 'Valencia', proveedor: id + 10, proveedor_nombre: `Proveedor ${id}`, categorias: [{ id: 1, nombre: 'Comedor' }], subcategorias, activo: false,
      variantes: subcategorias.map((s, i) => ({ ...variante, id: id * 100 + i, subcategoria: s.id, nombre: s.nombre, categoria_nombre: s.categoria_nombre, costo_base: String(id * 100000 + i * 10000), costo_confirmado: true })) }));
    servicio.getReferenciasPrecios.mockResolvedValue(lineas.map(l => ({ id: l.referencia, referencia: l.referencia, nombre: l.nombre, proveedor: l.proveedor, proveedor_nombre: l.proveedor_nombre, categorias: l.categorias, subcategorias: l.subcategorias, linea: l })));
    servicio.getLinea.mockImplementation(async id => structuredClone(lineas.find(l => l.id === id)));
    servicio.updateVariante.mockImplementation(async (id, patch) => {
      const v = lineas.flatMap(l => l.variantes).find(v => v.id === id);
      Object.assign(v, patch); return { ...v };
    });
  });

  it('muestra cada subcategoría una vez, sin tarjetas de Valencia repetidas ni cargar todos los costos', async () => {
    await montarUnificada();
    expect(screen.getByRole('list', { name: 'Subcategorías de Valencia' }).children).toHaveLength(2);
    expect(screen.getByLabelText('Proveedor de Mesa de 6')).toHaveValue('');
    expect(screen.getByLabelText('Proveedor de Silla')).toHaveValue('');
    expect(screen.queryByText('Valencia', { exact: true })).not.toBeInTheDocument();
    expect(servicio.getLinea).not.toHaveBeenCalled();
  });

  it('publica directamente una subcategoría del proveedor elegido, sin sección ni modal ni publicar las otras', async () => {
    const client = await montarUnificada();
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    expect(screen.queryByRole('region', { name: 'Publicación de precios' })).not.toBeInTheDocument();
    expect(servicio.getLinea).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Proveedor de Mesa de 6'), { target: { value: '101' } });
    fireEvent.change(screen.getByLabelText('Proveedor de Silla'), { target: { value: '101' } });
    const publicar = await screen.findByRole('button', { name: 'Publicar Mesa de 6' });
    fireEvent.click(publicar);
    await waitFor(() => expect(servicio.updateVariante).toHaveBeenCalledWith(100, { publicado: true }));
    expect(await screen.findByRole('button', { name: 'Quitar publicación de Mesa de 6' })).toHaveTextContent('Publicada');
    expect(screen.getByRole('button', { name: 'Publicar Silla' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(lineas[1].variantes.every(v => !v.publicado)).toBe(true);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['listaprecios-catalogo'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['productos-venta-catalogo'] });
  });

  it('indica que falta guardar el costo y no permite publicar una ficha sin confirmar', async () => {
    lineas[0].variantes[0].costo_confirmado = false;
    await montarUnificada();
    fireEvent.change(screen.getByLabelText('Proveedor de Mesa de 6'), { target: { value: '101' } });
    const publicar = await screen.findByRole('button', { name: 'Publicar Mesa de 6' });
    expect(publicar).toBeDisabled();
    expect(publicar).toHaveAttribute('title', 'Guarda el costo antes de publicar');
    expect(servicio.updateVariante).not.toHaveBeenCalled();
  });

  it('un costo cero confirmado puede publicarse sin revisar otras subcategorías', async () => {
    lineas[0].variantes[0].costo_base = '0.00';
    lineas[0].variantes[1].costo_confirmado = false;
    await montarUnificada();
    fireEvent.change(screen.getByLabelText('Proveedor de Mesa de 6'), { target: { value: '101' } });
    const publicar = await screen.findByRole('button', { name: 'Publicar Mesa de 6' });
    expect(publicar).toBeEnabled();
    fireEvent.click(publicar);
    await screen.findByRole('button', { name: 'Quitar publicación de Mesa de 6' });
    expect(servicio.updateVariante).toHaveBeenCalledWith(100, { publicado: true });
    expect(lineas[0].variantes[0].costo_base).toBe('0.00');
    expect(lineas[0].variantes[1].publicado).not.toBe(true);
  });

  it('un error de publicación se muestra en la ficha y permite reintentar sin perder costos', async () => {
    servicio.updateVariante.mockRejectedValueOnce({ response: { data: { publicado: ['Confirma el costo antes de publicar.'] } } });
    await montarUnificada();
    fireEvent.change(screen.getByLabelText('Proveedor de Mesa de 6'), { target: { value: '101' } });
    const publicar = await screen.findByRole('button', { name: 'Publicar Mesa de 6' });
    fireEvent.click(publicar);
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirma el costo antes de publicar.');
    const ficha = screen.getByRole('listitem', { name: 'Mesa de 6' });
    expect(within(ficha).getByLabelText('Costo base')).toHaveValue('$100.000');
    expect(publicar).toBeEnabled();
    fireEvent.click(publicar);
    await screen.findByRole('button', { name: 'Quitar publicación de Mesa de 6' });
    expect(servicio.updateVariante).toHaveBeenCalledTimes(2);
  });

  it('no publica ni pierde un costo pendiente al pulsar el botón de la subcategoría', async () => {
    await montarUnificada();
    fireEvent.change(screen.getByLabelText('Proveedor de Mesa de 6'), { target: { value: '101' } });
    const costo = await within(screen.getByRole('listitem', { name: 'Mesa de 6' })).findByLabelText('Costo base');
    fireEvent.change(costo, { target: { value: '425000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar Mesa de 6' }));
    expect(costo).toHaveValue('$425.000');
    expect(servicio.updateVariante).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('«Agregar costos» crea solo la subcategoría pulsada y solo ella muestra el cargando', async () => {
    const ficha = lineas[0].variantes[0];
    lineas[0].variantes = [];
    let responder;
    servicio.sincronizarSubcategorias.mockImplementation(() => new Promise(r => { responder = r; }));
    await montarUnificada();
    fireEvent.change(screen.getByLabelText('Proveedor de Mesa de 6'), { target: { value: '101' } });
    fireEvent.change(screen.getByLabelText('Proveedor de Silla'), { target: { value: '101' } });
    const [mesa, silla] = await screen.findAllByRole('button', { name: 'Agregar costos' });
    fireEvent.click(mesa);
    await waitFor(() => expect(servicio.sincronizarSubcategorias).toHaveBeenCalledWith(1, 11));
    expect(mesa.querySelector('.ds-btn__spinner')).toBeInTheDocument();
    expect(silla.querySelector('.ds-btn__spinner')).not.toBeInTheDocument();
    expect(silla).toBeDisabled();
    lineas[0].variantes = [ficha];
    await act(async () => responder(structuredClone(lineas[0])));
    expect(await screen.findByRole('button', { name: 'Publicar Mesa de 6' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar costos' })).toBeEnabled();
  });

  it('permite volver a borrador solo la subcategoría elegida', async () => {
    lineas[0].variantes.forEach(v => { v.publicado = true; });
    await montarUnificada();
    fireEvent.change(screen.getByLabelText('Proveedor de Mesa de 6'), { target: { value: '101' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Quitar publicación de Mesa de 6' }));
    expect(await screen.findByRole('button', { name: 'Publicar Mesa de 6' })).toBeInTheDocument();
    expect(servicio.updateVariante).toHaveBeenCalledWith(100, { publicado: false });
    expect(lineas[0].variantes[1].publicado).toBe(true);
  });

  it('un conjunto no tiene selector de proveedor y sus piezas vienen de varios proveedores', async () => {
    const sub = { id: 13, nombre: 'Comedor de 6', categoria: 1, categoria_nombre: 'Comedor' };
    lineas[0].subcategorias = [...lineas[0].subcategorias, sub];
    lineas[0].variantes.push({ ...variante, id: 150, subcategoria: 13, nombre: 'Comedor de 6', categoria_nombre: 'Comedor', costo_confirmado: true, es_conjunto: true,
      componentes: [{ variante: 200, variante_nombre: 'Mesa de 6', proveedor: 12, proveedor_nombre: 'Proveedor 2', cantidad: 1, costo_unitario: null, multiplicador: null, adicionales: [] }, { variante: 101, variante_nombre: 'Silla', proveedor: 11, proveedor_nombre: 'Proveedor 1', cantidad: 6, costo_unitario: null, multiplicador: null, adicionales: [] }] });
    servicio.getReferenciasPrecios.mockResolvedValue(lineas.map(l => ({ id: l.referencia, referencia: l.referencia, nombre: l.nombre, proveedor: l.proveedor, proveedor_nombre: l.proveedor_nombre, categorias: l.categorias, subcategorias: l.subcategorias, linea: l })));
    servicio.simularComponentes.mockResolvedValue({ precios_venta: [], costo_total_producto: '0' });
    await montarUnificada();
    const conjunto = await screen.findByRole('listitem', { name: 'Comedor de 6' });
    expect(within(conjunto).queryByLabelText('Proveedor de Comedor de 6')).not.toBeInTheDocument();
    expect(await within(conjunto).findByText('Proveedor 2 · Proveedor 1')).toBeInTheDocument();
    await waitFor(() => expect(servicio.getLinea).toHaveBeenCalledTimes(2));
    fireEvent.click(within(conjunto).getByRole('button', { name: /Expandir/ }));
    fireEvent.click(await within(conjunto).findByText(/^Agrupación ·/));
    expect(await within(conjunto).findByText('Proveedor 2')).toBeInTheDocument();
    expect(within(conjunto).getByText('Proveedor 1')).toBeInTheDocument();
  });

  it('mesa y silla pueden elegir proveedores diferentes; guardar afecta únicamente su ficha exacta', async () => {
    const client = await montarUnificada();
    fireEvent.change(screen.getByLabelText('Proveedor de Mesa de 6'), { target: { value: '101' } });
    const mesa = await screen.findByRole('listitem', { name: 'Mesa de 6' });
    expect(await within(mesa).findByLabelText('Costo base')).toHaveValue('$100.000');
    fireEvent.change(screen.getByLabelText('Proveedor de Silla'), { target: { value: '102' } });
    const silla = screen.getByRole('listitem', { name: 'Silla' });
    const costo = await within(silla).findByLabelText('Costo base');
    expect(costo).toHaveValue('$210.000');
    fireEvent.change(costo, { target: { value: '350000' } }); fireEvent.blur(costo);
    await within(silla).findByText('Guardado');
    expect(servicio.updateVariante).toHaveBeenCalledWith(201, { costo_base: 350000 });
    expect(within(mesa).getByLabelText('Costo base')).toHaveValue('$100.000');
    expect(client.getQueryData(['lp-linea', 1]).variantes[0].costo_base).toBe('100000');
    expect(screen.getByLabelText('Proveedor de Mesa de 6')).toHaveValue('101');
    expect(screen.getByLabelText('Proveedor de Silla')).toHaveValue('102');
  });

  it('ofrece una sola creación por referencia y carga las piezas de todos sus proveedores al abrir', async () => {
    await montarUnificada();
    expect(screen.getAllByRole('button', { name: 'Crear agrupación' })).toHaveLength(1);
    expect(servicio.getLinea).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Crear agrupación' }));
    const modal = screen.getByRole('dialog', { name: 'Nueva agrupación de productos' });
    expect(await within(modal).findByLabelText('Nombre de la nueva subcategoría')).toBeInTheDocument();
    await waitFor(() => expect(servicio.getLinea).toHaveBeenCalledTimes(2));
    expect(within(modal).getByRole('group', { name: 'Proveedor 1' })).toBeInTheDocument();
    expect(within(modal).getByRole('group', { name: 'Proveedor 2' })).toBeInTheDocument();
    expect(within(modal).queryByLabelText('Subcategoría del conjunto')).not.toBeInTheDocument();
    expect(within(modal).queryByLabelText('Proveedor')).not.toBeInTheDocument();
  });

  it('en la vista por proveedor crea desde una única acción y elige referencia sin proveedor', async () => {
    await montarUnificada();
    fireEvent.change(screen.getByLabelText('Agrupar por'), { target: { value: 'proveedor' } });
    expect(screen.getAllByRole('button', { name: 'Crear agrupación' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Crear agrupación' }));
    const modal = screen.getByRole('dialog');
    const selector = within(modal).getByLabelText('Referencia');
    expect(within(selector).getAllByRole('option')).toHaveLength(2);
    fireEvent.change(selector, { target: { value: 'referencia-valencia' } });
    expect(await within(modal).findByLabelText('Nombre de la nueva subcategoría')).toBeInTheDocument();
    expect(within(modal).queryByLabelText('Proveedor')).not.toBeInTheDocument();
  });

  it('no permite preparar un conjunto con una carga parcial de proveedores y ofrece reintento', async () => {
    servicio.getLinea.mockImplementation(async id => {
      if (id === 2) throw new Error('Sin conexión');
      return structuredClone(lineas.find(l => l.id === id));
    });
    await montarUnificada();
    fireEvent.click(screen.getByRole('button', { name: 'Crear agrupación' }));
    const modal = screen.getByRole('dialog');
    expect(await within(modal).findByRole('alert')).toHaveTextContent('No se pudieron cargar todas las piezas.');
    expect(within(modal).queryByLabelText('Nombre de la nueva subcategoría')).not.toBeInTheDocument();
    servicio.getLinea.mockImplementation(async id => structuredClone(lineas.find(l => l.id === id)));
    fireEvent.click(within(modal).getByRole('button', { name: 'Reintentar' }));
    expect(await within(modal).findByLabelText('Nombre de la nueva subcategoría')).toBeInTheDocument();
  });

  it('cambiar de proveedor no copia precios ni descarta un costo pendiente', async () => {
    await montarUnificada();
    fireEvent.change(screen.getByLabelText('Proveedor de Mesa de 6'), { target: { value: '101' } });
    const costo = await within(screen.getByRole('listitem', { name: 'Mesa de 6' })).findByLabelText('Costo base');
    fireEvent.change(costo, { target: { value: '425000' } });
    fireEvent.change(screen.getByLabelText('Proveedor de Mesa de 6'), { target: { value: '102' } });
    expect(screen.getByLabelText('Proveedor de Mesa de 6')).toHaveValue('101');
    expect(costo).toHaveValue('$425.000');
    expect(servicio.updateVariante).not.toHaveBeenCalled();
    fireEvent.keyDown(costo, { key: 'Escape' });
    fireEvent.change(screen.getByLabelText('Proveedor de Mesa de 6'), { target: { value: '102' } });
    await waitFor(() => expect(within(screen.getByRole('listitem', { name: 'Mesa de 6' })).getByLabelText('Costo base')).toHaveValue('$200.000'));
    expect(screen.getByLabelText('Proveedor de Mesa de 6')).toHaveValue('102');
    expect(servicio.updateVariante).not.toHaveBeenCalled();
  });

  it('el arrastre guarda el orden de subcategorías sin modificar costos ni proveedor elegido', async () => {
    servicio.guardarDisposicionSubcategorias.mockResolvedValue({ revision: 1, orden: [12, 11], retiradas: [], referencias: [101, 102] });
    await montarUnificada();
    fireEvent.change(screen.getByLabelText('Proveedor de Mesa de 6'), { target: { value: '101' } });
    await within(screen.getByRole('listitem', { name: 'Mesa de 6' })).findByLabelText('Costo base');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Mover Mesa de 6' }), { key: 'ArrowDown' });
    await waitFor(() => expect(servicio.guardarDisposicionSubcategorias).toHaveBeenCalledWith(101, { revision: 0, orden: [12, 11] }));
    await screen.findByText('Orden guardado');
    expect(within(screen.getByRole('list', { name: 'Subcategorías de Valencia' })).getAllByRole('listitem').map(e => e.getAttribute('aria-label'))).toEqual(['Silla', 'Mesa de 6']);
    expect(screen.getByLabelText('Proveedor de Mesa de 6')).toHaveValue('101');
    expect(servicio.updateVariante).not.toHaveBeenCalled();
  });

  it('elimina tras confirmar y no muestra una sección de subcategorías eliminadas', async () => {
    servicio.guardarDisposicionSubcategorias.mockResolvedValueOnce({ revision: 1, orden: [12, 11], retiradas: [11], referencias: [101, 102] });
    await montarUnificada();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Mesa de 6 de la lista' }));
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText(/Los costos y los datos de Referencias se conservan/)).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: 'Eliminar de la lista' }));
    await waitFor(() => expect(screen.queryByRole('listitem', { name: 'Mesa de 6' })).not.toBeInTheDocument());
    expect(servicio.guardarDisposicionSubcategorias).toHaveBeenCalledWith(101, { revision: 0, retiradas: [11] });
    expect(screen.queryByText(/Subcategorías eliminadas/)).not.toBeInTheDocument();
  });

  it('permite renombrar desde la fila y actualiza ambos proveedores conservando IDs y costos', async () => {
    servicio.renombrarSubcategoria.mockResolvedValue({ id: 11, nombre: 'Mesa grande', categoria: 1, referencias_uso: 2 });
    const client = await montarUnificada();
    const nombre = within(screen.getByRole('listitem', { name: 'Mesa de 6' })).getByLabelText('Subcategoría');
    fireEvent.change(nombre, { target: { value: 'Mesa grande' } }); fireEvent.blur(nombre);
    await screen.findByRole('listitem', { name: 'Mesa grande' });
    expect(servicio.renombrarSubcategoria).toHaveBeenCalledWith(11, 'Mesa grande', expect.any(Number));
    expect(client.getQueryData(['lp-referencias']).map(r => r.linea.variantes[0].nombre)).toEqual(['Mesa grande', 'Mesa grande']);
    expect(client.getQueryData(['lp-referencias']).map(r => r.linea.variantes[0].costo_base)).toEqual(['100000', '200000']);
    expect(servicio.updateVariante).not.toHaveBeenCalled();
  });

  it('conserva el nombre escrito si el servidor rechaza un duplicado', async () => {
    servicio.renombrarSubcategoria.mockRejectedValue({ response: { data: { nombre: ['Ya existe otra subcategoría con ese nombre.'] } } });
    await montarUnificada();
    const nombre = within(screen.getByRole('listitem', { name: 'Mesa de 6' })).getByLabelText('Subcategoría');
    fireEvent.change(nombre, { target: { value: 'Silla' } }); fireEvent.blur(nombre);
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe otra subcategoría');
    expect(nombre).toHaveValue('Silla');
    expect(screen.getByRole('listitem', { name: 'Mesa de 6' })).toBeInTheDocument();
  });

});
