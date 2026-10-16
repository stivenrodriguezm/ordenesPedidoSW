import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VariantesOrdenables from './VariantesOrdenables';
import { ordenarVariantes } from '../../services/listaPreciosService';

vi.mock('../../services/listaPreciosService', () => ({ ordenarVariantes: vi.fn() }));
let linea;
function Ejemplo() {
  const { data } = useQuery({ queryKey: ['lp-lineas'], queryFn: async () => [linea] });
  return <VariantesOrdenables linea={data[0]} notify={vi.fn()}>{v => <div><label>Nombre {v.nombre}<input defaultValue={v.nombre} /></label><span>{v.nombre}</span></div>}</VariantesOrdenables>;
}
const montar = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(['lp-lineas'], [linea]);
  render(<QueryClientProvider client={client}><Ejemplo /></QueryClientProvider>);
  screen.getAllByRole('listitem').forEach((el, i) => { el.getBoundingClientRect = () => ({ top: 100 + 100 * i, height: 90 }); });
  return client;
};
const nombres = () => screen.getAllByRole('listitem').map(el => el.getAttribute('aria-label'));
beforeEach(() => {
  vi.stubGlobal('PointerEvent', MouseEvent);
  linea = { id: 5, nombre: 'Qatar', variantes: [{ id: 1, nombre: 'Mesa', orden: 0 }, { id: 2, nombre: 'Silla', orden: 1 }, { id: 3, nombre: 'Comedor', orden: 2 }] };
  ordenarVariantes.mockImplementation(async (_, ids) => { linea = { ...linea, variantes: ids.map((id, i) => ({ ...linea.variantes.find(v => v.id === id), orden: i })) }; return { variantes: ids }; });
});
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('Orden por arrastre', () => {
  it('arrastra el contenedor, guarda todo el orden una vez y conserva un campo sin guardar', async () => {
    const client = montar();
    fireEvent.change(screen.getByLabelText('Nombre Mesa'), { target: { value: 'Borrador' } });
    const origen = screen.getByRole('listitem', { name: 'Comedor' });
    fireEvent.pointerDown(origen, { button: 0, clientY: 320 }); fireEvent.pointerMove(origen, { buttons: 1, clientY: 110 }); fireEvent.pointerUp(origen, { button: 0, clientY: 110 });
    await waitFor(() => expect(ordenarVariantes).toHaveBeenCalledWith(5, [3, 1, 2], [1, 2, 3]));
    await screen.findByText('Orden guardado');
    expect(nombres()).toEqual(['Comedor', 'Mesa', 'Silla']);
    expect(screen.getByLabelText('Nombre Mesa')).toHaveValue('Borrador');
    expect(client.getQueryData(['lp-lineas'])[0].variantes.map(v => v.id)).toEqual([3, 1, 2]);
  });
  it('restaura el orden confirmado si el servidor falla y conserva los datos de los campos', async () => {
    let rechazar;
    ordenarVariantes.mockImplementationOnce(() => new Promise((_, reject) => { rechazar = reject; }));
    montar(); fireEvent.change(screen.getByLabelText('Nombre Mesa'), { target: { value: 'Pendiente' } });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Mover Comedor' }), { key: 'ArrowUp' });
    expect(nombres()).toEqual(['Mesa', 'Comedor', 'Silla']);
    await waitFor(() => expect(ordenarVariantes).toHaveBeenCalledTimes(1));
    await act(async () => rechazar(new Error('Sin conexión')));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin respuesta del servidor');
    expect(nombres()).toEqual(['Mesa', 'Silla', 'Comedor']);
    expect(screen.getByLabelText('Nombre Mesa')).toHaveValue('Pendiente');
  });
  it('editar o seleccionar un input no inicia arrastre y cancelar un gesto no guarda', () => {
    montar();
    const origen = screen.getByRole('listitem', { name: 'Mesa' });
    fireEvent.pointerDown(within(origen).getByLabelText('Nombre Mesa'), { button: 0, clientY: 110 }); fireEvent.pointerMove(origen, { buttons: 1, clientY: 350 }); fireEvent.pointerUp(origen, { button: 0, clientY: 350 });
    expect(ordenarVariantes).not.toHaveBeenCalled();
    fireEvent.pointerDown(origen, { button: 0, clientY: 110 }); fireEvent.pointerMove(origen, { buttons: 1, clientY: 350 }); fireEvent.pointerCancel(origen);
    expect(ordenarVariantes).not.toHaveBeenCalled(); expect(nombres()).toEqual(['Mesa', 'Silla', 'Comedor']);
  });
});
