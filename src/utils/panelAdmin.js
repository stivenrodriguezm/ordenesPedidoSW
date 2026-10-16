import { formatCOP } from './formatCOP';

/** $785,7 M · $12,3 mil · $950 (espacio no separable: la cifra no se parte en dos líneas) */
export const corto = (v) => {
    const n = Number(v) || 0;
    const abs = Math.abs(n);
    const fmt = (x) => x.toLocaleString('es-CO', { maximumFractionDigits: 1 });
    if (abs >= 1e6) return `$${fmt(n / 1e6)}\u00a0M`;
    if (abs >= 1e3) return `$${fmt(n / 1e3)}\u00a0mil`;
    return formatCOP(n) || '$0';
};

/** Frase de resumen del período, armada con las cifras (sin IA). */
export const resumenPeriodo = ({ ventas, periodo }) => {
    if (!ventas.cantidad) return `Aún no hay ventas en este período (día ${periodo.dia} de ${periodo.dias}).`;
    const base = `Llevas ${corto(ventas.total)} en ${ventas.cantidad} ${ventas.cantidad === 1 ? 'venta' : 'ventas'}`;
    if (ventas.variacion_pct === null || ventas.variacion_pct === undefined) return `${base}.`;
    const v = ventas.variacion_pct;
    if (v === 0) return `${base}, igual que al mismo día del período anterior.`;
    return `${base}, ${Math.abs(v).toLocaleString('es-CO')} % ${v > 0 ? 'por encima' : 'por debajo'} del mismo día del período anterior.`;
};

