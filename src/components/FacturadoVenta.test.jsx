import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../services/api';
import FacturadoVenta from './FacturadoVenta';

vi.mock('../services/api', () => ({ default: { post: vi.fn() } }));

beforeEach(() => { vi.resetAllMocks(); });

describe('Marca de venta facturada', () => {
  it('marca con un clic y avisa el cambio', async () => {
    API.post.mockResolvedValue({ data: { id: 7, facturada: true, facturada_por_nombre: 'Ana', facturada_en: '2026-10-21T10:00:00' } });
    const onCambio = vi.fn();
    render(<FacturadoVenta venta={{ id: 7, estado: 'pendiente', facturada: false }} onCambio={onCambio} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Venta 7 facturada' }));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith('/ventas/7/facturada/', { facturada: true }));
    expect(onCambio).toHaveBeenCalledWith(expect.objectContaining({ facturada: true }));
  });

  it('quitar la marca pide confirmación y una anulada no se puede marcar', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { rerender } = render(<FacturadoVenta venta={{ id: 7, estado: 'pendiente', facturada: true }} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('switch'));
    expect(API.post).not.toHaveBeenCalled();
    rerender(<FacturadoVenta venta={{ id: 8, estado: 'anulada', facturada: false }} />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
