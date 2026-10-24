import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FaImage } from 'react-icons/fa';
import { Modal, Button } from './ui';
import BotonImprimir from './impresion/BotonImprimir';
import RemisionReceipt from './RemisionReceipt';
import receiptCss from './RemisionReceipt.css?raw';
import { numeroRemision } from '../utils/remisiones';
import './RemisionPrintModal.css';

// Hoja carta a 96 px por pulgada, con el mismo margen que usa @page al imprimir.
const HOJA_ANCHO = 816;  // 8.5 in
const HOJA_ALTO = 1056;  // 11 in
const MARGEN_MM = 11;
const MARGEN_PX = (MARGEN_MM * 96) / 25.4;
const AREA_UTIL = HOJA_ALTO - 2 * MARGEN_PX;

function documentoImpresion(titulo, cuerpo) {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${titulo}</title>
<link href="https://fonts.googleapis.com/css2?family=Audiowide&display=swap" rel="stylesheet">
<style>
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  @page { size: letter portrait; margin: ${MARGEN_MM}mm; }
  @media screen {
    html, body { overflow: hidden; }
    body { padding: ${MARGEN_MM}mm; }
  }
  ${receiptCss}
</style>
</head>
<body>${cuerpo}</body>
</html>`;
}

/**
 * Vista previa + impresión de una remisión. Sirve justo al crearla y para
 * reimprimirla después desde el listado: solo necesita el objeto de la API.
 *
 * La vista previa es el mismo documento que se imprime: un <iframe> con la hoja
 * carta a escala (mismo enfoque aislado que ComprobanteEgresoPrintModal), así lo
 * que se ve es exactamente lo que sale en papel. Desde el diálogo del navegador
 * también se puede "Guardar como PDF", o descargar la misma hoja como imagen PNG.
 */
const RemisionPrintModal = ({ open, onClose, remision, closeLabel = 'Cerrar' }) => {
    const plantillaRef = useRef(null);
    const frameRef = useRef(null);
    const visorRef = useRef(null);
    const [html, setHtml] = useState('');
    const [lista, setLista] = useState(false);
    const [altoDoc, setAltoDoc] = useState(HOJA_ALTO);
    const [espacio, setEspacio] = useState(null);
    const [zoom, setZoom] = useState('hoja'); // 'hoja' = hoja completa, 'real' = 100 %
    const [descargando, setDescargando] = useState(false);

    // Copia la plantilla (renderizada oculta por React) al documento del iframe.
    useLayoutEffect(() => {
        if (!open || !plantillaRef.current) {
            setHtml('');
            setLista(false);
            return;
        }
        const titulo = `Remision ${remision ? numeroRemision(remision.id) : ''}`;
        const siguiente = documentoImpresion(titulo, plantillaRef.current.outerHTML);
        if (siguiente !== html) {
            setHtml(siguiente);
            setLista(false);
        }
    }, [open, remision]); // eslint-disable-line react-hooks/exhaustive-deps

    // Espacio disponible para la hoja dentro del modal.
    useEffect(() => {
        const el = visorRef.current;
        if (!open || !el) return undefined;
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setEspacio({ w: width, h: height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, [open]);

    const alCargar = useCallback(() => {
        const doc = frameRef.current?.contentDocument;
        if (!doc?.body?.querySelector('.rr-page')) return;
        // Espera la fuente del logo (si tarda, sigue igual) y mide el alto real.
        Promise.race([
            doc.fonts ? doc.fonts.ready : Promise.resolve(),
            new Promise(resolve => setTimeout(resolve, 900)),
        ]).then(() => {
            setAltoDoc(Math.max(HOJA_ALTO, Math.ceil(doc.body.getBoundingClientRect().height)));
            setLista(true);
        });
    }, []);

    const handlePrint = () => {
        const win = frameRef.current?.contentWindow;
        if (!win || !lista) return;
        win.focus();
        win.print();
    };

    // Foto de la misma hoja que se imprime (con su margen), a doble resolución.
    const handleDescargarPng = async () => {
        const doc = frameRef.current?.contentDocument;
        if (!doc?.body || !lista || descargando) return;
        setDescargando(true);
        try {
            const { default: html2canvas } = await import('html2canvas');
            // html2canvas pinta el texto en un canvas de esta página: la fuente del logo
            // tiene que estar cargada aquí, no solo en el iframe.
            await document.fonts?.load('22px "Audiowide"').catch(() => {});
            const canvas = await html2canvas(doc.body, {
                backgroundColor: 'var(--surface)',
                scale: 2,
                useCORS: true,
                logging: false,
                width: HOJA_ANCHO,
                height: doc.body.scrollHeight,
                windowWidth: HOJA_ANCHO,
                // En la copia que se fotografía: html2canvas no pinta texto dentro de
                // inline-flex (el logo salía como un recuadro negro) y sin recortes
                // por overflow (el pie de página salía cortado).
                onclone: clon => {
                    const estilo = clon.createElement('style');
                    estilo.textContent = 'html, body, .rr-page { overflow: visible !important; }'
                        + ' .rr-logo { display: inline-block !important; line-height: 1; }';
                    clon.head.appendChild(estilo);
                },
            });
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `remision_${numeroRemision(remision?.id)}.png`;
            link.click();
        } catch (err) {
            console.error('Error al generar la imagen de la remisión:', err);
        } finally {
            setDescargando(false);
        }
    };

    const hojas = Math.max(1, Math.ceil((altoDoc - 2 * MARGEN_PX - 1) / AREA_UTIL));
    const escalaHoja = espacio ? Math.min(espacio.w / HOJA_ANCHO, espacio.h / HOJA_ALTO, 1) : 0;
    const escala = zoom === 'real' ? 1 : escalaHoja;
    const visible = lista && escala > 0;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={remision ? `Remisión No. ${numeroRemision(remision.id)}` : 'Remisión'}
            size="xl"
            className="rpm-modal"
            footer={(
                <>
                    <div className="rpm-info">
                        <div className="rpm-zoom" role="group" aria-label="Tamaño de la vista previa">
                            <button type="button" className={zoom === 'hoja' ? 'is-active' : ''} onClick={() => setZoom('hoja')}>
                                Hoja completa
                            </button>
                            <button type="button" className={zoom === 'real' ? 'is-active' : ''} onClick={() => setZoom('real')}>
                                100 %
                            </button>
                        </div>
                        <span className="rpm-paper">
                            Carta · {hojas} hoja{hojas === 1 ? '' : 's'}
                        </span>
                    </div>
                    <Button variant="secondary" onClick={onClose}>{closeLabel}</Button>
                    <Button variant="secondary" icon={FaImage} onClick={handleDescargarPng} disabled={!lista} loading={descargando}>
                        Descargar PNG
                    </Button>
                    <BotonImprimir documento={() => html} titulo={`Remisión ${numeroRemision(remision?.id)}`} imprimirLocal={handlePrint} disabled={!lista} />
                </>
            )}
        >
            <div className="rpm-visor" ref={visorRef}>
                <div
                    className={`rpm-hoja${visible ? '' : ' is-cargando'}${zoom === 'hoja' ? ' is-reducida' : ''}`}
                    style={{ width: HOJA_ANCHO * escala, height: altoDoc * escala }}
                    onClick={() => setZoom(z => (z === 'hoja' ? 'real' : 'hoja'))}
                    title={zoom === 'hoja' ? 'Clic para ver al 100 %' : 'Clic para ver la hoja completa'}
                >
                    {html && (
                        <iframe
                            ref={frameRef}
                            className="rpm-frame"
                            title="Vista previa de impresión"
                            srcDoc={html}
                            onLoad={alCargar}
                            tabIndex={-1}
                            style={{ width: HOJA_ANCHO, height: altoDoc, transform: `scale(${escala || 1})` }}
                        />
                    )}
                    {Array.from({ length: hojas - 1 }, (_, i) => (
                        <div
                            key={i}
                            className="rpm-corte"
                            style={{ top: (MARGEN_PX + (i + 1) * AREA_UTIL) * escala }}
                        >
                            <span>Hoja {i + 2}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="rpm-plantilla" aria-hidden="true">
                <RemisionReceipt ref={plantillaRef} remision={remision} />
            </div>
        </Modal>
    );
};

export default RemisionPrintModal;
