import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../../services/api';
import BotonImprimir from './BotonImprimir';
import { _reiniciarCacheImpresoras } from './impresoras';

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const RICOH = { id: 1, nombre: 'Ricoh SP 3710SF', ubicacion: 'Oficina principal', en_linea: true, ultima_conexion: null };
const DOC = '<!DOCTYPE html><html><head><title>R</title></head><body>Remisión</body></html>';

const montar = (imprimirLocal = vi.fn()) => {
  render(<BotonImprimir documento={() => DOC} titulo="Remisión 0001" imprimirLocal={imprimirLocal} />);
  return imprimirLocal;
};

beforeEach(() => {
  vi.resetAllMocks();
  _reiniciarCacheImpresoras();
  try { localStorage.clear(); } catch { /* sin almacenamiento */ }
});
afterEach(() => vi.useRealTimers());

describe('Botón Imprimir con elección de impresora', () => {
  it('sin impresoras de oficina imprime aquí directamente', async () => {
    API.get.mockResolvedValue({ data: [] });
    const local = montar();
    await waitFor(() => expect(API.get).toHaveBeenCalledWith('/impresion/impresoras/'));
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
    expect(local).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('pregunta dónde imprimir y «Esta computadora» abre el diálogo del navegador', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    API.get.mockResolvedValue({ data: [RICOH] });
    const local = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
    expect(await screen.findByRole('dialog', { name: '¿Dónde imprimir?' })).toBeInTheDocument();
    expect(await screen.findByText('En línea')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Esta computadora/ }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Imprimir' }).at(-1));
    await act(async () => { vi.runAllTimers(); });
    expect(local).toHaveBeenCalled();
    expect(API.post).not.toHaveBeenCalled();
  });

  it('envía el documento a la oficina y sigue el trabajo hasta que se imprime', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    API.get.mockImplementation(url => Promise.resolve({
      data: url === '/impresion/impresoras/' ? [RICOH] : { id: 9, estado: 'impreso', estado_nombre: 'Impreso', titulo: 'Remisión 0001', copias: 2, detalle: '', impresora: 1 },
    }));
    API.post.mockResolvedValue({ data: { id: 9, estado: 'pendiente', estado_nombre: 'En cola', titulo: 'Remisión 0001', copias: 2, detalle: '', impresora: 1, en_linea: true } });
    const local = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
    fireEvent.click(await screen.findByRole('radio', { name: /Ricoh SP 3710SF/ }));
    fireEvent.change(screen.getByLabelText('Copias'), { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Imprimir' }).at(-1));

    await waitFor(() => expect(API.post).toHaveBeenCalled());
    const [url, cuerpo] = API.post.mock.calls[0];
    expect(url).toBe('/impresion/trabajos/');
    expect(cuerpo).toMatchObject({ impresora: 1, titulo: 'Remisión 0001', copias: 2 });
    expect(cuerpo.html).toMatch(/<head><base href="[^"]+"><title>R<\/title>/);
    expect(await screen.findByText('En cola')).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(3100); });
    expect(await screen.findByText('Impreso')).toBeInTheDocument();
    expect(API.get).toHaveBeenCalledWith('/impresion/trabajos/9/');
    expect(local).not.toHaveBeenCalled();
    expect(localStorage.getItem('lottus.impresora')).toBe('1');  // la próxima vez viene elegida
  });

  it('las copias van de 1 a 10 y un error del servidor se muestra', async () => {
    API.get.mockResolvedValue({ data: [{ ...RICOH, en_linea: false }] });
    API.post.mockRejectedValue({ response: { data: { error: 'La impresora no está disponible.' } } });
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
    fireEvent.click(await screen.findByRole('radio', { name: /Ricoh SP 3710SF/ }));
    expect(screen.getByText(/Desconectada/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Copias'), { target: { value: '11' } });
    expect(screen.getAllByRole('button', { name: 'Imprimir' }).at(-1)).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Copias'), { target: { value: '1' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Imprimir' }).at(-1));
    expect(await screen.findByRole('alert')).toHaveTextContent('La impresora no está disponible.');
  });
});
