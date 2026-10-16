import React, { useState } from 'react';
import { FaChevronDown, FaChevronRight, FaLock, FaPrint } from 'react-icons/fa';
import { Badge, Button } from '../ui';
import CampoEditable from './CampoEditable';
import NominaImpresionModal from './NominaImpresionModal';
import VentaComision from './VentaComision';
import { ESTADO_VENTA, cop, fecha, pct } from '../../utils/nomina';

function Resumen({ asesor, cierre }) {
    const t = asesor.totales;
    const pendiente = Number(t.comisiones_pendientes) + Number(t.bonificaciones_pendientes);
    return (
        <div className="nom-resumen">
            <div className="nom-resumen__item nom-resumen__item--total"><span>Total nómina</span><strong>{cop(t.total_nomina)}</strong><small>Pago {cierre.pago_nomina}</small></div>
            <div className="nom-resumen__item"><span>Comisiones</span><strong>{cop(t.comisiones)}</strong></div>
            <div className="nom-resumen__item"><span>Bonificaciones</span><strong>{cop(t.bonificaciones)}</strong></div>
            <div className="nom-resumen__item"><span>Ajustes</span><strong className={Number(t.ajustes) < 0 ? 'nom-neg' : ''}>{cop(t.ajustes)}</strong></div>
            <div className="nom-resumen__item"><span>Básico</span><strong>{cop(t.salario_basico)}</strong><small>Pago el día {cierre.dia_pago_basico}</small></div>
            <div className="nom-resumen__item"><span>Queda pendiente</span><strong className="nom-muted">{cop(pendiente)}</strong><small>Pasa al próximo cierre</small></div>
        </div>
    );
}

function Pagar({ linea, editable, guardar }) {
    if (!editable) return linea.pagar ? <span className="nom-ok">Sí</span> : <span className="nom-muted">No</span>;
    return (
        <input type="checkbox" checked={linea.pagar} aria-label={`Pagar venta ${linea.venta || linea.cliente}`}
            onChange={e => guardar(linea.id, { pagar: e.target.checked })} />
    );
}

function Comisiones({ lineas, editable, guardar }) {
    const [abiertas, setAbiertas] = useState(() => new Set());
    if (!lineas.length) return <p className="nom-vacio">Sin comisiones en este cierre.</p>;
    const alternar = (id) => setAbiertas(prev => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
    });
    return (
        <div className="nom-tabla-wrap">
            <table className="nom-tabla">
                <thead>
                    <tr>
                        <th>Venta</th><th>Fecha</th>
                        <th className="num">Precio lista</th><th className="num">Precio venta</th><th className="num">% Desc.</th>
                        <th className="num">% Comisión</th><th className="num">Comisión</th>
                        <th>Estado</th><th className="num">Abono</th><th>Se paga</th><th>Nota</th>
                    </tr>
                </thead>
                <tbody>
                    {lineas.map(l => {
                        const abierta = abiertas.has(l.id);
                        return (
                            <React.Fragment key={l.id}>
                                <tr className={`${l.pagar ? '' : 'nom-fila-pendiente'}${abierta ? ' is-abierta' : ''}`}>
                                    <td>
                                        <button type="button" className="nom-expandir" onClick={() => alternar(l.id)} aria-expanded={abierta}
                                            aria-label={`${abierta ? 'Ocultar' : 'Ver'} productos de la venta ${l.venta}`}>
                                            {abierta ? <FaChevronDown aria-hidden="true" /> : <FaChevronRight aria-hidden="true" />} #{l.venta}
                                        </button>
                                        {l.participantes > 1 && <small className="nom-sub">Compartida ÷{l.participantes}</small>}
                                        {l.cliente && <small className="nom-sub">{l.cliente}</small>}
                                    </td>
                                    <td>{fecha(l.fecha_venta)}</td>
                                    <td className="num">
                                        <CampoEditable valor={l.precio_lista} formato={v => (v ? cop(v) : <span className="nom-falta">Sin precio de lista</span>)}
                                            editable={editable && !l.revision_productos} etiqueta={`Precio de lista venta ${l.venta}`} ancho="8.5rem"
                                            onGuardar={v => guardar(l.id, { precio_lista: v })} />
                                        <small className="nom-sub">{l.origen_precio === 'productos' ? `Productos confirmados · revisión ${l.revision_productos}` : l.origen_precio === 'sin_confirmar' ? 'Confirmar productos en Ventas' : l.origen_precio === 'manual_historico' ? 'Precio manual histórico' : l.origen_precio === 'ajuste_manual' ? 'Ajuste manual' : ''}</small>
                                    </td>
                                    <td className="num">{cop(l.valor_venta)}{l.participantes > 1 && <small className="nom-sub">Base {cop(l.base)}</small>}</td>
                                    <td className="num">{pct(l.descuento_pct)}</td>
                                    <td className="num">
                                        <CampoEditable valor={l.porcentaje} formato={pct} editable={editable} etiqueta={`% comisión venta ${l.venta}`} ancho="4.5rem"
                                            onGuardar={v => guardar(l.id, { porcentaje: v })} />
                                    </td>
                                    <td className="num">
                                        <CampoEditable valor={l.valor} formato={cop} editable={editable} etiqueta={`Comisión venta ${l.venta}`}
                                            onGuardar={v => guardar(l.id, { valor: v })} />
                                    </td>
                                    <td>{ESTADO_VENTA[l.estado_venta] || l.estado_venta}</td>
                                    <td className="num">{pct(l.abono_pct)}</td>
                                    <td className="nom-col-pago"><Pagar linea={l} editable={editable} guardar={guardar} />{!l.pagar && l.motivo_pendiente && <small className="nom-sub">{l.motivo_pendiente}</small>}</td>
                                    <td>
                                        <CampoEditable valor={l.nota} formato={v => v || ''} editable={editable} tipo="text" etiqueta={`Nota venta ${l.venta}`} ancho="9rem"
                                            onGuardar={v => guardar(l.id, { nota: v || '' })} />
                                    </td>
                                </tr>
                                {abierta && (
                                    <tr className="nom-fila-detalle">
                                        <td colSpan={11}><VentaComision lineaId={l.id} /></td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function Bonificaciones({ lineas, editable, guardar }) {
    if (!lineas.length) return <p className="nom-vacio">Sin bonificaciones: el asesor no cumplió la meta en este período ni tiene bonificaciones pendientes de cierres anteriores.</p>;
    return (
        <div className="nom-tabla-wrap">
            <table className="nom-tabla">
                <thead>
                    <tr><th>Venta</th><th>Cliente</th><th>Estado</th><th>Ganada en</th><th className="num">Base</th><th className="num">%</th><th className="num">Bonificación</th><th>Pagar</th></tr>
                </thead>
                <tbody>
                    {lineas.map(l => (
                        <tr key={l.id} className={l.pagar ? '' : 'nom-fila-pendiente'}>
                            <td>#{l.venta}</td>
                            <td>{l.cliente}</td>
                            <td>{ESTADO_VENTA[l.estado_venta] || l.estado_venta}</td>
                            <td>{l.causada_en?.nombre}</td>
                            <td className="num">{cop(l.base)}</td>
                            <td className="num">{pct(l.porcentaje)}</td>
                            <td className="num">
                                <CampoEditable valor={l.valor} formato={cop} editable={editable} etiqueta={`Bonificación venta ${l.venta}`}
                                    onGuardar={v => guardar(l.id, { valor: v })} />
                            </td>
                            <td><Pagar linea={l} editable={editable} guardar={guardar} />{!l.pagar && l.motivo_pendiente && <small className="nom-sub">{l.motivo_pendiente}</small>}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Ajustes({ lineas, editable, agregar, borrar }) {
    const [descripcion, setDescripcion] = useState('');
    const [valor, setValor] = useState('');
    const enviar = (signo) => {
        const n = Math.abs(Number(String(valor).replace(/[^\d.]/g, '')));
        if (!descripcion.trim() || !n) return;
        agregar({ descripcion: descripcion.trim(), valor: signo * n });
        setDescripcion('');
        setValor('');
    };
    return (
        <>
            {lineas.length > 0 ? (
                <ul className="nom-ajustes">
                    {lineas.map(l => (
                        <li key={l.id}>
                            <span>{l.cliente}</span>
                            <strong className={Number(l.valor) < 0 ? 'nom-neg' : 'nom-ok'}>{Number(l.valor) > 0 ? '+' : ''}{cop(l.valor)}</strong>
                            {editable && <Button variant="ghost" size="sm" onClick={() => borrar(l.id)} aria-label={`Quitar ajuste ${l.cliente}`}>Quitar</Button>}
                        </li>
                    ))}
                </ul>
            ) : <p className="nom-vacio">Sin ajustes.</p>}
            {editable && (
                <div className="nom-ajuste-form">
                    <input className="nom-input" aria-label="Descripción del ajuste" placeholder="Adelanto del 15, cuenta por cuadrar…"
                        value={descripcion} onChange={e => setDescripcion(e.target.value)} />
                    <input className="nom-input" aria-label="Valor del ajuste" inputMode="numeric" placeholder="Valor"
                        value={valor} onChange={e => setValor(e.target.value)} style={{ width: '9rem' }} />
                    <Button variant="secondary" size="sm" onClick={() => enviar(1)}>Sumar</Button>
                    <Button variant="secondary" size="sm" onClick={() => enviar(-1)}>Restar</Button>
                </div>
            )}
        </>
    );
}

// Detalle de un asesor dentro del cierre (D12a): todo editable en borrador.
export default function DetalleAsesor({ cierre, asesor, editable, operar, puede = false, ocupado = false }) {
    const por = (tipo) => asesor.lineas.filter(l => l.tipo === tipo);
    const guardarLinea = (id, datos) => operar('linea', id, datos);
    const meta = asesor.cumple_meta_manual === null ? 'auto' : asesor.cumple_meta_manual ? 'si' : 'no';
    const [imprimir, setImprimir] = useState(false);
    return (
        <div className="nom-detalle">
            <div className="nom-detalle__barra">
                <div className="nom-detalle__estado">
                    {asesor.estado === 'cerrado'
                        ? <><Badge tone="success">Cerrada</Badge><span className="nom-muted">por {asesor.cerrado_por || '—'}{asesor.cerrado_en ? ` el ${fecha(asesor.cerrado_en)}` : ''} · ya no se edita</span></>
                        : <><Badge tone="warning">Abierta</Badge><span className="nom-muted">Revisa y ciérrala cuando la pagues</span></>}
                </div>
                <Button variant="secondary" icon={FaPrint} onClick={() => setImprimir(true)}>Imprimir nómina de {asesor.nombre}</Button>
                {puede && (asesor.estado === 'cerrado' ? (
                    <Button variant="secondary" disabled={ocupado}
                        onClick={() => { if (window.confirm(`¿Reabrir la nómina de ${asesor.nombre} para editarla?`)) operar('reabrirAsesor', asesor.id); }}>
                        Reabrir
                    </Button>
                ) : (
                    <Button icon={FaLock} disabled={ocupado}
                        onClick={() => { if (window.confirm(`¿Cerrar la nómina de ${asesor.nombre}? Queda como pagada y no se podrá editar; lo pagado no volverá a aparecer en el próximo cierre.`)) operar('cerrarAsesor', asesor.id); }}>
                        Cerrar nómina de {asesor.nombre}
                    </Button>
                ))}
            </div>
            {imprimir && <NominaImpresionModal cierre={cierre} asesor={asesor} onClose={() => setImprimir(false)} />}
            <Resumen asesor={asesor} cierre={cierre} />
            <div className="nom-parametros">
                <label>Básico
                    <CampoEditable valor={asesor.salario_basico} formato={cop} editable={editable} etiqueta="Salario básico" ancho="9rem"
                        onGuardar={v => operar('asesor', asesor.id, { salario_basico: v || 0 })} />
                </label>
                <label>Meta del período
                    <CampoEditable valor={asesor.meta} formato={v => (Number(v) ? cop(v) : 'Sin meta')} editable={editable} etiqueta="Meta" ancho="9rem"
                        onGuardar={v => operar('asesor', asesor.id, { meta: v || 0 })} />
                </label>
                <label>Ventas del período <strong>{cop(asesor.ventas_periodo)}</strong></label>
                <label>¿Cumple la meta?
                    {editable ? (
                        <select className="nom-input" value={meta} aria-label="Cumple la meta"
                            onChange={e => operar('asesor', asesor.id, { cumple_meta_manual: { auto: null, si: true, no: false }[e.target.value] })}>
                            <option value="auto">Automático ({asesor.cumple_meta ? 'sí' : 'no'})</option>
                            <option value="si">Sí</option>
                            <option value="no">No</option>
                        </select>
                    ) : <strong>{asesor.cumple_meta ? 'Sí' : 'No'}</strong>}
                </label>
            </div>
            <section className="nom-seccion">
                <h3>Comisiones <small>{pct(cierre.abono_minimo_pct)} de abono mínimo para pagar; las demás pasan al próximo cierre</small></h3>
                <Comisiones lineas={por('comision')} editable={editable} guardar={guardarLinea} />
            </section>
            <section className="nom-seccion">
                <h3>Bonificaciones <small>{pct(cierre.bonificacion_pct)} si cumple la meta; se pagan desde el cierre siguiente, al entregar cada venta</small></h3>
                <Bonificaciones lineas={por('bonificacion')} editable={editable} guardar={guardarLinea} />
            </section>
            <section className="nom-seccion">
                <h3>Ajustes <small>Adelantos, descuentos o cuentas por cuadrar</small></h3>
                <Ajustes lineas={por('ajuste')} editable={editable}
                    agregar={(datos) => operar('ajuste', asesor.id, datos)} borrar={(id) => operar('borrar', id)} />
            </section>
        </div>
    );
}
