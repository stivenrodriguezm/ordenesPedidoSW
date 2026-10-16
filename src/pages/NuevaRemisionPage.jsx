import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import API from '../services/api';
import { useVendedores } from '../hooks/useSharedData';
import { formatCOP } from '../utils/formatCOP';
import { getTodayStr, formatDateCorta } from '../utils/dates';
import {
    ESTADOS_REMISION, METODOS_PAGO, FRANJAS, fmtHora, fmtFechaLarga, descripcionInventario,
    metodoPagoAApi, metodoPagoLabel,
} from '../utils/remisiones';
import RemisionPrintModal from '../components/RemisionPrintModal';
import {
    ProductoEditable, DescripcionInventario, ReferenciasDatalist, useCatalogoRemision, TelaProducto,
    productoVacio, productoEnBlanco, productoIncompleto, productoAApi,
} from '../components/RemisionProductos';
import {
    FaTruck, FaSearch, FaTimes, FaPlus, FaTrash, FaChevronLeft, FaChevronDown, FaChevronUp,
    FaExclamationTriangle, FaCheck, FaQrcode, FaWarehouse, FaBoxOpen, FaPen, FaSpinner, FaUsers,
    FaStore, FaInfoCircle,
} from 'react-icons/fa';
import { AppContext, usePermissions } from '../AppContext';
import { PageHeader, Button } from '../components/ui';
import './NuevaRemisionPage.css';

const estadoLabel = estado => ESTADOS_REMISION[estado]?.label || estado;

// Estados de la orden de pedido en los que el producto probablemente aún no llega a bodega.
const PEDIDO_SIN_LLEGAR = ['pendiente', 'en_proceso'];

const emptyForm = () => ({
    fechaEntrega: '',
    horaDesde: '08:00',
    horaHasta: '12:00',
    direccionEntrega: '',
    ciudad: 'Bogotá',
    barrio: '',
    clienteNombre: '',
    clienteDocumento: '',
    telefono1: '',
    telefono2: '',
    sinSaldo: false,
    saldo: '',
    metodoPago: '',
    metodoOtro: '',
    transportadorUsuario: '',
    transportador: '',
    vendedor: '',
    novedades: '',
});

// Campos que se llenan solos a partir de la(s) venta(s) elegida(s). Si el usuario
// edita uno a mano, el autocompletado deja de tocarlo.
const AUTO_KEYS = [
    'clienteNombre', 'clienteDocumento', 'telefono1', 'telefono2',
    'direccionEntrega', 'barrio', 'ciudad', 'vendedor', 'saldo', 'sinSaldo', 'fechaEntrega',
];

const toInt = v => Math.round(parseFloat(v) || 0);
const onlyDigits = v => String(v ?? '').replace(/[^0-9]/g, '');

function autofillDesde(ventas) {
    if (!ventas.length) {
        const base = emptyForm();
        return Object.fromEntries(AUTO_KEYS.map(k => [k, base[k]]));
    }
    const principal = ventas[0];
    const c = principal.cliente || {};
    const saldo = ventas.reduce((s, v) => s + toInt(v.saldo), 0);
    const hoy = getTodayStr();
    return {
        clienteNombre: c.nombre || '',
        clienteDocumento: c.cedula || '',
        telefono1: c.telefono1 || '',
        telefono2: c.telefono2 || '',
        direccionEntrega: c.direccion || '',
        barrio: c.barrio || '',
        ciudad: c.ciudad || 'Bogotá',
        vendedor: principal.vendedor ? String(principal.vendedor) : '',
        saldo: saldo > 0 ? String(saldo) : '',
        sinSaldo: saldo <= 0,
        fechaEntrega: principal.fecha_entrega && principal.fecha_entrega >= hoy ? principal.fecha_entrega : '',
    };
}

function primerMensajeError(data) {
    if (!data) return null;
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) {
        for (const d of data) {
            const m = primerMensajeError(d);
            if (m) return m;
        }
        return null;
    }
    if (typeof data === 'object') {
        if (data.error) return data.error;
        if (data.detail) return data.detail;
        for (const v of Object.values(data)) {
            const m = primerMensajeError(v);
            if (m) return m;
        }
    }
    return null;
}

let manualSeq = 0;
const nuevoManual = (datos = {}) => ({ key: ++manualSeq, venta: null, ...productoVacio(datos) });

// Línea de orden de pedido lista para editar: la descripción arranca con el texto del
// pedido (escrito para el proveedor) y el vendedor la ajusta para el cliente.
// Lo que falta por entregar de una línea de pedido: descuenta lo recibido como
// unidad de inventario y lo ya remisionado (P11-01/P11-03). Respuestas antiguas
// sin el campo usan la cantidad completa.
const porRemisionar = p => p.cantidad_por_remisionar ?? p.cantidad;
const pedidoPendiente = p => !p.en_inventario && !p.remision_previa && porRemisionar(p) > 0;

// Tapizado que trae cada producto de inventario desde su línea de venta.
const telasDeInventario = inventario => Object.fromEntries(inventario.filter(i => i.tela).map(i => [i.id_referencia, i.tela]));

const lineaDePedido = p => ({
    incluido: true,
    ...productoVacio({
        categoria: p.categoria ?? null,
        subcategoria: p.subcategoria ?? null,
        referencia: p.referencia_nombre || '',
        descripcion: p.especificaciones || '',
        tela: p.tela || '',
        cantidad: porRemisionar(p) || 1,
    }),
});


/* ────────────────────────────────────────────────────────────────────────────
   Selector de ventas (búsqueda con teclado)
   ──────────────────────────────────────────────────────────────────────────── */
function VentaPicker({ excluidas, onSelect, cargandoId, autoFocus, placeholder }) {
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [opciones, setOpciones] = useState([]);
    const [resultadosDe, setResultadosDe] = useState(null); // búsqueda a la que corresponden `opciones`
    const [cargando, setCargando] = useState(false);
    const [activo, setActivo] = useState(0);
    const wrapRef = useRef(null);
    const reqRef = useRef(0);
    // Enter presionado antes de que llegaran los resultados de lo escrito: se resuelve al llegar.
    const enterPendienteRef = useRef(false);
    const excluidasRef = useRef(excluidas);
    excluidasRef.current = excluidas;

    // El número exacto de venta va primero aunque la búsqueda también coincida por cédula.
    const ordenar = (lista, busqueda) => {
        const exacto = /^\d+$/.test(busqueda) ? Number(busqueda) : null;
        if (exacto === null) return lista;
        return [...lista].sort((a, b) => (b.id === exacto) - (a.id === exacto));
    };

    const elegir = o => {
        if (!o) return;
        onSelect(o);
        setQ('');
        setOpen(false);
    };

    useEffect(() => {
        if (!open) return undefined;
        const busqueda = q.trim();
        const t = setTimeout(async () => {
            const id = ++reqRef.current;
            setCargando(true);
            try {
                const params = busqueda ? { search: busqueda } : {};
                const res = await API.get('/suministros/remisiones/ventas-disponibles/', { params });
                if (id !== reqRef.current) return;
                const lista = ordenar(Array.isArray(res.data) ? res.data : [], busqueda);
                setOpciones(lista);
                setResultadosDe(busqueda);
                setActivo(0);
                if (enterPendienteRef.current) {
                    enterPendienteRef.current = false;
                    const primera = lista.find(o => !excluidasRef.current.includes(o.id));
                    if (primera) elegir(primera);
                }
            } catch {
                if (id === reqRef.current) {
                    setOpciones([]);
                    setResultadosDe(busqueda);
                    enterPendienteRef.current = false;
                }
            } finally {
                if (id === reqRef.current) setCargando(false);
            }
        }, busqueda ? 250 : 0);
        return () => clearTimeout(t);
    }, [q, open]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const cerrar = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', cerrar);
        return () => document.removeEventListener('mousedown', cerrar);
    }, []);

    const visibles = opciones.filter(o => !excluidas.includes(o.id));
    const resultadosAlDia = resultadosDe === q.trim() && !cargando;

    const onKeyDown = e => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActivo(a => Math.min(a + 1, visibles.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActivo(a => Math.max(a - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (!open) {
                setOpen(true);
                enterPendienteRef.current = true;
            } else if (resultadosAlDia) {
                elegir(visibles[activo]);
            } else {
                enterPendienteRef.current = true;
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div className="nr-picker" ref={wrapRef}>
            <div className={`nr-picker__box${open ? ' is-open' : ''}`}>
                <FaSearch className="nr-picker__icon" />
                <input
                    className="nr-picker__input"
                    value={q}
                    autoFocus={autoFocus}
                    placeholder={placeholder}
                    onChange={e => { setQ(e.target.value); setOpen(true); enterPendienteRef.current = false; }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    aria-label="Buscar venta"
                />
                {(cargando || cargandoId) && <FaSpinner className="nr-spin nr-picker__spinner" />}
            </div>

            {open && (
                <div className={`nr-picker__menu${resultadosAlDia ? '' : ' is-stale'}`} role="listbox">
                    {!q && <div className="nr-picker__caption">Ventas pendientes por entregar</div>}
                    {visibles.length === 0 && resultadosAlDia && (
                        <div className="nr-picker__empty">
                            {q ? `No hay ventas pendientes que coincidan con “${q}”.` : 'No tienes ventas pendientes por entregar.'}
                        </div>
                    )}
                    {visibles.map((o, idx) => (
                        <button
                            type="button"
                            key={o.id}
                            role="option"
                            aria-selected={idx === activo}
                            className={`nr-picker__opt${idx === activo ? ' is-active' : ''}`}
                            onMouseEnter={() => setActivo(idx)}
                            onClick={() => elegir(o)}
                        >
                            <div className="nr-picker__opt-main">
                                <span className="nr-picker__num">#{o.id}</span>
                                <span className="nr-picker__cliente">{o.cliente_nombre}</span>
                                <span className="nr-picker__saldo">
                                    {toInt(o.saldo) > 0 ? <>Saldo {formatCOP(o.saldo)}</> : <span className="nr-ok-text">Pagada</span>}
                                </span>
                            </div>
                            <div className="nr-picker__opt-meta">
                                {o.cliente_cedula && <span>CC {o.cliente_cedula}</span>}
                                <span>Vendida {formatDateCorta(o.fecha_venta)}</span>
                                {o.fecha_entrega && <span>Entrega pactada {formatDateCorta(o.fecha_entrega)}</span>}
                                {!o.es_mia && o.vendedor_nombre && <span>{o.vendedor_nombre}</span>}
                                {o.es_compartida && <span className="nr-tag nr-tag--info"><FaUsers /> Compartida</span>}
                                {o.remisiones?.map(r => (
                                    <span key={r.id} className="nr-tag nr-tag--warn">Remisión #{r.id} · {estadoLabel(r.estado)}</span>
                                ))}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}


/* ────────────────────────────────────────────────────────────────────────────
   Productos de una venta (inventario + líneas de órdenes de pedido)
   ──────────────────────────────────────────────────────────────────────────── */
function ProductoInfo({ titulo, meta, badge, children }) {
    return (
        <div className="nr-prod__info">
            <div className="nr-prod__title-row">
                <span className="nr-prod__title">{titulo}</span>
                {badge}
            </div>
            {meta && <div className="nr-prod__meta">{meta}</div>}
            {children}
        </div>
    );
}

function metaInventario(i, conVariacion = true) {
    return [
        [i.categoria_nombre, i.subcategoria_nombre].filter(Boolean).join(' · '),
        conVariacion && i.variacion && `Detalle: ${i.variacion}`,
    ].filter(Boolean).join('  ·  ');
}

function VentaProductos({
    venta, selInv, onToggleInv, onToggleVarios, textosInv, onEditTextoInv, telasInv, onEditTelaInv,
    pedLineas, onTogglePed, onEditPed, multiVenta, catalogo, marcarErrores,
}) {
    const [verBloqueados, setVerBloqueados] = useState(false);

    const disponibles = venta.inventario.filter(i => i.seleccionable);
    const bloqueados = venta.inventario.filter(i => !i.seleccionable);
    const pedPendientes = venta.pedidos.filter(pedidoPendiente);
    const pedRemisionados = venta.pedidos.filter(p => p.remision_previa);

    // Agrupar ítems de inventario por "grupo" (juegos: comedor, sala…)
    const bloques = useMemo(() => {
        const grupos = new Map();
        const sueltos = [];
        disponibles.forEach(i => {
            if (i.grupo_id) {
                if (!grupos.has(i.grupo_id)) grupos.set(i.grupo_id, { id: i.grupo_id, nombre: i.grupo_nombre, items: [] });
                grupos.get(i.grupo_id).items.push(i);
            } else {
                sueltos.push(i);
            }
        });
        return { grupos: [...grupos.values()], sueltos };
    }, [venta.inventario]); // eslint-disable-line react-hooks/exhaustive-deps

    const totalSel = disponibles.filter(i => selInv.has(i.id_referencia)).length
        + pedPendientes.filter(p => pedLineas[p.detalle_id]?.incluido).length;
    const total = disponibles.length + pedPendientes.length;
    const idsTodos = disponibles.map(i => i.id_referencia);
    const detallesTodos = pedPendientes.map(p => p.detalle_id);

    // Marcado, la descripción se puede cambiar solo para esta remisión.
    const filaInv = (i, anidado = false) => {
        const checked = selInv.has(i.id_referencia);
        return (
            <div key={i.id_referencia} className={`nr-prod nr-prod--inv${checked ? ' is-checked' : ''}${anidado ? ' is-nested' : ''}`}>
                <label className="nr-prod__pick">
                    <input type="checkbox" className="nr-check" checked={checked} onChange={() => onToggleInv(i.id_referencia)} />
                    <ProductoInfo
                        titulo={i.producto_nombre || 'Producto sin referencia'}
                        meta={metaInventario(i, !checked)}
                        badge={<span className="nr-code">{i.id_referencia}</span>}
                    >
                        {i.disponibilidad === 'por_reparar' && (
                            <span className="nr-tag nr-tag--warn"><FaExclamationTriangle /> Marcado por reparar</span>
                        )}
                    </ProductoInfo>
                </label>
                {checked && (
                    <div className="rp-inv-bloque">
                        <DescripcionInventario
                            value={textosInv[i.id_referencia]}
                            original={descripcionInventario(i)}
                            onChange={t => onEditTextoInv(i.id_referencia, t)}
                        />
                        <div className="rp-inv"><TelaProducto value={telasInv[i.id_referencia]} onChange={t => onEditTelaInv(i.id_referencia, t)} /></div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="nr-venta-prod">
            <div className="nr-venta-prod__head">
                <div>
                    <span className="nr-venta-prod__title">
                        {multiVenta ? `Venta #${venta.id}` : 'Productos de la venta'}
                    </span>
                    {multiVenta && <span className="nr-venta-prod__cliente"> · {venta.cliente?.nombre}</span>}
                </div>
                {total > 0 && (
                    <div className="nr-venta-prod__actions">
                        <span className="nr-count">{totalSel} de {total}</span>
                        <button type="button" className="nr-link" onClick={() => onToggleVarios(idsTodos, detallesTodos, true)}>Todos</button>
                        <button type="button" className="nr-link" onClick={() => onToggleVarios(idsTodos, detallesTodos, false)}>Ninguno</button>
                    </div>
                )}
            </div>

            {total === 0 && (
                <div className="nr-empty-note">
                    <FaInfoCircle />
                    <span>
                        Esta venta no tiene productos pendientes registrados (ni en inventario ni en órdenes de pedido).
                        Escríbelos abajo en <strong>Otros productos</strong>.
                    </span>
                </div>
            )}

            {disponibles.length > 0 && (
                <div className="nr-prod-group">
                    <div className="nr-prod-group__label"><FaWarehouse /> En bodega · inventario</div>
                    <p className="nr-prod-group__hint">
                        La descripción es la que sale en la remisión: ajústala si hace falta. El inventario no cambia.
                    </p>
                    {bloques.grupos.map(g => {
                        const ids = g.items.map(i => i.id_referencia);
                        const n = ids.filter(id => selInv.has(id)).length;
                        return (
                            <div key={g.id} className="nr-juego">
                                <label className="nr-juego__head">
                                    <input
                                        type="checkbox"
                                        className="nr-check"
                                        checked={n === ids.length}
                                        ref={el => { if (el) el.indeterminate = n > 0 && n < ids.length; }}
                                        onChange={() => onToggleVarios(ids, [], n !== ids.length)}
                                    />
                                    <span className="nr-juego__name">{g.nombre || 'Juego'}</span>
                                    <span className="nr-juego__count">{ids.length} piezas</span>
                                </label>
                                {g.items.map(i => filaInv(i, true))}
                            </div>
                        );
                    })}
                    {bloques.sueltos.map(i => filaInv(i))}
                </div>
            )}

            {pedPendientes.length > 0 && (
                <div className="nr-prod-group">
                    <div className="nr-prod-group__label">
                        <FaStore /> Pedidos de la venta · aún no están en inventario
                    </div>
                    <p className="nr-prod-group__hint">
                        La descripción viene del pedido, escrita para el proveedor: ajústala para el cliente.
                    </p>
                    <div className="rp-list">
                        {pedPendientes.map(p => {
                            const linea = pedLineas[p.detalle_id];
                            if (!linea) return null;
                            const sinLlegar = PEDIDO_SIN_LLEGAR.includes(p.orden_estado);
                            return (
                                <ProductoEditable
                                    key={p.detalle_id}
                                    item={linea}
                                    catalogo={catalogo}
                                    incluido={linea.incluido}
                                    onToggle={() => onTogglePed(p.detalle_id)}
                                    onChange={patch => onEditPed(p.detalle_id, patch)}
                                    original={p.especificaciones || ''}
                                    error={marcarErrores && linea.incluido && productoIncompleto(linea)
                                        ? 'Indica la referencia, la subcategoría o la descripción.' : null}
                                    aviso={sinLlegar && (
                                        <span className="nr-tag nr-tag--warn">
                                            <FaExclamationTriangle /> El pedido está {p.orden_estado_label.toLowerCase()}: puede que aún no haya llegado
                                        </span>
                                    )}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {(bloqueados.length > 0 || pedRemisionados.length > 0) && (
                <div className="nr-bloqueados">
                    <button type="button" className="nr-link nr-link--muted" onClick={() => setVerBloqueados(v => !v)}>
                        {verBloqueados ? <FaChevronUp /> : <FaChevronDown />}
                        {' '}{bloqueados.length + pedRemisionados.length} producto(s) ya entregados o en otra remisión
                    </button>
                    {verBloqueados && (
                        <div className="nr-bloqueados__list">
                            {bloqueados.map(i => (
                                <div key={i.id_referencia} className="nr-prod is-disabled">
                                    <input type="checkbox" className="nr-check" disabled checked={false} readOnly />
                                    <ProductoInfo
                                        titulo={i.producto_nombre || 'Producto'}
                                        meta={metaInventario(i)}
                                        badge={<span className="nr-code">{i.id_referencia}</span>}
                                    >
                                        <span className="nr-tag nr-tag--muted">{i.motivo}</span>
                                    </ProductoInfo>
                                </div>
                            ))}
                            {pedRemisionados.map(p => (
                                <div key={p.detalle_id} className="nr-prod is-disabled">
                                    <input type="checkbox" className="nr-check" disabled checked={false} readOnly />
                                    <ProductoInfo
                                        titulo={p.referencia_nombre || 'Producto del pedido'}
                                        meta={p.especificaciones}
                                    >
                                        <span className="nr-tag nr-tag--muted">Ya remisionado en #{p.remision_previa}</span>
                                    </ProductoInfo>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}


/* ────────────────────────────────────────────────────────────────────────────
   Búsqueda en bodega (exhibición / consignación) y QR
   ──────────────────────────────────────────────────────────────────────────── */
function BuscadorBodega({ onAgregar, yaAgregados }) {
    const [q, setQ] = useState('');
    const [qr, setQr] = useState('');
    const [resultados, setResultados] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [buscandoQr, setBuscandoQr] = useState(false);
    const [errorQr, setErrorQr] = useState('');
    const reqRef = useRef(0);

    useEffect(() => {
        const t = setTimeout(async () => {
            const id = ++reqRef.current;
            setCargando(true);
            try {
                const res = await API.get('/suministros/remisiones/inventario-disponible/', { params: { search: q.trim() } });
                if (id === reqRef.current) setResultados(Array.isArray(res.data) ? res.data : []);
            } catch {
                if (id === reqRef.current) setResultados([]);
            } finally {
                if (id === reqRef.current) setCargando(false);
            }
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    const buscarQr = async () => {
        const codigo = qr.trim();
        if (!codigo) return;
        setBuscandoQr(true);
        setErrorQr('');
        try {
            const res = await API.get('/suministros/remisiones/inventario-disponible/', { params: { qr: codigo } });
            const item = res.data?.[0];
            const msg = item ? onAgregar(item) : 'No se encontró el producto.';
            if (msg) setErrorQr(msg);
            else setQr('');
        } catch (err) {
            setErrorQr(err.response?.data?.error || 'No se encontró el producto.');
        } finally {
            setBuscandoQr(false);
        }
    };

    return (
        <div className="nr-bodega">
            <div className="nr-bodega__tools">
                <div className="nr-inline-input">
                    <FaQrcode />
                    <input
                        className="nr-inline-input__field"
                        placeholder="Escanea el QR o escribe el ID (ej. AL1079)"
                        value={qr}
                        onChange={e => { setQr(e.target.value); setErrorQr(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); buscarQr(); } }}
                    />
                    <Button size="sm" variant="secondary" onClick={buscarQr} loading={buscandoQr}>Agregar</Button>
                </div>
                <div className="nr-inline-input">
                    <FaSearch />
                    <input
                        className="nr-inline-input__field"
                        placeholder="Buscar en exhibición por nombre o ID…"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                    />
                    {cargando && <FaSpinner className="nr-spin" />}
                </div>
            </div>
            {errorQr && <div className="nr-field-error">{errorQr}</div>}

            <div className="nr-bodega__results">
                {!cargando && resultados.length === 0 && (
                    <div className="nr-empty-note nr-empty-note--plain">
                        {q ? 'Sin resultados en exhibición.' : 'No hay productos en exhibición disponibles.'}
                    </div>
                )}
                {resultados.map(i => {
                    const agregado = yaAgregados.has(i.id_referencia);
                    return (
                        <div key={i.id_referencia} className={`nr-prod nr-prod--compact${!i.seleccionable ? ' is-disabled' : ''}`}>
                            <ProductoInfo
                                titulo={i.producto_nombre || 'Producto'}
                                meta={metaInventario(i)}
                                badge={<span className="nr-code">{i.id_referencia}</span>}
                            >
                                <span className="nr-tag nr-tag--muted">{i.motivo || i.disponibilidad_label}</span>
                            </ProductoInfo>
                            <Button
                                size="sm"
                                variant={agregado ? 'ghost' : 'secondary'}
                                icon={agregado ? FaCheck : FaPlus}
                                disabled={agregado || !i.seleccionable}
                                onClick={() => onAgregar(i)}
                            >
                                {agregado ? 'Agregado' : 'Agregar'}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


/* ────────────────────────────────────────────────────────────────────────────
   Página
   ──────────────────────────────────────────────────────────────────────────── */
function Section({ step, done, title, subtitle, aside, children }) {
    return (
        <section className="nr-card">
            <header className="nr-card__head">
                <span className={`nr-step${done ? ' is-done' : ''}`}>{done ? <FaCheck /> : step}</span>
                <div className="nr-card__heading">
                    <h2 className="nr-card__title">{title}</h2>
                    {subtitle && <p className="nr-card__sub">{subtitle}</p>}
                </div>
                {aside && <div className="nr-card__aside">{aside}</div>}
            </header>
            <div className="nr-card__body">{children}</div>
        </section>
    );
}

function NuevaRemisionPage() {
    const { notify } = useContext(AppContext);
    const hasPermission = usePermissions();
    const puedeTodasLasVentas = hasPermission('CREAR_REMISION_TODAS_VENTAS');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const ventaOrigen = searchParams.get('venta');
    const { data: vendedores = [] } = useVendedores();
    const [transportadores, setTransportadores] = useState([]);

    const [ventasSel, setVentasSel] = useState([]);
    const [cargandoVentaId, setCargandoVentaId] = useState(null);
    const [sinVenta, setSinVenta] = useState(false);

    const [form, setForm] = useState(emptyForm);
    const touchedRef = useRef({});
    const [autoFields, setAutoFields] = useState({});

    const [selInv, setSelInv] = useState(() => new Set());
    const [textosInv, setTextosInv] = useState({}); // id_referencia → descripción solo para esta remisión
    const [telasInv, setTelasInv] = useState({}); // id_referencia → tapizado (material, referencia, color)
    const [pedLineas, setPedLineas] = useState({}); // detalle_id → línea editable del pedido
    const [extras, setExtras] = useState([]); // ítems agregados desde bodega/QR
    const [manuales, setManuales] = useState([]);
    const [nuevoKey, setNuevoKey] = useState(null); // producto recién agregado (para enfocarlo)
    const [bodegaAbierta, setBodegaAbierta] = useState(false);
    const catalogo = useCatalogoRemision();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [intentoEnviar, setIntentoEnviar] = useState(false);
    const [creada, setCreada] = useState(null); // remisión recién creada → vista previa para imprimir

    useEffect(() => {
        API.get('/transportadores/')
            .then(res => setTransportadores(Array.isArray(res.data) ? res.data : []))
            .catch(() => setTransportadores([]));
    }, []);

    useEffect(() => {
        if (!ventaOrigen) return;
        let activa = true;
        setCargandoVentaId(Number(ventaOrigen));
        API.get('/suministros/remisiones/datos-ventas/', { params: { ids: ventaOrigen } }).then(r => {
            if (!activa || !r.data?.[0]) return;
            const datos = r.data[0];
            setVentasSel(prev => prev.some(v => v.id === datos.id) ? prev : [...prev, datos]);
            setSelInv(prev => new Set([...prev, ...datos.inventario.filter(i => i.seleccionable).map(i => i.id_referencia)]));
            setTextosInv(prev => ({ ...Object.fromEntries(datos.inventario.filter(i => i.texto_cliente).map(i => [i.id_referencia, i.texto_cliente])), ...prev }));
            setTelasInv(prev => ({ ...telasDeInventario(datos.inventario), ...prev }));
            setPedLineas(prev => ({ ...Object.fromEntries(datos.pedidos.filter(pedidoPendiente).map(p => [p.detalle_id, lineaDePedido(p)])), ...prev }));
        }).catch(err => { if (activa) notify(err.response?.data?.error || 'No se pudo cargar la venta de origen.', 'error'); })
            .finally(() => { if (activa) setCargandoVentaId(null); });
        return () => { activa = false; };
    }, [ventaOrigen, notify]);

    // Autocompletar cada vez que cambia el conjunto de ventas, sin pisar lo editado a mano.
    useEffect(() => {
        const auto = autofillDesde(ventasSel);
        setForm(prev => {
            const next = { ...prev };
            AUTO_KEYS.forEach(k => { if (!touchedRef.current[k]) next[k] = auto[k]; });
            return next;
        });
        const marcados = {};
        if (ventasSel.length) {
            AUTO_KEYS.forEach(k => {
                if (!touchedRef.current[k] && auto[k] !== '' && auto[k] !== false) marcados[k] = true;
            });
        }
        setAutoFields(marcados);
    }, [ventasSel]);

    const setField = (field, value) => {
        touchedRef.current[field] = true;
        setAutoFields(prev => (prev[field] ? { ...prev, [field]: false } : prev));
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const inputProps = (field, extra = {}) => ({
        className: `nr-input${autoFields[field] ? ' is-auto' : ''}`,
        value: form[field],
        onChange: e => setField(field, e.target.value),
        ...extra,
    });

    /* ── Ventas ─────────────────────────────────────────────────────────────── */
    const agregarVenta = async opcion => {
        if (ventasSel.some(v => v.id === opcion.id)) return;
        setCargandoVentaId(opcion.id);
        try {
            const res = await API.get('/suministros/remisiones/datos-ventas/', { params: { ids: String(opcion.id) } });
            const datos = res.data?.[0];
            if (!datos) throw new Error('sin datos');
            setVentasSel(prev => (prev.some(v => v.id === datos.id) ? prev : [...prev, datos]));
            setTextosInv(prev => ({ ...Object.fromEntries(datos.inventario.filter(i => i.texto_cliente).map(i => [i.id_referencia, i.texto_cliente])), ...prev }));
            setTelasInv(prev => ({ ...telasDeInventario(datos.inventario), ...prev }));
            setSelInv(prev => {
                const n = new Set(prev);
                datos.inventario.forEach(i => { if (i.seleccionable) n.add(i.id_referencia); });
                return n;
            });
            setPedLineas(prev => {
                const n = { ...prev };
                datos.pedidos.forEach(p => {
                    if (pedidoPendiente(p) && !n[p.detalle_id]) n[p.detalle_id] = lineaDePedido(p);
                });
                return n;
            });
        } catch (err) {
            notify(err.response?.data?.error || 'No se pudo cargar la información de la venta.', 'error');
        } finally {
            setCargandoVentaId(null);
        }
    };

    const quitarVenta = id => {
        const v = ventasSel.find(x => x.id === id);
        setVentasSel(prev => prev.filter(x => x.id !== id));
        if (!v) return;
        setSelInv(prev => {
            const n = new Set(prev);
            v.inventario.forEach(i => n.delete(i.id_referencia));
            return n;
        });
        setPedLineas(prev => {
            const n = { ...prev };
            v.pedidos.forEach(p => { delete n[p.detalle_id]; });
            return n;
        });
        setManuales(prev => prev.map(m => (m.venta === id ? { ...m, venta: null } : m)));
    };

    const activarSinVenta = () => {
        ventasSel.forEach(v => quitarVenta(v.id));
        setSinVenta(true);
    };

    /* ── Productos ──────────────────────────────────────────────────────────── */
    const toggleInv = id => setSelInv(prev => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
    });

    const toggleVarios = (invIds, detalles, activar) => {
        setSelInv(prev => {
            const n = new Set(prev);
            invIds.forEach(id => (activar ? n.add(id) : n.delete(id)));
            return n;
        });
        if (detalles.length) {
            setPedLineas(prev => {
                const n = { ...prev };
                detalles.forEach(d => { if (n[d]) n[d] = { ...n[d], incluido: activar }; });
                return n;
            });
        }
    };

    // Desmarcar no borra lo editado: al volver a marcar la línea sigue igual.
    const togglePed = detalleId => setPedLineas(prev => ({
        ...prev,
        [detalleId]: { ...prev[detalleId], incluido: !prev[detalleId].incluido },
    }));

    const editarPed = (detalleId, patch) => setPedLineas(prev => ({
        ...prev,
        [detalleId]: { ...prev[detalleId], ...patch },
    }));

    const agregarExtra = item => {
        if (!item.seleccionable) return item.motivo || 'Este producto no está disponible.';
        const ventaIds = ventasSel.map(v => v.id);
        if (item.venta_id && !ventaIds.includes(item.venta_id)) {
            return `Este producto pertenece a la venta #${item.venta_id}. Agrega esa venta primero.`;
        }
        setSelInv(prev => new Set(prev).add(item.id_referencia));
        const enVentas = ventasSel.some(v => v.inventario.some(i => i.id_referencia === item.id_referencia));
        if (!enVentas) setExtras(prev => (prev.some(e => e.id_referencia === item.id_referencia) ? prev : [...prev, item]));
        return null;
    };

    // `undefined` vuelve al texto del inventario.
    const editarTelaInv = (id, tela) => setTelasInv(prev => ({ ...prev, [id]: tela }));
    const editarTextoInv = (id, texto) => setTextosInv(prev => {
        const n = { ...prev };
        if (texto === undefined) delete n[id]; else n[id] = texto;
        return n;
    });

    const quitarExtra = id => {
        setExtras(prev => prev.filter(e => e.id_referencia !== id));
        setSelInv(prev => {
            const n = new Set(prev);
            n.delete(id);
            return n;
        });
    };

    const agregarManual = () => {
        const nuevo = nuevoManual({ venta: ventasSel[0]?.id ?? null });
        setManuales(prev => [...prev, nuevo]);
        setNuevoKey(nuevo.key);
    };

    const editarManual = (key, patch) => setManuales(prev => prev.map(m => (m.key === key ? { ...m, ...patch } : m)));
    const quitarManual = key => setManuales(prev => prev.filter(m => m.key !== key));

    /* ── Derivados ──────────────────────────────────────────────────────────── */
    const pedidosPorId = useMemo(() => {
        const m = {};
        ventasSel.forEach(v => v.pedidos.forEach(p => { m[p.detalle_id] = { ...p, venta: v.id }; }));
        return m;
    }, [ventasSel]);

    const textoOriginalInv = useMemo(() => {
        const m = {};
        [...ventasSel.flatMap(v => v.inventario), ...extras].forEach(i => { m[i.id_referencia] = descripcionInventario(i); });
        return m;
    }, [ventasSel, extras]);

    const lineasPedido = Object.values(pedLineas).filter(l => l.incluido);
    const manualesUsados = manuales.filter(m => !productoEnBlanco(m));
    const productosIncompletos = [...lineasPedido, ...manualesUsados].filter(productoIncompleto).length;

    const numInv = selInv.size;
    const numPed = lineasPedido.length;
    const numManual = manualesUsados.length;
    const totalProductos = numInv + numPed + numManual;

    const clientesDistintos = useMemo(() => {
        const ids = new Set(ventasSel.map(v => v.cliente?.id).filter(Boolean));
        return ids.size > 1;
    }, [ventasSel]);

    const compartidaCon = ventasSel.map(v => v.vendedores_compartidos_nombres).filter(Boolean).join(', ');
    const saldoVentas = ventasSel.reduce((s, v) => s + toInt(v.saldo), 0);
    const saldoNum = toInt(form.saldo);
    const metodoPago = metodoPagoAApi(form.metodoPago, form.metodoOtro);
    const transportadorNombre = form.transportadorUsuario === '__otro__'
        ? form.transportador
        : transportadores.find(t => String(t.id) === String(form.transportadorUsuario))?.first_name || '';

    const faltantes = [];
    if (!sinVenta && ventasSel.length === 0) faltantes.push('Elige la venta que vas a entregar');
    if (totalProductos === 0) faltantes.push('Agrega al menos un producto');
    if (productosIncompletos) faltantes.push('Hay productos sin referencia, subcategoría ni descripción');
    if (!form.fechaEntrega) faltantes.push('Fecha de entrega');
    if (form.horaDesde && form.horaHasta && form.horaHasta <= form.horaDesde) faltantes.push('La hora final debe ser después de la inicial');
    if (!form.direccionEntrega.trim()) faltantes.push('Dirección de entrega');
    if (!form.clienteNombre.trim()) faltantes.push('Nombre de quien recibe');
    if (!form.sinSaldo && form.metodoPago === 'otro' && !form.metodoOtro.trim()) faltantes.push('Escribe cómo se paga el saldo');

    const avisos = [];
    if (!form.sinSaldo && saldoNum > 0 && !form.metodoPago) avisos.push('No indicaste cómo se cobra el saldo');
    if (clientesDistintos) avisos.push('Las ventas son de clientes distintos');
    if (form.fechaEntrega && form.fechaEntrega < getTodayStr()) avisos.push('La fecha de entrega ya pasó');

    const pasoVentaListo = sinVenta || ventasSel.length > 0;
    const pasoProductosListo = totalProductos > 0 && !productosIncompletos;
    const pasoEntregaListo = !!form.fechaEntrega && !!form.direccionEntrega.trim() && !!form.clienteNombre.trim();

    /* ── Fechas rápidas ─────────────────────────────────────────────────────── */
    const hoy = new Date();
    const fechasRapidas = [0, 1, 2].map(n => {
        const d = addDays(hoy, n);
        const iso = format(d, 'yyyy-MM-dd');
        const nombre = n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : format(d, 'EEEE', { locale: es });
        return { iso, label: `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${format(d, 'd MMM', { locale: es })}` };
    });
    const franjaActiva = FRANJAS.find(f => f.desde === form.horaDesde && f.hasta === form.horaHasta)?.key;

    /* ── Envío ──────────────────────────────────────────────────────────────── */
    const handleSubmit = async e => {
        e.preventDefault();
        setIntentoEnviar(true);
        if (isSubmitting) return;
        if (faltantes.length) {
            notify(`Falta: ${faltantes[0]}`, 'error');
            return;
        }
        setIsSubmitting(true);

        const itemsPedido = Object.entries(pedLineas).filter(([, l]) => l.incluido).map(([detalleId, l]) => ({
            ...productoAApi(l),
            venta: pedidosPorId[detalleId]?.venta ?? null,
            detalle_pedido: Number(detalleId),
        }));
        const itemsEscritos = manualesUsados.map(m => ({ ...productoAApi(m), venta: m.venta ?? null }));
        // Solo los textos cambiados; vacío = el del inventario.
        const descripcionesInventario = Object.fromEntries([...selInv]
            .map(id => [id, (textosInv[id] ?? '').trim()])
            .filter(([id, t]) => t && t !== (textoOriginalInv[id] || '').trim()));
        const telasInventario = Object.fromEntries([...selInv]
            .map(id => [id, (telasInv[id] ?? '').trim()]).filter(([, t]) => t));

        const payload = {
            ventas: ventasSel.map(v => v.id),
            orden_asociada: ventasSel[0]?.id ?? null,
            fecha_entrega: form.fechaEntrega || null,
            hora_desde: form.horaDesde || null,
            hora_hasta: form.horaHasta || null,
            direccion_entrega: form.direccionEntrega.trim(),
            ciudad: form.ciudad.trim(),
            barrio: form.barrio.trim(),
            cliente_nombre: form.clienteNombre.trim(),
            cliente_documento: form.clienteDocumento.trim(),
            cliente_telefono1: form.telefono1.trim(),
            cliente_telefono2: form.telefono2.trim(),
            estado: 'creada',
            sin_saldo: form.sinSaldo,
            saldo: form.sinSaldo ? 0 : saldoNum,
            metodo_pago: form.sinSaldo ? '' : metodoPago,
            transportador_usuario: form.transportadorUsuario && form.transportadorUsuario !== '__otro__'
                ? parseInt(form.transportadorUsuario, 10) : null,
            transportador: form.transportadorUsuario === '__otro__' ? form.transportador.trim() : '',
            vendedor: form.vendedor ? parseInt(form.vendedor, 10) : null,
            novedades: form.novedades.trim(),
            inventario_items: [...selInv],
            items_manuales: [...itemsPedido, ...itemsEscritos],
            descripciones_inventario: descripcionesInventario,
            telas_inventario: telasInventario,
        };

        try {
            const res = await API.post('/suministros/remisiones/', payload);
            notify(`Remisión #${res.data.id} creada.`, 'success');
            setCreada(res.data);
        } catch (error) {
            console.error('Error creating remision:', error);
            notify(primerMensajeError(error.response?.data) || 'No se pudo crear la remisión. Intenta de nuevo.', 'error');
            setIsSubmitting(false);
        }
    };

    const ventaIds = ventasSel.map(v => v.id);
    const multiVenta = ventasSel.length > 1;

    return (
        <div className="ds-page nr-page ds-fade-in">
            <PageHeader
                icon={FaTruck}
                title="Nueva Remisión"
                subtitle="Elige la venta y el resto se llena solo. Revisa, ajusta lo necesario y crea."
                actions={(
                    <Button variant="secondary" icon={FaChevronLeft} onClick={() => navigate('/suministros/remisiones')} disabled={isSubmitting}>
                        Volver
                    </Button>
                )}
            />

            <form className="nr-layout" onSubmit={handleSubmit} noValidate>
                <div className="nr-main">

                    {/* 1 · Venta(s) */}
                    <Section
                        step={1}
                        done={pasoVentaListo}
                        title="¿Qué venta vas a entregar?"
                        subtitle={sinVenta
                            ? 'Remisión sin venta asociada (exhibición, garantía, traslado…).'
                            : 'Busca por número de venta, nombre o cédula del cliente. Puedes agregar más de una.'}
                    >
                        {sinVenta ? (
                            <div className="nr-sinventa">
                                <FaInfoCircle />
                                <span>Esta remisión no queda ligada a ninguna venta. Escribe los datos del cliente y los productos a mano.</span>
                                <button type="button" className="nr-link" onClick={() => setSinVenta(false)}>Asociar una venta</button>
                            </div>
                        ) : (
                            <>
                                {ventasSel.length > 0 && (
                                    <div className="nr-ventas">
                                        {ventasSel.map((v, idx) => (
                                            <div key={v.id} className="nr-venta-card">
                                                <div className="nr-venta-card__main">
                                                    <div className="nr-venta-card__top">
                                                        <span className="nr-venta-card__num">Venta #{v.id}</span>
                                                        {multiVenta && idx === 0 && <span className="nr-tag nr-tag--info">Principal</span>}
                                                        {v.vendedores_compartidos_nombres && (
                                                            <span className="nr-tag nr-tag--info"><FaUsers /> Compartida</span>
                                                        )}
                                                    </div>
                                                    <div className="nr-venta-card__cliente">{v.cliente?.nombre}</div>
                                                    <div className="nr-venta-card__meta">
                                                        {v.cliente?.cedula && <span>CC {v.cliente.cedula}</span>}
                                                        <span>Asesor: {v.vendedor_nombre}{v.vendedores_compartidos_nombres ? ` + ${v.vendedores_compartidos_nombres}` : ''}</span>
                                                        <span>Vendida {formatDateCorta(v.fecha_venta)}</span>
                                                        {v.fecha_entrega && <span>Entrega pactada {formatDateCorta(v.fecha_entrega)}</span>}
                                                    </div>
                                                    {v.remisiones_previas.length > 0 && (
                                                        <div className="nr-venta-card__prev">
                                                            <FaInfoCircle /> Esta venta ya tiene{' '}
                                                            {v.remisiones_previas.map(r => `#${r.id} (${estadoLabel(r.estado)})`).join(', ')}.
                                                            {' '}Solo se muestran los productos que faltan por entregar.
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="nr-venta-card__side">
                                                    <span className="nr-venta-card__saldo-label">Saldo</span>
                                                    <span className={`nr-venta-card__saldo${toInt(v.saldo) <= 0 ? ' is-zero' : ''}`}>
                                                        {toInt(v.saldo) > 0 ? formatCOP(v.saldo) : 'Pagada'}
                                                    </span>
                                                    <button type="button" className="nr-icon-btn" onClick={() => quitarVenta(v.id)} title="Quitar venta" aria-label={`Quitar venta ${v.id}`}>
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {cargandoVentaId && (
                                    <div className="nr-loading-line"><FaSpinner className="nr-spin" /> Cargando la venta #{cargandoVentaId}…</div>
                                )}

                                <VentaPicker
                                    excluidas={ventaIds}
                                    onSelect={agregarVenta}
                                    cargandoId={cargandoVentaId}
                                    autoFocus={ventasSel.length === 0 && !ventaOrigen}
                                    placeholder={ventasSel.length === 0
                                        ? 'Buscar venta: número, cliente o cédula…'
                                        : '¿Entregas otra venta en el mismo viaje? Búscala aquí…'}
                                />

                                {ventasSel.length === 0 && puedeTodasLasVentas && (
                                    <button type="button" className="nr-link nr-link--muted nr-sinventa-link" onClick={activarSinVenta}>
                                        Crear remisión sin venta asociada
                                    </button>
                                )}
                                {clientesDistintos && (
                                    <div className="nr-alert nr-alert--warn">
                                        <FaExclamationTriangle />
                                        <span>Estas ventas son de clientes distintos. Los datos de entrega se tomaron de la venta #{ventasSel[0].id}; revísalos.</span>
                                    </div>
                                )}
                            </>
                        )}
                    </Section>

                    {/* 2 · Productos */}
                    <Section
                        step={2}
                        done={pasoProductosListo}
                        title="Productos a entregar"
                        subtitle={ventasSel.length
                            ? 'Ya marcamos lo pendiente de la venta. Desmarca lo que no va en este viaje.'
                            : 'Agrega los productos que se entregan.'}
                        aside={totalProductos > 0 && <span className="nr-pill">{totalProductos} seleccionado{totalProductos !== 1 ? 's' : ''}</span>}
                    >
                        {ventasSel.map(v => (
                            <VentaProductos
                                key={v.id}
                                venta={v}
                                multiVenta={multiVenta}
                                selInv={selInv}
                                onToggleInv={toggleInv}
                                onToggleVarios={toggleVarios}
                                textosInv={textosInv}
                                onEditTextoInv={editarTextoInv}
                                telasInv={telasInv}
                                onEditTelaInv={editarTelaInv}
                                pedLineas={pedLineas}
                                onTogglePed={togglePed}
                                onEditPed={editarPed}
                                catalogo={catalogo}
                                marcarErrores={intentoEnviar}
                            />
                        ))}

                        {extras.length > 0 && (
                            <div className="nr-prod-group">
                                <div className="nr-prod-group__label"><FaWarehouse /> Agregados desde bodega</div>
                                {extras.map(i => (
                                    <div key={i.id_referencia} className="nr-prod nr-prod--inv is-checked">
                                        <div className="nr-prod__pick">
                                            <ProductoInfo
                                                titulo={i.producto_nombre || 'Producto'}
                                                meta={metaInventario(i, false)}
                                                badge={<span className="nr-code">{i.id_referencia}</span>}
                                            />
                                            <button type="button" className="nr-icon-btn" onClick={() => quitarExtra(i.id_referencia)} title="Quitar" aria-label="Quitar producto">
                                                <FaTrash />
                                            </button>
                                        </div>
                                        <DescripcionInventario
                                            value={textosInv[i.id_referencia]}
                                            original={descripcionInventario(i)}
                                            onChange={t => editarTextoInv(i.id_referencia, t)}
                                        />
                                        <div className="rp-inv"><TelaProducto value={telasInv[i.id_referencia]} onChange={t => editarTelaInv(i.id_referencia, t)} /></div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Otros productos escritos a mano */}
                        <div className="nr-prod-group">
                            <div className="nr-prod-group__label"><FaPen /> Otros productos</div>
                            {manuales.length > 0 && (
                                <div className="rp-list">
                                    {manuales.map(m => (
                                        <ProductoEditable
                                            key={m.key}
                                            item={m}
                                            catalogo={catalogo}
                                            onChange={patch => editarManual(m.key, patch)}
                                            onRemove={() => quitarManual(m.key)}
                                            autoFocus={m.key === nuevoKey}
                                            error={intentoEnviar && !productoEnBlanco(m) && productoIncompleto(m)
                                                ? 'Indica la referencia, la subcategoría o la descripción.' : null}
                                            extra={multiVenta && (
                                                <select
                                                    className="nr-input nr-manual__venta"
                                                    value={m.venta ?? ''}
                                                    onChange={e => editarManual(m.key, { venta: e.target.value ? Number(e.target.value) : null })}
                                                    aria-label="Venta del producto"
                                                >
                                                    {ventasSel.map(v => <option key={v.id} value={v.id}>Venta #{v.id}</option>)}
                                                </select>
                                            )}
                                        />
                                    ))}
                                </div>
                            )}
                            <button type="button" className="rp-add" onClick={agregarManual}>
                                <FaPlus /> Agregar un producto escrito a mano
                            </button>
                        </div>

                        <ReferenciasDatalist catalogo={catalogo} />

                        <div className="nr-bodega-toggle">
                            <button type="button" className="nr-link" onClick={() => setBodegaAbierta(o => !o)}>
                                <FaBoxOpen /> {bodegaAbierta ? 'Ocultar búsqueda en bodega' : 'Agregar un producto de exhibición o escanear QR'}
                                {bodegaAbierta ? <FaChevronUp /> : <FaChevronDown />}
                            </button>
                            {bodegaAbierta && <BuscadorBodega onAgregar={agregarExtra} yaAgregados={selInv} />}
                        </div>
                    </Section>

                    {/* 3 · Cliente y entrega */}
                    <Section
                        step={3}
                        done={pasoEntregaListo}
                        title="Cliente y entrega"
                        subtitle={ventasSel.length
                            ? `Tomado de la venta #${ventasSel[0].id}. Los campos en azul se llenaron solos; cámbialos si algo es distinto.`
                            : '¿A quién, dónde y cuándo se entrega?'}
                    >
                        <div className="nr-grid">
                            <div className="nr-field nr-col-4">
                                <label htmlFor="nr-cliente">Recibe</label>
                                <input id="nr-cliente" {...inputProps('clienteNombre', { placeholder: 'Nombre del cliente o de quien recibe' })} />
                            </div>
                            <div className="nr-field nr-col-2">
                                <label htmlFor="nr-doc">Documento</label>
                                <input id="nr-doc" {...inputProps('clienteDocumento', { placeholder: 'Cédula / NIT', inputMode: 'numeric' })} />
                            </div>
                            <div className="nr-field nr-col-3">
                                <label htmlFor="nr-tel1">Teléfono</label>
                                <input id="nr-tel1" {...inputProps('telefono1', { placeholder: 'Celular principal', inputMode: 'tel' })} />
                            </div>
                            <div className="nr-field nr-col-3">
                                <label htmlFor="nr-tel2">Teléfono alterno <span className="nr-optional">opcional</span></label>
                                <input id="nr-tel2" {...inputProps('telefono2', { placeholder: 'Otro contacto', inputMode: 'tel' })} />
                            </div>
                            <div className="nr-field nr-col-6">
                                <label htmlFor="nr-dir">Dirección de entrega</label>
                                <input id="nr-dir" {...inputProps('direccionEntrega', { placeholder: 'Calle 123 # 45-67, torre, apto…' })} />
                            </div>
                            <div className="nr-field nr-col-3">
                                <label htmlFor="nr-barrio">Barrio</label>
                                <input id="nr-barrio" {...inputProps('barrio', { placeholder: 'Ej: Ciudad Salitre' })} />
                            </div>
                            <div className="nr-field nr-col-3">
                                <label htmlFor="nr-ciudad">Ciudad</label>
                                <input id="nr-ciudad" {...inputProps('ciudad', { placeholder: 'Bogotá' })} />
                            </div>
                        </div>

                        <div className="nr-divider" />

                        <div className="nr-grid">
                            <div className="nr-field nr-col-6">
                                <label>Fecha de entrega</label>
                                <div className="nr-date-row">
                                    <div className="nr-chips">
                                        {fechasRapidas.map(f => (
                                            <button
                                                type="button"
                                                key={f.iso}
                                                className={`nr-chip${form.fechaEntrega === f.iso ? ' is-active' : ''}`}
                                                onClick={() => setField('fechaEntrega', f.iso)}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="date"
                                        aria-label="Fecha de entrega"
                                        className={`nr-input nr-date-input${autoFields.fechaEntrega ? ' is-auto' : ''}`}
                                        value={form.fechaEntrega}
                                        onClick={e => { try { e.target.showPicker(); } catch { /* navegador sin showPicker */ } }}
                                        onChange={e => setField('fechaEntrega', e.target.value)}
                                    />
                                </div>
                                {form.fechaEntrega && <div className="nr-hint">{fmtFechaLarga(form.fechaEntrega)}{autoFields.fechaEntrega ? ' · fecha pactada en la venta' : ''}</div>}
                            </div>

                            <div className="nr-field nr-col-6">
                                <label>Franja horaria</label>
                                <div className="nr-date-row">
                                    <div className="nr-chips">
                                        {FRANJAS.map(f => (
                                            <button
                                                type="button"
                                                key={f.key}
                                                className={`nr-chip${franjaActiva === f.key ? ' is-active' : ''}`}
                                                title={`${fmtHora(f.desde)} – ${fmtHora(f.hasta)}`}
                                                onClick={() => { setField('horaDesde', f.desde); setField('horaHasta', f.hasta); }}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="nr-time-range">
                                        <input type="time" className="nr-input" value={form.horaDesde} onChange={e => setField('horaDesde', e.target.value)} aria-label="Hora desde" />
                                        <span>a</span>
                                        <input type="time" className="nr-input" value={form.horaHasta} onChange={e => setField('horaHasta', e.target.value)} aria-label="Hora hasta" />
                                    </div>
                                </div>
                            </div>

                            <div className="nr-field nr-col-4">
                                <label htmlFor="nr-transp">Transportador <span className="nr-optional">opcional</span></label>
                                <select
                                    id="nr-transp"
                                    className="nr-input"
                                    value={form.transportadorUsuario}
                                    onChange={e => setField('transportadorUsuario', e.target.value)}
                                >
                                    <option value="">Sin asignar todavía</option>
                                    {transportadores.map(t => (
                                        <option key={t.id} value={t.id}>{t.first_name || t.username}</option>
                                    ))}
                                    <option value="__otro__">Otro (externo)</option>
                                </select>
                            </div>
                            {form.transportadorUsuario === '__otro__' && (
                                <div className="nr-field nr-col-4">
                                    <label htmlFor="nr-transp-otro">Nombre del transportador</label>
                                    <input
                                        id="nr-transp-otro"
                                        className="nr-input"
                                        value={form.transportador}
                                        onChange={e => setField('transportador', e.target.value)}
                                        placeholder="Empresa o persona"
                                        autoFocus
                                    />
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* 4 · Pago y notas */}
                    <Section
                        step={4}
                        done={form.sinSaldo || (saldoNum > 0 && !!metodoPago)}
                        title="Cobro y notas"
                        subtitle="Lo que el transportador debe cobrar al entregar."
                    >
                        <div className="nr-grid">
                            <div className="nr-field nr-col-12">
                                <div className="nr-segment" role="radiogroup" aria-label="Saldo">
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={!form.sinSaldo}
                                        className={`nr-segment__opt${!form.sinSaldo ? ' is-active' : ''}`}
                                        onClick={() => setField('sinSaldo', false)}
                                    >
                                        Cobrar saldo al entregar
                                    </button>
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={form.sinSaldo}
                                        className={`nr-segment__opt${form.sinSaldo ? ' is-active' : ''}`}
                                        onClick={() => setField('sinSaldo', true)}
                                    >
                                        Sin saldo (ya pagó)
                                    </button>
                                </div>
                            </div>

                            {!form.sinSaldo && (
                                <>
                                    <div className="nr-field nr-col-3">
                                        <label htmlFor="nr-saldo">Valor a cobrar</label>
                                        <div className={`nr-money${autoFields.saldo ? ' is-auto' : ''}`}>
                                            <span>$</span>
                                            <input
                                                id="nr-saldo"
                                                inputMode="numeric"
                                                value={form.saldo ? formatCOP(parseInt(form.saldo, 10)).replace('$', '') : ''}
                                                onChange={e => setField('saldo', onlyDigits(e.target.value))}
                                                placeholder="0"
                                            />
                                        </div>
                                        {ventasSel.length > 0 && (
                                            <div className="nr-hint">
                                                Saldo de {multiVenta ? 'las ventas' : 'la venta'}: {formatCOP(saldoVentas)}
                                                {saldoNum !== saldoVentas && (
                                                    <> · <button type="button" className="nr-link" onClick={() => setField('saldo', String(saldoVentas))}>usar este valor</button></>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="nr-field nr-col-5">
                                        <label>Método de pago</label>
                                        <div className="nr-chips">
                                            {METODOS_PAGO.map(m => (
                                                <button
                                                    type="button"
                                                    key={m.value}
                                                    className={`nr-chip${form.metodoPago === m.value ? ' is-active' : ''}`}
                                                    onClick={() => setField('metodoPago', form.metodoPago === m.value ? '' : m.value)}
                                                >
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>
                                        {form.metodoPago === 'otro' && (
                                            <input
                                                className="nr-input nr-metodo-otro"
                                                value={form.metodoOtro}
                                                onChange={e => setField('metodoOtro', e.target.value)}
                                                placeholder="¿Cómo paga? Ej: transferencia a Bancolombia, datáfono…"
                                                maxLength={100}
                                                aria-label="Cómo se paga el saldo"
                                                autoFocus
                                            />
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="nr-field nr-col-4">
                                <label htmlFor="nr-vendedor">Asesor comercial</label>
                                <select
                                    id="nr-vendedor"
                                    className={`nr-input${autoFields.vendedor ? ' is-auto' : ''}`}
                                    value={form.vendedor}
                                    onChange={e => setField('vendedor', e.target.value)}
                                >
                                    <option value="">Seleccione…</option>
                                    {vendedores.map(v => <option key={v.id} value={v.id}>{v.first_name || v.username}</option>)}
                                </select>
                                {compartidaCon && <div className="nr-hint"><FaUsers /> Venta compartida con {compartidaCon}</div>}
                            </div>

                            <div className="nr-field nr-col-12">
                                <label htmlFor="nr-novedades">Novedades <span className="nr-optional">opcional</span></label>
                                <textarea
                                    id="nr-novedades"
                                    className="nr-input nr-textarea"
                                    rows="2"
                                    value={form.novedades}
                                    onChange={e => setField('novedades', e.target.value)}
                                    placeholder="Ej: queda pendiente el cojín del sofá, mesa con rayón aceptado por el cliente, entrega parcial…"
                                />
                                <div className="nr-hint">Sale impreso en el recuadro «Novedades en la entrega» de la remisión.</div>
                            </div>
                        </div>
                    </Section>
                </div>

                {/* Resumen */}
                <aside className="nr-aside">
                    <div className="nr-summary">
                        <h3 className="nr-summary__title">Resumen</h3>

                        <dl className="nr-summary__list">
                            <div>
                                <dt>Venta</dt>
                                <dd>{sinVenta ? 'Sin venta asociada' : ventasSel.length ? ventasSel.map(v => `#${v.id}`).join(', ') : <span className="nr-muted">—</span>}</dd>
                            </div>
                            <div>
                                <dt>Recibe</dt>
                                <dd>{form.clienteNombre || <span className="nr-muted">—</span>}{form.telefono1 && <span className="nr-summary__sub">{form.telefono1}</span>}</dd>
                            </div>
                            <div>
                                <dt>Entrega</dt>
                                <dd>
                                    {form.fechaEntrega ? fmtFechaLarga(form.fechaEntrega) : <span className="nr-muted">Sin fecha</span>}
                                    {form.horaDesde && form.horaHasta && <span className="nr-summary__sub">{fmtHora(form.horaDesde)} – {fmtHora(form.horaHasta)}</span>}
                                </dd>
                            </div>
                            <div>
                                <dt>Dirección</dt>
                                <dd>
                                    {form.direccionEntrega || <span className="nr-muted">—</span>}
                                    {(form.barrio || form.ciudad) && <span className="nr-summary__sub">{[form.barrio, form.ciudad].filter(Boolean).join(', ')}</span>}
                                </dd>
                            </div>
                            <div>
                                <dt>Productos</dt>
                                <dd>
                                    {totalProductos || <span className="nr-muted">0</span>}
                                    {totalProductos > 0 && (
                                        <span className="nr-summary__sub">
                                            {[numInv && `${numInv} de inventario`, numPed && `${numPed} de pedidos`, numManual && `${numManual} a mano`].filter(Boolean).join(' · ')}
                                        </span>
                                    )}
                                </dd>
                            </div>
                            <div>
                                <dt>Cobrar</dt>
                                <dd>
                                    {form.sinSaldo || saldoNum <= 0 ? 'Nada (sin saldo)' : formatCOP(saldoNum)}
                                    {!form.sinSaldo && metodoPago && <span className="nr-summary__sub">{metodoPagoLabel(metodoPago)}</span>}
                                </dd>
                            </div>
                            <div>
                                <dt>Transporta</dt>
                                <dd>{transportadorNombre || <span className="nr-muted">Sin asignar</span>}</dd>
                            </div>
                        </dl>

                        {faltantes.length > 0 && (
                            <div className={`nr-checklist${intentoEnviar ? ' is-error' : ''}`}>
                                <span className="nr-checklist__title">Falta para crear:</span>
                                <ul>{faltantes.map(f => <li key={f}>{f}</li>)}</ul>
                            </div>
                        )}
                        {avisos.length > 0 && (
                            <div className="nr-checklist nr-checklist--warn">
                                <ul>{avisos.map(a => <li key={a}><FaExclamationTriangle /> {a}</li>)}</ul>
                            </div>
                        )}

                        <Button type="submit" icon={FaTruck} loading={isSubmitting} block size="lg">
                            Crear remisión
                        </Button>
                        <Button variant="ghost" block onClick={() => navigate('/suministros/remisiones')} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <p className="nr-summary__foot">Al crearla verás la remisión lista para imprimir.</p>
                    </div>
                </aside>
            </form>

            <RemisionPrintModal
                open={!!creada}
                remision={creada}
                closeLabel="Ir a remisiones"
                onClose={() => navigate('/suministros/remisiones')}
            />
        </div>
    );
}

export default NuevaRemisionPage;
