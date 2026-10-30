import DescargarImagen from './DescargarImagen';
import ImagenOrdenPedido from './ImagenOrdenPedido';
import { datosImagenOrden } from './datosImagenOrden';

// Vuelve a descargar la imagen PNG de la orden de pedido (permiso DESCARGAR_ORDEN_PEDIDO).
export default function DescargarOrdenPedido({ orden, detalles, onError, ...props }) {
    return (
        <DescargarImagen archivo={`pedido_${orden.id}.png`} listo={Array.isArray(detalles)} onError={onError}
            title="Descargar la imagen de la orden" {...props}
            imagen={(ref) => <ImagenOrdenPedido ref={ref} {...datosImagenOrden(orden, detalles)} />} />
    );
}
