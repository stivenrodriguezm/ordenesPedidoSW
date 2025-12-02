import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AppContext } from '../AppContext';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import {
    FaChartLine,
    FaTrophy,
    FaHourglassHalf,
    FaClock,
    FaMoneyBillWave,
    FaPlus,
    FaShoppingCart,
    FaCashRegister,
    FaFileInvoiceDollar,
    FaUsers,
    FaBox,
    FaArrowUp,
    FaArrowDown
} from 'react-icons/fa';
import Loader from '../components/Loader';
import './AdminHomePage.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const AdminHomePage = () => {
    const { usuario } = useContext(AppContext);
    const [greeting, setGreeting] = useState('');
    const [stats, setStats] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

        const fetchData = async () => {
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
        };

        fetchData();
    }, []);

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
        return date.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getTimeBasedGradient = () => {
        const now = new Date();
        const hour = now.getHours();

        if (hour < 12) return 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'; // Morning - Deep Blue
        if (hour < 18) return 'linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%)'; // Afternoon - Bright Blue
        return 'linear-gradient(135deg, #0c4a6e 0%, #0891b2 100%)'; // Evening - Ocean Blue
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: {
                        size: 12,
                        family: "'Inter', sans-serif",
                        weight: 600
                    },
                    padding: 15,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            title: {
                display: true,
                text: 'Comparativa de Ventas',
                font: {
                    size: 18,
                    family: "'Inter', sans-serif",
                    weight: 700
                },
                padding: 20,
                color: '#1f2937'
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        return formatCurrency(value);
                    },
                    font: {
                        size: 11,
                        family: "'Inter', sans-serif"
                    }
                },
                grid: {
                    color: '#f1f5f9',
                    drawBorder: false
                }
            },
            x: {
                ticks: {
                    font: {
                        size: 11,
                        family: "'Inter', sans-serif"
                    }
                },
                grid: {
                    display: false
                }
            }
        }
    };

    if (loading) {
        return <Loader text="Cargando dashboard..." />;
    }

    if (error) {
        return (
            <div className="admin-home-container">
                <div className="error-message-box">{error}</div>
            </div>
        );
    }

    return (
        <div className="admin-home-container">
            {/* Hero Section */}
            <header className="admin-hero" style={{ background: getTimeBasedGradient() }}>
                <div className="hero-content">
                    <div className="user-avatar-large">
                        {usuario?.first_name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <h1 className="admin-greeting">
                        {greeting}, <span className="user-name">{usuario?.first_name || 'Admin'}</span>!
                    </h1>
                    <p className="admin-subtitle">Panel de Control - Muebles Lottus</p>
                </div>
            </header>

            {/* Statistics Grid */}
            <section className="stats-section">
                <div className="stats-grid-enhanced">

                    <div className="stat-card-enhanced stat-ventas-mes">
                        <div className="stat-icon-wrapper">
                            <FaTrophy className="stat-icon" />
                        </div>
                        <div className="stat-details">
                            <p className="stat-label">Ventas del Mes</p>
                            <h3 className="stat-value">{formatCurrency(stats?.ventas_mes || 0)}</h3>
                            <span className="stat-trend positive">
                                <FaArrowUp /> En progreso
                            </span>
                        </div>
                        <div className="stat-sparkle"></div>
                    </div>

                    <div className="stat-card-enhanced stat-pedidos-pendientes">
                        <div className="stat-icon-wrapper">
                            <FaHourglassHalf className="stat-icon" />
                        </div>
                        <div className="stat-details">
                            <p className="stat-label">Ventas con pedidos pendientes</p>
                            <h3 className="stat-value">{stats?.pedidos_pendientes || 0}</h3>
                            <span className="stat-trend neutral">
                                <FaHourglassHalf /> Pendientes
                            </span>
                        </div>
                        <div className="stat-sparkle"></div>
                    </div>

                    <div className="stat-card-enhanced stat-ordenes-atrasadas">
                        <div className="stat-icon-wrapper">
                            <FaClock className="stat-icon" />
                        </div>
                        <div className="stat-details">
                            <p className="stat-label">Órdenes de pedido atrasadas</p>
                            <h3 className="stat-value">{stats?.ordenes_atrasadas || 0}</h3>
                            <span className="stat-trend warning">
                                <FaClock /> Atrasadas
                            </span>
                        </div>
                        <div className="stat-sparkle"></div>
                    </div>
                </div>
            </section>

            {/* Main Content Grid */}
            <div className="main-content-grid">
                {/* Quick Actions */}
                <section className="quick-actions-section">
                    <h2 className="section-title">Acciones Rápidas</h2>
                    <div className="actions-grid-admin">
                        <Link to="/nuevaVenta" className="action-card-admin action-primary">
                            <div className="action-icon-bg">
                                <FaPlus />
                            </div>
                            <h3>Nueva Venta</h3>
                            <p>Registrar venta</p>
                        </Link>

                        <Link to="/ordenes/nuevo" className="action-card-admin">
                            <div className="action-icon-bg">
                                <FaShoppingCart />
                            </div>
                            <h3>Nueva Orden</h3>
                            <p>Crear pedido</p>
                        </Link>

                        <Link to="/caja" state={{ openForm: true }} className="action-card-admin">
                            <div className="action-icon-bg">
                                <FaCashRegister />
                            </div>
                            <h3>Mov. Caja</h3>
                            <p>Gestionar caja</p>
                        </Link>

                        <Link to="/recibos-caja" state={{ openForm: true }} className="action-card-admin">
                            <div className="action-icon-bg">
                                <FaFileInvoiceDollar />
                            </div>
                            <h3>Nuevo RC</h3>
                            <p>Recibo de caja</p>
                        </Link>

                        <Link to="/clientes" className="action-card-admin">
                            <div className="action-icon-bg">
                                <FaUsers />
                            </div>
                            <h3>Clientes</h3>
                            <p>Gestionar clientes</p>
                        </Link>

                        <Link to="/referencias" className="action-card-admin">
                            <div className="action-icon-bg">
                                <FaBox />
                            </div>
                            <h3>Productos</h3>
                            <p>Ver catálogo</p>
                        </Link>
                    </div>
                </section>

                {/* Sales Chart */}
                <section className="chart-section">
                    <h2 className="section-title">Análisis de Ventas</h2>
                    <div className="chart-wrapper">
                        {chartData && <Bar options={chartOptions} data={chartData} />}
                    </div>
                </section>
            </div>

            {/* Recent Sales Table */}
            <section className="recent-sales-section">
                <div className="section-header">
                    <h2 className="section-title">Últimas Ventas Registradas</h2>
                    <Link to="/ventas" className="view-all-link">
                        Ver todas →
                    </Link>
                </div>
                <div className="table-wrapper">
                    <table className="sales-table-enhanced">
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
                            {stats?.ultimas_ventas && stats.ultimas_ventas.length > 0 ? (
                                stats.ultimas_ventas.map(venta => (
                                    <tr key={venta.id}>
                                        <td>
                                            <span className="sale-id">#{venta.id}</span>
                                        </td>
                                        <td className="cliente-cell">{venta.cliente_nombre}</td>
                                        <td className="valor-cell">{formatCurrency(venta.valor_total)}</td>
                                        <td className="fecha-cell">{formatDate(venta.fecha_venta)}</td>
                                        <td>
                                            <span className={`status-badge-enhanced status-${venta.estado?.toLowerCase()}`}>
                                                {venta.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="empty-state">
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
