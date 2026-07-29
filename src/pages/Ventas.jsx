import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import API from '../services/api';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { FaChevronDown, FaChevronUp, FaFileExport, FaPlus, FaSearch, FaEdit, FaLock, FaLockOpen, FaBoxOpen, FaChartBar, FaChartLine } from "react-icons/fa";
import Modal from '../components/Modal';
import AppNotification from '../components/AppNotification';
import EditSaleModal from '../components/EditSaleModal';
import RemisionModal from '../components/RemisionModal';
import SalesSummaryReport from '../components/SalesSummaryReport';
import { AppContext, usePermissions } from '../AppContext';
import './Ventas.css';
import './VentasImprovements.css';
import './VentasModalForms.css';
import '../components/Modal.css';
import '../components/AppNotification.css';

import useDebounce from '../hooks/useDebounce';

const Ventas = () => {
    const { fetchClientes, usuario } = useContext(AppContext);
    const hasPermission = usePermissions();
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

    const [selectedDateFilter, setSelectedDateFilter] = useState({
        mode: 'months',
        periods: [getDefaultMonthYear()],
        startDate: '',
        endDate: ''
    });
    const [isDateOpen, setIsDateOpen] = useState(false);
    const dateRef = useRef(null);
    const [selectedEstados, setSelectedEstados] = useState(['pendiente', 'entregado']);
    const [isEstadosOpen, setIsEstadosOpen] = useState(false);
    const estadosRef = useRef(null);
    
    const [selectedSedes, setSelectedSedes] = useState(['Lottus 1', 'Lottus 2']);
    const [isSedesOpen, setIsSedesOpen] = useState(false);
    const sedesRef = useRef(null);
    const sedesOptions = ['Lottus 1', 'Lottus 2'];

    const [selectedVendedores, setSelectedVendedores] = useState([]);
    const [isVendedoresOpen, setIsVendedoresOpen] = useState(false);
    const [hasInitializedVendedores, setHasInitializedVendedores] = useState(false);
    const vendedoresRef = useRef(null);

    const vendedoresActivos = React.useMemo(() => {
        const sellersMap = new Map();
        reportSales.forEach(venta => {
            if (venta.vendedor) {
                const vendId = typeof venta.vendedor === 'object' ? venta.vendedor.id : venta.vendedor;
                if (vendId) sellersMap.set(vendId, true);
            }
            if (venta.vendedores_compartidos && venta.vendedores_compartidos.length > 0) {
                venta.vendedores_compartidos.forEach(vc => {
                    const vcId = typeof vc === 'object' ? vc.id : vc;
                    if (vcId) sellersMap.set(vcId, true);
                });
            }
        });
        return vendedores.filter(v => sellersMap.has(v.id));
    }, [reportSales, vendedores]);

    useEffect(() => {
        if (vendedoresActivos.length > 0 && !hasInitializedVendedores) {
            setSelectedVendedores(vendedoresActivos.map(v => v.id));
            setHasInitializedVendedores(true);
        }
    }, [vendedoresActivos, hasInitializedVendedores]);



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
    const [isSubmittingObs, setIsSubmittingObs] = useState(false);
    const [isEditingObs, setIsEditingObs] = useState(false);
    const [selectedObsId, setSelectedObsId] = useState(null);
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

        return `$${num.toLocaleString('es-CO')}`;
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

    const requestCount = useRef(0);

    const fetchVentas = useCallback(async (page = 1) => {
        requestCount.current += 1;
        const currentRequest = requestCount.current;

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
                if (selectedDateFilter.mode === 'months') {
                    if (!selectedDateFilter.periods.includes('all') && selectedDateFilter.periods.length > 0) {
                        params.periods = selectedDateFilter.periods.join(',');
                    }
                } else if (selectedDateFilter.mode === 'range') {
                    if (selectedDateFilter.startDate) params.start_date = selectedDateFilter.startDate;
                    if (selectedDateFilter.endDate) params.end_date = selectedDateFilter.endDate;
                }
                const perms = usuario?.permissions || [];
                const canSeeAll = perms.includes('VER_TODAS_VENTAS') || perms.includes('ALL') || usuario?.role.toLowerCase() === 'administrador';
                if (!canSeeAll) {
                    params.vendedor = usuario.id;
                } else {
                    if (selectedVendedores.length > 0) {
                        params.vendedor = selectedVendedores.join(',');
                    } else if (hasInitializedVendedores) {
                        params.vendedor = '-1';
                    }
                }
                if (selectedEstados.length > 0) {
                    params.estado = selectedEstados.join(',');
                } else {
                    params.estado = 'ninguno_imposible';
                }
                if (selectedSedes.length > 0) {
                    params.sede = selectedSedes.join(',');
                } else {
                    params.sede = 'ninguna_imposible';
                }
            }
            const response = await API.get(`/ventas/`, { params });
            
            if (currentRequest !== requestCount.current) return;

            let fetchedVentas = response.data.results || response.data || [];
            
            // Enforce exact requested sorting: Date DESC, then ID DESC
            // Using string comparison (localeCompare) to prevent NaN issues with Date parsing
            fetchedVentas.sort((a, b) => {
                const dateA = a.fecha_venta || "";
                const dateB = b.fecha_venta || "";
                if (dateA !== dateB) {
                    return dateB.localeCompare(dateA); // Fecha de venta DESC
                }
                return b.id - a.id; // ID DESC
            });

            // Handle paginated response
            if (response.data.results) {
                setVentas(fetchedVentas);
                setTotalCount(response.data.count);
                setTotalPages(Math.ceil(response.data.count / pageSize) || 1);
            } else {
                // Fallback for non-paginated response
                setVentas(fetchedVentas);
                setTotalCount(fetchedVentas.length || 0);
                setTotalPages(1);
            }
            if (currentRequest === requestCount.current) {
                setIsLoading(false);
            }
        } catch (error) {
            if (currentRequest === requestCount.current) {
                console.error('Error cargando ventas:', error);
                setNotification({ message: 'Error al cargar las ventas.', type: 'error' });
                setVentas([]);
                setTotalCount(0);
                setTotalPages(1);
                setIsLoading(false);
            }
        }
    }, [debouncedSearchTerm, selectedDateFilter, selectedVendedores, selectedEstados, selectedSedes, setNotification, usuario, hasInitializedVendedores]);

    const fetchReportSales = useCallback(async () => {
        try {
            const params = {};
            if (selectedDateFilter.mode === 'months') {
                if (!selectedDateFilter.periods.includes('all') && selectedDateFilter.periods.length > 0) {
                    params.periods = selectedDateFilter.periods.join(',');
                }
            } else if (selectedDateFilter.mode === 'range') {
                if (selectedDateFilter.startDate) params.start_date = selectedDateFilter.startDate;
                if (selectedDateFilter.endDate) params.end_date = selectedDateFilter.endDate;
            }
            const perms = usuario?.permissions || [];
            const canSeeAll = perms.includes('VER_TODAS_VENTAS') || perms.includes('ALL') || usuario?.role.toLowerCase() === 'administrador';
            if (!canSeeAll) {
                params.vendedor = usuario.id;
            }
            params.is_report = 'true';
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
    }, [selectedDateFilter, usuario]);

    // Effect for Filters (reset page to 1)
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, selectedDateFilter, selectedVendedores, selectedEstados, selectedSedes]);

    // Effect for Page Change & Filter Changes (single unified trigger)
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
                const list = response.data || [];
                setVendedores(list);
                if (list.length > 0 && !hasInitializedVendedores) {
                    setSelectedVendedores(list.map(v => v.id));
                    setHasInitializedVendedores(true);
                }
            } catch (error) {
                console.error('Error cargando vendedores:', error);
            }
        };
        fetchVendedores();
    }, []);

    useEffect(() => {
        setEstados(["pendiente", "entregado", "anulado"]);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (estadosRef.current && !estadosRef.current.contains(event.target)) {
                setIsEstadosOpen(false);
            }
            if (sedesRef.current && !sedesRef.current.contains(event.target)) {
                setIsSedesOpen(false);
            }
            if (vendedoresRef.current && !vendedoresRef.current.contains(event.target)) {
                setIsVendedoresOpen(false);
            }
            if (dateRef.current && !dateRef.current.contains(event.target)) {
                setIsDateOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleEstado = (estadoVal) => {
        setSelectedEstados(prev => {
            if (prev.includes(estadoVal)) {
                return prev.filter(e => e !== estadoVal);
            } else {
                return [...prev, estadoVal];
            }
        });
    };

    const selectAllEstados = () => {
        if (selectedEstados.length === estados.length) {
            setSelectedEstados([]);
        } else {
            setSelectedEstados([...estados]);
        }
    };

    const toggleSede = (sedeVal) => {
        setSelectedSedes(prev => {
            if (prev.includes(sedeVal)) {
                return prev.filter(s => s !== sedeVal);
            } else {
                return [...prev, sedeVal];
            }
        });
    };

    const selectAllSedes = () => {
        if (selectedSedes.length === sedesOptions.length) {
            setSelectedSedes([]);
        } else {
            setSelectedSedes([...sedesOptions]);
        }
    };

    const togglePeriod = (periodVal) => {
        setSelectedDateFilter(prev => {
            const newPeriods = prev.periods.includes(periodVal)
                ? prev.periods.filter(p => p !== periodVal)
                : [...prev.periods, periodVal];
            return { ...prev, mode: 'months', periods: newPeriods };
        });
    };

    const selectAllPeriods = () => {
        setSelectedDateFilter(prev => {
            if (prev.periods.length === monthOptions.length) {
                return { ...prev, mode: 'months', periods: [] };
            } else {
                return { ...prev, mode: 'months', periods: monthOptions.map(o => o.value) };
            }
        });
    };
    
    const handleDateModeChange = (mode) => {
        setSelectedDateFilter(prev => ({ ...prev, mode }));
    };

    const handleStartDateChange = (e) => {
        setSelectedDateFilter(prev => ({ ...prev, startDate: e.target.value }));
    };

    const handleEndDateChange = (e) => {
        setSelectedDateFilter(prev => ({ ...prev, endDate: e.target.value }));
    };

    const toggleVendedor = (vendId) => {
        setSelectedVendedores(prev => {
            if (prev.includes(vendId)) {
                return prev.filter(id => id !== vendId);
            } else {
                return [...prev, vendId];
            }
        });
    };

    const selectAllVendedores = () => {
        if (selectedVendedores.length === vendedoresActivos.length) {
            setSelectedVendedores([]);
        } else {
            setSelectedVendedores(vendedoresActivos.map(v => v.id));
        }
    };

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
            setNestedOrderDetails(null);
        } else {
            setExpandedNestedOrderId(orderId);
            setNestedOrderDetails(null);
            setLoadingNestedDetails(true);
            try {
                const response = await API.get(`/pedidos/${orderId}/detalles/`);
                // Ensure we handle paginated ({ results: [...] }), object wrapper ({ detalles: [...] }), and non-paginated ([...]) responses
                let data = [];
                if (response.data.detalles && Array.isArray(response.data.detalles)) {
                    data = response.data.detalles;
                } else if (response.data.results && Array.isArray(response.data.results)) {
                    data = response.data.results;
                } else if (Array.isArray(response.data)) {
                    data = response.data;
                }
                setNestedOrderDetails(data);
            } catch (error) {
                console.error('Error cargando detalles del pedido anidado:', error);
            } finally {
                setLoadingNestedDetails(false);
            }
        }
    };

    const getStatusClass = (status) => status ? status.toLowerCase().replace(/ /g, '-') : '';


    const handleEditObservacionClick = (tipo, obs) => {
        setIsEditingObs(true);
        setSelectedObsId(obs.id);
        if (tipo === 'cliente') {
            setObservacionClienteText(obs.texto);
            setShowObservacionClienteModal(true);
        } else {
            setObservacionVentaText(obs.texto);
            setShowObservacionVentaModal(true);
        }
    };

    const handleDeleteObservacion = async (tipo) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta observación?')) return;
        setIsSubmittingObs(true);
        try {
            await API.delete(`/observaciones-${tipo}/${selectedObsId}/`);
            setNotification({ message: 'Observación eliminada correctamente.', type: 'success' });
            if (tipo === 'cliente') {
                setShowObservacionClienteModal(false);
                setObservacionClienteText('');
            } else {
                setShowObservacionVentaModal(false);
                setObservacionVentaText('');
            }
            API.get(`/ventas/${expandedVentaId}/`).then(response => {
                setVentaDetails(response.data);
            }).catch(error => console.error(error));
        } catch (error) {
            console.error('Error al eliminar observación:', error);
            setNotification({ message: 'Error al eliminar la observación.', type: 'error' });
        } finally {
            setIsSubmittingObs(false);
        }
    };

    const handleAddObservacion = async (tipo) => {
        const id = tipo === 'cliente' ? ventaDetails.cliente.id : expandedVentaId;
        
        let url;
        let method = 'POST';
        
        if (isEditingObs) {
            url = `/observaciones-${tipo}/${selectedObsId}/`;
            method = 'PUT';
        } else {
            url = `/${tipo === 'cliente' ? 'clientes' : 'ventas'}/${id}/observaciones/${tipo === 'cliente' ? 'anadir/' : ''}`;
        }

        const texto = tipo === 'cliente' ? observacionClienteText : observacionVentaText;

        if (!texto) {
            setNotification({ message: 'La observación no puede estar vacía.', type: 'error' });
            return;
        }

        setIsSubmittingObs(true);
        try {
            if (method === 'POST') {
                await API.post(url, { texto });
                setNotification({ message: 'Observación añadida correctamente.', type: 'success' });
            } else {
                await API.put(url, { texto });
                setNotification({ message: 'Observación actualizada correctamente.', type: 'success' });
            }
            
            if (tipo === 'cliente') {
                setShowObservacionClienteModal(false);
                setObservacionClienteText('');
            } else {
                setShowObservacionVentaModal(false);
                setObservacionVentaText('');
            }

            // Re-fetch venta details to show new observacion in the background
            API.get(`/ventas/${expandedVentaId}/`).then(response => {
                setVentaDetails(response.data);
            }).catch(error => console.error(error));

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
        } finally {
            setIsSubmittingObs(false);
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
        return isNaN(num) ? null : Math.round(num).toString();
    };

    const exportVentas = () => {
        const dataToExport = ventas.map(venta => ({
            'O.C.': venta.id,
            'F. Venta': formatShortDate(venta.fecha_venta),
            'F. Entrega': formatShortDate(venta.fecha_entrega),
            'Vendedor': `${venta.vendedor_nombre}${venta.vendedores_compartidos_nombres ? `, ${venta.vendedores_compartidos_nombres}` : ''}`,
            'Sede': venta.sede,
            'Traslado': venta.traslado ? 'Sí' : 'No',
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

    const formatReportTitle = (dateFilter) => {
        if (!dateFilter) return 'Histórico de Ventas';
        
        if (dateFilter.mode === 'months') {
            if (dateFilter.periods.length === 0 || dateFilter.periods.includes('all')) {
                return 'Histórico Completo';
            }
            if (dateFilter.periods.length > 1) {
                return `Varios meses seleccionados (${dateFilter.periods.length})`;
            }
            const monthNamesFull = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const p = dateFilter.periods[0];
            const [month, year] = p.split('-');
            return `${monthNamesFull[parseInt(month, 10) - 1]} ${year}`;
        } else {
            if (!dateFilter.startDate || !dateFilter.endDate) return 'Rango Incompleto';
            return `${dateFilter.startDate} a ${dateFilter.endDate}`;
        }
    };

    return (
        <div className="page-container">
            <AppNotification
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ message: '', type: '' })}
            />
            {usuario && (
                <div className={`sales-summary-report-wrapper ${isReportVisible ? 'expanded' : ''}`}>
                    <div className="report-header" onClick={() => setIsReportVisible(!isReportVisible)}>
                        <div className="report-header-left">
                            <div className="report-header-icon-badge">
                                <FaChartLine />
                            </div>
                            <div className="report-header-titles">
                                <span className="report-header-subtitle">RESUMEN DE VENTAS</span>
                                <h3 className="report-header-title">{formatReportTitle(selectedDateFilter)}</h3>
                            </div>
                        </div>
                        <button
                            type="button"
                            className={`report-header-toggle-btn ${isReportVisible ? 'active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsReportVisible(!isReportVisible);
                            }}
                            title={isReportVisible ? "Ocultar Estadísticas" : "Ver Estadísticas"}
                        >
                            <span>{isReportVisible ? 'Ocultar Estadísticas' : 'Ver Estadísticas'}</span>
                            {isReportVisible ? <FaChevronUp className="toggle-arrow" /> : <FaChevronDown className="toggle-arrow" />}
                        </button>
                    </div>
                    {isReportVisible && (
                        <div className="report-content-body">
                            <SalesSummaryReport
                                ventas={reportSales}
                                vendedores={vendedores}
                                selectedMonthYear={selectedDateFilter.mode === 'months' && selectedDateFilter.periods.length === 1 ? selectedDateFilter.periods[0] : 'all'}
                                formatCurrency={formatCurrency}
                                capitalizeEstado={capitalizeEstado}
                            />
                        </div>
                    )}
                </div>
            )}

            <div className="v-glass-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', overflow: 'visible' }}>
                <div className="v-filters-bar" style={{ margin: 0, flex: 1, overflow: 'visible', flexWrap: 'wrap' }}>
                    <div className="v-search-pill">
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="Buscar OC o Cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {!searchTerm && (
                        <>
                            <div className="v-multi-select-container" ref={dateRef}>
                                <button
                                    type="button"
                                    className={`v-multi-select-btn ${selectedDateFilter.mode === 'months' && selectedDateFilter.periods.length > 0 ? 'active-filter' : selectedDateFilter.mode === 'range' ? 'active-filter' : ''} ${isDateOpen ? 'open' : ''}`}
                                    onClick={() => setIsDateOpen(prev => !prev)}
                                >
                                    <span>
                                        {selectedDateFilter.mode === 'months'
                                            ? selectedDateFilter.periods.length === 0
                                                ? 'Mes: Ninguno'
                                                : selectedDateFilter.periods.includes('all')
                                                    ? 'Mes: Todos'
                                                    : `Mes: ${selectedDateFilter.periods.length} seleccionados`
                                            : `Rango: ${selectedDateFilter.startDate || '?'} a ${selectedDateFilter.endDate || '?'}`}
                                    </span>
                                    <FaChevronDown style={{ fontSize: '0.65rem', opacity: 0.7 }} />
                                </button>
                                {isDateOpen && (
                                    <div className="v-multi-select-popover" style={{ width: '280px' }}>
                                        <div className="v-popover-tabs" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '0.5rem' }}>
                                            <button 
                                                type="button" 
                                                style={{ flex: 1, padding: '0.5rem', background: 'none', border: 'none', borderBottom: selectedDateFilter.mode === 'months' ? '2px solid var(--primary)' : '2px solid transparent', color: selectedDateFilter.mode === 'months' ? 'var(--primary)' : '#64748b', fontWeight: selectedDateFilter.mode === 'months' ? '600' : '400', cursor: 'pointer' }}
                                                onClick={() => handleDateModeChange('months')}
                                            >
                                                Por Meses
                                            </button>
                                            <button 
                                                type="button" 
                                                style={{ flex: 1, padding: '0.5rem', background: 'none', border: 'none', borderBottom: selectedDateFilter.mode === 'range' ? '2px solid var(--primary)' : '2px solid transparent', color: selectedDateFilter.mode === 'range' ? 'var(--primary)' : '#64748b', fontWeight: selectedDateFilter.mode === 'range' ? '600' : '400', cursor: 'pointer' }}
                                                onClick={() => handleDateModeChange('range')}
                                            >
                                                Rango Manual
                                            </button>
                                        </div>
                                        
                                        {selectedDateFilter.mode === 'months' ? (
                                            <>
                                                <div className="v-popover-header">
                                                    <span className="v-popover-title">Filtrar Meses</span>
                                                    <button type="button" className="v-popover-action-btn" onClick={selectAllPeriods}>
                                                        {selectedDateFilter.periods.length === monthOptions.length ? 'Ninguno' : 'Todos'}
                                                    </button>
                                                </div>
                                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                    {monthOptions.map(option => (
                                                        <label key={option.value} className="v-popover-item">
                                                            <input type="checkbox" checked={selectedDateFilter.periods.includes(option.value)} onChange={() => togglePeriod(option.value)} />
                                                            <span>{option.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569' }}>Fecha de Inicio</label>
                                                    <input type="date" onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }} className="v-date-input" value={selectedDateFilter.startDate} onChange={handleStartDateChange} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569' }}>Fecha de Fin</label>
                                                    <input type="date" onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }} className="v-date-input" value={selectedDateFilter.endDate} onChange={handleEndDateChange} />
                                                </div>
                                                <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0, marginTop: '0.25rem', lineHeight: '1.2' }}>
                                                    * La búsqueda manual ignora la regla de facturación del día 6 al 5.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="v-multi-select-container" ref={estadosRef}>
                                <button
                                    type="button"
                                    className={`v-multi-select-btn ${selectedEstados.length > 0 ? 'active-filter' : ''} ${isEstadosOpen ? 'open' : ''}`}
                                    onClick={() => setIsEstadosOpen(prev => !prev)}
                                >
                                    <span>
                                        {selectedEstados.length === 0
                                            ? 'Estado: Ninguno'
                                            : selectedEstados.length === estados.length
                                                ? 'Estado: Todos'
                                                : `Estado: ${selectedEstados.map(capitalizeEstado).join(', ')}`}
                                    </span>
                                    <FaChevronDown style={{ fontSize: '0.65rem', opacity: 0.7 }} />
                                </button>

                                {isEstadosOpen && (
                                    <div className="v-multi-select-popover">
                                        <div className="v-popover-header">
                                            <span className="v-popover-title">Filtrar Estado</span>
                                            <button
                                                type="button"
                                                className="v-popover-action-btn"
                                                onClick={selectAllEstados}
                                            >
                                                {selectedEstados.length === estados.length ? 'Ninguno' : 'Todos'}
                                            </button>
                                        </div>
                                        {estados.map(e => (
                                            <label key={e} className="v-popover-item">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedEstados.includes(e)}
                                                    onChange={() => toggleEstado(e)}
                                                />
                                                <span>{capitalizeEstado(e)}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="v-multi-select-container" ref={sedesRef}>
                                <button
                                    type="button"
                                    className={`v-multi-select-btn ${selectedSedes.length > 0 ? 'active-filter' : ''} ${isSedesOpen ? 'open' : ''}`}
                                    onClick={() => setIsSedesOpen(prev => !prev)}
                                >
                                    <span>
                                        {selectedSedes.length === 0
                                            ? 'Sede: Ninguna'
                                            : selectedSedes.length === sedesOptions.length
                                                ? 'Sede: Todas'
                                                : `Sede: ${selectedSedes.join(', ')}`}
                                    </span>
                                    <FaChevronDown style={{ fontSize: '0.65rem', opacity: 0.7 }} />
                                </button>
                                {isSedesOpen && (
                                    <div className="v-multi-select-popover">
                                        <div className="v-popover-header">
                                            <span className="v-popover-title">Filtrar Sede</span>
                                            <button type="button" className="v-popover-action-btn" onClick={selectAllSedes}>
                                                {selectedSedes.length === sedesOptions.length ? 'Ninguna' : 'Todas'}
                                            </button>
                                        </div>
                                        {sedesOptions.map(s => (
                                            <label key={s} className="v-popover-item">
                                                <input type="checkbox" checked={selectedSedes.includes(s)} onChange={() => toggleSede(s)} />
                                                <span>{s}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {(usuario?.role.toLowerCase() === 'administrador' || usuario?.role.toLowerCase() === 'auxiliar') && (
                                <div className="v-multi-select-container" ref={vendedoresRef}>
                                    <button
                                        type="button"
                                        className={`v-multi-select-btn ${selectedVendedores.length > 0 ? 'active-filter' : ''} ${isVendedoresOpen ? 'open' : ''}`}
                                        onClick={() => setIsVendedoresOpen(prev => !prev)}
                                    >
                                        <span>
                                            {selectedVendedores.length === 0
                                                ? 'Vendedor: Ninguno'
                                                : selectedVendedores.length === vendedoresActivos.length
                                                    ? 'Vendedor: Todos'
                                                    : `Vendedores (${selectedVendedores.length})`}
                                        </span>
                                        <FaChevronDown style={{ fontSize: '0.65rem', opacity: 0.7 }} />
                                    </button>
                                    {isVendedoresOpen && (
                                        <div className="v-multi-select-popover">
                                            <div className="v-popover-header">
                                                <span className="v-popover-title">Filtrar Vendedor</span>
                                                <button type="button" className="v-popover-action-btn" onClick={selectAllVendedores}>
                                                    {selectedVendedores.length === vendedoresActivos.length ? 'Ninguno' : 'Todos'}
                                                </button>
                                            </div>
                                            {vendedoresActivos.length === 0 ? (
                                                <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>No hay vendedores con ventas.</div>
                                            ) : (
                                                vendedoresActivos.map(v => (
                                                    <label key={v.id} className="v-popover-item">
                                                        <input type="checkbox" checked={selectedVendedores.includes(v.id)} onChange={() => toggleVendedor(v.id)} />
                                                        <span>{v.first_name}</span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
                
                <div className="header-actions" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {usuario?.role.toLowerCase() === 'administrador' && (
                        <button className="v-btn-ghost" onClick={exportVentas} title="Exportar Excel">
                            <FaFileExport />
                        </button>
                    )}
                    {hasPermission('CREAR_VENTA') && (
                        <button className="v-btn-primary-glow" onClick={() => navigate('/nuevaVenta')}>
                            <FaPlus />
                            <span className="long-text">Nueva Venta</span>
                            <span className="short-text">Nueva</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="ventas-container">
                {/* Desktop View */}
                <div className="desktop-view">
                    <table className="ventas-table">
                        <thead>
                            <tr>
                                <th className="th-oc">ID</th>
                                <th className="th-fecha" style={{ textAlign: 'center' }}>F. Venta</th>
                                <th className="th-fecha" style={{ textAlign: 'center' }}>F. Entrega</th>
                                <th className="th-vendedor">Vendedor</th>
                                <th className="th-sede">Sede</th>
                                <th className="th-traslado">Trasl.</th>
                                <th className="th-cliente">Cliente</th>
                                {hasPermission('VER_PRECIOS_VENTA') && (
                                    <>
                                        <th className="th-valor">Abono</th>
                                        <th className="th-valor">Saldo</th>
                                        <th className="th-valor">Total</th>
                                    </>
                                )}
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
                                        <td className="td-sede"><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                                        <td className="td-traslado"><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                                        <td className="td-cliente"><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></td>
                                        {hasPermission('VER_PRECIOS_VENTA') && (
                                            <>
                                                <td className="td-valor"><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                                                <td className="td-valor"><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                                                <td className="td-valor"><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                                            </>
                                        )}
                                        <td className="td-pedidos"><div className="skeleton skeleton-badge"></div></td>
                                        <td className="td-estado"><div className="skeleton skeleton-badge"></div></td>
                                        <td className="td-accion"><div className="skeleton skeleton-text" style={{ width: '20px' }}></div></td>
                                    </tr>
                                ))
                            ) : ventas.length === 0 ? (
                                <tr>
                                    <td colSpan={hasPermission('VER_PRECIOS_VENTA') ? "13" : "10"} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                                        <div className="empty-state-content">
                                            <p style={{ fontSize: '1.1rem', color: 'var(--ventas-text-medium)', margin: 0 }}>No hay ventas para este periodo.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                ventas.map((venta) => (
                                    <React.Fragment key={venta.id}>
                                        <tr onClick={() => handleExpandVenta(venta.id)} style={{ cursor: 'pointer' }}>
                                            <td className="td-oc">{venta.id}</td>
                                            <td className="td-fecha" style={{ textAlign: 'center' }}>{formatShortDate(venta.fecha_venta)}</td>
                                            <td className="td-fecha" style={{ textAlign: 'center' }}>{formatShortDate(venta.fecha_entrega)}</td>
                                            <td className="td-vendedor">
                                                {venta.vendedor_nombre || '—'}
                                                {venta.vendedores_compartidos_nombres ? `, ${venta.vendedores_compartidos_nombres}` : ''}
                                            </td>
                                            <td className="td-sede" style={{ textAlign: 'center' }}>
                                                {venta.sede === 'Lottus 1' ? '1' : venta.sede === 'Lottus 2' ? '2' : venta.sede}
                                            </td>
                                            <td className="td-traslado" style={{ textAlign: 'center' }}>
                                                {venta.traslado ? 'Sí' : 'No'}
                                            </td>
                                            <td className="td-cliente" title={venta.cliente_nombre || (venta.cliente ? venta.cliente.nombre : 'Cliente Eliminado')}>
                                                {venta.cliente_nombre || (venta.cliente ? venta.cliente.nombre : 'Cliente Eliminado')}
                                            </td>
                                            {hasPermission('VER_PRECIOS_VENTA') && (
                                                <>
                                                    <td className="td-valor">{formatCurrency(venta.abono)}</td>
                                                    <td className="td-valor">{formatCurrency(venta.saldo)}</td>
                                                    <td className="td-valor td-valor-total">
                                                        {formatCurrency(venta.valor_total)}
                                                    </td>
                                                </>
                                            )}
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
                                                <td colSpan="13" className="expanded-row-content">
                                                    {loadingDetails ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '1rem', width: '100%', textAlign: 'center' }}>
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
                                                                                    <div className="payment-main-row">
                                                                                        <span className="pago-rc">RC. #{pago.id}</span>
                                                                                        <span className="pago-valor">{formatCurrency(pago.valor)}</span>
                                                                                    </div>
                                                                                    <div className="payment-sub-row">
                                                                                        <span className="pago-fecha">{formatShortDate(pago.fecha)}</span>
                                                                                        <span className="pago-sep">•</span>
                                                                                        <span className={`payment-status ${pago.estado === 'Confirmado' ? 'text-green' : 'text-orange'}`}>
                                                                                            ({pago.estado})
                                                                                        </span>
                                                                                        {pago.metodo_pago && (
                                                                                            <>
                                                                                                <span className="pago-sep">•</span>
                                                                                                <span className="payment-method">{pago.metodo_pago}</span>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
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
                                                                    <p className="text-muted">Sin remisiones asociadas.</p>
                                                                )}
                                                            </div>

                                                            {/* Observaciones Unidas */}
                                                            <div className="details-card observaciones-unidas" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                                <div>
                                                                    <h4>
                                                                        Obs. Cliente
                                                                        <button className="card-header-action" onClick={() => {
                                                                            setIsEditingObs(false);
                                                                            setSelectedObsId(null);
                                                                            setObservacionClienteText('');
                                                                            setShowObservacionClienteModal(true);
                                                                        }} title="Añadir Observación Cliente"><FaPlus /></button>
                                                                    </h4>
                                                                    {isPartialData ? (
                                                                        <p className="text-muted" style={{ fontStyle: 'italic' }}>Información no disponible en vista parcial.</p>
                                                                    ) : ventaDetails.cliente.observaciones && ventaDetails.cliente.observaciones.length > 0 ? (
                                                                        <div className="observaciones-list">
                                                                            {ventaDetails.cliente.observaciones.map((obs, index) => (
                                                                                <div key={index} className="observacion-card" onClick={() => handleEditObservacionClick('cliente', obs)}>
                                                                                    <div className="observacion-icon">💬</div>
                                                                                    <div className="observacion-content">
                                                                                        <p className="observacion-text">{obs.texto}</p>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : <p className="text-muted">Sin observaciones de cliente.</p>}
                                                                </div>

                                                                <div>
                                                                    <h4>
                                                                        Obs. Venta
                                                                        <button className="card-header-action" onClick={() => {
                                                                            setIsEditingObs(false);
                                                                            setSelectedObsId(null);
                                                                            setObservacionVentaText('');
                                                                            setShowObservacionVentaModal(true);
                                                                        }} title="Añadir Observación Venta"><FaPlus /></button>
                                                                    </h4>
                                                                    {isPartialData ? (
                                                                        <p className="text-muted" style={{ fontStyle: 'italic' }}>Información no disponible en vista parcial.</p>
                                                                    ) : ventaDetails.observaciones_venta && ventaDetails.observaciones_venta.length > 0 ? (
                                                                        <div className="observaciones-list">
                                                                            {ventaDetails.observaciones_venta.map((obs, index) => (
                                                                                <div key={index} className="observacion-card" onClick={() => handleEditObservacionClick('venta', obs)}>
                                                                                    <div className="observacion-icon">📝</div>
                                                                                    <div className="observacion-content">
                                                                                        <p className="observacion-text">{obs.texto}</p>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : <p className="text-muted">Sin observaciones de venta.</p>}
                                                                </div>
                                                            </div>

                                                            {/* Órdenes de Pedido (Full Width) */}
                                                            <div className="details-card details-full-width orders-section">
                                                                <div className="pedidos-header">
                                                                    <h4>Órdenes de Pedido</h4>
                                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                        <button className="v-btn-primary-glow" onClick={() => navigate('/ordenes/nuevo', { state: { ventaId: venta.id } })}>
                                                                            <FaPlus /> Agregar Pedido
                                                                        </button>
                                                                        {(hasPermission('EDITAR_VENTA') || hasPermission('EDITAR_ESTADO_VENTA') || hasPermission('EDITAR_ESTADO_PEDIDOS_VENTA')) && (
                                                                            <button className="v-btn-primary-glow" onClick={() => {
                                                                                setEditSaleData(ventaDetails);
                                                                                setShowEditSaleModal(true);
                                                                            }}>
                                                                                <FaEdit /> Editar Venta
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {ventaDetails.ordenes_pedido && ventaDetails.ordenes_pedido.length > 0 ? (
                                                                    <div className="orders-cards-container">
                                                                        {ventaDetails.ordenes_pedido.map((pedido) => (
                                                                            <div key={pedido.id} className={`order-card-v2 ${expandedNestedOrderId === pedido.id ? 'expanded' : ''}`}>
                                                                                <div className="order-card-v2-header" onClick={() => handleExpandNestedOrder(pedido.id)}>
                                                                                    <div className="oc-v2-section oc-v2-id">
                                                                                        <span className="oc-v2-label">Orden</span>
                                                                                        <span className="oc-v2-value highlight">#{pedido.id}</span>
                                                                                    </div>
                                                                                    <div className="oc-v2-section oc-v2-prov">
                                                                                        <span className="oc-v2-label">Proveedor</span>
                                                                                        <span className="oc-v2-value">{pedido.proveedor_nombre || '—'}</span>
                                                                                    </div>
                                                                                    <div className="oc-v2-section oc-v2-dates">
                                                                                        <span className="oc-v2-label">Fechas (Pedido - Esperada)</span>
                                                                                        <span className="oc-v2-value mono">{formatShortDate(pedido.fecha_pedido)} a {formatShortDate(pedido.fecha_esperada)}</span>
                                                                                    </div>
                                                                                    <div className="oc-v2-section oc-v2-tela">
                                                                                        <span className="oc-v2-label">Tela</span>
                                                                                        <span className="oc-v2-value italic">{pedido.tela || 'Sin tela'}</span>
                                                                                    </div>
                                                                                    {(usuario?.role === 'administrador' || usuario?.role === 'auxiliar') && (
                                                                                        <div className="oc-v2-section oc-v2-cost">
                                                                                            <span className="oc-v2-label">Costo</span>
                                                                                            <span className="oc-v2-value success">{formatCurrency(pedido.costo)}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="oc-v2-section oc-v2-status">
                                                                                        <span className="oc-v2-label">Estado</span>
                                                                                        <span className={`status-pill ${pedido.estado ? pedido.estado.toLowerCase().replace(/[_ ]/g, '-') : ''}`}>
                                                                                            {capitalizeEstado(pedido.estado)}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="oc-v2-section oc-v2-action">
                                                                                        <button className="expand-btn-v2"><FaChevronDown /></button>
                                                                                    </div>
                                                                                </div>

                                                                                {expandedNestedOrderId === pedido.id && (
                                                                                    <div className="order-card-v2-body">
                                                                                        {loadingNestedDetails ? (
                                                                                            <div className="loading-container-small">
                                                                                                <div className="loader-small"></div>
                                                                                                <span>Cargando productos...</span>
                                                                                            </div>
                                                                                        ) : nestedOrderDetails ? (
                                                                                            <div className="nested-products-grid">
                                                                                                {Array.isArray(nestedOrderDetails) && nestedOrderDetails.length > 0 ? (
                                                                                                    nestedOrderDetails.map((detalle, idx) => (
                                                                                                        <div className="product-item-v2" key={idx}>
                                                                                                            <div className="pi-qty">{detalle.cantidad}x</div>
                                                                                                            <div className="pi-details">
                                                                                                                <span className="pi-ref">{detalle.referencia}</span>
                                                                                                                {detalle.especificaciones && <span className="pi-spec">{detalle.especificaciones}</span>}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))
                                                                                                ) : (
                                                                                                    <p className="text-muted m-0" style={{ fontSize: '0.85rem' }}>No hay productos en esta orden.</p>
                                                                                                )}
                                                                                            </div>
                                                                                        ) : <div className="error-message">Error al cargar productos.</div>}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
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
                        <div className="empty-state">No hay ventas para este periodo.</div>
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
                                        {hasPermission('VER_PRECIOS_VENTA') && (
                                            <span className="summary-total">{formatCurrency(venta.valor_total)}</span>
                                        )}
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

                                                {hasPermission('VER_PRECIOS_VENTA') && (
                                                    <>
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
                                                                            <span className="mp-method">{r.metodo_pago}</span>
                                                                        </div>
                                                                        <div className="mp-right">
                                                                            <span className="mp-amount text-success">{formatCurrency(r.valor)}</span>
                                                                            <span className={`mp-status ${r.estado === 'Confirmado' ? 'confirmed' : 'pending'}`}>{r.estado}</span>
                                                                        </div>
                                                                    </div>
                                                                )) : (
                                                                    <p className="empty-subtext">No hay pagos registrados.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

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
                                                    {(hasPermission('EDITAR_VENTA') || hasPermission('EDITAR_ESTADO_VENTA') || hasPermission('EDITAR_ESTADO_PEDIDOS_VENTA')) && (
                                                        <button className="btn-action-mobile primary" onClick={() => {
                                                            setEditSaleData(ventaDetails);
                                                            setShowEditSaleModal(true);
                                                        }}>
                                                            <FaEdit /> Editar
                                                        </button>
                                                    )}
                                                    <button className="btn-action-mobile" onClick={() => {
                                                        setIsEditingObs(false);
                                                        setSelectedObsId(null);
                                                        setObservacionClienteText('');
                                                        setShowObservacionClienteModal(true);
                                                    }}>
                                                        <FaPlus /> Obs. Cliente
                                                    </button>
                                                    <button className="btn-action-mobile" onClick={() => {
                                                        setIsEditingObs(false);
                                                        setSelectedObsId(null);
                                                        setObservacionVentaText('');
                                                        setShowObservacionVentaModal(true);
                                                    }}>
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
                title={isEditingObs ? "Editar Observación" : "Agregar Observación al Cliente"}
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
                    <div className="modal-actions" style={{ justifyContent: isEditingObs ? 'space-between' : 'flex-end', width: '100%' }}>
                        {isEditingObs && (
                            <button className="btn-danger-modal" onClick={() => handleDeleteObservacion('cliente')} disabled={isSubmittingObs} style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                                Eliminar
                            </button>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-secondary-modal" onClick={() => setShowObservacionClienteModal(false)}>Cancelar</button>
                            <button className="btn-primary-modal" onClick={() => handleAddObservacion('cliente')} disabled={isSubmittingObs}>{isSubmittingObs ? 'Guardando...' : 'Guardar Cambios'}</button>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal
                show={showObservacionVentaModal}
                onClose={() => setShowObservacionVentaModal(false)}
                title={isEditingObs ? "Editar Observación" : "Agregar Observación a la Venta"}
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
                    <div className="modal-actions" style={{ justifyContent: isEditingObs ? 'space-between' : 'flex-end', width: '100%' }}>
                        {isEditingObs && (
                            <button className="btn-danger-modal" onClick={() => handleDeleteObservacion('venta')} disabled={isSubmittingObs} style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                                Eliminar
                            </button>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-secondary-modal" onClick={() => setShowObservacionVentaModal(false)}>Cancelar</button>
                            <button className="btn-primary-modal" onClick={() => handleAddObservacion('venta')} disabled={isSubmittingObs}>{isSubmittingObs ? 'Guardando...' : 'Guardar Cambios'}</button>
                        </div>
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