import React, { useRef } from 'react';
import { Modal, Button } from './ui';
import BotonImprimir from './impresion/BotonImprimir';
import CotizacionReceipt from './CotizacionReceipt';
import receiptCss from './CotizacionReceipt.css?raw';
import './ComprobanteEgresoPrintModal.css';

/**
 * Vista previa + impresión directa de una Cotización armada desde el
 * carrito de Lista de Precios. Mismo patrón que ComprobanteEgresoPrintModal
 * (iframe aislado + window.print(), sin generar archivo PDF) — no hay
 * backend de cotizaciones, es un documento del momento.
 */
const CotizacionPrintModal = ({ open, onClose, items, cliente, vendedorNombre, folio, descuento = 0 }) => {
  const receiptRef = useRef(null);

  // El mismo documento sirve para imprimir aquí o enviarlo a la impresora de la oficina.
  const documento = () => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Cotización ${folio || ''}</title>
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
      title={`Cotización ${folio || ''}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          <BotonImprimir documento={documento} titulo={`Cotización ${folio || ''}`} imprimirLocal={handlePrint} disabled={!items?.length} />
        </>
      }
    >
      <div className="cepm-preview-wrapper">
        <CotizacionReceipt ref={receiptRef} items={items || []} cliente={cliente} vendedorNombre={vendedorNombre} folio={folio} descuento={descuento} />
      </div>
    </Modal>
  );
};

export default CotizacionPrintModal;
