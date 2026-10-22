import React, { useCallback, useContext, useMemo, useState, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AppContext, usePermissions } from '../AppContext';
import { usePageRefresh } from '../hooks/usePageRefresh';
import { formatCOP } from '../utils/formatCOP';
import { formatDateCorta, parseLocalDate } from '../utils/dates';
import { LoadingBlock, ErrorState } from '../components/ui';
import AvatarPerfil from '../components/chat/AvatarPerfil';
import {
    FaArrowRight, FaArrowUp, FaArrowDown, FaCheck, FaPlus, FaTruck, FaRobot, FaPaperPlane,
    FaFileInvoiceDollar, FaClipboardList, FaScroll, FaMoneyBillWave, FaUserTie, FaRegFileAlt,
} from 'react-icons/fa';
import { corto, resumenPeriodo } from '../utils/panelAdmin';
import useTema, { colorTema } from '../hooks/useTema';
import './AdminHomePage.css';

// chart.js + react-chartjs-2 se cargan bajo demanda (ver components/charts.js)
const Line = lazy(() => import('../components/charts').then(m => ({ default: m.Line })));
const Bar = lazy(() => import('../components/charts').then(m => ({ default: m.Bar })));

// Colores de los gráficos según el modo diurno/nocturno (tokens de styles/tokens.css).
const paleta = () => ({ linea: colorTema('--accent-texto'), relleno: colorTema('--accent-soft'), oro: colorTema('--gold'),
  gris: colorTema('--gray-300'), rejilla: colorTema('--border'), texto: colorTema('--text-muted') });
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const ICONO_GRUPO = { ventas: FaFileInvoiceDollar, pedidos: FaClipboardList, telas: FaScroll, entregas: FaTruck, dinero: FaMoneyBillWave, nomina: FaUserTie };
const ORDEN_TONO = { danger: 0, warning: 1, info: 2 };
const GESTION = { pendiente: 'Pendiente', atrasada: 'Atrasada', finalizada: 'Finalizada' };

const diaMes = (iso) => { const d = parseLocalDate(iso); return d ? `${d.getDate()} ${MESES[d.getMonth()]}` : ''; };

const saludo = () => {
    const hora = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', hour: '2-digit', hour12: false }).format(new Date()), 10);
    if (hora < 12) return 'Buenos días';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
};

const Variacion = ({ pct }) => {
    if (pct === null || pct === undefined) return null;
    const sube = pct >= 0;
    return (
        <span className={`adm-var ${sube ? 'is-sube' : 'is-baja'}`}>
            {sube ? <FaArrowUp /> : <FaArrowDown />}{Math.abs(pct).toLocaleString('es-CO')} %
        </span>
    );
};

const Kpi = ({ etiqueta, valor, titulo, children, onClick }) => (
    <button type="button" className="adm-kpi" onClick={onClick} disabled={!onClick} title={titulo}>
        <span className="adm-kpi__etiqueta">{etiqueta}</span>
        <strong className="adm-kpi__valor">{valor}</strong>
        <span className="adm-kpi__pie">{children}</span>
    </button>
);

function RitmoVentas({ datos }) {
    const [vista, setVista] = useState('periodo');
    const [anual, setAnual] = useState(null);
    const [errorAnual, setErrorAnual] = useState(false);
    const { ventas, periodo } = datos;

    const verAnual = async () => {
        setVista('anual');
        if (anual) return;
        try { setAnual((await api.get('/sales-chart-data/')).data); } catch { setErrorAnual(true); }
    };

    const [tema] = useTema();
    const c = useMemo(() => paleta(), [tema]); // eslint-disable-line react-hooks/exhaustive-deps
    const serie = useMemo(() => {
        const n = Math.max(ventas.serie_anterior.length, periodo.dias);
        const inicio = parseLocalDate(periodo.inicio);
        const labels = Array.from({ length: n }, (_, i) => {
            const d = new Date(inicio); d.setDate(d.getDate() + i);
            return `${d.getDate()} ${MESES[d.getMonth()]}`;
        });
        return {
            labels,
            datasets: [
                { label: 'Este período', data: ventas.serie_actual, borderColor: c.linea, backgroundColor: c.relleno,
                  fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2.2 },
                { label: 'Período anterior', data: ventas.serie_anterior, borderColor: c.gris, borderDash: [5, 4],
                  fill: false, tension: 0.3, pointRadius: 0, pointHoverRadius: 3, borderWidth: 1.6 },
            ],
        };
    }, [ventas, periodo, c]);

    const opciones = {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${formatCOP(c.parsed.y)}` } },
        },
        scales: {
            y: { beginAtZero: true, border: { display: false }, grid: { color: c.rejilla },
                 ticks: { callback: (v) => corto(v), color: c.texto, font: { size: 10 } } },
            x: { grid: { display: false }, ticks: { maxTicksLimit: 8, color: c.texto, font: { size: 10 } } },
        },
    };

    const anualEstilo = anual && {
        ...anual,
        datasets: anual.datasets.map((ds, i) => ({ ...ds, backgroundColor: i === 1 ? c.linea : c.gris, hoverBackgroundColor: c.oro, borderRadius: 3, maxBarThickness: 22 })),
    };

    return (
        <section className="adm-card adm-ritmo">
            <div className="adm-card__cabeza">
                <div>
                    <span className="adm-eyebrow">Ritmo de ventas</span>
                    <h2>{vista === 'periodo' ? 'Acumulado del período frente al anterior' : 'Ventas por mes, este año y el anterior'}</h2>
                </div>
                <div className="adm-vistas" role="group" aria-label="Vista del gráfico">
                    <button type="button" aria-pressed={vista === 'periodo'} onClick={() => setVista('periodo')}>Período</button>
                    <button type="button" aria-pressed={vista === 'anual'} onClick={verAnual}>Año</button>
                </div>
            </div>
            {vista === 'periodo' && (
                <div className="adm-leyenda">
                    <span><i className="is-actual" />Este período · {diaMes(periodo.inicio)} – {diaMes(periodo.fin)}</span>
                    <span><i className="is-anterior" />Anterior · {diaMes(periodo.anterior_inicio)} – {diaMes(periodo.anterior_fin)} · cerró en {corto(ventas.anterior_total)}</span>
                </div>
            )}
            <div className="adm-ritmo__lienzo">
                <Suspense fallback={<LoadingBlock message="Cargando gráfico..." />}>
                    {vista === 'periodo' && <Line data={serie} options={opciones} />}
                    {vista === 'anual' && (anualEstilo
                        ? <Bar data={anualEstilo} options={{ ...opciones, plugins: { ...opciones.plugins, legend: { display: true, position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', color: 'var(--text-secondary)', font: { size: 11 } } } } }} />
                        : errorAnual ? <p className="adm-vacio">No se pudo cargar la comparación anual.</p> : <LoadingBlock message="Cargando..." />)}
                </Suspense>
            </div>
        </section>
    );
}

function Asesores({ asesores, total, porSede, puedeNomina }) {
    const max = asesores[0]?.total || 1;
    return (
        <section className="adm-card adm-asesores">
            <div className="adm-card__cabeza">
                <div>
                    <span className="adm-eyebrow">Equipo comercial</span>
                    <h2>Asesores del período</h2>
                </div>
                {puedeNomina && <Link to="/nomina" className="adm-enlace">Nómina <FaArrowRight /></Link>}
            </div>
            {porSede.length > 0 && (
                <div className="adm-sedes" aria-label="Ventas por sede">
                    <div className="adm-sedes__barra">
                        {porSede.map((s, i) => <span key={s.sede} style={{ flexGrow: s.total || 0.0001 }} className={`is-${i % 3}`} title={`${s.sede}: ${formatCOP(s.total)}`} />)}
                    </div>
                    <div className="adm-sedes__textos">
                        {porSede.map((s, i) => (
                            <span key={s.sede}><i className={`is-${i % 3}`} />{s.sede} <strong>{corto(s.total)}</strong> · {s.cantidad}</span>
                        ))}
                    </div>
                </div>
            )}
            {asesores.length === 0 ? <p className="adm-vacio">Todavía no hay ventas en este período.</p> : (
                <ol className="adm-ranking">
                    {asesores.slice(0, 8).map((a, i) => (
                        <li key={a.id}>
                            <span className="adm-ranking__pos">{i + 1}</span>
                            <div className="adm-ranking__cuerpo">
                                <div className="adm-ranking__fila">
                                    <span className="adm-ranking__nombre">{a.nombre}</span>
                                    <span className="adm-ranking__valor" title={formatCOP(a.total)}>{corto(a.total)}</span>
                                </div>
                                <div className="adm-ranking__barra"><span style={{ width: `${Math.max(2, (a.total / max) * 100)}%` }} /></div>
                                <span className="adm-ranking__detalle">
                                    {a.ventas} {a.ventas === 1 ? 'venta' : 'ventas'} · {total ? Math.round((a.total / total) * 100) : 0} % del período
                                </span>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
            <p className="adm-nota">Las ventas compartidas se reparten en partes iguales entre sus asesores.</p>
        </section>
    );
}

function Atencion({ items }) {
    const pendientes = items.filter(i => i.cantidad > 0).sort((a, b) => ORDEN_TONO[a.tono] - ORDEN_TONO[b.tono]);
    const alDia = items.filter(i => !i.cantidad);
    return (
        <section className="adm-card adm-atencion">
            <div className="adm-card__cabeza">
                <div>
                    <span className="adm-eyebrow">Hoy</span>
                    <h2>Requiere tu atención</h2>
                </div>
                {pendientes.length > 0 && <span className="adm-contador">{pendientes.length}</span>}
            </div>
            {pendientes.length === 0 ? (
                <p className="adm-todo-bien"><FaCheck /> Todo al día. No hay pendientes en los módulos que puedes ver.</p>
            ) : (
                <ul className="adm-alertas">
                    {pendientes.map(item => {
                        const Icono = ICONO_GRUPO[item.grupo] || FaRegFileAlt;
                        return (
                            <li key={item.clave}>
                                <Link to={item.ruta} className={`adm-alerta is-${item.tono}`}>
                                    <span className="adm-alerta__icono"><Icono /></span>
                                    <span className="adm-alerta__texto">
                                        <strong>{item.titulo}</strong>
                                        <small>{item.detalle}</small>
                                    </span>
                                    <span className="adm-alerta__cifra">
                                        <b>{item.cantidad.toLocaleString('es-CO')}</b>
                                        {item.valor ? <small title={formatCOP(item.valor)}>{corto(item.valor)}</small> : null}
                                    </span>
                                    <FaArrowRight className="adm-alerta__ir" />
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
            {alDia.length > 0 && (
                <div className="adm-al-dia">
                    <span>Al día</span>
                    {alDia.map(i => <span key={i.clave} className="adm-al-dia__chip"><FaCheck />{i.titulo}</span>)}
                </div>
            )}
        </section>
    );
}

function PanelIA({ ia, datos }) {
    const navigate = useNavigate();
    const [texto, setTexto] = useState('');
    const vencidas = datos.atencion.find(a => a.clave === 'facturas_vencidas');
    const sugerencias = [
        datos.ventas.variacion_pct !== null && datos.ventas.variacion_pct !== undefined
            ? `¿Por qué las ventas van ${datos.ventas.variacion_pct >= 0 ? 'arriba' : 'abajo'} frente al período anterior y qué puedo hacer?`
            : '¿Cómo vamos en ventas este período?',
        '¿Qué asesores necesitan apoyo este período y por qué?',
        vencidas?.cantidad ? '¿Qué facturas de proveedor vencidas debo pagar primero?' : '¿Qué ventas tienen más saldo por cobrar?',
    ];
    const preguntar = (t) => {
        const borrador = (t ?? texto).trim();
        if (borrador) navigate('/IA/general', { state: { borrador } });
    };
    return (
        <section className="adm-card adm-ia">
            <div className="adm-card__cabeza">
                <div>
                    <span className="adm-eyebrow">IA Lottus</span>
                    <h2>Pregúntale al negocio</h2>
                </div>
                <Link to="/IA" className="adm-enlace">Oficina <FaArrowRight /></Link>
            </div>
            <form className="adm-ia__form" onSubmit={(e) => { e.preventDefault(); preguntar(); }}>
                <FaRobot aria-hidden="true" />
                <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={4000}
                    placeholder="Ej.: ¿cuánto vendimos en Lottus 2 este período?" aria-label="Pregunta para IA Lottus" />
                <button type="submit" disabled={!texto.trim()} aria-label="Preguntar a IA Lottus"><FaPaperPlane /></button>
            </form>
            <div className="adm-ia__sugerencias">
                {sugerencias.map(s => <button key={s} type="button" onClick={() => preguntar(s)}>{s}</button>)}
            </div>
            <p className="adm-ia__ayuda">La pregunta se abre en el chat para que la revises y la envíes.</p>

            {ia.agentes.length > 0 && (
                <div className="adm-ia__agentes">
                    <span className="adm-ia__subtitulo">Tus agentes</span>
                    <div>
                        {ia.agentes.map(a => (
                            <Link key={a.id} to={`/IA/agentes/${a.id}`} className="adm-ia__agente" title={`${a.nombre} — ${a.rol}`}>
                                <AvatarPerfil perfil={a} tamano={28} /><span>{a.nombre}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
            <div className="adm-ia__informes">
                <span className="adm-ia__subtitulo">
                    Informes automáticos {ia.sin_leer > 0 && <b>{ia.sin_leer} sin leer</b>}
                </span>
                {ia.informes.length === 0 ? (
                    <p className="adm-ia__vacio">Programa informes con tus agentes (por ejemplo, un resumen de ventas cada lunes) y aparecerán aquí. <Link to="/IA">Ir a la oficina</Link></p>
                ) : (
                    <ul>
                        {ia.informes.map(inf => (
                            <li key={inf.id}>
                                <Link to={inf.conversacion ? `/IA/general?conversacion=${inf.conversacion}` : '/IA'} className={inf.leida ? '' : 'is-nuevo'}>
                                    <strong>{inf.nombre}</strong>
                                    <small>{inf.agente}{inf.finalizada ? ` · ${formatDateCorta(inf.finalizada.slice(0, 10))}` : ''}</small>
                                    {inf.extracto && <span>{inf.extracto}</span>}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}

const AdminHomePage = () => {
    const { usuario } = useContext(AppContext);
    const puede = usePermissions();
    const navigate = useNavigate();
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    const cargar = useCallback(async () => {
        setError(null);
        try {
            setDatos((await api.get('/dashboard-admin/')).data);
        } catch (err) {
            setError('No se pudieron cargar los datos del panel.');
            console.error(err);
        } finally {
            setCargando(false);
        }
    }, []);

    usePageRefresh(cargar);

    if (cargando && !datos) return <div className="ds-page"><LoadingBlock message="Preparando tu panel..." /></div>;
    if (error && !datos) return <div className="ds-page"><ErrorState message={error} onRetry={cargar} /></div>;

    const { ventas, periodo, dinero, atencion, asesores, ia, ultimas_ventas: ultimas } = datos;
    const avance = Math.min(100, Math.round((periodo.dia / periodo.dias) * 100));
    const frenteAnterior = ventas.anterior_total ? Math.round((ventas.proyeccion / ventas.anterior_total) * 100) : null;

    return (
        <div className="ds-page adm ds-fade-in">
            <header className="adm-cabecera">
                <div className="adm-marca">
                    <span className="adm-marca__nombre">LOTTUS</span>
                    <span className="adm-marca__division">PANEL GENERAL</span>
                </div>
                <div className="adm-cabecera__titulo">
                    <span className="adm-eyebrow">
                        Período {diaMes(periodo.inicio)} – {diaMes(periodo.fin)} · día {periodo.dia} de {periodo.dias}
                    </span>
                    <h1>{saludo()}, {usuario?.first_name || 'equipo'}</h1>
                    <p>{resumenPeriodo(datos)}</p>
                </div>
                <div className="adm-cabecera__acciones">
                    {ia && <button type="button" className="adm-boton" onClick={() => navigate('/IA/general')}><FaRobot /> Preguntar a la IA</button>}
                    {puede('VER_REMISIONES') && <button type="button" className="adm-boton" onClick={() => navigate('/suministros/remisiones/nueva')}><FaTruck /> Nueva remisión</button>}
                    {puede('VER_VENTAS') && <button type="button" className="adm-boton adm-boton--principal" onClick={() => navigate('/ventas/nueva')}><FaPlus /> Nueva venta</button>}
                </div>
                <div className="adm-cabecera__avance" role="progressbar" aria-label="Avance del período" aria-valuenow={avance} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${avance}%` }} />
                </div>
            </header>

            <section className="adm-kpis">
                <Kpi etiqueta="Ventas del período" valor={corto(ventas.total)} titulo={formatCOP(ventas.total)} onClick={() => navigate('/ventas')}>
                    <Variacion pct={ventas.variacion_pct} /> vs. {corto(ventas.anterior_corte)} al mismo día
                </Kpi>
                <Kpi etiqueta="Ventas de hoy" valor={corto(ventas.hoy_total)} titulo={formatCOP(ventas.hoy_total)} onClick={() => navigate('/ventas')}>
                    {ventas.hoy_cantidad} {ventas.hoy_cantidad === 1 ? 'venta' : 'ventas'} · ticket del período {corto(ventas.ticket_promedio)}
                </Kpi>
                <Kpi etiqueta="Proyección al cierre" valor={corto(ventas.proyeccion)} titulo={`Al ritmo actual: ${formatCOP(ventas.proyeccion)}`}>
                    <span className="adm-kpi__barra"><span style={{ width: `${Math.min(100, frenteAnterior || 0)}%` }} /></span>
                    {frenteAnterior === null ? 'Sin datos del período anterior' : `${frenteAnterior.toLocaleString('es-CO')} % de lo que cerró el período anterior (${corto(ventas.anterior_total)})`}
                </Kpi>
                {dinero.recaudo_periodo !== undefined && (
                    <Kpi etiqueta="Recaudo confirmado" valor={corto(dinero.recaudo_periodo)} titulo={formatCOP(dinero.recaudo_periodo)} onClick={() => navigate('/recibos-caja')}>
                        Hoy {corto(dinero.recaudo_hoy)}{ventas.descuento_pct !== null ? ` · dcto. promedio ${ventas.descuento_pct.toLocaleString('es-CO')} %` : ''}
                    </Kpi>
                )}
                {dinero.saldo_caja !== undefined && (
                    <Kpi etiqueta="Saldo en caja" valor={corto(dinero.saldo_caja)} titulo={formatCOP(dinero.saldo_caja)} onClick={() => navigate('/caja')}>
                        {dinero.cartera !== undefined ? `Por cobrar ${corto(dinero.cartera)} en ${dinero.cartera_ventas} ventas (${dinero.ventana_dias} días)` : 'Caja general'}
                    </Kpi>
                )}
            </section>

            <div className="adm-grid">
                <div className="adm-col">
                    <RitmoVentas datos={datos} />
                    <Asesores asesores={asesores} total={ventas.total} porSede={ventas.por_sede} puedeNomina={puede('VER_NOMINA')} />
                </div>
                <div className="adm-col">
                    <Atencion items={atencion} />
                    {ia && <PanelIA ia={ia} datos={datos} />}
                </div>
            </div>

            {ultimas.length > 0 && (
                <section className="adm-card adm-ultimas">
                    <div className="adm-card__cabeza">
                        <div>
                            <span className="adm-eyebrow">Actividad</span>
                            <h2>Últimas ventas</h2>
                        </div>
                        <Link to="/ventas" className="adm-enlace">Ver todas <FaArrowRight /></Link>
                    </div>
                    <div className="ds-table-scroll">
                        <table className="adm-tabla">
                            <thead>
                                <tr><th>Venta</th><th>Fecha</th><th>Cliente</th><th>Asesor</th><th>Sede</th><th className="is-num">Valor</th><th className="is-num">Saldo</th><th>Gestión</th></tr>
                            </thead>
                            <tbody>
                                {ultimas.map(v => (
                                    <tr key={v.id}>
                                        <td><strong>#{v.id}</strong></td>
                                        <td>{diaMes(v.fecha)}</td>
                                        <td>{v.cliente}</td>
                                        <td>{v.vendedores}</td>
                                        <td>{v.sede || '—'}</td>
                                        <td className="is-num">{formatCOP(v.valor_total)}</td>
                                        <td className="is-num">{v.saldo > 0 ? formatCOP(v.saldo) : <span className="adm-pagada">Pagada</span>}</td>
                                        <td><span className={`adm-gestion is-${v.gestion}`}>{GESTION[v.gestion] || '—'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
};

export default AdminHomePage;
