import React, { useState, useContext, useCallback, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AppContext } from '../AppContext';
import { usePageRefresh } from '../hooks/usePageRefresh';
import { formatCOP } from '../utils/formatCOP';
import { formatDateCorta, formatDateLarga, getTodayStr } from '../utils/dates';
import { StatCard, Badge, LoadingBlock, ErrorState } from '../components/ui';
import {
    FaChartLine,
    FaTrophy,
    FaHourglassHalf,
    FaClock,
    FaCashRegister,
    FaPlus,
    FaShoppingCart,
    FaFileInvoiceDollar,
    FaUsers,
    FaBox,
    FaArrowRight
} from 'react-icons/fa';
import './AdminHomePage.css';

// chart.js + react-chartjs-2 se cargan bajo demanda (ver components/charts.js)
const Bar = lazy(() => import('../components/charts').then(m => ({ default: m.Bar })));

// Paleta del design system para la gráfica (año anterior / año actual)
const CHART_COLORS = ['#cbd5e1', '#0e9f6e'];

const QUICK_ACTIONS = [
    { to: '/ventas/nueva', icon: FaPlus, label: 'Nueva Venta', hint: 'Registrar venta', primary: true },
    { to: '/ordenes/nuevo', icon: FaShoppingCart, label: 'Nueva Orden', hint: 'Crear pedido' },
    { to: '/caja', icon: FaCashRegister, label: 'Mov. Caja', hint: 'Gestionar caja', state: { openForm: true } },
    { to: '/recibos-caja', icon: FaFileInvoiceDollar, label: 'Nuevo RC', hint: 'Recibo de caja', state: { openForm: true } },
    { to: '/clientes', icon: FaUsers, label: 'Clientes', hint: 'Gestionar clientes' },
    { to: '/referencias', icon: FaBox, label: 'Productos', hint: 'Ver catálogo' },
];

const estadoTone = (estado) => {
    const e = (estado || '').toLowerCase();
    if (['pagada', 'completada', 'entregada'].includes(e)) return 'success';
    if (['pendiente'].includes(e)) return 'warning';
    if (['anulada', 'cancelada'].includes(e)) return 'danger';
    return 'neutral';
};

const AdminHomePage = () => {
    const { usuario } = useContext(AppContext);
    const navigate = useNavigate();
    const [greeting, setGreeting] = useState('');
    const [stats, setStats] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        const getGreeting = () => {
            const now = new Date();
            const options = { timeZone: 'America/Bogota', hour: '2-digit', hour12: false };
            const hour = parseInt(new Intl.DateTimeFormat('en-US', options).format(now));
            if (hour < 12) return 'Buenos días';
            if (hour < 18) return 'Buenas tardes';
            return 'Buenas noches';
        };
        setGreeting(getGreeting());
        setLoading(true);
        setError(null);
        try {
            const [statsResponse, chartResponse] = await Promise.all([
                api.get('/dashboard-stats/'),
                api.get('/sales-chart-data/')
            ]);
            setStats(statsResponse.data);
            setChartData(chartResponse.data);
        } catch (err) {
            setError('No se pudieron cargar los datos del dashboard.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    usePageRefresh(fetchData);

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '$0';
        return formatCOP(value);
    };

    // Aplica la paleta del design system a los datasets que vienen del backend
    const styledChartData = chartData && {
        ...chartData,
        datasets: chartData.datasets.map((ds, i) => ({
            ...ds,
            backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
            hoverBackgroundColor: i === 1 ? '#B5952F' : '#94a3b8',
            borderRadius: 6,
            maxBarThickness: 26,
        })),
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: {
                    font: { size: 12, family: "'Inter', sans-serif", weight: 600 },
                    padding: 16,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    color: '#475569',
                }
            },
            tooltip: {
                callbacks: {
                    label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => formatCurrency(value),
                    font: { size: 11, family: "'Inter', sans-serif" },
                    color: '#94a3b8',
                },
                grid: { color: '#f1f5f9', drawBorder: false }
            },
            x: {
                ticks: { font: { size: 11, family: "'Inter', sans-serif" }, color: '#94a3b8' },
                grid: { display: false }
            }
        }
    };

    if (loading) {
        return (
            <div className="ds-page">
                <LoadingBlock message="Cargando dashboard..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="ds-page">
                <ErrorState message={error} onRetry={fetchData} />
            </div>
        );
    }

    return (
        <div className="ds-page admin-home ds-fade-in">
            {/* Hero */}
            <header className="admin-hero ds-card">
                <div className="admin-hero__avatar">
                    {usuario?.first_name?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <div className="admin-hero__text">
                    <h1 className="admin-hero__greeting">
                        {greeting}, {usuario?.first_name || 'Admin'}
                    </h1>
                    <p className="admin-hero__date">{formatDateLarga(getTodayStr())} · Panel de Control</p>
                </div>
            </header>

            {/* KPIs */}
            <section className="admin-kpis">
                <StatCard
                    icon={FaTrophy}
                    label="Ventas del mes"
                    value={formatCurrency(stats?.ventas_mes)}
                    onClick={() => navigate('/ventas')}
                />
                <StatCard
                    icon={FaChartLine}
                    label="Ventas de hoy"
                    value={formatCurrency(stats?.ventas_dia)}
                    tone="info"
                    onClick={() => navigate('/ventas')}
                />
                <StatCard
                    icon={FaCashRegister}
                    label="Saldo en caja"
                    value={formatCurrency(stats?.saldo_caja)}
                    tone="success"
                    onClick={() => navigate('/caja')}
                />
                <StatCard
                    icon={FaHourglassHalf}
                    label="Pedidos pendientes"
                    value={stats?.pedidos_pendientes ?? 0}
                    tone="warning"
                    onClick={() => navigate('/ordenes')}
                />
                <StatCard
                    icon={FaClock}
                    label="Órdenes atrasadas"
                    value={stats?.ordenes_atrasadas ?? 0}
                    tone="danger"
                    onClick={() => navigate('/ordenes')}
                />
            </section>

            {/* Gráfica + acciones rápidas */}
            <div className="admin-grid">
                <section className="ds-card admin-chart">
                    <div className="admin-section-head">
                        <div>
                            <h2>Análisis de Ventas</h2>
                            <p className="ds-muted">Comparativa año anterior vs año actual</p>
                        </div>
                    </div>
                    <div className="admin-chart__canvas">
                        {styledChartData && (
                            <Suspense fallback={<LoadingBlock message="Cargando gráfico..." />}>
                                <Bar options={chartOptions} data={styledChartData} />
                            </Suspense>
                        )}
                    </div>
                </section>

                <aside className="ds-card admin-actions">
                    <div className="admin-section-head">
                        <h2>Acciones Rápidas</h2>
                    </div>
                    <div className="admin-actions__list">
                        {QUICK_ACTIONS.map(({ to, icon: Icon, label, hint, state, primary }) => (
                            <Link
                                key={to}
                                to={to}
                                state={state}
                                className={`admin-action ${primary ? 'admin-action--primary' : ''}`}
                            >
                                <span className="admin-action__icon"><Icon /></span>
                                <span className="admin-action__body">
                                    <span className="admin-action__label">{label}</span>
                                    <span className="admin-action__hint">{hint}</span>
                                </span>
                                <FaArrowRight className="admin-action__arrow" />
                            </Link>
                        ))}
                    </div>
                </aside>
            </div>

            {/* Últimas ventas */}
            <section className="ds-card admin-recent">
                <div className="admin-section-head">
                    <h2>Últimas Ventas Registradas</h2>
                    <Link to="/ventas" className="admin-view-all">
                        Ver todas <FaArrowRight />
                    </Link>
                </div>
                <div className="ds-table-scroll">
                    <table className="ds-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Cliente</th>
                                <th>Valor Total</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.ultimas_ventas?.length > 0 ? (
                                stats.ultimas_ventas.map(venta => (
                                    <tr key={venta.id}>
                                        <td><strong>#{venta.id}</strong></td>
                                        <td>{venta.cliente_nombre}</td>
                                        <td>{formatCurrency(venta.valor_total)}</td>
                                        <td>{formatDateCorta(venta.fecha_venta)}</td>
                                        <td><Badge tone={estadoTone(venta.estado)}>{venta.estado}</Badge></td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                                        No hay ventas recientes para mostrar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default AdminHomePage;
