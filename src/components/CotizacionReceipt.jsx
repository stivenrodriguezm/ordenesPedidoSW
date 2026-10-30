import React from 'react';
import { formatCOP } from '../utils/formatCOP';
import './CotizacionReceipt.css';

const formatDateLong = (date) => date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');

/**
 * Plantilla imprimible de una Cotización de Lista de Precios. No existe un
 * modelo de "Cotización" en el backend — es un documento generado al vuelo
 * a partir del carrito local (ver useCotizacionCart), pensado para
 * imprimirse/entregarse en el momento, igual que ComprobanteEgresoReceipt.
 */
const CotizacionReceipt = React.forwardRef(({ items, cliente, vendedorNombre, folio, descuento = 0 }, ref) => {
  // «Cojines incluidos»: un decorativo cubierto resta lo incluido de su subtotal.
  // Transporte por envío: lo que viaja junto (conjunto o cupo de unidades) no se cobra dos veces.
  const subtotal = items.reduce((sum, i) => sum + (Number(i.precioUnitario) || 0) * i.cantidad - (Number(i.incluido) || 0) - (Number(i.transporteCompartido) || 0), 0);
  const descVal = Number(descuento) || 0;
  const total = Math.max(0, subtotal - descVal);
  const hoy = new Date();
  const vencimiento = new Date(hoy);
  vencimiento.setDate(vencimiento.getDate() + 15);

  return (
    <div ref={ref} className="cot-page">
      <div className="cot-header">
        <div className="cot-logo"><span>LOTTUS</span></div>
        <div className="cot-doc-title">
          <div className="cot-doc-kicker">Cotización</div>
          <div className="cot-doc-number">No. {folio}</div>
          <div className="cot-doc-date">Fecha: {formatDateLong(hoy)}</div>
        </div>
      </div>

      <div className="cot-meta-grid">
        <div className="cot-meta-box">
          <div className="cot-meta-label">Cliente</div>
          <div className="cot-meta-value">{cliente || 'Cliente de mostrador'}</div>
        </div>
        <div className="cot-meta-box">
          <div className="cot-meta-label">Asesor</div>
          <div className="cot-meta-value">{vendedorNombre || '—'}</div>
          <div className="cot-meta-sub">Válida hasta: {formatDateLong(vencimiento)}</div>
        </div>
      </div>

      <table className="cot-table">
        {/* Vr. Unitario y Subtotal anchos: el valor nunca se parte en dos líneas. */}
        <colgroup>
          <col />
          <col className="cot-col-cant" />
          <col className="cot-col-valor" />
          <col className="cot-col-valor" />
        </colgroup>
        <thead>
          <tr>
            <th>Producto</th>
            <th className="cot-center">Cant.</th>
            <th className="cot-right">Vr. Unitario</th>
            <th className="cot-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="cot-item-nombre">{item.lineaNombre} — {item.varianteNombre}</div>
                <div className="cot-item-detalle">
                  {[item.categoriaNombre, item.grupoNombre].filter(Boolean).join(' · ')}
                </div>
                {item.opcionales?.length > 0 && (
                  <div className="cot-item-opcionales">
                    Incluye: {item.opcionales.map((o) => `${o.cantidad > 1 ? `${o.cantidad} × ` : ''}${o.descripcion}`).join(', ')}
                  </div>
                )}
                {item.notas && <div className="cot-item-notas">{item.notas}</div>}
                {Number(item.incluido) > 0 && <div className="cot-item-opcionales">Incluido con «Cojines incluidos»: −{formatCOP(item.incluido)}</div>}
                {Number(item.transporteCompartido) > 0 && <div className="cot-item-opcionales">Transporte compartido: −{formatCOP(item.transporteCompartido)}</div>}
              </td>
              <td className="cot-center">{item.cantidad}</td>
              <td className="cot-right">{formatCOP(item.precioUnitario)}</td>
              <td className="cot-right cot-bold">{formatCOP(item.precioUnitario * item.cantidad - (Number(item.incluido) || 0) - (Number(item.transporteCompartido) || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="cot-total-card">
        {descVal > 0 && (
          <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: 'var(--slate-600, #475569)', fontSize: '0.9rem' }}>
              <span>Subtotal</span>
              <span>{formatCOP(subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#b91c1c', fontSize: '0.9rem', fontWeight: 600 }}>
              <span>Descuento Comercial</span>
              <span>-{formatCOP(descVal)}</span>
            </div>
          </div>
        )}
        <div className="cot-total-final">
          <span className="cot-total-label">Total Cotizado</span>
          <span className="cot-total-value">{formatCOP(total)}</span>
        </div>
      </div>

      <div className="cot-condiciones">
        <div className="cot-meta-label">Condiciones</div>
        <ul>
          <li>Precios sujetos a cambio sin previo aviso. Válidos por 15 días desde la fecha de emisión.</li>
          <li>Tiempos de entrega e instalación se confirman al momento del pedido.</li>
        </ul>
      </div>

      <div className="cot-footer">
        LOTTUS · Cotización generada el {formatDateLong(hoy)} · Doc v1.0
      </div>
    </div>
  );
});

export default CotizacionReceipt;
