import React, { useContext, useEffect, useRef, useState } from 'react';
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FaBoxOpen, FaCheckCircle, FaChevronDown, FaEdit, FaLayerGroup, FaPlus, FaSearch, FaTimes, FaTruck } from 'react-icons/fa';
import API from '../services/api';
import { buscarProductosVenta } from '../services/productosVentaService';
import useDebounce from '../hooks/useDebounce';
import { Button } from './ui';
import { formatCOP } from '../utils/formatCOP';
import { AppContext } from '../AppContext';
import { GeneradorImagenes, PedirProveedor, PedirTelas } from './productosVenta/PedidosDesdeVenta';
import { TIPOS_ADICIONAL, faltantesDe, nombreCampo, recargoListo } from './productosVenta/faltantes';
import useAlturaUniforme from './productosVenta/useAlturaUniforme';
import './ProductosVenta.css';

/*
 * Productos de la venta, dentro de la venta expandida (rediseño 2026-10-08).
 * Reglas del usuario (D15a): el precio se pacta global (valor de la venta), sin
 * precio unitario ni descuento por producto; el descuento se calcula con la suma de
 * los precios de lista. La entrega es de la venta. Cada producto lleva texto para
 * el proveedor (o "No aplica") y texto para el cliente y la remisión; la referencia
 * de compra se sugiere desde el producto. Vista compacta: la usan los vendedores.
 * (2026-10-08) Cada producto dice si lleva tela (no lleva / la incluye el proveedor /
 * se compra aparte) con los datos de un pedido de /telas: material (tela en metros o
 * cuero en decímetros), referencia, color, proveedor y cantidad. Los pedidos al
 * proveedor y de telas se arman aquí con la lógica de /ordenes/nuevo y /telas, y se
 * descarga una imagen por pedido (ver productosVenta/PedidosDesdeVenta). "Finalizar
 * gestión" cuando ya se pidió todo. Sin "sale de bodega" ni "recibir OP" (2026-10-08).
 * (2026-10-15) Editor tipo factura: una fila por producto (producto · detalle, cantidad,
 * grupo de tela, referencia de compra y precio de lista) con sus detalles desplegables.
 * Conjuntos (comedor = mesa + sillas, cama = base + cabecero…): las piezas se ven juntas y
 * se piden por separado; un juego de la lista de precios se agrega como conjunto. La tela
 * lleva su grupo (tela o cuero) y el costo del proveedor por metro o decímetro. El texto
 * para el cliente es opcional: sin él, la remisión usa el nombre del producto.
 */

const plano = (v) => {
    if (v == null) return [];
    if (typeof v === 'string') return [v];
    if (Array.isArray(v)) return v.flatMap(plano);
    if (typeof v === 'object') return Object.values(v).flatMap(plano);
    return [String(v)];
};
const errorTexto = (e) => {
    const d = e.response?.data;
    if (!d) return 'No se pudo conectar. Puedes volver a intentar.';
    if (typeof d === 'string') return d;
    if (d.error || d.detail) return d.error || d.detail;
    if (d.lineas && typeof d.lineas === 'object' && !Array.isArray(d.lineas)) {
        return Object.entries(d.lineas).map(([i, err]) => `Producto ${Number(i) + 1}: ${plano(err).join(' ')}`).join(' · ');
    }
    return plano(d).join(' ');
};
const nueva = (extra = {}) => ({ cantidad: 1, opcionales: [], adicionales: [], texto_cliente: '', texto_proveedor: '', sin_texto_proveedor: false,
    motivo_precio: '', referencia: null, referencia_nombre: '', grupo_catalogo: null, variante: null, producto_nombre: '',
    tela_modo: '', tela_material: '', tela_referencia: '', tela_color: '', tela_proveedor: null, tela_cantidad: null, tela_pedidos: [],
    tela_grupo: null, tela_costo: null, conjunto: '', conjunto_nombre: '', conjunto_cantidad: 1, ...extra });
const esCuero = (l) => (l.tela_material || (l.grupo_es_cuero ? 'cuero' : 'tela')) === 'cuero';
const MODOS_TELA = [['no_aplica', 'No'], ['incluida', 'Sí, la pone el proveedor'], ['aparte', 'Sí, la compramos aparte']];
const GESTION = { pendiente: ['Pendiente', 'pendiente'], atrasada: ['Atrasada', 'atrasada'], finalizada: ['Finalizada', 'ok'] };
const fechaCorta = (iso) => (iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '');
// Lo que viaja al servidor: sin precios por producto ni fecha ni especificaciones.
const entrada = (l) => ({
    id: l.id, tipo: l.tipo || 'producto', variante: l.variante || null, grupo_catalogo: l.grupo_catalogo || null, referencia: l.referencia || null,
    juego: l.juego || null, pieza: l.pieza || null,
    producto_nombre: l.producto_nombre || '', cantidad: Number(l.cantidad) || 1, opcionales: l.opcionales || [],
    adicionales: (l.adicionales || []).filter(recargoListo).map(a => ({ descripcion: a.descripcion.trim(), importe_lista: a.importe_lista })),
    precio_lista_override: l.precio_lista_override || null, motivo_precio: l.motivo_precio || '',
    texto_proveedor: l.sin_texto_proveedor ? '' : (l.texto_proveedor || ''), sin_texto_proveedor: Boolean(l.sin_texto_proveedor),
    texto_cliente: l.texto_cliente || '', inventario_origen: l.inventario_origen || null,
    tela_modo: l.tela_modo || '', tela_material: l.tela_modo && l.tela_modo !== 'no_aplica' ? (esCuero(l) ? 'cuero' : 'tela') : '',
    tela_referencia: l.tela_modo === 'no_aplica' ? '' : (l.tela_referencia || ''), tela_color: l.tela_modo === 'no_aplica' ? '' : (l.tela_color || ''),
    tela_proveedor: l.tela_modo === 'aparte' ? (l.tela_proveedor || null) : null,
    tela_cantidad: l.tela_modo === 'aparte' && l.tela_cantidad ? l.tela_cantidad : null,
    tela_grupo: l.tela_modo && l.tela_modo !== 'no_aplica' ? (l.tela_grupo || null) : null,
    tela_costo: l.tela_modo === 'aparte' && l.tela_costo !== '' && l.tela_costo != null ? l.tela_costo : null,
    conjunto: l.conjunto || '', conjunto_nombre: l.conjunto ? (l.conjunto_nombre || '') : '', conjunto_cantidad: l.conjunto ? (Number(l.conjunto_cantidad) || 1) : 1,
    // Una venta guardada conserva sus precios; solo con «Actualizar» toma los de la lista actual.
    recalcular: Boolean(l.recalcular),
});
// Grupo de la tela: el elegido o, si coincide el material, el del precio del catálogo.
const grupoDeTela = (l, grupos) => {
    const material = esCuero(l) ? 'cuero' : 'tela';
    if (l.tela_grupo) return grupos.find(g => g.id === l.tela_grupo) || { id: l.tela_grupo, nombre: l.tela_grupo_nombre || 'Grupo', tipo: material };
    const precio = grupos.find(g => g.id === l.grupo_catalogo);
    return precio && precio.tipo === material ? precio : null;
};
const nombreConDetalle = (l) => (l.variante_nombre ? `${l.producto_nombre} · ${l.variante_nombre}` : l.producto_nombre);
// Marca de campo incompleto: borde rojo y el mensaje debajo (solo tras intentar guardar).
const conFalta = (base, m) => `${base}${m ? ' is-falta' : ''}`;
const Falta = ({ m }) => (m ? <small className="pv-falta-msg">{m}</small> : null);
const descuentoPct = (lista, venta) => (lista > 0 && lista > venta ? ((lista - venta) / lista) * 100 : 0);
const porcentaje = (n) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;

function Resumen({ lista, venta, margen }) {
    const desc = descuentoPct(lista, venta);
    return (
        <dl className="pv-resumen">
            <div><dt>Lista</dt><dd>{lista ? formatCOP(lista) : '—'}</dd></div>
            <div><dt>Venta</dt><dd>{formatCOP(venta)}</dd></div>
            <div className={desc > 0 ? 'is-desc' : ''}><dt>Descuento</dt><dd>{lista ? porcentaje(desc) : '—'}</dd></div>
            {margen != null && <div className="is-margen"><dt>Margen</dt><dd>{formatCOP(margen)}</dd></div>}
        </dl>
    );
}

export function ProductosEsqueleto() {
    return (
        <section className="pv pv--cargando" aria-label="Cargando productos" aria-busy="true">
            <span className="pv-sr">Cargando productos…</span>
            <div className="pv-head">
                <span className="pv-hueso" style={{ width: 110, height: 16 }} />
                <span className="pv-hueso" style={{ width: 260, height: 16, marginLeft: 'auto' }} />
            </div>
            {[0, 1].map(i => (
                <div className="pv-fila pv-fila--hueso" key={i}>
                    <span className="pv-hueso" style={{ width: 24 }} />
                    <span className="pv-hueso" style={{ width: '70%' }} />
                    <span className="pv-hueso" style={{ width: '80%' }} />
                    <span className="pv-hueso" style={{ width: '60%' }} />
                    <span className="pv-hueso" style={{ width: 70 }} />
                </div>
            ))}
        </section>
    );
}

// Búsqueda del catálogo (2026-10-24): lo ya buscado sale al instante (caché de 2 minutos; el
// servidor también la guarda hasta que cambie la lista) y, mientras llega lo nuevo, se siguen
// viendo los resultados anteriores en vez de volver al esqueleto de carga.
const consultaCatalogo = (consulta) => ({
    queryKey: ['productos-venta-catalogo', 'subcategorias-v2', consulta],
    queryFn: ({ pageParam, signal }) => buscarProductosVenta({ q: consulta, page: pageParam }, { signal }),
    initialPageParam: 1,
    getNextPageParam: (ultima, paginas, numero) => (ultima.count || 0) > paginas.reduce((n, p) => n + p.results.length, 0) ? numero + 1 : undefined,
    staleTime: 120000, retry: false,
});

function BuscadorCatalogo({ alElegir, cerrar, titulo }) {
    const [q, setQ] = useState('');
    const consulta = useDebounce(q.trim(), 200);
    const catalogo = useInfiniteQuery({ ...consultaCatalogo(consulta), placeholderData: keepPreviousData });
    const resultados = catalogo.data?.pages.flatMap(p => p.results) || [];
    const cargando = catalogo.isFetching || consulta !== q.trim();
    const estado = p => ({ borrador: 'Borrador · pendiente de publicar', sin_costo: 'Costo pendiente de confirmar', historico: 'Producto anterior' })[p.estado_precio] || (p.activo === false ? 'Inactivo' : '');
    return (
        <div className="pv-buscador">
            {titulo && <p className="pv-buscador__titulo">{titulo}</p>}
            <div className="pv-buscador__campo">
                <FaSearch aria-hidden="true" />
                <input autoFocus aria-label="Buscar producto en la lista de precios" placeholder="Referencia, subcategoría o proveedor…" value={q} onChange={e => setQ(e.target.value)} />
                {cargando && <span className="pv-giro" aria-hidden="true" />}
                <button type="button" className="pv-icono" aria-label="Cerrar búsqueda" onClick={cerrar}><FaTimes /></button>
            </div>
            {catalogo.isError && <p role="alert" className="pv-error">{errorTexto(catalogo.error)} <button type="button" className="pv-link" onClick={() => catalogo.refetch()}>Reintentar</button></p>}
            {catalogo.isPending && <div className="pv-resultados">{[0, 1, 2].map(i => <span key={i} className="pv-hueso pv-hueso--resultado" />)}</div>}
            {catalogo.data && (
                <ul className={`pv-resultados${cargando ? ' is-actualizando' : ''}`}>
                    {resultados.map(p => (
                        <li key={p.id}>
                            <button type="button" disabled={p.activo === false || p.seleccionable === false || cargando || catalogo.isError} onClick={() => alElegir(p)}>
                                <span>{p.nombre}{p.juego && <b className="pv-juego-tag">{p.piezas?.length ? 'Conjunto' : 'Juego'}</b>}</span>
                                <small>{[p.proveedor_nombre, p.categoria, p.juego, estado(p)].filter(Boolean).join(' · ')}</small>
                            </button>
                        </li>
                    ))}
                    {!resultados.length && <li className="pv-muted pv-resultados__vacio">{q ? `Sin subcategorías para “${q}”.` : 'No hay subcategorías configuradas. Revisa Administrar lista.'}</li>}
                    {catalogo.hasNextPage && <li><button type="button" className="pv-link" disabled={cargando} onClick={() => catalogo.fetchNextPage()}>Ver más subcategorías</button></li>}
                </ul>
            )}
        </div>
    );
}

function Referencia({ linea, opciones, cambiar, canonica = false }) {
    const [buscar, setBuscar] = useState(false);
    const [q, setQ] = useState('');
    const [res, setRes] = useState([]);
    useEffect(() => {
        if (!buscar) return undefined;
        const c = new AbortController();
        const t = setTimeout(() => API.get('/productos-venta/referencias/', { params: { q }, signal: c.signal }).then(r => setRes(r.data.results)).catch(() => {}), 200);
        return () => { clearTimeout(t); c.abort(); };
    }, [q, buscar]);
    const elegida = opciones.find(o => o.id === linea.referencia)?.nombre;
    const nombre = canonica ? elegida || linea.referencia_nombre : linea.referencia_nombre || elegida;
    if (buscar) {
        return (
            <div className="pv-ref__buscar">
                <input autoFocus aria-label="Buscar referencia del proveedor" placeholder="Referencia o proveedor" value={q} onChange={e => setQ(e.target.value)} />
                {!!res.length && <ul>{res.map(r => <li key={r.id}><button type="button" onClick={() => { cambiar({ referencia: r.id, referencia_nombre: r.nombre }); setBuscar(false); }}>{r.nombre}</button></li>)}</ul>}
                <button type="button" className="pv-link" onClick={() => setBuscar(false)}>Cancelar</button>
            </div>
        );
    }
    return (
        <div className="pv-ref">
            {opciones.length > 1 ? (
                <select aria-label="Referencia de compra" value={linea.referencia || ''} onChange={e => {
                    const o = opciones.find(x => x.id === Number(e.target.value));
                    cambiar({ referencia: o?.id || null, referencia_nombre: o?.nombre || '' });
                }}>
                    {!opciones.some(o => o.id === linea.referencia) && linea.referencia && <option value={linea.referencia}>{nombre}</option>}
                    {opciones.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select>
            ) : <span className="pv-ref__nombre" title={nombre}>{nombre || 'Se asigna al guardar'}</span>}
            {!canonica && <button type="button" className="pv-link" onClick={() => setBuscar(true)}>Cambiar</button>}
        </div>
    );
}

// Tela del producto (rediseño 2026-10-15): primero «¿lleva tela?»; solo si lleva, el
// material, el grupo (que en un producto de catálogo define el precio de lista), la tela
// elegida y, si la compramos aparte, a quién, cuánto y a qué costo.
function TelaProducto({ linea, n, cambiar, proveedores, grupos = [], requiere = false, permitidos = [], sugerida, sugeridaCuero, faltas = {}, copiarTela }) {
    const pedida = !!linea.tela_pedidos?.length;
    const modo = linea.tela_modo;
    const cuero = esCuero(linea);
    const unidad = cuero ? 'dm' : 'm';
    const material = cuero ? 'cuero' : 'tela';
    const consumoSugerido = cuero ? sugeridaCuero : sugerida;
    const lleva = modo && modo !== 'no_aplica';
    const precio = grupos.find(g => g.id === linea.grupo_catalogo);
    const grupo = requiere ? (precio && (precio.tipo || 'tela') === material ? precio : null) : grupoDeTela(linea, grupos);
    const base = requiere && permitidos.length ? grupos.filter(g => permitidos.includes(g.id)) : grupos;
    const opcionesGrupo = base.filter(g => (g.tipo || 'tela') === material);
    const costoGrupo = (g) => (g && Number(g.precio_por_metro) ? String(Number(g.precio_por_metro)) : null);
    const elegirGrupo = (id) => {
        const g = grupos.find(x => x.id === id);
        cambiar({ tela_grupo: id, tela_grupo_nombre: g?.nombre || '',
            ...(requiere ? { grupo_catalogo: id, grupo_es_cuero: g?.tipo === 'cuero' } : {}),
            // El costo (solo si la compramos aparte) arranca con el del grupo en la lista de precios.
            ...(modo === 'aparte' && !linea._costo_manual ? { tela_costo: costoGrupo(g) } : {}) });
    };
    const elegirMaterial = (v) => {
        if (v === material) return;
        cambiar({ tela_material: v, grupo_es_cuero: v === 'cuero', tela_grupo: null, ...(requiere ? { grupo_catalogo: null } : {}),
            ...(v === 'cuero' ? { tela_cantidad: null } : {}), ...(!linea._costo_manual ? { tela_costo: null } : {}) });
    };
    // Si la pone el proveedor del mueble (tela o cuero) va dentro de su precio: sin costo aparte.
    const elegirModo = (v) => cambiar({ tela_modo: v,
        // Al comprarla aparte, la cantidad arranca con el metraje sugerido (tela).
        ...(v === 'aparte' && !linea.tela_cantidad && consumoSugerido ? { tela_cantidad: String(consumoSugerido) } : {}),
        ...(v === 'aparte' && !linea._costo_manual && linea.tela_costo == null && costoGrupo(grupo) ? { tela_costo: costoGrupo(grupo) } : {}),
        ...(v !== 'aparte' ? { tela_costo: null, _costo_manual: false } : {}) });
    // Un producto cuyo precio depende de la tela siempre la lleva.
    const modos = MODOS_TELA.filter(([v]) => !(requiere && v === 'no_aplica' && modo !== 'no_aplica'));
    const verGrupo = lleva || (requiere && modo === 'no_aplica');
    return (
        <div className={conFalta('pv-tela', faltas.tela_modo)}>
            <div className="pv-pregunta">
                <div className="pv-segmento" role="radiogroup" aria-label={`Tela o cuero del producto ${n}`} title="¿Lleva tela o cuero?">
                    {modos.map(([v, t]) => (
                        <button type="button" key={v} role="radio" aria-checked={modo === v} className={modo === v ? 'is-activo' : ''}
                            disabled={pedida} onClick={() => elegirModo(v)}>{t}</button>
                    ))}
                </div>
                <Falta m={faltas.tela_modo} />
            </div>
            {modo === 'no_aplica' && !verGrupo && <p className="pv-tela__no-aplica"><FaCheckCircle aria-hidden="true" /><span>Este producto no lleva tela ni cuero.<small>Continúa con el texto para el proveedor y la remisión.</small></span></p>}
            {verGrupo && (
                <div className="pv-tela__grid">
                    {lleva && (
                        <div className="pv-campo pv-tela__material"><span>Material</span>
                            <div className="pv-segmento pv-segmento--material" role="radiogroup" aria-label={`Material del producto ${n}`}>
                                {[['tela', 'Tela (m)'], ['cuero', 'Cuero (dm)']].map(([v, t]) => (
                                    <button type="button" key={v} role="radio" aria-checked={material === v} className={material === v ? 'is-activo' : ''}
                                        disabled={pedida} onClick={() => elegirMaterial(v)}>{t}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    <label className={conFalta('pv-campo', faltas.tela_grupo)} title={requiere ? 'El grupo define el precio de lista' : undefined}><span>Grupo de {material}{requiere && ' *'}</span>
                        <select aria-invalid={!!faltas.tela_grupo} aria-label={`Grupo de ${material} del producto ${n}`} value={grupo?.id || ''}
                            onChange={e => elegirGrupo(Number(e.target.value) || null)}>
                            <option value="">Elige el grupo</option>
                            {grupo && !opcionesGrupo.some(g => g.id === grupo.id) && <option value={grupo.id}>{grupo.nombre}</option>}
                            {opcionesGrupo.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                        </select>
                        <Falta m={faltas.tela_grupo} />
                    </label>
                    {lleva && <>
                        <label className={conFalta('pv-campo', faltas.tela_referencia)}><span>Referencia</span>
                            <input aria-invalid={!!faltas.tela_referencia} aria-label={`Referencia de ${material} del producto ${n}`} placeholder={cuero ? 'Ej.: Nappa' : 'Ej.: Manhattan'}
                                disabled={pedida} value={linea.tela_referencia || ''} onChange={e => cambiar({ tela_referencia: e.target.value })} />
                            <Falta m={faltas.tela_referencia} />
                        </label>
                        <label className={conFalta('pv-campo', faltas.tela_color)}><span>Color</span>
                            <input aria-invalid={!!faltas.tela_color} aria-label={`Color de ${material} del producto ${n}`} placeholder={cuero ? 'Ej.: Miel' : 'Ej.: Marfil 03'}
                                disabled={pedida} value={linea.tela_color || ''} onChange={e => cambiar({ tela_color: e.target.value })} />
                            <Falta m={faltas.tela_color} />
                        </label>
                    </>}
                    {modo === 'aparte' && <>
                        <label className={conFalta('pv-campo', faltas.tela_proveedor)}><span>Se le compra a</span>
                            <select aria-invalid={!!faltas.tela_proveedor} aria-label={`Proveedor de ${material} del producto ${n}`} disabled={pedida} value={linea.tela_proveedor || ''}
                                onChange={e => cambiar({ tela_proveedor: Number(e.target.value) || null })}>
                                <option value="">Elige el proveedor…</option>
                                {linea.tela_proveedor && !proveedores.some(p => p.id === linea.tela_proveedor) && <option value={linea.tela_proveedor}>{linea.tela_proveedor_nombre}</option>}
                                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre_empresa}</option>)}
                            </select>
                            <Falta m={faltas.tela_proveedor} />
                        </label>
                        <label className={conFalta('pv-campo', faltas.tela_cantidad)}><span>Cantidad ({unidad})</span>
                            <input aria-invalid={!!faltas.tela_cantidad} type="number" min="0" step={cuero ? '10' : '0.1'} aria-label={`Cantidad de ${material} del producto ${n}`} disabled={pedida}
                                placeholder={consumoSugerido ? `${consumoSugerido} sugerido` : unidad} value={linea.tela_cantidad ?? ''} onChange={e => cambiar({ tela_cantidad: e.target.value || null })} />
                            <Falta m={faltas.tela_cantidad} />
                        </label>
                    </>}
                    {modo === 'aparte' && (
                        <label className={conFalta('pv-campo', faltas.tela_costo)}><span>Costo ($/{unidad})</span>
                            <input aria-invalid={!!faltas.tela_costo} type="number" min="0" step={cuero ? '100' : '1000'} aria-label={`Costo de ${material} por ${cuero ? 'decímetro' : 'metro'} del producto ${n}`}
                                placeholder={costoGrupo(grupo) || `$ por ${unidad}`} value={linea.tela_costo ?? ''}
                                onChange={e => cambiar({ tela_costo: e.target.value === '' ? null : e.target.value, _costo_manual: true })} />
                            <Falta m={faltas.tela_costo} />
                        </label>
                    )}
                </div>
            )}
            {pedida && <small className="pv-muted">Ya pedida (PT {linea.tela_pedidos.map(t => t.id).join(', ')}). Para cambiarla, anula ese pedido en Telas; el grupo y el costo sí se pueden completar.</small>}
            <div className="pv-tela__acciones">{copiarTela && lleva && <button type="button" className="pv-link pv-tela__copiar" onClick={copiarTela}>Usar esta tela en las demás piezas del conjunto</button>}</div>
        </div>
    );
}

// «Cojines incluidos» (2026-10-15): un producto con «Decorativos x2» cubre 2 decorativos por
// unidad (grupo 1 o 2 sin cobro; desde grupo 3, la diferencia). El servidor lo aplica al guardar.
function NotaDecorativos({ da, incluido, esDecorativo }) {
    if (da) return <small className="pv-decorativos">Incluye {da * 1} decorativos por unidad (línea Decorativos, grupo 1 o 2 sin cobro).</small>;
    if (incluido) return <small className="pv-decorativos">Incluido{incluido.unidades > 1 ? `s ${incluido.unidades}` : ''} por «Cojines incluidos»: −{formatCOP(incluido.valor)} en la lista.</small>;
    if (esDecorativo) return <small className="pv-decorativos pv-muted">Decorativo: si otro producto trae «Cojines incluidos», al guardar se descuenta.</small>;
    return null;
}

// Transporte por envío (2026-10-21): al guardar, lo que viaja junto no se cobra dos veces.
function NotaTransporte({ compartido }) {
    if (!compartido) return null;
    return <small className="pv-decorativos">{compartido.transportes === 0 ? 'Transporte incluido en el del conjunto' : `${compartido.transportes} transporte${compartido.transportes > 1 ? 's' : ''} para estas unidades`}: −{formatCOP(compartido.valor)} en la lista.</small>;
}

// Qué falta por sección: guía al asesor (Compra, Tela, Textos) con ✓ o pendiente.
const SECCIONES = {
    compra: (f) => !f.referencia,
    tela: (f) => !Object.keys(f).some(k => k.startsWith('tela_') || k === 'grupo_catalogo'),
    textos: (f) => !f.texto_proveedor,
};
function Paso({ ok, texto }) {
    return <span className={`pv-paso${ok ? ' is-ok' : ''}`}>{ok ? '✓' : '•'} {texto}</span>;
}

function resumenTela(l, grupos) {
    if (!l.tela_modo) return <em className="pv-aviso">Falta decir si lleva tela o cuero</em>;
    if (l.tela_modo === 'no_aplica') return 'No lleva tela';
    const g = grupoDeTela(l, grupos);
    const cuero = esCuero(l);
    const partes = [`${cuero ? 'Cuero' : 'Tela'} ${[l.tela_referencia, l.tela_color].filter(Boolean).join(' · ') || 'sin indicar'}`, g && g.nombre,
        l.tela_modo === 'incluida' ? 'la pone el proveedor del mueble' : [`la compramos a ${l.tela_proveedor_nombre || 'proveedor sin elegir'}`,
            l.tela_cantidad && `${Number(l.tela_cantidad).toLocaleString('es-CO')} ${cuero ? 'dm' : 'm'}`].filter(Boolean).join(' · ')];
    return partes.filter(Boolean).join(' · ');
}

function Cantidad({ valor, cambiar, n, falta }) {
    const v = Number(valor) || 1;
    return (
        <div className={conFalta('pv-cantidad', falta)}>
            <button type="button" aria-label={`Una unidad menos del producto ${n}`} disabled={v <= 1} onClick={() => cambiar(String(v - 1))}>−</button>
            <input aria-invalid={!!falta} aria-label={`Cantidad del producto ${n}`} type="number" min="1" max="10000" value={valor} onChange={e => cambiar(e.target.value)} />
            <button type="button" aria-label={`Una unidad más del producto ${n}`} onClick={() => cambiar(String(v + 1))}>+</button>
        </div>
    );
}

function EditorProducto({ ventaId, linea, indice, numero, cambiar, quitar, hasPermission, proveedoresTela, grupos = [], enConjunto = false, faltas = {}, copiarTela, actualizarPrecio }) {
    const catalogo = useQuery({
        queryKey: ['productos-venta-catalogo', 'detalle', linea.variante],
        queryFn: ({ signal }) => buscarProductosVenta({ id: linea.variante }, { signal }),
        enabled: !!linea.variante, staleTime: 60000, retry: false,
    });
    const meta = catalogo.data?.results[0];
    const gruposPrecio = catalogo.data?.grupos || [];
    const [precio, setPrecio] = useState({ estado: 'listo', valor: linea.precio_lista_unitario, error: '' });
    const [verEspecial, setVerEspecial] = useState(Boolean(linea.precio_lista_override));
    const [verMas, setVerMas] = useState(Boolean(linea.adicionales?.length || linea.precio_lista_override));
    // Abrir un conjunto muestra sus piezas con el mismo editor completo de un producto.
    const [abierto, setAbierto] = useState(!linea.id || enConjunto);
    const especial = !linea.variante;
    // «Cojines incluidos»: obligatorio desde el catálogo; si es opcional, cuenta al elegirlo.
    const cupoDecorativos = meta?.decorativos_incluidos || (meta?.opcionales?.some(o => o.decorativos && linea.opcionales.includes(o.id)) ? 2 : 0);
    const puedeAjustar = hasPermission('AJUSTAR_PRECIO_LISTA_VENTA');
    useEffect(() => {
        const m = meta;
        if (!m) return;
        if (!linea.referencia && m.referencias?.length) cambiar({ referencia: m.referencias[0].id, referencia_nombre: m.referencias[0].nombre }, false);
        if (!m.tela && !linea.tela_modo) cambiar({ tela_modo: 'no_aplica' }, false);
        // Producto nuevo: los opcionales «habilitados» en la lista llegan ya seleccionados.
        const pre = (m.opcionales || []).filter(o => o.preseleccionado).map(o => o.id);
        if (!linea.id && !linea.opcionales?.length && pre.length) cambiar({ opcionales: pre }, false);
        cambiar({ _requiere_grupo: Boolean(m.tela) }, false);
    }, [meta, linea.variante]); // eslint-disable-line react-hooks/exhaustive-deps
    // El precio de lista se calcula solo con lo elegido (sin botón). Solo cuentan los
    // recargos completos, para no fallar mientras se escribe.
    const calc = entrada(linea);
    const clave = JSON.stringify([calc.variante, calc.grupo_catalogo, calc.opcionales, calc.adicionales, calc.precio_lista_override, calc.motivo_precio, calc.producto_nombre, calc.recalcular]);
    useEffect(() => {
        if (meta?.tela && !linea.grupo_catalogo) { setPrecio({ estado: 'falta', valor: null, error: 'Elige el grupo de la tela' }); return undefined; }
        if (especial && !linea.precio_lista_override) { setPrecio({ estado: 'falta', valor: null, error: 'Indica el precio' }); return undefined; }
        if (linea.variante && !meta) return undefined;
        const c = new AbortController();
        setPrecio(p => ({ ...p, estado: 'calculando' }));
        const t = setTimeout(() => {
            API.post(`/ventas/${ventaId}/productos/calcular/`, { ...calc, cantidad: 1, sin_texto_proveedor: true }, { signal: c.signal })
                .then(r => { setPrecio({ estado: 'listo', valor: r.data.precio_lista_unitario, vigente: r.data.precio_lista_vigente || null, error: '' }); cambiar({ precio_lista_unitario: r.data.precio_lista_unitario, _precio_error: '' }, false); })
                .catch(e => { if (!c.signal.aborted) { setPrecio({ estado: 'error', valor: null, error: errorTexto(e) }); cambiar({ _precio_error: `No se pudo calcular el precio: ${errorTexto(e)}` }, false); } });
        }, 350);
        return () => { clearTimeout(t); c.abort(); };
    }, [clave, meta]); // eslint-disable-line react-hooks/exhaustive-deps
    const conPedidos = !!linea.pedidos?.length || !!linea.inventario_origen;
    const cant = Number(linea.cantidad) || 1;
    const cambiarRecargo = (i, patch) => cambiar({ adicionales: linea.adicionales.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
    const n = numero;
    const nFaltas = Object.keys(faltas).length;
    const verDetalle = abierto || nFaltas > 0;
    const todosLosGrupos = gruposPrecio.length ? gruposPrecio : grupos;
    // Estado de cada sección (siempre visible, como guía), con las mismas reglas de guardar.
    const pendiente = faltantesDe(linea, todosLosGrupos);
    const listo = Object.fromEntries(Object.entries(SECCIONES).map(([k, fn]) => [k, fn(pendiente)]));
    // Nombre «Línea · Detalle»: de catálogo viene unido al agregar y separado al guardar.
    const [nombre, detalle] = linea.variante_nombre ? [linea.producto_nombre, linea.variante_nombre] : String(linea.producto_nombre || '').split(' · ');
    const nombreRemision = nombreConDetalle({ ...linea, producto_nombre: nombre, variante_nombre: detalle || '' }) || 'el nombre del producto';
    const hayExtras = !!meta?.opcionales?.length || puedeAjustar;

    return (
        <article className={conFalta(`pv-card${enConjunto ? ' pv-card--pieza' : ''}${verDetalle ? ' is-abierto' : ''}`, nFaltas)} aria-label={`Producto ${n}`}>
            {catalogo.isError && <p className="pv-error" role="alert">No se pudo verificar la subcategoría. <button type="button" className="pv-link" onClick={() => catalogo.refetch()}>Reintentar</button></p>}
            <header className="pv-card__cabeza">
                <span className="pv-num">{n}</span>
                <div className="pv-card__titulo">
                    {especial ? (
                        <input className={conFalta('pv-ed__nombre-input', faltas.producto_nombre)} aria-invalid={!!faltas.producto_nombre} aria-label={`Nombre del producto ${n}`} placeholder="Nombre del producto especial"
                            value={linea.producto_nombre} onChange={e => cambiar({ producto_nombre: e.target.value })} />
                    ) : (
                        <button type="button" className="pv-card__nombre" onClick={() => setAbierto(a => !a)} title={verDetalle ? 'Ocultar detalles' : 'Ver y editar'}>
                            <strong>{nombre}</strong>{detalle && <span>{detalle}</span>}
                        </button>
                    )}
                    <div className="pv-card__pasos">
                        <Paso ok={listo.compra} texto="Compra" /><Paso ok={listo.tela} texto="Tela / Cuero" /><Paso ok={listo.textos} texto="Textos" />
                        {meta?.juego && <small className="pv-juego" title="Juego: se vende y se pide como un solo producto">Incluye {meta.juego}</small>}
                        {especial && <small className="pv-juego">Producto especial</small>}
                        {nFaltas > 0 && <span className="pv-faltan-chip">Falta{nFaltas === 1 ? '' : 'n'} {nFaltas} dato{nFaltas === 1 ? '' : 's'}</span>}
                    </div>
                </div>
                <Cantidad valor={linea.cantidad} n={n} falta={faltas.cantidad} cambiar={v => cambiar({ cantidad: v })} />
                <div className={`pv-card__precio pv-ed__precio is-${precio.estado}`} aria-live="polite">
                    {precio.estado === 'calculando' && <span className="pv-giro" aria-label="Calculando precio" />}
                    {precio.valor ? (
                        <span title={cant > 1 ? `${formatCOP(precio.valor)} c/u · precio de lista` : 'Precio de lista'}>{formatCOP(Number(precio.valor) * cant)}<small> lista</small></span>
                    ) : precio.estado === 'falta' ? <small className="pv-aviso">{precio.error}</small> : precio.estado !== 'calculando' && <span>—</span>}
                </div>
                <div className="pv-card__acciones">
                    <button type="button" className="pv-icono pv-icono--abrir" aria-expanded={verDetalle} aria-label={`${verDetalle ? 'Ocultar' : 'Ver'} detalles del producto ${n}`}
                        title={verDetalle ? 'Ocultar detalles' : 'Ver y editar'} onClick={() => setAbierto(a => !a)} disabled={nFaltas > 0}><FaChevronDown /></button>
                    <button type="button" className="pv-icono" onClick={quitar} disabled={conPedidos}
                        title={conPedidos ? 'Ya tiene pedido o unidad de bodega: no se puede quitar' : 'Quitar producto'} aria-label={`Quitar producto ${n}`}><FaTimes /></button>
                </div>
            </header>
            {(cupoDecorativos > 0 || linea.decorativos_incluidos || meta?.es_decorativo) && (
                <NotaDecorativos da={cupoDecorativos} incluido={linea.decorativos_incluidos} esDecorativo={meta?.es_decorativo} />
            )}
            <NotaTransporte compartido={linea.transporte_compartido} />
            {precio.vigente && !linea.recalcular && actualizarPrecio && (
                <p className="pv-lista-cambio" role="status">
                    <span>La lista de precios cambió: hoy vale <b>{formatCOP(Number(precio.vigente) * cant)}</b> y se vendió en <b>{formatCOP(Number(precio.valor) * cant)}</b>. La venta conserva su precio.</span>
                    <button type="button" className="pv-link" onClick={actualizarPrecio}>{enConjunto ? 'Actualizar el conjunto a la lista actual' : 'Actualizar a la lista actual'}</button>
                </p>
            )}

            {!verDetalle ? (
                <p className="pv-card__resumen">
                    <span><b>Compra</b> {linea.referencia_nombre || <em className="pv-aviso">sin referencia</em>}</span>
                    <span><b>Tela / Cuero</b> {resumenTela(linea, todosLosGrupos)}</span>
                    <span><b>Proveedor</b> {linea.sin_texto_proveedor ? 'no aplica' : linea.texto_proveedor || <em className="pv-aviso">sin texto</em>}</span>
                    <span><b>Remisión</b> {linea.texto_cliente || nombreRemision}</span>
                </p>
            ) : (
                <div className="pv-card__cuerpo">
                    <section className="pv-sec pv-sec--compra" aria-label={`Compra del producto ${n}`}>
                        <h6 className="pv-sec__titulo" title="A quién se le pide este mueble">Compra</h6>
                        <div className={conFalta('pv-campo pv-sec__compra', faltas.referencia)}>
                            <Referencia linea={linea} opciones={meta?.referencias || []} cambiar={cambiar} canonica={meta?.catalogo_actual} />
                            <Falta m={faltas.referencia} />
                        </div>
                    </section>
                    <section className="pv-sec pv-sec--tela" aria-label={`Tela o cuero del producto ${n}`}>
                        <h6 className="pv-sec__titulo" title={meta?.tela ? 'El grupo define el precio de lista' : 'Si el mueble va tapizado en tela o cuero'}>Tela / Cuero</h6>
                        <TelaProducto linea={linea} n={n} cambiar={cambiar} proveedores={proveedoresTela} grupos={todosLosGrupos} faltas={faltas}
                            requiere={Boolean(meta?.tela)} permitidos={meta?.grupos || []} copiarTela={copiarTela}
                            sugerida={meta?.metraje ? Number(meta.metraje) * cant : null} sugeridaCuero={meta?.decimetraje_cuero ? Number(meta.decimetraje_cuero) * cant : null} />
                    </section>
                    <section className="pv-sec pv-sec--textos" aria-label={`Textos del producto ${n}`}>
                        <h6 className="pv-sec__titulo">Textos</h6>
                        <div className="pv-ed__textos">
                            <div className={conFalta('pv-campo', faltas.texto_proveedor)}>
                                <div className="pv-campo__fila">
                                    <label htmlFor={`pv-prov-${indice}`}>Para el proveedor</label>
                                    <label className="pv-noaplica"><input type="checkbox" checked={Boolean(linea.sin_texto_proveedor)} onChange={e => cambiar({ sin_texto_proveedor: e.target.checked })} /> No aplica</label>
                                </div>
                                <textarea id={`pv-prov-${indice}`} rows={1} disabled={linea.sin_texto_proveedor} placeholder={linea.sin_texto_proveedor ? 'No se envía texto al proveedor' : 'Medidas, acabados, indicaciones de fabricación…'}
                                    aria-invalid={!!faltas.texto_proveedor} value={linea.sin_texto_proveedor ? '' : linea.texto_proveedor} onChange={e => cambiar({ texto_proveedor: e.target.value })} />
                                <Falta m={faltas.texto_proveedor} />
                            </div>
                            <div className="pv-campo">
                                <div className="pv-campo__fila"><label htmlFor={`pv-cli-${indice}`}>Para el cliente y la remisión <em className="pv-opcional">opcional</em></label></div>
                                <textarea id={`pv-cli-${indice}`} rows={1} placeholder={`Si lo dejas vacío, la remisión dirá «${nombreRemision}»`}
                                    value={linea.texto_cliente} onChange={e => cambiar({ texto_cliente: e.target.value })} />
                            </div>
                        </div>
                    </section>
                    {hayExtras && (
                        <section className="pv-sec pv-sec--extra" aria-label={`Opcionales y precio del producto ${n}`}>
                            <h6 className="pv-sec__titulo">Precio</h6>
                            <div className="pv-sec__extra">
                            {!!meta?.opcionales?.length && (
                                <div className="pv-opcionales" role="group" aria-label="Opcionales">
                                    <span>Opcionales</span>
                                    {meta.opcionales.map(o => {
                                        const activo = linea.opcionales.includes(o.id);
                                        return <button type="button" key={o.id} className={activo ? 'is-activo' : ''} aria-pressed={activo}
                                            title={o.especial ? 'Especial del juego' : undefined}
                                            onClick={() => cambiar({ opcionales: activo ? linea.opcionales.filter(id => id !== o.id) : [...linea.opcionales, o.id] })}>{o.especial ? '★ ' : ''}{o.descripcion}</button>;
                                    })}
                                </div>
                            )}
                            {puedeAjustar && !verMas && !especial && (
                                <button type="button" className="pv-link" onClick={() => setVerMas(true)}>+ Recargo o precio especial</button>
                            )}
                            {puedeAjustar && (verMas || especial) && <>
                                {linea.adicionales.map((a, i) => (
                                    <div className="pv-extra" key={i}>
                                        <span className="pv-extra__tipo">Recargo</span>
                                        <input aria-label={`Descripción del recargo ${i + 1}`} placeholder="¿Qué es? Ej.: patas en acero" value={a.descripcion} onChange={e => cambiarRecargo(i, { descripcion: e.target.value })} />
                                        <input aria-label={`Valor del recargo ${i + 1}`} className="pv-extra__valor" type="number" min="0" step="1000" placeholder="Valor por unidad"
                                            value={a.importe_lista} onChange={e => cambiarRecargo(i, { importe_lista: e.target.value })} />
                                        <button type="button" className="pv-icono" aria-label={`Quitar recargo ${i + 1}`} onClick={() => cambiar({ adicionales: linea.adicionales.filter((_, j) => j !== i) })}><FaTimes /></button>
                                    </div>
                                ))}
                                {(especial || verEspecial) && (
                                    <div className="pv-extra">
                                        <span className="pv-extra__tipo">Precio especial</span>
                                        <input aria-invalid={!!faltas.precio_lista_override} aria-label="Precio de lista especial por unidad" className={conFalta('pv-extra__valor', faltas.precio_lista_override)} type="number" min="1" step="1000" placeholder={especial ? 'Precio de lista por unidad' : 'Reemplaza el del catálogo'}
                                            value={linea.precio_lista_override ?? ''} onChange={e => cambiar({ precio_lista_override: e.target.value || null })} />
                                        <input aria-invalid={!!faltas.motivo_precio} className={faltas.motivo_precio ? 'is-falta' : ''} aria-label="Motivo del precio especial" placeholder="¿Por qué?" value={linea.motivo_precio} onChange={e => cambiar({ motivo_precio: e.target.value })} />
                                        {!especial && <button type="button" className="pv-icono" aria-label="Quitar precio especial" onClick={() => { cambiar({ precio_lista_override: null, motivo_precio: '' }); setVerEspecial(false); }}><FaTimes /></button>}
                                    </div>
                                )}
                                <div className="pv-ed__mas">
                                    <button type="button" className="pv-link" onClick={() => cambiar({ adicionales: [...linea.adicionales, { descripcion: '', importe_lista: '' }] })}>+ Recargo</button>
                                    {!especial && !verEspecial && <button type="button" className="pv-link" onClick={() => setVerEspecial(true)}>+ Precio especial</button>}
                                </div>
                            </>}
                            {(faltas.adicionales || faltas.motivo_precio || faltas.precio_lista_override) && (
                                <Falta m={[faltas.precio_lista_override, faltas.motivo_precio, faltas.adicionales].filter(Boolean).join(' ')} />
                            )}
                            </div>
                        </section>
                    )}
                </div>
            )}
            {precio.estado === 'error' && <p className="pv-error" role="alert">No se pudo calcular el precio: {precio.error}</p>}
        </article>
    );
}

// Costos propios de un conjunto de la lista (su Transporte…): los calcula la lista de precios.
const esCostoConjunto = (l) => (l.tipo || 'producto') !== 'producto' && Boolean(l.juego);
function CostosConjunto({ costos, verPrecios = true }) {
    if (!costos.length) return null;
    return (
        <ul className="pv-conj__costos">
            {costos.map(l => (
                <li key={l.id || l.clave}>
                    <span className={`pv-adic__tipo pv-adic__tipo--${l.tipo}`}>{TIPOS_ADICIONAL[l.tipo]}</span>
                    <span>{l.producto_nombre} del conjunto <small className="pv-muted">· {l.recalcular ? 'se actualiza a la lista actual al guardar' : 'de la lista de precios, no se pide a ningún proveedor'}</small></span>
                    {verPrecios && <strong>{conSigno(Number(l.precio_lista_unitario) * (Number(l.cantidad) || 1))}</strong>}
                </li>
            ))}
        </ul>
    );
}

// Conjunto en edición: nombre y cuántos conjuntos; las piezas van dentro.
// Conjunto cerrado (2026-10-24): una tarjeta como la de un producto, en una sola casilla de la
// grilla; abierto, ocupa toda la fila con sus piezas. Uno nuevo o con datos faltantes abre solo.
function EditorConjunto({ nombre, cantidad, piezas, costos = [], faltaNombre, faltan = 0, renombrar, cambiarCantidad, quitar, children }) {
    const total = [...piezas, ...costos].reduce((s, l) => s + (Number(l.precio_lista_unitario) || 0) * (Number(l.cantidad) || 0), 0);
    const proveedores = [...new Set(piezas.map(l => l.proveedor_nombre).filter(Boolean))];
    const bloqueado = piezas.some(l => l.pedidos?.length || l.inventario_origen);
    const [abierto, setAbierto] = useState(() => piezas.some(l => !l.id));
    const debeAbrir = !!faltaNombre || faltan > 0;
    useEffect(() => { if (debeAbrir) setAbierto(true); }, [debeAbrir]);
    const quitarBoton = (
        <button type="button" className="pv-icono" onClick={quitar} disabled={bloqueado} aria-label={`Quitar el conjunto ${nombre}`}
            title={bloqueado ? 'Alguna pieza ya tiene pedido: quítalas una a una' : 'Quitar el conjunto completo'}><FaTimes /></button>
    );
    if (!abierto) {
        const n = Number(cantidad) || 1;
        return (
            <article className="pv-card pv-card--conjunto" aria-label={`Conjunto ${nombre || 'sin nombre'}`}>
                <header className="pv-card__cabeza">
                    <span className="pv-num pv-num--conjunto" aria-hidden="true"><FaLayerGroup /></span>
                    <div className="pv-card__titulo">
                        <button type="button" className="pv-card__nombre" onClick={() => setAbierto(true)} title="Ver y editar sus piezas">
                            <strong>{nombre || 'Conjunto sin nombre'}</strong><span>Conjunto · {piezas.length} pieza{piezas.length === 1 ? '' : 's'}</span>
                        </button>
                        <div className="pv-card__pasos">
                            <small className="pv-juego">{proveedores.length > 1 ? `${proveedores.length} proveedores: un pedido a cada uno` : 'Un proveedor'}</small>
                        </div>
                    </div>
                    <div className="pv-cantidad" title="Cuántos conjuntos iguales: multiplica sus piezas">
                        <button type="button" aria-label="Un conjunto menos" disabled={n <= 1} onClick={() => cambiarCantidad(n - 1)}>−</button>
                        <input aria-label="Cantidad de conjuntos" type="number" min="1" max="100" value={cantidad} onChange={e => cambiarCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))} />
                        <button type="button" aria-label="Un conjunto más" onClick={() => cambiarCantidad(n + 1)}>+</button>
                    </div>
                    <div className="pv-card__precio pv-ed__precio"><span>{total ? formatCOP(total) : '—'}<small> lista</small></span></div>
                    <div className="pv-card__acciones">
                        <button type="button" className="pv-icono pv-icono--abrir" aria-expanded="false" aria-label={`Ver las piezas del conjunto ${nombre}`} title="Ver y editar sus piezas" onClick={() => setAbierto(true)}><FaChevronDown /></button>
                        {quitarBoton}
                    </div>
                </header>
                <p className="pv-card__resumen">
                    <span><b>Piezas</b> {piezas.map(l => `${l.cantidad} ${l.variante_nombre || l.producto_nombre}`).join(' + ')}</span>
                    <span><b>Compra</b> {proveedores.join(' · ') || <em className="pv-aviso">sin referencia</em>}</span>
                    {costos.map(l => <span key={l.id || l.clave}><b>{l.producto_nombre}</b> {conSigno(Number(l.precio_lista_unitario) * (Number(l.cantidad) || 1))}</span>)}
                </p>
            </article>
        );
    }
    return (
        <section className="pv-conj" aria-label={`Conjunto ${nombre || 'sin nombre'}`}>
            <header className="pv-conj__cabeza">
                <span className="pv-conj__icono" aria-hidden="true"><FaLayerGroup /></span>
                <div className="pv-conj__titulo">
                    <label className={conFalta('pv-conj__nombre', faltaNombre)}><span className="pv-sr">Nombre del conjunto</span>
                        <input aria-invalid={!!faltaNombre} aria-label="Nombre del conjunto" placeholder="Nombre del conjunto, p. ej. Comedor 6 puestos" value={nombre} onChange={e => renombrar(e.target.value)} />
                    </label>
                    <small>{piezas.length} pieza{piezas.length === 1 ? '' : 's'} · {proveedores.length > 1
                        ? `${proveedores.length} proveedores (${proveedores.join(', ')}): un pedido a cada uno`
                        : 'cada una se pide con su referencia'}</small>
                </div>
                <label className="pv-conj__cant" title="Cuántos conjuntos iguales: multiplica sus piezas">
                    <span>Conjuntos</span>
                    <input aria-label="Cantidad de conjuntos" type="number" min="1" max="100" value={cantidad} onChange={e => cambiarCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))} />
                </label>
                <span className="pv-conj__total">{total ? formatCOP(total) : '—'}<small>precio de lista</small></span>
                <button type="button" className="pv-icono pv-icono--abrir" aria-expanded="true" aria-label={`Ocultar las piezas del conjunto ${nombre}`}
                    title={debeAbrir ? 'Completa los datos que faltan para cerrarlo' : 'Ocultar las piezas'} disabled={debeAbrir} onClick={() => setAbierto(false)}><FaChevronDown /></button>
                {quitarBoton}
            </header>
            {faltaNombre && <Falta m={faltaNombre} />}
            <div className="pv-conj__piezas">{children}</div>
            <CostosConjunto costos={costos} />
        </section>
    );
}

const PLACEHOLDER_ADICIONAL = {
    transporte: 'Ej.: Transporte a Chía, subida por escaleras…',
    articulo: 'Ej.: Jarrón decorativo',
    ajuste: 'Ej.: No lleva cojines, negociación…',
};
const conSigno = (v) => `${Number(v) < 0 ? '− ' : '+ '}${formatCOP(Math.abs(Number(v)))}`;

// Transporte, artículos sin referencia y ajustes de negociación (2026-10-08).
function EditorAdicional({ linea, cambiar, quitar, faltas = {} }) {
    const tipo = linea.tipo;
    const crudo = linea.precio_lista_override;
    const signo = tipo === 'ajuste' ? (crudo != null && crudo !== '' ? Math.sign(Number(crudo)) || -1 : (linea._signo || -1)) : 1;
    const monto = crudo == null || crudo === '' ? '' : String(Math.abs(Number(crudo)));
    const fijar = (valor, s = signo) => {
        const v = valor === '' ? null : String(s * Number(valor));
        cambiar({ precio_lista_override: v, precio_lista_unitario: v, _signo: s });
    };
    const etiqueta = TIPOS_ADICIONAL[tipo];
    return (
        <div className={conFalta(`pv-adic pv-adic--${tipo}`, Object.keys(faltas).length)} aria-label={etiqueta}>
            <span className="pv-adic__tipo">{etiqueta}</span>
            <label className={conFalta('pv-campo pv-adic__desc', faltas.producto_nombre)}><span>{tipo === 'ajuste' ? 'Motivo' : 'Descripción'}</span>
                <input aria-invalid={!!faltas.producto_nombre} aria-label={`Descripción ${etiqueta}`} placeholder={PLACEHOLDER_ADICIONAL[tipo]}
                    value={linea.producto_nombre} onChange={e => cambiar({ producto_nombre: e.target.value })} />
                <Falta m={faltas.producto_nombre} />
            </label>
            {tipo === 'articulo' && (
                <label className={conFalta('pv-campo pv-campo--cant', faltas.cantidad)}><span>Cant.</span>
                    <input type="number" min="1" aria-label={`Cantidad ${etiqueta}`} value={linea.cantidad} onChange={e => cambiar({ cantidad: e.target.value })} />
                </label>
            )}
            {tipo === 'ajuste' && (
                <div className="pv-segmento pv-adic__signo" role="radiogroup" aria-label="El ajuste suma o resta">
                    {[[1, 'Suma'], [-1, 'Resta']].map(([s, t]) => (
                        <button type="button" key={t} role="radio" aria-checked={signo === s} className={signo === s ? 'is-activo' : ''} onClick={() => fijar(monto, s)}>{t}</button>
                    ))}
                </div>
            )}
            <label className={conFalta('pv-campo pv-adic__valor', faltas.precio_lista_override)}><span>{tipo === 'articulo' ? 'Valor c/u' : 'Valor'}</span>
                <input type="number" min="0" step="1000" aria-invalid={!!faltas.precio_lista_override} aria-label={`Valor ${etiqueta}`}
                    value={monto} onChange={e => fijar(e.target.value)} readOnly={Boolean(linea.juego)} title={linea.juego ? 'Lo calcula la lista de precios del conjunto' : undefined} />
                <Falta m={faltas.precio_lista_override} />
            </label>
            <button type="button" className="pv-icono" aria-label={`Quitar ${etiqueta}`} onClick={quitar}><FaTimes /></button>
        </div>
    );
}

function Servicios({ lineas, verPrecios }) {
    if (!lineas.length) return null;
    return (
        <div className="pv-servicios">
            <h5>Servicios y ajustes</h5>
            <ul>
                {lineas.map(l => (
                    <li key={l.id}>
                        <span className={`pv-adic__tipo pv-adic__tipo--${l.tipo}`}>{TIPOS_ADICIONAL[l.tipo]}</span>
                        <span className="pv-servicios__desc">{l.cantidad > 1 ? `${l.cantidad} × ` : ''}{l.producto_nombre}</span>
                        {verPrecios && <strong className={Number(l.precio_lista_unitario) < 0 ? 'is-resta' : ''}>{conSigno(Number(l.precio_lista_unitario) * l.cantidad)}</strong>}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function estadoDe(l) {
    const pedidas = l.pedidas || 0;
    const recibidas = (l.pedidos || []).reduce((s, p) => s + (p.recibidas || 0), 0);
    if (l.inventario_origen) return { tono: 'ok', texto: 'De bodega' };
    if (l.por_pedir === 0 && recibidas >= l.cantidad) return { tono: 'ok', texto: 'Recibido' };
    if (l.por_pedir === 0) return { tono: 'curso', texto: `Pedido · ${recibidas}/${pedidas} recibidos` };
    if (pedidas) return { tono: 'curso', texto: `Pedidos ${pedidas} · faltan ${l.por_pedir}` };
    return { tono: 'pendiente', texto: `Por pedir ${l.por_pedir}` };
}

function TelaResumen({ l, corto = false }) {
    if (l.tela_modo === 'no_aplica') return <span className="pv-muted">No lleva</span>;
    if (!l.tela_modo) return <span className="pv-tela-chip is-falta">Falta definir la tela</span>;
    const cuero = l.tela_material === 'cuero';
    const pedido = l.tela_pedidos?.[0];
    const nombre = [l.tela_referencia, l.tela_color && `color ${l.tela_color}`].filter(Boolean).join(' · ');
    return (
        <span className="pv-tela-linea">
            <span className="pv-tela-linea__nombre">{corto ? '' : `${cuero ? 'Cuero' : 'Tela'}: `}{nombre || <em className="pv-aviso">sin indicar</em>}</span>
            {l.tela_modo === 'incluida' && <span className="pv-muted"> · la pone el proveedor</span>}
            {l.tela_modo === 'aparte' && <>
                <span className="pv-muted"> · {l.tela_proveedor_nombre || 'sin proveedor'}{l.tela_cantidad ? ` · ${Number(l.tela_cantidad).toLocaleString('es-CO')} ${cuero ? 'dm' : 'm'}` : ''}</span>
                {' '}{/* deja partir la línea antes del chip para que no se salga de la tarjeta */}
                {pedido ? <span className="pv-tela-chip is-ok">PT {pedido.id} · {pedido.estado}</span> : <span className="pv-tela-chip is-falta">{cuero ? 'Cuero' : 'Tela'} por pedir</span>}
            </>}
        </span>
    );
}

function Gestion({ gestion, puede, ocupado, finalizar, reabrir }) {
    const [verFaltantes, setVerFaltantes] = useState(false);
    if (!gestion?.estado) return null;
    const [texto, tono] = GESTION[gestion.estado] || [gestion.estado, 'pendiente'];
    const faltan = gestion.pendientes || [];
    return (
        <div className={`pv-gestion pv-gestion--${tono}`}>
            <span className="pv-gestion__titulo">Gestión</span>
            <span className={`pv-estado pv-estado--${tono}`}>{texto}</span>
            {gestion.estado === 'finalizada' ? (
                <span className="pv-muted">{gestion.finalizada_en ? `Finalizada el ${fechaCorta(gestion.finalizada_en)}${gestion.finalizada_por ? ` por ${gestion.finalizada_por}` : ''}. Solo falta que llegue y entregar.` : 'Solo falta que llegue y entregar.'}</span>
            ) : faltan.length ? (
                <button type="button" className="pv-link" aria-expanded={verFaltantes} onClick={() => setVerFaltantes(v => !v)}>
                    {verFaltantes ? 'Ocultar' : `Falta${faltan.length === 1 ? '' : 'n'} ${faltan.length} cosa${faltan.length === 1 ? '' : 's'} para finalizar`}
                </button>
            ) : <span className="pv-muted">Todo pedido y con precio de lista.</span>}
            {puede && (gestion.estado === 'finalizada'
                ? <button type="button" className="pv-link pv-gestion__accion" disabled={!!ocupado} onClick={reabrir}>Reabrir</button>
                : <Button size="sm" className="pv-gestion__accion" icon={FaCheckCircle} disabled={faltan.length > 0} loading={ocupado === 'gestion'} onClick={finalizar}
                    title={faltan.length ? 'Completa lo que falta para finalizar' : 'Ya se pidió todo: solo queda esperar y entregar'}>Finalizar gestión</Button>)}
            {verFaltantes && faltan.length > 0 && <ul className="pv-gestion__faltan">{faltan.map(f => <li key={f}>{f}</li>)}</ul>}
        </div>
    );
}

// Vista (2026-10-15): cada producto es una tarjeta compacta, como un ítem de factura.
// Producto en la vista (2026-10-24): estado arriba, a quién se compra, la tela y los dos
// textos; tarjetas de ancho fijo para que quepan varias por fila.
function TarjetaProducto({ l, verPrecios, pieza = false }) {
    const estado = estadoDe(l);
    const remision = l.texto_cliente || nombreConDetalle(l);
    const cuero = l.tela_material === 'cuero' || (!l.tela_material && l.grupo_es_cuero);
    const notas = !!l.adicionales?.length || l.da_decorativos || l.decorativos_incluidos || l.transporte_compartido;
    return (
        <li className={`pv-tj${pieza ? ' pv-tj--pieza' : ''}`}>
            <header className="pv-tj__cab">
                <span className="pv-tj__cant" title={`${l.cantidad} unidad${l.cantidad === 1 ? '' : 'es'}`}>{l.cantidad}<small>×</small></span>
                <div className="pv-tj__nombre">
                    <strong title={nombreConDetalle(l)}>{l.producto_nombre}</strong>
                    {(l.variante_nombre || l.grupo_tela) && <span>{[l.variante_nombre, l.grupo_tela].filter(Boolean).join(' · ')}</span>}
                    <span className={`pv-estado pv-estado--${estado.tono} pv-tj__estado`}>{estado.texto}</span>
                </div>
                {verPrecios && <span className="pv-tj__precio" title="Precio de lista">{l.precio_lista_unitario ? formatCOP(Number(l.precio_lista_unitario) * l.cantidad) : '—'}</span>}
            </header>
            <dl className="pv-tj__datos">
                <div><dt>Se compra a</dt><dd>{l.referencia_nombre
                    ? <><b>{l.proveedor_nombre || l.referencia_nombre}</b>{l.proveedor_nombre && <span className="pv-muted"> · ref. {l.referencia_nombre}</span>}</>
                    : <em className="pv-aviso">Sin referencia</em>}</dd></div>
                <div><dt>{l.tela_modo && l.tela_modo !== 'no_aplica' ? (cuero ? 'Cuero' : 'Tela') : 'Tela / Cuero'}</dt><dd><TelaResumen l={l} corto /></dd></div>
                <div><dt>Al proveedor</dt><dd>{l.sin_texto_proveedor ? <em className="pv-muted">No aplica</em>
                    : l.texto_proveedor ? <q title={l.texto_proveedor}>{l.texto_proveedor}</q> : <em className="pv-aviso">Sin texto</em>}</dd></div>
                <div><dt>En remisión</dt><dd title={l.texto_cliente ? remision : 'Sin texto: la remisión usa el nombre del producto'}>
                    {l.texto_cliente ? <q>{remision}</q> : <span className="pv-muted">{remision}</span>}</dd></div>
            </dl>
            {notas && (
                <footer className="pv-tj__pie">
                    {!!l.adicionales?.length && <small className="pv-fila__recargos">{l.adicionales.map(a => `+ ${a.descripcion}`).join(' · ')}</small>}
                    <NotaDecorativos da={l.da_decorativos ? 2 : 0} incluido={l.decorativos_incluidos} />
                    <NotaTransporte compartido={l.transporte_compartido} />
                </footer>
            )}
        </li>
    );
}

// Conjunto en la vista (2026-10-24): cerrado es una tarjeta como la de un producto (una casilla
// de la grilla); al abrirlo ocupa toda la fila y muestra cada pieza con su proveedor y estado.
function TarjetaConjunto({ nombre, cantidad, piezas, verPrecios, costos = [] }) {
    const [abierto, setAbierto] = useState(false);
    const total = [...piezas, ...costos].reduce((s, l) => s + (Number(l.precio_lista_unitario) || 0) * l.cantidad, 0);
    const proveedores = [...new Set(piezas.map(l => l.proveedor_nombre).filter(Boolean))];
    const porPedir = piezas.reduce((s, l) => s + (l.por_pedir || 0), 0);
    const estados = piezas.map(estadoDe);
    const estado = porPedir ? { tono: 'pendiente', texto: `Por pedir ${porPedir}` } : estados.every(e => e.tono === 'ok') ? { tono: 'ok', texto: 'Recibido' } : { tono: 'curso', texto: 'Pedido' };
    const resumen = piezas.map(l => `${l.cantidad} ${l.variante_nombre || l.producto_nombre}`).join(' + ');
    const telas = piezas.filter(l => l.tela_modo && l.tela_modo !== 'no_aplica');
    const telaPorPedir = telas.some(l => l.tela_modo === 'aparte' && !l.tela_pedidos?.length);
    const cabeza = (
        <header className="pv-tj__cab">
            <span className="pv-tj__cant">{cantidad}<small>×</small></span>
            <button type="button" className="pv-tj__nombre pv-conj__abrir" aria-expanded={abierto} onClick={() => setAbierto(a => !a)}
                title={abierto ? 'Ocultar las piezas' : 'Ver las piezas'}>
                <strong><FaLayerGroup aria-hidden="true" /> {nombre} <FaChevronDown aria-hidden="true" className="pv-conj__flecha" /></strong>
                <span>Conjunto · {piezas.length} pieza{piezas.length === 1 ? '' : 's'}</span>
                <span className={`pv-estado pv-estado--${estado.tono} pv-tj__estado`}>{estado.texto}</span>
            </button>
            {verPrecios && <span className="pv-tj__precio">{total ? formatCOP(total) : '—'}</span>}
        </header>
    );
    if (!abierto) {
        return (
            <li className="pv-tj pv-tj--conjunto">
                {cabeza}
                <dl className="pv-tj__datos">
                    <div><dt>Piezas</dt><dd title={resumen}>{resumen}</dd></div>
                    <div><dt>Se compra a</dt><dd>{proveedores.length ? <b>{proveedores.join(' · ')}</b> : <em className="pv-aviso">Sin referencia</em>}</dd></div>
                    <div><dt>Tela / Cuero</dt><dd>{telas.length ? <>{telas.length} pieza{telas.length === 1 ? '' : 's'} {telaPorPedir
                        ? <span className="pv-tela-chip is-falta">por pedir</span> : <span className="pv-muted">con tela definida</span>}</> : <span className="pv-muted">No lleva</span>}</dd></div>
                    {verPrecios && costos.map(l => <div key={l.id}><dt>{l.producto_nombre}</dt><dd>{conSigno(Number(l.precio_lista_unitario) * (Number(l.cantidad) || 1))}</dd></div>)}
                </dl>
                <footer className="pv-tj__pie">
                    <button type="button" className="pv-link" onClick={() => setAbierto(true)}><FaChevronDown aria-hidden="true" /> Ver las {piezas.length} piezas</button>
                </footer>
            </li>
        );
    }
    return (
        <li className="pv-tj pv-tj--conjunto is-abierto">
            {cabeza}
            <small className="pv-muted">{proveedores.length > 1 ? `${proveedores.length} proveedores (${proveedores.join(', ')}): un pedido a cada uno` : 'Cada pieza se pide con su referencia'}</small>
            <ul className="pv-tarjetas pv-tarjetas--piezas">{piezas.map(l => <TarjetaProducto key={l.id} l={l} verPrecios={verPrecios} pieza />)}</ul>
            <CostosConjunto costos={costos} verPrecios={verPrecios} />
        </li>
    );
}

// Productos en bloques: los de un conjunto juntos (en el lugar de su primera pieza).
function bloques(lineas) {
    const vistos = new Map(), salida = [];
    lineas.forEach((l, i) => {
        if (!l.conjunto) { salida.push({ tipo: 'producto', l, i }); return; }
        if (!vistos.has(l.conjunto)) { const b = { tipo: 'conjunto', clave: l.conjunto, piezas: [] }; vistos.set(l.conjunto, b); salida.push(b); }
        vistos.get(l.conjunto).piezas.push({ l, i });
    });
    return salida;
}

export default function ProductosVenta({ ventaId, hasPermission, onActualizada }) {
    const queryClient = useQueryClient();
    const [datos, setDatos] = useState(null);
    const [lineas, setLineas] = useState([]);
    const [editando, setEditando] = useState(false);
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [ocupado, setOcupado] = useState('');
    const [bloque, setBloque] = useState(null); // 'proveedor' | 'telas'
    const [imagenes, setImagenes] = useState(null);
    const [vinculos, setVinculos] = useState({});
    const [intentoGuardar, setIntentoGuardar] = useState(false);
    const [faltasServidor, setFaltasServidor] = useState({});
    const { usuario } = useContext(AppContext) || {};
    const [catalogoTela, setCatalogoTela] = useState({ proveedores: [] });
    const [gruposTela, setGruposTela] = useState([]);
    const productosRef = useRef(null);
    useAlturaUniforme(productosRef, editando);
    const mutex = useRef(false);
    const intento = useRef(null);
    const navigate = useNavigate();
    const puedeEditar = hasPermission('EDITAR_PRODUCTOS_VENTA') || hasPermission('EDITAR_VENTA');
    const puedePedir = ['CREAR_ORDEN', 'CREAR_PROPIAS_ORDENES', 'CREAR_ORDENES_OTROS'].some(hasPermission);
    const verPrecios = hasPermission('VER_PRECIOS_VENTA');

    const recibir = (d) => { setDatos(d); setLineas(d.lineas); setVinculos({}); setIntentoGuardar(false); setFaltasServidor({}); };
    // Proveedores de tela: solo cuando se editan productos.
    useEffect(() => {
        if (!editando || catalogoTela.cargado) return undefined;
        let vivo = true;
        API.get('/proveedores-telas/', { params: { page_size: 100 } })
            .then(p => { if (vivo) setCatalogoTela({ cargado: true, proveedores: p.data.results || p.data || [] }); })
            .catch(() => {});
        // Grupos de tela y cuero con su costo (también para productos especiales).
        API.get('/productos-venta/catalogo/', { params: { solo_grupos: 1 } })
            .then(r => { if (vivo) { setGruposTela(r.data.grupos || []); } }).catch(() => {});
        return () => { vivo = false; };
    }, [editando]); // eslint-disable-line react-hooks/exhaustive-deps
    const cargar = () => API.get(`/ventas/${ventaId}/productos/`).then(r => recibir(r.data));
    useEffect(() => {
        let activa = true;
        API.get(`/ventas/${ventaId}/productos/`).then(r => { if (activa) recibir(r.data); }).catch(e => { if (activa) setError(errorTexto(e)); });
        return () => { activa = false; };
    }, [ventaId]);

    const ejecutar = async (nombre, fn) => {
        if (mutex.current) return;
        mutex.current = true; setOcupado(nombre); setError(''); setMensaje('');
        try { await fn(); } catch (e) { setError(errorTexto(e)); } finally { mutex.current = false; setOcupado(''); }
    };
    // Reintentar el mismo envío reutiliza la clave: no duplica productos ni pedidos.
    const postSeguro = (url, body) => {
        const huella = JSON.stringify({ url, body });
        if (intento.current?.huella !== huella) intento.current = { huella, key: crypto.randomUUID() };
        return API.post(url, body, { headers: { 'Idempotency-Key': intento.current.key } });
    };
    const cambiar = (i, patch, marcar = true) => {
        setLineas(ls => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
        if (marcar) { setMensaje(''); setFaltasServidor(f => (f[i] ? { ...f, [i]: undefined } : f)); }
    };
    const nombreLinea = (l, i) => (l.tipo && l.tipo !== 'producto'
        ? `${TIPOS_ADICIONAL[l.tipo]}${l.producto_nombre ? ` (${l.producto_nombre})` : ''}`
        : `Producto ${lineas.slice(0, i + 1).filter(x => (x.tipo || 'producto') === 'producto').length}${l.producto_nombre ? ` (${l.producto_nombre})` : ''}`);
    // Lo que falta: la regla local más lo que haya dicho el servidor en el último intento.
    const faltasDe = (l, i) => (intentoGuardar ? { ...faltantesDe(l, gruposTela), ...(faltasServidor[i] || {}) } : {});
    const irAlPrimerFaltante = () => setTimeout(() => {
        const campo = document.querySelector('.pv-editor .pv-campo.is-falta, .pv-editor input.is-falta, .pv-editor .pv-tela.is-falta');
        campo?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
        campo?.querySelector?.('input, select, textarea')?.focus?.({ preventScroll: true });
    }, 0);
    const guardar = () => {
        setIntentoGuardar(true);
        const conFaltas = lineas.map((l, i) => [i, faltantesDe(l, gruposTela)]).filter(([, f]) => Object.keys(f).length);
        if (conFaltas.length) {
            setMensaje('');
            setError(`No se guardó: faltan datos en ${conFaltas.map(([i, f]) => `${nombreLinea(lineas[i], i)}: ${Object.keys(f).map(nombreCampo).join(', ')}`).join(' · ')}.`);
            irAlPrimerFaltante();
            return;
        }
        ejecutar('guardar', async () => {
            try {
                const r = await postSeguro(`/ventas/${ventaId}/productos/`, { revision: datos.revision, lineas: lineas.map(entrada) });
                recibir(r.data); setEditando(false); setMensaje(lineas.length ? 'Productos guardados. El descuento se calculó con los precios de lista.' : 'Se quitaron todos los productos de la venta.');
                await onActualizada?.();
            } catch (e) {
                // Errores por campo del servidor: se señalan igual que los locales.
                const porLinea = e.response?.status === 400 && e.response.data?.lineas;
                if (porLinea && typeof porLinea === 'object' && !Array.isArray(porLinea)) {
                    setFaltasServidor(Object.fromEntries(Object.entries(porLinea).map(([i, err]) => [i,
                        typeof err === 'object' && !Array.isArray(err) ? Object.fromEntries(Object.entries(err).map(([c, m]) => [c, plano(m).join(' ')])) : { general: plano(err).join(' ') }])));
                    irAlPrimerFaltante();
                }
                throw e;
            }
        });
    };
    // Tras crear órdenes o pedidos de tela: recargar y descargar una imagen por pedido.
    const alCrear = async (texto, nuevas) => {
        setBloque(null);
        await cargar();
        setMensaje(`${texto} Descargando ${nuevas.length === 1 ? 'la imagen' : `${nuevas.length} imágenes`}…`);
        if (nuevas.length) setImagenes(nuevas);
        await onActualizada?.();
    };
    const cambiarGestion = (accion) => ejecutar('gestion', async () => {
        const r = await API.post(`/ventas/${ventaId}/gestion/`, { revision: datos.revision, accion });
        recibir(r.data); setMensaje(accion === 'finalizar' ? 'Gestión finalizada: ya solo queda esperar que llegue y entregar.' : 'La gestión volvió a pendiente.');
        await onActualizada?.();
    });
    const cancelar = () => { if (window.confirm('¿Descartar los cambios de productos?')) { setLineas(datos.lineas); setEditando(false); setBuscando(false); setError(''); setIntentoGuardar(false); setFaltasServidor({}); } };
    // Solo la lista de precios define los conjuntos y sus piezas; Ventas los agrega completos.
    const agregarDelCatalogo = (p) => {
        const clave = p.piezas?.length ? crypto.randomUUID() : '';
        const coleccion = p.referencia_nombre || String(p.nombre).split(' · ')[0];
        const veces = 1;
        const conj = clave ? { conjunto: clave, conjunto_nombre: p.nombre, conjunto_cantidad: veces } : {};
        // Conjunto de la lista: cada pieza con su proveedor (un pedido por proveedor) y su precio
        // dentro del conjunto; lo propio del conjunto (su Transporte…) va en una línea aparte.
        const costos = p.piezas?.length && Number(p.costos_conjunto) ? [nueva({ tipo: p.costos_conjunto_tipo || 'transporte', juego: p.id,
            producto_nombre: p.costos_conjunto_nombre || 'Transporte', precio_lista_override: String(Number(p.costos_conjunto) * veces),
            precio_lista_unitario: String(Number(p.costos_conjunto) * veces), _costo_por_conjunto: Number(p.costos_conjunto),
            tela_modo: 'no_aplica', sin_texto_proveedor: true, clave: crypto.randomUUID(), ...conj })] : [];
        const nuevas = p.piezas?.length
            ? [...p.piezas.map(pz => nueva({ variante: pz.variante, referencia: pz.referencia || null, juego: p.id, pieza: pz.pieza,
                producto_nombre: pz.referencia_nombre || coleccion, variante_nombre: pz.nombre, proveedor_nombre: pz.proveedor_nombre || '',
                cantidad: pz.cantidad * veces, clave: crypto.randomUUID(), ...conj })), ...costos]
            : [nueva({ variante: p.id, referencia: p.referencia || null,
                producto_nombre: p.referencia_nombre || p.nombre, variante_nombre: p.subcategoria_nombre || '',
                clave: crypto.randomUUID(), ...conj })];
        setLineas(ls => [...ls, ...nuevas]);
        setBuscando(false);
    };
    const enConjunto = (clave, fn) => { setLineas(ls => ls.map(l => (l.conjunto === clave ? { ...l, ...fn(l) } : l))); setMensaje(''); };
    const conjuntoOps = (clave) => ({
        renombrar: (nombre) => enConjunto(clave, () => ({ conjunto_nombre: nombre })),
        // Cuántos conjuntos iguales: cada pieza conserva su cantidad por conjunto.
        cambiarCantidad: (n) => enConjunto(clave, l => {
            const antes = Number(l.conjunto_cantidad) || 1;
            if (esCostoConjunto(l)) {
                const unidad = l._costo_por_conjunto ?? Number(l.precio_lista_unitario) / antes;
                return { conjunto_cantidad: n, cantidad: 1, _costo_por_conjunto: unidad, precio_lista_override: String(unidad * n), precio_lista_unitario: String(unidad * n) };
            }
            return { conjunto_cantidad: n, cantidad: Math.max(1, Math.round((Number(l.cantidad) || 1) / antes) * n) };
        }),
        quitar: () => { if (window.confirm('¿Quitar el conjunto completo con todas sus piezas?')) setLineas(ls => ls.filter(l => l.conjunto !== clave)); },
    });
    // «Usar esta tela en las demás piezas»: copia la tela a las piezas del conjunto que
    // llevan tela (o cuyo precio depende de ella), sin tocar las que ya se pidieron.
    const copiarTela = (i) => {
        const o = lineas[i];
        const campos = { tela_modo: o.tela_modo, tela_material: esCuero(o) ? 'cuero' : 'tela', grupo_es_cuero: esCuero(o), tela_referencia: o.tela_referencia,
            tela_color: o.tela_color, tela_proveedor: o.tela_proveedor, tela_proveedor_nombre: o.tela_proveedor_nombre, tela_costo: o.tela_costo,
            tela_grupo: o.tela_grupo || o.grupo_catalogo || null, _costo_manual: o._costo_manual };
        setLineas(ls => ls.map((l, j) => (j !== i && l.conjunto === o.conjunto && !l.tela_pedidos?.length && (l._requiere_grupo || (l.tela_modo && l.tela_modo !== 'no_aplica'))
            ? { ...l, ...campos, ...(l._requiere_grupo ? { grupo_catalogo: campos.tela_grupo } : {}) } : l)));
        setMensaje('La tela se copió a las demás piezas del conjunto. Revisa la cantidad de cada una.');
    };
    const agregarAdicional = (tipo) => setLineas(ls => [...ls, nueva({ tipo, clave: crypto.randomUUID(), tela_modo: 'no_aplica', sin_texto_proveedor: true,
        producto_nombre: tipo === 'transporte' ? 'Transporte' : '', precio_lista_override: null, _signo: -1 })]);

    if (error && !datos) return <section className="pv"><p role="alert" className="pv-error">{error}</p></section>;
    if (!datos) return <ProductosEsqueleto />;
    const visibles = editando ? lineas : datos.lineas;
    const totalLista = visibles.reduce((s, l) => s + (Number(l.precio_lista_unitario) || 0) * (Number(l.cantidad) || 0), 0);
    const pendientes = datos.lineas.filter(l => l.por_pedir > 0);
    const margenes = datos.lineas.map(l => l.margen).filter(m => m != null);
    const margen = hasPermission('VER_MARGENES') && margenes.length ? margenes.reduce((s, m) => s + Number(m), 0) : null;
    const unidadesPorPedir = pendientes.reduce((s, l) => s + l.por_pedir, 0);
    const telasPorPedir = datos.lineas.filter(l => l.tela_modo === 'aparte' && !l.tela_pedidos?.length);
    const esProducto = (l) => (l.tipo || 'producto') === 'producto';
    const productosVista = datos.lineas.filter(esProducto);
    const productosEditados = lineas.filter(esProducto);

    return (
        <section className="pv" aria-label="Productos de la venta">
            <header className="pv-head">
                <h4>Productos <span className="pv-contador">{(editando ? productosEditados : productosVista).length}</span></h4>
                {verPrecios && <Resumen lista={totalLista} venta={Number(datos.valor_total)} margen={editando ? null : margen} />}
                {puedeEditar && !editando && (
                    <Button size="sm" variant="secondary" icon={datos.lineas.length ? FaEdit : FaPlus} onClick={() => { queryClient.prefetchInfiniteQuery(consultaCatalogo('')); setEditando(true); setMensaje(''); if (!datos.lineas.length) setBuscando(true); }}>
                        {datos.lineas.length ? 'Editar productos' : 'Agregar productos'}
                    </Button>
                )}
            </header>

            {!editando && <Gestion gestion={datos.gestion} puede={puedeEditar || hasPermission('EDITAR_ESTADO_PEDIDOS_VENTA')} ocupado={ocupado}
                finalizar={() => cambiarGestion('finalizar')} reabrir={() => cambiarGestion('reabrir')} />}

            {error && <div className="pv-alerta" role="alert">{error}
                {/409|cambiaron/i.test(error) && <button type="button" className="pv-link" onClick={() => ejecutar('recargar', async () => { await cargar(); setEditando(false); })}>Recargar y descartar mis cambios</button>}
            </div>}
            {mensaje && <p className="pv-ok" role="status">{mensaje}</p>}

            {editando ? (
                <div className="pv-editor">
                    <p className="pv-guia">Cada producto necesita tres cosas: <b>a quién se compra</b>, <b>si lleva tela o cuero</b> y <b>el texto para el proveedor</b>. Las marcas ✓ te dicen qué está listo.</p>
                    {/* Tarjetas en grilla (2026-10-24): varias por fila en pantallas anchas. */}
                    <div className="pv-editor__productos" ref={productosRef}>
                    {bloques(lineas.map((l, i) => ({ ...l, _i: i })).filter(esProducto)).map(b => {
                        const editor = ({ l }) => {
                            const i = l._i;
                            return <EditorProducto key={l.id || l.clave || `nueva-${i}`} ventaId={ventaId} linea={lineas[i]} indice={i} numero={lineas.slice(0, i + 1).filter(esProducto).length}
                                hasPermission={hasPermission} proveedoresTela={catalogoTela.proveedores} grupos={gruposTela} enConjunto={!!l.conjunto} faltas={faltasDe(lineas[i], i)}
                                copiarTela={l.conjunto && lineas.filter(x => x.conjunto === l.conjunto).length > 1 ? () => copiarTela(i) : undefined}
                                actualizarPrecio={l.conjunto ? () => enConjunto(l.conjunto, () => ({ recalcular: true })) : () => cambiar(i, { recalcular: true })}
                                cambiar={(p, m) => cambiar(i, p, m)} quitar={() => setLineas(ls => ls.filter((_, idx) => idx !== i))} />;
                        };
                        if (b.tipo === 'producto') return editor(b);
                        const piezas = b.piezas.map(x => lineas[x.l._i]);
                        const ops = conjuntoOps(b.clave);
                        return (
                            <EditorConjunto key={b.clave} nombre={piezas[0].conjunto_nombre || ''} cantidad={Number(piezas[0].conjunto_cantidad) || 1} piezas={piezas}
                                costos={lineas.filter(x => esCostoConjunto(x) && x.conjunto === b.clave)}
                                faltaNombre={intentoGuardar && !String(piezas[0].conjunto_nombre || '').trim() ? 'Ponle nombre al conjunto.' : ''}
                                faltan={b.piezas.filter(x => Object.keys(faltasDe(lineas[x.l._i], x.l._i)).length).length} {...ops}>
                                {b.piezas.map(editor)}
                            </EditorConjunto>
                        );
                    })}
                    </div>
                    {buscando ? (
                        <BuscadorCatalogo cerrar={() => setBuscando(false)} alElegir={agregarDelCatalogo} />
                    ) : (
                        <div className="pv-agregar" role="group" aria-label="Agregar a la venta">
                            <button type="button" className="pv-agregar__op" onClick={() => setBuscando(true)}>
                                <FaPlus aria-hidden="true" /><span><strong>Agregar de la lista de precios</strong><small>Productos y conjuntos con sus precios</small></span>
                            </button>
                            {hasPermission('AJUSTAR_PRECIO_LISTA_VENTA') && (
                                <button type="button" className="pv-agregar__op" onClick={() => setLineas(ls => [...ls, nueva({ clave: crypto.randomUUID() })])}>
                                    <FaEdit aria-hidden="true" /><span><strong>Producto especial</strong><small>Fuera de catálogo, con precio autorizado</small></span>
                                </button>
                            )}
                        </div>
                    )}
                    <div className="pv-adicionales">
                        <div className="pv-adicionales__cabeza">
                            <h5>Servicios y ajustes</h5>
                            <small className="pv-muted">Transporte, artículos que no son productos del catálogo (jarrones, decoración) y ajustes de la negociación. Suman o restan al precio de lista.</small>
                        </div>
                        {lineas.map((l, i) => (!esProducto(l) && !(esCostoConjunto(l) && l.conjunto) && (
                            <EditorAdicional key={l.id || l.clave || `adic-${i}`} linea={l} faltas={faltasDe(l, i)}
                                cambiar={(p, m) => cambiar(i, p, m)} quitar={() => setLineas(ls => ls.filter((_, idx) => idx !== i))} />
                        )))}
                        <div className="pv-ed__mas">
                            <button type="button" className="pv-link" onClick={() => agregarAdicional('transporte')}>+ Transporte</button>
                            <button type="button" className="pv-link" onClick={() => agregarAdicional('articulo')}>+ Artículo adicional</button>
                            <button type="button" className="pv-link" onClick={() => agregarAdicional('ajuste')}>+ Ajuste (suma o resta)</button>
                        </div>
                    </div>
                    <footer className="pv-pie">
                        <div className="pv-pie__total">
                            <span>{productosEditados.length} producto{productosEditados.length === 1 ? '' : 's'} · lista <strong>{formatCOP(totalLista)}</strong></span>
                            <small className="pv-muted">La entrega es la de la venta. El descuento se calcula con los precios de lista.</small>
                        </div>
                        <div className="pv-pie__acciones">
                            <Button size="sm" variant="secondary" onClick={cancelar} disabled={!!ocupado}>Cancelar</Button>
                            <Button size="sm" onClick={guardar} loading={ocupado === 'guardar'} disabled={!lineas.length && !datos.lineas.length}>Guardar productos</Button>
                        </div>
                    </footer>
                </div>
            ) : datos.lineas.length ? (
                <>
                    {productosVista.length > 0 && <>
                        <ul className="pv-tarjetas">{bloques(productosVista).map(b => (b.tipo === 'producto'
                            ? <TarjetaProducto key={b.l.id} l={b.l} verPrecios={verPrecios} />
                            : <TarjetaConjunto key={b.clave} nombre={b.piezas[0].l.conjunto_nombre} cantidad={b.piezas[0].l.conjunto_cantidad || 1} piezas={b.piezas.map(x => x.l)} verPrecios={verPrecios}
                                costos={datos.lineas.filter(x => esCostoConjunto(x) && x.conjunto === b.clave)} />))}</ul>
                    </>}
                    <Servicios lineas={datos.lineas.filter(l => !esProducto(l) && !(esCostoConjunto(l) && l.conjunto && productosVista.some(x => x.conjunto === l.conjunto)))} verPrecios={verPrecios} />
                </>
            ) : (
                <div className="pv-vacio"><FaBoxOpen aria-hidden="true" /><span>Aún no se registran los productos de esta venta.</span></div>
            )}

            {!editando && !!datos.pedidos_sin_vincular?.length && (
                <div className="pv-bloque">
                    <h5>Pedidos anteriores sin producto</h5>
                    <p className="pv-muted">Estas órdenes se hicieron antes de registrar los productos. Di a qué producto corresponde cada una para no pedirlo dos veces, o márcala como ajena a esta venta.</p>
                    {datos.pedidos_sin_vincular.map(p => (
                        <label key={p.detalle} className="pv-vinculo"><span><strong>OP {p.pedido}</strong> · {p.cantidad} × {p.referencia_nombre}{p.texto ? <small> — {p.texto}</small> : null}</span>
                            <select value={vinculos[p.detalle] || ''} aria-label={`Producto de la OP ${p.pedido} (${p.referencia_nombre})`} disabled={!puedeEditar || !!ocupado}
                                onChange={e => setVinculos(v => ({ ...v, [p.detalle]: e.target.value }))}>
                                <option value="">¿A qué producto corresponde?</option>
                                {productosVista.filter(l => !l.inventario_origen).sort((a, b) => (b.referencia === p.referencia) - (a.referencia === p.referencia)).map(l => (
                                    <option key={l.id} value={l.id}>{l.cantidad} × {l.producto_nombre}{l.referencia_nombre ? ` (ref. ${l.referencia_nombre})` : ''}{l.referencia === p.referencia ? ' — misma referencia' : ''}</option>
                                ))}
                                <option value="ninguno">No es de un producto de esta venta</option>
                            </select>
                        </label>
                    ))}
                    {!productosVista.length && <p className="pv-aviso">Primero registra los productos de la venta para poder relacionar estas órdenes.</p>}
                    <Button size="sm" variant="secondary" disabled={!puedeEditar || !!ocupado || !Object.values(vinculos).some(Boolean)} onClick={() => ejecutar('vincular', async () => {
                        const r = await postSeguro(`/ventas/${ventaId}/productos/vincular-pedidos/`, { revision: datos.revision,
                            vinculos: Object.entries(vinculos).filter(([, l]) => l).map(([d, l]) => ({ detalle: Number(d), linea: l === 'ninguno' ? null : Number(l) })) });
                        recibir(r.data); setMensaje('Pedidos anteriores relacionados.'); await onActualizada?.();
                    })}>Guardar</Button>
                </div>
            )}

            {!editando && bloque === 'proveedor' && (
                <PedirProveedor datos={datos} pendientes={pendientes} ocupado={ocupado} ejecutar={ejecutar} postSeguro={postSeguro}
                    cancelar={() => setBloque(null)} alCrear={alCrear} />
            )}
            {!editando && bloque === 'telas' && (
                <PedirTelas datos={datos} lineas={telasPorPedir} usuario={usuario} ocupado={ocupado} ejecutar={ejecutar}
                    cancelar={() => setBloque(null)} alCrear={alCrear} />
            )}

            {!editando && !bloque && datos.lineas.length > 0 && (
                <div className="pv-acciones">
                    {puedePedir && pendientes.length > 0 && (
                        <Button size="sm" icon={FaTruck} disabled={!!ocupado || !!datos.pedidos_sin_vincular?.length}
                            onClick={() => setBloque('proveedor')}>
                            Preparar pedido{pendientes.length > 1 ? 's' : ''} ({unidadesPorPedir} u.)
                        </Button>
                    )}
                    {hasPermission('CREAR_PEDIDO_TELA') && telasPorPedir.length > 0 && (
                        <Button size="sm" variant="secondary" disabled={!!ocupado} onClick={() => setBloque('telas')}>
                            Pedir telas ({telasPorPedir.length})
                        </Button>
                    )}
                    {hasPermission('CREAR_REMISION') && <Button size="sm" variant="ghost" onClick={() => navigate(`/suministros/remisiones/nueva?venta=${ventaId}`)}>Preparar remisión</Button>}
                </div>
            )}
            {imagenes && (
                <GeneradorImagenes imagenes={imagenes} alTerminar={(hechas, total) => {
                    setImagenes(null);
                    setMensaje(m => m.replace(/ Descargando.*$/, hechas === total ? ` Se descargaron ${total === 1 ? 'la imagen' : `las ${total} imágenes`}.` : ` Se descargaron ${hechas} de ${total} imágenes; revisa los permisos de descarga del navegador.`));
                }} />
            )}
        </section>
    );
}
