import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../AppContext';
import './RecibosCaja.css';
import API from '../services/api';
import * as XLSX from 'xlsx';
import { FaFileExport, FaPlus, FaSearch, FaUndo, FaCheckCircle } from 'react-icons/fa';
import debounce from 'lodash.debounce';
import AppNotification from '../components/AppNotification';

import Modal from '../components/Modal'; // Importar el componente Modal genérico

// Componente de Modal para la creación de Recibos de Caja
const CreateRCModal = ({ isOpen, onClose, onSave, ventas, mediosPago, isLoading }) => {
  const [newRC, setNewRC] = useState({ id: '', fecha: '', venta: '', metodo_pago: '', valor: '', nota: '' });

  useEffect(() => {
    // Inicializar la fecha con la fecha actual al abrir el modal
    if (isOpen) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const formattedToday = `${year}-${month}-${day}`;
      setNewRC(prev => ({ ...prev, fecha: formattedToday }));
    }
  }, [isOpen]);

  const handleChange = (e) => setNewRC({ ...newRC, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); onSave(newRC); };

  if (!isOpen) return null;

  return (
    <Modal show={isOpen} onClose={onClose} title="Nuevo Recibo de Caja">
      <form onSubmit={handleSubmit}>

        <div className="form-group">
          <label>RC:</label>
          <input type="text" name="id" value={newRC.id} onChange={handleChange} required placeholder="Ingresa el ID del recibo" />
        </div>

        <div className="form-group">
          <label>Fecha:</label>
          <input type="date" name="fecha" value={newRC.fecha} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Venta:</label>
          <select name="venta" value={newRC.venta} onChange={handleChange} required>
            <option value="">Elegir venta</option>
            {ventas.map((venta) => (<option key={venta.id_venta} value={venta.id_venta}>Venta #{venta.id_venta}</option>))}
          </select>
        </div>
        <div className="form-group">
          <label>Medio de pago:</label>
          <select name="metodo_pago" value={newRC.metodo_pago} onChange={handleChange} required>
            <option value="">Elegir medio de pago</option>
            {mediosPago.map((medio) => (<option key={medio} value={medio}>{medio}</option>))}
          </select>
        </div>
        <div className="form-group">
          <label>Valor:</label>
          <input type="number" name="valor" value={newRC.valor} onChange={handleChange} required min="0" step="any" />
        </div>
        <div className="form-group">
          <label>Nota:</label>
          <textarea name="nota" value={newRC.nota} onChange={handleChange} placeholder="Escribe una nota (opcional)" rows="3" />
        </div>
        <button type="submit" className="modal-submit" disabled={isLoading}>
          {isLoading ? 'Creando...' : 'Crear'}
        </button>
      </form>
    </Modal>
  );
};

// Componente de Modal de Confirmación
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, children, isLoading }) => {
  if (!isOpen) return null;

  return (
    <Modal show={isOpen} onClose={onClose} title={title}>
      {children}
      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose} disabled={isLoading}>Cancelar</button>
        <button className="btn-primary" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? 'Confirmando...' : 'Confirmar'}
        </button>
      </div>
    </Modal>
  );
};


const RecibosCaja = () => {
  const { usuario } = useContext(AppContext);
  const location = useLocation();
  const [recibosData, setRecibosData] = useState([]);
  const [filters, setFilters] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    medio_pago: '',
    query: ''
  });
  const [isCreatingRC, setIsCreatingRC] = useState(false);

  useEffect(() => {
    if (location.state?.openForm) {
      setIsCreatingRC(true);
      window.history.replaceState({}, document.title)
    }
  }, [location.state]);
  const [ventas, setVentas] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRecibo, setSelectedRecibo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 30;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Para el estado de envío de formularios
  const [notification, setNotification] = useState({ message: '', type: '' });

  const mediosPago = ['Efectivo', 'Davivienda', 'Bancolombia', 'Bold', 'Datafono Lottus', 'Otro'];

  const formatCurrency = (value) => {
    if (value === null || isNaN(value)) return '$0';
    return `$${Math.round(value).toLocaleString('es-CO')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const formattedDay = String(date.getDate()).padStart(2, '0');
    const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const formattedMonth = monthNames[date.getMonth()];
    const formattedYear = date.getFullYear();
    return `${formattedDay}-${formattedMonth}-${formattedYear}`;
  };

  // --- Fetching de Datos ---
  const fetchData = useCallback(async (filters, page) => {
    setIsLoading(true);
    const params = { page, page_size: pageSize, ...filters };
    Object.keys(params).forEach(key => (params[key] === '' || params[key] === null) && delete params[key]);

    try {
      const response = await API.get(`/recibos-caja/`, {
        params
      });
      setRecibosData(response.data.results || []);
      setTotalPages(Math.ceil(response.data.count / pageSize) || 1);
    } catch (error) {
      setNotification({ message: 'Error al cargar los recibos de caja.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchData(filters, currentPage);
  }, [filters, currentPage, fetchData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') {
      setIsCreatingRC(true);
    }
  }, [location]);

  useEffect(() => {
    const fetchVentas = async () => {
      try {
        // Solo obtener IDs de ventas pendientes para el select
        const response = await API.get(`/get-pendientes-ids/`);
        setVentas(response.data.map(id => ({ id_venta: id }))); // Formatear a { id_venta: id }
      } catch (error) {
        console.error('Error details:', error); // Debugging line
        setNotification({ message: 'Error cargando ventas para el formulario.', type: 'error' });
      }
    };
    fetchVentas();
  }, []);
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ fecha_inicio: '', fecha_fin: '', medio_pago: '', query: '' });
    setCurrentPage(1);
  };

  const handleCreateRC = async (rcData) => {
    setIsSubmitting(true);
    setNotification({ message: '', type: '' });
    try {
      await API.post(`/recibos-caja/crear/`, rcData);
      setNotification({ message: 'Recibo de Caja creado exitosamente.', type: 'success' });
      setIsCreatingRC(false);
      fetchData(filters, 1);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Error al crear el Recibo de Caja.';
      setNotification({ message: errorMsg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRecibo = async () => {
    if (!selectedRecibo) return;
    setIsSubmitting(true);
    setNotification({ message: '', type: '' });
    try {
      await API.patch(`/recibos-caja/${selectedRecibo.id}/confirmar/`, {});
      setNotification({ message: 'Recibo de Caja confirmado exitosamente.', type: 'success' });
      setShowConfirmModal(false);
      fetchData(filters, currentPage); // Refrescar datos en la página actual
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Error al confirmar el Recibo de Caja.';
      setNotification({ message: errorMsg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrencyForExport = (value) => {
    if (value === null || value === undefined) return null;
    const num = parseFloat(String(value).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? null : num;
  };

  const exportData = async () => {
    setIsLoading(true);
    const params = { ...filters, page_size: 9999 }; // Fetch all matching data
    Object.keys(params).forEach(key => (params[key] === '' || params[key] === null) && delete params[key]);

    try {
      const response = await API.get(`/recibos-caja/`, {
        params
      });
      
      const dataToExport = response.data.results.map(item => ({
        'RC': item.id,
        'Fecha': formatDate(item.fecha),
        'Venta': item.venta,
        'Método de Pago': item.metodo_pago,
        'Valor': formatCurrencyForExport(item.valor),
        'Nota': item.nota || '—',
        'Estado': item.estado,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'RecibosCaja');
      XLSX.writeFile(wb, 'RecibosCaja.xlsx');

    } catch (error) {
      setNotification({ message: 'Error al exportar los recibos de caja.', type: 'error' });
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
      
      <div className="page-header">
        <div className="filters-group">
          <input type="text" className="search-input" name="query" placeholder="Buscar por RC o Venta..." value={filters.query} onChange={handleFilterChange} />
          <input type="date" name="fecha_inicio" value={filters.fecha_inicio} onChange={handleFilterChange} />
          <input type="date" name="fecha_fin" value={filters.fecha_fin} onChange={handleFilterChange} />
          <select name="medio_pago" value={filters.medio_pago} onChange={handleFilterChange}>
            <option value="">Medio de pago</option>
            {mediosPago.map((medio) => (<option key={medio} value={medio}>{medio}</option>))}
          </select>
          <button className="btn-secondary btn-icon-only" onClick={clearFilters} title="Limpiar filtros"><FaUndo /></button>
        </div>
        <div className="actions-group">
          {usuario?.role === 'administrador' && <button className="btn-secondary" onClick={exportData}><FaFileExport /> Exportar</button>}
          <button className="btn-primary" onClick={() => setIsCreatingRC(true)}><FaPlus /> Nuevo Recibo</button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table recibos-caja-table">
          <thead>
            <tr>
              <th className="rc-th-rc">RC</th>
              <th className="rc-th-fecha">Fecha</th>
              <th className="rc-th-venta">Venta</th>
              <th className="rc-th-metodo">Método de Pago</th>
              <th className="rc-th-valor">Valor</th>
              <th className="rc-th-nota">Nota</th>
              <th className="rc-th-estado">Estado</th>
              <th className="rc-th-acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="8"><div className="loading-container"><div className="loader"></div><p>Cargando recibos...</p></div></td></tr>
            ) : recibosData.length > 0 ? (
              recibosData.map((item) => (
                <tr key={item.id}>
                  <td className="rc-td-rc">{item.id}</td>
                  <td className="rc-td-fecha">{formatDate(item.fecha)}</td>
                  <td className="rc-td-venta">{item.venta}</td>
                  <td className="rc-td-metodo">{item.metodo_pago}</td>
                  <td className="rc-td-valor td-valor">{formatCurrency(item.valor)}</td>
                  <td className="rc-td-nota">{item.nota || '—'}</td>
                  <td className="rc-td-estado">
                    <span className={`status-badge ${item.estado.toLowerCase()}`}>{item.estado}</span>
                  </td>
                  <td className="rc-td-acciones">
                    {item.estado === 'Pendiente' && usuario?.role === 'administrador' && (
                      <button className="btn-secondary" onClick={() => { setSelectedRecibo(item); setShowConfirmModal(true); }} title="Confirmar Recibo">
                        <FaCheckCircle /> Confirmar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="8" className="empty-cell">No hay recibos de caja para mostrar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-container">
        <button disabled={currentPage === 1 || isLoading} onClick={() => setCurrentPage(currentPage - 1)}>Anterior</button>
        <span>Página {currentPage} de {totalPages}</span>
        <button disabled={currentPage === totalPages || totalPages <= 1 || isLoading} onClick={() => setCurrentPage(currentPage + 1)}>Siguiente</button>
      </div>

      <CreateRCModal 
        isOpen={isCreatingRC}
        onClose={() => setIsCreatingRC(false)}
        onSave={handleCreateRC}
        ventas={ventas}
        mediosPago={mediosPago}
        isLoading={isSubmitting}
      />

      {selectedRecibo && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmRecibo}
          title={`Confirmar Recibo #${selectedRecibo.id}`}
          isLoading={isSubmitting}
        >
          <p><strong>Método de pago:</strong> {selectedRecibo.metodo_pago}</p>
          <p><strong>Valor:</strong> {formatCurrency(selectedRecibo.valor)}</p>
          <p><strong>Nota:</strong> {selectedRecibo.nota || 'Sin nota.'}</p>
        </ConfirmModal>
      )}
    </div>
  );
};

export default RecibosCaja;