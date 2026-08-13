import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { AppContext, usePermissions } from '../AppContext';
import './RecibosCaja.css';
import API from '../services/api';
import { getTodayStr } from '../utils/dates';
import {
  FaFileExport,
  FaPlus,
  FaUndo,
  FaTimes,
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
  FaChevronDown,
  FaCalculator
} from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import Modal from '../components/Modal';
import { PageHeader, Button, Badge } from '../components/ui';

import { formatCOP } from '../utils/formatCOP';
import { usePendientesIds } from '../hooks/useSharedData';

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

const emptyPago = () => ({ metodo_pago: '', valor: '' });

const CreateRCModal = ({ isOpen, onClose, onSave, ventas, mediosPago, isLoading }) => {
  const todayStr = getTodayStr();

  const [newRC, setNewRC] = useState({ id: '', fecha: todayStr, venta: '', nota: '', pagos: [emptyPago()] });
  const [ventaSearch, setVentaSearch] = useState('');
  const [showVentaDropdown, setShowVentaDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewRC({ id: '', fecha: todayStr, venta: '', nota: '', pagos: [emptyPago()] });
      setVentaSearch('');
      setShowVentaDropdown(false);
    }
  }, [isOpen]);

  const handleChange = (e) => setNewRC({ ...newRC, [e.target.name]: e.target.value });

  const handlePagoMetodo = (index, metodo) => {
    const pagos = [...newRC.pagos];
    pagos[index] = { ...pagos[index], metodo_pago: metodo };
    setNewRC({ ...newRC, pagos });
  };
  const handlePagoValor = (index, e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const pagos = [...newRC.pagos];
    pagos[index] = { ...pagos[index], valor: raw };
    setNewRC({ ...newRC, pagos });
  };
  const handleAddPago = () => setNewRC({ ...newRC, pagos: [...newRC.pagos, emptyPago()] });
  const handleRemovePago = (index) => setNewRC({ ...newRC, pagos: newRC.pagos.filter((_, i) => i !== index) });

  const handleSubmit = (e) => {
    e.preventDefault();
    const pagosValidos = newRC.pagos.filter(p => p.metodo_pago && (parseInt(p.valor) || 0) > 0);
    if (pagosValidos.length === 0) return;
    onSave({
      ...newRC,
      pagos: pagosValidos.map(p => ({ metodo_pago: p.metodo_pago, valor: parseInt(p.valor) || 0 })),
    });
  };

  if (!isOpen) return null;

  const totalVal = newRC.pagos.reduce((sum, p) => sum + (parseInt(p.valor) || 0), 0);
  const pagosValidos = newRC.pagos.filter(p => p.metodo_pago && (parseInt(p.valor) || 0) > 0);
  const filteredVentas = ventas.filter(v => v.id_venta.toString().includes(ventaSearch));

  return createPortal(
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
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
          <div className="lottus-form-group full" style={{ position: 'relative' }}>
            <label>Venta Asociada <span className="lottus-req">*</span></label>
            
            <div 
              className="lottus-select" 
              onClick={() => setShowVentaDropdown(!showVentaDropdown)}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>{newRC.venta ? `Venta #${newRC.venta}` : 'Seleccionar Venta...'}</span>
              <FaChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
            </div>

            {showVentaDropdown && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#ffffff', zIndex: 2, borderRadius: '8px 8px 0 0' }}>
                  <input 
                    type="text" 
                    placeholder="Buscar # de venta..." 
                    value={ventaSearch}
                    onChange={(e) => setVentaSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', color: '#1e293b', fontSize: '0.9rem', outline: 'none' }}
                    autoFocus
                  />
                </div>
                <div style={{ overflowY: 'auto', flex: 1, maxHeight: '200px' }}>
                  {filteredVentas.length > 0 ? filteredVentas.map(venta => (
                    <div 
                      key={venta.id_venta}
                      onClick={() => {
                        setNewRC({ ...newRC, venta: venta.id_venta });
                        setShowVentaDropdown(false);
                        setVentaSearch('');
                      }}
                      style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: newRC.venta === venta.id_venta ? '#ecfdf5' : 'transparent', color: newRC.venta === venta.id_venta ? '#059669' : '#334155', fontWeight: newRC.venta === venta.id_venta ? '600' : '400', transition: 'background 0.2s, color 0.2s' }}
                      onMouseEnter={(e) => { if(newRC.venta !== venta.id_venta) e.target.style.background = '#f8fafc' }}
                      onMouseLeave={(e) => { if(newRC.venta !== venta.id_venta) e.target.style.background = 'transparent' }}
                    >
                      Venta #{venta.id_venta}
                    </div>
                  )) : (
                    <div style={{ padding: '12px', color: '#64748b', textAlign: 'center', fontSize: '0.9rem' }}>
                      No se encontraron ventas
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pago(s) — uno o varios medios de pago para el mismo recibo */}
          <div className="lottus-form-group full">
            <div className="lottus-label-flex">
              <label>Pago(s) <span className="lottus-req">*</span></label>
              {totalVal > 0 && (
                <span className="lottus-val-preview">Total: {formatCOP(totalVal)}</span>
              )}
            </div>
            <div className="rc-pagos-list">
              {newRC.pagos.map((pago, index) => (
                <div key={index} className="rc-pago-row">
                  <select
                    className="lottus-select"
                    value={pago.metodo_pago}
                    onChange={(e) => handlePagoMetodo(index, e.target.value)}
                  >
                    <option value="">Método...</option>
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.label} value={m.label}>{m.label}</option>
                    ))}
                  </select>
                  <div className="lottus-input-icon rc-pago-valor-wrap">
                    <span className="lottus-prefix">$</span>
                    <input
                      type="text"
                      value={pago.valor ? formatCOP(parseInt(pago.valor) || 0).replace('$', '').trim() : ''}
                      onChange={(e) => handlePagoValor(index, e)}
                      placeholder="0"
                      className="lottus-input lottus-input-pl"
                    />
                  </div>
                  {newRC.pagos.length > 1 && (
                    <button type="button" className="rc-pago-remove-btn" onClick={() => handleRemovePago(index)} title="Quitar este pago">
                      <FaTimes />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="rc-btn-add-pago" onClick={handleAddPago}>
              <FaPlus /> Agregar otro medio de pago
            </button>
            <p className="lottus-hint" style={{ marginTop: '0.15rem' }}>
              Si el pago se dividió en varios medios (ej. parte efectivo, parte transferencia), agrega una línea por cada uno. El efectivo se confirma al instante; los demás quedan pendientes hasta que un administrador los confirme.
            </p>
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
            <button type="submit" className="lottus-btn-submit" disabled={isLoading || pagosValidos.length === 0 || !newRC.id || !newRC.venta || totalVal <= 0}>
              {isLoading ? 'Guardando...' : 'Crear Recibo'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
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
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={onConfirm} loading={isLoading}>
          {isLoading ? 'Confirmando...' : 'Confirmar Ingreso'}
        </Button>
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
  const { data: pendientesIds = [], isError: pendientesIdsError, error: pendientesIdsErr } = usePendientesIds();
  const ventas = useMemo(() => pendientesIds.map(id => ({ id_venta: id })), [pendientesIds]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { recibo, pago }
  const [expandedReciboId, setExpandedReciboId] = useState(null);
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
    const pending = recibosData.filter(item => item.estado === 'Pendiente' || item.estado === 'Parcial').length;
    return { total, pending };
  }, [recibosData]);

  // --- Sorting: Mostrar pendientes/parciales primero, luego mantener orden por fecha/id ---
  const sortedRecibosData = useMemo(() => {
    return [...recibosData].sort((a, b) => {
      const aPending = (a.estado === 'Pendiente' || a.estado === 'Parcial') ? 0 : 1;
      const bPending = (b.estado === 'Pendiente' || b.estado === 'Parcial') ? 0 : 1;
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
    if (pendientesIdsError) console.error('Error details:', pendientesIdsErr);
  }, [pendientesIdsError, pendientesIdsErr]);

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
      const data = error.response?.data;
      const errorMsg = data?.detail || data?.error || (typeof data === 'string' ? data : (data ? JSON.stringify(data) : 'Error al crear el recibo.'));
      setNotification({ message: errorMsg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRecibo = async () => {
    if (!confirmTarget?.pago) return;
    setIsSubmitting(true);
    try {
      await API.patch(`/recibos-caja/pagos/${confirmTarget.pago.id}/confirmar/`, {});
      setNotification({ message: 'Pago confirmado.', type: 'success' });
      setShowConfirmModal(false);
      fetchData(filters, currentPage);
    } catch (error) {
      const data = error.response?.data;
      const errorMsg = data?.detail || data?.error || (typeof data === 'string' ? data : (data ? JSON.stringify(data) : 'Error al confirmar.'));
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
      const XLSX = await import('xlsx');
      const response = await API.get(`/recibos-caja/`, { params });
      const dataToExport = response.data.results.map(item => ({
        'RC': item.id,
        'Fecha': item.fecha,
        'Venta': item.venta,
        'Vendedor': item.vendedor_nombre || '-',
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
    <div className="ds-page recibos-page ds-fade-in">
      <AppNotification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      <PageHeader
        icon={FaWallet}
        title="Recibos de Caja"
        subtitle="Registro y confirmación de ingresos"
        actions={
          <>
            {usuario?.role === 'administrador' && (
              <Button variant="ghost" icon={FaFileExport} onClick={exportData} title="Exportar Excel" />
            )}
            {hasPermission('CREAR_RECIBO') && (
              <Button variant="primary" icon={FaPlus} onClick={() => setIsCreatingRC(true)}>
                <span className="long-text">Nuevo Ingreso</span>
                <span className="short-text">Nuevo</span>
              </Button>
            )}
          </>
        }
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

      <div className="ds-card recibos-filters ds-fade-in" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
        <div className="v-filters-bar" style={{ margin: 0, flex: 1, overflow: 'visible', flexWrap: 'wrap' }}>
          <div className="v-search-pill">
            <FaSearch />
            <input
              type="text"
              name="query"
              placeholder="Buscar RC o Venta..."
              value={filters.query}
              onChange={handleFilterChange}
            />
          </div>
          <div className="v-select-pill">
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', margin: '0 0.5rem', fontWeight: 600 }}>Desde:</span>
            <input
              type="date"
              name="fecha_inicio"
              value={filters.fecha_inicio}
              onChange={handleFilterChange}
              onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.82rem', color: 'var(--gray-700)', cursor: 'pointer', paddingRight: '0.8rem' }}
            />
          </div>
          <div className="v-select-pill">
            <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', margin: '0 0.5rem', fontWeight: 600 }}>Hasta:</span>
            <input
              type="date"
              name="fecha_fin"
              value={filters.fecha_fin}
              onChange={handleFilterChange}
              onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.82rem', color: 'var(--gray-700)', cursor: 'pointer', paddingRight: '0.8rem' }}
            />
          </div>
          <div className="v-select-pill">
            <select name="medio_pago" value={filters.medio_pago} onChange={handleFilterChange}>
              <option value="">Medio: Todos</option>
              {mediosPago.map((medio) => (<option key={medio} value={medio}>{medio}</option>))}
            </select>
          </div>
          {(filters.query || filters.fecha_inicio || filters.fecha_fin || filters.medio_pago) && (
            <button type="button" className="fct-clear-pill" onClick={clearFilters} title="Limpiar filtros">
              <FaTimes />
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
                <th>Vendedor</th>
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
                    <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '90px' }}></div></td>
                    <td className="text-right"><div className="skeleton skeleton-text" style={{ width: '80px', marginLeft: 'auto' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                    <td><div className="skeleton skeleton-badge"></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '24px' }}></div></td>
                  </tr>
                ))
              ) : sortedRecibosData.length > 0 ? (
                sortedRecibosData.map((item) => {
                  const pagos = item.pagos || [];
                  const isMultiple = pagos.length > 1;
                  const isExpanded = expandedReciboId === item.id;
                  const singlePendingPago = pagos.length === 1 && pagos[0].estado === 'Pendiente' ? pagos[0] : null;
                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        className={`table-row-hover ${isMultiple ? 'table-row-clickable' : ''}`}
                        onClick={isMultiple ? () => setExpandedReciboId(isExpanded ? null : item.id) : undefined}
                      >
                        <td className="font-bold">#{item.id}</td>
                        <td className="text-muted">{formatDate(item.fecha)}</td>
                        <td><span className="venta-tag">#{item.venta}</span></td>
                        <td className="text-muted">{item.vendedor_nombre || '-'}</td>
                        <td>
                          <div className="method-cell">
                            <PaymentIcon method={item.metodo_pago} />
                            <span>{item.metodo_pago}</span>
                          </div>
                        </td>
                        <td className="text-right font-mono">{formatCurrency(item.valor)}</td>
                        <td className="note-cell" title={item.nota}>{item.nota || '—'}</td>
                        <td>
                          <Badge tone={item.estado.toLowerCase() === 'confirmado' ? 'success' : item.estado.toLowerCase() === 'anulado' ? 'danger' : item.estado.toLowerCase() === 'parcial' ? 'info' : 'warning'}>
                            {item.estado}
                          </Badge>
                        </td>
                        <td className="actions-cell">
                          {singlePendingPago && hasPermission('APROBAR_RECIBO') && (
                            <button
                              className="action-btn confirm"
                              onClick={(e) => { e.stopPropagation(); setConfirmTarget({ recibo: item, pago: singlePendingPago }); setShowConfirmModal(true); }}
                              title="Confirmar Ingreso"
                            >
                              <FaCheckCircle />
                            </button>
                          )}
                          {isMultiple && (
                            <button
                              className="action-btn"
                              onClick={(e) => { e.stopPropagation(); setExpandedReciboId(isExpanded ? null : item.id); }}
                              title="Ver pagos"
                            >
                              <FaChevronDown style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                            </button>
                          )}
                        </td>
                      </tr>
                      {isMultiple && isExpanded && (
                        <tr className="expanded-row">
                          <td colSpan="9">
                            <div className="rc-pagos-detail">
                              {pagos.map(pago => (
                                <div key={pago.id} className="rc-pago-detail-row">
                                  <PaymentIcon method={pago.metodo_pago} />
                                  <span className="rc-pago-detail-metodo">{pago.metodo_pago}</span>
                                  <span className="rc-pago-detail-valor font-mono">{formatCurrency(pago.valor)}</span>
                                  <Badge tone={pago.estado === 'Confirmado' ? 'success' : 'warning'}>{pago.estado}</Badge>
                                  {pago.estado === 'Pendiente' && hasPermission('APROBAR_RECIBO') && (
                                    <button
                                      className="action-btn confirm"
                                      onClick={() => { setConfirmTarget({ recibo: item, pago }); setShowConfirmModal(true); }}
                                      title="Confirmar este pago"
                                    >
                                      <FaCheckCircle />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr><td colSpan="9" className="empty-state">No se encontraron recibos.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Transaction List View */}
        <div className="mobile-transaction-list">
          {isLoading ? (
            <div className="loading-spinner"></div>
          ) : sortedRecibosData.length > 0 ? (
            sortedRecibosData.map((item) => {
              const pagos = item.pagos || [];
              const isMultiple = pagos.length > 1;
              const singlePendingPago = pagos.length === 1 && pagos[0].estado === 'Pendiente' ? pagos[0] : null;
              return (
                <div className="transaction-card" key={item.id}>
                  <div className="card-left">
                    <PaymentIcon method={item.metodo_pago} />
                    <div className="card-info">
                      <div className="card-title">Recibo #{item.id}</div>
                      <div className="card-subtitle">{formatDate(item.fecha)} • Venta #{item.venta}{item.vendedor_nombre ? ` • ${item.vendedor_nombre}` : ''}</div>
                    </div>
                  </div>
                  <div className="card-right">
                    <div className="card-amount">{formatCurrency(item.valor)}</div>
                    <span className={`status-dot ${item.estado.toLowerCase()}`}></span>
                  </div>
                  {singlePendingPago && usuario?.role === 'administrador' && (
                    <button className="mobile-confirm-btn" onClick={() => { setConfirmTarget({ recibo: item, pago: singlePendingPago }); setShowConfirmModal(true); }}>
                      Confirmar
                    </button>
                  )}
                  {isMultiple && (
                    <div className="rc-pagos-detail" style={{ marginTop: '0.5rem' }}>
                      {pagos.map(pago => (
                        <div key={pago.id} className="rc-pago-detail-row">
                          <PaymentIcon method={pago.metodo_pago} />
                          <span className="rc-pago-detail-metodo">{pago.metodo_pago}</span>
                          <span className="rc-pago-detail-valor font-mono">{formatCurrency(pago.valor)}</span>
                          <Badge tone={pago.estado === 'Confirmado' ? 'success' : 'warning'}>{pago.estado}</Badge>
                          {pago.estado === 'Pendiente' && usuario?.role === 'administrador' && (
                            <button className="mobile-confirm-btn" onClick={() => { setConfirmTarget({ recibo: item, pago }); setShowConfirmModal(true); }}>
                              Confirmar
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
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

      {confirmTarget && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmRecibo}
          title="Confirmar Pago"
          isLoading={isSubmitting}
        >
          <div className="rc-confirm-container">
            <div className="rc-confirm-row">
              <span className="rc-confirm-label">N° Recibo</span>
              <span className="rc-confirm-val font-mono">#{confirmTarget.recibo.id}</span>
            </div>
            <div className="rc-confirm-row">
              <span className="rc-confirm-label">Valor del Pago</span>
              <span className="rc-confirm-val amount">{formatCurrency(confirmTarget.pago.valor)}</span>
            </div>
            <div className="rc-confirm-row">
              <span className="rc-confirm-label">Método de Pago</span>
              <span className="rc-confirm-val method">
                <PaymentIcon method={confirmTarget.pago.metodo_pago} />
                {confirmTarget.pago.metodo_pago || 'N/A'}
              </span>
            </div>
            {confirmTarget.recibo.venta && (
              <div className="rc-confirm-row">
                <span className="rc-confirm-label">Venta Asociada</span>
                <span className="rc-confirm-val">Venta #{confirmTarget.recibo.venta}</span>
              </div>
            )}
            {confirmTarget.recibo.fecha && (
              <div className="rc-confirm-row">
                <span className="rc-confirm-label">Fecha</span>
                <span className="rc-confirm-val">{confirmTarget.recibo.fecha}</span>
              </div>
            )}
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default RecibosCaja;