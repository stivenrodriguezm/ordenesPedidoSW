import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CampoPrecio, { ConsumoMaterial } from './CampoPrecio';
import { leerPesos } from '../../utils/capturaPrecios';

describe('Captura exacta en COP', () => {
  it('un campo en $0 se vacía al entrar: lo escrito no queda pegado al cero, y si no se escribe vuelve el $0', async () => {
    const guardar = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<CampoPrecio valor="0.00" onCommit={guardar} label="Costo" />);
    const input = screen.getByLabelText('Costo');
    expect(input).toHaveValue('$0');
    await user.click(input);
    expect(input).toHaveValue('');
    await user.tab();
    expect(input).toHaveValue('$0');
    expect(guardar).not.toHaveBeenCalled();
    await user.click(input);
    await user.type(input, '150000');
    expect(input).toHaveValue('$150.000');
    await user.tab();
    await waitFor(() => expect(guardar).toHaveBeenCalledWith(150000));
  });
  it.each(['3000000', '3000000.00', '$3.000.000', '3.000.000,00'])('interpreta %s como tres millones', (texto) => {
    expect(leerPesos(texto)).toBe(3000000);
  });
  it.each(['', '3,50', '3000000.50', '1e6', '300mil', '-1000'])('rechaza %s sin convertirlo a cero ni concatenar centavos', (texto) => {
    expect(() => leerPesos(texto)).toThrow();
  });
  it('permite ajustes negativos y conserva su signo', () => expect(leerPesos('-$80.000', true)).toBe(-80000));
  it('muestra el Decimal del API como COP y escribe sin multiplicar los ceros decimales', async () => {
    const guardar = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    render(<CampoPrecio valor="3000000.00" onCommit={guardar} label="Costo" />);
    const input = screen.getByLabelText('Costo');
    expect(input).toHaveValue('$3.000.000');
    await user.clear(input);
    await user.type(input, '3500000');
    expect(input).toHaveValue('$3.500.000');
    await user.tab();
    await waitFor(() => expect(guardar).toHaveBeenCalledWith(3500000));
    expect(await screen.findByText('Guardado')).toBeInTheDocument();
  });
  it('rechaza los centavos pegados sin enviarlos al servidor', () => {
    const guardar = vi.fn();
    render(<CampoPrecio valor="3000000.00" onCommit={guardar} label="Costo" />);
    const input = screen.getByLabelText('Costo');
    fireEvent.paste(input, { clipboardData: { getData: () => '3000000.50' } });
    fireEvent.blur(input);
    expect(guardar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('sin centavos');
  });
  it('conserva el cursor al corregir una cifra dentro del importe', async () => {
    const user = userEvent.setup();
    render(<CampoPrecio valor="3000000.00" onCommit={vi.fn()} label="Costo" />);
    const input = screen.getByLabelText('Costo');
    await user.click(input);
    input.setSelectionRange(1, 2);
    await user.type(input, '4', { skipClick: true });
    expect(input).toHaveValue('$4.000.000');
    expect(input.selectionStart).toBe(2);
  });
  it('mantiene una entrada que falló y permite reintentar sin cambiar el importe', async () => {
    const guardar = vi.fn().mockRejectedValueOnce(new Error('desconectado')).mockResolvedValueOnce({});
    const { rerender } = render(<CampoPrecio valor="3000000.00" onCommit={guardar} label="Costo" />);
    fireEvent.change(screen.getByLabelText('Costo'), { target: { value: '3500000' } });
    fireEvent.blur(screen.getByLabelText('Costo'));
    await screen.findByRole('alert');
    rerender(<CampoPrecio valor="3100000.00" onCommit={guardar} label="Costo" />);
    expect(screen.getByLabelText('Costo')).toHaveValue('$3.500.000');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Guardado');
    expect(guardar).toHaveBeenLastCalledWith(3500000);
  });
  it('usa porcentaje fijo sin spinner, valida el rango y Escape restaura el valor', () => {
    const guardar = vi.fn();
    render(<CampoPrecio valor="25.00" tipo="decimal" sufijo="%" min={0} max={100} nullable label="Tope Dcto" onCommit={guardar} />);
    const input = screen.getByLabelText('Tope Dcto');
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByText('%')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '101' } });
    fireEvent.blur(input);
    expect(guardar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('25');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('activar cuero exige introducir decimetraje; desactivarlo guarda null', async () => {
    const guardar = vi.fn().mockResolvedValue({});
    const { rerender } = render(<ConsumoMaterial valor={null} material="cuero" onCommit={guardar} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aplica cuero' }));
    expect(guardar).not.toHaveBeenCalled();
    const input = screen.getByLabelText('Decimetraje de cuero');
    expect(input).toHaveValue('');
    fireEvent.change(input, { target: { value: '120,50' } });
    fireEvent.blur(input);
    await waitFor(() => expect(guardar).toHaveBeenCalledWith(120.5));
    await act(async () => rerender(<ConsumoMaterial valor="120.50" material="cuero" onCommit={guardar} />));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aplica cuero' }));
    await waitFor(() => expect(guardar).toHaveBeenLastCalledWith(null));
  });
});
