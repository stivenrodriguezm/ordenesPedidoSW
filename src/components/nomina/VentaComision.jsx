import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { ventaDeLinea } from '../../services/nominaService';
import { mensajeDeError } from '../../services/errores';
import { ESTADO_VENTA, cop, fecha } from '../../utils/nomina';

/*
 * Detalle de una venta dentro de la comisión: productos con su precio de lista y precio
 * de venta, y pagos recibidos, para validar contra la venta física que todo cuadre.
 * (2026-10-28) También todo lo pedido (proveedores y telas) y los abonos con su estado.
 */

const TIPO = { transporte: 'Servicio', articulo: 'Artículo', ajuste: 'Ajuste' };
const ESTADO_PAGO = { Confirmado: 'nom-ok', Pendiente: 'nom-falta', Anulado: 'nom-muted' };
const ESTADO_PEDIDO = { pendiente: 'nom-falta', en_proceso: 'nom-falta', finalizado: 'nom-ok', recibido: 'nom-ok', anulado: 'nom-muted',
    Pendiente: 'nom-falta', 'En fabrica': 'nom-falta', 'En Lottus': 'nom-ok', Anulado: 'nom-muted' };
const ubicacion = (v) => [v.direccion, v.barrio, v.ciudad].filter(Boolean).join(' · ');
const suma = (pagos, estado) => pagos.filter(p => p.estado === estado).reduce((n, p) => n + Number(p.valor || 0), 0);

function Pedidos({ pedidos = [], telas = [] }) {
    if (!pedidos.length && !telas.length) return <p className="nom-vacio">No hay pedidos a proveedores ni de telas para esta venta.</p>;
    return (
        <table className="nvc-tabla nvc-tabla--pedidos">
            <thead><tr><th>Pedido</th><th>Proveedor</th><th>Qué se pidió</th><th>Fecha</th><th>Estado</th></tr></thead>
            <tbody>
                {pedidos.map(o => (
                    <tr key={`op-${o.id}`} className={o.estado === 'anulado' ? 'is-anulado' : undefined}>
                        <td><strong>OP {o.id}</strong></td>
                        <td>{o.proveedor}</td>
                        <td>
                            {o.detalles.length ? o.detalles.map((d, i) => (
                                <span key={i} className="nvc-pedido-item">{d.cantidad} × {[d.referencia, d.subcategoria].filter(Boolean).join(' · ') || 'Producto'}
                                    {d.especificaciones && <small className="nom-sub">{d.especificaciones}</small>}</span>
                            )) : '—'}
                            {o.tela && <small className="nom-sub">Tela: {o.tela}</small>}
                        </td>
                        <td>{fecha(o.fecha_creacion)}<small className="nom-sub">Entrega {fecha(o.fecha_esperada)}</small></td>
                        <td><span className={ESTADO_PEDIDO[o.estado] || ''}>{o.estado_nombre || o.estado}</span></td>
                    </tr>
                ))}
                {telas.map(p => (
                    <tr key={`pt-${p.id}`} className={p.estado === 'Anulado' ? 'is-anulado' : undefined}>
                        <td><strong>PT {p.id}</strong><span className="nvc-tipo">Tela</span></td>
                        <td>{p.proveedor}</td>
                        <td>
                            {p.detalles.map((d, i) => <span key={i} className="nvc-pedido-item">{d.tela} · {Number(d.cantidad).toLocaleString('es-CO')} {d.unidad}</span>)}
                            {p.orden && <small className="nom-sub">Para OP {p.orden}</small>}
                        </td>
                        <td>{fecha(p.fecha_creacion)}</td>
                        <td><span className={ESTADO_PEDIDO[p.estado] || ''}>{p.estado}</span></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function Abonos({ pagos }) {
    if (!pagos.length) return <p className="nom-vacio">Sin recibos de caja.</p>;
    const confirmado = suma(pagos, 'Confirmado');
    const pendiente = suma(pagos, 'Pendiente');
    return (
        <table className="nvc-tabla nvc-tabla--abonos">
            <thead><tr><th>Recibo</th><th>Fecha</th><th>Medio</th><th className="num">Valor</th><th>Estado</th></tr></thead>
            <tbody>
                {pagos.map((p, i) => (
                    <tr key={`${p.recibo}-${i}`} className={p.estado === 'Anulado' ? 'is-anulado' : undefined}>
                        <td>RC {p.recibo}</td><td>{fecha(p.fecha)}</td><td>{p.metodo}</td>
                        <td className="num">{cop(p.valor)}</td><td><span className={ESTADO_PAGO[p.estado] || ''}>{p.estado}</span></td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr><th colSpan={3}>Confirmado{pendiente > 0 ? ' · pendiente' : ''}</th>
                    <th className="num">{cop(confirmado)}{pendiente > 0 && <small className="nom-sub nom-falta">+ {cop(pendiente)} pendiente</small>}</th><th /></tr>
            </tfoot>
        </table>
    );
}

function Cuadre({ ok, texto, alerta }) {
    return ok
        ? <span className="nvc-cuadre is-ok"><FaCheckCircle aria-hidden="true" /> {texto}</span>
        : <span className="nvc-cuadre is-alerta"><FaExclamationTriangle aria-hidden="true" /> {alerta}</span>;
}

export default function VentaComision({ lineaId }) {
    const q = useQuery({ queryKey: ['nomina', 'venta-linea', lineaId], queryFn: () => ventaDeLinea(lineaId), staleTime: 30000 });
    if (q.isPending) return <div className="nvc nvc--cargando" role="status">Cargando productos de la venta…</div>;
    if (q.isError) return <div className="nvc" role="alert">{mensajeDeError(q.error)}</div>;
    const { venta: v, productos, totales: t, pagos, pedidos, pedidos_tela: telas } = q.data;
    return (
        <div className="nvc">
            <dl className="nvc-datos">
                <div className="nvc-datos__cliente"><dt>Cliente</dt><dd>{v.cliente || '—'}{ubicacion(v) && <small className="nom-sub">{ubicacion(v)}</small>}</dd></div>
                <div><dt>Asesor</dt><dd>{v.vendedor || '—'}{v.compartida_con.length > 0 && <small> · compartida con {v.compartida_con.join(', ')}</small>}</dd></div>
                <div><dt>Sede</dt><dd>{v.sede || '—'}</dd></div>
                <div><dt>Estado</dt><dd>{ESTADO_VENTA[v.estado] || v.estado}</dd></div>
                <div><dt>Valor venta</dt><dd>{cop(v.valor_total)}</dd></div>
                <div><dt>Precio de lista</dt><dd>{v.valor_lista ? cop(v.valor_lista) : <span className="nom-falta">Sin precio</span>}</dd></div>
                <div><dt>Abono · saldo</dt><dd>{cop(v.abono)} · {cop(v.saldo)}</dd></div>
                <div><dt>Productos</dt><dd>{v.productos_confirmados ? <span className="nom-ok">Confirmados</span> : <span className="nom-falta">Sin confirmar</span>}</dd></div>
            </dl>

            {productos.length === 0 ? (
                <p className="nom-vacio">Esta venta no tiene productos registrados. Agrégalos en Ventas → expandir la venta → Productos.</p>
            ) : (
                <table className="nvc-tabla">
                    <thead>
                        <tr>
                            <th>Producto</th><th className="num">Cant.</th><th>Tela / grupo</th>
                            <th className="num">Lista unitario</th><th className="num">Lista total</th><th className="num">Precio venta</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productos.map(p => (
                            <tr key={p.id}>
                                <td>
                                    <strong>{p.nombre || '—'}</strong>{TIPO[p.tipo] && <span className="nvc-tipo">{TIPO[p.tipo]}</span>}
                                    <small className="nom-sub">{[p.categoria, p.referencia && `Ref. ${p.referencia}`, p.proveedor].filter(Boolean).join(' · ')}</small>
                                </td>
                                <td className="num">{p.cantidad}</td>
                                <td>{p.tela || '—'}{p.grupo_tela && <small className="nom-sub">{p.grupo_tela}</small>}</td>
                                <td className="num">{p.precio_lista_unitario ? cop(p.precio_lista_unitario) : <span className="nom-falta">Sin precio</span>}</td>
                                <td className="num">{p.precio_lista_total ? cop(p.precio_lista_total) : '—'}</td>
                                <td className="num">{cop(p.precio_venta)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colSpan={4}>Total productos</th>
                            <th className="num">{t.precio_lista ? cop(t.precio_lista) : '—'}</th>
                            <th className="num">{cop(t.precio_venta)}</th>
                        </tr>
                    </tfoot>
                </table>
            )}

            {productos.length > 0 && (
                <div className="nvc-cuadres">
                    <Cuadre ok={t.lista_cuadra} texto="Precio de lista cuadra con la venta"
                        alerta={t.productos_sin_precio_lista ? `${t.productos_sin_precio_lista} producto(s) sin precio de lista` : `La lista de los productos no cuadra con la venta (${cop(v.valor_lista)})`} />
                    <Cuadre ok={t.venta_cuadra} texto="Precio de venta cuadra con el total" alerta={`Los productos suman ${cop(t.precio_venta)} y la venta ${cop(v.valor_total)}`} />
                </div>
            )}

            <div className="nvc-bloques">
                <section className="nvc-bloque nvc-bloque--pedidos" aria-label="Todo lo pedido">
                    <h6 className="nvc-bloque__titulo">Todo lo pedido <small>proveedores y telas</small></h6>
                    <Pedidos pedidos={pedidos} telas={telas} />
                </section>
                <section className="nvc-bloque nvc-bloque--abonos" aria-label="Abonos">
                    <h6 className="nvc-bloque__titulo">Abonos <small>{cop(v.abono)} abonado · saldo {cop(v.saldo)}</small></h6>
                    <Abonos pagos={pagos} />
                </section>
            </div>
        </div>
    );
}
