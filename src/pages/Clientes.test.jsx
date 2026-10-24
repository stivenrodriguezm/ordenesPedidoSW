import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContext } from '../AppContext';
import API from '../services/api';
import Clientes from './Clientes';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
const cliente = { id: 1, nombre: 'Cliente Prueba', cedula: '001234', telefono1: '+573012345678' };
const lista = { results: [cliente], count: 31, exportacion: { permitida: true, alcance: 'propias_compartidas' } };
let clickDescarga;

function montar(permissions = ['VER_CLIENTES', 'EXPORTAR_CLIENTES']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>
    <AppContext.Provider value={{ usuario: { id: 8, role: 'vendedor', permissions } }}><Clientes /></AppContext.Provider>
  </QueryClientProvider>);
}

beforeEach(() => {
  vi.resetAllMocks();
  API.get.mockImplementation(async url => {
    if (url === '/clientes/') return { data: lista };
    if (url === '/clientes/1/') return { data: cliente };
    if (url === '/clientes/1/ventas-observaciones/') return { data: { ventas: [], observaciones_cliente: [], puede_agregar_observaciones: false, historial_limitado: true } };
    throw new Error(`Ruta inesperada: ${url}`);
  });
  API.post.mockResolvedValue({ data: new Blob(['XLSX ficticio']) });
  URL.createObjectURL = vi.fn(() => 'blob:clientes');
  URL.revokeObjectURL = vi.fn();
  clickDescarga = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('Clientes: descarga y alcance', () => {
  it('explica el alcance comercial y exporta en el servidor sin recorrer páginas en el navegador', async () => {
    const user = userEvent.setup();
    montar();
    const boton = await screen.findByRole('button', { name: 'Exportar Excel' });
    expect(screen.getByText(/El Excel incluye solo clientes de tus ventas propias o compartidas/)).toBeInTheDocument();
    await user.click(boton);
    await waitFor(() => expect(API.post).toHaveBeenCalledWith('/clientes/exportar/', {}, { params: { search: '' }, responseType: 'blob' }));
    expect(await screen.findByText(/La generación quedó registrada/)).toBeInTheDocument();
    expect(clickDescarga).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:clientes');
    expect(API.get).toHaveBeenCalledTimes(1);
  });

  it('usa el filtro aplicado y excluye la página actual del pedido de exportación', async () => {
    const user = userEvent.setup();
    montar();
    const boton = await screen.findByRole('button', { name: 'Exportar Excel' });
    await user.type(screen.getByPlaceholderText('Buscar por ID, nombre, razón social o documento...'), 'Prueba');
    expect(boton).toBeDisabled();
    await waitFor(() => expect(API.get).toHaveBeenLastCalledWith('/clientes/', { params: { page: 1, page_size: 30, search: 'Prueba' } }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(API.get).toHaveBeenLastCalledWith('/clientes/', { params: { page: 2, page_size: 30, search: 'Prueba' } }));
    await user.click(boton);
    await waitFor(() => expect(API.post).toHaveBeenCalledWith('/clientes/exportar/', {}, { params: { search: 'Prueba' }, responseType: 'blob' }));
  });

  it('sin permiso no muestra descarga aunque el servidor haya informado capacidad', async () => {
    montar(['VER_CLIENTES']);
    await screen.findAllByText('Cliente Prueba');
    expect(screen.queryByRole('button', { name: 'Exportar Excel' })).not.toBeInTheDocument();
  });

  it('un permiso retirado en servidor oculta la descarga aunque la sesión anterior lo tuviera', async () => {
    API.get.mockResolvedValue({ data: { ...lista, exportacion: { permitida: false, alcance: 'propias_compartidas' } } });
    montar();
    await screen.findAllByText('Cliente Prueba');
    expect(screen.queryByRole('button', { name: 'Exportar Excel' })).not.toBeInTheDocument();
  });

  it('bloquea clics repetidos hasta recibir la respuesta', async () => {
    const user = userEvent.setup();
    let responder;
    API.post.mockImplementation(() => new Promise(resolve => { responder = resolve; }));
    montar();
    const boton = await screen.findByRole('button', { name: 'Exportar Excel' });
    await user.dblClick(boton);
    expect(API.post).toHaveBeenCalledTimes(1);
    expect(boton).toBeDisabled();
    await act(async () => responder({ data: new Blob(['archivo']) }));
    expect(await screen.findByText(/La generación quedó registrada/)).toBeInTheDocument();
  });

  it('muestra el motivo del rechazo JSON recibido como blob y permite reintentar', async () => {
    const user = userEvent.setup();
    const blob = new Blob(['error']);
    blob.text = async () => JSON.stringify({ detail: 'Acota la búsqueda; no se generó un archivo incompleto.' });
    API.post.mockRejectedValueOnce({ response: { status: 413, data: blob } });
    montar();
    const boton = await screen.findByRole('button', { name: 'Exportar Excel' });
    await user.click(boton);
    expect(await screen.findByText('Acota la búsqueda; no se generó un archivo incompleto.')).toBeInTheDocument();
    expect(clickDescarga).not.toHaveBeenCalled();
    await user.click(boton);
    expect(await screen.findByText(/La generación quedó registrada/)).toBeInTheDocument();
    expect(clickDescarga).toHaveBeenCalledTimes(1);
  });

  it('mantiene visibles datos básicos y explica un historial restringido sin ofrecer agregar notas', async () => {
    const user = userEvent.setup();
    montar();
    await user.click((await screen.findAllByText('Cliente Prueba'))[0]);
    expect((await screen.findAllByText(/Solo se muestra el historial autorizado/)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Observación', exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar Observación' })).not.toBeInTheDocument();
    expect(screen.getAllByText('+573012345678').length).toBeGreaterThan(0);
  });
});


describe('Tipo de persona en Clientes', () => {
  it('aplica el mismo filtro en el directorio y la exportación', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByRole('button', { name: 'Exportar Excel' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar tipo de persona' }), 'juridica');
    await waitFor(() => expect(API.get).toHaveBeenLastCalledWith('/clientes/', { params: { page: 1, page_size: 30, search: '', tipo_persona: 'juridica' } }));
    await user.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith('/clientes/exportar/', {}, { params: { search: '', tipo_persona: 'juridica' }, responseType: 'blob' }));
  });
  it('permite reclasificar y renombrar sin perder los datos al fallar el guardado', async () => {
    const user = userEvent.setup();
    API.put.mockRejectedValueOnce({ response: { data: { detail: 'Fallo de conexión de prueba' } } });
    montar(['VER_CLIENTES', 'EDITAR_CLIENTE']);
    await user.click((await screen.findAllByText('Cliente Prueba'))[0]);
    await user.click(await screen.findByRole('button', { name: 'Editar', exact: true }));
    const modal = screen.getByRole('dialog');
    await user.selectOptions(within(modal).getByLabelText('Tipo de persona'), 'juridica');
    const razon = within(modal).getByLabelText('Razón social:');
    const nit = within(modal).getByLabelText('NIT:');
    await user.clear(razon); await user.type(razon, 'Empresa de prueba SAS');
    await user.clear(nit); await user.type(nit, '900123456-7');
    // Correo, ciudad y dirección eran obligatorios en el formulario existente.
    await user.type(modal.querySelector('[name="correo"]'), 'demo@example.invalid');
    await user.type(modal.querySelector('[name="direccion"]'), 'Dirección ficticia');
    await user.type(modal.querySelector('[name="ciudad"]'), 'Bogotá');
    await user.click(within(modal).getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(API.put).toHaveBeenCalledWith('/clientes/1/', expect.objectContaining({ tipo_persona: 'juridica', nombre: 'Empresa de prueba SAS', cedula: '900123456-7' })));
    expect(within(modal).getByLabelText('Razón social:')).toHaveValue('Empresa de prueba SAS');
    expect(within(modal).getByLabelText('NIT:')).toHaveValue('900123456-7');
  });
});
