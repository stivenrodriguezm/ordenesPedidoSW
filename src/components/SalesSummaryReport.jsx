import React, { useMemo, useContext, lazy, Suspense } from 'react';
import { AppContext } from '../AppContext';
import {
    FaMoneyBillWave,
    FaShoppingCart,
    FaWallet,
    FaCalendarDay,
    FaRocket,
    FaTicketAlt,
    FaPercentage,
    FaStore,
    FaTrophy,
    FaCrown,
    FaFireAlt,
    FaHome
} from 'react-icons/fa';
import './SalesSummaryReport.css';

// chart.js + react-chartjs-2 se cargan bajo demanda (ver components/charts.js)
const Line = lazy(() => import('./charts').then(m => ({ default: m.Line })));
const Doughnut = lazy(() => import('./charts').then(m => ({ default: m.Doughnut })));
const Bar = lazy(() => import('./charts').then(m => ({ default: m.Bar })));

const SalesSummaryReport = ({ ventas, vendedores, selectedMonthYear, formatCurrency }) => {
    const { usuario } = useContext(AppContext);

    const {
        kpis,
        chartData,
        allVendorsList
    } = useMemo(() => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

        let totalSales = 0;
        let salesToday = 0;
        let totalRecaudo = 0;
        let totalSaldo = 0;
        let salesCount = 0; // Only count non-anuladas

        const salesByDate = {};
        const salesByStatus = { pendiente: 0, entregado: 0, anulado: 0 };
        const salesByVendedorMap = {};
        const salesBySede = {};
        const salesCountBySede = {};
        const salesByDayOfWeek = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        let salesFeria = 0;
        let salesCountFeria = 0;

        // Initialize vendor map
        if (Array.isArray(vendedores)) {
            vendedores.forEach(v => {
                salesByVendedorMap[v.id] = { id: v.id, name: v.first_name, total: 0, count: 0 };
            });
        }

        const isVendorRole = usuario?.role === 'vendedor';

        ventas.forEach(venta => {
            const statusRaw = venta.estado ? venta.estado.toLowerCase() : 'pendiente';
            const isAnulado = statusRaw.includes('anulad');
            
            // 1. Siempre sumar al estado de pedidos
            if (isAnulado) {
                salesByStatus['anulado']++;
            } else if (salesByStatus[statusRaw] !== undefined) {
                salesByStatus[statusRaw]++;
            } else {
                salesByStatus['pendiente']++;
            }

            // 2. Si es anulado, ignorar para el resto de métricas
            if (isAnulado) return;

            salesCount++; // Contar solo no anuladas

            const numSellers = 1 + (venta.vendedores_compartidos ? venta.vendedores_compartidos.length : 0);
            const valorFull = parseFloat(venta.valor_total) || 0;
            const valorPerSeller = valorFull / numSellers;
            const abonoFull = parseFloat(venta.abono) || 0;
            const abonoPerSeller = abonoFull / numSellers;
            const saldoFull = parseFloat(venta.saldo) || 0;
            const saldoPerSeller = saldoFull / numSellers;

            const valToAdd = isVendorRole ? valorPerSeller : valorFull;
            const abonoToAdd = isVendorRole ? abonoPerSeller : abonoFull;
            const saldoToAdd = isVendorRole ? saldoPerSeller : saldoFull;

            totalSales += valToAdd;
            totalRecaudo += abonoToAdd;
            totalSaldo += saldoToAdd;

            if (venta.fecha_venta === todayStr) {
                salesToday += valToAdd;
            }

            const date = venta.fecha_venta;
            if (date) {
                salesByDate[date] = (salesByDate[date] || 0) + valToAdd;
                
                const dayIndex = new Date(`${date}T12:00:00`).getDay();
                salesByDayOfWeek[dayIndex] += valToAdd;
            }

            if (venta.es_feria_hogar) {
                // Las ventas de Feria del Hogar no pertenecen a ninguna sede — se excluyen
                // por completo del desglose por sede (ni siquiera cuentan como "Sin Sede")
                // y se contabilizan únicamente en su propia tarjeta.
                salesFeria += valToAdd;
                salesCountFeria += (isVendorRole ? (1 / numSellers) : 1);
            } else {
                const sedeName = venta.sede || 'Sin Sede';
                salesBySede[sedeName] = (salesBySede[sedeName] || 0) + valToAdd;
                salesCountBySede[sedeName] = (salesCountBySede[sedeName] || 0) + (isVendorRole ? (1 / numSellers) : 1);
            }

            let primaryVendorId = null;
            if (venta.vendedor_nombre && Array.isArray(vendedores)) {
                const match = vendedores.find(v => v.first_name && v.first_name.toLowerCase() === venta.vendedor_nombre.toLowerCase());
                if (match) primaryVendorId = match.id;
            }

            if (primaryVendorId && salesByVendedorMap[primaryVendorId]) {
                salesByVendedorMap[primaryVendorId].total += valorPerSeller;
                salesByVendedorMap[primaryVendorId].count += (1 / numSellers);
            } else if (venta.vendedor_nombre) {
                const key = venta.vendedor_nombre;
                if (!salesByVendedorMap[key]) {
                    salesByVendedorMap[key] = { id: key, name: venta.vendedor_nombre, total: 0, count: 0 };
                }
                salesByVendedorMap[key].total += valorPerSeller;
                salesByVendedorMap[key].count += (1 / numSellers);
            }

            if (venta.vendedores_compartidos) {
                venta.vendedores_compartidos.forEach(vId => {
                    if (salesByVendedorMap[vId]) {
                        salesByVendedorMap[vId].total += valorPerSeller;
                        salesByVendedorMap[vId].count += (1 / numSellers);
                    }
                });
            }
        });

        const ticketPromedio = salesCount > 0 ? totalSales / salesCount : 0;
        const tasaRecaudo = totalSales > 0 ? (totalRecaudo / totalSales) * 100 : 0;

        const daysNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        let bestDayIndex = 0;
        let maxDaySales = 0;
        Object.keys(salesByDayOfWeek).forEach(dayIdx => {
            if (salesByDayOfWeek[dayIdx] > maxDaySales) {
                maxDaySales = salesByDayOfWeek[dayIdx];
                bestDayIndex = dayIdx;
            }
        });
        const diaMasFuerte = maxDaySales > 0 ? daysNames[bestDayIndex] : 'N/A';

        // Cycle calculation: 6th of month to 5th of next month
        const now = new Date();
        let daysPassed = 1;
        let totalDays = 30;
        let cycleInfo = { startDateStr: '', endDateStr: '', daysPassed: 1, totalDays: 30, pctCycle: 0 };

        const monthNamesShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        if (selectedMonthYear && selectedMonthYear !== 'all') {
            const [monthStr, yearStr] = selectedMonthYear.split('-');
            const month = parseInt(monthStr, 10);
            const year = parseInt(yearStr, 10);

            const startDate = new Date(year, month - 1, 6);
            const endYear = month === 12 ? year + 1 : year;
            const endMonth = month === 12 ? 0 : month;
            const endDate = new Date(endYear, endMonth, 5);

            const msPerDay = 1000 * 60 * 60 * 24;
            totalDays = Math.round((endDate - startDate) / msPerDay) + 1;

            const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (todayMidnight > endDate) {
                daysPassed = totalDays;
            } else if (todayMidnight < startDate) {
                daysPassed = 1;
            } else {
                daysPassed = Math.round((todayMidnight - startDate) / msPerDay) + 1;
            }

            cycleInfo = {
                startDateStr: `6 ${monthNamesShort[startDate.getMonth()]}`,
                endDateStr: `5 ${monthNamesShort[endDate.getMonth()]}`,
                daysPassed,
                totalDays,
                pctCycle: Math.round((daysPassed / totalDays) * 100)
            };
        } else {
            let startMonth = now.getMonth();
            let startYear = now.getFullYear();
            if (now.getDate() < 6) {
                startMonth = now.getMonth() - 1;
                if (startMonth < 0) {
                    startMonth = 11;
                    startYear--;
                }
            }
            const startDate = new Date(startYear, startMonth, 6);
            const endMonth = startMonth === 11 ? 0 : startMonth + 1;
            const endYear = startMonth === 11 ? startYear + 1 : startYear;
            const endDate = new Date(endYear, endMonth, 5);

            const msPerDay = 1000 * 60 * 60 * 24;
            totalDays = Math.round((endDate - startDate) / msPerDay) + 1;
            const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            daysPassed = Math.max(1, Math.min(totalDays, Math.round((todayMidnight - startDate) / msPerDay) + 1));

            cycleInfo = {
                startDateStr: `6 ${monthNamesShort[startDate.getMonth()]}`,
                endDateStr: `5 ${monthNamesShort[endDate.getMonth()]}`,
                daysPassed,
                totalDays,
                pctCycle: Math.round((daysPassed / totalDays) * 100)
            };
        }

        // Projections
        const projectionGlobal = Math.round((totalSales / daysPassed) * totalDays);

        const ventasSede1 = salesBySede['Lottus 1'] || 0;
        const countSede1 = salesCountBySede['Lottus 1'] || 0;
        const projectionSede1 = Math.round((ventasSede1 / daysPassed) * totalDays);

        const ventasSede2 = salesBySede['Lottus 2'] || 0;
        const countSede2 = salesCountBySede['Lottus 2'] || 0;
        const projectionSede2 = Math.round((ventasSede2 / daysPassed) * totalDays);

        const totalSedesVal = ventasSede1 + ventasSede2;
        const pctSede1 = totalSedesVal > 0 ? ((ventasSede1 / totalSedesVal) * 100).toFixed(1) : 0;
        const pctSede2 = totalSedesVal > 0 ? ((ventasSede2 / totalSedesVal) * 100).toFixed(1) : 0;

        const pctFeria = totalSales > 0 ? ((salesFeria / totalSales) * 100).toFixed(1) : 0;

        const vendorsList = Object.values(salesByVendedorMap)
            .filter(v => v.total > 0 || v.count > 0)
            .sort((a, b) => b.total - a.total)
            .map((v, idx) => {
                const proj = Math.round((v.total / daysPassed) * totalDays);
                const pctOfTotal = totalSales > 0 ? ((v.total / totalSales) * 100).toFixed(1) : 0;
                return {
                    ...v,
                    rank: idx + 1,
                    projection: proj,
                    pctOfTotal,
                    countFormatted: Math.round(v.count)
                };
            });

        // Charts
        const sortedDates = Object.keys(salesByDate).sort();
        const lineChartData = {
            labels: sortedDates.map(d => {
                const [, m, day] = d.split('-');
                return `${day}/${m}`;
            }),
            datasets: [
                {
                    label: 'Ventas Diarias',
                    data: sortedDates.map(d => salesByDate[d]),
                    borderColor: '#0e9f6e',
                    backgroundColor: 'rgba(39, 67, 133, 0.08)',
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#0e9f6e',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#0e9f6e',
                }
            ]
        };

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

        const top5Vendors = vendorsList.slice(0, 5);
        const barChartVendorsData = {
            labels: top5Vendors.map(v => v.name),
            datasets: [
                {
                    label: 'Total Vendido',
                    data: top5Vendors.map(v => v.total),
                    backgroundColor: '#3b82f6',
                    borderRadius: 4,
                }
            ]
        };

        const sortedSedesList = Object.keys(salesBySede).map(s => ({ name: s, total: salesBySede[s] })).sort((a, b) => b.total - a.total);
        const barChartSedesData = {
            labels: sortedSedesList.map(s => s.name),
            datasets: [
                {
                    label: 'Ventas por Sede',
                    data: sortedSedesList.map(s => s.total),
                    backgroundColor: '#0d9488',
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
                projectionGlobal,
                ticketPromedio,
                tasaRecaudo,
                diaMasFuerte,
                ventasSede1,
                countSede1,
                projectionSede1,
                pctSede1,
                ventasSede2,
                countSede2,
                projectionSede2,
                pctSede2,
                ventasFeria: salesFeria,
                countFeria: salesCountFeria,
                pctFeria,
                cycleInfo
            },
            chartData: {
                line: lineChartData,
                doughnut: doughnutChartData,
                barVendors: barChartVendorsData,
                barSedes: barChartSedesData
            },
            allVendorsList: vendorsList
        };

    }, [ventas, vendedores, selectedMonthYear]);

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 8,
                cornerRadius: 6,
                displayColors: false,
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
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
                grid: { borderDash: [3, 3], color: '#f1f5f9' },
                ticks: { display: false }
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 6, font: { size: 11 } } }
        },
        cutout: '70%',
    };

    return (
        <div className="dashboard-container">
            {/* === COMPACT EXECUTIVE TOP GRID (Hero + Sedes) === */}
            <div className="compact-top-grid">
                {/* Ventas Mes Hero Pill */}
                <div className="compact-hero-card">
                    <div className="c-hero-header">
                        <div className="c-badge"><FaFireAlt style={{ color: '#f59e0b', fontSize: '0.75rem' }} /> VENTAS DEL MES</div>
                        <span className="c-cycle-tag">Ciclo: {kpis.cycleInfo.startDateStr} - {kpis.cycleInfo.endDateStr} ({kpis.cycleInfo.pctCycle}%)</span>
                    </div>
                    <div className="c-hero-body">
                        <div className="c-hero-val">{formatCurrency(kpis.totalSales)}</div>
                        <div className="c-hero-pills">
                            <span className="c-pill orange"><FaRocket style={{ fontSize: '0.7rem' }} /> Proj: {formatCurrency(kpis.projectionGlobal)}</span>
                            <span className="c-pill purple"><FaShoppingCart style={{ fontSize: '0.7rem' }} /> {kpis.salesCount} ped.</span>
                        </div>
                    </div>
                    <div className="c-progress-bar">
                        <div className="c-progress-fill" style={{ width: `${kpis.cycleInfo.pctCycle}%` }}></div>
                    </div>
                </div>

                {/* Sede Lottus 1 */}
                <div className="compact-sede-card teal">
                    <div className="c-sede-header">
                        <div className="c-sede-title">
                            <FaStore style={{ color: '#0d9488' }} />
                            <span>Lottus 1</span>
                        </div>
                        <span className="c-pct-pill teal">{kpis.pctSede1}%</span>
                    </div>
                    <div className="c-sede-val">{formatCurrency(kpis.ventasSede1)}</div>
                    <div className="c-sede-footer">
                        <span>Proj: {formatCurrency(kpis.projectionSede1)}</span>
                        <span>{kpis.countSede1} ped.</span>
                    </div>
                </div>

                {/* Sede Lottus 2 */}
                <div className="compact-sede-card indigo">
                    <div className="c-sede-header">
                        <div className="c-sede-title">
                            <FaStore style={{ color: '#4338ca' }} />
                            <span>Lottus 2</span>
                        </div>
                        <span className="c-pct-pill indigo">{kpis.pctSede2}%</span>
                    </div>
                    <div className="c-sede-val">{formatCurrency(kpis.ventasSede2)}</div>
                    <div className="c-sede-footer">
                        <span>Proj: {formatCurrency(kpis.projectionSede2)}</span>
                        <span>{kpis.countSede2} ped.</span>
                    </div>
                </div>

                {/* Feria del Hogar — solo aparece si hay ventas marcadas como feria en el periodo */}
                {(kpis.ventasFeria > 0 || kpis.countFeria > 0) && (
                    <div className="compact-sede-card amber">
                        <div className="c-sede-header">
                            <div className="c-sede-title">
                                <FaHome style={{ color: '#b45309' }} />
                                <span>Feria del Hogar</span>
                            </div>
                            <span className="c-pct-pill amber">{kpis.pctFeria}%</span>
                        </div>
                        <div className="c-sede-val">{formatCurrency(kpis.ventasFeria)}</div>
                        <div className="c-sede-footer">
                            <span>{Math.round(kpis.countFeria)} ped.</span>
                        </div>
                    </div>
                )}
            </div>

            {/* === SECONDARY KPIS GRID === */}
            <div className="compact-kpi-grid">
                <div className="c-kpi-item">
                    <div className="c-kpi-icon blue"><FaCalendarDay /></div>
                    <div>
                        <span className="c-kpi-lbl">Ventas Hoy</span>
                        <span className="c-kpi-val">{formatCurrency(kpis.salesToday)}</span>
                    </div>
                </div>

                <div className="c-kpi-item">
                    <div className="c-kpi-icon green"><FaMoneyBillWave /></div>
                    <div>
                        <span className="c-kpi-lbl">Abonos</span>
                        <span className="c-kpi-val">{formatCurrency(kpis.totalRecaudo)}</span>
                    </div>
                </div>

                <div className="c-kpi-item">
                    <div className="c-kpi-icon red"><FaWallet /></div>
                    <div>
                        <span className="c-kpi-lbl">Saldos</span>
                        <span className="c-kpi-val">{formatCurrency(kpis.totalSaldo)}</span>
                    </div>
                </div>

                <div className="c-kpi-item">
                    <div className="c-kpi-icon cyan"><FaTicketAlt /></div>
                    <div>
                        <span className="c-kpi-lbl">Ticket Prom.</span>
                        <span className="c-kpi-val">{formatCurrency(kpis.ticketPromedio)}</span>
                    </div>
                </div>

                <div className="c-kpi-item">
                    <div className="c-kpi-icon purple"><FaPercentage /></div>
                    <div>
                        <span className="c-kpi-lbl">Tasa Recaudo</span>
                        <span className="c-kpi-val">{kpis.tasaRecaudo.toFixed(1)}%</span>
                    </div>
                </div>

                <div className="c-kpi-item">
                    <div className="c-kpi-icon blue"><FaCalendarDay /></div>
                    <div>
                        <span className="c-kpi-lbl">Día Más Fuerte</span>
                        <span className="c-kpi-val" style={{ textTransform: 'capitalize' }}>{kpis.diaMasFuerte}</span>
                    </div>
                </div>
            </div>

            {/* === CHARTS GRID (Restored Bar Charts) === */}
            <Suspense fallback={null}>
            <div className="charts-grid">
                <div className="chart-card large">
                    <div className="chart-header">
                        <h4>Tendencia Diaria de Ventas</h4>
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

                {(usuario?.role === 'administrador' || usuario?.role === 'auxiliar') && (
                    <>
                        <div className="chart-card">
                            <div className="chart-header">
                                <h4>Top Vendedores</h4>
                            </div>
                            <div className="chart-wrapper">
                                <Bar data={chartData.barVendors} options={commonOptions} />
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
            </Suspense>

            {/* === COMPACT MINIMALIST VENDOR LEADERBOARD === */}
            {(usuario?.role === 'administrador' || usuario?.role === 'auxiliar') && allVendorsList.length > 0 && (
                <div className="compact-vendor-section">
                    <div className="c-vendor-header">
                        <div className="c-vtitle">
                            <FaTrophy style={{ color: '#f59e0b' }} />
                            <span>Desempeño de Vendedores</span>
                        </div>
                        <span className="c-vsub">Venta real ($ COP), pedidos y proyección</span>
                    </div>

                    <div className="compact-vendor-list">
                        {allVendorsList.map(vendor => (
                            <div key={vendor.id} className="c-vendor-row">
                                <div className="c-v-left">
                                    <span className={`c-v-rank ${vendor.rank === 1 ? 'r1' : vendor.rank === 2 ? 'r2' : vendor.rank === 3 ? 'r3' : ''}`}>
                                        {vendor.rank === 1 ? <FaCrown style={{ color: '#eab308' }} /> : `#${vendor.rank}`}
                                    </span>
                                    <div className="c-v-name-box">
                                        <span className="c-v-name">{vendor.name}</span>
                                        <span className="c-v-orders">{vendor.countFormatted} ped.</span>
                                    </div>
                                </div>

                                <div className="c-v-mid">
                                    <span className="c-v-amount">{formatCurrency(vendor.total)}</span>
                                    <span className="c-v-proj">Proj: <strong>{formatCurrency(vendor.projection)}</strong></span>
                                </div>

                                <div className="c-v-bar">
                                    <div className="c-v-fill" style={{ width: `${Math.min(100, Math.max(6, vendor.pctOfTotal))}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesSummaryReport;