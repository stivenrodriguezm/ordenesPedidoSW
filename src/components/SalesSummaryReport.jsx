import React, { useMemo, useContext } from 'react';
import { AppContext } from '../AppContext';
import './SalesSummaryReport.css';

const SalesSummaryReport = ({ ventas, vendedores, selectedMonthYear, formatCurrency, capitalizeEstado }) => {
    const { usuario } = useContext(AppContext);
    const { totalSales, salesCount, deliveredPercentage, salesByVendedor, monthlyProjection } = useMemo(() => {
        let totalSales = 0;
        const salesByVendedor = {};
        let deliveredSalesCount = 0;

        // Create a map from vendor name to vendor ID for easier lookup
        const vendorNameToIdMap = {};
        vendedores.forEach(vendedor => {
            vendorNameToIdMap[vendedor.first_name] = vendedor.id;
            salesByVendedor[vendedor.id] = { // Initialize with ID as key
                name: vendedor.first_name,
                total: 0,
                delivered: 0,
                count: 0
            };
        });

        ventas.forEach(venta => {
            totalSales += parseFloat(venta.valor_total) || 0;

            const vendorId = vendorNameToIdMap[venta.vendedor_nombre];

            if (vendorId && salesByVendedor[vendorId]) {
                salesByVendedor[vendorId].total += parseFloat(venta.valor_total) || 0;
                salesByVendedor[vendorId].count++;
                if (venta.estado === 'entregado') {
                    salesByVendedor[vendorId].delivered++;
                }
            }

            if (venta.estado === 'entregado') {
                deliveredSalesCount++;
            }
        });

        const salesCount = ventas.length;
        const deliveredPercentage = salesCount > 0 ? (deliveredSalesCount / salesCount) * 100 : 0;

        // Calculate Monthly Projection
        const [monthStr, yearStr] = selectedMonthYear.split('-');
        const currentMonth = parseInt(monthStr, 10); // 1-indexed month
        const currentYear = parseInt(yearStr, 10);

        // Period Start Date (6th of current month)
        const startDate = new Date(currentYear, currentMonth - 1, 6);
        startDate.setHours(0, 0, 0, 0);

        // Period End Date (5th of next month)
        const endDate = new Date(currentYear, currentMonth, 5);
        endDate.setHours(0, 0, 0, 0); // Set to start of day for consistent day counting

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to start of day

        // Calculate total days in the period (inclusive)
        const totalDaysInPeriod = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // Calculate days passed in the period up to today (inclusive)
        let daysPassedInPeriod = 0;
        if (today.getTime() >= startDate.getTime()) {
            if (today.getTime() <= endDate.getTime()) {
                // Today is within the period
                daysPassedInPeriod = Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            } else {
                // If today is past the period, consider all days passed for projection calculation
                daysPassedInPeriod = totalDaysInPeriod;
            }
        }

        let monthlyProjection = 0;
        if (daysPassedInPeriod > 0) {
            monthlyProjection = Math.round((totalSales / daysPassedInPeriod) * totalDaysInPeriod);
        }

        return { totalSales, salesCount, deliveredPercentage, salesByVendedor, monthlyProjection };
    }, [ventas, vendedores, selectedMonthYear]); // Keep selectedMonthYear as dependency for projection calculation

    const [month, year] = selectedMonthYear.split('-');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const currentMonthName = monthNames[parseInt(month, 10) - 1];

    return (
        <div className="sales-summary-report-container">
            <div className="summary-cards-grid">
                <div className="details-card summary-card">
                    <h4>Ventas Totales</h4>
                    <p className="summary-value">{formatCurrency(totalSales)}</p>
                </div>
                <div className="details-card summary-card">
                    <h4>% Ventas Entregadas</h4>
                    <p className="summary-value">{deliveredPercentage.toFixed(2)}%</p>
                </div>
                <div className="details-card summary-card">
                    <h4>Cantidad de Ventas</h4>
                    <p className="summary-value">{salesCount}</p>
                </div>
                <div className="details-card summary-card">
                    <h4>Proyección Mes</h4>
                    <p className="summary-value">{formatCurrency(monthlyProjection)}</p>
                </div>
            </div>



            {(usuario.role === 'administrador' || usuario.role === 'auxiliar') && (
                <div className="details-card top-sellers-card">
                    <h4>Vendedores del Mes</h4>
                    <div className="top-sellers-list">
                        {Object.values(salesByVendedor).sort((a, b) => b.total - a.total).map(vendedor => (
                            <div key={vendedor.name} className="seller-item">
                                <span className="seller-name">{vendedor.name}</span>
                                <span className="seller-sales">{formatCurrency(vendedor.total)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesSummaryReport;