import { datosDescuento, formatDescuento } from '../utils/descuentosVenta';
import { nombreClienteLabel, documentoClienteLabel } from '../utils/clientes';
import { useExportacion } from '../hooks/useExportacion';
import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import API from '../services/api';
import { mensajeDeError } from '../services/errores';
import { usePageRefresh } from '../hooks/usePageRefresh';
import { useVendedores } from '../hooks/useSharedData';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaChevronDown, FaFileExport, FaPlus, FaSearch, FaEdit, FaChartBar, FaChartLine, FaScroll } from "react-icons/fa";
import Modal from '../components/Modal';
import AppNotification from '../components/AppNotification';
import EditSaleModal from '../components/EditSaleModal';
import RemisionModal from '../components/RemisionModal';
import SalesSummaryReport from '../components/SalesSummaryReport';
import ExpedienteVenta from '../components/ExpedienteVenta';
import FacturadoVenta from '../components/FacturadoVenta';
import { ProductosEsqueleto } from '../components/ProductosVenta';
import { fraccionVenta, participantesVenta } from '../utils/ventasCompartidas';

// Gestión de la venta (2026-10-08): reemplaza a la columna "Pedidos".
const GESTION_BADGE = { pendiente: ['Pendiente', 'warning'], atrasada: ['Atrasada', 'danger'], finalizada: ['Finalizada', 'success'] };

// Esqueleto con la misma forma que la venta expandida: una sola transición al cargar.
const DetalleEsqueleto = () => (
    <div className="venta-details-view" aria-busy="true" aria-label="Cargando detalles de la venta">
        <div className="details-full-width"><ProductosEsqueleto /></div>
        {[0, 1, 2, 3].map(i => <div key={i} className="details-card"><Skeleton lines={4} /></div>)}
    </div>
);
import { PageHeader, Button, Badge, ErrorState, Skeleton } from '../components/ui';
import { AppContext, usePermissions } from '../AppContext';
import './Ventas.css';
import './VentasImprovements.css';
import './VentasModalForms.css';
import '../components/Modal.css';
import '../components/AppNotification.css';

import useDebounce from '../hooks/useDebounce';

// Evita crear un arreglo nuevo en cada render mientras React Query aún carga o
// si `/vendedores/` falla. Ese cambio de referencia hacía que el efecto que
// sincroniza los filtros en la URL navegara otra vez en cada render y terminara
// en "Maximum update depth exceeded".
const EMPTY_ARRAY = Object.freeze([]);

const Ventas = () => {
    const { usuario } = useContext(AppContext);
    const hasPermission = usePermissions();
    const navigate = useNavigate();
    const [ventas, setVentas] = useState([]);
    const [reportSales, setReportSales] = useState([]);
    const { data: vendedoresData, isError: isVendedoresError, error: vendedoresError, refetch: refetchVendedores } = useVendedores();
    const vendedores = vendedoresData ?? EMPTY_ARRAY;
    const [estados, setEstados] = useState([]);
    const [isReportVisible, setIsReportVisible] = useState(false);

    // Filtros persistentes en la URL (P08-08): atrás/recarga/compartir
    // conserva el conjunto. Los multi-select van como JSON.
    const [searchParams, setSearchParams] = useSearchParams();
    const paramsIniciales = useRef(searchParams).current; // solo la primera carga
    const leerArrParam = (k) => {
        try { const v = JSON.parse(paramsIniciales.get(k) || 'null'); return Array.isArray(v) ? v : null; }
        catch { return null; }
    };

    const [searchTerm, setSearchTerm] = useState(() => paramsIniciales.get('q') || '');
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

    const [periodoDefecto] = useState(getDefaultMonthYear);
    const [selectedDateFilter, setSelectedDateFilter] = useState(() => {
        const modo = paramsIniciales.get('modo');
        if (modo === 'range') {
            return { mode: 'range', periods: [], startDate: paramsIniciales.get('desde') || '', endDate: paramsIniciales.get('hasta') || '' };
        }
        const periodos = modo === 'months' ? leerArrParam('periodos') : null;
        return { mode: 'months', periods: periodos ?? [periodoDefecto], startDate: '', endDate: '' };
    });
    const [isDateOpen, setIsDateOpen] = useState(false);
    const dateRef = useRef(null);
    const [selectedEstados, setSelectedEstados] = useState(() => leerArrParam('estados') ?? ['pendiente', 'entregado']);
    const [isEstadosOpen, setIsEstadosOpen] = useState(false);
    const estadosRef = useRef(null);
    
    const [selectedSedes, setSelectedSedes] = useState(() => leerArrParam('sedes') ?? ['Lottus 1', 'Lottus 2']);
    const [isSedesOpen, setIsSedesOpen] = useState(false);
    const sedesRef = useRef(null);
    const sedesOptions = ['Lottus 1', 'Lottus 2'];

    // El check "Feria del Hogar" vive dentro del propio filtro de Sede (las ventas de
    // feria no tienen sede, así que no son un valor más de selectedSedes, sino un
    // interruptor aparte que se muestra/oculta junto a las opciones de sede).
    const [includeFeria, setIncludeFeria] = useState(() => paramsIniciales.get('feria') !== '0');

    // Filtro de vendedores por EXCLUSIÓN: por defecto entran todos los que vendieron en el
    // periodo (también quienes ya no están activos) y solo se guardan los que el usuario
    // desmarca. Así, al cambiar de mes nadie aparece desmarcado sin que el usuario lo
    // haya hecho, y la tabla no depende de que la lista de vendedores ya haya cargado.
    const [vendedoresExcluidos, setVendedoresExcluidos] = useState(() => (leerArrParam('sin_vendedores') ?? []).map(String));
    const [isVendedoresOpen, setIsVendedoresOpen] = useState(false);
    const vendedoresRef = useRef(null);
    const excluidosSet = React.useMemo(() => new Set(vendedoresExcluidos), [vendedoresExcluidos]);

    // Quienes vendieron en el periodo, con nombre aunque ya no estén activos (la lista de
    // /vendedores/ solo trae usuarios activos; antes sus ventas desaparecían al filtrar).
    const vendedoresActivos = React.useMemo(() => {
        const nombres = new Map(vendedores.map(v => [String(v.id), v.first_name]));
        const enPeriodo = new Map();
        const agregar = (id, nombre) => {
            if (id == null || enPeriodo.has(String(id))) return;
            enPeriodo.set(String(id), { id, first_name: nombres.get(String(id)) || nombre || `Usuario ${id}` });
        };
        reportSales.forEach(venta => {
            agregar(typeof venta.vendedor === 'object' ? venta.vendedor?.id : venta.vendedor, venta.vendedor_nombre);
            (venta.vendedores_compartidos || []).forEach((vc, i) => agregar(typeof vc === 'object' ? vc.id : vc, venta.vendedores_compartidos_nombres?.[i]));
        });
        return [...enPeriodo.values()].sort((a, b) => a.first_name.localeCompare(b.first_name, 'es'));
    }, [reportSales, vendedores]);

    const selectedVendedores = React.useMemo(
        () => vendedoresActivos.filter(v => !excluidosSet.has(String(v.id))).map(v => v.id),
        [vendedoresActivos, excluidosSet]
    );
    const todosLosVendedores = selectedVendedores.length === vendedoresActivos.length;

    const canSeeAll = hasPermission('VER_TODAS_VENTAS');

    // Quién cuenta para los totales: un vendedor, solo él; con vendedores desmarcados, solo
    // los marcados; sin filtro, la empresa completa (100 % de cada venta).
    const cuentaParticipante = React.useMemo(() => {
        if (!canSeeAll) return id => id === String(usuario?.id);
        if (vendedoresExcluidos.length === 0) return null;
        return id => !excluidosSet.has(id);
    }, [canSeeAll, usuario, vendedoresExcluidos, excluidosSet]);

    const hasFeriaInPeriod = React.useMemo(() => {
        return reportSales.some(venta => venta.es_feria_hogar);
    }, [reportSales]);

    useEffect(() => {
        if (!hasFeriaInPeriod) {
            setIncludeFeria(true);
        }
    }, [hasFeriaInPeriod]);

    // El informe (SalesSummaryReport) debe reflejar los mismos filtros aplicados a la tabla
    // (vendedor, sede, estado, feria) — reportSales trae todo el periodo sin esos filtros
    // (solo fecha + visibilidad por rol) para poder construir las opciones del selector de
    // vendedores; el filtrado por los demás criterios se hace aquí, en cliente.
    const filteredReportSales = React.useMemo(() => {
        return reportSales.filter(venta => {
            const statusRaw = (venta.estado || 'pendiente').toLowerCase();
            if (!selectedEstados.includes(statusRaw)) return false;

            const isFeria = !!venta.es_feria_hogar;

            // Las ventas de Feria del Hogar no tienen sede (venta.sede === null) — el filtro
            // de Sede nunca debe ocultarlas, solo el check "Feria del Hogar" las controla.
            // Igual que el backend: una venta normal sin sede tampoco se oculta por sede.
            if (!isFeria && venta.sede && !selectedSedes.includes(venta.sede)) return false;
            if (isFeria && !includeFeria) return false;

            // Una venta compartida sigue mientras alguno de sus participantes esté marcado.
            if (excluidosSet.size > 0 && ![...participantesVenta(venta)].some(id => !excluidosSet.has(id))) return false;

            return true;
        });
    }, [reportSales, selectedEstados, selectedSedes, includeFeria, excluidosSet]);

    const totalFiltrado = React.useMemo(
        () => filteredReportSales.reduce((sum, v) => sum + (parseFloat(v.valor_total) || 0) * fraccionVenta(v, cuentaParticipante), 0),
        [filteredReportSales, cuentaParticipante]
    );
    const hayPartesCompartidas = !!cuentaParticipante && filteredReportSales.some(v => fraccionVenta(v, cuentaParticipante) < 1);

    // Sincroniza los filtros con la URL (replace: no ensucia el historial).
    // Solo se escriben los que difieren del valor por defecto.
    useEffect(() => {
        setSearchParams(prev => {
            const params = new URLSearchParams(prev);
            const escribir = (k, v) => { if (v) params.set(k, v); else params.delete(k); };
            const esDefectoFecha = selectedDateFilter.mode === 'months'
                && selectedDateFilter.periods.length === 1
                && selectedDateFilter.periods[0] === periodoDefecto;
            escribir('modo', esDefectoFecha ? '' : selectedDateFilter.mode);
            escribir('periodos', !esDefectoFecha && selectedDateFilter.mode === 'months' ? JSON.stringify(selectedDateFilter.periods) : '');
            escribir('desde', selectedDateFilter.mode === 'range' ? selectedDateFilter.startDate : '');
            escribir('hasta', selectedDateFilter.mode === 'range' ? selectedDateFilter.endDate : '');
            const estadosDefecto = ['pendiente', 'entregado'];
            const estadosMod = selectedEstados.length !== estadosDefecto.length || !selectedEstados.every(e => estadosDefecto.includes(e));
            escribir('estados', estadosMod ? JSON.stringify(selectedEstados) : '');
            const sedesMod = !(selectedSedes.length === 2 && selectedSedes.includes('Lottus 1') && selectedSedes.includes('Lottus 2'));
            escribir('sedes', sedesMod ? JSON.stringify(selectedSedes) : '');
            escribir('feria', includeFeria ? '' : '0');
            params.delete('vendedores'); // formato anterior (lista de marcados)
            escribir('sin_vendedores', vendedoresExcluidos.length ? JSON.stringify(vendedoresExcluidos) : '');
            escribir('q', searchTerm);
            // React Router vuelve a renderizar si se devuelve siempre un objeto
            // nuevo, aunque la URL no haya cambiado. Mantener la referencia
            // anterior corta el ciclo cuando el backend está fallando o no hay
            // vendedores todavía.
            return params.toString() === prev.toString() ? prev : params;
        }, { replace: true });
    }, [selectedDateFilter, selectedEstados, selectedSedes, includeFeria, vendedoresExcluidos, searchTerm, periodoDefecto, setSearchParams]);



    // Estados para la expansión
    const [expandedVentaId, setExpandedVentaId] = useState(null);
    const [ventaDetails, setVentaDetails] = useState(null);
    // Rastrea qué venta está realmente activa en este momento (a diferencia de
    // expandedVentaId, se lee "en vivo" dentro de callbacks async) — evita que
    // una respuesta tardía de una venta ya abandonada sobreescriba lo que se
    // está mostrando ahora (ej. abrir la venta A, cambiar rápido a la B antes
    // de que A responda, y que los pagos de A terminen mostrándose bajo B).
    const activeVentaIdRef = useRef(null);
    const [expandedNestedOrderId, setExpandedNestedOrderId] = useState(null);
    const activeNestedOrderIdRef = useRef(null);
    const [nestedOrderDetails, setNestedOrderDetails] = useState(null);
    const [nestedFabricOrders, setNestedFabricOrders] = useState([]);
    const [detailsError, setDetailsError] = useState(null);
    const [isPartialData, setIsPartialData] = useState(false);

    // Estados de Carga y Errores
    const [currentPage, setCurrentPage] = useState(1);
    const [, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    // La tabla carga de a 100 y "Ver más ventas" trae las siguientes (antes solo se veían
    // las primeras 50 y en meses grandes, como los de Feria del Hogar, faltaban ventas).
    const pageSize = 100;
    const paginaCargada = useRef(1);
    const [cargandoMas, setCargandoMas] = useState(false);

    // Estados de Carga y Errores
    const [isLoading, setIsLoading] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [loadingNestedDetails, setLoadingNestedDetails] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' });
    // Facturación (2026-10-21): columna y marca solo para quien tiene MARCAR_VENTA_FACTURADA.
    const puedeFacturar = hasPermission('MARCAR_VENTA_FACTURADA');
    const marcarFacturada = (datos) => setVentas((vs) => vs.map((v) => (v.id === datos.id ? { ...v, ...datos } : v)));
  const { exportar, exportando } = useExportacion('ventas', 'Ventas.xlsx', setNotification);
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

    // --- Funciones de Formato ---
    const formatShortDate = (dateStr) => {
        if (!dateStr) return '—';
        const [year, month, day] = dateStr.split('-');
        const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
        const monthName = monthNames[parseInt(month, 10) - 1];
        return `${day}-${monthName}-${year}`;
    };

    

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '$0';

        const num = parseFloat(value);

        if (isNaN(num)) return '$0';

        // Pesos sin decimales: las partes de ventas compartidas y los promedios pueden traer fracciones.
        return `$${Math.round(num).toLocaleString('es-CO')}`;
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
    const reportRequestCount = useRef(0);

    const parametrosVentas = useCallback(() => {
            const params = {};
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
                if (!canSeeAll) params.vendedor = usuario.id;
                if (vendedoresExcluidos.length > 0) params.excluir_vendedores = vendedoresExcluidos.join(',');
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
                // Las ventas normales siempre pueden pasar este filtro — el check "Feria del
                // Hogar" (dentro del filtro de Sede) solo decide si las de feria se incluyen.
                params.es_feria_hogar = includeFeria ? 'true,false' : 'false';
            }
            return params;
    }, [debouncedSearchTerm, selectedDateFilter, vendedoresExcluidos, selectedEstados, selectedSedes, includeFeria, usuario, canSeeAll]);

    const fetchVentas = useCallback(async (page = 1) => {
        requestCount.current += 1;
        const currentRequest = requestCount.current;

        // "Ver más" no vuelve a mostrar el esqueleto: las ventas ya cargadas siguen visibles.
        if (page > 1) setCargandoMas(true); else setIsLoading(true);
        try {
            const params = { ...parametrosVentas(), page, page_size: pageSize };
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
                if (page > 1) {
                    setVentas(prev => {
                        const vistos = new Set(prev.map(v => v.id));
                        return [...prev, ...fetchedVentas.filter(v => !vistos.has(v.id))];
                    });
                } else {
                    setVentas(fetchedVentas);
                }
                setTotalCount(response.data.count);
                setTotalPages(Math.ceil(response.data.count / pageSize) || 1);
                paginaCargada.current = page;
            } else {
                // Fallback for non-paginated response
                setVentas(fetchedVentas);
                setTotalCount(fetchedVentas.length || 0);
                setTotalPages(1);
            }
            if (currentRequest === requestCount.current) {
                setIsLoading(false);
                setCargandoMas(false);
            }
        } catch (error) {
            if (currentRequest === requestCount.current) {
                console.error('Error cargando ventas:', error);
                setNotification({ message: 'Error al cargar las ventas.', type: 'error' });
                setCargandoMas(false);
                if (page > 1) return; // se conservan las ya cargadas
                setVentas([]);
                setTotalCount(0);
                setTotalPages(1);
                setIsLoading(false);
            }
        }
    }, [parametrosVentas]);

    const fetchReportSales = useCallback(async () => {
        // Mismo patrón anti-carrera que fetchVentas (requestCount): sin esto, cambiar de
        // periodo varias veces rápido puede hacer que una respuesta vieja (de un periodo
        // ya abandonado) llegue después que la nueva y sobreescriba reportSales con datos
        // del periodo incorrecto — eso a su vez desincroniza el filtro de vendedores
        // (vendedoresActivos), que es justamente el síntoma reportado ("los filtros se
        // desconfiguran al cambiar de mes").
        reportRequestCount.current += 1;
        const currentRequest = reportRequestCount.current;
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
            if (!canSeeAll) {
                params.vendedor = usuario.id;
            }
            params.is_report = 'true';
            // Note: This might still fail if the dataset is huge, but it won't crash the main list
            const response = await API.get(`/ventas/`, { params });
            if (currentRequest !== reportRequestCount.current) return; // respuesta obsoleta, ignorar
            // If response is paginated, we might only get the first page.
            // Ideally, we need a summary endpoint. For now, we assume if it's paginated, we use results.
            const data = response.data.results || response.data;
            setReportSales(data || []);
        } catch (error) {
            if (currentRequest !== reportRequestCount.current) return;
            console.error('Error cargando ventas para el informe:', error);
            // Fail silently for the report, so the user can still see the list
            setReportSales([]);
        }
    }, [selectedDateFilter, usuario, canSeeAll]);

    // Effect for Filters (reset page to 1)
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, selectedDateFilter, vendedoresExcluidos, selectedEstados, selectedSedes, includeFeria]);

    // Effect for Page Change & Filter Changes (single unified trigger)
    useEffect(() => {
        fetchVentas(currentPage);
    }, [currentPage, fetchVentas]);

    useEffect(() => {
        fetchReportSales();
    }, [fetchReportSales]);

    useEffect(() => {
        if (isVendedoresError) {
            console.error('Error cargando vendedores:', vendedoresError);
        }
    }, [isVendedoresError, vendedoresError]);

    usePageRefresh(refetchVendedores);

    useEffect(() => {
        // 'anulada' (no 'anulado') — debe coincidir exactamente con Venta.ESTADO_CHOICES
        // en el backend, ya que este valor se manda tal cual al elegir "Anulado" en el
        // modal de edición (ver EditSaleModal.jsx) y al filtrar la lista.
        setEstados(["pendiente", "entregado", "anulada"]);
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

    const allSedeFiltersSelected = selectedSedes.length === sedesOptions.length && (!hasFeriaInPeriod || includeFeria);

    const selectAllSedes = () => {
        if (allSedeFiltersSelected) {
            setSelectedSedes([]);
            if (hasFeriaInPeriod) setIncludeFeria(false);
        } else {
            setSelectedSedes([...sedesOptions]);
            if (hasFeriaInPeriod) setIncludeFeria(true);
        }
    };

    // Cambiar el periodo vuelve a mostrar a todos los vendedores (sin esperar al informe).
    const togglePeriod = (periodVal) => {
        setVendedoresExcluidos([]);
        setSelectedDateFilter(prev => {
            const newPeriods = prev.periods.includes(periodVal)
                ? prev.periods.filter(p => p !== periodVal)
                : [...prev.periods, periodVal];
            return { ...prev, mode: 'months', periods: newPeriods };
        });
    };

    const selectAllPeriods = () => {
        setVendedoresExcluidos([]);
        setSelectedDateFilter(prev => {
            if (prev.periods.length === monthOptions.length) {
                return { ...prev, mode: 'months', periods: [] };
            } else {
                return { ...prev, mode: 'months', periods: monthOptions.map(o => o.value) };
            }
        });
    };

    const handleDateModeChange = (mode) => {
        setVendedoresExcluidos([]);
        setSelectedDateFilter(prev => ({ ...prev, mode }));
    };

    const handleStartDateChange = (e) => {
        setVendedoresExcluidos([]);
        setSelectedDateFilter(prev => ({ ...prev, startDate: e.target.value }));
    };

    const handleEndDateChange = (e) => {
        setVendedoresExcluidos([]);
        setSelectedDateFilter(prev => ({ ...prev, endDate: e.target.value }));
    };

    const toggleVendedor = (vendId) => {
        const id = String(vendId);
        setVendedoresExcluidos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const selectAllVendedores = () => {
        setVendedoresExcluidos(todosLosVendedores ? vendedoresActivos.map(v => String(v.id)) : []);
    };

    // --- Handlers ---
    const handleExpandVenta = async (ventaId) => {
        if (expandedVentaId === ventaId) {
            setExpandedVentaId(null);
            setVentaDetails(null);
            activeVentaIdRef.current = null;
            return;
        }

        activeVentaIdRef.current = ventaId;
        setExpandedVentaId(ventaId);
        setLoadingDetails(true);
        setDetailsError(null);
        setVentaDetails(null);
        setIsPartialData(false);

        try {
            // Fetch Details and Receipts in PARALLEL
            // We split this to avoid backend timeouts on heavy sales.
            const [detailsRes, recibosRes] = await Promise.allSettled([
                API.get(`/ventas/${ventaId}/`),
                API.get('/recibos-caja/', { params: { venta_id: ventaId, page_size: 50 } })
            ]);

            // El usuario pudo haber cambiado a otra venta mientras esto cargaba —
            // esta respuesta ya no corresponde a lo que se está mostrando.
            if (activeVentaIdRef.current !== ventaId) return;

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
            if (activeVentaIdRef.current !== ventaId) return;
            console.error('Critical error loading sale details:', error);
            setDetailsError('Error al cargar los detalles de la venta.');
        } finally {
            if (activeVentaIdRef.current === ventaId) {
                setLoadingDetails(false);
            }
        }
    };


    const refreshProductos = async (ventaId) => {
        const response = await API.get(`/ventas/${ventaId}/`);
        if (activeVentaIdRef.current === ventaId) setVentaDetails(prev => ({ ...prev, ...response.data }));
        // La fila de la lista refleja la gestión al finalizarla o reabrirla.
        const { gestion, estado_pedidos: estadoPedidos, valor_lista: valorLista } = response.data;
        setVentas(vs => vs.map(v => (v.id === ventaId ? { ...v, gestion, estado_pedidos: estadoPedidos, valor_lista: valorLista } : v)));
    };

    const refreshVentaDetails = async (ventaId) => {
        setLoadingDetails(true);
        setDetailsError(null);
        try {
            const response = await API.get(`/ventas/${ventaId}/`);
            if (activeVentaIdRef.current !== ventaId) return;
            setVentaDetails(response.data);
        } catch (error) {
            if (activeVentaIdRef.current !== ventaId) return;
            console.error('Error al refrescar detalles de la venta:', error);
            setDetailsError('Error al actualizar los detalles.');
        } finally {
            if (activeVentaIdRef.current === ventaId) {
                setLoadingDetails(false);
            }
        }
    };

    const handleExpandNestedOrder = async (orderId, initialDetalles = null) => {
        if (expandedNestedOrderId === orderId) {
            setExpandedNestedOrderId(null);
            setNestedOrderDetails(null);
            activeNestedOrderIdRef.current = null;
        } else {
            activeNestedOrderIdRef.current = orderId;
            setExpandedNestedOrderId(orderId);
            setNestedFabricOrders([]);
            const parsedInitial = Array.isArray(initialDetalles) ? initialDetalles : [];
            setNestedOrderDetails(parsedInitial);
            setLoadingNestedDetails(true);
            try {
                const response = await API.get(`/pedidos/${orderId}/detalles/`);
                if (activeNestedOrderIdRef.current !== orderId) return;
                let data = [];
                if (response.data && Array.isArray(response.data.detalles)) {
                    data = response.data.detalles;
                } else if (response.data && Array.isArray(response.data.results)) {
                    data = response.data.results;
                } else if (Array.isArray(response.data)) {
                    data = response.data;
                }
                setNestedFabricOrders(Array.isArray(response.data?.pedidos_telas) ? response.data.pedidos_telas : []);
                if (data && data.length > 0) {
                    setNestedOrderDetails(data);
                } else if (parsedInitial.length > 0) {
                    setNestedOrderDetails(parsedInitial);
                }
            } catch (error) {
                if (activeNestedOrderIdRef.current !== orderId) return;
                console.error('Error cargando detalles del pedido anidado:', error);
                if (parsedInitial.length > 0) {
                    setNestedOrderDetails(parsedInitial);
                }
            } finally {
                if (activeNestedOrderIdRef.current === orderId) {
                    setLoadingNestedDetails(false);
                }
            }
        }
    };

    

    // Tono del Badge del UI kit según el estado de la venta
    const estadoTone = (status) => {
        const e = (status || '').toLowerCase();
        if (['pagada', 'completada', 'entregada'].includes(e)) return 'success';
        if (['pendiente', 'en proceso'].includes(e)) return 'warning';
        if (['anulada', 'cancelada'].includes(e)) return 'danger';
        return 'neutral';
    };


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
            const observedVentaId = expandedVentaId;
            API.get(`/ventas/${observedVentaId}/`).then(response => {
                if (activeVentaIdRef.current !== observedVentaId) return;
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
            const observedVentaId = expandedVentaId;
            API.get(`/ventas/${observedVentaId}/`).then(response => {
                if (activeVentaIdRef.current !== observedVentaId) return;
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
                    friendlyError = mensajeDeError(error, friendlyError);
                }
            }
            setNotification({ message: friendlyError, type: 'error' });
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
                    friendlyError = mensajeDeError(error, friendlyError);
                }
            }
            setNotification({ message: friendlyError, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };


    const exportVentas = () => exportar(parametrosVentas());

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
        <div className="ds-page ventas-page ds-fade-in">
            <AppNotification
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ message: '', type: '' })}
            />
            <PageHeader
                icon={FaChartLine}
                title={formatReportTitle(selectedDateFilter)}
                subtitle="Gestión y seguimiento de las ventas registradas"
                actions={
                    <>
                        {usuario?.role?.toLowerCase() === 'administrador' && (
                            <Button variant="ghost" icon={FaFileExport} onClick={exportVentas} loading={exportando} disabled={isLoading || searchTerm !== debouncedSearchTerm} aria-label="Exportar Excel" title="Exportar Excel" />
                        )}
                        {usuario && (
                            <Button 
                                variant="secondary" 
                                icon={FaChartBar} 
                                onClick={() => setIsReportVisible(!isReportVisible)}
                                title={isReportVisible ? "Ocultar Estadísticas" : "Ver Estadísticas"}
                            >
                                <span className="long-text">{isReportVisible ? "Ocultar Estadísticas" : "Estadísticas"}</span>
                                <span className="short-text">Estad.</span>
                            </Button>
                        )}
                        {hasPermission('CREAR_VENTA') && (
                            <Button variant="primary" icon={FaPlus} onClick={() => navigate('/ventas/nueva')}>
                                <span className="long-text">Nueva Venta</span>
                                <span className="short-text">Nueva</span>
                            </Button>
                        )}
                    </>
                }
            />
            {usuario && isReportVisible && (
                <div className="sales-summary-report-wrapper expanded">
                    <div className="report-content-body">
                        <SalesSummaryReport
                            ventas={filteredReportSales}
                            vendedores={vendedoresActivos}
                            cuentaParticipante={cuentaParticipante}
                            selectedMonthYear={selectedDateFilter.mode === 'months' && selectedDateFilter.periods.length === 1 ? selectedDateFilter.periods[0] : 'all'}
                            formatCurrency={formatCurrency}
                            capitalizeEstado={capitalizeEstado}
                        />
                    </div>
                </div>
            )}

            <div className="ds-card ventas-filters">
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
                                        <div className="v-popover-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                                            <button 
                                                type="button" 
                                                style={{ flex: 1, padding: '0.5rem', background: 'none', border: 'none', borderBottom: selectedDateFilter.mode === 'months' ? '2px solid var(--primary)' : '2px solid transparent', color: selectedDateFilter.mode === 'months' ? 'var(--primary)' : '#72726a', fontWeight: selectedDateFilter.mode === 'months' ? '600' : '400', cursor: 'pointer' }}
                                                onClick={() => handleDateModeChange('months')}
                                            >
                                                Por Meses
                                            </button>
                                            <button 
                                                type="button" 
                                                style={{ flex: 1, padding: '0.5rem', background: 'none', border: 'none', borderBottom: selectedDateFilter.mode === 'range' ? '2px solid var(--primary)' : '2px solid transparent', color: selectedDateFilter.mode === 'range' ? 'var(--primary)' : '#72726a', fontWeight: selectedDateFilter.mode === 'range' ? '600' : '400', cursor: 'pointer' }}
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
                                                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Fecha de Inicio</label>
                                                    <input type="date" onClick={(e) => { try { e.target.showPicker(); } catch { /* navegador sin showPicker */ } }} className="v-date-input" value={selectedDateFilter.startDate} onChange={handleStartDateChange} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Fecha de Fin</label>
                                                    <input type="date" onClick={(e) => { try { e.target.showPicker(); } catch { /* navegador sin showPicker */ } }} className="v-date-input" value={selectedDateFilter.endDate} onChange={handleEndDateChange} />
                                                </div>
                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.25rem', lineHeight: '1.2' }}>
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
                                    className={`v-multi-select-btn ${(selectedSedes.length > 0 || (hasFeriaInPeriod && includeFeria)) ? 'active-filter' : ''} ${isSedesOpen ? 'open' : ''}`}
                                    onClick={() => setIsSedesOpen(prev => !prev)}
                                >
                                    <span>
                                        {selectedSedes.length === 0 && !(hasFeriaInPeriod && includeFeria)
                                            ? 'Sede: Ninguna'
                                            : allSedeFiltersSelected
                                                ? 'Sede: Todas'
                                                : `Sede: ${[...selectedSedes, ...(hasFeriaInPeriod && includeFeria ? ['Feria del Hogar'] : [])].join(', ')}`}
                                    </span>
                                    <FaChevronDown style={{ fontSize: '0.65rem', opacity: 0.7 }} />
                                </button>
                                {isSedesOpen && (
                                    <div className="v-multi-select-popover">
                                        <div className="v-popover-header">
                                            <span className="v-popover-title">Filtrar Sede</span>
                                            <button type="button" className="v-popover-action-btn" onClick={selectAllSedes}>
                                                {allSedeFiltersSelected ? 'Ninguna' : 'Todas'}
                                            </button>
                                        </div>
                                        {sedesOptions.map(s => (
                                            <label key={s} className="v-popover-item">
                                                <input type="checkbox" checked={selectedSedes.includes(s)} onChange={() => toggleSede(s)} />
                                                <span>{s}</span>
                                            </label>
                                        ))}
                                        {hasFeriaInPeriod && (
                                            <label className="v-popover-item">
                                                <input type="checkbox" checked={includeFeria} onChange={(e) => setIncludeFeria(e.target.checked)} />
                                                <span>Feria del Hogar</span>
                                            </label>
                                        )}
                                    </div>
                                )}
                            </div>

                            {canSeeAll && (
                                <div className="v-multi-select-container" ref={vendedoresRef}>
                                    <button
                                        type="button"
                                        className={`v-multi-select-btn ${selectedVendedores.length > 0 ? 'active-filter' : ''} ${isVendedoresOpen ? 'open' : ''}`}
                                        onClick={() => setIsVendedoresOpen(prev => !prev)}
                                    >
                                        <span>
                                            {todosLosVendedores
                                                ? 'Vendedor: Todos'
                                                : selectedVendedores.length === 0
                                                    ? 'Vendedor: Ninguno'
                                                    : `Vendedores (${selectedVendedores.length})`}
                                        </span>
                                        <FaChevronDown style={{ fontSize: '0.65rem', opacity: 0.7 }} />
                                    </button>
                                    {isVendedoresOpen && (
                                        <div className="v-multi-select-popover">
                                            <div className="v-popover-header">
                                                <span className="v-popover-title">Filtrar Vendedor</span>
                                                <button type="button" className="v-popover-action-btn" onClick={selectAllVendedores}>
                                                    {todosLosVendedores ? 'Ninguno' : 'Todos'}
                                                </button>
                                            </div>
                                            {vendedoresActivos.length === 0 ? (
                                                <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>No hay vendedores con ventas.</div>
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
            </div>

            <div className="ventas-container">
                {/* Total del conjunto filtrado (P08-08, U05) */}
                <div className="ds-totales-filtrados" role="status">
                    {filteredReportSales.length} ventas · <strong>{formatCurrency(totalFiltrado)}</strong>
                    {hayPartesCompartidas && <span className="ds-totales-filtrados__nota"> · ventas compartidas sumadas por partes</span>}
                </div>
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
                                        <th className="th-descuento" title="Descuento frente al valor de lista de esta venta">Dcto.</th>
                                    </>
                                )}
                                <th className="th-pedidos" title="Pendiente, atrasada o finalizada: finalizada = ya se pidió todo (productos y telas)">Gestión</th>
                                <th className="th-estado">Estado</th>
                                {puedeFacturar && <th className="th-facturado" title="Marca de facturación (Contabilidad)">Facturado</th>}
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
                                                <td className="td-descuento"><div className="skeleton skeleton-text" style={{ width: '45px' }} /></td>
                                            </>
                                        )}
                                        <td className="td-pedidos"><div className="skeleton skeleton-badge"></div></td>
                                        <td className="td-estado"><div className="skeleton skeleton-badge"></div></td>
                                        {puedeFacturar && <td className="td-facturado"><div className="skeleton skeleton-badge"></div></td>}
                                        <td className="td-accion"><div className="skeleton skeleton-text" style={{ width: '20px' }}></div></td>
                                    </tr>
                                ))
                            ) : ventas.length === 0 ? (
                                <tr>
                                    <td colSpan={(hasPermission('VER_PRECIOS_VENTA') ? 14 : 10) + (puedeFacturar ? 1 : 0)} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
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
                                                {venta.es_feria_hogar ? (
                                                    <span title="Venta de Feria del Hogar" style={{ fontWeight: 'bold', color: 'var(--blue-2)' }}>FH</span>
                                                ) : (
                                                    venta.sede === 'Lottus 1' ? '1' : venta.sede === 'Lottus 2' ? '2' : venta.sede
                                                )}
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
                                                    <td className="td-descuento" title={datosDescuento(venta) ? 'Descuento sobre el valor de lista' : 'Sin valor de lista para calcular el descuento'}>
                                                        {formatDescuento(datosDescuento(venta)?.porcentaje)}
                                                    </td>
                                                </>
                                            )}
                                            <td className="td-pedidos">
                                                {GESTION_BADGE[venta.gestion] && (
                                                    <Badge tone={GESTION_BADGE[venta.gestion][1]}>{GESTION_BADGE[venta.gestion][0]}</Badge>
                                                )}
                                            </td>
                                            <td className="td-estado">
                                                <Badge tone={estadoTone(venta.estado)}>
                                                    {capitalizeEstado(venta.estado)}
                                                </Badge>
                                            </td>
                                            {puedeFacturar && <td className="td-facturado" onClick={(e) => e.stopPropagation()}>
                                                <FacturadoVenta venta={venta} onCambio={marcarFacturada} onError={(message) => setNotification({ message, type: 'error' })} />
                                            </td>}
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
                                                <td colSpan={10 + (hasPermission('VER_PRECIOS_VENTA') ? 4 : 0) + (puedeFacturar ? 1 : 0)} className="expanded-row-content">
                                                    {loadingDetails ? (
                                                        <DetalleEsqueleto />
                                                    ) : detailsError ? (
                                                        <ErrorState message={detailsError} onRetry={() => handleExpandVenta(venta.id)} />
                                                    ) : ventaDetails ? (
                                                        <div className="venta-details-view">
                                                            {isPartialData && (
                                                                <div className="alert-warning" style={{ gridColumn: '1 / -1', marginBottom: '0', padding: '0.75rem', backgroundColor: 'var(--warning-soft)', border: '1px solid var(--warning-line)', borderRadius: '8px', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                    <strong>Atención:</strong> No se pudieron cargar los productos de esta venta debido a un problema de conexión, pero aquí están los pagos y observaciones recuperados.
                                                                </div>
                                                            )}

                                                            {/* Expediente de Venta: Cotización de Origen, Milestones y Líneas de Producto (P09-05, P09-06, U01) */}
                                                            <div className="details-full-width">
                                                                <ExpedienteVenta
                                                                    onActualizada={() => refreshProductos(ventaDetails.id)}
                                                                    venta={ventaDetails}
                                                                    hasPermission={hasPermission}
                                                                    formatCurrency={formatCurrency}
                                                                    formatShortDate={formatShortDate}
                                                                />
                                                            </div>

                                                            {/* Cliente Info */}
                                                            <div className="details-card cliente-info">
                                                                <h4>Información del Cliente</h4>
                                                                <div className="info-row">
                                                                    <span className="label">{nombreClienteLabel(ventaDetails.cliente)}:</span>
                                                                    <span className="value">{ventaDetails.cliente?.nombre || '—'}</span>
                                                                </div>
                                                                <div className="info-row">
                                                                    <span className="label">{documentoClienteLabel(ventaDetails.cliente)}:</span>
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
                                                                        <Button
                                                                            variant="primary"
                                                                            size="sm"
                                                                            icon={FaPlus}
                                                                            disabled={ventaDetails?.estado === 'anulada'}
                                                                            title={ventaDetails?.estado === 'anulada' ? 'No se pueden agregar pedidos a una venta anulada' : 'Agregar Pedido'}
                                                                            onClick={() => navigate('/ordenes/nuevo', { state: { ventaId: venta.id } })}
                                                                        >
                                                                            Agregar Pedido
                                                                        </Button>
                                                                        {(hasPermission('EDITAR_VENTA') || hasPermission('EDITAR_ESTADO_VENTA') || hasPermission('EDITAR_ESTADO_PEDIDOS_VENTA')) && (
                                                                            <Button variant="secondary" size="sm" icon={FaEdit} onClick={() => {
                                                                                setEditSaleData(ventaDetails);
                                                                                setShowEditSaleModal(true);
                                                                            }}>
                                                                                Editar Venta
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {ventaDetails.ordenes_pedido && ventaDetails.ordenes_pedido.length > 0 ? (
                                                                    <div className="orders-cards-container">
                                                                        {ventaDetails.ordenes_pedido.map((pedido) => (
                                                                            <div key={pedido.id} className={`order-card-v2 ${expandedNestedOrderId === pedido.id ? 'expanded' : ''}`}>
                                                                                <div className="order-card-v2-header" onClick={() => handleExpandNestedOrder(pedido.id, pedido.detalles)}>
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
                                                                                    <div className="oc-v2-section oc-v2-dest">
                                                                                        <span className="oc-v2-label">Exhibición</span>
                                                                                        <span className="oc-v2-value">
                                                                                            {pedido.es_exhibicion ? (
                                                                                                <span className="exh-badge exh-si" style={{ display: 'inline-block', padding: '0.2rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', background: 'var(--success-soft)', color: 'var(--success)' }}>Sí</span>
                                                                                            ) : (
                                                                                                <span className="exh-badge exh-no" style={{ display: 'inline-block', padding: '0.2rem 0.45rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', background: 'var(--gray-100)', color: 'var(--text-muted)' }}>No</span>
                                                                                            )}
                                                                                        </span>
                                                                                    </div>
                                                                                    {hasPermission('VER_COSTOS_ORDEN') && (
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
                                                                                                        <div className="product-item-v2" key={detalle.id || idx}>
                                                                                                            <div className="pi-qty">{detalle.cantidad}x</div>
                                                                                                            <div className="pi-details">
                                                                                                                <span className="pi-ref">{detalle.referencia_nombre || detalle.referencia || 'Producto'}{detalle.subcategoria_nombre ? ` · ${detalle.subcategoria_nombre}` : ''}</span>
                                                                                                                {detalle.especificaciones && <span className="pi-spec">{detalle.especificaciones}</span>}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))
                                                                                                ) : (
                                                                                                    <p className="text-muted m-0" style={{ fontSize: '0.85rem' }}>No hay productos en esta orden.</p>
                                                                                                )}
                                                                                            </div>
                                                                                        ) : <div className="error-message">Error al cargar productos.</div>}
                                                                                        {!loadingNestedDetails && (
                                                                                            <div className="nested-telas">
                                                                                                <span className="nested-telas__titulo"><FaScroll aria-hidden="true" /> Pedidos de tela</span>
                                                                                                {nestedFabricOrders.length === 0 ? (
                                                                                                    <p className="nested-telas__vacio">No hay pedidos de tela para esta orden.</p>
                                                                                                ) : nestedFabricOrders.map(pt => (
                                                                                                    <div key={pt.id} className="nested-tela">
                                                                                                        <div className="nested-tela__cabeza">
                                                                                                            <strong>PT #{pt.id}</strong>
                                                                                                            <span>{pt.proveedor}</span>
                                                                                                            {pt.fecha_creacion && <span className="nested-tela__fecha">{formatShortDate(pt.fecha_creacion)}</span>}
                                                                                                            <span className={`status-pill ${(pt.estado || '').toLowerCase().replace(/\s+/g, '-')}`}>{pt.estado}</span>
                                                                                                        </div>
                                                                                                        {pt.detalles.map((d, i) => (
                                                                                                            <div key={i} className="nested-tela__detalle">
                                                                                                                <span className="pi-qty">{Number(d.cantidad).toLocaleString('es-CO')}</span>
                                                                                                                <span>{d.tela}{d.observacion ? <small> · {d.observacion}</small> : null}</span>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                        {pt.observacion && <p className="nested-tela__obs">{pt.observacion}</p>}
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
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
                                        <span className="summary-id">
                                            #{venta.id}
                                            {venta.es_feria_hogar && (
                                                <span title="Venta de Feria del Hogar" style={{ marginLeft: '0.3rem', fontWeight: 'bold', color: 'var(--blue-2)' }}>FH</span>
                                            )}
                                        </span>
                                        <Badge tone={estadoTone(venta.estado)}>
                                            {capitalizeEstado(venta.estado)}
                                        </Badge>
                                    </div>
                                    <div className="summary-row-main">
                                        <h3 className="summary-vendor">{venta.vendedor_nombre || 'Vendedor no asignado'}</h3>
                                        <p className="summary-client-sub">{venta.cliente_nombre || (venta.cliente ? venta.cliente.nombre : 'Cliente Eliminado')}</p>
                                    </div>
                                    <div className="summary-row-bottom">
                                        <span className="summary-date">{formatShortDate(venta.fecha_venta)}</span>
                                        {puedeFacturar && <FacturadoVenta venta={venta} onCambio={marcarFacturada} onError={(message) => setNotification({ message, type: 'error' })} />}
                                        {hasPermission('VER_PRECIOS_VENTA') && (<>
                                            <span className="summary-total">{formatCurrency(venta.valor_total)}</span>
                                            <span className="summary-descuento">Dcto. {formatDescuento(datosDescuento(venta)?.porcentaje)}</span>
                                        </>)}
                                    </div>
                                    <div className="summary-expand-icon">
                                        <FaChevronDown />
                                    </div>
                                </div>

                                {/* Mobile Expanded Details */}
                                {expandedVentaId === venta.id && (
                                    <div className="mobile-sale-details">
                                        {loadingDetails ? (
                                            <DetalleEsqueleto />
                                        ) : detailsError ? (
                                            <div className="error-container-small">
                                                <p className="error-text">{detailsError}</p>
                                                <button className="btn-secondary btn-sm" onClick={() => refreshVentaDetails(venta.id)}>Reintentar</button>
                                            </div>
                                        ) : ventaDetails ? (
                                            <div className="mobile-details-content">
                                                {/* Expediente de Venta (P09-05, P09-06, U01) */}
                                                <ExpedienteVenta
                                                                    onActualizada={() => refreshProductos(ventaDetails.id)}
                                                    venta={ventaDetails}
                                                    hasPermission={hasPermission}
                                                    formatCurrency={formatCurrency}
                                                    formatShortDate={formatShortDate}
                                                />

                                                <div className="mobile-detail-section">
                                                    <h4>Información del Cliente</h4>
                                                    <div className="detail-grid">
                                                        <div className="detail-item full-width">
                                                            <span className="label">{nombreClienteLabel(ventaDetails.cliente)}</span>
                                                            <span className="value">{ventaDetails.cliente?.nombre || '—'}</span>
                                                        </div>
                                                        <div className="detail-item">
                                                            <span className="label">{documentoClienteLabel(ventaDetails.cliente)}</span>
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
                                                                    <Badge tone={estadoTone(op.estado)}>{capitalizeEstado(op.estado)}</Badge>
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
                {!isLoading && ventas.length > 0 && ventas.length < totalCount && (
                    <div className="ventas-ver-mas">
                        <span>Mostrando {ventas.length} de {totalCount} ventas</span>
                        <Button variant="secondary" onClick={() => fetchVentas(paginaCargada.current + 1)} disabled={cargandoMas}>
                            {cargandoMas ? 'Cargando…' : `Ver más ventas (${Math.min(pageSize, totalCount - ventas.length)})`}
                        </Button>
                    </div>
                )}
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
                            <button className="btn-danger-modal" onClick={() => handleDeleteObservacion('cliente')} disabled={isSubmittingObs} style={{ backgroundColor: '#a8432f', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
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
                            <button className="btn-danger-modal" onClick={() => handleDeleteObservacion('venta')} disabled={isSubmittingObs} style={{ backgroundColor: '#a8432f', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
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
                        usuario={usuario}
                    />
                )
            }

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
