import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Modal, Button } from './ui';
import BotonImprimir from './impresion/BotonImprimir';
import CotizacionReceipt from './CotizacionReceipt';
import receiptCss from './CotizacionReceipt.css?raw';
import './RemisionPrintModal.css';

// Hoja carta a 96 px por pulgada, con el mismo margen que usa @page al imprimir.
const HOJA_ANCHO = 816;  // 8.5 in
const HOJA_ALTO = 1056;  // 11 in
const MARGEN_MM = 12;
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
 * Vista previa + impresión de una Cotización armada desde el carrito de Lista de
 * Precios (no hay backend de cotizaciones, es un documento del momento).
 *
 * Como en Remisiones, la vista previa es el mismo documento que se imprime: un
 * <iframe> con la hoja carta a escala, así lo que se ve es lo que sale en papel.
 */
const CotizacionPrintModal = ({ open, onClose, items, cliente, vendedorNombre, folio, descuento = 0 }) => {
  const plantillaRef = useRef(null);
  const frameRef = useRef(null);
  const visorRef = useRef(null);
  const [html, setHtml] = useState('');
  const [lista, setLista] = useState(false);
  const [altoDoc, setAltoDoc] = useState(HOJA_ALTO);
  const [espacio, setEspacio] = useState(null);
  const [zoom, setZoom] = useState('hoja'); // 'hoja' = hoja completa, 'real' = 100 %

  // Copia la plantilla (renderizada oculta por React) al documento del iframe.
  useLayoutEffect(() => {
    if (!open || !plantillaRef.current) {
      setHtml('');
      setLista(false);
      return;
    }
    const siguiente = documentoImpresion(`Cotización ${folio || ''}`, plantillaRef.current.outerHTML);
    if (siguiente !== html) {
      setHtml(siguiente);
      setLista(false);
    }
  }, [open, items, cliente, vendedorNombre, folio, descuento]); // eslint-disable-line react-hooks/exhaustive-deps

  // Espacio disponible para la hoja dentro del modal.
  useEffect(() => {
    const el = visorRef.current;
    if (!open || !el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setEspacio({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const alCargar = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc?.body?.querySelector('.cot-page')) return;
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

  const hojas = Math.max(1, Math.ceil((altoDoc - 2 * MARGEN_PX - 1) / AREA_UTIL));
  const escalaHoja = espacio ? Math.min(espacio.w / HOJA_ANCHO, espacio.h / HOJA_ALTO, 1) : 0;
  const escala = zoom === 'real' ? 1 : escalaHoja;
  const visible = lista && escala > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cotización ${folio || ''}`}
      size="xl"
      className="rpm-modal"
      footer={
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
            <span className="rpm-paper">Carta · {hojas} hoja{hojas === 1 ? '' : 's'}</span>
          </div>
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          <BotonImprimir documento={() => html} titulo={`Cotización ${folio || ''}`} imprimirLocal={handlePrint} disabled={!items?.length || !lista} />
        </>
      }
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
            <div key={i} className="rpm-corte" style={{ top: (MARGEN_PX + (i + 1) * AREA_UTIL) * escala }}>
              <span>Hoja {i + 2}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rpm-plantilla" aria-hidden="true">
        <CotizacionReceipt ref={plantillaRef} items={items || []} cliente={cliente} vendedorNombre={vendedorNombre} folio={folio} descuento={descuento} />
      </div>
    </Modal>
  );
};

export default CotizacionPrintModal;
