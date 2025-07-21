import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import './Caja.css';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { FaFileExport, FaPlus, FaSearch, FaUndo, FaLock } from 'react-icons/fa';
import debounce from 'lodash.debounce';
import AppNotification from '../components/AppNotification';
import '../components/AppNotification.css';
import CierreCajaModal from '../components/CierreCajaModal';

// Modal para creación de movimientos
const CreateCajaModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const [formState, setFormState] = useState({ tipo: 'ingreso', concepto: '', valor: '' });

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
            <input type="number" name="valor" value={formState.valor} onChange={handleChange} required min="0" step="any" placeholder="$50000" />
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
  const location = useLocation();
  const [cajaData, setCajaData] = useState([]);
  const [stats, setStats] = useState({ ingresos_hoy: 0, egresos_hoy: 0, saldo_actual: 0 }); // Estado para estadísticas
  const [filters, setFilters] = useState({ fecha_inicio: '', fecha_fin: '', query: '' });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 30;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  // ... (el resto de los hooks y funciones no cambian hasta fetchData)

  const fetchData = useCallback(async (filters, page) => {
    setIsLoading(true);
    const token = localStorage.getItem("accessToken");
    const params = { page, page_size: pageSize, ...filters };
    Object.keys(params).forEach(key => (params[key] === '' || params[key] === null) && delete params[key]);

    try {
      // Usar el nuevo endpoint de dashboard
      const response = await axios.get('http://127.0.0.1:8000/api/caja/dashboard/', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      // Actualizar ambos estados
      setStats(response.data.stats);
      setCajaData(response.data.movimientos.results || []);
      setTotalPages(Math.ceil(response.data.movimientos.count / pageSize) || 1);
    } catch (error) {
      setNotification({ message: 'Error al cargar los datos de Caja.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  // ... (el resto del componente no cambia hasta el return)

  return (
    <div className="page-container">
      <AppNotification 
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      {/* Sección de Estadísticas */}
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
        {/* ... (filtros y botones se mantienen igual) ... */}
      </div>

      {/* ... (la tabla y el resto del componente se mantienen igual) ... */}
    </div>
  );
};

export default Caja;
