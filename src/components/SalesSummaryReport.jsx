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
import { FaMoneyBillWave, FaShoppingCart, FaChartLine, FaWallet, FaCalendarDay, FaRocket, FaTicketAlt, FaPercentage, FaExclamationTriangle, FaStore } from 'react-icons/fa';
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
        let perdidasAnulacion = 0;

        const salesByDate = {};
        const salesByStatus = { pendiente: 0, entregado: 0, anulado: 0 };
        const salesByVendedorMap = {};
        const salesBySede = {};
        const salesByDayOfWeek = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

        // Initialize vendor map
        vendedores.forEach(v => {
            salesByVendedorMap[v.id] = { name: v.first_name, total: 0, count: 0 };
        });

        ventas.forEach(venta => {
            const numSellers = 1 + (venta.vendedores_compartidos ? venta.vendedores_compartidos.length : 0);
            const valorFull = parseFloat(venta.valor_total) || 0;
            const valorPerSeller = valorFull / numSellers;
            const abono = parseFloat(venta.abono) || 0;
            const saldo = parseFloat(venta.saldo) || 0;

            // KPIs
            totalSales += valorFull;
            totalRecaudo += abono;
            totalSaldo += saldo;

            if (venta.fecha_venta === todayStr) {
                salesToday += valorFull;
            }

            // Chart Data: Trend (Daily Sales)
            const date = venta.fecha_venta; // Assuming YYYY-MM-DD
            if (date) {
                salesByDate[date] = (salesByDate[date] || 0) + valorFull;
            }

            // Chart Data: Status & Losses
            const status = venta.estado ? venta.estado.toLowerCase() : 'pendiente';
            if (salesByStatus[status] !== undefined) {
                salesByStatus[status]++;
            } else {
                // Fallback for other statuses
                salesByStatus['pendiente']++;
            }
            if (status === 'anulado') {
                perdidasAnulacion += valorFull;
            }

            // Day of Week
            if (date) {
                // We add T12:00:00 to avoid timezone offset issues pushing it to the previous day
                const dayIndex = new Date(`${date}T12:00:00`).getDay();
                salesByDayOfWeek[dayIndex] += valorFull;
            }

            // Chart Data: Sede
            const sedeName = venta.sede || 'Sin Sede';
            salesBySede[sedeName] = (salesBySede[sedeName] || 0) + valorFull;

            // Chart Data: Top Sellers
            // Primary seller
            const vendorId = vendedores.find(v => v.first_name === venta.vendedor_nombre)?.id;
            if (vendorId && salesByVendedorMap[vendorId]) {
                salesByVendedorMap[vendorId].total += valorPerSeller;
                salesByVendedorMap[vendorId].count += (1 / numSellers);
            }
            // Shared sellers
            if (venta.vendedores_compartidos) {
                venta.vendedores_compartidos.forEach(vId => {
                    if (salesByVendedorMap[vId]) {
                        salesByVendedorMap[vId].total += valorPerSeller;
                        salesByVendedorMap[vId].count += (1 / numSellers);
                    }
                });
            }
        });

        // Level 1 Stats Calculation
        const ticketPromedio = salesCount > 0 ? totalSales / salesCount : 0;
        const tasaRecaudo = totalSales > 0 ? (totalRecaudo / totalSales) * 100 : 0;
        
        const daysNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        let bestDayIndex = 0;
        let maxDaySales = 0;
        let minDayIndex = -1;
        let minDaySales = Infinity;
        Object.keys(salesByDayOfWeek).forEach(dayIdx => {
            if (salesByDayOfWeek[dayIdx] > maxDaySales) {
                maxDaySales = salesByDayOfWeek[dayIdx];
                bestDayIndex = dayIdx;
            }
            if (salesByDayOfWeek[dayIdx] < minDaySales) {
                minDaySales = salesByDayOfWeek[dayIdx];
                minDayIndex = dayIdx;
            }
        });
        const diaMasFuerte = maxDaySales > 0 ? daysNames[bestDayIndex] : 'N/A';
        const diaMenosFuerte = minDayIndex !== -1 ? daysNames[minDayIndex] : 'N/A';
        
        let ventasSede1 = salesBySede['Lottus 1'] || 0;
        let ventasSede2 = salesBySede['Lottus 2'] || 0;

        // Calculate Projection
        let projection = 0;
        let showProjection = false;
        
        if (selectedMonthYear && selectedMonthYear !== 'all') {
            const [monthStr, yearStr] = selectedMonthYear.split('-');
            const month = parseInt(monthStr, 10);
            const year = parseInt(yearStr, 10);
            
            // Sales month: from 6th of this month to 5th of next month
            const startDate = new Date(year, month - 1, 6);
            let endYear = year;
            let endMonth = month; // Next month is month (0-indexed)
            if (month === 12) {
                endYear = year + 1;
                endMonth = 1; // Actually 0-indexed is 0, but month is 1-based, so month is 1. Wait, if month == 12, next month is Jan (0). So we pass 0.
            }
            // new Date(year, monthIndex, day)
            // if month === 12, next month index is 0. 
            // if month === 11 (Nov), next month index is 11 (Dec).
            const nextMonthIndex = month === 12 ? 0 : month;
            const endDate = new Date(endYear, nextMonthIndex, 5);
            
            const msPerDay = 1000 * 60 * 60 * 24;
            const totalDays = Math.round((endDate - startDate) / msPerDay) + 1;
            
            const todayDate = new Date();
            const todayMidnight = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
            
            let daysPassed = 0;
            if (todayMidnight > endDate) {
                daysPassed = totalDays;
            } else if (todayMidnight < startDate) {
                daysPassed = 0;
            } else {
                daysPassed = Math.round((todayMidnight - startDate) / msPerDay) + 1;
            }
            
            if (daysPassed > 0) {
                projection = Math.round((totalSales / daysPassed) * totalDays);
                showProjection = true;
            }
        }

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

        // 4. Bar Chart (Sedes)
        const sortedSedes = Object.keys(salesBySede).map(s => ({ name: s, total: salesBySede[s] })).sort((a, b) => b.total - a.total);
        const barChartSedesData = {
            labels: sortedSedes.map(s => s.name),
            datasets: [
                {
                    label: 'Ventas por Sede',
                    data: sortedSedes.map(s => s.total),
                    backgroundColor: '#14b8a6', // Teal
                    borderRadius: 4,
                }
            ]
        };

        return {
            kpis: {
                totalSales,
                salesToday,
                totalRecaudo,
                totalSaldo,
                salesCount,
                projection,
                showProjection,
                ticketPromedio,
                tasaRecaudo,
                diaMasFuerte,
                diaMenosFuerte,
                ventasSede1,
                ventasSede2,
                perdidasAnulacion
            },
            chartData: {
                line: lineChartData,
                doughnut: doughnutChartData,
                bar: barChartData,
                barSedes: barChartSedesData
            },
            salesByVendedor: sortedVendors
        };

    }, [ventas, vendedores, selectedMonthYear]);

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
                {/* 1. Ventas Hoy */}
                <div className="kpi-card highlight">
                    <div className="kpi-icon"><FaCalendarDay /></div>
                    <div className="kpi-content">
                        <h3>Ventas Hoy</h3>
                        <p className="kpi-value">{formatCurrency(kpis.salesToday)}</p>
                    </div>
                </div>

                {/* 2. Ventas Mes */}
                <div className="kpi-card">
                    <div className="kpi-icon blue"><FaChartLine /></div>
                    <div className="kpi-content">
                        <h3>Ventas Mes</h3>
                        <p className="kpi-value">{formatCurrency(kpis.totalSales)}</p>
                    </div>
                </div>

                {/* 3. Proyección */}
                {kpis.showProjection && (
                    <div className="kpi-card">
                        <div className="kpi-icon orange"><FaRocket /></div>
                        <div className="kpi-content">
                            <h3>Proyección</h3>
                            <p className="kpi-value">{formatCurrency(kpis.projection)}</p>
                        </div>
                    </div>
                )}

                {/* 4. Ventas Sede 1 */}
                <div className="kpi-card">
                    <div className="kpi-icon teal"><FaStore /></div>
                    <div className="kpi-content">
                        <h3>Ventas Lottus 1</h3>
                        <p className="kpi-value">{formatCurrency(kpis.ventasSede1)}</p>
                    </div>
                </div>

                {/* 5. Ventas Sede 2 */}
                <div className="kpi-card">
                    <div className="kpi-icon indigo"><FaStore /></div>
                    <div className="kpi-content">
                        <h3>Ventas Lottus 2</h3>
                        <p className="kpi-value">{formatCurrency(kpis.ventasSede2)}</p>
                    </div>
                </div>

                {/* 6. Ticket Promedio */}
                <div className="kpi-card">
                    <div className="kpi-icon cyan"><FaTicketAlt /></div>
                    <div className="kpi-content">
                        <h3>Ticket Promedio</h3>
                        <p className="kpi-value">{formatCurrency(kpis.ticketPromedio)}</p>
                    </div>
                </div>

                {/* 7. Tasa Recaudo */}
                <div className="kpi-card">
                    <div className="kpi-icon purple"><FaPercentage /></div>
                    <div className="kpi-content">
                        <h3>Tasa Recaudo</h3>
                        <p className="kpi-value">{kpis.tasaRecaudo.toFixed(1)}%</p>
                    </div>
                </div>

                {/* 8. Abonos */}
                <div className="kpi-card">
                    <div className="kpi-icon green"><FaMoneyBillWave /></div>
                    <div className="kpi-content">
                        <h3>Abonos</h3>
                        <p className="kpi-value">{formatCurrency(kpis.totalRecaudo)}</p>
                    </div>
                </div>

                {/* 9. Saldos */}
                <div className="kpi-card">
                    <div className="kpi-icon red"><FaWallet /></div>
                    <div className="kpi-content">
                        <h3>Saldos</h3>
                        <p className="kpi-value">{formatCurrency(kpis.totalSaldo)}</p>
                    </div>
                </div>

                {/* 10. Día Más Fuerte */}
                <div className="kpi-card">
                    <div className="kpi-icon blue"><FaCalendarDay /></div>
                    <div className="kpi-content">
                        <h3>Día Más Fuerte</h3>
                        <p className="kpi-value" style={{ textTransform: 'capitalize', fontSize: '0.9rem' }}>{kpis.diaMasFuerte}</p>
                    </div>
                </div>

                {/* 11. Día Menos Fuerte */}
                <div className="kpi-card">
                    <div className="kpi-icon crimson"><FaCalendarDay /></div>
                    <div className="kpi-content">
                        <h3>Día Menos Fuerte</h3>
                        <p className="kpi-value" style={{ textTransform: 'capitalize', fontSize: '0.9rem' }}>{kpis.diaMenosFuerte}</p>
                    </div>
                </div>

                {/* Extras */}
                <div className="kpi-card">
                    <div className="kpi-icon purple"><FaShoppingCart /></div>
                    <div className="kpi-content">
                        <h3>Cant. ventas</h3>
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
                    <>
                        <div className="chart-card">
                            <div className="chart-header">
                                <h4>Top Vendedores</h4>
                            </div>
                            <div className="chart-wrapper">
                                <Bar data={chartData.bar} options={commonOptions} />
                            </div>
                        </div>
                        <div className="chart-card">
                            <div className="chart-header">
                                <h4>Ventas por Sede</h4>
                            </div>
                            <div className="chart-wrapper">
                                <Bar data={chartData.barSedes} options={commonOptions} />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SalesSummaryReport;