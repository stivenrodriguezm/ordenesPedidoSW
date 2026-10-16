import React from 'react';
import PropTypes from 'prop-types';
import { FaFileInvoice } from 'react-icons/fa';
import ProductosVenta from './ProductosVenta';
import { Badge } from './ui';
import './ExpedienteVenta.css';

/**
 * Parte superior de la venta expandida: cotización de origen (si la hay) y los
 * productos de la venta. Rediseño del 2026-10-07: sin línea de tiempo ni alerta
 * de "siguiente acción"; los productos se ven y se editan aquí mismo.
 */
const ExpedienteVenta = ({
    venta,
    onActualizada,
    hasPermission = () => false,
    formatCurrency = (v) => `$${v}`,
    formatShortDate = (d) => d || '—'
}) => {
    if (!venta) return null;
    const canSeePrices = hasPermission('VER_PRECIOS_VENTA');
    const cotizaciones = venta.cotizaciones || [];
    const lineas = venta.lineas || [];

    return (
        <div className="expediente-container">
            {cotizaciones.length > 0 && (
                <div className="expediente-cotizacion-banner" data-testid="expediente-cotizacion-banner">
                    <div className="cotizacion-banner-info">
                        <FaFileInvoice />
                        <span><strong>Cotización de origen:</strong></span>
                        {cotizaciones.map((c) => (
                            <span key={c.id} className="cotizacion-meta">
                                <span className="cotizacion-badge">{c.numero}</span>
                                <span>· {formatShortDate(c.fecha_creacion)}</span>
                                {canSeePrices && <span>· Total: {formatCurrency(c.total)}</span>}
                                <Badge tone="positive">{c.estado || 'convertida'}</Badge>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {canSeePrices ? (
                <ProductosVenta ventaId={venta.id} hasPermission={hasPermission} onActualizada={onActualizada} />
            ) : (
                // Sin permiso de precios el panel no se carga: solo la lista de productos.
                <section className="pv" aria-label="Productos de la venta" data-testid="lineas-venta-card">
                    <div className="pv-head"><h4>Productos <span className="pv-contador">{lineas.length}</span></h4></div>
                    {lineas.length ? (
                        <ul className="pv-simple">
                            {lineas.map(l => (
                                <li key={l.id}>
                                    <span className="pv-fila__cant">{l.cantidad}</span>
                                    <div className="pv-fila__producto"><strong>{l.producto_nombre}{l.variante_nombre ? ` · ${l.variante_nombre}` : ''}</strong></div>
                                    <div className="pv-fila__texto">{l.texto_cliente ? <p>{l.texto_cliente}</p> : <em className="pv-muted">—</em>}</div>
                                </li>
                            ))}
                        </ul>
                    ) : <div className="pv-vacio">Aún no se registran los productos de esta venta.</div>}
                </section>
            )}
        </div>
    );
};

ExpedienteVenta.propTypes = {
    venta: PropTypes.object.isRequired,
    onActualizada: PropTypes.func,
    hasPermission: PropTypes.func,
    formatCurrency: PropTypes.func,
    formatShortDate: PropTypes.func,
};

export default ExpedienteVenta;
