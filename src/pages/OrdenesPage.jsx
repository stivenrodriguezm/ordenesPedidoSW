import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { FaChevronDown, FaFileExport, FaPlus, FaEdit } from 'react-icons/fa';
import './OrdenesPage.css';
import { AppContext, usePermissions } from '../AppContext';
import AppNotification from '../components/AppNotification';
import CrearPedidoTelaModal from '../components/CrearPedidoTelaModal';
import API from '../services/api';
import logoFinal from '../assets/logoFinal.png';

// El componente OrdenModal no necesita cambios. Se deja por contexto.
const OrdenModal = ({ isOpen, onClose, onSave, orden, telas, estados, isLoading, userRole }) => {
  const hasPermission = usePermissions();
  const [formState, setFormState] = useState({ costo: '', estado: '', tela: '' });

  const canEditEstado = hasPermission('EDITAR_ESTADO_ORDEN') || userRole === 'administrador' || userRole === 'auxiliar';
  const canEditTela = hasPermission('EDITAR_ESTADO_TELA_ORDEN') || userRole === 'vendedor' || userRole === 'administrador' || userRole === 'auxiliar';
  const canEditCosto = hasPermission('VER_COSTOS_ORDEN') && (userRole === 'administrador' || userRole === 'auxiliar');

  const telaLockedForVendedor = userRole === 'vendedor' && orden?.tela === 'En fabrica';

  useEffect(() => {
    if (orden) {
      const cleanedCosto = parseFloat(orden.costo);
      setFormState({
        costo: isNaN(cleanedCosto) ? '' : cleanedCosto,
        estado: orden.estado || '',
        tela: orden.tela || ''
      });
    }
  }, [orden, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {};
    if (canEditCosto) payload.costo = formState.costo;
    if (canEditEstado) payload.estado = formState.estado;
    if (canEditTela) payload.tela = formState.tela;
    onSave(orden.id, payload);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content edit-order-modal">
        <div className="modal-header">
          <h3>Actualizar Pedido O.P. #{orden.id}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          {canEditCosto && (
            <div className="form-group">
              <label>COSTO DEL PEDIDO</label>
              <input
                type="number"
                name="costo"
                value={formState.costo}
                onChange={handleChange}
                placeholder="0"
                step="any"
              />
            </div>
          )}
          {canEditEstado && (
            <div className="form-group">
              <label>Estado del Pedido</label>
              <select name="estado" value={formState.estado} onChange={handleChange}>
                {estados.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
          )}
          {canEditTela && (
            <div className="form-group">
              <label>Estado de Tela</label>
              <select
                name="tela"
                value={formState.tela}
                onChange={handleChange}
                disabled={telaLockedForVendedor}
                style={telaLockedForVendedor ? { backgroundColor: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed', opacity: 0.7 } : {}}
              >
                {telas.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {telaLockedForVendedor && (
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.4rem', fontStyle: 'italic' }}>
                  🔒 No se puede modificar el estado de tela cuando ya está "En fabrica".
                </p>
              )}
            </div>
          )}
          <button type="submit" className="modal-submit" disabled={isLoading || (canEditTela && !canEditEstado && telaLockedForVendedor)}>
            {isLoading ? 'Actualizando...' : 'Actualizar Pedido'}
          </button>
        </form>
      </div>
    </div>
  );
};


// Componente principal con las correcciones
const OrdenesPage = () => {
  const { proveedores, usuario: user, isLoadingProveedores } = useContext(AppContext);
  const hasPermission = usePermissions();
  const navigate = useNavigate();

  const [filteredOrdenes, setFilteredOrdenes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [selectedProveedor, setSelectedProveedor] = useState('');
  const [selectedVendedor, setSelectedVendedor] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('en_proceso');
  const [selectedExhibicion, setSelectedExhibicion] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [orderTelas, setOrderTelas] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [mostrarBuscador, setMostrarBuscador] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const showNotification = (message, type = 'success') => {
      setNotification({ message, type });
  };

  const [isLoading, setIsLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isTelaModalOpen, setIsTelaModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentOrder, setCurrentOrder] = useState(null);

  // --- PASO 1: AÑADIR NUEVO ESTADO PARA LA ACTUALIZACIÓN ---
  const [isUpdating, setIsUpdating] = useState(false);
  const [telaEstadoModal, setTelaEstadoModal] = useState({ open: false, pedidoId: null, currentEstado: '', newEstado: '' });


  const token = localStorage.getItem('accessToken');

  const estados = [
    { value: '', label: 'Todos' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'recibido', label: 'Recibido' },
    { value: 'anulado', label: 'Anulado' },
  ];

  const modalEstados = [
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'recibido', label: 'Recibido' },
    { value: 'anulado', label: 'Anulado' },
  ];
  const telas = ['Por pedir', 'Pedida', 'En fabrica', 'Sin tela'];

  // ... (el resto de funciones como formatDate, formatNumber, etc., no cambian)
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    // Parsear la cadena YYYY-MM-DD como fecha local
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month - 1 porque los meses son 0-indexados

    const formattedDay = String(date.getDate()).padStart(2, '0');
    const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const formattedMonth = monthNames[date.getMonth()];
    const formattedYear = date.getFullYear();
    return `${formattedDay}-${formattedMonth}-${formattedYear}`;
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '$0';
    const num = parseFloat(String(value).replace(/[^0-9.]/g, '')); // Permite decimales y limpia no-números
    if (isNaN(num)) {
      return '$0';
    }
    return `${num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const capitalizeEstado = (estado) => {
    if (!estado) return '';
    return estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  useEffect(() => {
    const fetchVendedores = async () => {
      try {
        const response = await API.get('vendedores/');
        setVendedores(response.data.filter(v => v.first_name && v.first_name.trim() !== ''));
      } catch (error) {
        setErrorMessage('Error al cargar los vendedores.');
      }
    };
    fetchVendedores();
  }, [token]);

  useEffect(() => {
    if (!user) return;

    const fetchOrdenes = async () => {
      setIsLoading(true);
      try {
        const params = {
          id_proveedor: selectedProveedor,
          id_vendedor: selectedVendedor,
          estado: selectedEstado,
          es_exhibicion: selectedExhibicion,
          ordering: '-id',
        };

        Object.keys(params).forEach(key => !params[key] && delete params[key]);

        const response = await API.get(`/listar-pedidos/`, {
          params
        });

        let fetchedOrdenes = Array.isArray(response.data.results) ? response.data.results : (Array.isArray(response.data) ? response.data : []);

        setFilteredOrdenes(fetchedOrdenes);

      } catch (error) {
        setErrorMessage('Error al cargar las órdenes.');
        setFilteredOrdenes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrdenes();
  }, [selectedProveedor, selectedVendedor, selectedEstado, selectedExhibicion, token, user]);



  const handleExpandOrder = async (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      setOrderTelas([]);
      return;
    }
    setExpandedOrderId(orderId);
    setLoadingDetails(true);
    setOrderDetails(null); // Reset details on new expand
    setOrderTelas([]);    // Reset telas on new expand
    setErrorMessage(''); // Reset error message
    try {
      const response = await API.get(`pedidos/${orderId}/detalles/`);
      let data = [];
      if (response.data.detalles && Array.isArray(response.data.detalles)) {
        data = response.data.detalles;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      }
      setOrderDetails(data);
      setOrderTelas(Array.isArray(response.data.pedidos_telas) ? response.data.pedidos_telas : []);
    } catch (error) {
      console.error("Error fetching order details:", error);
      const errorMsg = error.response?.data?.error || 'Error al cargar los detalles del pedido.';
      setErrorMessage(errorMsg);
      console.error(error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openEditModal = (orden) => {
    setCurrentOrder(orden);
    setIsEditModalOpen(true);
  };

  // --- PASO 2: MODIFICAR LA FUNCIÓN DE ACTUALIZACIÓN ---
  const handleActualizarPedido = async (id, formData) => {
    setIsUpdating(true); // Inicia el estado de carga
    setErrorMessage(''); // Limpia errores previos
    const updates = {
      costo: formData.costo,
      estado: formData.estado,
      tela: formData.tela
    };
    try {
      await API.patch(`ordenes-pedido/${id}/`, updates);
      setFilteredOrdenes(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
      setIsEditModalOpen(false); // Cierra el modal en caso de éxito
    } catch (error) {
      setErrorMessage('Error al actualizar el pedido.');
    } finally {
      setIsUpdating(false); // Finaliza el estado de carga
    }
  };

  // --- Helpers para editar estado de PedidoTela desde /ordenes ---
  const canEditTelaEstado = (currentEstado) => {
    if (!hasPermission('EDITAR_ESTADO_TELA_ORDEN')) return false;
    // Si el usuario es super admin o ADMIN_MODERACION (quizás tenga un override especial), 
    // pero según las reglas, nadie puede editar si está "En fabrica" a menos que queramos
    return currentEstado !== 'En fabrica';
  };

  const handleSaveTelaEstado = async () => {
    if (!telaEstadoModal.newEstado) return;
    try {
      const response = await API.patch(`pedidos-telas/${telaEstadoModal.pedidoId}/`, { estado: telaEstadoModal.newEstado });
      // Update orderTelas state locally
      setOrderTelas(prev => prev.map(pt =>
        pt.id === telaEstadoModal.pedidoId ? { ...pt, estado: response.data.estado } : pt
      ));
      setTelaEstadoModal({ open: false, pedidoId: null, currentEstado: '', newEstado: '' });
    } catch (error) {
      showNotification(error.response?.data?.error || 'Error al actualizar el estado.', 'error');
    }
  };

  const formatCurrencyForExport = (value) => {
    if (value === null || value === undefined) return null;
    const num = parseFloat(String(value).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? null : num;
  };

  const exportOrdenes = () => {
    const dataToExport = filteredOrdenes.map(orden => {
      const data = {
        'O.P.': orden.id,
        'Proveedor': orden.proveedor_nombre,
        'Vendedor': orden.vendedor,
        'Venta': orden.venta || orden.orden_venta,
        'F. Pedido': formatDate(orden.fecha_pedido),
        'F. Llegada': formatDate(orden.fecha_esperada),
        'Tela': orden.tela,
        'Estado': getEstadoText(orden.estado, orden.fecha_esperada),
        'Observación': orden.observacion,
      };
      if (hasPermission('VER_COSTOS_ORDEN')) {
        data['Costo'] = formatCurrencyForExport(orden.costo);
      }
      return data;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ordenes');
    XLSX.writeFile(wb, 'Ordenes.xlsx');
  };
  // Parsea cualquier formato de fecha (YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS, ISO, etc.)
  // como fecha LOCAL y devuelve true si es ESTRICTAMENTE anterior a hoy.
  const isOverdue = (fechaStr) => {
    if (!fechaStr) return false;
    // Toma solo los primeros 10 caracteres → siempre "YYYY-MM-DD"
    const dateOnly = String(fechaStr).slice(0, 10);
    const parts = dateOnly.split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return false;
    const [year, month, day] = parts;
    const fecha = new Date(year, month - 1, day); // medianoche local
    const today = new Date();
    today.setHours(0, 0, 0, 0);                   // medianoche local de hoy
    return fecha < today;                           // true solo si es ANTES de hoy
  };

  const getEstadoClass = (estado, fechaEsperada) => {
    if (estado === 'en_proceso' || estado === 'pendiente') {
      return isOverdue(fechaEsperada) ? 'atrasado' : 'en-proceso';
    }
    return estado;
  };

  const getEstadoText = (estado, fechaEsperada) => {
    if (estado === 'en_proceso' || estado === 'pendiente') {
      return isOverdue(fechaEsperada) ? 'Atrasado' : 'Pendiente';
    }
    return capitalizeEstado(estado);
  };
  const getTelaClass = (tela) => tela?.toLowerCase().replace(/ /g, '-') || 'default';


  return (
    <div className="page-container">
      {/* ... (código JSX sin cambios hasta el modal) ... */}
      <div className="o-glass-header" style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', overflowX: 'auto' }}>
        <div className="o-filters-bar" style={{ margin: 0, flex: 1 }}>
          <div className="o-select-pill">
            <select value={selectedProveedor} onChange={(e) => { setSelectedProveedor(e.target.value); }} disabled={isLoadingProveedores}>
              <option value="">{isLoadingProveedores ? "Cargando proveedores..." : "Proveedor: Todos"}</option>
              {!isLoadingProveedores && Array.isArray(proveedores) && proveedores.map((prov) => (<option key={prov.id} value={prov.id}>{prov.nombre_empresa}</option>))}
            </select>
          </div>
          {hasPermission('VER_TODAS_ORDENES') && (
            <div className="o-select-pill">
              <select value={selectedVendedor} onChange={(e) => { setSelectedVendedor(e.target.value); }}>
                <option value="">Vendedor: Todos</option>
                {vendedores.map((vendedor) => (<option key={vendedor.id} value={vendedor.id}>{vendedor.first_name}</option>))}
              </select>
            </div>
          )}
          <div className="o-select-pill">
            <select value={selectedEstado} onChange={(e) => { setSelectedEstado(e.target.value); }}>
              {estados.map((estado) => (<option key={estado.value} value={estado.value}>{estado.label === 'Todos' ? 'Estado: Todos' : estado.label}</option>))}
            </select>
          </div>
          <div className="o-select-pill">
            <select value={selectedExhibicion} onChange={(e) => { setSelectedExhibicion(e.target.value); }}>
              <option value="">Exhibición: Todos</option>
              <option value="true">Sí (Exhibición)</option>
              <option value="false">No (Exhibición)</option>
            </select>
          </div>
        </div>

        <div className="header-actions" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {hasPermission('VER_COSTOS_ORDEN') && (
            <button className="o-btn-ghost" onClick={exportOrdenes} title="Exportar Excel">
              <FaFileExport />
            </button>
          )}
          <button className="o-btn-primary-glow" onClick={() => navigate('/ordenes/nuevo')}>
            <FaPlus />
            <span className="long-text">Crear Pedido</span>
            <span className="short-text">Crear</span>
          </button>
        </div>
      </div>

      <div className="ordenes-container">
        {/* Desktop Table View */}
        <div className="desktop-view">
          <table className="premium-table">
            <thead>
              <tr>
                <th className="th-op">O.P.</th>
                <th className="th-proveedor">Proveedor</th>
                <th className="th-vendedor">Vendedor</th>
                <th className="th-venta">Venta</th>
                <th className="th-fecha-pedido">F. Pedido</th>
                <th className="th-fecha-llegada">F. Llegada</th>
                <th className="th-tela">Tela</th>
                <th className="th-estado">Estado</th>
                <th className="th-observacion">Observación</th>
                <th className="th-exh" title="¿Es para exhibición?">Exh.</th>
                {hasPermission('VER_COSTOS_ORDEN') && <th className="th-costo">Costo</th>}
                <th className="th-accion"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="skeleton-row">
                    <td className="td-op"><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                    <td className="td-proveedor"><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                    <td className="td-vendedor"><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td className="td-venta"><div className="skeleton skeleton-text" style={{ width: '50px' }}></div></td>
                    <td className="td-fecha-pedido"><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td className="td-fecha-llegada"><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td className="td-tela"><div className="skeleton skeleton-badge"></div></td>
                    <td className="td-estado"><div className="skeleton skeleton-badge"></div></td>
                    <td className="td-observacion"><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></td>
                    <td className="td-exh"><div className="skeleton skeleton-text" style={{ width: '30px' }}></div></td>
                    {hasPermission('VER_COSTOS_ORDEN') && <td className="td-costo"><div className="skeleton skeleton-text" style={{ width: '70px' }}></div></td>}
                    <td className="td-accion"><div className="skeleton skeleton-text" style={{ width: '20px' }}></div></td>
                  </tr>
                ))
              ) : filteredOrdenes.length > 0 ? (
                filteredOrdenes.map((orden) => (
                  <React.Fragment key={`orden-${orden.id}`}>
                    <tr className={`table-row-clickable ${expandedOrderId === orden.id ? 'expanded-row-highlight' : ''}`} onClick={() => handleExpandOrder(orden.id)} style={{ cursor: 'pointer' }}>
                      <td className="td-op"><strong>#{orden.id}</strong></td>
                      <td className="td-proveedor">{orden.proveedor_nombre}</td>
                      <td className="td-vendedor">{orden.vendedor}</td>
                      <td className="td-venta">{orden.venta || orden.orden_venta}</td>
                      <td className="td-fecha-pedido">{formatDate(orden.fecha_pedido)}</td>
                      <td className="td-fecha-llegada">{formatDate(orden.fecha_esperada)}</td>
                      <td className="td-tela"><span className={`status-badge ${getTelaClass(orden.tela)}`}>{orden.tela}</span></td>
                      <td className="td-estado"><span className={`status-badge ${getEstadoClass(orden.estado, orden.fecha_esperada)}`}>{getEstadoText(orden.estado, orden.fecha_esperada)}</span></td>
                      <td className="td-observacion"><div className="truncate-text" title={orden.observacion}>{orden.observacion}</div></td>
                      <td className="td-exh">{orden.es_exhibicion ? <span className="exh-badge exh-si">Sí</span> : <span className="exh-badge exh-no">No</span>}</td>
                      {hasPermission('VER_COSTOS_ORDEN') && <td className="td-costo font-mono">${formatNumber(orden.costo)}</td>}
                      <td className="td-accion">
                        <button className="btn-icon action-btn" onClick={(e) => { e.stopPropagation(); handleExpandOrder(orden.id); }}>
                          <FaChevronDown style={{ transform: expandedOrderId === orden.id ? 'rotate(180deg)' : 'none' }} />
                        </button>
                      </td>
                    </tr>
                    {expandedOrderId === orden.id && (
                      <tr className="expanded-row">
                        <td colSpan={hasPermission('VER_COSTOS_ORDEN') ? 12 : 11}>
                          {loadingDetails ? (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', width: '100%' }}>
                              <div className="loader"></div>
                            </div>
                          ) : errorMessage ? <div className="error-cell">{errorMessage}</div> : (
                          <div className="details-view-wrapper">
                                <>
                                  {/* Columna izquierda: resumen de la orden */}
                                  <div className="order-preview">
                                    <div className="preview-header">
                                      <img src={logoFinal} className="logoPedido" alt="Logo Lottus" />
                                      <div className="numPedido">
                                        <h2>Orden de Pedido</h2>
                                        <p className="numeroOP">No. {orden.id}</p>
                                      </div>
                                    </div>
                                    <div className="preview-info">
                                      <div className="info-column">
                                        <p><strong>Proveedor:</strong> {orden.proveedor_nombre}</p>
                                        <p><strong>Vendedor:</strong> {orden.vendedor}</p>
                                        <p><strong>Orden de compra:</strong> {orden.venta || orden.orden_venta}</p>
                                      </div>
                                      <div className="info-column">
                                        <p><strong>Fecha pedido:</strong> {formatDate(orden.fecha_pedido)}</p>
                                        <p><strong>Fecha entrega:</strong> {formatDate(orden.fecha_esperada)}</p>
                                      </div>
                                      {orden.estado === 'anulado' && !hasPermission('ADMIN_MODERACION') ? (
                                        <button
                                          className="btn-editar-pedido btn-editar-pedido--disabled"
                                          disabled
                                          title="Solo el administrador puede editar órdenes anuladas"
                                        >
                                          <FaEdit /> Editar
                                        </button>
                                      ) : (
                                        (hasPermission('EDITAR_ESTADO_ORDEN') || hasPermission('EDITAR_ESTADO_TELA_ORDEN')) && (
                                            <button className="btn-editar-pedido" onClick={() => openEditModal(orden)} title="Editar pedido">
                                              <FaEdit /> Editar
                                            </button>
                                        )
                                      )}
                                    </div>
                                    <h3 className="preview-productos-title">Productos:</h3>
                                    <table className="preview-productos-table">
                                      <thead>
                                        <tr>
                                          <th>Cantidad</th>
                                          <th>Referencia</th>
                                          <th>Descripción</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Array.isArray(orderDetails) && orderDetails.map((p, i) => (
                                          <tr key={i}>
                                            <td>{p.cantidad}</td>
                                            <td>{p.referencia}</td>
                                            <td className="desc-preview">{p.especificaciones}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    <div className="preview-nota">
                                      <h3>Observación:</h3>
                                      <p>{orden.observacion || 'Sin observaciones'}</p>
                                    </div>
                                  </div>

                                  {/* Columna derecha: listado de pedidos de tela */}
                                  <div className="telas-preview">
                                    <div className="telas-preview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className="telas-preview-icon">🧵</span>
                                        <h4 style={{ margin: 0 }}>Pedidos de Tela</h4>
                                      </div>
                                      <button 
                                        type="button" 
                                        className="btn-ghost-primary" 
                                        onClick={() => setIsTelaModalOpen(true)}
                                        style={{ padding: '0.5rem', fontSize: '0.9rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        title="Crear Nuevo Pedido de Tela"
                                      >
                                        <FaPlus />
                                      </button>
                                    </div>
                                    {orderTelas.length === 0 ? (
                                      <p className="telas-empty">No hay pedidos de tela registrados para esta orden.</p>
                                    ) : (
                                      <div className="telas-list">
                                        {orderTelas.map((pt) => (
                                          <div className="tela-card" key={pt.id}>
                                            <div className="tela-card-top">
                                              <span className="tela-card-id">PT #{pt.id}</span>
                                              <span
                                                className={`status-badge tela-estado-badge ${pt.estado?.toLowerCase().replace(/ /g, '-')}`}
                                                onClick={() => setTelaEstadoModal({ open: true, pedidoId: pt.id, currentEstado: pt.estado, newEstado: pt.estado })}
                                                style={{ cursor: 'pointer' }}
                                                title="Clic para editar estado"
                                              >
                                                {pt.estado} ✏️
                                              </span>
                                            </div>
                                            <p className="tela-card-proveedor">{pt.proveedor}</p>
                                            {pt.fecha_creacion && (
                                              <p className="tela-card-fecha">{formatDate(pt.fecha_creacion)}</p>
                                            )}
                                            {pt.detalles && pt.detalles.length > 0 && (
                                              <ul className="tela-detalles-list">
                                                {pt.detalles.map((dt, i) => (
                                                  <li key={i}>
                                                    <span className="tela-nombre">{dt.tela}</span>
                                                    <span className="tela-cantidad">×{dt.cantidad}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </>
                           </div>
                           )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr><td colSpan={12} className="empty-cell">No hay órdenes para mostrar.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="mobile-view">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={`skeleton-card-${index}`} className="mobile-card skeleton-item" style={{ padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div className="skeleton skeleton-text" style={{ width: '50px' }}></div>
                  <div className="skeleton skeleton-badge" style={{ width: '80px' }}></div>
                </div>
                <div className="skeleton skeleton-text" style={{ width: '120px', height: '1.25rem', marginBottom: '0.5rem' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '100px', marginBottom: '0.5rem' }}></div>
                <div className="skeleton skeleton-text" style={{ width: '80px' }}></div>
              </div>
            ))
          ) : filteredOrdenes.length > 0 ? (
            filteredOrdenes.map((orden) => (
              <div className="mobile-card" key={orden.id}>
                <div className="mobile-card-header" onClick={() => handleExpandOrder(orden.id)}>
                  <div className="header-top">
                    <span className="card-id">#{orden.id}</span>
                    <span className={`status-badge ${getEstadoClass(orden.estado, orden.fecha_esperada)}`}>
                      {getEstadoText(orden.estado, orden.fecha_esperada)}
                    </span>
                  </div>
                  <div className="header-date">{formatDate(orden.fecha_pedido)}</div>
                </div>
                <div className="mobile-card-body" onClick={() => handleExpandOrder(orden.id)}>
                  <h3 className="proveedor-name">{orden.proveedor_nombre}</h3>
                  <p className="vendor-name">Vendedor: {orden.vendedor}</p>
                  <div className="card-details-grid">
                    <div>
                      <span className="label">Llegada:</span>
                      <span className="value">{formatDate(orden.fecha_esperada)}</span>
                    </div>
                    <div>
                      <span className="label">Tela:</span>
                      <span className={`status-badge small ${getTelaClass(orden.tela)}`}>{orden.tela}</span>
                    </div>
                  </div>
                </div>
                <div className="mobile-card-footer">
                  <button className="btn-expand-mobile" onClick={() => handleExpandOrder(orden.id)}>
                    {expandedOrderId === orden.id ? 'Ocultar Detalles' : 'Ver Detalles'} <FaChevronDown className={expandedOrderId === orden.id ? 'rotated' : ''} />
                  </button>
                </div>

                {expandedOrderId === orden.id && (
                  <div className="mobile-details-container">
                    <div className="details-view-wrapper">
                      {loadingDetails ? (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem', width: '100%' }}>
                              <div className="loader"></div>
                            </div>
                          ) :
                        errorMessage ? <div className="error-message">{errorMessage}</div> :
                          orderDetails ? (
                            <div className="mobile-expanded-content">
                              {/* Simplified Mobile Expanded Content */}
                              <div className="mobile-section">
                                <h4>Información</h4>
                                <p><strong>Venta:</strong> {orden.venta || orden.orden_venta}</p>
                                <p><strong>Observación:</strong> {orden.observacion || 'Ninguna'}</p>
                                {hasPermission('VER_COSTOS_ORDEN') && (
                                    <p><strong>Costo:</strong> {formatNumber(orden.costo)}</p>
                                )}
                              </div>

                              <div className="mobile-section">
                                <h4>Productos</h4>
                                <ul className="mobile-products-list">
                                  {Array.isArray(orderDetails) && orderDetails.map((p, i) => (
                                    <li key={i}>
                                      <strong>{p.referencia}</strong> (x{p.cantidad})
                                      <br />
                                      <small>{p.especificaciones}</small>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {orden.estado === 'anulado' && !hasPermission('ADMIN_MODERACION') ? (
                                <button
                                  className="btn-editar-pedido btn-editar-pedido--disabled btn-full-width"
                                  disabled
                                  title="Solo el administrador puede editar órdenes anuladas"
                                >
                                  <FaEdit /> Editar
                                </button>
                              ) : (
                                (hasPermission('EDITAR_ESTADO_ORDEN') || hasPermission('EDITAR_ESTADO_TELA_ORDEN')) && (
                                    <button className="btn-editar-pedido btn-full-width" onClick={() => openEditModal(orden)}>
                                      <FaEdit /> Editar
                                    </button>
                                )
                              )}
                            </div>
                          ) : <div className="error-message">No se pudieron cargar los detalles.</div>}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state">No hay órdenes para mostrar.</div>
          )}
        </div>
      </div>

      {isEditModalOpen && (
        <OrdenModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleActualizarPedido}
          orden={currentOrder}
          telas={telas}
          estados={modalEstados}
          isLoading={isUpdating}
          userRole={user?.role?.toLowerCase()}
        />
      )}

      {/* Modal editar estado de Pedido Tela (desde /ordenes) */}
      {telaEstadoModal.open && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Editar Estado de Tela</h3>
              <button className="modal-close" type="button" onClick={() => setTelaEstadoModal({ open: false, pedidoId: null, currentEstado: '', newEstado: '' })}>×</button>
            </div>
            <div className="form-group">
              <label>PT #{telaEstadoModal.pedidoId} &mdash; Estado actual: <strong>{telaEstadoModal.currentEstado}</strong></label>
              <select
                value={telaEstadoModal.newEstado}
                onChange={(e) => setTelaEstadoModal(prev => ({ ...prev, newEstado: e.target.value }))}
                disabled={!canEditTelaEstado(telaEstadoModal.currentEstado)}
                style={!canEditTelaEstado(telaEstadoModal.currentEstado) ? { backgroundColor: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed', opacity: 0.7 } : {}}
              >
                <option value="Pendiente">Pendiente</option>
                <option value="En fabrica">En fabrica</option>
                <option value="En Lottus">En Lottus</option>
              </select>
              {!canEditTelaEstado(telaEstadoModal.currentEstado) && (
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.4rem', fontStyle: 'italic' }}>🔒 No se puede editar un pedido en estado "En fabrica".</p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setTelaEstadoModal({ open: false, pedidoId: null, currentEstado: '', newEstado: '' })}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={handleSaveTelaEstado}
                disabled={!canEditTelaEstado(telaEstadoModal.currentEstado)}
              >Guardar</button>
            </div>
          </div>
        </div>
      )}
      <CrearPedidoTelaModal 
        isOpen={isTelaModalOpen}
        onClose={() => setIsTelaModalOpen(false)}
        initialOrdenAsociadaId={expandedOrderId}
        onSuccess={async () => {
          setIsTelaModalOpen(false);
          if (expandedOrderId) {
             try {
                const telasRes = await API.get('pedidos-telas/');
                const telasData = telasRes.data.results || telasRes.data || [];
                const telasAsociadas = telasData.filter(pt => String(pt.orden_asociada_id) === String(expandedOrderId));
                setOrderTelas(telasAsociadas);
             } catch (e) {
                console.error(e);
             }
          }
        }}
      />
      {/* Componente Global de Notificaciones Elegante */}
      <AppNotification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />
    </div>
  );
};

export default OrdenesPage;