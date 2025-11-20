import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../AppContext';
import './Caja.css';
import API from '../services/api';
import * as XLSX from 'xlsx';
import { FaFileExport, FaPlus, FaSearch, FaUndo, FaLock } from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import '../components/AppNotification.css';
import CierreCajaModal from '../components/CierreCajaModal';

// Modal para creación de movimientos
const CreateCajaModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const [formState, setFormState] = useState({ tipo: 'ingreso', concepto: '', valor: '' });

  useEffect(() => {
    if (isOpen) {
      setFormState({ tipo: 'ingreso', concepto: '', valor: '' });
    }
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
      <div className="modal-content">
        <div className="modal-header">
          <h3>Nuevo Movimiento de Caja</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tipo de Movimiento</label>
            <select name="tipo" value={formState.tipo} onChange={handleChange} required>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
          </div>
          <div className="form-group">
            <label>Concepto</label>
            <input type="text" name="concepto" value={formState.concepto} onChange={handleChange} required placeholder="Ej: Abono OC-123" />
          </div>
          <div className="form-group">
            <label>Valor</label>
            <input type="number" name="valor" value={formState.valor} onChange={handleChange} required step="any" placeholder="$50000" />
          </div>
          <button type="submit" className="modal-submit" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Crear Movimiento'}
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
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
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
      setNotification({ message: 'Error al cargar los datos de Caja.', type: 'error' });
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
      setNotification({ message: 'Movimiento creado exitosamente.', type: 'success' });
      setIsCreateModalOpen(false);
      fetchData(1, filters);
    } catch (error) {
      setNotification({ message: 'Error al crear el movimiento.', type: 'error' });
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
      setNotification({ message: 'Error al realizar el cierre de caja.', type: 'error' });
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
    const params = { page_size: 9999, ...filters };
    Object.keys(params).forEach(key => (params[key] === '' || params[key] === null) && delete params[key]);

    try {
      const response = await API.get(`/caja/`, { params });
      const dataToExport = (response.data.movimientos.results || []).map(item => ({
        ID: item.id,
        Usuario: item.usuario_nombre,
        'Fecha y Hora': formatDateTime(item.fecha_hora),
        Concepto: item.concepto,
        Tipo: item.tipo,
        Valor: formatCurrencyForExport(item.valor),
        'Total Acumulado': formatCurrencyForExport(item.total_acumulado)
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos de Caja');
      XLSX.writeFile(workbook, 'movimientos-caja.xlsx');
      setNotification({ message: 'Datos exportados exitosamente.', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Error al exportar los datos.', type: 'error' });
    }
  };

  return (
    <div className="page-container">
      <AppNotification 
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      <div className="stats-container">
        <div className="stat-card">
          <h4>Ingresos de Hoy</h4>
          <p>{formatCurrency(stats.ingresos_hoy)}</p>
        </div>
        <div className="stat-card">
          <h4>Egresos de Hoy</h4>
          <p>{formatCurrency(stats.egresos_hoy)}</p>
        </div>
        <div className="stat-card saldo">
          <h4>Saldo Actual en Caja</h4>
          <p>{formatCurrency(stats.saldo_actual)}</p>
        </div>
      </div>
      
      <div className="page-header">
        <div className="filters-group">
          <input type="text" className="search-input" name="query" placeholder="Buscar por ID o concepto..." value={filters.query} onChange={handleFilterChange} />
          <input type="date" name="fecha_inicio" value={filters.fecha_inicio} onChange={handleFilterChange} />
          <input type="date" name="fecha_fin" value={filters.fecha_fin} onChange={handleFilterChange} />
          <button className="btn-secondary btn-icon-only" onClick={clearFilters} title="Limpiar filtros"><FaUndo /></button>
        </div>
        <div className="actions-group">
          {usuario?.role === 'administrador' && <button className="btn-secondary" onClick={exportData}><FaFileExport /> Exportar</button>}
          <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}><FaPlus /> Nuevo Movimiento</button>
          <button className="btn-secondary" onClick={() => setIsCierreModalOpen(true)}><FaLock /> Cierre de Caja</button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table caja-table">
          <thead>
            <tr>
              <th className="th-caja-id">ID</th>
              <th className="th-caja-usuario">Usuario</th>
              <th className="th-caja-fecha">Fecha y Hora</th>
              <th className="th-caja-concepto">Concepto</th>
              <th className="th-caja-tipo">Tipo</th>
              <th className="th-caja-valor">Valor</th>
              <th className="th-caja-total">Total Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7"><div className="loading-container"><div className="loader"></div></div></td></tr>
            ) : cajaData.length > 0 ? (
              cajaData.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.usuario_nombre}</td>
                  <td>{formatDateTime(item.fecha_hora)}</td>
                  <td>{item.concepto}</td>
                  <td><span className={`tipo-badge tipo-${item.tipo}`}>{item.tipo}</span></td>
                  <td className={`valor-cell ${item.tipo}`}>{formatCurrency(item.valor)}</td>
                  <td>{formatCurrency(item.total_acumulado)}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" className="empty-cell">No hay movimientos de caja para mostrar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-container">
        <button disabled={currentPage === 1 || isLoading} onClick={() => setCurrentPage(currentPage - 1)}>Anterior</button>
        <span>Página {currentPage} de {totalPages}</span>
        <button disabled={currentPage === totalPages || totalPages <= 1 || isLoading} onClick={() => setCurrentPage(currentPage + 1)}>Siguiente</button>
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