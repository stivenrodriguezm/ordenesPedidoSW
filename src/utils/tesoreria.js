// El signo y los centavos forman parte del conteo/conciliación.
const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 });
export const dinero = valor => valor == null ? '—' : moneda.format(Number(valor));
export const fechaHora = valor => valor
    ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(valor))
    : '—';

