import { leerDecimal, leerPesos } from '../../utils/capturaPrecios';

// Descuento general de la cotización (2026-10-30): se escribe el % o el precio final y el
// otro se calcula. Lo que se guarda es el descuento en pesos enteros sobre el subtotal.
export const TOPE_ESTANDAR = 0.25;

export const textoPorcentaje = (pct) => String(Math.round(pct * 100) / 100).replace('.', ',');

/**
 * subtotal: pesos enteros del carrito. modo: 'porcentaje' | 'final' | null (lo último que se
 * escribió). texto: lo que hay en ese campo. Devuelve { descuento, porcentaje, final, error }.
 */
export function calcularDescuento(subtotal, modo, texto) {
  const sinDescuento = { descuento: 0, porcentaje: 0, final: subtotal, error: null };
  if (!modo || !String(texto ?? '').trim()) return sinDescuento;
  let descuento;
  try {
    if (modo === 'porcentaje') {
      const pct = leerDecimal(texto, { min: 0, max: 100 });
      descuento = Math.round((subtotal * pct) / 100);
    } else {
      const final = leerPesos(texto);
      if (final > subtotal) return { ...sinDescuento, error: 'El precio final no puede ser mayor que el subtotal.' };
      descuento = subtotal - final;
    }
  } catch (e) {
    return { ...sinDescuento, error: modo === 'porcentaje' ? 'Usa un porcentaje entre 0 y 100, con máximo dos decimales.' : e.message };
  }
  return { descuento, porcentaje: subtotal > 0 ? (descuento / subtotal) * 100 : 0, final: subtotal - descuento, error: null };
}
