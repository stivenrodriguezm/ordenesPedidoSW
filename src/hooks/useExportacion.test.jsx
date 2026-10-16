import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useExportacion } from './useExportacion';
import API from '../services/api';
import { obtenerArchivo } from '../services/descargas';
vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
let click;
beforeEach(() => {
  vi.resetAllMocks();
  URL.createObjectURL = vi.fn(() => 'blob:ficticio');
  URL.revokeObjectURL = vi.fn();
  click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());
function montar(reporte, aviso) {
  const q = new QueryClient();
  return renderHook(() => useExportacion(reporte, 'Reporte.xlsx', aviso), {
    wrapper: ({ children }) => <QueryClientProvider client={q}>{children}</QueryClientProvider>,
  });
}
it.each(['ventas', 'recibos', 'egresos', 'inventario'])('descarga %s con filtros de servidor y limpia la URL temporal', async reporte => {
  API.post.mockResolvedValue({ data: new Blob(['ficticio']) });
  const aviso = vi.fn();
  const { result } = montar(reporte, aviso);
  const params = { fecha_inicio: '2026-10-01', search: 'ficticio' };
  await act(() => result.current.exportar(params));
  expect(API.post).toHaveBeenCalledWith(`/reportes-operativos/${reporte}/exportar/`, {}, { params, responseType: 'blob' });
  expect(click).toHaveBeenCalledTimes(1);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:ficticio');
  expect(aviso).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
});
it('doble clic sin respuesta solo inicia una descarga y muestra carga local', async () => {
  let terminar;
  API.post.mockImplementation(() => new Promise(resolve => { terminar = resolve; }));
  const { result } = montar('ventas', vi.fn());
  let espera;
  act(() => { espera = result.current.exportar({}); result.current.exportar({}); });
  await waitFor(() => expect(result.current.exportando).toBe(true));
  expect(API.post).toHaveBeenCalledTimes(1);
  await act(async () => { terminar({ data: new Blob(['ficticio']) }); await espera; });
  await waitFor(() => expect(result.current.exportando).toBe(false));
});
it.each([403, 413])('error %s recibido como Blob se muestra sin descargar ni reintentar automáticamente', async status => {
  const data = new Blob();
  data.text = async () => JSON.stringify({ error: 'Exportación rechazada de prueba' });
  API.post.mockRejectedValue({ response: { status, data } });
  const aviso = vi.fn();
  const { result } = montar('inventario', aviso);
  await act(() => result.current.exportar({}));
  expect(aviso).toHaveBeenCalledWith({ message: 'Exportación rechazada de prueba', type: 'error' });
  expect(API.post).toHaveBeenCalledTimes(1);
  expect(click).not.toHaveBeenCalled();
});
it('adjunto se solicita por API autenticada; no abre una URL pública', async () => {
  const blob = new Blob(['adjunto']);
  API.get.mockResolvedValue({ data: blob });
  expect(await obtenerArchivo('/posventa/evidencias/7/descargar/', { metodo: 'get' })).toBe(blob);
  expect(API.get).toHaveBeenCalledWith('/posventa/evidencias/7/descargar/', { params: undefined, responseType: 'blob' });
});
