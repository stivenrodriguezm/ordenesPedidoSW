import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FaBoxOpen, FaCheck, FaPlus } from 'react-icons/fa';
import API from '../../services/api';
import { formatCOP } from '../../utils/formatCOP';
import './PedidosPorFacturar.css';

/*
 * Factura de proveedor (2026-10-15): lo que se le pidió a este proveedor y aún no llega,
 * para agregarlo de una vez. Cada producto trae referencia, cantidad pendiente, venta,
 * pedido, detalle, telas y un costo sugerido desde la lista de precios (lista ÷
 * multiplicador), que se revisa contra lo que cobra el proveedor.
 */
export default function PedidosPorFacturar({ proveedorId, agregados, onAgregar }) {
    const [elegidos, setElegidos] = useState(() => new Set());
    const q = useQuery({
        queryKey: ['por-facturar', proveedorId],
        enabled: !!proveedorId,
        queryFn: () => API.get(`/productos-venta/proveedores/${proveedorId}/por-facturar/`).then(r => r.data.productos || []),
    });
    const disponibles = useMemo(() => (q.data || []).filter(p => !agregados.has(String(p.detalle_pedido))), [q.data, agregados]);
    if (!proveedorId || q.isPending) return null;
    if (q.isError) return <p className="pf-pedidos__vacio" role="alert">No se pudieron cargar los pedidos de este proveedor. <button type="button" onClick={() => q.refetch()}>Reintentar</button></p>;
    if (!q.data.length) return null;

    const alternar = (id) => setElegidos(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const todos = disponibles.length > 0 && disponibles.every(p => elegidos.has(p.detalle_pedido));
    const agregar = () => {
        onAgregar(disponibles.filter(p => elegidos.has(p.detalle_pedido)));
        setElegidos(new Set());
    };
    const marcados = disponibles.filter(p => elegidos.has(p.detalle_pedido)).length;

    return (
        <section className="pf-pedidos" aria-label="Pedidos pendientes de este proveedor">
            <header className="pf-pedidos__cabeza">
                <span className="pf-pedidos__icono"><FaBoxOpen aria-hidden="true" /></span>
                <div>
                    <strong>Pedidos de este proveedor que aún no llegan</strong>
                    <small>Elige lo que viene en esta factura: se agrega con su referencia, cantidad, venta, pedido, telas y un costo sugerido desde la lista de precios.</small>
                </div>
                {disponibles.length > 0 && (
                    <label className="pf-pedidos__todos">
                        <input type="checkbox" checked={todos} onChange={() => setElegidos(todos ? new Set() : new Set(disponibles.map(p => p.detalle_pedido)))} /> Todos
                    </label>
                )}
            </header>
            {disponibles.length === 0 ? <p className="pf-pedidos__vacio"><FaCheck aria-hidden="true" /> Ya agregaste todo lo pendiente de este proveedor.</p> : (
                <ul className="pf-pedidos__lista">
                    {disponibles.map(p => (
                        <li key={p.detalle_pedido}>
                            <label className={elegidos.has(p.detalle_pedido) ? 'is-elegido' : ''}>
                                <input type="checkbox" checked={elegidos.has(p.detalle_pedido)} onChange={() => alternar(p.detalle_pedido)} />
                                <span className="pf-pedidos__cant">{p.cantidad}×</span>
                                <span className="pf-pedidos__texto">
                                    <strong>{p.producto || p.referencia_nombre}</strong>
                                    <small>
                                        Ref. {p.referencia_nombre || '—'} · OP {p.pedido}{p.venta ? ` · Venta ${p.venta}` : ' · Exhibición'}
                                        {p.conjunto ? ` · ${p.conjunto}` : ''}{p.telas?.length ? ` · ${p.telas[0].tipo === 'cuero' ? 'Cuero' : 'Tela'} ${p.telas[0].referencia}` : ''}
                                        {p.recibidas ? ` · ya llegaron ${p.recibidas} de ${p.pedidas}` : ''}
                                    </small>
                                </span>
                                <span className="pf-pedidos__costo" title={p.costo_sugerido ? `Lista ${formatCOP(Number(p.costo_sugerido.lista))} ÷ ${p.costo_sugerido.multiplicador}` : 'Sin precio de lista para sugerir'}>
                                    {p.costo_sugerido ? <>{formatCOP(Number(p.costo_sugerido.valor))}<small>sugerido c/u</small></> : <small>Sin costo sugerido</small>}
                                </span>
                            </label>
                        </li>
                    ))}
                </ul>
            )}
            {disponibles.length > 0 && (
                <footer className="pf-pedidos__pie">
                    <button type="button" className="pf-pedidos__agregar" disabled={!marcados} onClick={agregar}>
                        <FaPlus aria-hidden="true" /> Agregar {marcados || ''} {marcados === 1 ? 'producto' : 'productos'} a la factura
                    </button>
                </footer>
            )}
        </section>
    );
}
