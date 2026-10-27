import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaTruck } from 'react-icons/fa';
import { GiRolledCloth } from 'react-icons/gi';
import API from '../../services/api';
import { Button } from '../ui';
import ImagenOrdenPedido from '../imagenes/ImagenOrdenPedido';
import ImagenPedidoTela from '../imagenes/ImagenPedidoTela';
import { descargarImagen, fechaImagen } from '../../utils/descargarImagen';
import { getTodayStr } from '../../utils/dates';

/*
 * Pedidos desde la venta (2026-10-08), con la misma lógica que /ordenes/nuevo y /telas:
 * - Pedir al proveedor: una orden por proveedor del mueble, cada una con su fecha,
 *   estado de tela (Sin tela / Por pedir / Pedida) y observación. Una imagen por orden.
 * - Pedir telas: cada producto con su proveedor de tela y su dirección de entrega; solo
 *   van juntos en un pedido los que tienen el mismo proveedor, dirección, material y
 *   orden de pedido. Una imagen por pedido de tela.
 */

const ESTADOS_TELA = ['Sin tela', 'Por pedir', 'Pedida'];
const OTRA = '__otra__';

const estadoTela = (lineas) => {
    const aparte = lineas.filter(l => l.tela_modo === 'aparte');
    if (!aparte.length) return 'Sin tela';
    return aparte.every(l => l.tela_pedidos?.length) ? 'Pedida' : 'Por pedir';
};

export function PedirProveedor({ datos, pendientes, ocupado, ejecutar, postSeguro, cancelar, alCrear }) {
    const hoy = getTodayStr();
    const [grupos, setGrupos] = useState(() => {
        const g = {};
        pendientes.filter(l => l.proveedor).forEach(l => {
            g[l.proveedor] = g[l.proveedor] || { proveedor: l.proveedor, nombre: l.proveedor_nombre, observacion: '',
                fecha: datos.fecha_entrega && datos.fecha_entrega >= hoy ? datos.fecha_entrega : '', productos: [] };
            g[l.proveedor].productos.push({ ...l, pedir: l.por_pedir, texto: l.sin_texto_proveedor ? '' : (l.texto_proveedor || '') });
        });
        return Object.values(g).map(x => ({ ...x, tela: estadoTela(x.productos) }));
    });
    const sinReferencia = pendientes.filter(l => !l.proveedor);
    const cambiarGrupo = (i, patch) => setGrupos(gs => gs.map((g, j) => (i === j ? { ...g, ...patch } : g)));
    const cambiarProducto = (i, k, patch) => setGrupos(gs => gs.map((g, j) => (i === j ? { ...g, productos: g.productos.map((p, m) => (m === k ? { ...p, ...patch } : p)) } : g)));
    const activos = grupos.filter(g => g.productos.some(p => Number(p.pedir) > 0));
    const falta = activos.find(g => !g.fecha || g.fecha < hoy);

    const crear = () => ejecutar('pedir', async () => {
        const r = await postSeguro(`/ventas/${datos.venta}/productos/pedidos/`, {
            revision: datos.revision, fecha_esperada: activos[0].fecha,
            lineas: activos.flatMap(g => g.productos.filter(p => Number(p.pedir) > 0).map(p => ({ linea: p.id, cantidad: Number(p.pedir), texto_proveedor: p.texto }))),
            ordenes: activos.map(g => ({ proveedor: g.proveedor, fecha_esperada: g.fecha, observacion: g.observacion, tela: g.tela })),
        });
        const imagenes = r.data.detalle.map(o => {
            const g = activos.find(x => x.proveedor === o.proveedor);
            return { tipo: 'op', archivo: `pedido_${o.id}.png`, numero: o.id, proveedor: g.nombre, vendedor: datos.vendedor_nombre,
                ordenCompra: datos.es_feria_hogar ? `${datos.venta} (Feria del hogar)` : datos.venta, fechaPedido: fechaImagen(hoy), fechaEntrega: fechaImagen(g.fecha),
                productos: g.productos.filter(p => Number(p.pedir) > 0).map(p => ({ cantidad: p.pedir, referencia: p.referencia_nombre, subcategoria: p.variante_nombre || '', descripcion: p.texto || '-' })),
                nota: g.observacion };
        });
        await alCrear(`Pedido${r.data.ordenes.length > 1 ? 's' : ''} creado${r.data.ordenes.length > 1 ? 's' : ''}: OP ${r.data.ordenes.join(', ')}.`, imagenes);
    });

    return (
        <div className="pv-bloque">
            <h5><FaTruck aria-hidden="true" /> Pedir al proveedor</h5>
            <p className="pv-muted">Una orden por proveedor, como en Crear pedido. Al crearlas se descarga una imagen por orden para enviarla.</p>
            {sinReferencia.length > 0 && (
                <p className="pv-aviso">Sin referencia de compra (edita el producto para pedirlo): {sinReferencia.map(l => l.producto_nombre).join(', ')}.</p>
            )}
            {grupos.map((g, i) => (
                <section className="pv-orden" key={g.proveedor} aria-label={`Orden para ${g.nombre}`}>
                    <header className="pv-orden__cabeza">
                        <strong>{g.nombre}</strong>
                        <label className="pv-campo pv-campo--fecha"><span>Fecha esperada</span>
                            <input type="date" min={hoy} value={g.fecha} aria-label={`Fecha esperada ${g.nombre}`} onChange={e => cambiarGrupo(i, { fecha: e.target.value })} /></label>
                        <label className="pv-campo pv-campo--tela"><span>Tela</span>
                            <select value={g.tela} aria-label={`Estado de tela ${g.nombre}`} onChange={e => cambiarGrupo(i, { tela: e.target.value })}>
                                {ESTADOS_TELA.map(t => <option key={t} value={t}>{t}</option>)}
                            </select></label>
                    </header>
                    {g.productos.map((p, k) => (
                        <div className="pv-orden__producto" key={p.id}>
                            <label className="pv-campo pv-campo--cant"><span>Cant.</span>
                                <input type="number" min="0" max={p.por_pedir} value={p.pedir} aria-label={`Cantidad ${p.producto_nombre}`}
                                    onChange={e => cambiarProducto(i, k, { pedir: e.target.value })} /></label>
                            <div className="pv-orden__ref"><span>{p.referencia_nombre}</span><small>{p.producto_nombre}</small></div>
                            <label className="pv-campo"><span>Descripción para el proveedor</span>
                                <textarea rows={2} value={p.texto} placeholder={p.sin_texto_proveedor ? 'No aplica' : ''} aria-label={`Descripción ${p.producto_nombre}`}
                                    onChange={e => cambiarProducto(i, k, { texto: e.target.value })} /></label>
                        </div>
                    ))}
                    <label className="pv-campo"><span>Observación de esta orden</span>
                        <textarea rows={2} value={g.observacion} aria-label={`Observación ${g.nombre}`} placeholder="Detalles de entrega, instrucciones…"
                            onChange={e => cambiarGrupo(i, { observacion: e.target.value })} /></label>
                </section>
            ))}
            {falta && <p className="pv-aviso">Indica la fecha esperada de la orden para {falta.nombre}.</p>}
            <div className="pv-pie__acciones">
                <Button size="sm" variant="secondary" onClick={cancelar} disabled={!!ocupado}>Cancelar</Button>
                <Button size="sm" onClick={crear} loading={ocupado === 'pedir'} disabled={!activos.length || !!falta}>
                    Crear {activos.length > 1 ? `${activos.length} órdenes` : 'orden'}
                </Button>
            </div>
        </div>
    );
}

export function PedirTelas({ datos, lineas, usuario, ocupado, ejecutar, cancelar, alCrear }) {
    const [catalogo, setCatalogo] = useState({ proveedores: [], direcciones: [] });
    const [filas, setFilas] = useState(() => lineas.map(l => ({
        id: l.id, producto: `${l.cantidad} × ${l.producto_nombre}`, pedir: true,
        material: l.tela_material === 'cuero' ? 'Cuero' : 'Tela', referencia: l.tela_referencia || '', color: l.tela_color || '',
        cantidad: l.tela_cantidad ? String(Number(l.tela_cantidad)) : '', proveedor: l.tela_proveedor || '',
        direccion: l.tela_direccion_sugerida || '', otra: false, orden: l.tela_orden || null,
    })));
    const [observaciones, setObservaciones] = useState({});
    useEffect(() => {
        let vivo = true;
        Promise.all([API.get('/proveedores-telas/', { params: { page_size: 100 } }), API.get('/direcciones-entrega/', { params: { page_size: 100 } })])
            .then(([p, d]) => { if (vivo) setCatalogo({ proveedores: p.data.results || p.data || [], direcciones: d.data.results || d.data || [] }); })
            .catch(() => {});
        return () => { vivo = false; };
    }, []);
    const direcciones = catalogo.direcciones.map(d => `${d.nombre} - ${d.detalles}`);
    const nombreProveedor = (id) => catalogo.proveedores.find(p => p.id === Number(id))?.nombre_empresa || '';
    // Elegir proveedor o dirección en una fila llena las demás que aún no lo tienen.
    const cambiar = (i, patch) => setFilas(fs => fs.map((f, j) => {
        if (i === j) return { ...f, ...patch };
        const relleno = {};
        if (patch.proveedor && !f.proveedor) relleno.proveedor = patch.proveedor;
        if (patch.direccion && !f.direccion && !patch.otra) relleno.direccion = patch.direccion;
        return { ...f, ...relleno };
    }));
    const elegidas = filas.filter(f => f.pedir);
    const incompleta = elegidas.find(f => !f.referencia.trim() || !(Number(f.cantidad) > 0) || !f.proveedor || !f.direccion.trim());
    // Solo van juntos: mismo proveedor de tela, misma dirección, mismo material y misma orden.
    const grupos = Object.values(elegidas.reduce((g, f) => {
        const clave = [f.proveedor, f.direccion.trim(), f.material, f.orden || ''].join('|');
        g[clave] = g[clave] || { clave, proveedor: Number(f.proveedor), direccion: f.direccion.trim(), material: f.material, orden: f.orden, filas: [] };
        g[clave].filas.push(f);
        return g;
    }, {}));

    const crear = () => ejecutar('telas', async () => {
        const creados = [];
        const imagenes = [];
        try {
            for (const g of grupos) {
                const observacion = (observaciones[g.clave] || '').trim();
                const r = await API.post('/pedidos-telas/', {
                    proveedor: g.proveedor, direccion_entrega: g.direccion, estado: 'Pendiente', orden_asociada_id: g.orden || null,
                    venta: Number(datos.venta), observacion: observacion || null,
                    detalles: g.filas.map(f => ({
                        tela: `${g.material === 'Cuero' ? '[CUERO] ' : ''}${f.referencia.trim()}${f.color.trim() ? ` - Color: ${f.color.trim()}` : ''}`,
                        cantidad: Number(String(f.cantidad).replace(',', '.')), linea_venta: f.id,
                    })),
                });
                creados.push(r.data.id);
                imagenes.push({ tipo: 'tela', archivo: `pedido_material_${r.data.id}.png`, numero: r.data.id, proveedor: nombreProveedor(g.proveedor),
                    solicitante: usuario ? `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim() : '', material: g.material,
                    fecha: fechaImagen(getTodayStr(), { conCero: false }), orden: g.orden, venta: datos.venta, direccion: g.direccion, observacion,
                    detalles: g.filas.map(f => ({ referencia: f.referencia.trim(), color: f.color.trim() || 'Standard', cantidad: Number(f.cantidad), unidad: g.material === 'Cuero' ? 'dm' : 'mts' })) });
            }
        } finally {
            if (creados.length) await alCrear(`Pedido${creados.length > 1 ? 's' : ''} de tela creado${creados.length > 1 ? 's' : ''}: PT ${creados.join(', ')}.`, imagenes);
        }
    });

    return (
        <div className="pv-bloque">
            <h5><GiRolledCloth aria-hidden="true" /> Pedir telas</h5>
            <p className="pv-muted">Como en /telas. Solo van en el mismo pedido los productos con el mismo proveedor de tela, la misma dirección y el mismo material. Se descarga una imagen por pedido.</p>
            <div className="pv-telas">
                {filas.map((f, i) => (
                    <div className={`pv-telas__fila${f.pedir ? '' : ' is-omitida'}`} key={f.id}>
                        <label className="pv-telas__producto"><input type="checkbox" checked={f.pedir} onChange={e => cambiar(i, { pedir: e.target.checked })} />
                            <span><strong>{f.producto}</strong><small>{f.material === 'Cuero' ? 'Cuero (dm)' : 'Tela (m)'}{f.orden ? ` · OP ${f.orden}` : ''}</small></span></label>
                        <label className="pv-campo"><span>Referencia</span><input value={f.referencia} aria-label={`Referencia ${f.producto}`} onChange={e => cambiar(i, { referencia: e.target.value })} /></label>
                        <label className="pv-campo"><span>Color</span><input value={f.color} aria-label={`Color ${f.producto}`} onChange={e => cambiar(i, { color: e.target.value })} /></label>
                        <label className="pv-campo"><span>Cant. ({f.material === 'Cuero' ? 'dm' : 'm'})</span><input type="number" min="0" step="0.1" value={f.cantidad} aria-label={`Cantidad ${f.producto}`} onChange={e => cambiar(i, { cantidad: e.target.value })} /></label>
                        <label className="pv-campo"><span>Proveedor de tela</span>
                            <select value={f.proveedor} aria-label={`Proveedor de tela ${f.producto}`} onChange={e => cambiar(i, { proveedor: Number(e.target.value) || '' })}>
                                <option value="">Elige…</option>
                                {catalogo.proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre_empresa}</option>)}
                            </select></label>
                        <label className="pv-campo"><span>Entregar en</span>
                            {f.otra ? (
                                <input value={f.direccion} aria-label={`Dirección ${f.producto}`} placeholder="Escribe la dirección" onChange={e => cambiar(i, { direccion: e.target.value, otra: true })} />
                            ) : (
                                <select value={direcciones.includes(f.direccion) || !f.direccion ? f.direccion : OTRA} aria-label={`Dirección ${f.producto}`}
                                    onChange={e => (e.target.value === OTRA ? cambiar(i, { otra: true, direccion: '' }) : cambiar(i, { direccion: e.target.value }))}>
                                    <option value="">Elige…</option>
                                    {f.direccion && !direcciones.includes(f.direccion) && <option value={OTRA}>{f.direccion}</option>}
                                    {direcciones.map(d => <option key={d} value={d}>{d}</option>)}
                                    <option value={OTRA}>Otra dirección…</option>
                                </select>
                            )}</label>
                    </div>
                ))}
            </div>
            {grupos.length > 0 && (
                <div className="pv-telas__grupos">
                    <strong>Se {grupos.length === 1 ? 'creará 1 pedido' : `crearán ${grupos.length} pedidos`} de tela:</strong>
                    {grupos.map(g => (
                        <div className="pv-telas__grupo" key={g.clave}>
                            <span>{nombreProveedor(g.proveedor) || 'Proveedor'} · {g.material} → {g.direccion || 'sin dirección'}{g.orden ? ` · OP ${g.orden}` : ''} · {g.filas.length} producto{g.filas.length === 1 ? '' : 's'}</span>
                            <textarea rows={1} placeholder="Observación de este pedido (opcional)" aria-label={`Observación pedido ${nombreProveedor(g.proveedor)} ${g.direccion}`}
                                value={observaciones[g.clave] || ''} onChange={e => setObservaciones(o => ({ ...o, [g.clave]: e.target.value }))} />
                        </div>
                    ))}
                </div>
            )}
            {incompleta && <p className="pv-aviso">Completa referencia, cantidad, proveedor y dirección de {incompleta.producto} (o desmárcalo).</p>}
            <div className="pv-pie__acciones">
                <Button size="sm" variant="secondary" onClick={cancelar} disabled={!!ocupado}>Cancelar</Button>
                <Button size="sm" onClick={crear} loading={ocupado === 'telas'} disabled={!grupos.length || !!incompleta}>
                    Crear {grupos.length > 1 ? `${grupos.length} pedidos` : 'pedido'} de tela
                </Button>
            </div>
        </div>
    );
}

// Dibuja fuera de pantalla las imágenes de los pedidos creados y las descarga una a una.
// Va en un portal al <body>: dentro de la tabla de Ventas heredaba sus estilos de th/td
// (fondo gris, mayúsculas, filas bajas) y la imagen salía distinta a la de /ordenes y /telas.
export function GeneradorImagenes({ imagenes, alTerminar }) {
    const nodos = useRef([]);
    useEffect(() => {
        let vivo = true;
        (async () => {
            let hechas = 0;
            for (let i = 0; i < imagenes.length; i += 1) {
                try {
                    await descargarImagen(nodos.current[i], imagenes[i].archivo);
                    hechas += 1;
                    await new Promise(r => setTimeout(r, 400));
                } catch (e) {
                    console.error('No se pudo generar la imagen', imagenes[i].archivo, e);
                }
            }
            if (vivo) alTerminar(hechas, imagenes.length);
        })();
        return () => { vivo = false; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return createPortal(
        <div className="img-offscreen" aria-hidden="true">
            {imagenes.map((img, i) => (img.tipo === 'op'
                ? <ImagenOrdenPedido key={img.archivo} ref={el => { nodos.current[i] = el; }} {...img} />
                : <ImagenPedidoTela key={img.archivo} ref={el => { nodos.current[i] = el; }} {...img} />))}
        </div>,
        document.body,
    );
}
