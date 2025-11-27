import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../AppContext';
import './ComprobantesEgreso.css';
import API from '../services/api';
import * as XLSX from 'xlsx';
import {
  FaFileExport,
  FaPlus,
  FaSearch,
  FaUndo,
  FaArrowDown,
  FaMoneyBillWave,
  FaUniversity,
  FaCreditCard,
  FaCalendarDay,
  FaReceipt
} from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import Modal from '../components/Modal';

// --- Helper Components ---

const PaymentIcon = ({ method }) => {
  const m = method ? method.toLowerCase() : '';
  if (m.includes('efectivo')) return <div className="payment-icon-wrapper cash"><FaMoneyBillWave /></div>;
  if (m.includes('transferencia') || m.includes('bancolombia')) return <div className="payment-icon-wrapper bank"><FaUniversity /></div>;
  return <div className="payment-icon-wrapper other"><FaCreditCard /></div>;
};

const CreateCEModal = ({ isOpen, onClose, onSave, mediosPago, proveedores, isLoading }) => {
  const [newCE, setNewCE] = useState({ id: '', fecha: '', medio_pago: '', proveedor: '', valor: '', descripcion: '', concepto: '' });

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      setNewCE({
        id: '',
        fecha: `${year}-${month}-${day}`,
        medio_pago: '',
        proveedor: '',
        valor: '',
        descripcion: '',
        concepto: ''
      });
    }
  }, [isOpen]);

  const handleChange = (e) => setNewCE({ ...newCE, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); onSave(newCE); };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content premium-modal">
        <div className="modal-header">
          <h3>Nuevo Comprobante</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="premium-form">
          <div className="form-row">
            <div className="form-group half">
              <label>No. Comprobante</label>
              <input type="text" name="id" value={newCE.id} onChange={handleChange} required placeholder="CE-000" className="premium-input" />
            </div>
            <div className="form-group half">
              <label>Fecha</label>
              <input type="date" name="fecha" value={newCE.fecha} onChange={handleChange} required className="premium-input" />
            </div>
          </div>

          <div className="form-group">
            <label>Proveedor</label>
            <select name="proveedor" value={newCE.proveedor} onChange={handleChange} required className="premium-input">
              <option value="">Seleccionar Proveedor</option>
              {Array.isArray(proveedores) && proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre_empresa}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Concepto</label>
            <input type="text" name="concepto" value={newCE.concepto} onChange={handleChange} required placeholder="Ej: Pago Factura #123" className="premium-input" />
          </div>

          <div className="form-row">
            <div className="form-group half">
              <label>Medio de Pago</label>
              <select name="medio_pago" value={newCE.medio_pago} onChange={handleChange} required className="premium-input">
                <option value="">Seleccionar</option>
                {mediosPago.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
              </select>
            </div>
            <div className="form-group half">
              <label>Valor</label>
              <div className="input-with-icon">
                <span className="currency-symbol">$</span>
                <input type="number" name="valor" value={newCE.valor} onChange={handleChange} required min="0" step="any" placeholder="0.00" className="premium-input" />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Descripción (Opcional)</label>
            <textarea name="descripcion" value={newCE.descripcion} onChange={handleChange} placeholder="Detalles adicionales..." rows="2" className="premium-input" />
          </div>

          <button type="submit" className="btn-primary full-width" disabled={isLoading}>
            {isLoading ? 'Procesando...' : 'Crear Comprobante'}
          </button>
        </form>
      </div>
    </div>
  );
};

const ComprobantesEgreso = () => {
  const { proveedores, usuario } = useContext(AppContext);
  const location = useLocation();
  const [comprobantesData, setComprobantesData] = useState([]);
  const [filters, setFilters] = useState({ fecha_inicio: '', fecha_fin: '', medio_pago: '', proveedor: '', query: '' });
  const [isCreatingCE, setIsCreatingCE] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 30;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const mediosPago = [
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Transferencia', label: 'Transferencia' }
  ];

  const formatCurrency = (value) => {
    if (value === null || isNaN(value)) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
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
    Object.keys(params).forEach(key => !params[key] && delete params[key]);

    try {
      const response = await API.get(`/comprobantes-egreso/`, { params });
      setComprobantesData(response.data.results || []);
      setTotalPages(Math.ceil(response.data.count / pageSize) || 1);
    } catch (error) {
      setNotification({ message: 'Error al cargar datos.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchData(filters, currentPage);
  }, [filters, currentPage, fetchData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') setIsCreatingCE(true);
  }, [location]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ fecha_inicio: '', fecha_fin: '', medio_pago: '', proveedor: '', query: '' });
    setCurrentPage(1);
  };

  const handleCreateCE = async (ceData) => {
    setIsSubmitting(true);
    try {
      await API.post(`/comprobantes-egreso/crear/`, ceData);
      setNotification({ message: 'Comprobante creado exitosamente.', type: 'success' });
      setIsCreatingCE(false);
      fetchData(filters, 1);
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Error al crear.';
      setNotification({ message: errorMsg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportData = async () => {
    try {
      const response = await API.get(`/comprobantes-egreso/`, { params: { ...filters, page_size: 9999 } });
      const dataToExport = (response.data.results || []).map(item => ({
        ID: item.id,
        Fecha: formatDate(item.fecha),
        Proveedor: item.proveedor_nombre || '-',
        'Medio de Pago': item.medio_pago,
        Valor: item.valor,
        Concepto: item.concepto || '-',
        Descripción: item.descripcion || '-'
      }));
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Egresos');
      XLSX.writeFile(workbook, 'Comprobantes_Egreso.xlsx');
      setNotification({ message: 'Exportación exitosa.', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Error al exportar.', type: 'error' });
    }
  };

  // Calculate stats for current view
  const stats = useMemo(() => {
    const total = comprobantesData.reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
    return { total, count: comprobantesData.length };
  }, [comprobantesData]);

  return (
    <div className="comprobantes-page-container">
      <AppNotification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      {/* --- Live Stats Bar --- */}
      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-icon"><FaMoneyBillWave /></div>
          <div className="stat-info">
            <span className="stat-label">Total en Pantalla</span>
            <span className="stat-value">{formatCurrency(stats.total)}</span>
          </div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <div className="stat-icon secondary"><FaReceipt /></div>
          <div className="stat-info">
            <span className="stat-label">Registros</span>
            <span className="stat-value">{stats.count}</span>
          </div>
        </div>
      </div>

      <div className="glass-header">
        <div className="header-top-row">
          <h1 className="page-title">Comprobantes de Egreso</h1>
          <div className="header-actions">
            {usuario?.role === 'administrador' && (
              <button className="btn-ghost" onClick={exportData} title="Exportar">
                <FaFileExport />
              </button>
            )}
            <button className="btn-primary-glow" onClick={() => setIsCreatingCE(true)}>
              <FaPlus />
              <span className="long-text">Nuevo Comprobante</span>
              <span className="short-text">Nuevo</span>
            </button>
          </div>
        </div>

        <div className="filters-bar">
          <div className="search-pill">
            <FaSearch />
            <input type="text" name="query" placeholder="Buscar CE, Proveedor..." value={filters.query} onChange={handleFilterChange} />
          </div>
          <div className="date-range-pill">
            <input type="date" name="fecha_inicio" value={filters.fecha_inicio} onChange={handleFilterChange} />
            <span>a</span>
            <input type="date" name="fecha_fin" value={filters.fecha_fin} onChange={handleFilterChange} />
          </div>
          <div className="select-pill">
            <select name="medio_pago" value={filters.medio_pago} onChange={handleFilterChange}>
              <option value="">Todos los medios</option>
              {mediosPago.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
            </select>
          </div>
          {(filters.query || filters.fecha_inicio || filters.medio_pago) && (
            <button className="btn-reset" onClick={clearFilters}><FaUndo /></button>
          )}
        </div>
      </div>

      <div className="content-area">
        {/* Desktop Table */}
        <div className="desktop-table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th className="th-ce-id">CE</th>
                <th className="th-ce-fecha">Fecha</th>
                <th className="th-ce-proveedor">Proveedor</th>
                <th className="th-ce-concepto">Concepto</th>
                <th className="th-ce-metodo">Medio Pago</th>
                <th className="th-ce-valor text-right">Valor</th>
                <th className="th-ce-desc">Nota</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="skeleton-row"><td colSpan="7"><div className="skeleton-bar"></div></td></tr>
                ))
              ) : comprobantesData.length > 0 ? (
                comprobantesData.map((item) => (
                  <tr key={item.id} className="table-row-hover">
                    <td className="font-bold">#{item.id}</td>
                    <td className="text-muted">{formatDate(item.fecha)}</td>
                    <td>{item.proveedor_nombre || '—'}</td>
                    <td className="concept-cell">{item.concepto}</td>
                    <td>
                      <div className="method-cell">
                        <PaymentIcon method={item.medio_pago} />
                        <span>{item.medio_pago}</span>
                      </div>
                    </td>
                    <td className="text-right font-mono value-expense">
                      -{formatCurrency(item.valor)}
                    </td>
                    <td className="note-cell">{item.descripcion || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" className="empty-state">No se encontraron comprobantes.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Feed */}
        <div className="mobile-transaction-feed">
          {isLoading ? (
            <div className="loading-spinner">Cargando...</div>
          ) : comprobantesData.length > 0 ? (
            comprobantesData.map((item) => (
              <div className="transaction-card" key={item.id}>
                <div className="card-left">
                  <PaymentIcon method={item.medio_pago} />
                  <div className="card-info">
                    <div className="card-concept">{item.concepto}</div>
                    <div className="card-meta">
                      {formatDate(item.fecha)} • {item.proveedor_nombre}
                    </div>
                  </div>
                </div>
                <div className="card-right">
                  <div className="card-amount value-expense">
                    -{formatCurrency(item.valor)}
                  </div>
                  <div className="card-id">#{item.id}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state-mobile">Sin registros.</div>
          )}
        </div>
      </div>

      <div className="pagination-bar">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>Anterior</button>
        <span>{currentPage} / {totalPages}</span>
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)}>Siguiente</button>
      </div>

      <CreateCEModal
        isOpen={isCreatingCE}
        onClose={() => setIsCreatingCE(false)}
        onSave={handleCreateCE}
        mediosPago={mediosPago}
        proveedores={proveedores}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default ComprobantesEgreso;
