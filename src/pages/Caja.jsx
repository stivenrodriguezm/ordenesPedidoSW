import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../AppContext';
import './Caja.css';
import API from '../services/api';
import * as XLSX from 'xlsx';
import {
  FaFileExport,
  FaPlus,
  FaUndo,
  FaLock,
  FaSearch,
  FaArrowUp,
  FaArrowDown,
  FaExchangeAlt,
  FaWallet,
  FaCalendarDay,
  FaChartLine,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import CierreCajaModal from '../components/CierreCajaModal';

// --- Helper Components ---

const TransactionIcon = ({ type }) => {
  if (type === 'ingreso') return <div className="icon-wrapper income"><FaArrowUp /></div>;
  if (type === 'egreso') return <div className="icon-wrapper expense"><FaArrowDown /></div>;
  return <div className="icon-wrapper closure"><FaLock /></div>;
};

const CreateCajaModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const [formState, setFormState] = useState({ tipo: 'ingreso', concepto: '', valor: '' });

  useEffect(() => {
    if (isOpen) setFormState({ tipo: 'ingreso', concepto: '', valor: '' });
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formState);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content premium-modal">
        <div className="modal-header">
          <h3>Nuevo Movimiento</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="premium-form">
          <div className="form-group">
            <label>Tipo de Movimiento</label>
            <div className="type-selector">
              <button
                type="button"
                className={`type-btn income ${formState.tipo === 'ingreso' ? 'active' : ''}`}
                onClick={() => setFormState(prev => ({ ...prev, tipo: 'ingreso' }))}
              >
                <FaArrowUp /> Ingreso
              </button>
              <button
                type="button"
                className={`type-btn expense ${formState.tipo === 'egreso' ? 'active' : ''}`}
                onClick={() => setFormState(prev => ({ ...prev, tipo: 'egreso' }))}
              >
                <FaArrowDown /> Egreso
              </button>
            </div>
            <input type="hidden" name="tipo" value={formState.tipo} />
          </div>

          <div className="form-group">
            <label>Concepto</label>
            <input
              type="text"
              name="concepto"
              value={formState.concepto}
              onChange={handleChange}
              required
              placeholder="Ej: Pago de servicios, Abono..."
              className="premium-input"
            />
          </div>

          <div className="form-group">
            <label>Valor</label>
            <div className="input-with-icon">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                name="valor"
                value={formState.valor}
                onChange={handleChange}
                required
                step="any"
                placeholder="0.00"
                className="premium-input"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary full-width" disabled={isLoading}>
            {isLoading ? 'Procesando...' : 'Registrar Movimiento'}
          </button>
        </form>
      </div>
    </div>
  );
};

const Caja = () => {
  const { usuario } = useContext(AppContext);
  const location = useLocation();
  const [cajaData, setCajaData] = useState([]);
  const [stats, setStats] = useState({ ingresos_hoy: 0, egresos_hoy: 0, saldo_actual: 0 });
  const [filters, setFilters] = useState({ fecha_inicio: '', fecha_fin: '', query: '' });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 30;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

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

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '—';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fetchData = useCallback(async (page, currentFilters) => {
    setIsLoading(true);
    const params = { page, page_size: pageSize, ...currentFilters };
    Object.keys(params).forEach(key => (params[key] === '' || params[key] === null) && delete params[key]);

    try {
      const response = await API.get(`/caja/`, { params });
      setStats(response.data.stats);
      setCajaData(response.data.movimientos.results || []);
      setTotalPages(Math.ceil(response.data.movimientos.count / pageSize) || 1);
    } catch (error) {
      setNotification({ message: 'Error al cargar datos.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchData(currentPage, filters);
  }, [currentPage, filters, fetchData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ fecha_inicio: '', fecha_fin: '', query: '' });
    setCurrentPage(1);
  };

  const handleCreateMovimiento = async (movimientoData) => {
    setIsSubmitting(true);
    try {
      await API.post(`/caja/`, movimientoData);
      setNotification({ message: 'Movimiento registrado.', type: 'success' });
      setIsCreateModalOpen(false);
      fetchData(1, filters);
    } catch (error) {
      setNotification({ message: 'Error al crear movimiento.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCierreCaja = async (cierreData) => {
    setIsSubmitting(true);
    try {
      await API.post(`/caja/cierre/`, cierreData);
      setNotification({ message: 'Cierre de caja exitoso.', type: 'success' });
      setIsCierreModalOpen(false);
      fetchData(1, filters);
    } catch (error) {
      setNotification({ message: 'Error al realizar cierre.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportData = async () => {
    const params = { page_size: 9999, ...filters };
    Object.keys(params).forEach(key => (params[key] === '' || params[key] === null) && delete params[key]);

    try {
      const response = await API.get(`/caja/`, { params });
      const dataToExport = (response.data.movimientos.results || []).map(item => ({
        ID: item.id,
        Usuario: item.usuario_nombre,
        'Fecha': formatDateTime(item.fecha_hora),
        Concepto: item.concepto,
        Tipo: item.tipo,
        Valor: item.valor,
        'Total Acumulado': item.total_acumulado
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');
      XLSX.writeFile(workbook, 'Caja_Movimientos.xlsx');
      setNotification({ message: 'Exportación exitosa.', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Error al exportar.', type: 'error' });
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
      <div className="stats-dashboard">
        <div className="stat-card income">
          <div className="stat-icon"><FaArrowUp /></div>
          <div className="stat-content">
            <span className="stat-label">Ingresos Hoy</span>
            <span className="stat-value">{formatCurrency(stats.ingresos_hoy)}</span>
          </div>
        </div>
        <div className="stat-card expense">
          <div className="stat-icon"><FaArrowDown /></div>
          <div className="stat-content">
            <span className="stat-label">Egresos Hoy</span>
            <span className="stat-value">{formatCurrency(stats.egresos_hoy)}</span>
          </div>
        </div>
        <div className="stat-card balance">
          <div className="stat-icon"><FaWallet /></div>
          <div className="stat-content">
            <span className="stat-label">Saldo Actual</span>
            <span className="stat-value">{formatCurrency(stats.saldo_actual)}</span>
          </div>
        </div>
      </div>

      <div className="glass-header">
        <div className="header-top-row">
          <h1 className="page-title">Movimientos de Caja</h1>
          <div className="header-actions">
            {usuario?.role === 'administrador' && (
              <button className="btn-ghost" onClick={exportData} title="Exportar">
                <FaFileExport />
              </button>
            )}
            <button className="btn-secondary-glow" onClick={() => setIsCierreModalOpen(true)}>
              <FaLock />
              <span className="long-text">Cierre Caja</span>
              <span className="short-text">Cierre</span>
            </button>
            <button className="btn-primary-glow" onClick={() => setIsCreateModalOpen(true)}>
              <FaPlus />
              <span className="long-text">Nuevo Movimiento</span>
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
              placeholder="Buscar..."
              value={filters.query}
              onChange={handleFilterChange}
            />
          </div>
          <div className="date-range-pill">
            <input type="date" name="fecha_inicio" value={filters.fecha_inicio} onChange={handleFilterChange} />
            <span>a</span>
            <input type="date" name="fecha_fin" value={filters.fecha_fin} onChange={handleFilterChange} />
          </div>
          {(filters.query || filters.fecha_inicio) && (
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
                <th>ID</th>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Concepto</th>
                <th>Tipo</th>
                <th className="text-right">Valor</th>
                <th className="text-right">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td colSpan="7"><div className="skeleton-bar"></div></td>
                  </tr>
                ))
              ) : cajaData.length > 0 ? (
                cajaData.map((item) => (
                  <tr key={item.id} className="table-row-hover">
                    <td className="font-bold">#{item.id}</td>
                    <td className="text-muted">{formatDateTime(item.fecha_hora)}</td>
                    <td>{item.usuario_nombre}</td>
                    <td className="concept-cell">{item.concepto}</td>
                    <td>
                      <span className={`type-badge ${item.tipo}`}>
                        {item.tipo === 'ingreso' ? <FaArrowUp /> : item.tipo === 'egreso' ? <FaArrowDown /> : <FaLock />}
                        {item.tipo}
                      </span>
                    </td>
                    <td className={`text-right font-mono value-${item.tipo}`}>
                      {item.tipo === 'egreso' ? '-' : '+'}{formatCurrency(item.valor)}
                    </td>
                    <td className="text-right font-mono text-muted">{formatCurrency(item.total_acumulado)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" className="empty-state">No hay movimientos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Transaction Feed */}
        <div className="mobile-transaction-feed">
          {isLoading ? (
            <div className="loading-spinner"></div>
          ) : cajaData.length > 0 ? (
            cajaData.map((item) => (
              <div className="transaction-card" key={item.id}>
                <div className="card-left">
                  <TransactionIcon type={item.tipo} />
                  <div className="card-info">
                    <div className="card-concept">{item.concepto}</div>
                    <div className="card-meta">
                      {formatDateTime(item.fecha_hora)} • {item.usuario_nombre}
                    </div>
                  </div>
                </div>
                <div className="card-right">
                  <div className={`card-amount value-${item.tipo}`}>
                    {item.tipo === 'egreso' ? '-' : '+'}{formatCurrency(item.valor)}
                  </div>
                  <div className="card-balance">
                    Saldo: {formatCurrency(item.total_acumulado)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state-mobile">Sin movimientos.</div>
          )}
        </div>
      </div>

      <div className="pagination-bar">
        <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>
          <FaChevronLeft />
        </button>
        <span className="pagination-info">Página {currentPage} de {totalPages}</span>
        <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)}>
          <FaChevronRight />
        </button>
      </div>

      <CreateCajaModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateMovimiento}
        isLoading={isSubmitting}
      />

      <CierreCajaModal
        isOpen={isCierreModalOpen}
        onClose={() => setIsCierreModalOpen(false)}
        onSave={handleCierreCaja}
        saldoActual={stats.saldo_actual}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default Caja;