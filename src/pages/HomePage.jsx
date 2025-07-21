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
import Loader from '../components/Loader';
import './HomePage.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const HomePage = () => {
    const { usuario } = useContext(AppContext); // Obtener usuario del contexto de autenticación
    const [greeting, setGreeting] = useState('');
    const [stats, setStats] = useState({
        ventas_dia: 0,
        ventas_mes: 0,
    });
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // 1. Saludo dinámico
        const getGreeting = () => {
            const now = new Date();
            const options = { timeZone: 'America/Bogota', hour: '2-digit', hour12: false };
            const hour = parseInt(new Intl.DateTimeFormat('en-US', options).format(now));

            if (hour < 12) return 'Buenos días';
            if (hour < 18) return 'Buenas tardes';
            return 'Buenas noches';
        };
        setGreeting(getGreeting());

        // 2. Fetch de datos
        const fetchData = async () => {
            try {
                const statsPromise = api.get('/dashboard-stats/');
                const chartPromise = api.get('/sales-chart-data/');
                
                const [statsResponse, chartResponse] = await Promise.all([statsPromise, chartPromise]);
                
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
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Comparativa de Ventas (Últimos 2 Años)',
                font: { size: 16 }
            },
        },
        scales: {
            y: {
                ticks: {
                    callback: function(value) {
                        return formatCurrency(value);
                    }
                }
            }
        }
    };

    if (loading) {
        return (
            <div className="homepage-container">
                <Loader text="Cargando dashboard..." />
            </div>
        );
    }

    if (error) {
        return <div className="homepage-container error-message"><p>{error}</p></div>;
    }

    return (
        <div className="homepage-container">

            <div className="dashboard-layout">
                {/* Columna Izquierda: Stats y Accesos Rápidos */}
                <div className="left-column">
                    <h2 className="greeting-title">{`${greeting}, ${usuario?.first_name || ''}`}!</h2>
                    <p className="welcome-message">Bienvenido al sistema de gestión de Muebles Lottus.</p>
                    <div className="stats-and-access">
                        <div className="stats-grid-condensed">
                            <div className="stat-card">
                                <h3>Ventas del Día</h3>
                                <p>{formatCurrency(stats.ventas_dia)}</p>
                            </div>
                            <div className="stat-card">
                                <h3>Ventas del Mes</h3>
                                <p>{formatCurrency(stats.ventas_mes)}</p>
                            </div>
                        </div>
                        <div className="quick-access-condensed">
                            <Link to="/nuevaVenta" className="access-button">Nueva Venta</Link>
                            <Link to="/ordenes/nuevo" className="access-button">Nueva Orden</Link>
                            <Link to="/caja" state={{ openForm: true }} className="access-button">Movimiento Caja</Link>
                            <Link to="/recibos-caja" state={{ openForm: true }} className="access-button">Nuevo RC</Link>
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Gráfico */}
                <div className="right-column">
                    <div className="chart-container">
                        {chartData && <Bar options={chartOptions} data={chartData} />}
                    </div>
                </div>
            </div>

            {/* Actividad Reciente (se mantiene abajo) */}
            <div className="recent-activity">
                <h3>Últimas Ventas Registradas</h3>
                <table className="activity-table">
                    <thead>
                        <tr>
                            <th>ID Venta</th>
                            <th>Cliente</th>
                            <th>Valor Total</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.ultimas_ventas && stats.ultimas_ventas.length > 0 ? (
                            stats.ultimas_ventas.map(venta => (
                                <tr key={venta.id_venta}>
                                    <td>{venta.id_venta}</td>
                                    <td>{venta.cliente}</td>
                                    <td>{formatCurrency(venta.valor)}</td>
                                    <td>{new Date(venta.fecha_venta).toLocaleDateString('es-CO')}</td>
                                    <td><span className={`status-badge status-${venta.estado}`}>{venta.estado}</span></td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5">No hay ventas recientes para mostrar.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default HomePage;
