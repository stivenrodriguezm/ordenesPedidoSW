import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../AppContext';
import './RecibosCaja.css';
import API from '../services/api';
import * as XLSX from 'xlsx';
import {
  FaFileExport,
  FaPlus,
  FaUndo,
  FaCheckCircle,
  FaSearch,
  FaMoneyBillWave,
  FaCreditCard,
  FaUniversity,
  FaMobileAlt,
  FaEllipsisH,
  FaCalendarDay,
  FaWallet
} from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import Modal from '../components/Modal';

// --- Helper Components ---

const PaymentIcon = ({ method }) => {
  const m = method ? method.toLowerCase() : '';
  if (m.includes('efectivo')) return <div className="payment-icon-wrapper cash"><FaMoneyBillWave /></div>;
  if (m.includes('davivienda') || m.includes('bancolombia')) return <div className="payment-icon-wrapper bank"><FaUniversity /></div>;
  if (m.includes('bold') || m.includes('datafono')) return <div className="payment-icon-wrapper card"><FaCreditCard /></div>;
  return <div className="payment-icon-wrapper other"><FaMobileAlt /></div>;
};

const CreateRCModal = ({ isOpen, onClose, onSave, ventas, mediosPago, isLoading }) => {
  const [newRC, setNewRC] = useState({ id: '', fecha: '', venta: '', metodo_pago: '', valor: '', nota: '' });

  useEffect(() => {
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
      <form onSubmit={handleSubmit} className="premium-form">
        <div className="form-grid">
          <div className="form-group">
            <label>RC ID</label>
            <input type="text" name="id" value={newRC.id} onChange={handleChange} required placeholder="Ej: 12345" />
          </div>
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" name="fecha" value={newRC.fecha} onChange={handleChange} required />
          </div>
        </div>

        <div className="form-group">
          <label>Venta Asociada</label>
          <select name="venta" value={newRC.venta} onChange={handleChange} required>
            <option value="">Seleccionar Venta...</option>
            {ventas.map((venta) => (<option key={venta.id_venta} value={venta.id_venta}>Venta #{venta.id_venta}</option>))}
          </select>
        </div>

        <div className="form-group">
          <label>Método de Pago</label>
          <div className="payment-methods-grid">
            {mediosPago.map((medio) => (
              <button
                key={medio}
                type="button"
                className={`payment-method-btn ${newRC.metodo_pago === medio ? 'active' : ''}`}
                onClick={() => setNewRC({ ...newRC, metodo_pago: medio })}
              >
                {medio}
              </button>
            ))}
          </div>
          {/* Hidden select for required validation if needed, or handle manually */}
          <input type="hidden" name="metodo_pago" value={newRC.metodo_pago} required />
        </div>

        <div className="form-group">
          <label>Valor Recibido</label>
          <div className="input-with-icon">
            <FaMoneyBillWave />
            <input type="number" name="valor" value={newRC.valor} onChange={handleChange} required min="0" step="any" placeholder="0.00" />
          </div>
        </div>

        <div className="form-group">
          <label>Nota (Opcional)</label>
          <textarea name="nota" value={newRC.nota} onChange={handleChange} placeholder="Detalles adicionales..." rows="2" />
        </div>

        <button type="submit" className="btn-primary full-width" disabled={isLoading}>
          {isLoading ? 'Procesando...' : 'Crear Recibo'}
        </button>
      </form>
    </Modal>
  );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, children, isLoading }) => {
  if (!isOpen) return null;
  return (
    <Modal show={isOpen} onClose={onClose} title={title}>
      <div className="confirm-content">
        {children}
      </div>
      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose} disabled={isLoading}>Cancelar</button>
        <button className="btn-primary" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? 'Confirmando...' : 'Confirmar Ingreso'}
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
  const [ventas, setVentas] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRecibo, setSelectedRecibo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 30;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const mediosPago = ['Efectivo', 'Davivienda', 'Bancolombia', 'Bold', 'Datafono Lottus', 'Otro'];

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    const total = recibosData.reduce((sum, item) => sum + parseFloat(item.valor || 0), 0);
    const pending = recibosData.filter(item => item.estado === 'Pendiente').length;
    return { total, pending };
  }, [recibosData]);

  const formatCurrency = (value) => {
    if (value === null || isNaN(value)) return '$0';
    return `$${Math.round(value).toLocaleString('es-CO')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayStr = String(date.getDate()).padStart(2, '0');
    const monthStr = date.toLocaleString('es-CO', { month: 'short' }).replace('.', '');
    const yearStr = date.getFullYear();
    return `${dayStr}-${monthStr}-${yearStr}`;
  };

  const fetchData = useCallback(async (filters, page) => {
    setIsLoading(true);
    const params = { page, page_size: pageSize, ...filters };
    Object.keys(params).forEach(key => (params[key] === '' || params[key] === null) && delete params[key]);

    try {
      const response = await API.get(`/recibos-caja/`, { params });
      setRecibosData(response.data.results || []);
      setTotalPages(Math.ceil(response.data.count / pageSize) || 1);
    } catch (error) {
      setNotification({ message: 'Error al cargar los recibos.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchData(filters, currentPage);
  }, [filters, currentPage, fetchData]);

  useEffect(() => {
    if (location.state?.openForm) {
      setIsCreatingRC(true);
      window.history.replaceState({}, document.title);
    }
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') setIsCreatingRC(true);
  }, [location]);

  useEffect(() => {
    const fetchVentas = async () => {
      try {
        const response = await API.get(`/get-pendientes-ids/`);
        setVentas(response.data.map(id => ({ id_venta: id })));
      } catch (error) {
        console.error('Error details:', error);
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
      setNotification({ message: 'Recibo creado exitosamente.', type: 'success' });
      setIsCreatingRC(false);
      fetchData(filters, 1);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Error al crear el recibo.';
      setNotification({ message: errorMsg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRecibo = async () => {
    if (!selectedRecibo) return;
    setIsSubmitting(true);
    try {
      await API.patch(`/recibos-caja/${selectedRecibo.id}/confirmar/`, {});
      setNotification({ message: 'Recibo confirmado.', type: 'success' });
      setShowConfirmModal(false);
      fetchData(filters, currentPage);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Error al confirmar.';
      setNotification({ message: errorMsg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportData = async () => {
    setIsLoading(true);
    const params = { ...filters, page_size: 9999 };
    Object.keys(params).forEach(key => (params[key] === '' || params[key] === null) && delete params[key]);

    try {
      const response = await API.get(`/recibos-caja/`, { params });
      const dataToExport = response.data.results.map(item => ({
        'RC': item.id,
        'Fecha': item.fecha,
        'Venta': item.venta,
        'Método': item.metodo_pago,
        'Valor': item.valor,
        'Nota': item.nota,
        'Estado': item.estado,
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Recibos');
      XLSX.writeFile(wb, 'Recibos_Caja.xlsx');
    } catch (error) {
      setNotification({ message: 'Error al exportar.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="caja-page-container">
      <AppNotification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      {/* --- Live Stats Bar --- */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-icon"><FaWallet /></div>
          <div className="stat-info">
            <span className="stat-label">Total en Pantalla</span>
            <span className="stat-value">{formatCurrency(stats.total)}</span>
          </div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <div className="stat-icon warning"><FaCalendarDay /></div>
          <div className="stat-info">
            <span className="stat-label">Recibos Pendientes</span>
            <span className="stat-value">{stats.pending}</span>
          </div>
        </div>
      </div>

      <div className="glass-header">
        <div className="header-top-row">
          <h1 className="page-title">Gestión de Caja</h1>
          <div className="header-actions">
            {usuario?.role === 'administrador' && (
              <button className="btn-ghost" onClick={exportData} title="Exportar Excel">
                <FaFileExport />
              </button>
            )}
            <button className="btn-primary-glow" onClick={() => setIsCreatingRC(true)}>
              <FaPlus />
              <span className="long-text">Nuevo Ingreso</span>
              <span className="short-text">Nuevo</span>
            </button>
          </div>
        </div>

        <div className="filters-bar">
          <div className="search-pill">
            <FaSearch />
            <input
              type="text"
              name="query"
              placeholder="Buscar RC o Venta..."
              value={filters.query}
              onChange={handleFilterChange}
            />
          </div>
          <div className="date-range-pill">
            <input type="date" name="fecha_inicio" value={filters.fecha_inicio} onChange={handleFilterChange} />
            <span>a</span>
            <input type="date" name="fecha_fin" value={filters.fecha_fin} onChange={handleFilterChange} />
          </div>
          <div className="select-pill">
            <select name="medio_pago" value={filters.medio_pago} onChange={handleFilterChange}>
              <option value="">Todos los medios</option>
              {mediosPago.map((medio) => (<option key={medio} value={medio}>{medio}</option>))}
            </select>
          </div>
          {(filters.query || filters.fecha_inicio || filters.medio_pago) && (
            <button className="btn-reset" onClick={clearFilters}><FaUndo /></button>
          )}
        </div>
      </div>

      <div className="content-area">
        {/* Desktop Table View */}
        <div className="desktop-table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th>RC ID</th>
                <th>Fecha</th>
                <th>Venta</th>
                <th>Método</th>
                <th className="text-right">Valor</th>
                <th>Nota</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td colSpan="8"><div className="skeleton-bar"></div></td>
                  </tr>
                ))
              ) : recibosData.length > 0 ? (
                recibosData.map((item) => (
                  <tr key={item.id} className="table-row-hover">
                    <td className="font-bold">#{item.id}</td>
                    <td className="text-muted">{formatDate(item.fecha)}</td>
                    <td><span className="venta-tag">#{item.venta}</span></td>
                    <td>
                      <div className="method-cell">
                        <PaymentIcon method={item.metodo_pago} />
                        <span>{item.metodo_pago}</span>
                      </div>
                    </td>
                    <td className="text-right font-mono">{formatCurrency(item.valor)}</td>
                    <td className="note-cell" title={item.nota}>{item.nota || '—'}</td>
                    <td>
                      <span className={`status-pill ${item.estado.toLowerCase()}`}>
                        {item.estado}
                      </span>
                    </td>
                    <td className="actions-cell">
                      {item.estado === 'Pendiente' && usuario?.role === 'administrador' && (
                        <button
                          className="action-btn confirm"
                          onClick={() => { setSelectedRecibo(item); setShowConfirmModal(true); }}
                          title="Confirmar Ingreso"
                        >
                          <FaCheckCircle />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" className="empty-state">No se encontraron recibos.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Transaction List View */}
        <div className="mobile-transaction-list">
          {isLoading ? (
            <div className="loading-spinner">Cargando...</div>
          ) : recibosData.length > 0 ? (
            recibosData.map((item) => (
              <div className="transaction-card" key={item.id}>
                <div className="card-left">
                  <PaymentIcon method={item.metodo_pago} />
                  <div className="card-info">
                    <div className="card-title">Recibo #{item.id}</div>
                    <div className="card-subtitle">{formatDate(item.fecha)} • Venta #{item.venta}</div>
                  </div>
                </div>
                <div className="card-right">
                  <div className="card-amount">{formatCurrency(item.valor)}</div>
                  <span className={`status-dot ${item.estado.toLowerCase()}`}></span>
                </div>
                {item.estado === 'Pendiente' && usuario?.role === 'administrador' && (
                  <button className="mobile-confirm-btn" onClick={() => { setSelectedRecibo(item); setShowConfirmModal(true); }}>
                    Confirmar
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="empty-state-mobile">No hay movimientos.</div>
          )}
        </div>
      </div>

      <div className="pagination-bar">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>Anterior</button>
        <span>{currentPage} / {totalPages}</span>
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)}>Siguiente</button>
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
          title="Confirmar Ingreso"
          isLoading={isSubmitting}
        >
          <div className="confirm-details">
            <div className="detail-row">
              <span>Recibo:</span>
              <strong>#{selectedRecibo.id}</strong>
            </div>
            <div className="detail-row">
              <span>Valor:</span>
              <strong className="highlight-value">{formatCurrency(selectedRecibo.valor)}</strong>
            </div>
            <div className="detail-row">
              <span>Método:</span>
              <span>{selectedRecibo.metodo_pago}</span>
            </div>
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default RecibosCaja;