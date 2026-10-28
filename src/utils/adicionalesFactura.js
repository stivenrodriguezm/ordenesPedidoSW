// Adicionales de la factura de proveedor (2026-10-28): concepto, si suma o resta y valor.
export const nuevoAdicional = () => ({ clave: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()), concepto: '', tipo: 'suma', valor: null });
export const netoAdicionales = (ajustes = []) => ajustes.reduce((n, a) => n + (Number(a.valor) || 0) * (a.tipo === 'resta' ? -1 : 1), 0);
export const adicionalIncompleto = (a) => !String(a.concepto || '').trim() || !(Number(a.valor) > 0);
