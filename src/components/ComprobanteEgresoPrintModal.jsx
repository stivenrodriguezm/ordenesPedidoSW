import React, { useRef } from 'react';
import { FaPrint } from 'react-icons/fa';
import { Modal, Button } from './ui';
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

  const handlePrint = () => {
    const node = receiptRef.current;
    if (!node) return;

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
    doc.write(`<!DOCTYPE html>
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
<body>${node.outerHTML}</body>
</html>`);
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
          <Button variant="primary" icon={FaPrint} onClick={handlePrint}>Imprimir</Button>
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
