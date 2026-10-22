export const claveCuentas = titular => ['pagos', 'cuentas', titular];
export const etiquetaCuenta = c => `${c.alias ? c.alias + ' · ' : ''}${c.banco_nombre || (c.banco === '51' ? 'Davivienda' : c.banco === '7' ? 'Bancolombia' : c.banco)} · ${c.tipo} · ${c.numero}`;
