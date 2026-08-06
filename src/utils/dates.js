// Utilidades de fecha unificadas para toda la app.
// OJO: las fechas 'YYYY-MM-DD' se parsean por partes para evitar el desfase
// de zona horaria que produce `new Date('YYYY-MM-DD')` (se interpreta en UTC).

/** Fecha de hoy como 'YYYY-MM-DD' en hora local. */
export const getTodayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Convierte 'YYYY-MM-DD' (o Date) a Date local sin desfase de zona horaria. */
export const parseLocalDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/** 'YYYY-MM-DD' → 'dd/mm/yyyy'. Devuelve '' si la fecha es inválida. */
export const formatDate = (value) => {
  const d = parseLocalDate(value);
  if (!d) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
};

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 'YYYY-MM-DD' → '15 ene 2026'. Devuelve '' si la fecha es inválida. */
export const formatDateCorta = (value) => {
  const d = parseLocalDate(value);
  if (!d) return '';
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]} ${d.getFullYear()}`;
};

/** 'YYYY-MM-DD' → '15 de enero de 2026' (locale es-CO). */
export const formatDateLarga = (value) => {
  const d = parseLocalDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
};
