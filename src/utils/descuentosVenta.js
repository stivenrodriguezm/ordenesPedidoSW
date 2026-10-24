import { fraccionVenta, numeroParticipantes, participantesVenta } from './ventasCompartidas';

const numero = valor => valor == null || String(valor).trim() === '' ? NaN : Number(valor);

// Mismo criterio que Nómina: vender sobre la lista equivale a 0 % de descuento.
// Un precio de lista ausente o no positivo no equivale a un descuento de cero.
export function datosDescuento(venta) {
    const lista = numero(venta.valor_lista);
    const total = numero(venta.valor_total);
    if (!Number.isFinite(lista) || lista <= 0 || !Number.isFinite(total) || total < 0) return null;
    const descuento = Math.max(0, lista - total);
    return { lista, descuento, porcentaje: descuento / lista * 100 };
}

export function formatDescuento(porcentaje) {
    return porcentaje == null ? '—' : `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(porcentaje)} %`;
}

const vacio = () => ({ lista: 0, descuento: 0, sinLista: 0, porcentaje: null });
function sumar(destino, datos, fraccion) {
    if (!fraccion) return;
    if (!datos) { destino.sinLista++; return; }
    destino.lista += datos.lista * fraccion;
    destino.descuento += datos.descuento * fraccion;
    destino.porcentaje = destino.descuento / destino.lista * 100;
}

export function resumenDescuentos(ventas, cuenta = null) {
    const resultado = { total: vacio(), sedes: {}, vendedores: {}, feria: vacio(), postferia: vacio() };
    ventas.forEach(venta => {
        if (String(venta.estado).toLowerCase().includes('anulad')) return;
        const datos = datosDescuento(venta);
        const fraccion = fraccionVenta(venta, cuenta);
        sumar(resultado.total, datos, fraccion);
        if (venta.es_feria_hogar) sumar(resultado.feria, datos, fraccion);
        else {
            const sede = venta.sede || 'Sin Sede';
            resultado.sedes[sede] ??= vacio();
            sumar(resultado.sedes[sede], datos, fraccion);
        }
        if (venta.es_postferia) sumar(resultado.postferia, datos, fraccion);
        participantesVenta(venta).forEach(id => {
            if (cuenta && !cuenta(id)) return;
            resultado.vendedores[id] ??= vacio();
            sumar(resultado.vendedores[id], datos, 1 / numeroParticipantes(venta));
        });
    });
    return resultado;
}
