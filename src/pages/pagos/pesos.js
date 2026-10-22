// API decimal y texto colombiano son entradas distintas. Nunca convertir
// "$3.000.000" con parseFloat ni quitar centavos de un importe recibido.
export function leerPesos(texto) {
    const s = String(texto ?? '').replace(/^\$\s*/, '').trim();
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(s)) return null;
    const n = Number(s.replaceAll('.', ''));
    return Number.isSafeInteger(n) && n >= 0 && n <= 99999999 ? n : null;
}
export function mostrarPesosAPI(valor) {
    const s = String(valor ?? '');
    if (!/^\d+(?:\.0+)?$/.test(s)) return s;
    return '$' + Number(s).toLocaleString('es-CO');
}
export function validarPesos(texto) {
    const n = leerPesos(texto);
    if (n === null) throw new Error('Escribe un importe en pesos sin decimales, entre $0 y $99.999.999.');
    return String(n);
}
