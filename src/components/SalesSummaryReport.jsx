import React, { useMemo, useContext } from 'react';
import { AppContext } from '../AppContext';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { FaMoneyBillWave, FaShoppingCart, FaChartLine, FaWallet, FaCalendarDay } from 'react-icons/fa';
import './SalesSummaryReport.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const SalesSummaryReport = ({ ventas, vendedores, selectedMonthYear, formatCurrency, capitalizeEstado }) => {
    const { usuario } = useContext(AppContext);

    const {
        kpis,
        chartData,
        salesByVendedor
    } = useMemo(() => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

        let totalSales = 0;
        let salesToday = 0;
        let totalRecaudo = 0;
        let totalSaldo = 0;
        let salesCount = ventas.length;

        const salesByDate = {};
        const salesByStatus = { pendiente: 0, entregado: 0, anulado: 0 };
        const salesByVendedorMap = {};

        // Initialize vendor map
        vendedores.forEach(v => {
            salesByVendedorMap[v.id] = { name: v.first_name, total: 0, count: 0 };
        });

        ventas.forEach(venta => {
            const valor = parseFloat(venta.valor_total) || 0;
            const abono = parseFloat(venta.abono) || 0;
            const saldo = parseFloat(venta.saldo) || 0;

            // KPIs
            totalSales += valor;
            totalRecaudo += abono;
            totalSaldo += saldo;

            if (venta.fecha_venta === todayStr) {
                salesToday += valor;
            }

            // Chart Data: Trend (Daily Sales)
            const date = venta.fecha_venta; // Assuming YYYY-MM-DD
            if (date) {
                salesByDate[date] = (salesByDate[date] || 0) + valor;
            }

            // Chart Data: Status
            const status = venta.estado ? venta.estado.toLowerCase() : 'pendiente';
            if (salesByStatus[status] !== undefined) {
                salesByStatus[status]++;
            } else {
                // Fallback for other statuses
                salesByStatus['pendiente']++;
            }

            // Chart Data: Top Sellers
            // Find vendor ID by name if needed, or use ID if available in venta
            // The previous code mapped name to ID, let's try to match robustly
            const vendorId = vendedores.find(v => v.first_name === venta.vendedor_nombre)?.id;
            if (vendorId && salesByVendedorMap[vendorId]) {
                salesByVendedorMap[vendorId].total += valor;
                salesByVendedorMap[vendorId].count++;
            }
        });

        // Prepare Chart Datasets

        // 1. Line Chart (Trend)
        const sortedDates = Object.keys(salesByDate).sort();
        const lineChartData = {
            labels: sortedDates.map(d => {
                const [y, m, day] = d.split('-');
                return `${day}/${m}`;
            }),
            datasets: [
                {
                    label: 'Ventas Diarias',
                    data: sortedDates.map(d => salesByDate[d]),
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#4f46e5',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#4f46e5',
                }
            ]
        };

        // 2. Doughnut Chart (Status)
        const doughnutChartData = {
            labels: ['Entregado', 'Pendiente', 'Anulado'],
            datasets: [
                {
                    data: [salesByStatus.entregado, salesByStatus.pendiente, salesByStatus.anulado],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 0,
                    hoverOffset: 4
                }
            ]
        };

        // 3. Bar Chart (Top Sellers)
        const sortedVendors = Object.values(salesByVendedorMap).sort((a, b) => b.total - a.total).slice(0, 5); // Top 5
        const barChartData = {
            labels: sortedVendors.map(v => v.name),
            datasets: [
                {
                    label: 'Total Vendido',
                    data: sortedVendors.map(v => v.total),
                    backgroundColor: '#3b82f6',
                    borderRadius: 4,
                }
            ]
        };

        return {
            kpis: {
                salesToday,
                totalSales,
                totalRecaudo,
                totalSaldo,
                salesCount
            },
            chartData: {
                line: lineChartData,
                doughnut: doughnutChartData,
                bar: barChartData
            },
            salesByVendedor: sortedVendors
        };

    }, [ventas, vendedores]);

    // Chart Options
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 10,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += formatCurrency(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: {
                grid: { borderDash: [4, 4], color: '#f3f4f6' },
                ticks: { display: false } // Hide Y axis labels for cleaner look
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } }
        },
        cutout: '70%',
    };

    return (
        <div className="dashboard-container">
            {/* KPI Grid */}
            <div className="kpi-grid">
                <div className="kpi-card highlight">
                    <div className="kpi-icon"><FaCalendarDay /></div>
                    <div className="kpi-content">
                        <h3>Ventas Hoy</h3>
                        <p className="kpi-value">{formatCurrency(kpis.salesToday)}</p>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon blue"><FaChartLine /></div>
                    <div className="kpi-content">
                        <h3>Ventas Mes</h3>
                        <p className="kpi-value">{formatCurrency(kpis.totalSales)}</p>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon green"><FaMoneyBillWave /></div>
                    <div className="kpi-content">
                        <h3>Abonos</h3>
                        <p className="kpi-value">{formatCurrency(kpis.totalRecaudo)}</p>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon red"><FaWallet /></div>
                    <div className="kpi-content">
                        <h3>Saldos</h3>
                        <p className="kpi-value">{formatCurrency(kpis.totalSaldo)}</p>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon purple"><FaShoppingCart /></div>
                    <div className="kpi-content">
                        <h3>Total Ventas</h3>
                        <p className="kpi-value">{kpis.salesCount}</p>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
                <div className="chart-card large">
                    <div className="chart-header">
                        <h4>Tendencia de Ventas</h4>
                    </div>
                    <div className="chart-wrapper">
                        <Line data={chartData.line} options={commonOptions} />
                    </div>
                </div>

                <div className="chart-card">
                    <div className="chart-header">
                        <h4>Estado de Pedidos</h4>
                    </div>
                    <div className="chart-wrapper">
                        <Doughnut data={chartData.doughnut} options={doughnutOptions} />
                    </div>
                </div>

                {(usuario.role === 'administrador' || usuario.role === 'auxiliar') && (
                    <div className="chart-card">
                        <div className="chart-header">
                            <h4>Top Vendedores</h4>
                        </div>
                        <div className="chart-wrapper">
                            <Bar data={chartData.bar} options={commonOptions} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesSummaryReport;