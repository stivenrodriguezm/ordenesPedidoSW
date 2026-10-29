import { fechaImagen } from '../../utils/descargarImagen';

// Datos de la imagen a partir de la orden guardada (listado de /ordenes) y sus líneas
// (pedidos/<id>/detalles/), con los mismos textos que al crearla.
export function datosImagenOrden(orden, detalles = []) {
    const venta = orden.venta || orden.orden_venta || '';
    return {
        numero: orden.id,
        proveedor: orden.proveedor_nombre || '',
        vendedor: orden.vendedor || '',
        ordenCompra: orden.es_feria_hogar
            ? (venta ? `${venta} (Feria del hogar)` : 'Feria del hogar')
            : (venta || 'No especificado'),
        fechaPedido: fechaImagen(orden.fecha_pedido),
        fechaEntrega: fechaImagen(orden.fecha_esperada),
        productos: detalles.map(d => ({
            cantidad: d.cantidad,
            referencia: d.referencia,
            subcategoria: d.subcategoria_nombre || '',
            descripcion: d.especificaciones,
        })),
        nota: orden.observacion,
    };
}
