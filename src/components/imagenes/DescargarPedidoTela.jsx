import DescargarImagen from './DescargarImagen';
import ImagenPedidoTela from './ImagenPedidoTela';
import { datosImagenTela } from './datosImagenTela';

// Vuelve a descargar la imagen PNG del pedido de tela o cuero (permiso DESCARGAR_IMAGEN_PEDIDO_TELA).
export default function DescargarPedidoTela({ pedido, onError, ...props }) {
    return (
        <DescargarImagen archivo={`pedido_material_${pedido.id}.png`} onError={onError}
            title="Descargar la imagen del pedido" {...props}
            imagen={(ref) => <ImagenPedidoTela ref={ref} {...datosImagenTela(pedido)} />} />
    );
}
