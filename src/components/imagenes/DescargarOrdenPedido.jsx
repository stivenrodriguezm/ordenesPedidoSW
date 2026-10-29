import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaDownload } from 'react-icons/fa';
import { Button } from '../ui';
import ImagenOrdenPedido from './ImagenOrdenPedido';
import { descargarImagen } from '../../utils/descargarImagen';
import { datosImagenOrden } from './datosImagenOrden';

// Vuelve a descargar la imagen PNG de la orden de pedido (permiso DESCARGAR_ORDEN_PEDIDO).
export default function DescargarOrdenPedido({ orden, detalles, onError, ...props }) {
    const [generando, setGenerando] = useState(false);
    const nodo = useRef(null);

    useEffect(() => {
        if (!generando) return undefined;
        let vivo = true;
        descargarImagen(nodo.current, `pedido_${orden.id}.png`)
            .catch((e) => {
                console.error('No se pudo generar la imagen de la orden', orden.id, e);
                onError?.('No se pudo generar la imagen de la orden.');
            })
            .finally(() => { if (vivo) setGenerando(false); });
        return () => { vivo = false; };
    }, [generando]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            <Button variant="secondary" icon={FaDownload} loading={generando} disabled={!Array.isArray(detalles)}
                onClick={(e) => { e.stopPropagation(); setGenerando(true); }} title="Descargar la imagen de la orden" {...props}>
                Descargar
            </Button>
            {generando && createPortal(
                <div className="img-offscreen" aria-hidden="true">
                    <ImagenOrdenPedido ref={nodo} {...datosImagenOrden(orden, detalles)} />
                </div>,
                document.body,
            )}
        </>
    );
}
