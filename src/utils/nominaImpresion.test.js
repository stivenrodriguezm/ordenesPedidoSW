import { describe, expect, it } from 'vitest';
import { hojaNomina } from './nominaImpresion';

const cierre = { nombre: 'Agosto 26', fecha_inicio: '2026-08-06', fecha_fin: '2026-09-05', estado: 'borrador', pago_nomina: 'entre el 6 y el 11',
    dia_pago_basico: 20, abono_minimo_pct: '30', bonificacion_pct: '1' };
const asesor = {
    nombre: 'Ana <Pérez>', usuario: 'ana', ventas_periodo: '1300000', meta: '1000000', cumple_meta: true,
    totales: { total_nomina: '40400', comisiones: '32400', bonificaciones: '0', ajustes: '8000', salario_basico: '1300000', comisiones_pendientes: '8000', bonificaciones_pendientes: '0' },
    lineas: [
        { tipo: 'comision', venta: 7, fecha_venta: '2026-08-10', cliente: 'Cliente Uno', precio_lista: '1000000', estado_venta: 'pendiente', valor_venta: '900000', descuento_pct: '10', abono_pct: '33', porcentaje: '3.6', valor: '32400', pagar: true, participantes: 1 },
        { tipo: 'comision', venta: 8, fecha_venta: '2026-08-12', cliente: 'Cliente Dos', estado_venta: 'pendiente', valor_venta: '200000', abono_pct: '20', porcentaje: '4', valor: '8000', pagar: false, motivo_pendiente: 'Abono menor al 30 %', participantes: 1 },
        { tipo: 'ajuste', cliente: 'Adelanto', valor: '8000' },
    ],
};

describe('Hoja de nómina por asesor', () => {
    it('lleva los datos del asesor y de la nómina, sin marca de la empresa', () => {
        const html = hojaNomina(cierre, asesor, new Date('2026-10-08T12:00:00'));
        expect(html).not.toMatch(/lottus/i);
        expect(html).not.toMatch(/<img|logo/i);
        expect(html).toContain('Ana &lt;Pérez&gt;');
        expect(html).toContain('size: letter portrait');
        expect(html).toContain('BORRADOR');
        expect(html).not.toContain('Cliente Uno');
        expect(html).not.toContain('Usuario');
        expect(html).not.toContain('quien liquida');
        expect(html).toMatch(/Con mi firma declaro que recibí a satisfacción el pago de <strong>\$\s?40\.400<\/strong>/);
        expect(html).toContain('<span class="etiqueta">Nombre</span>');
        expect(html).toContain('<span class="etiqueta">Fecha</span>');
        expect(html).toMatch(/<th>Venta<\/th><th>Fecha<\/th><th class="num">Precio de lista<\/th><th class="num">Valor venta<\/th>\s*<th class="num">% Dcto.<\/th><th class="num">Comisión<\/th><th>Pago<\/th>/);
        expect(html).toContain('Abono menor al 30 %');
        expect(html).toMatch(/Comisiones a pagar<\/td><td class="num">\$\s?32\.400/);
        expect(hojaNomina(cierre, { ...asesor, estado: 'cerrado' })).not.toContain('BORRADOR');
    });
});
