import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { FaChevronDown, FaFileExport, FaPlus, FaSearch, FaEdit } from "react-icons/fa";
import Modal from '../components/Modal';
import AppNotification from '../components/AppNotification';
import EditSaleModal from '../components/EditSaleModal';
import RemisionModal from '../components/RemisionModal';
import SalesSummaryReport from '../components/SalesSummaryReport';
import './Ventas.css';
import '../components/Modal.css';
import '../components/AppNotification.css';

const Ventas = () => {
    const navigate = useNavigate();
    const [ventas, setVentas] = useState([]);
    const [reportSales, setReportSales] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [estados, setEstados] = useState([]);
    
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
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
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

        // Convertir el valor a string para asegurar el manejo de diferentes tipos de entrada
        let stringValue = String(value);

        // Eliminar todos los caracteres no numéricos (excepto el signo negativo si existe)
        // Esto convierte "8.645.555" o "8,645,555" en "8645555"
        const cleanedString = stringValue.replace(/[^0-9-]/g, '');

        // Convertir a entero. parseInt es adecuado ya que queremos solo números enteros.
        const num = parseInt(cleanedString, 10);

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
        return options.reverse(); // Reverse to show most recent first
    };

    const monthOptions = generateMonthOptions();

    const fetchVentas = useCallback(async () => {
        setIsLoading(true);
        const token = localStorage.getItem("accessToken");
        try {
            const params = {};
            if (searchTerm) {
                params.search = searchTerm;
            } else {
                const [month, year] = selectedMonthYear.split('-');
                params.month = month;
                params.year = year;
                params.vendedor = selectedVendedor;
                params.estado = selectedEstado;
            }
            const response = await axios.get('http://127.0.0.1:8000/api/ventas/', { headers: { Authorization: `Bearer ${token}` }, params });
            const sortedVentas = response.data.sort((a, b) => b.id_venta - a.id_venta);
            setVentas(sortedVentas || []);
        } catch (error) {
            console.error('Error cargando ventas:', error);
            setNotification({ message: 'Error al cargar las ventas.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, selectedMonthYear, selectedVendedor, selectedEstado, setNotification]);

    const fetchReportSales = useCallback(async () => {
        const token = localStorage.getItem("accessToken");
        try {
            const [month, year] = selectedMonthYear.split('-');
            const params = { month, year };
            const response = await axios.get('http://127.0.0.1:8000/api/ventas/', { headers: { Authorization: `Bearer ${token}` }, params });
            setReportSales(response.data || []);
        } catch (error) {
            console.error('Error cargando ventas para el informe:', error);
        }
    }, [selectedMonthYear]);

    useEffect(() => {
        fetchVentas();
    }, [fetchVentas]);

    useEffect(() => {
        fetchReportSales();
    }, [fetchReportSales]);

    useEffect(() => {
        const fetchVendedores = async () => {
            const token = localStorage.getItem("accessToken");
            try {
                const response = await axios.get('http://127.0.0.1:8000/api/vendedores/', { headers: { Authorization: `Bearer ${token}` } });
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
            const token = localStorage.getItem("accessToken");
            try {
                const response = await axios.get(`http://127.0.0.1:8000/api/ventas/${ventaId}/`, { headers: { Authorization: `Bearer ${token}` } });
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
        const token = localStorage.getItem("accessToken");
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/ventas/${ventaId}/`, { headers: { Authorization: `Bearer ${token}` } });
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
            const token = localStorage.getItem("accessToken");
            try {
                const response = await axios.get(`http://127.0.0.1:8000/api/detalles-pedido/${orderId}/`, { headers: { Authorization: `Bearer ${token}` } });
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
        const token = localStorage.getItem("accessToken");
        const id = tipo === 'cliente' ? ventaDetails.cliente.id : expandedVentaId;
        const url = `http://127.0.0.1:8000/api/${tipo === 'cliente' ? 'clientes' : 'ventas'}/${id}/observaciones/`;
        const texto = tipo === 'cliente' ? observacionClienteText : observacionVentaText;

        if (!texto) {
            setNotification({ message: 'La observación no puede estar vacía.', type: 'error' });
            return;
        }

        try {
            await axios.post(url, { texto }, { headers: { Authorization: `Bearer ${token}` } });
            setNotification({ message: 'Observación añadida correctamente.', type: 'success' });
            console.log('Notification set to success:', { message: 'Observación añadida correctamente.', type: 'success' });
            // Re-fetch venta details to show new observacion without closing the expanded view
            const response = await axios.get(`http://127.0.0.1:8000/api/ventas/${expandedVentaId}/`, { headers: { Authorization: `Bearer ${token}` } });
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
        const token = localStorage.getItem("accessToken");
        try {
            await axios.post(`http://127.0.0.1:8000/api/ventas/${expandedVentaId}/remisiones/`, remisionData, {
                headers: { Authorization: `Bearer ${token}` },
            });
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

    return (
        <div className="page-container">
            <AppNotification
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ message: '', type: '' })}
            />
            <SalesSummaryReport
                ventas={reportSales}
                vendedores={vendedores}
                selectedMonthYear={selectedMonthYear}
                formatCurrency={formatCurrency}
                capitalizeEstado={capitalizeEstado}
            />
      
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
                    <select value={selectedVendedor} onChange={(e) => {setSelectedVendedor(e.target.value);}}>
                        <option value="">Todos los vendedores</option>
                        {vendedores.map(vendedor => (
                            <option key={vendedor.id} value={vendedor.id}>{vendedor.first_name}</option>
                        ))}
                    </select>
                </div>
                <div className="actions-group">
                    <button className="btn-secondary"><FaFileExport /> Exportar</button>
                    <button className="btn-primary" onClick={() => navigate('/nuevaVenta')}><FaPlus /> Nueva Venta</button>
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
                            <th className="th-estado">Pedido</th>
                            <th className="th-estado">Estado</th>
                            <th className="th-accion"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="10"><div className="loading-container"><div className="loader"></div></div></td></tr>
                        ) : ventas.length > 0 ? (
                            ventas.map((venta) => (
                                <React.Fragment key={venta.id_venta}>
                                    <tr>
                                        <td className="td-oc">{venta.id_venta}</td>
                                        <td className="td-fecha">{formatShortDate(venta.fecha_venta)}</td>
                                        <td className="td-fecha">{formatShortDate(venta.fecha_entrega)}</td>
                                        <td className="td-vendedor">{venta.vendedor}</td>
                                        <td className="td-cliente">{venta.cliente}</td>
                                        <td className="td-valor">{formatCurrency(venta.abono)}</td>
                                        <td className="td-valor">{formatCurrency(venta.saldo)}</td>
                                        <td className="td-valor td-valor-total">{formatCurrency(venta.valor)}</td>
                                        <td className="td-estado"><span className={`status-badge ${getStatusClass(venta.pedido)}`}>{venta.pedido}</span></td>
                                        <td className="td-estado">{venta.estado ? <span className={`status-badge ${getStatusClass(venta.estado)}`}>{capitalizeEstado(venta.estado)}</span> : ''}</td>
                                        <td className="td-accion">
                                            <button className="btn-icon" onClick={() => handleExpandVenta(venta.id_venta)}>
                                                <FaChevronDown style={{ transform: expandedVentaId === venta.id_venta ? 'rotate(180deg)' : 'none' }} />
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedVentaId === venta.id_venta && (
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
                                                            <button className="btn-primary" onClick={() => { setShowEditSaleModal(true); setEditSaleData(ventaDetails); }}><FaEdit /> Editar Venta</button>
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
                            <tr><td colSpan="10" className="empty-cell">No hay ventas para mostrar.</td></tr>
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
                    show={showEditSaleModal}
                    onClose={() => setShowEditSaleModal(false)}
                    saleData={editSaleData}
                    vendedores={vendedores}
                    estados={estados}
                    onSaleUpdated={refreshVentaDetails} // Re-fetch current sale details
                    setNotification={setNotification}
                    fetchVentas={fetchVentas}
                />
            )}

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