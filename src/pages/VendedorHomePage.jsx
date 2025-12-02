import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../AppContext';
import api from '../services/api';
import {
    FaPlus,
    FaClipboardList,
    FaFileInvoiceDollar,
    FaUsers,
    FaHistory,
    FaShoppingCart,
    FaExclamationTriangle,
    FaClock,
    FaHourglassHalf
} from 'react-icons/fa';
import './VendedorHomePage.css';
import Loader from '../components/Loader';

const VendedorHomePage = () => {
    const { usuario } = useContext(AppContext);
    const [greeting, setGreeting] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [motivationalQuote, setMotivationalQuote] = useState('');

    const motivationalQuotes = [
        "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
        "No cuentes los días, haz que los días cuenten.",
        "La diferencia entre lo imposible y lo posible está en la determinación de una persona.",
        "El único modo de hacer un gran trabajo es amar lo que haces.",
        "Cada venta es el comienzo de una nueva relación.",
        "Tu actitud determina tu dirección.",
        "El secreto del éxito está en la constancia del propósito."
    ];

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

        // Set random motivational quote
        const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
        setMotivationalQuote(randomQuote);

        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [statsResponse, activityResponse] = await Promise.all([
                api.get('/dashboard-stats/'),
                api.get('/vendedor-recent-activity/')
            ]);

            setStats(statsResponse.data);
            setRecentActivity(activityResponse.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '$0';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const options = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString('es-ES', options);
    };

    const getTimeBasedGradient = () => {
        const now = new Date();
        const hour = now.getHours();

        if (hour < 12) return 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'; // Morning - Deep Blue
        if (hour < 18) return 'linear-gradient(135deg, #1e3a8a 0%, #0ea5e9 100%)'; // Afternoon - Dark Blue
        return 'linear-gradient(135deg, #0c4a6e 0%, #0891b2 100%)'; // Evening - Ocean Blue
    };

    if (loading) {
        return <Loader text="Cargando tu espacio..." />;
    }

    return (
        <div className="vendedor-home-container">
            {/* Hero Section */}
            <header className="vendedor-hero" style={{ background: getTimeBasedGradient() }}>
                <div className="hero-content">
                    <h1 className="vendedor-greeting">
                        {greeting}, <span className="user-name">{usuario?.first_name || 'Vendedor'}</span>!
                    </h1>
                    <p className="vendedor-quote">"{motivationalQuote}"</p>
                </div>
            </header>

            {/* Statistics Dashboard */}
            <section className="stats-dashboard">
                <div className="stats-grid">
                    <div className="stat-card stat-ventas-pendientes">
                        <div className="stat-icon">
                            <FaExclamationTriangle />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Ventas pendientes por entregar</p>
                            <h3 className="stat-value">{stats?.ventas_pendientes || 0}</h3>
                        </div>
                        <div className="stat-decoration"></div>
                    </div>

                    <div className="stat-card stat-pedidos-pendientes">
                        <div className="stat-icon">
                            <FaHourglassHalf />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Ventas con pedidos pendientes</p>
                            <h3 className="stat-value">{stats?.pedidos_pendientes || 0}</h3>
                        </div>
                        <div className="stat-decoration"></div>
                    </div>

                    <div className="stat-card stat-ordenes-atrasadas">
                        <div className="stat-icon">
                            <FaClock />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">Órdenes de pedido atrasadas</p>
                            <h3 className="stat-value">{stats?.ordenes_atrasadas || 0}</h3>
                        </div>
                        <div className="stat-decoration"></div>
                    </div>
                </div>
            </section>

            {/* Quick Actions */}
            <section className="quick-actions">
                <h2 className="section-title">Accesos Rápidos</h2>
                <div className="actions-grid">

                    <Link to="/ordenes/nuevo" className="action-card">
                        <div className="action-icon-wrapper">
                            <FaShoppingCart className="action-icon" />
                        </div>
                        <h3>Crear Pedido</h3>
                        <p>Inicia un nuevo pedido para un cliente</p>
                        <span className="action-arrow">→</span>
                    </Link>

                    <Link to="/ventas" className="action-card">
                        <div className="action-icon-wrapper">
                            <FaFileInvoiceDollar className="action-icon" />
                        </div>
                        <h3>Mis Ventas</h3>
                        <p>Consulta el historial de tus ventas</p>
                        <span className="action-arrow">→</span>
                    </Link>

                    <Link to="/ordenes" className="action-card">
                        <div className="action-icon-wrapper">
                            <FaClipboardList className="action-icon" />
                        </div>
                        <h3>Mis Pedidos</h3>
                        <p>Revisa el estado de tus pedidos</p>
                        <span className="action-arrow">→</span>
                    </Link>

                </div>
            </section>

            {/* Recent Activity */}
            <section className="recent-activity">
                <div className="section-header">
                    <h2 className="section-title">
                        <FaHistory className="title-icon" />
                        Actividad Reciente
                    </h2>
                </div>

                {recentActivity && recentActivity.length > 0 ? (
                    <div className="activity-timeline">
                        {recentActivity.map((item, index) => (
                            <div key={index} className={`activity-item activity-${item.type}`}>
                                <div className="activity-marker"></div>
                                <div className="activity-content">
                                    <div className="activity-header">
                                        <span className="activity-type-badge">
                                            {item.type === 'venta' ? 'Venta' : 'Pedido'}
                                        </span>
                                        <span className="activity-date">
                                            {formatDate(item.fecha)}
                                        </span>
                                    </div>
                                    <p className="activity-description">
                                        {item.type === 'venta'
                                            ? `Venta #${item.id} - ${item.cliente}`
                                            : `Pedido #${item.id} - ${item.proveedor}`
                                        }
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-activity">
                        <p>No hay actividad reciente</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default VendedorHomePage;