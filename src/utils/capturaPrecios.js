const miles = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

// Entrada del servidor: DecimalField con punto decimal. No recibe texto del usuario.
export const mostrarPesos = (valor) => valor == null || valor === '' ? '' : `${Number(valor) < 0 ? '-' : ''}$${miles.format(Math.abs(Number(valor)))}`;

// Entrada del usuario: entero sin agrupar, COP colombiano o decimal del API terminado en .00.
// Nunca transformar «3,50» en 350 ni «3000000.00» en 300000000.
export function leerPesos(texto, permiteNegativo = false) {
  const limpio = String(texto).trim().replace(/\s/g, '').replace(/^(-?)\$/, '$1');
  if (!limpio) throw new Error('Ingresa un valor; vacío no equivale a cero.');
  let numero;
  if (/^-?\d{1,3}(\.\d{3})+(?:,0{1,2})?$/.test(limpio)) numero = Number(limpio.replace(/\./g, '').replace(',', '.'));
  else if (/^-?\d+(?:[.,]0{1,2})?$/.test(limpio)) numero = Number(limpio.replace(',', '.'));
  else throw new Error('Usa pesos enteros, por ejemplo $3.000.000, sin centavos.');
  if (!Number.isSafeInteger(numero) || Math.abs(numero) > 9999999999 || (!permiteNegativo && numero < 0)) {
    throw new Error(permiteNegativo ? 'El importe supera el límite permitido.' : 'Usa un valor entre $0 y $9.999.999.999.');
  }
  return numero;
}

export function leerDecimal(texto, { nullable = false, max = 999999.99, min = 0.01, permiteNegativo = false } = {}) {
  const limpio = String(texto).trim();
  if (!limpio && nullable) return null;
  if (!(permiteNegativo ? /^-?\d+(?:[.,]\d{1,2})?$/ : /^\d+(?:[.,]\d{1,2})?$/).test(limpio)) throw new Error('Usa un número con máximo dos decimales.');
  const numero = Number(limpio.replace(',', '.'));
  if (!Number.isFinite(numero) || numero < min || numero > max) throw new Error(`El valor debe estar entre ${min} y ${max}.`);
  return numero;
}
