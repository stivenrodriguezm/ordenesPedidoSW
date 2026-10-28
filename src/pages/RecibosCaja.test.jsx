import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../services/api';
import RecibosCaja from './RecibosCaja';

const permisos = { actuales: new Set() };
vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('../AppContext', async () => {
  const React = await import('react');
  return {
    AppContext: React.createContext({ usuario: { role: 'vendedor' } }),
    usePermissions: () => codigo => permisos.actuales.has(codigo),
  };
});
vi.mock('../hooks/useSharedData', () => ({ usePendientesIds: () => ({ data: [555] }) }));
// La compresión real usa canvas (no existe en jsdom): aquí devuelve el mismo archivo.
vi.mock('../utils/comprimirImagen', () => ({ comprimirImagen: vi.fn(async archivo => archivo) }));

const pagina = () => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><RecibosCaja /></MemoryRouter></QueryClientProvider>);

const FOTO = 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/recibos_caja/a.jpg';
const recibo = { id: 10100, venta: 555, fecha: '2026-10-28', nota: '', estado: 'Pendiente', metodo_pago: 'Davivienda', valor: '100000',
  pagos: [{ id: 1, metodo_pago: 'Davivienda', valor: '100000', estado: 'Pendiente' }], comprobantes: [{ id: 7, url: FOTO, subido_por_nombre: 'Ana' }] };

const abrirFormulario = async () => {
  pagina();
  fireEvent.click(await screen.findByRole('button', { name: /Nuevo/ }));
  return screen.getByRole('dialog', { name: 'Nuevo recibo de caja' });
};

const completarPago = (dialogo) => {
  fireEvent.click(within(dialogo).getByText('Seleccionar Venta...'));
  fireEvent.click(within(dialogo).getByText('Venta #555'));
  fireEvent.change(within(dialogo).getByDisplayValue('Método...'), { target: { value: 'Davivienda' } });
  fireEvent.change(within(dialogo).getByPlaceholderText('0'), { target: { value: '100.000' } });
};

describe('Recibos de caja: número automático y fotos del comprobante', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    permisos.actuales = new Set(['ACCESO_RECIBOS', 'CREAR_RECIBO']);
    API.get.mockImplementation(async url => ({ data: url.includes('siguiente-numero') ? { numero: 10100 } : { results: [recibo], count: 1 } }));
  });

  it('crea un recibo automático con la foto comprimida y subida', async () => {
    API.post.mockImplementation(async url => ({ data: url.includes('comprobantes/subir') ? { ok: true, url: FOTO } : { ...recibo } }));
    const dialogo = await abrirFormulario();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Automático' }));
    expect(await within(dialogo).findByText("Siguiente: No. 10100")).toBeInTheDocument();
    completarPago(dialogo);
    const archivo = new File(['x'], 'pantallazo.png', { type: 'image/png' });
    fireEvent.change(within(dialogo).getByTestId('fc-archivo'), { target: { files: [archivo] } });
    expect(await within(dialogo).findByAltText('Comprobante de pago')).toBeInTheDocument();
    const [, datos] = API.post.mock.calls.find(([url]) => url === '/recibos-caja/comprobantes/subir/');
    expect(datos.get('imagen')).toBe(archivo);
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Crear Recibo' }));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith('/recibos-caja/crear/', expect.objectContaining({
      numero_automatico: true, comprobantes: [FOTO], venta: 555, pagos: [{ metodo_pago: 'Davivienda', valor: 100000 }],
    }), expect.anything()));
    const [, cuerpo] = API.post.mock.calls.find(([url]) => url === '/recibos-caja/crear/');
    expect(cuerpo).not.toHaveProperty('id');
    expect(await screen.findByText('Recibo No. 10100 creado exitosamente.')).toBeInTheDocument();
  });

  it('abre en Manual, pide el número y solo acepta dígitos', async () => {
    API.post.mockResolvedValue({ data: { ...recibo, id: 4756 } });
    const dialogo = await abrirFormulario();
    expect(within(dialogo).getByRole('button', { name: 'Manual' })).toHaveAttribute('aria-pressed', 'true');
    completarPago(dialogo);
    const crear = within(dialogo).getByRole('button', { name: 'Crear Recibo' });
    expect(crear).toBeDisabled();
    fireEvent.change(within(dialogo).getByLabelText('No. Recibo manual'), { target: { value: 'RC-4756' } });
    expect(within(dialogo).getByLabelText('No. Recibo manual')).toHaveValue('4756');
    fireEvent.click(crear);
    await waitFor(() => expect(API.post).toHaveBeenCalledWith('/recibos-caja/crear/', expect.objectContaining({ id: 4756, comprobantes: [] }), expect.anything()));
  });

  it('muestra las fotos del recibo y deja agregar sin poder quitar (vendedor)', async () => {
    pagina();
    fireEvent.click((await screen.findAllByRole('button', { name: 'Comprobantes del recibo 10100' }))[0]);
    const dialogo = screen.getByRole('dialog', { name: 'Fotos del recibo 10100' });
    expect(within(dialogo).getByAltText('Comprobante del recibo 10100')).toHaveAttribute('src', expect.stringContaining('w_320'));
    expect(within(dialogo).queryByRole('button', { name: 'Quitar esta foto del recibo' })).not.toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: /Agregar otra foto|Adjuntar foto/ })).toBeInTheDocument();
  });
});
