import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext, usePermissions } from '../AppContext';
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
  FaWallet,
  FaChevronLeft,
  FaChevronRight,
  FaCalculator
} from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import Modal from '../components/Modal';

import { formatCOP } from '../utils/formatCOP';

// --- Helper Components ---

const PaymentIcon = ({ method }) => {
  const m = method ? method.toLowerCase() : '';
  if (m.includes('efectivo')) return <div className="payment-icon-wrapper cash"><FaMoneyBillWave /></div>;
  if (m.includes('davivienda') || m.includes('bancolombia')) return <div className="payment-icon-wrapper bank"><FaUniversity /></div>;
  if (m.includes('bold') || m.includes('datafono')) return <div className="payment-icon-wrapper card"><FaCalculator /></div>;
  return <div className="payment-icon-wrapper other"><FaMobileAlt /></div>;
};

const PAYMENT_METHODS = [
  { label: 'Efectivo', icon: <FaMoneyBillWave /> },
  { label: 'Davivienda', icon: <FaUniversity /> },
  { label: 'Bancolombia', icon: <FaUniversity /> },
  { label: 'Bold', icon: <FaCalculator /> },
  { label: 'Datafono Lottus', icon: <FaCreditCard /> },
  { label: 'Otro', icon: <FaMobileAlt /> },
];

const CreateRCModal = ({ isOpen, onClose, onSave, ventas, mediosPago, isLoading }) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [newRC, setNewRC] = useState({ id: '', fecha: todayStr, venta: '', metodo_pago: '', valor: '', nota: '' });

  useEffect(() => {
    if (isOpen) {
      setNewRC({ id: '', fecha: todayStr, venta: '', metodo_pago: '', valor: '', nota: '' });
    }
  }, [isOpen]);

  const handleChange = (e) => setNewRC({ ...newRC, [e.target.name]: e.target.value });
  const handleValorChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setNewRC({ ...newRC, valor: raw });
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newRC.metodo_pago) return;
    onSave(newRC);
  };

  if (!isOpen) return null;

  const numericVal = parseInt(newRC.valor) || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="lottus-form-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="lottus-modal-header">
          <div className="lottus-modal-title-wrap">
            <div className="lottus-modal-icon-badge">
              <FaWallet />
            </div>
            <div>
              <div className="lottus-modal-type-badge">
                <span className="lottus-badge-dot"></span> Recibo de Ingreso
              </div>
              <h3 className="lottus-modal-title">Nuevo Recibo de Caja</h3>
              <p className="lottus-modal-subtitle">Ingresa los datos generales del recibo de ingreso.</p>
            </div>
          </div>
          <button type="button" className="lottus-close-btn" onClick={onClose} title="Cerrar">×</button>
        </div>

        <form onSubmit={handleSubmit} className="lottus-modal-form">
          {/* Row: ID + Fecha */}
          <div className="lottus-form-row">
            <div className="lottus-form-group">
              <label>No. Recibo <span className="lottus-req">*</span></label>
              <input type="text" name="id" value={newRC.id} onChange={handleChange} required placeholder="Ej: RC-001" className="lottus-input" />
            </div>
            <div className="lottus-form-group">
              <label>Fecha <span className="lottus-req">*</span></label>
              <input type="date" onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }} name="fecha" value={newRC.fecha} onChange={handleChange} required className="lottus-input" />
            </div>
          </div>

          {/* Venta */}
          <div className="lottus-form-group full">
            <label>Venta Asociada <span className="lottus-req">*</span></label>
            <select name="venta" value={newRC.venta} onChange={handleChange} required className="lottus-select">
              <option value="">Seleccionar Venta...</option>
              {ventas.map((venta) => (
                <option key={venta.id_venta} value={venta.id_venta}>Venta #{venta.id_venta}</option>
              ))}
            </select>
          </div>

          {/* Método de Pago */}
          <div className="lottus-form-group full">
            <label>Método de Pago <span className="lottus-req">*</span></label>
            <div className="lottus-payment-grid">
              {PAYMENT_METHODS.map((method) => {
                const isActive = newRC.metodo_pago === method.label;
                return (
                  <button
                    key={method.label}
                    type="button"
                    className={`lottus-payment-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setNewRC({ ...newRC, metodo_pago: method.label })}
                  >
                    <span className="lottus-pay-icon">{method.icon}</span>
                    <span>{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Valor */}
          <div className="lottus-form-group full">
            <div className="lottus-label-flex">
              <label>Valor Recibido <span className="lottus-req">*</span></label>
              {numericVal > 0 && (
                <span className="lottus-val-preview">{formatCOP(numericVal)}</span>
              )}
            </div>
            <div className="lottus-input-icon">
              <span className="lottus-prefix">$</span>
              <input
                type="text"
                name="valor"
                value={newRC.valor ? formatCOP(numericVal).replace('$', '').trim() : ''}
                onChange={handleValorChange}
                required
                placeholder="0"
                className="lottus-input lottus-input-pl"
              />
            </div>
          </div>

          {/* Nota */}
          <div className="lottus-form-group full">
            <label>Notas / Observaciones <span className="lottus-hint">(opcional)</span></label>
            <textarea name="nota" value={newRC.nota} onChange={handleChange} placeholder="Detalles o notas sobre el recibo..." rows="2" className="lottus-input" />
          </div>

          {/* Footer Actions */}
          <div className="lottus-modal-actions">
            <button type="button" className="lottus-btn-cancel" onClick={onClose} disabled={isLoading}>
              Cancelar
            </button>
            <button type="submit" className="lottus-btn-submit" disabled={isLoading || !newRC.metodo_pago || !newRC.id || !newRC.venta || numericVal <= 0}>
              {isLoading ? 'Guardando...' : 'Crear Recibo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const ConfirmModal = ({ isOpen, onClose, onConfirm, title, children, isLoading }) => {
  if (!isOpen) return null;
  return (
    <Modal show={isOpen} onClose={onClose} title={title}>
      <div className="rc-confirm-modal-body">
        {children}
      </div>
      <div className="rc-confirm-modal-actions">
        <button className="o-btn-secondary-glow" onClick={onClose} disabled={isLoading}>
          Cancelar
        </button>
        <button className="o-btn-primary-glow" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? 'Confirmando...' : 'Confirmar Ingreso'}
        </button>
      </div>
    </Modal>
  );
};

const RecibosCaja = () => {
  const { usuario } = useContext(AppContext);
  const hasPermission = usePermissions();
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

  // --- Sorting: Mostrar pendientes primero, luego mantener orden por fecha/id ---
  const sortedRecibosData = useMemo(() => {
    return [...recibosData].sort((a, b) => {
      const aPending = a.estado === 'Pendiente' ? 0 : 1;
      const bPending = b.estado === 'Pendiente' ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return 0;
    });
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
          <div className="stat-icon warning"><FaCalendarDay /></div>
          <div className="stat-info">
            <span className="stat-label">Recibos Pendientes</span>
            <span className="stat-value">{stats.pending}</span>
          </div>
        </div>
      </div>

      <div className="o-glass-header" style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', overflowX: 'auto' }}>
        <div className="o-filters-bar" style={{ margin: 0, flex: 1 }}>
          <div className="o-select-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaSearch style={{ color: '#94a3b8', fontSize: '0.8rem' }} />
            <input type="text" name="query" placeholder="Buscar RC o Venta..." value={filters.query} onChange={handleFilterChange}
              style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', color: '#334155', outline: 'none', minWidth: '120px' }} />
          </div>
          <div className="o-select-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Desde</label>
            <input type="date" onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }} name="fecha_inicio" value={filters.fecha_inicio} onChange={handleFilterChange}
              style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', color: '#334155', fontWeight: 600, cursor: 'pointer', outline: 'none' }} />
          </div>
          <div className="o-select-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Hasta</label>
            <input type="date" onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }} name="fecha_fin" value={filters.fecha_fin} onChange={handleFilterChange}
              style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', color: '#334155', fontWeight: 600, cursor: 'pointer', outline: 'none' }} />
          </div>
          <div className="o-select-pill">
            <select name="medio_pago" value={filters.medio_pago} onChange={handleFilterChange}>
              <option value="">Medio: Todos</option>
              {mediosPago.map((medio) => (<option key={medio} value={medio}>{medio}</option>))}
            </select>
          </div>
          {(filters.query || filters.fecha_inicio || filters.medio_pago) && (
            <button className="o-btn-ghost" onClick={clearFilters} title="Limpiar filtros"><FaUndo /></button>
          )}
        </div>

        <div className="header-actions" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {usuario?.role === 'administrador' && (
            <button className="o-btn-ghost" onClick={exportData} title="Exportar Excel"><FaFileExport /></button>
          )}
          {hasPermission('CREAR_RECIBO') && (
            <button className="o-btn-primary-glow" onClick={() => setIsCreatingRC(true)}>
              <FaPlus />
              <span className="long-text">Nuevo Ingreso</span>
              <span className="short-text">Nuevo</span>
            </button>
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
                    <td><div className="skeleton skeleton-text" style={{ width: '50px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '90px' }}></div></td>
                    <td className="text-right"><div className="skeleton skeleton-text" style={{ width: '80px', marginLeft: 'auto' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                    <td><div className="skeleton skeleton-badge"></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '24px' }}></div></td>
                  </tr>
                ))
              ) : sortedRecibosData.length > 0 ? (
                sortedRecibosData.map((item) => (
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
                      {item.estado === 'Pendiente' && hasPermission('APROBAR_RECIBO') && (
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
            <div className="loading-spinner"></div>
          ) : sortedRecibosData.length > 0 ? (
            sortedRecibosData.map((item) => (
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

      <div className="rc-pagination-bar">
        <button className="rc-pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>
          <FaChevronLeft />
        </button>
        <span className="rc-pagination-info">Página {currentPage} de {totalPages}</span>
        <button className="rc-pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)}>
          <FaChevronRight />
        </button>
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
          <div className="rc-confirm-container">
            <div className="rc-confirm-row">
              <span className="rc-confirm-label">N° Recibo</span>
              <span className="rc-confirm-val font-mono">#{selectedRecibo.id}</span>
            </div>
            <div className="rc-confirm-row">
              <span className="rc-confirm-label">Valor del Ingreso</span>
              <span className="rc-confirm-val amount">{formatCurrency(selectedRecibo.valor)}</span>
            </div>
            <div className="rc-confirm-row">
              <span className="rc-confirm-label">Método de Pago</span>
              <span className="rc-confirm-val method">
                <PaymentIcon method={selectedRecibo.metodo_pago} />
                {selectedRecibo.metodo_pago || 'N/A'}
              </span>
            </div>
            {selectedRecibo.venta && (
              <div className="rc-confirm-row">
                <span className="rc-confirm-label">Venta Asociada</span>
                <span className="rc-confirm-val">Venta #{selectedRecibo.venta}</span>
              </div>
            )}
            {selectedRecibo.fecha && (
              <div className="rc-confirm-row">
                <span className="rc-confirm-label">Fecha</span>
                <span className="rc-confirm-val">{selectedRecibo.fecha}</span>
              </div>
            )}
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default RecibosCaja;