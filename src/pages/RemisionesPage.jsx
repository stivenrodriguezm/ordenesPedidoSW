import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfWeek, addDays, addWeeks, subDays, subWeeks, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    FaPlus, FaSearch, FaChevronDown, FaChevronUp, FaTimes, FaList, FaCalendarAlt, FaChevronLeft,
    FaChevronRight, FaTruck, FaPrint, FaPen, FaMapMarkerAlt, FaPhoneAlt, FaWhatsapp, FaExclamationTriangle,
    FaUserSlash, FaCalendarDay, FaHistory, FaSlidersH,
} from 'react-icons/fa';
import API from '../services/api';
import { usePageRefresh } from '../hooks/usePageRefresh';
import { useVendedores } from '../hooks/useSharedData';
import { formatCOP } from '../utils/formatCOP';
import { getTodayStr, parseLocalDate } from '../utils/dates';
import {
    ESTADOS_REMISION, ESTADOS_ACTIVOS, metodoPagoLabel, fmtFranja, fmtFranjaCorta, fmtFechaLarga, fmtFechaCorta,
    fechaRelativa, totalUnidades, nombreTransportador, whatsappNumero, lineasProductos, agruparFilas,
} from '../utils/remisiones';
import { AppContext, usePermissions } from '../AppContext';
import { PageHeader, Button, Badge, Modal, EmptyState, ErrorState } from '../components/ui';
import RemisionPrintModal from '../components/RemisionPrintModal';
import RemisionAccionModal, { ACCIONES_REMISION } from '../components/RemisionAccionModal';
import RemisionEditarModal from '../components/RemisionEditarModal';
import './RemisionesPage.css';

const TABS = [
    { key: 'activas', label: 'Activas', estados: ESTADOS_ACTIVOS },
    { key: 'creada', label: 'Por despachar', estados: ['creada'] },
    { key: 'despachada', label: 'En ruta', estados: ['despachada'] },
    { key: 'finalizada', label: 'Entregadas', estados: ['finalizada'] },
    { key: 'cerradas', label: 'Devueltas y anuladas', estados: ['devuelta', 'anulada'] },
    { key: 'todas', label: 'Todas', estados: null },
];

const RAPIDOS = [
    { key: 'hoy', label: 'Para hoy', icon: FaCalendarDay },
    { key: 'manana', label: 'Para mañana', icon: FaCalendarAlt },
    { key: 'atrasadas', label: 'Atrasadas', icon: FaExclamationTriangle, tone: 'danger' },
    { key: 'sin_transportador', label: 'Sin transportador', icon: FaUserSlash, tone: 'warn' },
];

const PAGE_SIZE = 40;
const SIN_ASIGNAR = '__sin__';

const normalizar = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const hhmm = t => (t ? String(t).slice(0, 5) : '');

function textoBusqueda(r) {
    return normalizar([
        r.id, ...(r.ventas || []), r.orden_asociada, r.cliente_nombre, r.cliente_documento,
        r.cliente_telefono1, r.cliente_telefono2, r.direccion_entrega, r.barrio, r.ciudad,
        r.vendedor_nombre, nombreTransportador(r),
    ].join(' '));
}

function cumpleRapido(r, key, hoy, manana) {
    const activa = ESTADOS_ACTIVOS.includes(r.estado);
    if (!activa) return false;
    if (key === 'hoy') return r.fecha_entrega === hoy;
    if (key === 'manana') return r.fecha_entrega === manana;
    if (key === 'atrasadas') return !!r.fecha_entrega && r.fecha_entrega < hoy;
    if (key === 'sin_transportador') return !nombreTransportador(r);
    return true;
}

// Próximas entregas primero en las vistas de trabajo; las más recientes primero en el histórico.
function ordenar(lista, ascendente) {
    return [...lista].sort((a, b) => {
        const fa = a.fecha_entrega || (ascendente ? '9999' : '0000');
        const fb = b.fecha_entrega || (ascendente ? '9999' : '0000');
        if (fa !== fb) return ascendente ? fa.localeCompare(fb) : fb.localeCompare(fa);
        const ha = a.hora_desde || '';
        const hb = b.hora_desde || '';
        if (ha !== hb) return ascendente ? ha.localeCompare(hb) : hb.localeCompare(ha);
        return ascendente ? a.id - b.id : b.id - a.id;
    });
}

function accionesDisponibles(rem, perm, esTransportador) {
    const e = rem.estado;
    if (esTransportador) {
        return [
            ...(e === 'creada' ? ['despachada'] : []),
            ...(ESTADOS_ACTIVOS.includes(e) ? ['finalizada'] : []),
        ];
    }
    const acciones = [];
    if (perm.estado && e === 'creada') acciones.push('despachada', 'finalizada');
    if (perm.estado && e === 'despachada') acciones.push('finalizada', 'devuelta', 'creada');
    if (perm.anular && e === 'creada') acciones.push('anulada');
    return acciones;
}

// 'editar' (datos de la entrega), 'seguimiento' (solo flete/nota) o null.
function modoEdicion(rem, perm) {
    if (perm.editar && ESTADOS_ACTIVOS.includes(rem.estado)) return 'editar';
    if (perm.estado && rem.estado === 'finalizada') return 'seguimiento';
    return null;
}

const EstadoBadge = ({ estado }) => (
    <Badge tone={ESTADOS_REMISION[estado]?.tone || 'neutral'}>{ESTADOS_REMISION[estado]?.label || estado}</Badge>
);

function RelTag({ rem }) {
    const rel = fechaRelativa(rem.fecha_entrega, rem.estado);
    if (!rel || !ESTADOS_ACTIVOS.includes(rem.estado)) return null;
    const txt = { hoy: 'Hoy', manana: 'Mañana', atrasada: 'Atrasada' }[rel];
    return <span className={`rl-rel rl-rel--${rel}`}>{txt}</span>;
}

/* ────────────────────────────────────────────────────────────────────────────
   Detalle de una remisión (fila expandida y ventana del calendario)
   ──────────────────────────────────────────────────────────────────────────── */
function RemisionDetalle({ rem, perm, esTransportador, onPrint, onEdit, onAccion }) {
    const unidades = totalUnidades(rem);
    const telefonos = [rem.cliente_telefono1, rem.cliente_telefono2].filter(Boolean);
    const ubicacion = [rem.barrio, rem.ciudad].filter(Boolean).join(', ');
    const mapa = rem.direccion_entrega
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([rem.direccion_entrega, ubicacion].filter(Boolean).join(', '))}`
        : null;
    const cobrar = !rem.sin_saldo && Number(rem.saldo) > 0;
    const acciones = accionesDisponibles(rem, perm, esTransportador);
    const edicion = modoEdicion(rem, perm);
    const eventos = [...(rem.eventos || [])].reverse();

    const productos = agruparFilas(lineasProductos(rem));

    return (
        <div className="rl-detail">
            <div className="rl-detail__grid">
                <section className="rl-panel">
                    <h4 className="rl-panel__title">Entrega</h4>
                    <div className="rl-kv">
                        <span className="rl-kv__label">Fecha</span>
                        <span className="rl-kv__value">{fmtFechaLarga(rem.fecha_entrega, true) || 'Sin fecha'}</span>
                        {(rem.hora_desde || rem.hora_hasta) && <span className="rl-kv__sub">{fmtFranja(hhmm(rem.hora_desde), hhmm(rem.hora_hasta))}</span>}
                    </div>
                    <div className="rl-kv">
                        <span className="rl-kv__label">Dirección</span>
                        <span className="rl-kv__value">{rem.direccion_entrega || '—'}</span>
                        {ubicacion && <span className="rl-kv__sub">{ubicacion}</span>}
                        {mapa && (
                            <a className="rl-link" href={mapa} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                                <FaMapMarkerAlt /> Ver en el mapa
                            </a>
                        )}
                    </div>
                    <div className="rl-kv">
                        <span className="rl-kv__label">Recibe</span>
                        <span className="rl-kv__value">{rem.cliente_nombre || '—'}</span>
                        {rem.cliente_documento && <span className="rl-kv__sub">C.C. / NIT {rem.cliente_documento}</span>}
                    </div>
                    {telefonos.length > 0 && (
                        <div className="rl-kv">
                            <span className="rl-kv__label">Contacto</span>
                            {telefonos.map(t => {
                                const wa = whatsappNumero(t);
                                return (
                                    <span key={t} className="rl-phone">
                                        <a className="rl-link" href={`tel:${t}`} onClick={e => e.stopPropagation()}><FaPhoneAlt /> {t}</a>
                                        {wa && (
                                            <a className="rl-link rl-link--wa" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                                                <FaWhatsapp /> WhatsApp
                                            </a>
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="rl-panel">
                    <h4 className="rl-panel__title">Productos · {unidades} unidad{unidades === 1 ? '' : 'es'}</h4>
                    {productos.length === 0 ? (
                        <p className="rl-muted">Sin productos registrados.</p>
                    ) : (
                        <ul className="rl-products">
                            {productos.map(p => (p.tipo === 'grupo' ? (
                                <li key={p.key} className="rl-products__group">
                                    Juego: {p.nombre} · {p.piezas} pieza{p.piezas === 1 ? '' : 's'}
                                </li>
                            ) : (
                                <li key={p.key} className={p.anidado ? 'is-nested' : ''}>
                                    <span className="rl-products__qty">{p.cantidad}</span>
                                    <span className="rl-products__info">
                                        <span className="rl-products__name">
                                            {p.referencia || p.subcategoria || p.categoria || 'Producto'}
                                        </span>
                                        {(p.categoria || p.subcategoria) && (
                                            <span className="rl-products__cat">
                                                {[p.categoria, p.subcategoria].filter(Boolean).join(' · ')}
                                            </span>
                                        )}
                                        {p.descripcion && <span className="rl-products__detail">{p.descripcion}</span>}
                                        {p.tela && <span className="rl-products__detail">Tapizado: {p.tela}</span>}
                                    </span>
                                    {p.codigos.length > 0 && <span className="rl-code">{p.codigos.join(', ')}</span>}
                                </li>
                            )))}
                        </ul>
                    )}
                </section>

                <section className="rl-panel">
                    <h4 className="rl-panel__title">Cobro y seguimiento</h4>
                    <div className="rl-kv-grid">
                        <div className="rl-kv">
                            <span className="rl-kv__label">Cobrar</span>
                            <span className="rl-kv__value">{cobrar ? formatCOP(rem.saldo) : 'Sin saldo'}</span>
                            {cobrar && <span className="rl-kv__sub">{metodoPagoLabel(rem.metodo_pago) || 'Método sin definir'}</span>}
                        </div>
                        <div className="rl-kv">
                            <span className="rl-kv__label">Transportador</span>
                            <span className="rl-kv__value">{nombreTransportador(rem) || 'Sin asignar'}</span>
                        </div>
                        <div className="rl-kv">
                            <span className="rl-kv__label">Asesor</span>
                            <span className="rl-kv__value">{rem.vendedor_nombre || '—'}</span>
                        </div>
                        {'costo_entrega' in rem && (
                            <div className="rl-kv">
                                <span className="rl-kv__label">Costo del flete</span>
                                <span className="rl-kv__value">{Number(rem.costo_entrega) > 0 ? formatCOP(rem.costo_entrega) : '—'}</span>
                            </div>
                        )}
                    </div>
                    {rem.ventas_detalle?.length > 0 && (
                        <div className="rl-kv">
                            <span className="rl-kv__label">{rem.ventas_detalle.length > 1 ? 'Ventas' : 'Venta'}</span>
                            <span className="rl-ventas">
                                {rem.ventas_detalle.map(v => (
                                    <span key={v.id} className="rl-venta-chip">
                                        #{v.id}
                                        <em>{v.estado === 'entregado' ? 'Entregada' : v.estado === 'anulada' ? 'Anulada' : 'Pendiente'}</em>
                                    </span>
                                ))}
                            </span>
                        </div>
                    )}
                    {rem.observacion && (
                        <div className="rl-note">
                            <span className="rl-kv__label">Indicaciones</span>
                            {rem.observacion}
                        </div>
                    )}
                    {rem.novedades && (
                        <div className="rl-note">
                            <span className="rl-kv__label">Novedades</span>
                            {rem.novedades}
                        </div>
                    )}
                    {rem.nota_transportador && (
                        <div className="rl-note rl-note--transp">
                            <span className="rl-kv__label">Nota del transportador</span>
                            {rem.nota_transportador}
                        </div>
                    )}
                    {eventos.length > 0 && (
                        <div className="rl-history">
                            <span className="rl-kv__label"><FaHistory /> Historial</span>
                            <ol>
                                {eventos.map((ev, i) => (
                                    <li key={i}>
                                        <span className={`rl-history__dot rl-history__dot--${ev.tipo}`} />
                                        <span className="rl-history__body">
                                            <strong>{ev.tipo_label}</strong>
                                            {ev.usuario_nombre && <> por {ev.usuario_nombre}</>}
                                            <span className="rl-history__date">
                                                {format(new Date(ev.fecha), "d MMM yyyy, h:mm a", { locale: es })}
                                            </span>
                                            {ev.detalle && <span className="rl-history__detail">{ev.detalle}</span>}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </section>
            </div>

            {(perm.imprimir || edicion || acciones.length > 0) && (
                <div className="rl-detail__actions">
                    {perm.imprimir && <Button variant="secondary" size="sm" icon={FaPrint} onClick={() => onPrint(rem)}>Imprimir</Button>}
                    {edicion && (
                        <Button variant="secondary" size="sm" icon={FaPen} onClick={() => onEdit(rem)}>
                            {edicion === 'editar' ? 'Editar / reprogramar' : 'Registrar flete o nota'}
                        </Button>
                    )}
                    <span className="rl-detail__spacer" />
                    {acciones.map(a => {
                        const cfg = ACCIONES_REMISION[a];
                        const principal = a === 'finalizada' || (a === 'despachada' && rem.estado === 'creada' && !acciones.includes('finalizada'));
                        const variante = cfg.variant === 'danger' ? 'danger-soft' : principal ? 'primary' : 'secondary';
                        return (
                            <Button key={a} size="sm" variant={variante} icon={cfg.icon} onClick={() => onAccion(rem, a)}>
                                {a === 'finalizada' ? 'Marcar entregada' : cfg.corto}
                            </Button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
   Calendario semana / día
   ──────────────────────────────────────────────────────────────────────────── */
function CalendarView({ remisiones, onOpen }) {
    const [viewType, setViewType] = useState('week');
    const [focusedDate, setFocusedDate] = useState(new Date());
    const currentWeekStart = startOfWeek(focusedDate, { weekStartsOn: 1 });

    const CAL_START_H = 8;
    const CAL_END_H = 19;
    const HOUR_HEIGHT = 42;
    const CAL_START_MIN = CAL_START_H * 60;
    const TIME_SLOTS = Array.from({ length: CAL_END_H - CAL_START_H + 1 }, (_, i) => `${String(i + CAL_START_H).padStart(2, '0')}:00`);

    const DAYS = useMemo(() => (viewType === 'day'
        ? [focusedDate]
        : Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))), [viewType, focusedDate, currentWeekStart]);

    const next = () => setFocusedDate(d => (viewType === 'day' ? addDays(d, 1) : addWeeks(d, 1)));
    const prev = () => setFocusedDate(d => (viewType === 'day' ? subDays(d, 1) : subWeeks(d, 1)));

    const toMin = t => {
        if (!t) return 0;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + (m || 0);
    };

    const visibles = useMemo(() => {
        const inicio = DAYS[0];
        const fin = addDays(DAYS[DAYS.length - 1], 1);
        return remisiones.filter(r => {
            const d = parseLocalDate(r.fecha_entrega);
            return d && d >= new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()) && d < fin;
        });
    }, [remisiones, DAYS]);

    const eventosDelDia = day => {
        const eventos = visibles
            .filter(r => isSameDay(day, parseLocalDate(r.fecha_entrega)))
            .map(r => ({ rem: r, startMin: Math.max(toMin(r.hora_desde) || CAL_START_MIN, CAL_START_MIN), endMin: toMin(r.hora_hasta) || (toMin(r.hora_desde) || CAL_START_MIN) + 60 }))
            .sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));
        const grupos = [];
        eventos.forEach(ev => {
            const grupo = grupos.find(g => g.some(e => ev.startMin < e.endMin && ev.endMin > e.startMin));
            if (grupo) grupo.push(ev); else grupos.push([ev]);
        });
        grupos.forEach(grupo => {
            const columnas = [];
            grupo.forEach(ev => {
                let c = 0;
                while (columnas[c] && columnas[c].some(e => ev.startMin < e.endMin && ev.endMin > e.startMin)) c++;
                (columnas[c] = columnas[c] || []).push(ev);
                ev.col = c;
            });
            grupo.forEach(ev => { ev.cols = columnas.length; });
        });
        return eventos;
    };

    return (
        <div className="calendar-container">
            <div className="calendar-nav">
                <div className="calendar-nav-left">
                    <h3 className="calendar-current-month">
                        {format(viewType === 'day' ? focusedDate : currentWeekStart, 'MMMM yyyy', { locale: es }).toUpperCase()}
                    </h3>
                    <span className="calendar-week-range">
                        {viewType === 'day'
                            ? format(focusedDate, "EEEE d 'de' MMMM", { locale: es })
                            : `Semana del ${format(currentWeekStart, 'd', { locale: es })} al ${format(DAYS[6], 'd', { locale: es })}`}
                    </span>
                </div>
                <div className="calendar-nav-center">
                    <div className="cal-view-switcher">
                        <button className={`switcher-btn ${viewType === 'week' ? 'active' : ''}`} onClick={() => setViewType('week')}>Semana</button>
                        <button className={`switcher-btn ${viewType === 'day' ? 'active' : ''}`} onClick={() => setViewType('day')}>Día</button>
                    </div>
                </div>
                <div className="calendar-nav-actions">
                    <button className="cal-nav-btn" onClick={() => setFocusedDate(new Date())}>Hoy</button>
                    <div className="cal-nav-arrows">
                        <button className="cal-arrow-btn" onClick={prev} aria-label="Anterior"><FaChevronLeft /></button>
                        <button className="cal-arrow-btn" onClick={next} aria-label="Siguiente"><FaChevronRight /></button>
                    </div>
                </div>
            </div>

            <div className="calendar-grid-wrapper">
                {visibles.length === 0 && (
                    <div className="calendar-empty-state">
                        <span className="empty-icon">📅</span>
                        <p>No hay remisiones programadas en estas fechas</p>
                    </div>
                )}
                <div className={`calendar-grid view-${viewType}`}>
                    <div className="calendar-header-row" style={{ gridTemplateColumns: `55px repeat(${DAYS.length}, 1fr)` }}>
                        <div className="time-gutter-header" />
                        {DAYS.map((day, idx) => (
                            <div key={idx} className={`calendar-day-header ${isSameDay(day, new Date()) ? 'is-today' : ''} ${idx === 6 && viewType === 'week' ? 'is-sunday' : ''}`}>
                                <span className="day-name">{format(day, 'eee', { locale: es })}</span>
                                <span className="day-number">{format(day, 'd')}</span>
                            </div>
                        ))}
                    </div>
                    <div className="calendar-body-scrollable">
                        <div className="calendar-body-grid">
                            <div className="calendar-time-gutter">
                                {TIME_SLOTS.map(t => <div key={t} className="time-slot-label">{t}</div>)}
                            </div>
                            <div className="calendar-columns-container">
                                <div className="calendar-bg-lines">
                                    {TIME_SLOTS.map(t => <div key={t} className="calendar-bg-line" />)}
                                </div>
                                <div className="calendar-days-columns" style={{ gridTemplateColumns: `repeat(${DAYS.length}, 1fr)` }}>
                                    {DAYS.map((day, dayIdx) => (
                                        <div key={dayIdx} className={`calendar-day-column ${dayIdx === 6 && viewType === 'week' ? 'is-sunday' : ''} ${isSameDay(day, new Date()) ? 'is-today-col' : ''}`}>
                                            {eventosDelDia(day).map(ev => {
                                                const { rem } = ev;
                                                const top = ((ev.startMin - CAL_START_MIN) / 60) * HOUR_HEIGHT;
                                                const height = (Math.max(ev.endMin - ev.startMin, 45) / 60) * HOUR_HEIGHT;
                                                const width = 100 / ev.cols;
                                                return (
                                                    <div
                                                        key={rem.id}
                                                        className={`calendar-event status-${rem.estado}`}
                                                        style={{ top, height, width: `calc(${width}% - 3px)`, left: `calc(${ev.col * width}% + 1px)`, minHeight: 38 }}
                                                        onClick={() => onOpen(rem)}
                                                        title={`#${rem.id} · ${rem.cliente_nombre}`}
                                                    >
                                                        <div className="event-content-wrapper">
                                                            <div className="event-time-range">{hhmm(rem.hora_desde)} - {hhmm(rem.hora_hasta)}</div>
                                                            <div className="event-title">{rem.cliente_nombre}</div>
                                                            <div className="event-subtitle">{[rem.barrio, nombreTransportador(rem)].filter(Boolean).join(' · ') || `Venta #${rem.orden_asociada || '—'}`}</div>
                                                            {height > 60 && (
                                                                <div className="event-footer">
                                                                    <span className="event-id">#{rem.id}</span>
                                                                    <span className="event-status-dot" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────────────────
   Página
   ──────────────────────────────────────────────────────────────────────────── */
function leerVista() {
    try { return localStorage.getItem('remisiones.vista') || 'lista'; } catch { return 'lista'; }
}

function RemisionesPage() {
    const { usuario, notify } = useContext(AppContext);
    const hasPermission = usePermissions();
    const navigate = useNavigate();
    const esTransportador = usuario?.role === 'transportador';

    const perm = useMemo(() => ({
        crear: hasPermission('CREAR_REMISION'),
        verTodas: hasPermission('VER_TODAS_REMISIONES'),
        editar: hasPermission('EDITAR_REMISION'),
        estado: hasPermission('CAMBIAR_ESTADO_REMISION'),
        anular: hasPermission('ANULAR_REMISION'),
        imprimir: hasPermission('DESCARGAR_REMISION'),
        costo: hasPermission('VER_COSTO_ENTREGA_REMISION'),
        cerrarVenta: hasPermission('EDITAR_ESTADO_VENTA'),
    }), [usuario]); // eslint-disable-line react-hooks/exhaustive-deps

    const [remisiones, setRemisiones] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [transportadores, setTransportadores] = useState([]);
    const { data: vendedores = [] } = useVendedores();

    const [vista, setVista] = useState(leerVista);
    const [tab, setTab] = useState('activas');
    const [rapido, setRapido] = useState(null);
    const [search, setSearch] = useState('');
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [transFilter, setTransFilter] = useState('');
    const [asesorFilter, setAsesorFilter] = useState('');
    const [page, setPage] = useState(1);
    const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    const [printRem, setPrintRem] = useState(null);
    const [editRem, setEditRem] = useState(null);
    const [accion, setAccion] = useState(null); // { rem, accion }
    const [calRem, setCalRem] = useState(null);

    const fetchAll = useCallback(async () => {
        setLoadError(false);
        try {
            const [remRes, transpRes] = await Promise.all([
                API.get('/suministros/remisiones/'),
                API.get('/transportadores/').catch(() => ({ data: [] })),
            ]);
            const data = remRes.data?.results || remRes.data || [];
            setRemisiones(Array.isArray(data) ? data : []);
            setTransportadores(Array.isArray(transpRes.data) ? transpRes.data : []);
        } catch (err) {
            console.error('Error cargando remisiones:', err);
            setLoadError(true);
        } finally {
            setIsLoading(false);
        }
    }, []);

    usePageRefresh(fetchAll);

    useEffect(() => { setPage(1); }, [tab, rapido, search, desde, hasta, transFilter, asesorFilter]);

    const cambiarVista = v => {
        setVista(v);
        try { localStorage.setItem('remisiones.vista', v); } catch { /* sin almacenamiento */ }
    };

    const reemplazar = actualizada => {
        setRemisiones(prev => prev.map(r => (r.id === actualizada.id ? actualizada : r)));
        setCalRem(prev => (prev && prev.id === actualizada.id ? actualizada : prev));
    };

    /* ── Filtros ── */
    const hoy = getTodayStr();
    const manana = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    const base = useMemo(() => {
        const q = normalizar(search.trim());
        return remisiones.filter(r => {
            if (q && !textoBusqueda(r).includes(q)) return false;
            if (desde && (!r.fecha_entrega || r.fecha_entrega < desde)) return false;
            if (hasta && (!r.fecha_entrega || r.fecha_entrega > hasta)) return false;
            if (transFilter === SIN_ASIGNAR && nombreTransportador(r)) return false;
            if (transFilter && transFilter !== SIN_ASIGNAR && nombreTransportador(r) !== transFilter) return false;
            if (asesorFilter && r.vendedor_nombre !== asesorFilter) return false;
            return true;
        });
    }, [remisiones, search, desde, hasta, transFilter, asesorFilter]);

    const conteoTabs = useMemo(() => {
        const c = {};
        TABS.forEach(t => { c[t.key] = t.estados ? base.filter(r => t.estados.includes(r.estado)).length : base.length; });
        return c;
    }, [base]);

    const conteoRapidos = useMemo(() => {
        const c = {};
        RAPIDOS.forEach(q => { c[q.key] = base.filter(r => cumpleRapido(r, q.key, hoy, manana)).length; });
        return c;
    }, [base, hoy, manana]);

    const filtradas = useMemo(() => {
        const t = TABS.find(x => x.key === tab);
        let lista = t.estados ? base.filter(r => t.estados.includes(r.estado)) : base;
        if (rapido) lista = lista.filter(r => cumpleRapido(r, rapido, hoy, manana));
        const ascendente = ['activas', 'creada', 'despachada'].includes(tab) || !!rapido;
        return ordenar(lista, ascendente);
    }, [base, tab, rapido, hoy, manana]);

    const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
    const pagina = filtradas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const opcionesTransp = useMemo(() => [...new Set(remisiones.map(nombreTransportador).filter(Boolean))].sort(), [remisiones]);
    const opcionesAsesor = useMemo(() => [...new Set(remisiones.map(r => r.vendedor_nombre).filter(Boolean))].sort(), [remisiones]);
    const hayFiltros = !!(search || desde || hasta || transFilter || asesorFilter || rapido);
    const filtrosExtra = [desde, hasta, transFilter, asesorFilter].filter(Boolean).length;
    const limpiar = () => { setSearch(''); setDesde(''); setHasta(''); setTransFilter(''); setAsesorFilter(''); setRapido(null); };

    const elegirRapido = key => {
        if (rapido === key) { setRapido(null); return; }
        setRapido(key);
        if (!['activas', 'creada', 'despachada'].includes(tab)) setTab('activas');
    };

    /* ── Acciones ── */
    const alTerminarAccion = (actualizada, tipo) => {
        reemplazar(actualizada);
        setAccion(null);
        const msg = {
            despachada: 'quedó en ruta',
            finalizada: 'quedó entregada',
            devuelta: 'quedó devuelta; sus productos están libres',
            anulada: 'quedó anulada; sus productos están libres',
            creada: 'volvió a por despachar',
        }[tipo];
        notify(`Remisión #${actualizada.id} ${msg}.`, 'success');
    };

    const alEditar = actualizada => {
        reemplazar(actualizada);
        setEditRem(null);
        notify(`Remisión #${actualizada.id} actualizada.`, 'success');
    };

    const detalleProps = {
        perm,
        esTransportador,
        onPrint: setPrintRem,
        onEdit: setEditRem,
        onAccion: (rem, a) => setAccion({ rem, accion: a }),
    };

    const tabActual = TABS.find(t => t.key === tab);

    return (
        <div className="ds-page rl-page ds-fade-in">
            <PageHeader
                icon={FaTruck}
                title="Remisiones"
                subtitle={esTransportador ? 'Tus entregas asignadas' : 'Programa, despacha y haz seguimiento a las entregas'}
                actions={(
                    <>
                        <div className="rl-view-toggle" role="tablist" aria-label="Vista">
                            <button type="button" className={vista === 'lista' ? 'is-active' : ''} onClick={() => cambiarVista('lista')} title="Lista">
                                <FaList /> <span>Lista</span>
                            </button>
                            <button type="button" className={vista === 'calendario' ? 'is-active' : ''} onClick={() => cambiarVista('calendario')} title="Calendario">
                                <FaCalendarAlt /> <span>Calendario</span>
                            </button>
                        </div>
                        {perm.crear && (
                            <Button icon={FaPlus} onClick={() => navigate('/suministros/remisiones/nueva')}>
                                Nueva remisión
                            </Button>
                        )}
                    </>
                )}
            />

            {/* Estados */}
            <div className="rl-tabs" role="tablist">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.key}
                        className={`rl-tab${tab === t.key ? ' is-active' : ''}`}
                        onClick={() => { setTab(t.key); if (!['activas', 'creada', 'despachada'].includes(t.key)) setRapido(null); }}
                    >
                        {t.label}
                        <span className="rl-tab__count">{isLoading ? '·' : conteoTabs[t.key]}</span>
                    </button>
                ))}
            </div>

            {/* Filtros */}
            <div className={`rl-filters${filtrosAbiertos ? ' is-open' : ''}`}>
                <div className="rl-search">
                    <FaSearch />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por N°, venta, cliente, teléfono o dirección…"
                        aria-label="Buscar remisiones"
                    />
                    {search && <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda"><FaTimes /></button>}
                </div>
                <button
                    type="button"
                    className={`rl-filters-toggle${filtrosExtra ? ' has-active' : ''}`}
                    onClick={() => setFiltrosAbiertos(o => !o)}
                    aria-expanded={filtrosAbiertos}
                >
                    <FaSlidersH /> Filtros{filtrosExtra ? ` (${filtrosExtra})` : ''}
                </button>
                <label className="rl-filter">
                    <span>Entrega desde</span>
                    <input type="date" value={desde} onChange={e => setDesde(e.target.value)} onClick={e => { try { e.target.showPicker(); } catch { /* */ } }} />
                </label>
                <label className="rl-filter">
                    <span>hasta</span>
                    <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} onClick={e => { try { e.target.showPicker(); } catch { /* */ } }} />
                </label>
                {!esTransportador && (
                    <label className="rl-filter">
                        <span>Transportador</span>
                        <select value={transFilter} onChange={e => setTransFilter(e.target.value)}>
                            <option value="">Todos</option>
                            <option value={SIN_ASIGNAR}>Sin asignar</option>
                            {opcionesTransp.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </label>
                )}
                {perm.verTodas && opcionesAsesor.length > 1 && (
                    <label className="rl-filter">
                        <span>Asesor</span>
                        <select value={asesorFilter} onChange={e => setAsesorFilter(e.target.value)}>
                            <option value="">Todos</option>
                            {opcionesAsesor.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </label>
                )}
                {hayFiltros && (
                    <button type="button" className="rl-clear" onClick={limpiar}>
                        <FaTimes /> Limpiar
                    </button>
                )}
            </div>

            {/* Atajos de trabajo */}
            {!isLoading && (
                <div className="rl-quick">
                    {RAPIDOS.map(q => {
                        const n = conteoRapidos[q.key];
                        if (!n && rapido !== q.key) return null;
                        return (
                            <button
                                key={q.key}
                                type="button"
                                className={`rl-quick__chip${q.tone ? ` rl-quick__chip--${q.tone}` : ''}${rapido === q.key ? ' is-active' : ''}`}
                                onClick={() => elegirRapido(q.key)}
                            >
                                <q.icon /> {q.label} <strong>{n}</strong>
                            </button>
                        );
                    })}
                </div>
            )}

            {loadError ? (
                <ErrorState message="No se pudieron cargar las remisiones." onRetry={() => { setIsLoading(true); fetchAll(); }} />
            ) : vista === 'calendario' ? (
                <div className="ds-card rem-calendar-card">
                    <CalendarView remisiones={filtradas} onOpen={setCalRem} />
                </div>
            ) : (
                <div className="rl-list">
                    <div className="rl-row rl-row--head" aria-hidden="true">
                        <span>N°</span>
                        <span>Entrega</span>
                        <span>Cliente</span>
                        <span>Venta</span>
                        <span className="rl-right">Productos</span>
                        <span className="rl-right">Cobrar</span>
                        <span>Transportador</span>
                        <span>Estado</span>
                        <span />
                    </div>

                    {isLoading && Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rl-row rl-row--skeleton">
                            {Array.from({ length: 8 }).map((__, j) => <span key={j} className="ds-skeleton" />)}
                        </div>
                    ))}

                    {!isLoading && filtradas.length === 0 && (
                        <div className="rl-empty">
                            <EmptyState
                                icon={FaTruck}
                                title={hayFiltros ? 'Nada coincide con los filtros' : `No hay remisiones ${tab === 'todas' ? '' : tabActual.label.toLowerCase()}`}
                                message={hayFiltros ? 'Prueba quitando algún filtro.' : (perm.crear ? 'Cuando crees una remisión aparecerá aquí.' : null)}
                                action={hayFiltros
                                    ? <Button variant="secondary" size="sm" onClick={limpiar}>Limpiar filtros</Button>
                                    : perm.crear && <Button size="sm" icon={FaPlus} onClick={() => navigate('/suministros/remisiones/nueva')}>Nueva remisión</Button>}
                            />
                        </div>
                    )}

                    {!isLoading && pagina.map(rem => {
                        const abierta = expandedId === rem.id;
                        const cobrar = !rem.sin_saldo && Number(rem.saldo) > 0;
                        const transp = nombreTransportador(rem);
                        const ventas = rem.ventas?.length ? rem.ventas : (rem.orden_asociada ? [rem.orden_asociada] : []);
                        const unidades = totalUnidades(rem);
                        return (
                            <div key={rem.id} className={`rl-item${abierta ? ' is-open' : ''} rl-item--${rem.estado}`}>
                                <div
                                    className="rl-row"
                                    role="button"
                                    tabIndex={0}
                                    aria-expanded={abierta}
                                    onClick={() => setExpandedId(abierta ? null : rem.id)}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(abierta ? null : rem.id); } }}
                                >
                                    <span className="rl-c rl-c--num"><span className="rl-num">#{rem.id}</span></span>
                                    <span className="rl-c rl-c--fecha">
                                        <span className="rl-strong">{rem.fecha_entrega ? fmtFechaCorta(rem.fecha_entrega) : 'Sin fecha'} <RelTag rem={rem} /></span>
                                        {(rem.hora_desde || rem.hora_hasta) && <span className="rl-sub">{fmtFranjaCorta(hhmm(rem.hora_desde), hhmm(rem.hora_hasta))}</span>}
                                    </span>
                                    <span className="rl-c rl-c--cliente">
                                        <span className="rl-strong rl-ellipsis">{rem.cliente_nombre}</span>
                                        <span className="rl-sub rl-ellipsis">{[rem.direccion_entrega, rem.barrio].filter(Boolean).join(' · ') || '—'}</span>
                                    </span>
                                    <span className="rl-c rl-c--venta">
                                        {ventas.length ? <>#{ventas[0]}{ventas.length > 1 && <span className="rl-sub"> +{ventas.length - 1}</span>}</> : <span className="rl-sub">Sin venta</span>}
                                    </span>
                                    <span className="rl-c rl-c--prod rl-right">{unidades} ud{unidades === 1 ? '' : 's'}.</span>
                                    <span className="rl-c rl-c--cobro rl-right">
                                        {cobrar ? (
                                            <>
                                                <span className="rl-strong rl-money">{formatCOP(rem.saldo)}</span>
                                                {rem.metodo_pago && <span className="rl-sub">{metodoPagoLabel(rem.metodo_pago)}</span>}
                                            </>
                                        ) : <span className="rl-sub">Sin saldo</span>}
                                    </span>
                                    <span className="rl-c rl-c--transp">
                                        {transp ? <span className="rl-ellipsis">{transp}</span> : <span className="rl-unassigned">Sin asignar</span>}
                                    </span>
                                    <span className="rl-c rl-c--estado"><EstadoBadge estado={rem.estado} /></span>
                                    <span className="rl-c rl-c--acciones">
                                        {perm.imprimir && (
                                            <button
                                                type="button"
                                                className="rl-icon-btn"
                                                title="Imprimir"
                                                aria-label={`Imprimir remisión ${rem.id}`}
                                                onClick={e => { e.stopPropagation(); setPrintRem(rem); }}
                                            >
                                                <FaPrint />
                                            </button>
                                        )}
                                        <span className="rl-chevron" aria-hidden="true">{abierta ? <FaChevronUp /> : <FaChevronDown />}</span>
                                    </span>
                                </div>
                                {abierta && <RemisionDetalle rem={rem} {...detalleProps} />}
                            </div>
                        );
                    })}

                    {!isLoading && filtradas.length > PAGE_SIZE && (
                        <div className="rl-pagination">
                            <span>
                                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtradas.length)} de {filtradas.length}
                            </span>
                            <div>
                                <Button variant="secondary" size="sm" icon={FaChevronLeft} disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                                <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente <FaChevronRight /></Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Detalle desde el calendario */}
            <Modal
                open={!!calRem}
                onClose={() => setCalRem(null)}
                size="xl"
                title={calRem ? (
                    <span className="rl-modal-title">
                        Remisión #{calRem.id} <EstadoBadge estado={calRem.estado} />
                    </span>
                ) : ''}
            >
                {calRem && (
                    <RemisionDetalle
                        rem={calRem}
                        {...detalleProps}
                        onPrint={rem => { setCalRem(null); setPrintRem(rem); }}
                        onEdit={rem => { setCalRem(null); setEditRem(rem); }}
                        onAccion={(rem, a) => { setCalRem(null); setAccion({ rem, accion: a }); }}
                    />
                )}
            </Modal>

            <RemisionPrintModal open={!!printRem} remision={printRem} onClose={() => setPrintRem(null)} />

            <RemisionEditarModal
                open={!!editRem}
                remision={editRem}
                onClose={() => setEditRem(null)}
                onDone={alEditar}
                transportadores={transportadores}
                vendedores={vendedores}
                puedeEditar={perm.editar}
                puedeSeguimiento={perm.estado}
                puedeCosto={perm.costo}
            />

            <RemisionAccionModal
                open={!!accion}
                accion={accion?.accion}
                remision={accion?.rem}
                onClose={() => setAccion(null)}
                onDone={alTerminarAccion}
                puedeCosto={perm.costo}
                puedeCerrarVenta={perm.cerrarVenta}
                esTransportador={esTransportador}
            />
        </div>
    );
}

export default RemisionesPage;
