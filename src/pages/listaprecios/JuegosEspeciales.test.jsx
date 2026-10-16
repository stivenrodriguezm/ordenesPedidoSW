import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as servicio from '../../services/listaPreciosService';
import { EspecialesLinea } from './JuegosEspeciales';

vi.mock('../../services/listaPreciosService', () => ({ createEspecial: vi.fn(), updateEspecial: vi.fn(), deleteEspecial: vi.fn(), getBibliotecaEspeciales: vi.fn() }));
const config = { costo_base: '100000', multiplicador: '2', sentido: 'sube', metraje_tela: null, decimetraje_cuero: null };
const linea = { id: 5, variantes: [
  { id: 10, nombre: 'Sofá 3 puestos', precios_venta: [{ grupo: 1, grupo_nombre: 'Grupo 1', precio: 3000000 }] },
  { id: 11, nombre: 'Sofá 2 puestos', precios_venta: [{ grupo: 1, grupo_nombre: 'Grupo 1', precio: 2000000 }] },
], especiales: [{ id: 7, nombre: 'Reclinable', configuracion: config, configuracion_efectiva: config, aplicaciones: [{ variante: 10, configuracion: {} }, { variante: 11, configuracion: {} }] }] };
const montar = (datos = linea, expandir = true) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(['lp-lineas'], [datos]);
  render(<QueryClientProvider client={client}><EspecialesLinea linea={datos} grupos={[{ id: 1, tipo: 'tela', precio_por_metro: '50000' }]} multiplicadores={[{ es_general: true, valor: '1.76' }]} notify={vi.fn()} /></QueryClientProvider>);
  if (expandir) datos.especiales.forEach(e => fireEvent.click(screen.getByRole('button', { name: `Editar especial ${e.nombre}` })));
  return client;
};
const escribir = (label, valor, scope = screen) => fireEvent.change(scope.getByLabelText(label), { target: { value: valor } });
beforeEach(() => { vi.resetAllMocks(); servicio.updateEspecial.mockResolvedValue({}); servicio.createEspecial.mockResolvedValue({}); servicio.getBibliotecaEspeciales.mockResolvedValue([]); });

describe('Especiales con costo, multiplicador y biblioteca', () => {
  it('muestra fichas cerradas con la información principal y abre solo el editor elegido', () => {
    montar({ ...linea, especiales: [linea.especiales[0], { ...linea.especiales[0], id: 8, nombre: 'Eléctrico' }] }, false);
    expect(screen.queryByLabelText('Costo del especial')).not.toBeInTheDocument();
    const ficha = screen.getByRole('button', { name: 'Editar especial Reclinable' });
    expect(ficha).toHaveAttribute('aria-expanded', 'false');
    expect(ficha).toHaveTextContent('Costo $100.000'); expect(ficha).toHaveTextContent('×2'); expect(ficha).toHaveTextContent('2/2 productos');
    fireEvent.click(ficha);
    expect(screen.getAllByLabelText('Costo del especial')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Editar especial Eléctrico' })).toHaveAttribute('aria-expanded', 'false');
  });
  it('conserva el costo, materiales y ajustes sin guardar al cerrar y volver a abrir una ficha', () => {
    montar(); escribir('Costo del especial', '150000');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Lleva cuero' })); escribir('Decimetraje de cuero del especial', '30');
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar Sofá 2 puestos' }));
    fireEvent.change(screen.getAllByLabelText('Costo del especial')[1], { target: { value: '50000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Contraer especial Reclinable' }));
    const ficha = screen.getByRole('button', { name: 'Editar especial Reclinable' });
    expect(ficha).toHaveTextContent('$150.000'); expect(ficha).toHaveTextContent('Cuero 30 dm'); expect(ficha).toHaveTextContent('1 ajuste individual'); expect(ficha).toHaveTextContent('Sin guardar');
    expect(ficha.closest('form')).toHaveAttribute('data-estado', 'pendiente');
    expect(servicio.updateEspecial).not.toHaveBeenCalled();
    fireEvent.click(ficha);
    expect(screen.getAllByLabelText('Costo del especial').map(input => input.value)).toEqual(['$150.000', '$50.000']);
    expect(screen.getAllByLabelText('Decimetraje de cuero del especial').map(input => input.value)).toEqual(['30', '30']);
  });
  it('guarda en un clic el texto actual de costo y multiplicador sin depender de blur', async () => {
    montar();
    escribir('Costo del especial', '150000'); escribir('Multiplicador del especial', '2,5');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(servicio.updateEspecial).toHaveBeenCalledWith(7, { nombre: 'Reclinable', configuracion: { ...config, costo_base: '150000', multiplicador: '2.5' }, aplicaciones: [{ variante: 10 }, { variante: 11 }] }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Editar especial Reclinable' })).toHaveAttribute('aria-expanded', 'false'));
    expect(screen.queryByText('Sin guardar')).not.toBeInTheDocument();
  });
  it('calcula todos los productos con el costo y múltiplo del especial, y permite bajar', async () => {
    montar(); escribir('Costo del especial', '50000');
    fireEvent.click(screen.getByRole('button', { name: 'Baja' }));
    expect(screen.getByText('$2.900.000')).toBeInTheDocument(); expect(screen.getByText('$1.900.000')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(servicio.updateEspecial).toHaveBeenCalledWith(7, expect.objectContaining({ configuracion: { ...config, costo_base: '50000', sentido: 'baja' } })));
  });
  it('pide metraje y decimetraje por separado y valida ambos al guardar', async () => {
    montar(); fireEvent.click(screen.getByRole('checkbox', { name: 'Lleva tela' })); fireEvent.click(screen.getByRole('checkbox', { name: 'Lleva cuero' }));
    escribir('Metraje de tela del especial', '2,5');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(servicio.updateEspecial).not.toHaveBeenCalled(); expect(screen.getByLabelText('Decimetraje de cuero del especial')).toHaveAttribute('aria-invalid', 'true');
    escribir('Decimetraje de cuero del especial', '35');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(servicio.updateEspecial).toHaveBeenCalledWith(7, expect.objectContaining({ configuracion: { ...config, metraje_tela: '2.5', decimetraje_cuero: '35' } })));
  });
  it('mantiene una excepción al cambiar la general y permite restablecerla', async () => {
    montar(); fireEvent.click(screen.getByRole('button', { name: 'Ajustar Sofá 2 puestos' }));
    const exception = within(screen.getByText('Configuración para', { exact: false }).parentElement);
    const campos = screen.getAllByLabelText('Costo del especial');
    fireEvent.change(campos[1], { target: { value: '50000' } }); fireEvent.change(campos[0], { target: { value: '200000' } });
    expect(screen.getByText('$3.400.000')).toBeInTheDocument(); expect(screen.getByText('$2.100.000')).toBeInTheDocument();
    fireEvent.click(exception.getByRole('button', { name: 'Usar configuración general' }));
    expect(screen.getByText('$2.400.000')).toBeInTheDocument();
  });
  it('busca en la biblioteca común, copia los datos y solo crea al confirmar', async () => {
    servicio.getBibliotecaEspeciales.mockResolvedValue([{ id: 50, nombre: 'Eléctrico', origen: 'Otra referencia', configuracion: { ...config, costo_base: '250000' } }]);
    montar({ ...linea, especiales: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Usar uno existente' }));
    const dialog = screen.getByRole('dialog');
    await within(dialog).findByText('Eléctrico'); escribir('Buscar un especial guardado', 'electrico', within(dialog));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Usar Eléctrico de Otra referencia' }));
    expect(servicio.createEspecial).not.toHaveBeenCalled(); expect(screen.getByLabelText('Costo del especial')).toHaveValue('$250.000');
    fireEvent.click(screen.getByRole('button', { name: 'Crear especial' }));
    await waitFor(() => expect(servicio.createEspecial).toHaveBeenCalledWith({ linea: 5, nombre: 'Eléctrico', configuracion: { ...config, costo_base: '250000' }, aplicaciones: [{ variante: 10 }, { variante: 11 }] }));
  });
  it('no escribe un costo vacío o con centavos y conserva la entrada si falla el servidor', async () => {
    servicio.updateEspecial.mockRejectedValueOnce({ response: { status: 400, data: { aplicaciones: ['Revisa los productos.'] } } });
    montar(); escribir('Costo del especial', '100,25'); fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(servicio.updateEspecial).not.toHaveBeenCalled(); expect(screen.getByLabelText('Costo del especial')).toHaveAttribute('aria-invalid', 'true');
    escribir('Costo del especial', '75000'); fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa los productos.'); expect(screen.getByLabelText('Costo del especial')).toHaveValue('$75.000');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' })); await waitFor(() => expect(servicio.updateEspecial).toHaveBeenCalledTimes(2));
  });
  it('inserta la confirmación del servidor en la caché para que no desaparezca un especial recién guardado', async () => {
    const guardado = { ...linea.especiales[0], id: 20, nombre: 'Nuevo mecanismo' };
    servicio.createEspecial.mockResolvedValue(guardado);
    const client = montar({ ...linea, especiales: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo especial' })); escribir('Nombre que verá el vendedor', 'Nuevo mecanismo'); escribir('Costo del especial', '100000');
    fireEvent.click(screen.getByRole('button', { name: 'Crear especial' }));
    await waitFor(() => expect(client.getQueryData(['lp-lineas'])[0].especiales).toEqual([guardado]));
  });
});
