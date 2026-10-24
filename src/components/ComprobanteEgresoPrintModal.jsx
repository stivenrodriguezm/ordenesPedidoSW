import React, { useRef } from 'react';
import { Modal, Button } from './ui';
import BotonImprimir from './impresion/BotonImprimir';
import ComprobanteEgresoReceipt from './ComprobanteEgresoReceipt';
import receiptCss from './ComprobanteEgresoReceipt.css?raw';
import './ComprobanteEgresoPrintModal.css';

/**
 * Vista previa + impresión directa de un Comprobante de Egreso.
 * Se puede abrir tantas veces como se quiera (justo al crear, o después desde
 * el listado) — solo necesita el objeto del comprobante tal cual lo devuelve
 * la API, no requiere ningún estado adicional ni descarga de PDF.
 *
 * La impresión se hace en un <iframe> completamente aislado (no con el truco
 * de visibility:hidden sobre toda la página) para garantizar una sola hoja
 * Carta vertical limpia, sin arrastrar el resto del layout de la app (sidebar,
 * tabla, modal) que antes producía páginas en blanco/duplicadas al imprimir.
 */
const ComprobanteEgresoPrintModal = ({ open, onClose, comprobante }) => {
  const receiptRef = useRef(null);

  // El mismo documento sirve para imprimir aquí o enviarlo a la impresora de la oficina.
  const documento = () => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Comprobante de Egreso ${comprobante ? `CE-${comprobante.id}` : ''}</title>
<link href="https://fonts.googleapis.com/css2?family=Audiowide&display=swap" rel="stylesheet">
<style>
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  @page { size: letter portrait; margin: 12mm; }
  ${receiptCss}
</style>
</head>
<body>${receiptRef.current?.outerHTML || ''}</body>
</html>`;

  const handlePrint = () => {
    if (!receiptRef.current) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(documento());
    doc.close();

    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    // Pequeño margen para que el iframe termine de maquetar antes de imprimir.
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(cleanup, 500);
    }, 250);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={comprobante ? `Comprobante de Egreso CE-${comprobante.id}` : 'Comprobante de Egreso'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          <BotonImprimir documento={documento} titulo={`Comprobante de Egreso ${comprobante ? `CE-${comprobante.id}` : ''}`} imprimirLocal={handlePrint} />
        </>
      }
    >
      <div className="cepm-preview-wrapper">
        <ComprobanteEgresoReceipt ref={receiptRef} comprobante={comprobante} />
      </div>
    </Modal>
  );
};

export default ComprobanteEgresoPrintModal;
