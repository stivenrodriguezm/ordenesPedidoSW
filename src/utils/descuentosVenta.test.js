import { describe, it, expect } from 'vitest';
import { datosDescuento, resumenDescuentos, formatDescuento } from './descuentosVenta';

const venta = (lista, total, extra = {}) => ({ valor_lista: lista, valor_total: total, estado: 'pendiente', vendedor: 1, sede: 'Lottus 1', ...extra });

describe('Descuentos de ventas', () => {
    it('lee decimales del servidor y calcula el porcentaje sin modificar importes', () => {
        expect(datosDescuento(venta('3000000.00', '2700000.00')).porcentaje).toBe(10);
        expect(formatDescuento(12.345)).toBe('12,35 %');
        expect(datosDescuento(venta(1000, 1100)).porcentaje).toBe(0);
    });
    it.each([null, '', 0, '0.00', -100, 'inválido'])('no inventa descuento cuando falta lista válida: %s', lista => {
        expect(datosDescuento(venta(lista, 90))).toBeNull();
        expect(formatDescuento(datosDescuento(venta(lista, 90))?.porcentaje)).toBe('—');
    });
    it('acumula por valor de lista, excluye anuladas e informa ventas sin lista', () => {
        const r = resumenDescuentos([venta(1000, 900), venta(9000, 7200), venta(null, 600), venta(100000, 0, { estado: 'anulada' })]);
        expect(r.total.porcentaje).toBe(19); // no 15 %, ni 30 %
        expect(r.total.sinLista).toBe(1);
        expect(r.sedes['Lottus 1']).toEqual(r.total);
    });
    it('reparte numerador y denominador entre participantes únicos y respeta el filtro', () => {
        const ventas = [venta(1000, 900, { vendedores_compartidos: [1, 2] }), venta(9000, 7200, { vendedor: 2, sede: 'Lottus 2' })];
        const r = resumenDescuentos(ventas);
        expect(r.total.porcentaje).toBe(19);
        expect(r.vendedores['1'].porcentaje).toBe(10);
        expect(r.vendedores['2'].porcentaje).toBeCloseTo(1850 / 9500 * 100);
        const filtrado = resumenDescuentos(ventas, id => id === '1');
        expect(filtrado.total.lista).toBe(500);
        expect(filtrado.total.descuento).toBe(50);
        expect(filtrado.vendedores['2']).toBeUndefined();
    });
    it('mantiene feria separada de sedes, y postferia conserva su sede', () => {
        const r = resumenDescuentos([venta(1000, 900, { es_feria_hogar: true }), venta(1000, 800, { es_postferia: true })]);
        expect(r.total.porcentaje).toBe(15);
        expect(r.feria.porcentaje).toBe(10);
        expect(r.postferia.porcentaje).toBe(20);
        expect(r.sedes['Lottus 1'].porcentaje).toBe(20);
    });
});
