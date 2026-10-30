import { describe, expect, it } from 'vitest';
import { calcularDescuento, textoPorcentaje } from './descuentoCotizacion';

describe('descuento general de la cotización', () => {
  it('con el % calcula el precio final y el descuento en pesos enteros', () => {
    expect(calcularDescuento(3000000, 'porcentaje', '10')).toEqual({ descuento: 300000, porcentaje: 10, final: 2700000, error: null });
    expect(calcularDescuento(3333333, 'porcentaje', '7,5').descuento).toBe(250000);
  });

  it('con el precio final calcula el % (texto colombiano o entero)', () => {
    const r = calcularDescuento(3000000, 'final', '$2.700.000');
    expect([r.descuento, r.porcentaje]).toEqual([300000, 10]);
    expect(textoPorcentaje(calcularDescuento(3000000, 'final', '2850000').porcentaje)).toBe('5');
  });

  it('rechaza centavos, precios mayores al subtotal y % fuera de rango; vacío es sin descuento', () => {
    expect(calcularDescuento(3000000, 'final', '2.700.000,50').error).toMatch(/sin centavos/);
    expect(calcularDescuento(3000000, 'final', '3.100.000').error).toMatch(/mayor que el subtotal/);
    expect(calcularDescuento(3000000, 'porcentaje', '120').error).toMatch(/entre 0 y 100/);
    expect(calcularDescuento(3000000, 'final', '  ')).toEqual({ descuento: 0, porcentaje: 0, final: 3000000, error: null });
  });
});
