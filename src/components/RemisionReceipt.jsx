import React from 'react';
import { formatCOP } from '../utils/formatCOP';
import {
    ESTADOS_REMISION, fmtFechaLarga, fmtFranja, lineasProductos, metodoPagoLabel, numeroRemision,
    nombreTransportador, totalUnidades,
} from '../utils/remisiones';

/**
 * Plantilla imprimible de la Remisión de Entrega. Recibe la remisión tal cual la
 * devuelve la API (creación o listado), así sirve igual para imprimir al crear que
 * para reimprimir desde el listado.
 *
 * No se muestra directamente en la app: RemisionPrintModal copia su HTML a un
 * iframe junto con RemisionReceipt.css, que es donde vive todo su estilo.
 */
const RemisionReceipt = React.forwardRef(({ remision }, ref) => {
    if (!remision) return null;
    const rem = remision;
    const filas = lineasProductos(rem);
    const unidades = totalUnidades(rem);
    const ventas = rem.ventas?.length ? rem.ventas : (rem.orden_asociada ? [rem.orden_asociada] : []);
    const telefonos = [rem.cliente_telefono1, rem.cliente_telefono2].filter(Boolean).join(' / ');
    const ubicacion = [rem.barrio, rem.ciudad].filter(Boolean).join(' · ');
    const cobrar = !rem.sin_saldo && Number(rem.saldo) > 0;
    const anulada = rem.estado === 'anulada' || rem.estado === 'devuelta';

    return (
        <div ref={ref} className="rr-page">
            {anulada && <div className="rr-watermark">{ESTADOS_REMISION[rem.estado].label}</div>}

            <div className="rr-header">
                <div>
                    <div className="rr-logo"><span>LOTTUS</span></div>
                    <div className="rr-company">
                        Bogotá D.C. · Tel. (601) 761-9348 · www.muebleslottus.com
                    </div>
                </div>
                <div className="rr-doc-title">
                    <div className="rr-doc-kicker">Remisión de entrega</div>
                    <div className="rr-doc-number">No. {numeroRemision(rem.id)}</div>
                    {ventas.length > 0 && (
                        <div className="rr-doc-sub">{ventas.length > 1 ? 'Ventas' : 'Venta'} {ventas.map(v => `#${v}`).join(', ')}</div>
                    )}
                </div>
            </div>

            <div className="rr-meta-grid">
                <div className="rr-meta-box">
                    <div className="rr-label">Entregar a</div>
                    <div className="rr-value rr-value--lg">{rem.cliente_nombre || '—'}</div>
                    {rem.cliente_documento && <div className="rr-sub">C.C. / NIT {rem.cliente_documento}</div>}
                    {telefonos && <div className="rr-sub">Tel. {telefonos}</div>}
                    <div className="rr-address">
                        {rem.direccion_entrega || '—'}
                        {ubicacion && <span>{ubicacion}</span>}
                    </div>
                </div>
                <div className="rr-meta-box">
                    <div className="rr-label">Fecha de entrega</div>
                    <div className="rr-value rr-value--lg">{fmtFechaLarga(rem.fecha_entrega, true) || '—'}</div>
                    {(rem.hora_desde || rem.hora_hasta) && (
                        <div className="rr-sub">Franja: {fmtFranja(rem.hora_desde?.slice(0, 5), rem.hora_hasta?.slice(0, 5))}</div>
                    )}
                    <div className="rr-pairs">
                        <div><span className="rr-label">Transportador</span><span>{nombreTransportador(rem) || '—'}</span></div>
                        <div><span className="rr-label">Asesor</span><span>{rem.vendedor_nombre || '—'}</span></div>
                    </div>
                </div>
            </div>

            {rem.observacion && (
                <div className="rr-indicaciones">
                    <span className="rr-indicaciones-label">Indicaciones:</span> {rem.observacion}
                </div>
            )}

            <div className="rr-section">
                <div className="rr-section-title">
                    Productos a entregar · {unidades} unidad{unidades === 1 ? '' : 'es'}
                </div>
                <table className="rr-table">
                    <thead>
                        <tr>
                            <th className="rr-col-cant">Cant.</th>
                            <th className="rr-col-cat">Categoría</th>
                            <th className="rr-col-sub">Subcategoría</th>
                            <th className="rr-col-ref">Referencia</th>
                            <th>Descripción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filas.length === 0 && (
                            <tr><td colSpan="5" className="rr-empty">Sin productos registrados.</td></tr>
                        )}
                        {filas.map(f => (f.tipo === 'grupo' ? (
                            <tr key={f.key} className="rr-group-row">
                                <td colSpan="5">
                                    Juego: {f.nombre} · {f.piezas} pieza{f.piezas === 1 ? '' : 's'}
                                    {f.observacion && <span className="rr-group-obs"> — {f.observacion}</span>}
                                </td>
                            </tr>
                        ) : (
                            <tr key={f.key}>
                                <td className="rr-col-cant">{f.cantidad}</td>
                                <td className="rr-col-cat">{f.categoria || '—'}</td>
                                <td className="rr-col-sub">{f.subcategoria || '—'}</td>
                                <td className="rr-col-ref">
                                    <div className="rr-prod-name">{f.referencia || '—'}</div>
                                    {f.codigo && <div className="rr-prod-code">{f.codigo}</div>}
                                </td>
                                <td className="rr-col-desc">
                                    {f.descripcion || (f.tela ? '' : '—')}
                                    {f.tela && <div className="rr-tela"><strong>Tapizado:</strong> {f.tela}</div>}
                                </td>
                            </tr>
                        )))}
                    </tbody>
                </table>
            </div>

            <div className="rr-bottom">
                <div className="rr-novedades">
                    <div className="rr-label">Novedades en la entrega</div>
                    {rem.novedades && <div className="rr-novedades-text">{rem.novedades}</div>}
                    {/* Renglones para lo que anote el transportador al entregar. */}
                    <div className="rr-lines">
                        <span /><span />{!rem.novedades && <span />}
                    </div>
                </div>
                <div className={`rr-cobro${cobrar ? '' : ' rr-cobro--none'}`}>
                    <div className="rr-cobro-head">{cobrar ? 'Cobrar contra entrega' : 'Cobro'}</div>
                    <div className="rr-cobro-body">
                        {cobrar ? (
                            <>
                                <span className="rr-cobro-value">{formatCOP(rem.saldo)}</span>
                                <span className="rr-cobro-sub">{metodoPagoLabel(rem.metodo_pago) || 'Método por confirmar'}</span>
                            </>
                        ) : (
                            <span className="rr-cobro-value rr-cobro-value--sm">Sin saldo pendiente</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="rr-firmas">
                <div className="rr-firma rr-firma--recibido">
                    <div className="rr-firma-title">Recibí a satisfacción</div>
                    <div className="rr-firma-line">Nombre y documento</div>
                    <div className="rr-firma-line rr-firma-line--firma">Firma</div>
                    <div className="rr-firma-line">Fecha y hora</div>
                </div>
            </div>

            <p className="rr-legal">
                Al firmar este documento, el receptor confirma haber recibido los productos relacionados en perfectas
                condiciones y a entera satisfacción, de conformidad con las especificaciones acordadas.
            </p>

            <div className="rr-footer">
                LOTTUS · Remisión No. {numeroRemision(rem.id)} · Impreso el{' '}
                {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
        </div>
    );
});

export default RemisionReceipt;
