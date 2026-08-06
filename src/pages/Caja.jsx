import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext, usePermissions } from '../AppContext';
import './Caja.css';
import API from '../services/api';
import {
  FaFileExport,
  FaPlus,
  FaUndo,
  FaLock,
  FaSearch,
  FaArrowUp,
  FaArrowDown,
  FaCashRegister,
  FaWallet,
  FaChevronLeft,
  FaChevronRight,
  FaTimes
} from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import CierreCajaModal from '../components/CierreCajaModal';
import { PageHeader, Button, Badge, StatCard, Skeleton, LoadingBlock, EmptyState, Modal } from '../components/ui';

import { formatCOP } from '../utils/formatCOP';

// --- Helper Components ---

const tipoTone = (tipo) => {
  if (tipo === 'ingreso') return 'success';
  if (tipo === 'egreso') return 'danger';
  return 'neutral';
};

const TransactionIcon = ({ type }) => {
  if (type === 'ingreso') return <div className="caja-txn-icon caja-txn-icon--income"><FaArrowUp /></div>;
  if (type === 'egreso') return <div className="caja-txn-icon caja-txn-icon--expense"><FaArrowDown /></div>;
  return <div className="caja-txn-icon caja-txn-icon--closure"><FaLock /></div>;
};

const CreateCajaModal = ({ isOpen, onClose, onSave, saldoActual, isLoading }) => {
  const hasPermission = usePermissions();
  const initialType = hasPermission('CREAR_EGRESO_CAJA') ? 'egreso' : 'ingreso';
  const [formState, setFormState] = useState({ tipo: initialType, concepto: '', valor: '' });

  useEffect(() => {
    if (isOpen) {
      setFormState({ tipo: initialType, concepto: '', valor: '' });
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleValorChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setFormState(prev => ({ ...prev, valor: raw }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formState);
  };

  const numericVal = parseInt(formState.valor) || 0;
  const isExcedingBalance = formState.tipo === 'egreso' && numericVal > (saldoActual || 0);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Nuevo Movimiento"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="caja-create-form"
            loading={isLoading}
            disabled={!formState.concepto || numericVal <= 0 || isExcedingBalance}
          >
            Registrar Movimiento
          </Button>
        </>
      }
    >
      <p className="caja-form-subtitle ds-muted">Registra un egreso o ingreso directo en caja general.</p>
      {formState.tipo === 'egreso' && isExcedingBalance && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⚠️</span>
          <span>Saldo insuficiente en caja. Saldo disponible en efectivo: {formatCOP(saldoActual || 0)}.</span>
        </div>
      )}
      <form id="caja-create-form" onSubmit={handleSubmit} className="caja-form">
        {/* Tipo de Movimiento Toggle */}
        <div className="ds-field">
          <label className="ds-label">Tipo de Movimiento <span className="caja-req">*</span></label>
          <div className="caja-toggle-row">
            {hasPermission('CREAR_EGRESO_CAJA') && (
              <button
                type="button"
                className={`caja-toggle-btn ${formState.tipo === 'egreso' ? 'active' : ''}`}
                onClick={() => setFormState(prev => ({ ...prev, tipo: 'egreso' }))}
              >
                <FaArrowDown /> Egreso
              </button>
            )}
            {hasPermission('CREAR_INGRESO_CAJA') && (
              <button
                type="button"
                className={`caja-toggle-btn ${formState.tipo === 'ingreso' ? 'active' : ''}`}
                onClick={() => setFormState(prev => ({ ...prev, tipo: 'ingreso' }))}
              >
                <FaArrowUp /> Ingreso
              </button>
            )}
          </div>
          <input type="hidden" name="tipo" value={formState.tipo} />
        </div>

        {/* Concepto */}
        <div className="ds-field">
          <label className="ds-label">Concepto <span className="caja-req">*</span></label>
          <input
            type="text"
            name="concepto"
            value={formState.concepto}
            onChange={handleChange}
            required
            placeholder="Ej: Pago de servicios públicos, compra insumos..."
            className="ds-input"
          />
        </div>

        {/* Valor */}
        <div className="ds-field">
          <div className="caja-label-flex">
            <label className="ds-label">Valor Movimiento <span className="caja-req">*</span></label>
            {numericVal > 0 && (
              <span className="caja-val-preview">{formatCOP(numericVal)}</span>
            )}
          </div>
          <div className="caja-money">
            <span className="caja-money__prefix">$</span>
            <input
              type="text"
              name="valor"
              value={formState.valor ? formatCOP(numericVal).replace('$', '').trim() : ''}
              onChange={handleValorChange}
              required
              placeholder="0"
              className="ds-input caja-money__input"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

const Caja = () => {
  const { usuario } = useContext(AppContext);
  const hasPermission = usePermissions();
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
      const XLSX = await import('xlsx');
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
    <div className="ds-page caja-page ds-fade-in">
      <AppNotification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      <PageHeader
        icon={FaCashRegister}
        title="Movimientos de Caja"
        subtitle="Ingresos, egresos y cierres de la caja general"
        actions={
          <>
            {usuario?.role === 'administrador' && (
              <Button variant="secondary" icon={FaFileExport} onClick={exportData}>
                Exportar
              </Button>
            )}
            <Button variant="secondary" icon={FaLock} onClick={() => setIsCierreModalOpen(true)}>
              Cierre de Caja
            </Button>
            {(hasPermission('CREAR_INGRESO_CAJA') || hasPermission('CREAR_EGRESO_CAJA')) && (
              <Button icon={FaPlus} onClick={() => setIsCreateModalOpen(true)}>
                Nuevo Movimiento
              </Button>
            )}
          </>
        }
      />

      {/* --- Live Stats --- */}
      <section className="caja-stats">
        <StatCard icon={FaArrowUp} label="Ingresos Hoy" value={formatCurrency(stats.ingresos_hoy)} tone="success" />
        <StatCard icon={FaArrowDown} label="Egresos Hoy" value={formatCurrency(stats.egresos_hoy)} tone="danger" />
        <StatCard icon={FaWallet} label="Saldo Actual" value={formatCurrency(stats.saldo_actual)} tone="info" />
      </section>

      {/* --- Filtros --- */}
      <div className="ds-card caja-filters ds-fade-in" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
        <div className="v-filters-bar" style={{ margin: 0, flex: 1, overflow: 'visible', flexWrap: 'wrap' }}>
          <div className="v-search-pill">
            <FaSearch />
            <input
              type="text"
              name="query"
              placeholder="Buscar..."
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
          {(filters.query || filters.fecha_inicio || filters.fecha_fin) && (
            <button type="button" className="fct-clear-pill" onClick={clearFilters} title="Limpiar filtros">
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      <div className="caja-content">
        {/* Desktop Table View */}
        <div className="caja-table-desktop ds-table-wrap">
          <div className="ds-table-scroll">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th className="caja-num">Valor</th>
                  <th className="caja-num">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td><Skeleton width={40} /></td>
                      <td><Skeleton width={120} /></td>
                      <td><Skeleton width={80} /></td>
                      <td><Skeleton width={150} /></td>
                      <td><Skeleton width={70} height={22} /></td>
                      <td className="caja-num"><Skeleton width={80} style={{ marginLeft: 'auto' }} /></td>
                      <td className="caja-num"><Skeleton width={100} style={{ marginLeft: 'auto' }} /></td>
                    </tr>
                  ))
                ) : cajaData.length > 0 ? (
                  cajaData.map((item) => (
                    <tr key={item.id}>
                      <td><strong>#{item.id}</strong></td>
                      <td className="ds-muted">{formatDateTime(item.fecha_hora)}</td>
                      <td>{item.usuario_nombre}</td>
                      <td className="caja-concept-cell">{item.concepto}</td>
                      <td>
                        <Badge tone={tipoTone(item.tipo)}>
                          {item.tipo === 'ingreso' ? <FaArrowUp /> : item.tipo === 'egreso' ? <FaArrowDown /> : <FaLock />}
                          {item.tipo}
                        </Badge>
                      </td>
                      <td className={`caja-num caja-amount caja-amount--${item.tipo}`}>
                        {item.tipo === 'egreso' || parseFloat(item.valor) < 0 ? '-' : (parseFloat(item.valor) > 0 || item.tipo === 'ingreso' ? '+' : '')}{formatCurrency(Math.abs(parseFloat(item.valor) || 0))}
                      </td>
                      <td className="caja-num caja-amount ds-muted">{formatCurrency(item.total_acumulado)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="7" className="caja-empty-cell">No hay movimientos registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Transaction Feed */}
        <div className="caja-mobile-feed">
          {isLoading ? (
            <LoadingBlock message="Cargando movimientos..." />
          ) : cajaData.length > 0 ? (
            cajaData.map((item) => (
              <div className="caja-txn-card" key={item.id}>
                <div className="caja-txn-card__left">
                  <TransactionIcon type={item.tipo} />
                  <div className="caja-txn-card__info">
                    <div className="caja-txn-card__concept">{item.concepto}</div>
                    <div className="caja-txn-card__meta">
                      {formatDateTime(item.fecha_hora)} • {item.usuario_nombre}
                    </div>
                  </div>
                </div>
                <div className="caja-txn-card__right">
                  <div className={`caja-txn-card__amount caja-amount--${item.tipo}`}>
                    {item.tipo === 'egreso' || parseFloat(item.valor) < 0 ? '-' : (parseFloat(item.valor) > 0 || item.tipo === 'ingreso' ? '+' : '')}{formatCurrency(Math.abs(parseFloat(item.valor) || 0))}
                  </div>
                  <div className="caja-txn-card__balance">
                    Saldo: {formatCurrency(item.total_acumulado)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Sin movimientos" message="No hay movimientos registrados con los filtros actuales." />
          )}
        </div>
      </div>

      <div className="caja-pagination">
        <Button variant="secondary" size="sm" icon={FaChevronLeft} disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} aria-label="Página anterior" />
        <span className="caja-pagination__info">Página {currentPage} de {totalPages}</span>
        <Button variant="secondary" size="sm" icon={FaChevronRight} disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)} aria-label="Página siguiente" />
      </div>

      <CreateCajaModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateMovimiento}
        saldoActual={stats.saldo_actual}
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
