import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppContext } from '../AppContext';
import api from '../services/api';
import { usePageRefresh } from '../hooks/usePageRefresh';
import { StatCard, Badge, LoadingBlock, ErrorState, EmptyState } from '../components/ui';
import {
    FaClipboardList,
    FaFileInvoiceDollar,
    FaHistory,
    FaShoppingCart,
    FaExclamationTriangle,
    FaClock,
    FaHourglassHalf,
    FaArrowRight,
    FaQuoteLeft
} from 'react-icons/fa';
import './VendedorHomePage.css';
import { formatCOP } from '../utils/formatCOP';
import { formatDateLarga, getTodayStr, formatDateCorta } from '../utils/dates';

const MOTIVATIONAL_QUOTES = [
    "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
    "No cuentes los días, haz que los días cuenten.",
    "La diferencia entre lo imposible y lo posible está en la determinación de una persona.",
    "El único modo de hacer un gran trabajo es amar lo que haces.",
    "Cada venta es el comienzo de una nueva relación.",
    "Tu actitud determina tu dirección.",
    "El secreto del éxito está en la constancia del propósito."
];

const QUICK_ACTIONS = [
    { to: '/ordenes/nuevo', icon: FaShoppingCart, label: 'Crear Pedido', hint: 'Inicia un nuevo pedido', primary: true },
    { to: '/ventas', icon: FaFileInvoiceDollar, label: 'Mis Ventas', hint: 'Historial de ventas' },
    { to: '/ordenes', icon: FaClipboardList, label: 'Mis Pedidos', hint: 'Estado de pedidos' },
];

const VendedorHomePage = () => {
    const { usuario } = useContext(AppContext);
    const navigate = useNavigate();
    const [greeting, setGreeting] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [motivationalQuote] = useState(
        () => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]
    );

    useEffect(() => {
        const getGreeting = () => {
            const now = new Date();
            const options = { timeZone: 'America/Bogota', hour: '2-digit', hour12: false };
            const hour = parseInt(new Intl.DateTimeFormat('en-US', options).format(now));
            if (hour < 12) return 'Buenos días';
            if (hour < 18) return 'Buenas tardes';
            return 'Buenas noches';
        };
        setGreeting(getGreeting());
    }, []);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [statsResponse, activityResponse] = await Promise.all([
                api.get('/dashboard-stats/'),
                api.get('/vendedor-recent-activity/')
            ]);

            setStats(statsResponse.data);
            setRecentActivity(activityResponse.data);
        } catch (err) {
            setError('No se pudo cargar tu información. Intenta de nuevo.');
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    usePageRefresh(fetchDashboardData);

    if (loading) {
        return (
            <div className="ds-page">
                <LoadingBlock message="Cargando tu espacio..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="ds-page">
                <ErrorState message={error} onRetry={fetchDashboardData} />
            </div>
        );
    }

    return (
        <div className="ds-page vendedor-home ds-fade-in">
            {/* Hero */}
            <header className="vendedor-hero ds-card">
                <div className="vendedor-hero__avatar">
                    {usuario?.first_name?.charAt(0)?.toUpperCase() || 'V'}
                </div>
                <div className="vendedor-hero__text">
                    <h1 className="vendedor-hero__greeting">
                        {greeting}, {usuario?.first_name || 'Vendedor'}
                    </h1>
                    <p className="vendedor-hero__date">{formatDateLarga(getTodayStr())}</p>
                </div>
                <p className="vendedor-hero__quote">
                    <FaQuoteLeft /> {motivationalQuote}
                </p>
            </header>

            {/* KPIs */}
            <section className="vendedor-kpis">
                <StatCard
                    icon={FaExclamationTriangle}
                    label="Ventas por entregar"
                    value={stats?.ventas_pendientes ?? 0}
                    tone="warning"
                    onClick={() => navigate('/ventas')}
                />
                <StatCard
                    icon={FaHourglassHalf}
                    label="Pedidos pendientes"
                    value={stats?.pedidos_pendientes ?? 0}
                    tone="info"
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

            <div className="vendedor-grid">
                {/* Accesos rápidos */}
                <aside className="ds-card vendedor-actions">
                    <div className="vendedor-section-head">
                        <h2>Accesos Rápidos</h2>
                    </div>
                    <div className="vendedor-actions__list">
                        {QUICK_ACTIONS.map(({ to, icon: Icon, label, hint, primary }) => (
                            <Link
                                key={to}
                                to={to}
                                className={`vendedor-action ${primary ? 'vendedor-action--primary' : ''}`}
                            >
                                <span className="vendedor-action__icon"><Icon /></span>
                                <span className="vendedor-action__body">
                                    <span className="vendedor-action__label">{label}</span>
                                    <span className="vendedor-action__hint">{hint}</span>
                                </span>
                                <FaArrowRight className="vendedor-action__arrow" />
                            </Link>
                        ))}
                    </div>
                </aside>

                {/* Actividad reciente */}
                <section className="ds-card vendedor-activity">
                    <div className="vendedor-section-head">
                        <h2><FaHistory style={{ marginRight: '0.4rem', color: 'var(--text-muted)' }} /> Actividad Reciente</h2>
                    </div>
                    {recentActivity?.length > 0 ? (
                        <ul className="vendedor-activity__list">
                            {recentActivity.map((item, index) => (
                                <li key={index} className="vendedor-activity__item">
                                    <Badge tone={item.type === 'venta' ? 'accent' : 'info'}>
                                        {item.type === 'venta' ? 'Venta' : 'Pedido'}
                                    </Badge>
                                    <span className="vendedor-activity__desc">
                                        {item.type === 'venta'
                                            ? `#${item.id} · ${item.cliente}`
                                            : `#${item.id} · ${item.proveedor}`}
                                    </span>
                                    <span className="vendedor-activity__date">
                                        {formatDateCorta(item.fecha)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState title="Sin actividad reciente" message="Tus ventas y pedidos recientes aparecerán aquí." />
                    )}
                </section>
            </div>
        </div>
    );
};

export default VendedorHomePage;
