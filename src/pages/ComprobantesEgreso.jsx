import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext } from '../AppContext';
import './ComprobantesEgreso.css';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { FaFileExport, FaPlus, FaSearch, FaUndo } from 'react-icons/fa';
import debounce from 'lodash.debounce';
import AppNotification from '../components/AppNotification';

import Modal from '../components/Modal';

// Componente de Modal para la creación de Comprobantes de Egreso
const CreateCEModal = ({ isOpen, onClose, onSave, mediosPago, proveedores, isLoading }) => {
  const [newCE, setNewCE] = useState({ id: '', fecha: '', medio_pago: '', proveedor: '', valor: '', descripcion: '', concepto: '' });

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const formattedToday = `${year}-${month}-${day}`;
      setNewCE(prev => ({ ...prev, fecha: formattedToday, medio_pago: '', proveedor: '', valor: '', descripcion: '', concepto: '' }));
    }
  }, [isOpen]);

  const handleChange = (e) => setNewCE({ ...newCE, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); onSave(newCE); };

  if (!isOpen) return null;

  return (
    <Modal show={isOpen} onClose={onClose} title="Nuevo Comprobante de Egreso">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>CE:</label>
          <input type="text" name="id" value={newCE.id} onChange={handleChange} required placeholder="Ingresa el ID del comprobante" />
        </div>
        <div className="form-group">
          <label>Fecha:</label>
          <input type="date" name="fecha" value={newCE.fecha} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Concepto:</label>
          <input type="text" name="concepto" value={newCE.concepto} onChange={handleChange} required placeholder="Ej: Pago de factura 123" />
        </div>
        <div className="form-group">
          <label>Medio de pago:</label>
          <select name="medio_pago" value={newCE.medio_pago} onChange={handleChange} required>
            <option value="">Elegir medio de pago</option>
            {mediosPago.map((medio) => (<option key={medio.value} value={medio.value}>{medio.label}</option>))}
          </select>
        </div>
        <div className="form-group">
          <label>Proveedor:</label>
          <select name="proveedor" value={newCE.proveedor} onChange={handleChange} required>
            <option value="">Elegir proveedor</option>
            {Array.isArray(proveedores) && proveedores.map((proveedor) => (<option key={proveedor.id} value={proveedor.id}>{proveedor.nombre_empresa}</option>))}
          </select>
        </div>
        <div className="form-group">
          <label>Valor:</label>
          <input type="number" name="valor" value={newCE.valor} onChange={handleChange} required min="0" step="any" />
        </div>
        <div className="form-group">
          <label>Descripción:</label>
          <textarea name="descripcion" value={newCE.descripcion} onChange={handleChange} placeholder="Escribe una nota (opcional)" rows="3" />
        </div>
        <button type="submit" className="modal-submit" disabled={isLoading}>
          {isLoading ? 'Creando...' : 'Crear'}
        </button>
      </form>
    </Modal>
  );
};


const ComprobantesEgreso = () => {
  const { proveedores, isLoadingProveedores } = useContext(AppContext);
  const location = useLocation();
  const [comprobantesData, setComprobantesData] = useState([]);
  const [filters, setFilters] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    medio_pago: '',
    proveedor: '',
    query: ''
  });
  
  const [isCreatingCE, setIsCreatingCE] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 30;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Para el estado de envío de formularios
  const [notification, setNotification] = useState({ message: '', type: '' });

  const mediosPago = [
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Transferencia', label: 'Transferencia' }
  ];

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
    const token = localStorage.getItem("accessToken");
    
    const params = { page, page_size: pageSize };
    for (const key in filters) {
      if (filters[key]) {
        params[key] = filters[key];
      }
    }

    try {
      const response = await axios.get('http://127.0.0.1:8000/api/comprobantes-egreso/', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setComprobantesData(response.data.results || []);
      setTotalPages(Math.ceil(response.data.count / pageSize) || 1);
    } catch (error) {
      setNotification({ message: 'Error al cargar los comprobantes.', type: 'error' });
      setComprobantesData([]);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  const debouncedFetch = useMemo(() => debounce(fetchData, 300), [fetchData]);

  useEffect(() => {
    debouncedFetch(filters, currentPage);
    return () => debouncedFetch.cancel();
  }, [currentPage, filters, debouncedFetch]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') {
      setIsCreatingCE(true);
    }
  }, [location]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };
  
  const clearFilters = () => {
    setFilters({
      fecha_inicio: '',
      fecha_fin: '',
      medio_pago: '',
      proveedor: '',
      query: ''
    });
    setCurrentPage(1);
  };

  const exportData = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/comprobantes-egreso/?page_size=1000', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = (response.data.results || []).map(item => ({
        ID: item.id,
        Fecha: formatDate(item.fecha),
        Proveedor: item.proveedor_nombre || '-',
        'Medio de Pago': mediosPago.find(medio => medio.value === item.medio_pago)?.label || item.medio_pago,
        Valor: formatCurrency(item.valor),
        Concepto: item.concepto || '-',
        Descripción: item.descripcion || '-'
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Comprobantes de Egreso');
      XLSX.writeFile(workbook, 'comprobantes-egreso.xlsx');
      setNotification({ message: 'Datos exportados exitosamente.', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Error al exportar los datos.', type: 'error' });
    }
  };

  const handleCreateCE = async (ceData) => {
    setIsSubmitting(true);
    setNotification({ message: '', type: '' });
    const token = localStorage.getItem("accessToken");
    try {
      await axios.post('http://127.0.0.1:8000/api/comprobantes-egreso/crear/', ceData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotification({ message: 'Comprobante de Egreso creado exitosamente.', type: 'success' });
      setIsCreatingCE(false);
      fetchData(filters, 1); // Refrescar datos en la página 1
    } catch (error) {
       const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Error al crear el comprobante.';
       setNotification({ message: errorMsg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreatingCE(true);
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
          <input type="text" className="search-input" name="query" placeholder="Buscar por CE o Proveedor..." value={filters.query} onChange={handleFilterChange} />
          <input type="date" name="fecha_inicio" value={filters.fecha_inicio} onChange={handleFilterChange} />
          <input type="date" name="fecha_fin" value={filters.fecha_fin} onChange={handleFilterChange} />
          <select name="medio_pago" value={filters.medio_pago} onChange={handleFilterChange}>
            <option value="">Medio de pago</option>
            {mediosPago.map((medio) => (<option key={medio.value} value={medio.value}>{medio.label}</option>))}
          </select>
          {/* <select name="proveedor" value={filters.proveedor} onChange={handleFilterChange} disabled={isLoadingProveedores}>
            <option value="">Proveedor</option>
            {Array.isArray(proveedores) && proveedores.map((proveedor) => (<option key={proveedor.id} value={proveedor.id}>{proveedor.nombre_empresa}</option>))}
          </select> */}
          <button className="btn-secondary btn-icon-only" onClick={clearFilters} title="Limpiar filtros"><FaUndo /></button>
        </div>
        <div className="actions-group">
          <button className="btn-secondary" onClick={exportData}><FaFileExport /> Exportar</button>
          <button className="btn-primary" onClick={handleOpenCreateModal}><FaPlus /> Nuevo Comprobante</button>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table ce-table">
          <thead>
            <tr>
              <th className="th-ce-id">CE</th>
              <th className="th-ce-fecha">Fecha</th>
              <th className="th-ce-proveedor">Proveedor</th>
              <th className="th-ce-concepto">Concepto</th>
              <th className="th-ce-metodo">Medio de Pago</th>
              <th className="th-ce-valor">Valor</th>
              <th className="th-ce-descripcion">Descripción</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7"><div className="loading-container"><div className="loader"></div><p>Cargando comprobantes...</p></div></td></tr>
            ) : comprobantesData.length > 0 ? (
              comprobantesData.map((item) => (
                <tr key={item.id}>
                  <td className="td-ce-id">{item.id}</td>
                  <td className="td-ce-fecha">{formatDate(item.fecha)}</td>
                  <td className="td-ce-proveedor">{item.proveedor_nombre || '—'}</td>
                  <td className="td-ce-concepto">{item.concepto || '—'}</td>
                  <td className="td-ce-metodo">{mediosPago.find(medio => medio.value === item.medio_pago)?.label || (item.medio_pago ? item.medio_pago.charAt(0).toUpperCase() + item.medio_pago.slice(1) : '—')}</td>
                  <td className="td-ce-valor td-valor">{formatCurrency(item.valor)}</td>
                  <td className="td-ce-descripcion">{item.descripcion || '—'}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" className="empty-cell">No hay comprobantes de egreso para mostrar.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="pagination-container">
        <button disabled={currentPage === 1 || isLoading} onClick={() => setCurrentPage(currentPage - 1)}>Anterior</button>
        <span>Página {currentPage} de {totalPages}</span>
        <button disabled={currentPage === totalPages || totalPages <= 1 || isLoading} onClick={() => setCurrentPage(currentPage + 1)}>Siguiente</button>
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