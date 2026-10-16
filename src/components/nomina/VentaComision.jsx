import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { ventaDeLinea } from '../../services/nominaService';
import { mensajeDeError } from '../../services/errores';
import { ESTADO_VENTA, cop, fecha } from '../../utils/nomina';

/*
 * Detalle de una venta dentro de la comisión: productos con su precio de lista y precio
 * de venta, y pagos recibidos, para validar contra la venta física que todo cuadre.
 */

const TIPO = { transporte: 'Servicio', articulo: 'Artículo', ajuste: 'Ajuste' };
const ESTADO_PAGO = { Confirmado: 'nom-ok', Pendiente: 'nom-falta', Anulado: 'nom-muted' };

function Cuadre({ ok, texto, alerta }) {
    return ok
        ? <span className="nvc-cuadre is-ok"><FaCheckCircle aria-hidden="true" /> {texto}</span>
        : <span className="nvc-cuadre is-alerta"><FaExclamationTriangle aria-hidden="true" /> {alerta}</span>;
}

export default function VentaComision({ lineaId }) {
    const q = useQuery({ queryKey: ['nomina', 'venta-linea', lineaId], queryFn: () => ventaDeLinea(lineaId), staleTime: 30000 });
    if (q.isPending) return <div className="nvc nvc--cargando" role="status">Cargando productos de la venta…</div>;
    if (q.isError) return <div className="nvc" role="alert">{mensajeDeError(q.error)}</div>;
    const { venta: v, productos, totales: t, pagos } = q.data;
    return (
        <div className="nvc">
            <dl className="nvc-datos">
                <div><dt>Cliente</dt><dd>{v.cliente || '—'}</dd></div>
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
                            <th className="num">Lista unitario</th><th className="num">Lista total</th><th className="num">Precio venta</th><th className="num">Desc.</th>
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
                                <td className="num">{Number(p.descuento) ? cop(p.descuento) : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colSpan={4}>Total productos</th>
                            <th className="num">{t.precio_lista ? cop(t.precio_lista) : '—'}</th>
                            <th className="num">{cop(t.precio_venta)}</th>
                            <th />
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

            <div className="nvc-pagos">
                <span className="nvc-pagos__titulo">Pagos</span>
                {pagos.length === 0 ? <span className="nom-muted">Sin recibos de caja.</span> : pagos.map((p, i) => (
                    <span key={`${p.recibo}-${i}`} className="nvc-pago">
                        RC {p.recibo} · {fecha(p.fecha)} · {p.metodo} · <strong>{cop(p.valor)}</strong> · <span className={ESTADO_PAGO[p.estado] || ''}>{p.estado}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}
