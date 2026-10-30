import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaDownload } from 'react-icons/fa';
import { Button } from '../ui';
import { descargarImagen } from '../../utils/descargarImagen';

// Botón que dibuja fuera de pantalla la plantilla que devuelve `imagen(ref)` y la descarga
// como PNG (las mismas plantillas de cuando se crearon los pedidos).
export default function DescargarImagen({ archivo, imagen, listo = true, onError, children = 'Descargar', ...props }) {
    const [generando, setGenerando] = useState(false);
    const nodo = useRef(null);

    useEffect(() => {
        if (!generando) return undefined;
        let vivo = true;
        descargarImagen(nodo.current, archivo)
            .catch((e) => {
                console.error('No se pudo generar la imagen', archivo, e);
                onError?.('No se pudo generar la imagen.');
            })
            .finally(() => { if (vivo) setGenerando(false); });
        return () => { vivo = false; };
    }, [generando]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            <Button variant="secondary" icon={FaDownload} loading={generando} disabled={!listo}
                onClick={(e) => { e.stopPropagation(); setGenerando(true); }} {...props}>
                {children}
            </Button>
            {generando && createPortal(
                <div className="img-offscreen" aria-hidden="true">{imagen(nodo)}</div>,
                document.body,
            )}
        </>
    );
}
