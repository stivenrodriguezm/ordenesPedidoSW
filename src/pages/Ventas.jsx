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
import '../components/Modal.css';
import '../components/AppNotification.css';

const Ventas = () => {
    const { fetchClientes, usuario } = useContext(AppContext);
    const navigate = useNavigate();
    const [ventas, setVentas] = useState([]);
    const [reportSales, setReportSales] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [estados, setEstados] = useState([]);
    const [isReportVisible, setIsReportVisible] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
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

    const fetchVentas = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {};
            if (searchTerm) {
                params.search = searchTerm;
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
            const sortedVentas = response.data.sort((a, b) => b.id - a.id);
            setVentas(sortedVentas || []);
        } catch (error) {
            console.error('Error cargando ventas:', error);
            setNotification({ message: 'Error al cargar las ventas.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, selectedMonthYear, selectedVendedor, selectedEstado, setNotification, usuario]);

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
            const response = await API.get(`/ventas/`, { params });
            setReportSales(response.data || []);
        } catch (error) {
            console.error('Error cargando ventas para el informe:', error);
        }
    }, [selectedMonthYear, usuario]);

    useEffect(() => {
        fetchVentas();
    }, [fetchVentas]);

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
        } else {
            setExpandedVentaId(ventaId);
            setExpandedNestedOrderId(null); // Reset nested view
            setLoadingDetails(true);
            try {
                const response = await API.get(`/ventas/${ventaId}/`);
                setVentaDetails(response.data);
                console.log('Venta Details Response:', response.data);
                console.log('ventaDetails.cliente:', ventaDetails.cliente);
            } catch (error) {
                console.error('Error al obtener detalles de la venta:', error);
            } finally {
                setLoadingDetails(false);
            }
        }
    };

    const refreshVentaDetails = async (ventaId) => {
        setLoadingDetails(true);
        try {
            const response = await API.get(`/ventas/${ventaId}/`);
            setVentaDetails(response.data);
        } catch (error) {
            console.error('Error al refrescar detalles de la venta:', error);
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
                         <input type="text" className="search-input" placeholder="Buscar por Cliente o OC..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value);}} />
                         <FaSearch className="search-icon" />
                    </div>
                    <select value={selectedMonthYear} onChange={(e) => {setSelectedMonthYear(e.target.value);}}>
                        {monthOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <select value={selectedEstado} onChange={(e) => {setSelectedEstado(e.target.value);}}>
                        <option value="">Todos los estados</option>
                        {estados.map(e => <option key={e} value={e}>{capitalizeEstado(e)}</option>)}
                    </select>
                    {(usuario?.role.toLowerCase() === 'administrador' || usuario?.role.toLowerCase() === 'auxiliar') && (
                        <select value={selectedVendedor} onChange={(e) => {setSelectedVendedor(e.target.value);}}>
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

            <div className="table-container">
                <table className="data-table ventas-table">
                    <thead>
                        <tr>
                            <th className="th-oc">O.C.</th>
                            <th className="th-fecha">F. Venta</th>
                            <th className="th-fecha">F. Entrega</th>
                            <th className="th-vendedor">Vendedor</th>
                            <th className="th-cliente">Cliente</th>
                            <th className="th-valor">Abono</th>
                            <th className="th-valor">Saldo</th>
                            <th className="th-valor">Valor</th>
                            <th className="th-pedidos">PEDIDOS</th>
                            <th className="th-estado">Estado</th>
                            <th className="th-accion"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="11"><div className="loading-container"><div className="loader"></div></div></td></tr>
                        ) : ventas.length > 0 ? (
                            ventas.map((venta) => (
                                <React.Fragment key={venta.id}>
                                    <tr>
                                        <td className="td-oc">{venta.id}</td>
                                        <td className="td-fecha">{formatShortDate(venta.fecha_venta)}</td>
                                        <td className="td-fecha">{formatShortDate(venta.fecha_entrega)}</td>
                                        <td className="td-vendedor">{venta.vendedor_nombre}</td>
                                        <td className="td-cliente">{venta.cliente_nombre}</td>
                                        <td className="td-valor">{formatCurrency(venta.abono)}</td>
                                        <td className="td-valor">{formatCurrency(venta.saldo)}</td>
                                        <td className="td-valor td-valor-total">{formatCurrency(venta.valor_total)}</td>
                                        <td className="td-pedidos">
                                            <span className={`status-badge ${venta.estado_pedidos ? 'pedido-realizado' : 'pedido-pendiente'}`}>
                                                {venta.estado_pedidos ? 'Pedido' : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="td-estado">{venta.estado ? <span className={`status-badge ${getStatusClass(venta.estado)}`}>{capitalizeEstado(venta.estado)}</span> : ''}</td>
                                        <td className="td-accion">
                                            <button className="btn-icon" onClick={() => handleExpandVenta(venta.id)}>
                                                <FaChevronDown style={{ transform: expandedVentaId === venta.id ? 'rotate(180deg)' : 'none' }} />
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedVentaId === venta.id && (
                                        <tr className="expanded-row">
                                            <td colSpan="11">
                                                {loadingDetails ? (
                                                    <div className="loading-container"><div className="loader"></div></div>
                                                ) : ventaDetails ? (
                                                    <div className="venta-details-view">
                                                        <div className="details-card cliente-info">
                                                          <h4>Datos del Cliente</h4>
                                                          <div className="cliente-data-grid">
                                                            <p><strong>Nombre:</strong> {ventaDetails.cliente?.nombre || 'N/A'}</p>
                                                            <p><strong>Cédula:</strong> {ventaDetails.cliente?.cedula || 'N/A'}</p>
                                                            <p><strong>Correo:</strong> {ventaDetails.cliente?.correo || 'N/A'}</p>
                                                            <p><strong>Teléfono 1:</strong> {ventaDetails.cliente?.telefono1 || 'N/A'}</p>
                                                            <p><strong>Teléfono 2:</strong> {ventaDetails.cliente?.telefono2 || 'N/A'}</p>
                                                            <p><strong>Dirección:</strong> {ventaDetails.cliente?.direccion || 'N/A'}</p>
                                                          </div>
                                                        </div>
                                                        <div className="pagos-remisiones-wrapper">
                                                            <div className="pagos-remisiones-group-wrapper">
                                                            <div className="details-card observaciones-cliente">
                                                                <div className="observaciones-header">
                                                                    <h4>Pagos</h4>
                                                                </div>
                                                                <ul>
                                                                    {ventaDetails.recibos.length > 0 ? ventaDetails.recibos.map(r =>
                                                                        <li key={r.id}>RC{r.id}: {formatCurrency(r.valor)} ({r.metodo_pago}) - {r.estado === 'Confirmado' ? 'Confirmado' : 'Por confirmar'} {formatShortDate(r.fecha)}</li>
                                                                    ) : <li>No hay pagos registrados.</li>}
                                                                </ul>
                                                            </div>
                                                            <div className="details-card observaciones-cliente">
                                                                <div className="observaciones-header">
                                                                    <h4>Remisiones</h4>
                                                                    <button className="btn-icon" onClick={() => setShowRemisionModal(true)}><FaPlus /></button>
                                                                </div>
                                                                <ul>
                                                                    {ventaDetails.remisiones.length > 0 ? ventaDetails.remisiones.map(r =>
                                                                        <li key={r.codigo}>{r.codigo} - {formatShortDate(r.fecha)}</li>
                                                                    ) : <li>No hay remisiones registradas.</li>}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                        </div>
                                                        <div className="observaciones-wrapper">
                                                            <div className="details-card observaciones-cliente">
                                                              <div className="observaciones-header">
                                                                <h4>Observaciones Cliente</h4>
                                                                <button className="btn-icon" onClick={() => setShowObservacionClienteModal(true)}><FaPlus /></button>
                                                              </div>
                                                              <ul>{(ventaDetails.cliente.observaciones || []).length > 0 ? ventaDetails.cliente.observaciones.map(o => <li key={o.id}>{o.texto}</li>) : <li>No hay.</li>}</ul>
                                                            </div>
                                                            <div className="details-card observaciones-venta">
                                                              <div className="observaciones-header">
                                                                <h4>Observaciones Venta</h4>
                                                                <button className="btn-icon" onClick={() => setShowObservacionVentaModal(true)}><FaPlus /></button>
                                                              </div>
                                                              <ul>{(ventaDetails.observaciones_venta || []).length > 0 ? ventaDetails.observaciones_venta.map(o => <li key={o.id}>{o.texto}</li>) : <li>No hay.</li>}</ul>
                                                            </div>
                                                        </div>
                                                        <div className="details-card pedidos-info">
                                                          <div className="pedidos-header">
                                                            <h4>Órdenes de Pedido Asociadas</h4>
                                                            {(usuario?.role.toLowerCase() === 'administrador' || usuario?.role.toLowerCase() === 'auxiliar') && (
                                                              <button className="btn-primary" onClick={() => { setShowEditSaleModal(true); setEditSaleData(ventaDetails); }}><FaEdit /> Editar Venta</button>
                                                            )}
                                                          </div>
                                                           <table className="data-table nested-ordenes-table">
                                                              <thead>
                                                                  <tr>
                                                                      <th>O.P.</th>
                                                                      <th>Proveedor</th>
                                                                      <th>F. Pedido</th>
                                                                      <th>F. Llegada</th>
                                                                      <th>Tela</th>
                                                                      <th>Estado</th>
                                                                      <th>Observación</th>
                                                                      <th></th>
                                                                  </tr>
                                                              </thead>
                                                              <tbody>
                                                                {ventaDetails.ordenes_pedido.length > 0 ? ventaDetails.ordenes_pedido.map(op => (
                                                                    <React.Fragment key={`nested-op-${op.id}`}>
                                                                        <tr>
                                                                            <td>{op.id}</td>
                                                                            <td>{op.proveedor_nombre}</td>
                                                                            <td>{formatDate(op.fecha_pedido)}</td>
                                                                            <td>{formatDate(op.fecha_esperada)}</td>
                                                                            <td><span className={`status-badge ${getStatusClass(op.tela)}`}>{op.tela}</span></td>
                                                                            <td><span className={`status-badge ${getStatusClass(op.estado)}`}>{capitalizeEstado(op.estado)}</span></td>
                                                                            <td>{op.observacion || 'N/A'}</td>
                                                                            <td className="td-accion">
                                                                                <button className="btn-icon" onClick={() => handleExpandNestedOrder(op.id)}>
                                                                                    <FaChevronDown style={{ transform: expandedNestedOrderId === op.id ? 'rotate(180deg)' : 'none' }} />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                        {expandedNestedOrderId === op.id && (
                                                                            <tr className="nested-expanded-row">
                                                                                <td colSpan="8">
                                                                                    {loadingNestedDetails ? <div className="loading-container-small"><div className="loader"></div></div>
                                                                                    : nestedOrderDetails ? (
                                                                                        <div className="nested-order-preview">
                                                                                            <h5>Productos del Pedido #{op.id}</h5>
                                                                                            <ul>
                                                                                                {nestedOrderDetails.map((det, i) => (
                                                                                                    <li key={i}>{det.cantidad}x {det.referencia} - {det.especificaciones}</li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        </div>
                                                                                    ) : <div className="error-cell">No se encontraron detalles.</div>}
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </React.Fragment>
                                                                )) : <tr><td colSpan="8" className="empty-cell">No hay órdenes asociadas.</td></tr>}
                                                              </tbody>
                                                          </table>
                                                        </div>
                                                    </div>
                                                ) : <div className="error-cell">No se pudieron cargar los detalles.</div> }
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        ) : (
                            <tr><td colSpan="11" className="empty-cell">No hay ventas para mostrar.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            
        <Modal
                show={showObservacionClienteModal}
                onClose={() => setShowObservacionClienteModal(false)}
                title="Agregar Observación al Cliente"
            >
                <textarea
                    value={observacionClienteText}
                    onChange={(e) => setObservacionClienteText(e.target.value)}
                    placeholder="Escribe la observación para el cliente..."
                ></textarea>
                <button onClick={() => handleAddObservacion('cliente')}>Guardar Observación</button>
            </Modal>

            <Modal
                show={showObservacionVentaModal}
                onClose={() => setShowObservacionVentaModal(false)}
                title="Agregar Observación a la Venta"
            >
                <textarea
                    value={observacionVentaText}
                    onChange={(e) => setObservacionVentaText(e.target.value)}
                    placeholder="Escribe la observación para la venta..."
                ></textarea>
                <button onClick={() => handleAddObservacion('venta')}>Guardar Observación</button>
            </Modal>

            {editSaleData && (
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
                    fetchClientes={fetchClientes}
                    usuario={usuario}
                />
            )}
            {console.log('Usuario en Ventas.jsx:', usuario)}
            {console.log('Usuario en Ventas.jsx:', usuario)}

            <RemisionModal
                isOpen={showRemisionModal}
                onClose={() => setShowRemisionModal(false)}
                onSave={handleAddRemision}
                isLoading={isLoading}
            />
        </div>
    );
};

export default Ventas;