import { fechaImagen } from '../../utils/descargarImagen';

const CUERO = '[CUERO] ';
const COLOR = ' - Color: ';

// Cada línea se guardó como «[CUERO] Referencia - Color: X» (el prefijo solo en cuero y el
// color solo si se indicó); aquí se separa otra vez para la imagen.
export function lineaDeTela(texto = '') {
    const cuero = texto.startsWith(CUERO);
    const resto = cuero ? texto.slice(CUERO.length) : texto;
    const i = resto.indexOf(COLOR);
    return {
        cuero,
        referencia: (i >= 0 ? resto.slice(0, i) : resto).trim(),
        color: i >= 0 ? resto.slice(i + COLOR.length).trim() : '',
    };
}

// Datos de la imagen del pedido de tela o cuero guardado (listado de /telas), con los mismos
// textos que al crearlo.
export function datosImagenTela(pedido) {
    const lineas = (pedido.detalles || []).map(d => ({ ...lineaDeTela(d.tela), cantidad: Number(d.cantidad) }));
    const cuero = lineas.some(l => l.cuero);
    return {
        numero: pedido.id,
        proveedor: pedido.proveedor_nombre || '',
        solicitante: pedido.usuario_nombre_completo || pedido.usuario_nombre || '',
        material: cuero ? 'Cuero' : 'Tela',
        fecha: fechaImagen(pedido.fecha_creacion, { conCero: false }),
        orden: pedido.orden_id || null,
        venta: pedido.venta_id || null,
        direccion: pedido.direccion_entrega,
        observacion: pedido.observacion,
        detalles: lineas.map(l => ({ referencia: l.referencia, color: l.color || 'Standard', cantidad: l.cantidad, unidad: l.cuero ? 'dm' : 'mts' })),
    };
}
