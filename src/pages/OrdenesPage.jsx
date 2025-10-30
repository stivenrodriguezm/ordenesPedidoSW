import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { FaChevronDown, FaFileExport, FaPlus, FaEdit } from 'react-icons/fa';
import './OrdenesPage.css';
import { AppContext } from '../AppContext';

// El componente OrdenModal no necesita cambios. Se deja por contexto.
const OrdenModal = ({ isOpen, onClose, onSave, orden, telas, estados, isLoading }) => {
  const [formState, setFormState] = useState({ costo: '', estado: '', tela: '' });

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
    onSave(orden.id, formState);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Actualizar Pedido O.P. #{orden.id}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Costo</label>
            <input type="number" name="costo" value={formState.costo} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Estado del Pedido</label>
            <select name="estado" value={formState.estado} onChange={handleChange}>
              {estados.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Estado de Tela</label>
            <select name="tela" value={formState.tela} onChange={handleChange}>
              {telas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button type="submit" className="modal-submit" disabled={isLoading}>
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
  const navigate = useNavigate();
  
  const [filteredOrdenes, setFilteredOrdenes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [selectedProveedor, setSelectedProveedor] = useState('');
  const [selectedVendedor, setSelectedVendedor] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // --- PASO 1: AÑADIR NUEVO ESTADO PARA LA ACTUALIZACIÓN ---
  const [isUpdating, setIsUpdating] = useState(false);

  
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
  const telas = ['Por pedir', 'Sin tela', 'Por llegar', 'En fabrica', 'En Lottus'];

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
      const token = localStorage.getItem("accessToken");
      try {
        const params = {
          id_proveedor: selectedProveedor,
          id_vendedor: selectedVendedor,
          estado: selectedEstado,
          ordering: '-id',
        };
        
        Object.keys(params).forEach(key => !params[key] && delete params[key]);
        
        const response = await axios.get('http://127.0.0.1:8000/api/listar-pedidos/', {
            headers: { Authorization: `Bearer ${token}` },
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
  }, [selectedProveedor, selectedVendedor, selectedEstado, token, user]);
  
  

  const handleExpandOrder = async (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    setLoadingDetails(true);
    setOrderDetails(null); // Reset details on new expand
    setErrorMessage(''); // Reset error message
    try {
      const response = await API.get(`pedidos/${orderId}/detalles/`);
      setOrderDetails(response.data);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Error al cargar los detalles del pedido.';
      setErrorMessage(errorMsg);
      console.error(error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenEditModal = (orden) => {
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
        setFilteredOrdenes(prev => prev.map(o => o.id === id ? {...o, ...updates} : o));
        setIsEditModalOpen(false); // Cierra el modal en caso de éxito
    } catch (error) {
        setErrorMessage('Error al actualizar el pedido.');
    } finally {
        setIsUpdating(false); // Finaliza el estado de carga
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
      if (user?.role === 'ADMINISTRADOR' || user?.role === 'AUXILIAR') {
        data['Costo'] = formatCurrencyForExport(orden.costo);
      }
      return data;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ordenes');
    XLSX.writeFile(wb, 'Ordenes.xlsx');
  };
  const getEstadoClass = (estado, fechaEsperada) => {
    if (estado === 'en_proceso') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const fechaEsperadaDate = new Date(fechaEsperada + 'T00:00:00');
      return fechaEsperadaDate < today ? 'atrasado' : 'en-proceso';
    }
    return estado;
  };

  const getEstadoText = (estado, fechaEsperada) => {
    if (estado === 'en_proceso') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const fechaEsperadaDate = new Date(fechaEsperada + 'T00:00:00');
      return fechaEsperadaDate < today ? 'Atrasado' : 'En proceso';
    }
    return capitalizeEstado(estado);
  };
  const getTelaClass = (tela) => tela?.toLowerCase().replace(/ /g, '-') || 'default';


  return (
    <div className="page-container">
      {/* ... (código JSX sin cambios hasta el modal) ... */}
      <div className="page-header">
        <div className="filters-group">
          <select value={selectedProveedor} onChange={(e) => { setSelectedProveedor(e.target.value); }} disabled={isLoadingProveedores}>
            <option value="">{isLoadingProveedores ? "Cargando proveedores..." : "Todos los proveedores"}</option>
            {!isLoadingProveedores && Array.isArray(proveedores) && proveedores.map((prov) => (<option key={prov.id} value={prov.id}>{prov.nombre_empresa}</option>))}
          </select>
          {(user?.role === 'administrador' || user?.role === 'auxiliar') && (
            <select value={selectedVendedor} onChange={(e) => { setSelectedVendedor(e.target.value); }}>
              <option value="">Todos los vendedores</option>
              {vendedores.map((vendedor) => (<option key={vendedor.id} value={vendedor.id}>{vendedor.first_name}</option>))}
            </select>
          )}
          <select value={selectedEstado} onChange={(e) => { setSelectedEstado(e.target.value); }}>
            {estados.map((estado) => (<option key={estado.value} value={estado.value}>{estado.label}</option>))}
          </select>
        </div>
        <div className="actions-group">
          {(user?.role === 'administrador' || user?.role === 'auxiliar') && <button className="btn-secondary" onClick={exportOrdenes}><FaFileExport /> Exportar</button>}
          <button className="btn-primary" onClick={() => navigate('/ordenes/nuevo')}><FaPlus /> Crear Pedido</button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table ordenes-table">
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
              {(user?.role.toLowerCase() === 'administrador' || user?.role.toLowerCase() === 'auxiliar') && <th className="th-costo">Costo</th>}
              <th className="th-accion"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={11}><div className="loading-container"><div className="loader"></div></div></td></tr>
            ) : filteredOrdenes.length > 0 ? (
              filteredOrdenes.map((orden) => (
                <React.Fragment key={`orden-${orden.id}`}>
                  <tr>
                    <td className="td-op">{orden.id}</td>
                    <td className="td-proveedor">{orden.proveedor_nombre}</td>
                    <td className="td-vendedor">{orden.vendedor}</td>
                    <td className="td-venta">{orden.venta || orden.orden_venta}</td>
                    <td className="td-fecha-pedido">{formatDate(orden.fecha_pedido)}</td>
                    <td className="td-fecha-llegada">{formatDate(orden.fecha_esperada)}</td>
                    <td className="td-tela"><span className={`status-badge ${getTelaClass(orden.tela)}`}>{orden.tela}</span></td>
                    <td className="td-estado"><span className={`status-badge ${getEstadoClass(orden.estado, orden.fecha_esperada)}`}>{getEstadoText(orden.estado, orden.fecha_esperada)}</span></td>
                    <td className="td-observacion">{orden.observacion}</td>
                    {(user?.role.toLowerCase() === 'administrador' || user?.role.toLowerCase() === 'auxiliar') && <td className="td-costo">${formatNumber(orden.costo)}</td>}
                    <td className="td-accion">
                      <button className="btn-icon" onClick={() => handleExpandOrder(orden.id)}>
                         <FaChevronDown style={{ transform: expandedOrderId === orden.id ? 'rotate(180deg)' : 'none' }} />
                      </button>
                    </td>
                  </tr>
                  {expandedOrderId === orden.id && (
                    <tr className="expanded-row">
                      <td colSpan={11}>
                        <div className="details-view-wrapper">
                          {loadingDetails ? <div className="loading-container"><div className="loader"></div></div> :
                            errorMessage ? <div className="error-cell">{errorMessage}</div> :
                            orderDetails ? (
                              <>
                                <div className="order-preview">
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
                                    {(user?.role.toLowerCase() === 'administrador' || user?.role.toLowerCase() === 'auxiliar') && (
                                        <button className="btn-primary btn-editar-pedido" onClick={() => handleOpenEditModal(orden)}>
                                            <FaEdit /> Editar Pedido
                                        </button>
                                    )}
                                  </div>
                                  <div className="preview-products">
                                    <h4>Productos:</h4>
                                    <table className="sub-table">
                                      <thead><tr><th>Cantidad</th><th>Referencia</th><th>Descripción</th></tr></thead>
                                      <tbody className='tabla_expandida'>
                                        {orderDetails.map((p, i) => (<tr key={i}><td className='td_cantidad'>{p.cantidad}</td><td className='td_referencia'>{p.referencia}</td><td className='td_descripcion'>{p.especificaciones}</td></tr>))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div className="preview-notes">
                                    <h4>Observación:</h4>
                                    <p>{orden.observacion || 'Sin observaciones.'}</p>
                                  </div>
                                </div>
                              </>
                            ) : <div className="error-cell">No se pudieron cargar los detalles.</div>
                          }
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr><td colSpan={11} className="empty-cell">No hay órdenes para mostrar.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      {isEditModalOpen && (
        <OrdenModal 
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleActualizarPedido}
            orden={currentOrder}
            telas={telas}
            estados={modalEstados}
            // --- PASO 3: CORREGIR EL PROP PASADO AL MODAL ---
            isLoading={isUpdating}
        />
      )}
    </div>
  );
};

export default OrdenesPage;