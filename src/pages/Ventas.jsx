import React, { useState, useEffect, useCallback, useContext } from 'react';
import API from '../services/api';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { FaChevronDown, FaFileExport, FaPlus, FaSearch, FaEdit, FaLock, FaLockOpen } from "react-icons/fa";
import Modal from '../components/Modal';
import AppNotification from '../components/AppNotification';
import EditSaleModal from '../components/EditSaleModal';
import RemisionModal from '../components/RemisionModal';
import SalesSummaryReport from '../components/SalesSummaryReport';
import { AppContext } from '../AppContext';
import './Ventas.css';
import './VentasImprovements.css';
import './VentasModalForms.css';
import '../components/Modal.css';
import '../components/AppNotification.css';

import useDebounce from '../hooks/useDebounce';

const Ventas = () => {
    const { fetchClientes, usuario } = useContext(AppContext);
    const navigate = useNavigate();
    const [ventas, setVentas] = useState([]);
    const [reportSales, setReportSales] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [estados, setEstados] = useState([]);
    const [isReportVisible, setIsReportVisible] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce for 500ms

    const getDefaultMonthYear = () => {
        const today = new Date();
        let defaultMonth = today.getMonth(); // 0-indexed
        let defaultYear = today.getFullYear();
        const currentDay = today.getDate();

        // If current day is before the 6th, the current period belongs to the previous month
        if (currentDay < 6) {
            defaultMonth -= 1;
            if (defaultMonth < 0) {
                defaultMonth = 11; // December
                defaultYear -= 1;
            }
        }
        return `${defaultMonth + 1}-${defaultYear}`;
    };

    const [selectedMonthYear, setSelectedMonthYear] = useState(getDefaultMonthYear());
    const [selectedVendedor, setSelectedVendedor] = useState('');
    const [selectedEstado, setSelectedEstado] = useState('');



    // Estados para la expansión
    const [expandedVentaId, setExpandedVentaId] = useState(null);
    const [ventaDetails, setVentaDetails] = useState(null);
    const [expandedNestedOrderId, setExpandedNestedOrderId] = useState(null);
    const [nestedOrderDetails, setNestedOrderDetails] = useState(null);
    const [detailsError, setDetailsError] = useState(null);
    const [isPartialData, setIsPartialData] = useState(false);

    // Estados de Carga y Errores
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 50;

    // Estados de Carga y Errores
    const [isLoading, setIsLoading] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [loadingNestedDetails, setLoadingNestedDetails] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [showEditSaleModal, setShowEditSaleModal] = useState(false);
    const [editSaleData, setEditSaleData] = useState(null);



    // Modales (sin cambios funcionales)
    const [showObservacionClienteModal, setShowObservacionClienteModal] = useState(false);
    const [showObservacionVentaModal, setShowObservacionVentaModal] = useState(false);
    const [showRemisionModal, setShowRemisionModal] = useState(false);
    const [observacionClienteText, setObservacionClienteText] = useState('');
    const [observacionVentaText, setObservacionVentaText] = useState('');
    const [remisionData, setRemisionData] = useState({ codigo: '', fecha: '' });

    // --- Funciones de Formato ---
    const formatShortDate = (dateStr) => {
        if (!dateStr) return '—';
        const [year, month, day] = dateStr.split('-');
        const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
        const monthName = monthNames[parseInt(month, 10) - 1];
        return `${day}-${monthName}-${year}`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const [year, month, day] = dateStr.split('-');
        const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        const monthName = monthNames[parseInt(month, 10) - 1];
        return `${day}-${monthName}-${year}`;
    };

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '$0';

        const num = parseFloat(value);

        if (isNaN(num)) return '$0';

        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num);
    };

    const capitalizeEstado = (estado) => estado ? estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';

    // --- Datos para Filtros ---
    const generateMonthOptions = () => {
        const options = [];
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        // Start from April 2025
        let currentMonth = 3; // April is 3 (0-indexed)
        let currentYear = 2025;

        const today = new Date();
        let endMonth = today.getMonth(); // 0-indexed
        let endYear = today.getFullYear();
        const currentDay = today.getDate();

        // Adjust endMonth and endYear based on the 6th day rule for the current period
        if (currentDay < 6) {
            endMonth -= 1;
            if (endMonth < 0) {
                endMonth = 11; // December
                endYear -= 1;
            }
        }

        // Loop to generate months until the endMonth/endYear (inclusive)
        while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
            options.push({
                value: `${currentMonth + 1}-${currentYear}`,
                label: `${monthNames[currentMonth]} ${currentYear}`,
            });

            currentMonth += 1;
            if (currentMonth > 11) {
                currentMonth = 0; // January
                currentYear += 1;
            }
        }
        options.reverse(); // Reverse to show most recent first
        options.unshift({ value: 'all', label: 'Todas las fechas' });
        return options;
    };

    const monthOptions = generateMonthOptions();

    const fetchVentas = useCallback(async (page = 1) => {
        setIsLoading(true);
        try {
            const params = {
                page: page,
                page_size: pageSize,
                ordering: '-fecha_venta,-id' // Ensure consistent ordering
            };
            if (debouncedSearchTerm) {
                params.search = debouncedSearchTerm;
            } else {
                if (selectedMonthYear !== 'all') {
                    const [month, year] = selectedMonthYear.split('-');
                    params.month = month;
                    params.year = year;
                }
                if (usuario?.role.toLowerCase() === 'vendedor') {
                    params.vendedor = usuario.id;
                } else {
                    params.vendedor = selectedVendedor;
                }
                params.estado = selectedEstado;
            }
            const response = await API.get(`/ventas/`, { params });

            // Handle paginated response
            if (response.data.results) {
                setVentas(response.data.results);
                setTotalCount(response.data.count);
                setTotalPages(Math.ceil(response.data.count / pageSize) || 1);
            } else {
                // Fallback for non-paginated response (shouldn't happen with standard DRF pagination, but good for safety)
                setVentas(response.data || []);
                setTotalCount(response.data.length || 0);
                setTotalPages(1);
            }
        } catch (error) {
            console.error('Error cargando ventas:', error);
            setNotification({ message: 'Error al cargar las ventas.', type: 'error' });
            setVentas([]);
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearchTerm, selectedMonthYear, selectedVendedor, selectedEstado, setNotification, usuario]);

    const fetchReportSales = useCallback(async () => {
        try {
            const params = {};
            if (selectedMonthYear !== 'all') {
                const [month, year] = selectedMonthYear.split('-');
                params.month = month;
                params.year = year;
            }
            if (usuario?.role.toLowerCase() === 'vendedor') {
                params.vendedor = usuario.id;
            }
            // Note: This might still fail if the dataset is huge, but it won't crash the main list
            const response = await API.get(`/ventas/`, { params });
            // If response is paginated, we might only get the first page. 
            // Ideally, we need a summary endpoint. For now, we assume if it's paginated, we use results.
            const data = response.data.results || response.data;
            setReportSales(data || []);
        } catch (error) {
            console.error('Error cargando ventas para el informe:', error);
            // Fail silently for the report, so the user can still see the list
            setReportSales([]);
        }
    }, [selectedMonthYear, usuario]);

    useEffect(() => {
        setCurrentPage(1); // Reset to page 1 when filters change
        fetchVentas(1);
    }, [fetchVentas]);

    useEffect(() => {
        // Fetch when page changes (but not when filters change, as that's handled above)
        // Actually, fetchVentas depends on filters. 
        // We need to separate the trigger.
        // Let's simplify: 
        // 1. When filters change, we call setCurrentPage(1).
        // 2. When currentPage changes, we call fetchVentas(currentPage).
        // But fetchVentas needs the current filters.
        // The dependency array of fetchVentas includes filters.
        // So if filters change, fetchVentas changes.
        // We want to avoid double fetching.

        // Correct pattern:
        // We can just call fetchVentas(currentPage) here.
        // But if filters change, we want to reset to page 1.
        // So we need a separate effect for filters?

        // Let's rely on the fact that fetchVentas is recreated when filters change.
        // We can just call it. But we need to pass the page.
        // If we just use `useEffect(() => { fetchVentas(currentPage); }, [fetchVentas, currentPage])`,
        // then when filters change, fetchVentas changes, and it runs with OLD currentPage.
        // We want it to run with page 1.

        // So:
        // When filters change (debouncedSearchTerm, selectedMonthYear, etc.), we setPage(1).
        // Then page changes, and we fetch.
    }, []);

    // Effect for Filters
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, selectedMonthYear, selectedVendedor, selectedEstado]);

    // Effect for Page Change & Initial Load
    useEffect(() => {
        fetchVentas(currentPage);
    }, [currentPage, fetchVentas]);

    useEffect(() => {
        fetchReportSales();
    }, [fetchReportSales]);

    useEffect(() => {
        const fetchVendedores = async () => {
            try {
                const response = await API.get(`/vendedores/`);
                setVendedores(response.data || []);
            } catch (error) {
                console.error('Error cargando vendedores:', error);
            }
        };
        fetchVendedores();
    }, []);

    useEffect(() => {
        setEstados(["pendiente", "entregado", "anulado"]);
    }, []);



    // --- Handlers ---
    const handleExpandVenta = async (ventaId) => {
        if (expandedVentaId === ventaId) {
            setExpandedVentaId(null);
            setVentaDetails(null);
            return;
        }

        setExpandedVentaId(ventaId);
        setLoadingDetails(true);
        setDetailsError(null);
        setVentaDetails(null);
        setIsPartialData(false);

        try {
            // Fetch Details and Receipts in PARALLEL
            // We split this to avoid backend timeouts on heavy sales.
            console.log(`Fetching details and receipts for venta ${ventaId}`);
            const [detailsRes, recibosRes] = await Promise.allSettled([
                API.get(`/ventas/${ventaId}/`),
                API.get('/recibos-caja/', { params: { venta_id: ventaId, page_size: 50 } })
            ]);

            let detailsData = {};
            let recibosData = [];
            let isPartial = false;

            // Handle Details Response
            if (detailsRes.status === 'fulfilled') {
                detailsData = detailsRes.value.data;
            } else {
                console.error('Error fetching sale details:', detailsRes.reason);
                // If main details fail, try to use basic info from the list
                const basicVenta = ventas.find(v => v.id === ventaId);
                if (basicVenta) {
                    detailsData = {
                        ...basicVenta,
                        cliente: basicVenta.cliente || {},
                        observaciones_venta: [],
                        productos_vendidos: [],
                        ordenes_pedido: []
                    };
                    isPartial = true;
                } else {
                    throw new Error("No se pudo cargar la información de la venta.");
                }
            }

            // Handle Receipts Response
            if (recibosRes.status === 'fulfilled') {
                recibosData = recibosRes.value.data.results || [];
                console.log(`Fetched ${recibosData.length} receipts for venta ${ventaId}:`, recibosData);
            } else {
                console.error('Error fetching receipts:', recibosRes.reason);
                // If receipts fail, we just show empty list but don't crash the whole view
            }

            setVentaDetails({
                ...detailsData,
                recibos: recibosData
            });
            setIsPartialData(isPartial);

        } catch (error) {
            console.error('Critical error loading sale details:', error);
            setDetailsError('Error al cargar los detalles de la venta.');
        } finally {
            setLoadingDetails(false);
        }
    };


    const refreshVentaDetails = async (ventaId) => {
        setLoadingDetails(true);
        setDetailsError(null);
        try {
            const response = await API.get(`/ventas/${ventaId}/`);
            setVentaDetails(response.data);
        } catch (error) {
            console.error('Error al refrescar detalles de la venta:', error);
            setDetailsError('Error al actualizar los detalles.');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleExpandNestedOrder = async (orderId) => {
        if (expandedNestedOrderId === orderId) {
            setExpandedNestedOrderId(null);
        } else {
            setExpandedNestedOrderId(orderId);
            setLoadingNestedDetails(true);
            try {
                const response = await API.get(`/pedidos/${orderId}/detalles/`);
                setNestedOrderDetails(response.data);
            } catch (error) {
                console.error('Error cargando detalles del pedido anidado:', error);
            } finally {
                setLoadingNestedDetails(false);
            }
        }
    };

    const getStatusClass = (status) => status ? status.toLowerCase().replace(/ /g, '-') : '';

    const handleAddObservacion = async (tipo) => {
        const id = tipo === 'cliente' ? ventaDetails.cliente.id : expandedVentaId;
        const url = `/${tipo === 'cliente' ? 'clientes' : 'ventas'}/${id}/observaciones/${tipo === 'cliente' ? 'anadir/' : ''}`;

        const texto = tipo === 'cliente' ? observacionClienteText : observacionVentaText;

        if (!texto) {
            setNotification({ message: 'La observación no puede estar vacía.', type: 'error' });
            return;
        }

        try {
            await API.post(url, { texto });
            setNotification({ message: 'Observación añadida correctamente.', type: 'success' });
            console.log('Notification set to success:', { message: 'Observación añadida correctamente.', type: 'success' });
            // Re-fetch venta details to show new observacion without closing the expanded view
            const response = await API.get(`/ventas/${expandedVentaId}/`);
            setVentaDetails(response.data);

            if (tipo === 'cliente') {
                setShowObservacionClienteModal(false);
                setObservacionClienteText('');
            } else {
                setShowObservacionVentaModal(false);
                setObservacionVentaText('');
            }
        } catch (error) {
            console.error(`Error al añadir observación de ${tipo}:`, error);
            let friendlyError = 'Error al añadir la observación.';
            if (error.response && error.response.data) {
                if (typeof error.response.data === 'string') {
                    friendlyError = error.response.data;
                } else if (error.response.data.texto && error.response.data.texto.length > 0) {
                    friendlyError = `Error: ${error.response.data.texto[0]}`;
                } else {
                    friendlyError = JSON.stringify(error.response.data);
                }
            }
            setNotification({ message: friendlyError, type: 'error' });
            console.log('Notification set to error:', { message: friendlyError, type: 'error' });
        }
    };

    const handleAddRemision = async (remisionData) => {
        if (!remisionData.codigo || !remisionData.fecha) {
            setNotification({ message: 'El código y la fecha de la remisión son obligatorios.', type: 'error' });
            return;
        }
        setIsLoading(true);
        setNotification({ message: '', type: '' });
        try {
            await API.post(`/ventas/${expandedVentaId}/remisiones/`, remisionData);
            setNotification({ message: 'Remisión añadida correctamente.', type: 'success' });
            setShowRemisionModal(false);
            refreshVentaDetails(expandedVentaId); // Refrescar detalles de la venta
        } catch (error) {
            console.error('Error al añadir remisión:', error);
            let friendlyError = 'Error al añadir la remisión.';
            if (error.response && error.response.data) {
                if (typeof error.response.data === 'string') {
                    friendlyError = error.response.data;
                } else if (error.response.data.codigo && error.response.data.codigo.length > 0) {
                    friendlyError = `Error: ${error.response.data.codigo[0]}`;
                } else {
                    friendlyError = JSON.stringify(error.response.data);
                }
            }
            setNotification({ message: friendlyError, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrencyForExport = (value) => {
        if (value === null || value === undefined) return null;
        const num = parseFloat(String(value).replace(/[^0-9.-]+/g, ''));
        return isNaN(num) ? null : num;
    };

    const exportVentas = () => {
        const dataToExport = ventas.map(venta => ({
            'O.C.': venta.id,
            'F. Venta': formatShortDate(venta.fecha_venta),
            'F. Entrega': formatShortDate(venta.fecha_entrega),
            'Vendedor': venta.vendedor_nombre,
            'Cliente': venta.cliente_nombre,
            'Abono': formatCurrencyForExport(venta.abono),
            'Saldo': formatCurrencyForExport(venta.saldo),
            'Valor': formatCurrencyForExport(venta.valor_total),
            'Estado': capitalizeEstado(venta.estado),
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
        XLSX.writeFile(wb, 'Ventas.xlsx');
    };

    const formatReportTitle = (monthYear) => {
        if (!monthYear || monthYear === 'all') {
            return 'Informe de Ventas - Todas las fechas';
        }
        const [month, year] = monthYear.split('-');
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const monthName = monthNames[parseInt(month, 10) - 1];
        return `Informe de Ventas - ${monthName} ${year}`;
    };

    return (
        <div className="page-container">
            <AppNotification
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ message: '', type: '' })}
            />
            {usuario && (
                <div className="sales-summary-report-wrapper">
                    <div className="report-header">
                        <h3>{formatReportTitle(selectedMonthYear)}</h3>
                        <button className="btn-icon" onClick={() => setIsReportVisible(!isReportVisible)}>
                            {isReportVisible ? <FaLockOpen /> : <FaLock />}
                        </button>
                    </div>
                    {isReportVisible && (
                        <SalesSummaryReport
                            ventas={reportSales}
                            vendedores={vendedores}
                            selectedMonthYear={selectedMonthYear}
                            formatCurrency={formatCurrency}
                            capitalizeEstado={capitalizeEstado}
                        />
                    )}
                </div>
            )}

            <div className="page-header">
                <div className="filters-group">
                    <div className="search-wrapper">
                        <input type="text" className="search-input" placeholder="Buscar por Cliente o OC..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); }} />
                        <FaSearch className="search-icon" />
                    </div>
                    <select value={selectedMonthYear} onChange={(e) => { setSelectedMonthYear(e.target.value); }}>
                        {monthOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <select value={selectedEstado} onChange={(e) => { setSelectedEstado(e.target.value); }}>
                        <option value="">Todos los estados</option>
                        {estados.map(e => <option key={e} value={e}>{capitalizeEstado(e)}</option>)}
                    </select>
                    {(usuario?.role.toLowerCase() === 'administrador' || usuario?.role.toLowerCase() === 'auxiliar') && (
                        <select value={selectedVendedor} onChange={(e) => { setSelectedVendedor(e.target.value); }}>
                            <option value="">Todos los vendedores</option>
                            {vendedores.map(vendedor => (
                                <option key={vendedor.id} value={vendedor.id}>{vendedor.first_name}</option>
                            ))}
                        </select>
                    )}
                </div>
                <div className="actions-group">
                    {usuario?.role.toLowerCase() === 'administrador' && <button className="btn-secondary" onClick={exportVentas}><FaFileExport /> Exportar</button>}
                    {(usuario?.role.toLowerCase() === 'administrador' || usuario?.role.toLowerCase() === 'auxiliar') && <button className="btn-primary" onClick={() => navigate('/nuevaVenta')}><FaPlus /> Nueva Venta</button>}
                </div>
            </div>

            <div className="ventas-container">
                {/* Desktop View */}
                <div className="desktop-view">
                    <table className="ventas-table">
                        <thead>
                            <tr>
                                <th className="th-oc">ID</th>
                                <th className="th-fecha">F. Venta</th>
                                <th className="th-fecha">F. Entrega</th>
                                <th className="th-vendedor">Vendedor</th>
                                <th className="th-cliente">Cliente</th>
                                <th className="th-valor">Abono</th>
                                <th className="th-valor">Saldo</th>
                                <th className="th-valor">Total</th>
                                <th className="th-pedidos">Pedidos</th>
                                <th className="th-estado">Estado</th>
                                <th className="th-accion"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                // Skeleton Loading Rows
                                Array.from({ length: 5 }).map((_, index) => (
                                    <tr key={index} className="skeleton-row">
                                        <td className="td-oc"><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                                        <td className="td-fecha"><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                                        <td className="td-fecha"><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                                        <td className="td-vendedor"><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                                        <td className="td-cliente"><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></td>
                                        <td className="td-valor"><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                                        <td className="td-valor"><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                                        <td className="td-valor"><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                                        <td className="td-pedidos"><div className="skeleton skeleton-badge"></div></td>
                                        <td className="td-estado"><div className="skeleton skeleton-badge"></div></td>
                                        <td className="td-accion"><div className="skeleton skeleton-text" style={{ width: '20px' }}></div></td>
                                    </tr>
                                ))
                            ) : ventas.length === 0 ? (
                                <tr>
                                    <td colSpan="11" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                                        <div className="empty-state-content">
                                            <p style={{ fontSize: '1.1rem', color: 'var(--ventas-text-medium)', marginBottom: '1rem' }}>No se encontraron ventas.</p>
                                            <button className="btn-primary" onClick={() => navigate('/nueva-venta')}>
                                                Crear Nueva Venta
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                ventas.map((venta) => (
                                    <React.Fragment key={venta.id}>
                                        <tr onClick={() => handleExpandVenta(venta.id)} style={{ cursor: 'pointer' }}>
                                            <td className="td-oc">#{venta.id}</td>
                                            <td className="td-fecha">{formatShortDate(venta.fecha_venta)}</td>
                                            <td className="td-fecha">{formatShortDate(venta.fecha_entrega)}</td>
                                            <td className="td-vendedor">
                                                {venta.vendedor_nombre || '—'}
                                            </td>
                                            <td className="td-cliente">
                                                {venta.cliente_nombre || (venta.cliente ? venta.cliente.nombre : 'Cliente Eliminado')}
                                            </td>
                                            <td className="td-valor">{formatCurrency(venta.abono)}</td>
                                            <td className="td-valor">{formatCurrency(venta.saldo)}</td>
                                            <td className="td-valor td-valor-total">
                                                {formatCurrency(venta.valor_total)}
                                            </td>
                                            <td className="td-pedidos">
                                                <span className={`status-badge ${venta.estado_pedidos ? 'pedido-realizado' : 'pedido-pendiente'}`}>
                                                    {venta.estado_pedidos ? 'Pedido' : 'Pendiente'}
                                                </span>
                                            </td>
                                            <td className="td-estado">
                                                <span className={`status-badge ${getStatusClass(venta.estado)}`}>
                                                    {capitalizeEstado(venta.estado)}
                                                </span>
                                            </td>
                                            <td className="td-accion">
                                                <button
                                                    className={`btn-expand ${expandedVentaId === venta.id ? 'active' : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleExpandVenta(venta.id);
                                                    }}
                                                >
                                                    <FaChevronDown />
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedVentaId === venta.id && (
                                            <tr className="expanded-row">
                                                <td colSpan="11" className="expanded-row-content">
                                                    {loadingDetails ? (
                                                        <div className="loader-container">
                                                            <div className="loader-spinner"></div>
                                                            <p className="loader-text">Cargando detalles...</p>
                                                        </div>
                                                    ) : detailsError ? (
                                                        <div className="error-message-container">
                                                            <p className="error-text">{detailsError}</p>
                                                            <button className="btn-secondary" onClick={() => handleExpandVenta(venta.id)}>
                                                                Reintentar Carga
                                                            </button>
                                                        </div>
                                                    ) : ventaDetails ? (
                                                        <div className="venta-details-view">
                                                            {isPartialData && (
                                                                <div className="alert-warning" style={{ gridColumn: '1 / -1', marginBottom: '0', padding: '0.75rem', backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <strong>Atención:</strong> No se pudieron cargar los productos de esta venta debido a un problema de conexión, pero aquí están los pagos y observaciones recuperados.
                                                                </div>
                                                            )}

                                                            {/* Cliente Info */}
                                                            <div className="details-card cliente-info">
                                                                <h4>Información del Cliente</h4>
                                                                <div className="info-row">
                                                                    <span className="label">Nombre:</span>
                                                                    <span className="value">{ventaDetails.cliente?.nombre || '—'}</span>
                                                                </div>
                                                                <div className="info-row">
                                                                    <span className="label">Cédula/NIT:</span>
                                                                    <span className="value">{ventaDetails.cliente?.cedula || '—'}</span>
                                                                </div>
                                                                <div className="info-row">
                                                                    <span className="label">Teléfono 1:</span>
                                                                    <span className="value">{ventaDetails.cliente?.telefono1 || '—'}</span>
                                                                </div>
                                                                {ventaDetails.cliente?.telefono2 && (
                                                                    <div className="info-row">
                                                                        <span className="label">Teléfono 2:</span>
                                                                        <span className="value">{ventaDetails.cliente.telefono2}</span>
                                                                    </div>
                                                                )}
                                                                <div className="info-row">
                                                                    <span className="label">Ciudad:</span>
                                                                    <span className="value">{ventaDetails.cliente?.ciudad || '—'}</span>
                                                                </div>
                                                                <div className="info-row">
                                                                    <span className="label">Dirección:</span>
                                                                    <span className="value">{ventaDetails.cliente?.direccion || '—'}</span>
                                                                </div>
                                                                <div className="info-row">
                                                                    <span className="label">Correo:</span>
                                                                    <span className="value">{ventaDetails.cliente?.correo || 'N/A'}</span>
                                                                </div>
                                                            </div>

                                                            {/* Pagos Realizados (Improved Design) */}
                                                            <div className="details-card pagos-info">
                                                                <h4>Pagos Realizados</h4>
                                                                {ventaDetails.recibos && ventaDetails.recibos.length > 0 ? (
                                                                    <div className="payments-list">
                                                                        {ventaDetails.recibos.map((pago, index) => (
                                                                            <div key={index} className="payment-item">
                                                                                <div className="payment-icon">
                                                                                    <div className={`payment-status-dot ${pago.estado === 'Confirmado' ? 'confirmed' : 'pending'}`}></div>
                                                                                </div>
                                                                                <div className="payment-details">
                                                                                    <span className="payment-main-text">
                                                                                        RC. #{pago.id}, {formatShortDate(pago.fecha)}, {formatCurrency(pago.valor)}
                                                                                    </span>
                                                                                    <span className="payment-sub-text">
                                                                                        <span className={`payment-status ${pago.estado === 'Confirmado' ? 'text-green' : 'text-orange'}`}>
                                                                                            ({pago.estado})
                                                                                        </span>{' '}
                                                                                        <span className="payment-method">{pago.metodo_pago}</span>
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-muted">No hay pagos registrados.</p>
                                                                )}
                                                            </div>

                                                            {/* Remisiones */}
                                                            <div className="details-card remisiones-info">
                                                                <h4>
                                                                    Remisiones
                                                                    <button className="card-header-action" onClick={() => setShowRemisionModal(true)} title="Generar Remisión"><FaPlus /></button>
                                                                </h4>
                                                                {isPartialData ? (
                                                                    <p className="text-muted" style={{ fontStyle: 'italic' }}>Información no disponible en vista parcial.</p>
                                                                ) : ventaDetails.remisiones && ventaDetails.remisiones.length > 0 ? (
                                                                    <div className="remisiones-list">
                                                                        {ventaDetails.remisiones.map((remision, index) => (
                                                                            <div key={index} className="remision-card">
                                                                                <div className="remision-icon">
                                                                                    <span className="icon-document">📄</span>
                                                                                </div>
                                                                                <div className="remision-info">
                                                                                    <p className="remision-code"><strong>Código:</strong> {remision.codigo}</p>
                                                                                    <p className="remision-date"><strong>Fecha:</strong> {formatShortDate(remision.fecha)}</p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-muted">No hay remisiones asociadas. Haz clic en el botón + para generar una.</p>
                                                                )}
                                                            </div>

                                                            {/* Observaciones Cliente */}
                                                            <div className="details-card observaciones-cliente">
                                                                <h4>
                                                                    Obs. Cliente
                                                                    <button className="card-header-action" onClick={() => {
                                                                        setObservacionClienteText('');
                                                                        setShowObservacionClienteModal(true);
                                                                    }} title="Añadir Observación Cliente"><FaPlus /></button>
                                                                </h4>
                                                                {isPartialData ? (
                                                                    <p className="text-muted" style={{ fontStyle: 'italic' }}>Información no disponible en vista parcial.</p>
                                                                ) : ventaDetails.cliente.observaciones && ventaDetails.cliente.observaciones.length > 0 ? (
                                                                    <div className="observaciones-list">
                                                                        {ventaDetails.cliente.observaciones.map((obs, index) => (
                                                                            <div key={index} className="observacion-card">
                                                                                <div className="observacion-icon">💬</div>
                                                                                <div className="observacion-content">
                                                                                    <p className="observacion-text">{obs.texto}</p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : <p className="text-muted">Sin observaciones de cliente.</p>}
                                                            </div>

                                                            {/* Observaciones Venta */}
                                                            <div className="details-card observaciones-venta">
                                                                <h4>
                                                                    Obs. Venta
                                                                    <button className="card-header-action" onClick={() => {
                                                                        setObservacionVentaText('');
                                                                        setShowObservacionVentaModal(true);
                                                                    }} title="Añadir Observación Venta"><FaPlus /></button>
                                                                </h4>
                                                                {isPartialData ? (
                                                                    <p className="text-muted" style={{ fontStyle: 'italic' }}>Información no disponible en vista parcial.</p>
                                                                ) : ventaDetails.observaciones_venta && ventaDetails.observaciones_venta.length > 0 ? (
                                                                    <div className="observaciones-list">
                                                                        {ventaDetails.observaciones_venta.map((obs, index) => (
                                                                            <div key={index} className="observacion-card">
                                                                                <div className="observacion-icon">📝</div>
                                                                                <div className="observacion-content">
                                                                                    <p className="observacion-text">{obs.texto}</p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : <p className="text-muted">Sin observaciones de venta.</p>}
                                                            </div>

                                                            {/* Órdenes de Pedido (Full Width) */}
                                                            <div className="details-card details-full-width orders-section">
                                                                <div className="pedidos-header">
                                                                    <h4>Órdenes de Pedido</h4>
                                                                    {usuario?.role === 'administrador' && (
                                                                        <button className="btn-primary" onClick={() => {
                                                                            setEditSaleData(ventaDetails);
                                                                            setShowEditSaleModal(true);
                                                                        }}>
                                                                            <FaEdit /> Editar Venta
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {ventaDetails.ordenes_pedido && ventaDetails.ordenes_pedido.length > 0 ? (
                                                                    <div className="orders-table-wrapper">
                                                                        <table className="orders-table-enhanced">
                                                                            <thead>
                                                                                <tr>
                                                                                    <th className="th-order-id">ID</th>
                                                                                    <th className="th-order-proveedor">Proveedor</th>
                                                                                    <th className="th-order-date">F. Pedido</th>
                                                                                    <th className="th-order-date">F. Esperada</th>
                                                                                    <th className="th-order-tela">Tela</th>
                                                                                    {(usuario?.role === 'administrador' || usuario?.role === 'auxiliar') && (
                                                                                        <th className="th-order-costo">Costo</th>
                                                                                    )}
                                                                                    <th className="th-order-estado">Estado</th>
                                                                                    <th className="th-order-accion"></th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {ventaDetails.ordenes_pedido.map((pedido) => (
                                                                                    <React.Fragment key={pedido.id}>
                                                                                        <tr className={`order-row-enhanced ${expandedNestedOrderId === pedido.id ? 'expanded' : ''}`}>
                                                                                            <td className="td-order-id">
                                                                                                <span className="order-id-badge">#{pedido.id}</span>
                                                                                            </td>
                                                                                            <td className="td-order-proveedor">
                                                                                                <span className="proveedor-name">{pedido.proveedor_nombre || '—'}</span>
                                                                                            </td>
                                                                                            <td className="td-order-date">
                                                                                                <span className="date-text">{formatShortDate(pedido.fecha_pedido)}</span>
                                                                                            </td>
                                                                                            <td className="td-order-date">
                                                                                                <span className="date-text">{formatShortDate(pedido.fecha_esperada)}</span>
                                                                                            </td>
                                                                                            <td className="td-order-tela">
                                                                                                <span className="tela-info">{pedido.tela || '—'}</span>
                                                                                            </td>
                                                                                            {(usuario?.role === 'administrador' || usuario?.role === 'auxiliar') && (
                                                                                                <td className="td-order-costo">
                                                                                                    <span className="costo-amount">{formatCurrency(pedido.costo)}</span>
                                                                                                </td>
                                                                                            )}
                                                                                            <td className="td-order-estado">
                                                                                                <span className={`order-status-badge ${pedido.estado ? pedido.estado.toLowerCase().replace(/[_ ]/g, '-') : ''}`}>
                                                                                                    {capitalizeEstado(pedido.estado)}
                                                                                                </span>
                                                                                            </td>
                                                                                            <td className="td-order-accion">
                                                                                                <button
                                                                                                    className={`btn-expand-order ${expandedNestedOrderId === pedido.id ? 'active' : ''}`}
                                                                                                    onClick={() => handleExpandNestedOrder(pedido.id)}
                                                                                                    title="Ver Productos"
                                                                                                >
                                                                                                    <FaChevronDown />
                                                                                                </button>
                                                                                            </td>
                                                                                        </tr>
                                                                                        {expandedNestedOrderId === pedido.id && (
                                                                                            <tr className="nested-expanded-row">
                                                                                                <td colSpan={usuario?.role === 'vendedor' ? '6' : '7'}>
                                                                                                    <div className="nested-order-details-wrapper">
                                                                                                        {loadingNestedDetails ? (
                                                                                                            <div className="loading-container-small"><div className="loader-small"></div></div>
                                                                                                        ) : nestedOrderDetails ? (
                                                                                                            <div className="nested-order-content">
                                                                                                                <h5>Productos en Orden #{pedido.id}</h5>
                                                                                                                <table className="products-table-enhanced">
                                                                                                                    <thead>
                                                                                                                        <tr>
                                                                                                                            <th>Referencia</th>
                                                                                                                            <th>Cantidad</th>
                                                                                                                            <th>Especificaciones</th>
                                                                                                                        </tr>
                                                                                                                    </thead>
                                                                                                                    <tbody>
                                                                                                                        {nestedOrderDetails.map((detalle, idx) => (
                                                                                                                            <tr key={idx}>
                                                                                                                                <td><strong>{detalle.referencia}</strong></td>
                                                                                                                                <td>{detalle.cantidad}</td>
                                                                                                                                <td>{detalle.especificaciones || '—'}</td>
                                                                                                                            </tr>
                                                                                                                        ))}
                                                                                                                    </tbody>
                                                                                                                </table>
                                                                                                            </div>
                                                                                                        ) : <div className="error-message">Error al cargar detalles del pedido.</div>}
                                                                                                    </div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        )}
                                                                                    </React.Fragment>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                ) : (
                                                                    <div className="empty-state-small">
                                                                        <p>No hay órdenes de pedido asociadas a esta venta.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="error-message">No se pudieron cargar los detalles.</div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View - Accordion List */}
                <div className="mobile-view">
                    {isLoading ? (
                        // Skeleton Loading List
                        Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="mobile-sale-item skeleton-item">
                                <div className="mobile-sale-summary">
                                    <div className="skeleton skeleton-text" style={{ width: '40px' }}></div>
                                    <div className="skeleton skeleton-text" style={{ width: '120px' }}></div>
                                    <div className="skeleton skeleton-text" style={{ width: '80px' }}></div>
                                </div>
                            </div>
                        ))
                    ) : ventas.length === 0 ? (
                        <div className="empty-state">No se encontraron ventas.</div>
                    ) : (
                        ventas.map((venta) => (
                            <div className={`mobile-sale-item ${expandedVentaId === venta.id ? 'expanded' : ''}`} key={venta.id}>
                                <div className="mobile-sale-summary" onClick={() => handleExpandVenta(venta.id)}>
                                    <div className="summary-row-top">
                                        <span className="summary-id">#{venta.id}</span>
                                        <span className={`status-badge ${getStatusClass(venta.estado)}`}>
                                            {capitalizeEstado(venta.estado)}
                                        </span>
                                    </div>
                                    <div className="summary-row-main">
                                        <h3 className="summary-vendor">{venta.vendedor_nombre || 'Vendedor no asignado'}</h3>
                                        <p className="summary-client-sub">{venta.cliente_nombre || (venta.cliente ? venta.cliente.nombre : 'Cliente Eliminado')}</p>
                                    </div>
                                    <div className="summary-row-bottom">
                                        <span className="summary-date">{formatShortDate(venta.fecha_venta)}</span>
                                        <span className="summary-total">{formatCurrency(venta.valor_total)}</span>
                                    </div>
                                    <div className="summary-expand-icon">
                                        <FaChevronDown />
                                    </div>
                                </div>

                                {/* Mobile Expanded Details */}
                                {expandedVentaId === venta.id && (
                                    <div className="mobile-sale-details">
                                        {loadingDetails ? (
                                            <div className="loading-container-small"><div className="loader-small"></div></div>
                                        ) : detailsError ? (
                                            <div className="error-container-small">
                                                <p className="error-text">{detailsError}</p>
                                                <button className="btn-secondary btn-sm" onClick={() => refreshVentaDetails(venta.id)}>Reintentar</button>
                                            </div>
                                        ) : ventaDetails ? (
                                            <div className="mobile-details-content">
                                                <div className="mobile-detail-section">
                                                    <h4>Información del Cliente</h4>
                                                    <div className="detail-grid">
                                                        <div className="detail-item full-width">
                                                            <span className="label">Razón Social / Nombre</span>
                                                            <span className="value">{ventaDetails.cliente?.nombre || '—'}</span>
                                                        </div>
                                                        <div className="detail-item">
                                                            <span className="label">NIT / CC</span>
                                                            <span className="value">{ventaDetails.cliente?.cedula || '—'}</span>
                                                        </div>
                                                        <div className="detail-item">
                                                            <span className="label">Teléfono 1</span>
                                                            <span className="value">{ventaDetails.cliente?.telefono1 || '—'}</span>
                                                        </div>
                                                        <div className="detail-item">
                                                            <span className="label">Teléfono 2</span>
                                                            <span className="value">{ventaDetails.cliente?.telefono2 || '—'}</span>
                                                        </div>
                                                        <div className="detail-item full-width">
                                                            <span className="label">Email</span>
                                                            <span className="value">{ventaDetails.cliente?.correo || '—'}</span>
                                                        </div>
                                                        <div className="detail-item full-width">
                                                            <span className="label">Dirección</span>
                                                            <span className="value">{ventaDetails.cliente?.direccion || '—'}</span>
                                                        </div>
                                                        <div className="detail-item full-width">
                                                            <span className="label">Ciudad</span>
                                                            <span className="value">{ventaDetails.cliente?.ciudad || '—'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mobile-detail-section">
                                                    <h4>Estado Financiero</h4>
                                                    <div className="financial-summary">
                                                        <div className="fin-item">
                                                            <span className="label">Abonado</span>
                                                            <span className="value text-success">{formatCurrency(venta.abono)}</span>
                                                        </div>
                                                        <div className="fin-item">
                                                            <span className="label">Saldo</span>
                                                            <span className="value text-danger">{formatCurrency(venta.saldo)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mobile-detail-section">
                                                    <h4>Pagos ({ventaDetails.recibos?.length || 0})</h4>
                                                    <div className="mobile-payments-list">
                                                        {ventaDetails.recibos && ventaDetails.recibos.length > 0 ? ventaDetails.recibos.map(r => (
                                                            <div key={r.id} className="mobile-payment-compact">
                                                                <div className="mp-left">
                                                                    <span className="mp-rc">RC-{r.id}</span>
                                                                    <span className="mp-date">{formatShortDate(r.fecha)}</span>
                                                                </div>
                                                                <div className="mp-right">
                                                                    <span className="mp-amount">{formatCurrency(r.valor)}</span>
                                                                    <span className={`mp-status-dot ${r.estado === 'Confirmado' ? 'bg-success' : 'bg-warning'}`}></span>
                                                                </div>
                                                            </div>
                                                        )) : <p className="text-muted text-sm">Sin pagos registrados.</p>}
                                                    </div>
                                                </div>

                                                <div className="mobile-detail-section">
                                                    <h4>Órdenes de Pedido</h4>
                                                    <div className="mobile-orders-list">
                                                        {ventaDetails.ordenes_pedido && ventaDetails.ordenes_pedido.length > 0 ? ventaDetails.ordenes_pedido.map(op => (
                                                            <div key={op.id} className="mobile-order-compact">
                                                                <div className="mo-header">
                                                                    <span className="mo-id">OP-{op.id}</span>
                                                                    <span className={`status-badge-sm ${op.estado?.toLowerCase()}`}>{capitalizeEstado(op.estado)}</span>
                                                                </div>
                                                                <div className="mo-body">
                                                                    <span className="mo-provider">{op.proveedor_nombre}</span>
                                                                    <span className="mo-date">Entrega: {formatShortDate(op.fecha_esperada)}</span>
                                                                </div>
                                                            </div>
                                                        )) : <p className="text-muted text-sm">Sin órdenes asociadas.</p>}
                                                    </div>
                                                </div>

                                                <div className="mobile-actions-grid">
                                                    {(usuario?.role.toLowerCase() === 'administrador' || usuario?.role.toLowerCase() === 'auxiliar') && (
                                                        <button className="btn-action-mobile primary" onClick={() => {
                                                            setEditSaleData(ventaDetails);
                                                            setShowEditSaleModal(true);
                                                        }}>
                                                            <FaEdit /> Editar
                                                        </button>
                                                    )}
                                                    <button className="btn-action-mobile" onClick={() => setShowObservacionClienteModal(true)}>
                                                        <FaPlus /> Obs. Cliente
                                                    </button>
                                                    <button className="btn-action-mobile" onClick={() => setShowObservacionVentaModal(true)}>
                                                        <FaPlus /> Obs. Venta
                                                    </button>
                                                    <button className="btn-action-mobile" onClick={() => setShowRemisionModal(true)}>
                                                        <FaPlus /> Remisión
                                                    </button>
                                                </div>
                                            </div>
                                        ) : <div className="error-message">Error al cargar detalles.</div>}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>


            <Modal
                show={showObservacionClienteModal}
                onClose={() => setShowObservacionClienteModal(false)}
                title="Agregar Observación al Cliente"
            >
                <div className="modal-form-container">
                    <div className="form-group">
                        <label htmlFor="obs-cliente-text" className="form-label">Observación</label>
                        <textarea
                            id="obs-cliente-text"
                            className="form-textarea"
                            value={observacionClienteText}
                            onChange={(e) => setObservacionClienteText(e.target.value)}
                            placeholder="Escribe la observación para el cliente..."
                            rows={5}
                        ></textarea>
                    </div>
                    <div className="modal-actions">
                        <button className="btn-secondary-modal" onClick={() => setShowObservacionClienteModal(false)}>Cancelar</button>
                        <button className="btn-primary-modal" onClick={() => handleAddObservacion('cliente')}>Guardar Observación</button>
                    </div>
                </div>
            </Modal>

            <Modal
                show={showObservacionVentaModal}
                onClose={() => setShowObservacionVentaModal(false)}
                title="Agregar Observación a la Venta"
            >
                <div className="modal-form-container">
                    <div className="form-group">
                        <label htmlFor="obs-venta-text" className="form-label">Observación</label>
                        <textarea
                            id="obs-venta-text"
                            className="form-textarea"
                            value={observacionVentaText}
                            onChange={(e) => setObservacionVentaText(e.target.value)}
                            placeholder="Escribe la observación para la venta..."
                            rows={5}
                        ></textarea>
                    </div>
                    <div className="modal-actions">
                        <button className="btn-secondary-modal" onClick={() => setShowObservacionVentaModal(false)}>Cancelar</button>
                        <button className="btn-primary-modal" onClick={() => handleAddObservacion('venta')}>Guardar Observación</button>
                    </div>
                </div>
            </Modal>

            {
                editSaleData && (
                    <EditSaleModal
                        key={editSaleData.id}
                        show={showEditSaleModal}
                        onClose={() => setShowEditSaleModal(false)}
                        saleData={editSaleData}
                        vendedores={vendedores}
                        estados={estados}
                        onSaleUpdated={refreshVentaDetails} // Re-fetch current sale details
                        setNotification={setNotification}
                        fetchVentas={fetchVentas}
                        fetchReportSales={fetchReportSales}
                        fetchClientes={fetchClientes}
                        usuario={usuario}
                    />
                )
            }
            {console.log('Usuario en Ventas.jsx:', usuario)}
            {console.log('Usuario en Ventas.jsx:', usuario)}

            <RemisionModal
                isOpen={showRemisionModal}
                onClose={() => setShowRemisionModal(false)}
                onSave={handleAddRemision}
                isLoading={isLoading}
            />
        </div >
    );
};

export default Ventas;