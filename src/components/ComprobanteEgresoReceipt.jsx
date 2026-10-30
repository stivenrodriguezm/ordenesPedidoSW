import React from 'react';
import { esResta, totalOtrosConceptos } from '../utils/otrosConceptos';
import { formatCOP } from '../utils/formatCOP';
import { parseLocalDate } from '../utils/dates';
import { groupProductos } from '../utils/groupProductos';
import './ComprobanteEgresoReceipt.css';

const formatDateLong = (value) => {
  const d = parseLocalDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
};

/**
 * Plantilla imprimible del Comprobante de Egreso. Recibe el objeto tal cual lo
 * devuelve la API (listado o creación) — no necesita datos adicionales, por lo
 * que sirve tanto para el "imprimir" justo al crear como para "reimprimir" desde
 * la lista en cualquier momento.
 */
const ComprobanteEgresoReceipt = React.forwardRef(({ comprobante }, ref) => {
  if (!comprobante) return null;

  const facturas = comprobante.facturas_detalle || [];
  const otrosConceptosList = Array.isArray(comprobante.otros_conceptos) ? comprobante.otros_conceptos : [];
  const otrosConceptosTotalReal = totalOtrosConceptos(otrosConceptosList);
  const beneficiario = comprobante.proveedor_nombre || comprobante.proveedor_otro_nombre || 'N/A';
  const totalProductos = facturas.reduce((sum, f) => sum + (f.productos?.length || 0), 0);

  // Cálculos de descuento
  const totalFacturas = facturas.reduce((sum, f) => sum + (parseFloat(f.valor) || 0), 0);
  const valorPagado = parseFloat(comprobante.valor) || 0;
  const diferencia = totalFacturas - valorPagado;
  
  let descuentoGlobalMonto = 0;
  if (comprobante.descripcion) {
    const match = comprobante.descripcion.match(/Descuento[^\d]*?([\d.,]+)/i);
    if (match) {
      descuentoGlobalMonto = parseFloat(match[1].replace(/[^\d]/g, ''));
    }
  }
  // Lo que falta por explicar tras los conceptos estructurados (que pueden restar) es el descuento.
  const sinExplicar = otrosConceptosList.length > 0 ? diferencia + otrosConceptosTotalReal : diferencia;
  if (!descuentoGlobalMonto && sinExplicar > 0) {
    descuentoGlobalMonto = sinExplicar;
  }
  
  const descuentoRatio = totalFacturas > 0 && descuentoGlobalMonto > 0
    ? (descuentoGlobalMonto / totalFacturas)
    : 0;
  // Preferir el desglose estructurado real; solo recurrir a la heurística por
  // diferencia para comprobantes viejos creados antes de que existiera el
  // campo `otros_conceptos`.
  const otrosConceptosMonto = otrosConceptosList.length > 0
    ? otrosConceptosTotalReal
    : (descuentoGlobalMonto - diferencia);

  return (
    <div ref={ref} className="cer-page">
      {/* Header */}
      <div className="cer-header">
        <div className="cer-logo">
          <span>LOTTUS</span>
        </div>
        <div className="cer-doc-title">
          <div className="cer-doc-kicker">Comprobante de Egreso</div>
          <div className="cer-doc-number">No. CE-{comprobante.id}</div>
          <div className="cer-doc-date">Fecha: {formatDateLong(comprobante.fecha)}</div>
          <div className="cer-doc-status-badge">
            <span className="cer-status-text">Estado: Pagado</span>
          </div>
        </div>
      </div>

      {/* Meta grid */}
      <div className="cer-meta-grid">
        <div className="cer-meta-box">
          <div className="cer-meta-label">Beneficiario / Proveedor</div>
          <div className="cer-meta-value">{beneficiario}</div>
          {comprobante.recibido_por && (
            <div className="cer-meta-sub">Recibido por: {comprobante.recibido_por}</div>
          )}
        </div>
        <div className="cer-meta-box">
          <div className="cer-meta-label">Medio de Pago</div>
          <div className="cer-meta-value">{comprobante.medio_pago || '—'}</div>
        </div>
      </div>

      {comprobante.concepto && (
        <div className="cer-concepto">
          <span className="cer-concepto-label">Concepto:</span> {comprobante.concepto}
        </div>
      )}
      {comprobante.cuenta_destino_snapshot?.numero && <div className="cer-concepto"><span className="cer-concepto-label">Cuenta destino:</span> {comprobante.cuenta_destino_snapshot.banco === '51' ? 'Davivienda' : comprobante.cuenta_destino_snapshot.banco === '7' ? 'Bancolombia' : `Banco ${comprobante.cuenta_destino_snapshot.banco}`} · {comprobante.cuenta_destino_snapshot.tipo} · {comprobante.cuenta_destino_snapshot.numero}<br />Titular: {comprobante.cuenta_destino_snapshot.nombres} {comprobante.cuenta_destino_snapshot.apellidos}</div>}

      {/* Facturas + productos */}
      {facturas.length > 0 && (
        <div className="cer-section">
          <div className="cer-section-title">
            Facturas pagadas ({facturas.length}){totalProductos > 0 ? ` · ${totalProductos} producto${totalProductos === 1 ? '' : 's'}` : ''}
          </div>
          <table className="cer-table">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Fecha</th>
                <th className="cer-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((f, i) => (
                <React.Fragment key={f.id || i}>
                  <tr className="cer-factura-row">
                    <td className="cer-bold">#{f.id_manual || f.id}</td>
                    <td>{formatDateLong(f.fecha_factura)}</td>
                    <td className="cer-right cer-bold">
                      {descuentoRatio > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
                          <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.65rem', fontWeight: 'normal' }}>{formatCOP(f.valor)}</span>
                          <span>{formatCOP(f.valor - (f.valor * descuentoRatio))}</span>
                        </div>
                      ) : (
                        formatCOP(f.valor)
                      )}
                    </td>
                  </tr>
                  {f.productos && f.productos.length > 0 && (
                    <tr className="cer-productos-row">
                      <td colSpan="3">
                        <div className="cer-productos-list">
                          {groupProductos(f.productos).map((p) => (
                            <div key={p.id} className="cer-producto-item">
                              <span className="cer-producto-dot">•</span>
                              <span className="cer-producto-nombre">
                                {p.cantidad > 1 ? `x${p.cantidad} ` : ''}
                                {p.referencia_nombre}
                                {p.variacion ? ` — ${p.variacion}` : ''}
                                {(p.categoria_nombre || p.subcategoria_nombre) && (
                                  <span className="cer-producto-cat">
                                    {' '}({[p.categoria_nombre, p.subcategoria_nombre].filter(Boolean).join(' · ')})
                                  </span>
                                )}
                              </span>
                              <span className="cer-producto-costo">
                                {descuentoRatio > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
                                    <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.55rem' }}>{formatCOP(p.costo * p.cantidad)}</span>
                                    <span>{formatCOP((p.costo * p.cantidad) - (p.costo * p.cantidad * descuentoRatio))}</span>
                                  </div>
                                ) : (
                                  formatCOP(p.costo * p.cantidad)
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Otros conceptos (envíos, instalaciones, servicios, etc.) — lista real,
          no texto concatenado */}
      {otrosConceptosList.length > 0 && (
        <div className="cer-section">
          <div className="cer-section-title">
            Otros conceptos ({otrosConceptosList.length})
          </div>
          <table className="cer-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th className="cer-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {otrosConceptosList.map((o, i) => (
                <tr key={i}>
                  <td>{o.descripcion}</td>
                  <td className="cer-right cer-bold">{esResta(o) ? '−' : ''}{formatCOP(o.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {comprobante.descripcion && (
        <div className="cer-notas">
          <div className="cer-meta-label">Notas</div>
          <div className="cer-notas-text">{comprobante.descripcion}</div>
        </div>
      )}

      {/* Total */}
      <div className="cer-total-card">
        {totalFacturas > 0 && Math.abs(diferencia) > 0.01 && (
          <div className="cer-total-breakdown">
            <div className="cer-total-row">
              <span>Subtotal Facturas</span>
              <span>{formatCOP(totalFacturas)}</span>
            </div>
            {descuentoGlobalMonto > 0 && (
              <div className="cer-total-row">
                <span>Descuento comercial ({(descuentoRatio * 100).toFixed(1).replace(/\.0$/, '')}%)</span>
                <span>-{formatCOP(descuentoGlobalMonto)}</span>
              </div>
            )}
            {Math.abs(otrosConceptosMonto) > 0.01 && (
              <div className="cer-total-row">
                <span>Conceptos adicionales</span>
                <span>{otrosConceptosMonto < 0 ? '−' : '+'}{formatCOP(Math.abs(otrosConceptosMonto))}</span>
              </div>
            )}
          </div>
        )}
        <div className="cer-total-final">
          <span className="cer-total-label">Valor Pagado</span>
          <span className="cer-total-value">{formatCOP(comprobante.valor)}</span>
        </div>
      </div>

      {/* Firma */}
      <div className="cer-firma-box">
        <div className="cer-firma-label">Recibí conforme (beneficiario / proveedor)</div>
        <div className="cer-firma-line">
          <div className="cer-firma-sub">Firma, C.C. / NIT y fecha de recepción</div>
          <div className="cer-firma-nombre">Nombre: {comprobante.recibido_por || beneficiario}</div>
        </div>
      </div>

      <div className="cer-semantica-nota">
        * Nota operativa: El comprobante impreso se expide como &ldquo;Pagado&rdquo; conforme a la política comercial del negocio. En pagos con medio de transferencia bancaria, el estado administrativo en base de datos permanece como &ldquo;Por confirmar pago&rdquo; hasta la conciliación y verificación por usuarios autorizados.
      </div>

      <div className="cer-footer">
        LOTTUS · Documento de comprobante de egreso · Doc v1.0 · Impreso el{' '}
        {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
});

export default ComprobanteEgresoReceipt;
