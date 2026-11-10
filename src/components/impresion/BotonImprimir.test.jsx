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

const OTRA = { id: 2, nombre: 'Epson bodega', ubicacion: 'Bodega', en_linea: true, ultima_conexion: null };
const EN_COLA = { id: 9, estado: 'pendiente', estado_nombre: 'En cola', titulo: 'Remisión 0001', copias: 1, detalle: '', impresora: 1, en_linea: true };

describe('Botón Imprimir: siempre en la Ricoh (2026-11-10)', () => {
  it('sin impresoras de oficina imprime aquí directamente', async () => {
    API.get.mockResolvedValue({ data: [] });
    const local = montar();
    await waitFor(() => expect(API.get).toHaveBeenCalledWith('/impresion/impresoras/'));
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
    await waitFor(() => expect(local).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('envía directo a la Ricoh, sin preguntar, y sigue el trabajo hasta que se imprime', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    API.get.mockImplementation(url => Promise.resolve({
      data: url === '/impresion/impresoras/' ? [OTRA, RICOH] : { ...EN_COLA, estado: 'impreso', estado_nombre: 'Impreso' },
    }));
    API.post.mockResolvedValue({ data: EN_COLA });
    const local = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
    await waitFor(() => expect(API.post).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog', { name: '¿Dónde imprimir?' })).toBeNull();
    const [url, cuerpo] = API.post.mock.calls[0];
    expect(url).toBe('/impresion/trabajos/');
    expect(cuerpo).toMatchObject({ impresora: 1, titulo: 'Remisión 0001', copias: 1 });
    expect(cuerpo.html).toMatch(/<head><base href="[^"]+"><title>R<\/title>/);
    expect(await screen.findByText('En cola')).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(3100); });
    expect(await screen.findByText('Impreso')).toBeInTheDocument();
    expect(API.post).toHaveBeenCalledTimes(1);  // una sola vez
    expect(local).not.toHaveBeenCalled();
  });

  it('si no se pudo enviar lo dice y permite reintentar o imprimir aquí', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    API.get.mockResolvedValue({ data: [RICOH] });
    API.post.mockRejectedValueOnce({ response: { data: { error: 'La impresora no está disponible.' } } }).mockResolvedValueOnce({ data: EN_COLA });
    const local = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La impresora no está disponible.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('En cola')).toBeInTheDocument();
    expect(API.post).toHaveBeenCalledTimes(2);
    expect(local).not.toHaveBeenCalled();
  });

  it('avisa si la computadora de la oficina no encuentra la Ricoh', async () => {
    API.get.mockResolvedValue({ data: [{ ...RICOH, impresora_encontrada: false }] });
    API.post.mockResolvedValue({ data: EN_COLA });
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
    expect(await screen.findByText(/no encuentra la impresora/)).toBeInTheDocument();
  });

  it('con varias impresoras y ninguna Ricoh, pregunta dónde (y «Esta computadora» imprime aquí)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    API.get.mockResolvedValue({ data: [OTRA, { ...OTRA, id: 3, nombre: 'HP caja' }] });
    const local = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
    expect(await screen.findByRole('dialog', { name: '¿Dónde imprimir?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Esta computadora/ }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Imprimir' }).at(-1));
    await act(async () => { vi.runAllTimers(); });
    expect(local).toHaveBeenCalled();
    expect(API.post).not.toHaveBeenCalled();
  });

  const enviar = async (trabajoEnServidor) => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    API.get.mockImplementation(url => Promise.resolve({ data: url === '/impresion/impresoras/' ? [RICOH] : trabajoEnServidor }));
    API.post.mockResolvedValue({ data: { ...EN_COLA, titulo: 'CE-1' } });
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
    await screen.findByText('En cola');
  };

  it('muestra el error del agente cuando la impresora no aparece y ofrece imprimir aquí', async () => {
    await enviar({ id: 9, estado: 'error', estado_nombre: 'Error', titulo: 'CE-1', copias: 1, impresora: 1, detalle: 'La computadora de la oficina no encuentra la impresora. No se imprimió: vuelve a enviarlo.' });
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(screen.getByRole('status')).toHaveTextContent(/No se imprimió: vuelve a enviarlo/);
    expect(document.querySelector('.bi-girando')).toBeNull();
    expect(screen.getByRole('button', { name: 'Listo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imprimir en esta computadora' })).toBeInTheDocument();
  });

  it('a los 2 minutos sin confirmación deja de cargar y lo dice', async () => {
    await enviar({ id: 9, estado: 'enviado', estado_nombre: 'Enviado a la impresora', titulo: 'CE-1', copias: 1, impresora: 1, detalle: '' });
    expect(document.querySelector('.bi-girando')).not.toBeNull();
    // Cada consulta del estado es un paso aparte (cada 3 s), como en el navegador.
    for (let i = 0; i < 42; i += 1) await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(document.querySelector('.bi-girando')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/más de 2 minutos sin imprimirse/);
  });
});
