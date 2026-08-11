import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext, usePermissions } from '../AppContext';
import useDebounce from '../hooks/useDebounce';
import './ComprobantesEgreso.css';
import './VentasImprovements.css';
import API from '../services/api';
import { groupProductos } from '../utils/groupProductos';
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
  FaReceipt,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaBoxOpen,
  FaTimes,
  FaCheckCircle,
  FaPrint,
  FaStickyNote
} from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import Modal from '../components/Modal';
import ComprobanteEgresoPrintModal from '../components/ComprobanteEgresoPrintModal';
import { PageHeader, Button } from '../components/ui';

import { formatCOP } from '../utils/formatCOP';

// --- Helper Components ---

const PaymentIcon = ({ method }) => {
  const m = method ? method.toLowerCase() : '';
  if (m.includes('efectivo')) return <div className="payment-icon-wrapper cash"><FaMoneyBillWave /></div>;
  if (m.includes('transferencia') || m.includes('bancolombia')) return <div className="payment-icon-wrapper bank"><FaUniversity /></div>;
  return <div className="payment-icon-wrapper other"><FaCreditCard /></div>;
};

const ComprobantesEgreso = () => {
  const { proveedores, usuario } = useContext(AppContext);
  const navigate = useNavigate();
  const hasPermission = usePermissions();
  const [comprobantesData, setComprobantesData] = useState([]);
  const [expandedCEIds, setExpandedCEIds] = useState([]);

  const toggleExpandCE = (id) => {
    setExpandedCEIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Multi-select checklists state
  const [selectedProveedores, setSelectedProveedores] = useState([]);
  const [selectedEstados, setSelectedEstados] = useState([]);
  const [selectedMedios, setSelectedMedios] = useState([]);

  // Popover visibility
  const [isProveedoresOpen, setIsProveedoresOpen] = useState(false);
  const [isEstadosOpen, setIsEstadosOpen] = useState(false);
  const [isMediosOpen, setIsMediosOpen] = useState(false);

  // Search & date filters
  const [filters, setFilters] = useState({ fecha_inicio: '', fecha_fin: '', query: '' });
  const debouncedQuery = useDebounce(filters.query, 350);

  const filterBarRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 30;
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [printPreviewItem, setPrintPreviewItem] = useState(null);

  const mediosPago = [
    { value: 'Efectivo', label: 'Efectivo' },
    { value: 'Transferencia', label: 'Transferencia' },
    { value: 'Otro', label: 'Otro' }
  ];

  // Click outside listener for popovers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterBarRef.current && !filterBarRef.current.contains(event.target)) {
        setIsProveedoresOpen(false);
        setIsEstadosOpen(false);
        setIsMediosOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleProveedor = (id) => {
    setSelectedProveedores(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    setCurrentPage(1);
  };
  const selectAllProveedores = () => {
    const allIds = (proveedores || []).map(p => p.id);
    setSelectedProveedores(prev => prev.length === allIds.length ? [] : allIds);
    setCurrentPage(1);
  };

  const toggleEstado = (val) => {
    setSelectedEstados(prev => prev.includes(val) ? prev.filter(e => e !== val) : [...prev, val]);
    setCurrentPage(1);
  };
  const selectAllEstados = () => {
    const all = ['Pagado', 'Por Confirmar Pago'];
    setSelectedEstados(prev => prev.length === all.length ? [] : all);
    setCurrentPage(1);
  };

  const toggleMedio = (val) => {
    setSelectedMedios(prev => prev.includes(val) ? prev.filter(m => m !== val) : [...prev, val]);
    setCurrentPage(1);
  };
  const selectAllMedios = () => {
    const all = mediosPago.map(m => m.value);
    setSelectedMedios(prev => prev.length === all.length ? [] : all);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ fecha_inicio: '', fecha_fin: '', query: '' });
    setSelectedProveedores([]);
    setSelectedEstados([]);
    setSelectedMedios([]);
    setCurrentPage(1);
  };

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

  const fetchData = useCallback(async (page) => {
    setIsLoading(true);
    const params = {
      page,
      page_size: pageSize,
      fecha_inicio: filters.fecha_inicio || undefined,
      fecha_fin: filters.fecha_fin || undefined,
      query: debouncedQuery || undefined,
    };

    if (selectedProveedores.length > 0) {
      params.proveedores = selectedProveedores.join(',');
    }
    if (selectedEstados.length > 0) {
      params.estados = selectedEstados.join(',');
    }
    if (selectedMedios.length > 0) {
      params.medio_pago = selectedMedios.join(',');
    }

    try {
      const response = await API.get(`/comprobantes-egreso/`, { params });
      setComprobantesData(response.data.results || []);
      setTotalPages(Math.ceil(response.data.count / pageSize) || 1);
    } catch (error) {
      setNotification({ message: 'Error al cargar datos.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, filters.fecha_inicio, filters.fecha_fin, debouncedQuery, selectedProveedores, selectedEstados, selectedMedios]);

  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, fetchData]);

  const handleFilterChange = (e) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setCurrentPage(1);
  };

  const [ceToConfirm, setCeToConfirm] = useState(null);
  const [isConfirmingCE, setIsConfirmingCE] = useState(false);

  const handleConfirmCE = async () => {
    if (!ceToConfirm) return;
    setIsConfirmingCE(true);
    try {
      await API.patch(`/comprobantes-egreso/${ceToConfirm.id}/confirmar/`, {});
      setNotification({ message: `Transferencia de egreso #${ceToConfirm.id} confirmada exitosamente.`, type: 'success' });
      setCeToConfirm(null);
      fetchData(filters, currentPage);
    } catch (error) {
      const data = error.response?.data;
      const errorMsg = data?.detail || data?.error || (typeof data === 'string' ? data : (data ? JSON.stringify(data) : 'Error al confirmar la transferencia de egreso.'));
      setNotification({ message: errorMsg, type: 'error' });
    } finally {
      setIsConfirmingCE(false);
    }
  };

  const exportData = async () => {
    try {
      const XLSX = await import('xlsx');
      const params = {
        page_size: 9999,
        fecha_inicio: filters.fecha_inicio || undefined,
        fecha_fin: filters.fecha_fin || undefined,
        query: filters.query || undefined,
      };
      if (selectedProveedores.length > 0) params.proveedores = selectedProveedores.join(',');
      if (selectedEstados.length > 0) params.estados = selectedEstados.join(',');
      if (selectedMedios.length > 0) params.medio_pago = selectedMedios.join(',');

      const response = await API.get(`/comprobantes-egreso/`, { params });
      const dataToExport = (response.data.results || []).map(item => ({
        ID: item.id,
        Fecha: formatDate(item.fecha),
        Proveedor: item.proveedor_nombre || '-',
        'Medio de Pago': item.medio_pago,
        Estado: item.estado || '-',
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

  // Calculate stats for current view (unconfirmed transfer vouchers)
  const stats = useMemo(() => {
    const porConfirmarCount = comprobantesData.filter(
      item => item.estado && item.estado !== 'Pagado'
    ).length;
    return { porConfirmarCount };
  }, [comprobantesData]);

  return (
    <div className="ds-page comprobantes-page ds-fade-in">
      <AppNotification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      <PageHeader
        icon={FaReceipt}
        title="Comprobantes de Egreso"
        subtitle="Registro de egresos y pagos a proveedores"
        actions={
          <>
            {usuario?.role === 'administrador' && (
              <Button variant="ghost" icon={FaFileExport} onClick={exportData} title="Exportar" />
            )}
            {hasPermission('CREAR_COMPROBANTE_EGRESO') && (
              <Button variant="primary" icon={FaPlus} onClick={() => navigate('/comprobantes-egreso/nuevo')}>
                <span className="long-text">Nuevo Comprobante</span>
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
            <span className="stat-label">Por Confirmar</span>
            <span className="stat-value">{stats.porConfirmarCount}</span>
          </div>
        </div>
      </div>

      <div className="ds-card comprobantes-filters ds-fade-in" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
        <div className="v-filters-bar" ref={filterBarRef} style={{ margin: 0, flex: 1, overflow: 'visible', flexWrap: 'wrap' }}>
          <div className="v-search-pill">
            <FaSearch />
            <input
              type="text"
              name="query"
              placeholder="Buscar CE, Proveedor..."
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

          {/* Multi-select Proveedores */}
          <div className="v-multi-select-container">
            <button
              type="button"
              className={`v-multi-select-btn ${selectedProveedores.length > 0 ? 'active-filter' : ''} ${isProveedoresOpen ? 'open' : ''}`}
              onClick={() => {
                setIsProveedoresOpen(prev => !prev);
                setIsEstadosOpen(false);
                setIsMediosOpen(false);
              }}
            >
              <span>
                {selectedProveedores.length === 0
                  ? 'Proveedor: Todos'
                  : selectedProveedores.length === (proveedores || []).length
                  ? 'Proveedor: Todos'
                  : `Proveedores (${selectedProveedores.length})`}
              </span>
              <FaChevronDown className="v-chevron-icon" />
            </button>
            {isProveedoresOpen && (
              <div className="v-multi-select-popover">
                <div className="v-popover-header">
                  <span>Filtrar por Proveedor</span>
                  <button type="button" className="v-popover-action-btn" onClick={selectAllProveedores}>
                    {selectedProveedores.length === (proveedores || []).length ? 'Ninguno' : 'Todos'}
                  </button>
                </div>
                <div className="v-popover-list">
                  {(proveedores || []).map(p => (
                    <label key={p.id} className="v-popover-item">
                      <input
                        type="checkbox"
                        checked={selectedProveedores.includes(p.id)}
                        onChange={() => toggleProveedor(p.id)}
                      />
                      <span>{p.nombre_empresa}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Multi-select Estado */}
          <div className="v-multi-select-container">
            <button
              type="button"
              className={`v-multi-select-btn ${selectedEstados.length > 0 ? 'active-filter' : ''} ${isEstadosOpen ? 'open' : ''}`}
              onClick={() => {
                setIsEstadosOpen(prev => !prev);
                setIsProveedoresOpen(false);
                setIsMediosOpen(false);
              }}
            >
              <span>
                {selectedEstados.length === 0
                  ? 'Estado: Todos'
                  : selectedEstados.length === 2
                  ? 'Estado: Todos'
                  : `Estado: ${selectedEstados[0] === 'Pagado' ? 'Pagados' : 'Por Confirmar'}`}
              </span>
              <FaChevronDown className="v-chevron-icon" />
            </button>
            {isEstadosOpen && (
              <div className="v-multi-select-popover">
                <div className="v-popover-header">
                  <span>Filtrar por Estado</span>
                  <button type="button" className="v-popover-action-btn" onClick={selectAllEstados}>
                    {selectedEstados.length === 2 ? 'Ninguno' : 'Todos'}
                  </button>
                </div>
                <div className="v-popover-list">
                  <label className="v-popover-item">
                    <input
                      type="checkbox"
                      checked={selectedEstados.includes('Pagado')}
                      onChange={() => toggleEstado('Pagado')}
                    />
                    <span>✓ Pagado</span>
                  </label>
                  <label className="v-popover-item">
                    <input
                      type="checkbox"
                      checked={selectedEstados.includes('Por Confirmar Pago')}
                      onChange={() => toggleEstado('Por Confirmar Pago')}
                    />
                    <span>⏳ Por Confirmar</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Multi-select Medio de Pago */}
          <div className="v-multi-select-container">
            <button
              type="button"
              className={`v-multi-select-btn ${selectedMedios.length > 0 ? 'active-filter' : ''} ${isMediosOpen ? 'open' : ''}`}
              onClick={() => {
                setIsMediosOpen(prev => !prev);
                setIsProveedoresOpen(false);
                setIsEstadosOpen(false);
              }}
            >
              <span>
                {selectedMedios.length === 0
                  ? 'Medio: Todos'
                  : selectedMedios.length === mediosPago.length
                  ? 'Medio: Todos'
                  : `Medios (${selectedMedios.length})`}
              </span>
              <FaChevronDown className="v-chevron-icon" />
            </button>
            {isMediosOpen && (
              <div className="v-multi-select-popover">
                <div className="v-popover-header">
                  <span>Filtrar por Medio de Pago</span>
                  <button type="button" className="v-popover-action-btn" onClick={selectAllMedios}>
                    {selectedMedios.length === mediosPago.length ? 'Ninguno' : 'Todos'}
                  </button>
                </div>
                <div className="v-popover-list">
                  {mediosPago.map(m => (
                    <label key={m.value} className="v-popover-item">
                      <input
                        type="checkbox"
                        checked={selectedMedios.includes(m.value)}
                        onChange={() => toggleMedio(m.value)}
                      />
                      <span>{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {(filters.query || filters.fecha_inicio || filters.fecha_fin || selectedProveedores.length > 0 || selectedEstados.length > 0 || selectedMedios.length > 0) && (
            <button type="button" className="fct-clear-pill" onClick={clearFilters} title="Limpiar todos los filtros">
              <FaTimes />
            </button>
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
                <th className="th-ce-estado">Estado</th>
                <th className="th-ce-valor text-right">Valor</th>
                <th className="th-ce-actions"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '90px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '85%' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '85%' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td className="text-right"><div className="skeleton skeleton-text" style={{ width: '80px', marginLeft: 'auto' }}></div></td>
                    <td></td>
                  </tr>
                ))
              ) : comprobantesData.length > 0 ? (
                comprobantesData.map((item) => {
                  const isExpanded = expandedCEIds.includes(item.id);
                  const facturas = item.facturas_detalle || [];
                  const hasFacturas = facturas.length > 0;
                  return (
                    <React.Fragment key={item.id}>
                      <tr className={`table-row-hover ${isExpanded ? 'ce-row-expanded' : ''}`} onClick={() => toggleExpandCE(item.id)} style={{ cursor: 'pointer' }}>
                        <td className="font-bold">#{item.id}</td>
                        <td className="text-muted">{formatDate(item.fecha)}</td>
                        <td className="ce-ellipsis" title={item.proveedor_nombre || ''}>{item.proveedor_nombre || '—'}</td>
                        <td className="ce-ellipsis" title={item.concepto || ''}>
                          {item.concepto}
                          {item.descripcion && <FaStickyNote className="ce-note-flag" title={item.descripcion} />}
                        </td>
                        <td>
                          <div className="method-cell">
                            <PaymentIcon method={item.medio_pago} />
                            <span className="ce-ellipsis">{item.medio_pago}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <span className={`status-badge ${item.estado === 'Pagado' ? 'paid' : 'pending'}`}>
                              {item.estado === 'Pagado' ? '✓ Pagado' : 'Por Confirmar'}
                            </span>
                            {item.estado !== 'Pagado' && hasPermission('APROBAR_EGRESO') && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCeToConfirm(item); }}
                                className="ce-confirm-btn"
                                title="Confirmar transferencia de egreso realizada"
                              >
                                <FaCheckCircle size={11} /> Confirmar
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="text-right font-mono value-expense">
                          -{formatCurrency(item.valor)}
                        </td>
                        <td className="ce-actions-cell">
                          <button type="button" className="action-btn" title="Imprimir comprobante" onClick={(e) => { e.stopPropagation(); setPrintPreviewItem(item); }}>
                            <FaPrint />
                          </button>
                          <button type="button" className="action-btn" title={isExpanded ? 'Ocultar detalle' : 'Ver detalle'} onClick={(e) => { e.stopPropagation(); toggleExpandCE(item.id); }}>
                            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="ce-expanded-row">
                          <td colSpan="8" style={{ padding: 0 }}>
                            <div className="ce-expanded-wrapper">
                              <div className="ce-det-panel">
                                <h4 className="ce-det-titulo">Datos del Comprobante</h4>
                                <div className="ce-det-grid">
                                  <div className="ce-det-item">
                                    <span className="ce-det-label">Concepto</span>
                                    <span className="ce-det-valor">{item.concepto || '—'}</span>
                                  </div>
                                  <div className="ce-det-item">
                                    <span className="ce-det-label">Recibido por</span>
                                    <span className="ce-det-valor">{item.recibido_por || '—'}</span>
                                  </div>
                                  <div className="ce-det-item">
                                    <span className="ce-det-label">Medio de pago</span>
                                    <span className="ce-det-valor">{item.medio_pago || '—'}</span>
                                  </div>
                                  <div className="ce-det-item">
                                    <span className="ce-det-label">Estado</span>
                                    <span className="ce-det-valor">{item.estado === 'Pagado' ? '✓ Pagado' : 'Por Confirmar'}</span>
                                  </div>
                                  <div className="ce-det-item ce-det-item-full">
                                    <span className="ce-det-label">Nota / Observación</span>
                                    <span className={`ce-det-valor ${!item.descripcion ? 'ce-det-empty-val' : ''}`}>{item.descripcion || 'Sin observaciones'}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="ce-det-panel ce-det-panel-wide">
                                <h4 className="ce-det-titulo">Facturas Asociadas ({facturas.length})</h4>
                                {hasFacturas ? (
                                  <table className="ce-facturas-table">
                                    <thead>
                                      <tr>
                                        <th>No. Factura</th>
                                        <th>Fecha Emisión</th>
                                        <th>Fecha Pago</th>
                                        <th>Estado</th>
                                        <th className="text-right">Valor</th>
                                        <th>Observaciones</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {facturas.map((f) => (
                                        <React.Fragment key={f.id}>
                                          <tr className="ce-factura-row">
                                            <td className="font-bold">#{f.id_manual}</td>
                                            <td>{formatDate(f.fecha_factura)}</td>
                                            <td>{f.fecha_pago ? formatDate(f.fecha_pago) : '—'}</td>
                                            <td>
                                              <span className={`ce-factura-estado ${f.estado === 'pagada' ? 'pagada' : f.estado === 'pago_en_proceso' ? 'en-proceso' : 'pendiente'}`}>
                                                {f.estado === 'pagada' ? '✓ Pagada' : f.estado === 'pago_en_proceso' ? '⏳ Pago en proceso' : 'Pendiente'}
                                              </span>
                                            </td>
                                            <td className="text-right font-mono">{formatCurrency(f.valor)}</td>
                                            <td className="note-cell">{f.observaciones || '—'}</td>
                                          </tr>
                                          {f.productos && f.productos.length > 0 && (
                                            <tr className="ce-productos-row">
                                              <td colSpan="6" style={{ padding: '0 0 0 2rem' }}>
                                                <div className="ce-productos-list">
                                                  {groupProductos(f.productos).map((p) => (
                                                    <div key={p.id} className="ce-producto-item">
                                                      <div className="ce-producto-main">
                                                        {p.cantidad > 1 && <span className="ce-producto-cant">x{p.cantidad}</span>}
                                                        <span className="ce-producto-nombre">{p.referencia_nombre}{p.variacion ? ` (${p.variacion})` : ''}</span>
                                                        {(p.categoria_nombre || p.subcategoria_nombre) && (
                                                          <span className="ce-producto-cat">
                                                            {[p.categoria_nombre, p.subcategoria_nombre].filter(Boolean).join(' · ')}
                                                          </span>
                                                        )}
                                                      </div>
                                                      <span className="ce-producto-costo">{formatCurrency(p.costo * p.cantidad)}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </td>
                                            </tr>
                                          )}
                                        </React.Fragment>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p className="ce-det-empty">Este comprobante no tiene facturas asociadas.</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr><td colSpan="8" className="empty-state">No se encontraron comprobantes.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Feed */}
        <div className="mobile-transaction-feed">
          {isLoading ? (
            <div className="loading-spinner"></div>
          ) : comprobantesData.length > 0 ? (
            comprobantesData.map((item) => {
              const isExpanded = expandedCEIds.includes(item.id);
              const facturas = item.facturas_detalle || [];
              const hasFacturas = facturas.length > 0;
              return (
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
                    <div className="card-amount value-expense" style={{ marginBottom: '4px' }}>
                      -{formatCurrency(item.valor)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end', marginBottom: '4px' }}>
                      <span className={`status-badge ${item.estado === 'Pagado' ? 'paid' : 'pending'}`} style={{ fontSize: '0.7rem' }}>
                        {item.estado === 'Pagado' ? '✓ Pagado' : 'Por Confirmar'}
                      </span>
                      {item.estado !== 'Pagado' && hasPermission('APROBAR_EGRESO') && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCeToConfirm(item); }}
                          style={{
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <FaCheckCircle size={10} /> Confirmar
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="card-id">#{item.id}</div>
                      <button type="button" className="ce-mobile-expand-btn" onClick={() => setPrintPreviewItem(item)}>
                        <FaPrint /> Imprimir
                      </button>
                      <button type="button" className={`ce-mobile-expand-btn ${isExpanded ? 'open' : ''}`} onClick={() => toggleExpandCE(item.id)}>
                        <FaChevronDown /> {isExpanded ? 'Ocultar' : hasFacturas ? `Facturas (${facturas.length})` : 'Ver detalle'}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="ce-mobile-expanded">
                      <div className="ce-mobile-info-grid">
                        <div className="ce-det-item">
                          <span className="ce-det-label">Recibido por</span>
                          <span className="ce-det-valor">{item.recibido_por || '—'}</span>
                        </div>
                        <div className="ce-det-item ce-det-item-full">
                          <span className="ce-det-label">Nota / Observación</span>
                          <span className={`ce-det-valor ${!item.descripcion ? 'ce-det-empty-val' : ''}`}>{item.descripcion || 'Sin observaciones'}</span>
                        </div>
                      </div>
                      {hasFacturas ? facturas.map(f => (
                        <div key={f.id} className="ce-mobile-factura">
                          <div className="ce-mobile-factura-header">
                            <span className="font-bold">Fact. #{f.id_manual}</span>
                            <span className="font-mono">{formatCurrency(f.valor)}</span>
                          </div>
                          <div className="ce-mobile-factura-meta">
                            <span className={`ce-factura-estado ${f.estado === 'pagada' ? 'pagada' : f.estado === 'pago_en_proceso' ? 'en-proceso' : 'pendiente'}`}>
                              {f.estado === 'pagada' ? '✓ Pagada' : f.estado === 'pago_en_proceso' ? '⏳ En proceso' : 'Pendiente'}
                            </span>
                            {f.observaciones && <span className="text-muted">{f.observaciones}</span>}
                          </div>
                          {f.productos && f.productos.length > 0 && (
                            <div className="ce-mobile-productos">
                              {groupProductos(f.productos).map(p => (
                                <div key={p.id} className="ce-producto-item">
                                  <div className="ce-producto-main">
                                    {p.cantidad > 1 && <span className="ce-producto-cant">x{p.cantidad}</span>}
                                    <span className="ce-producto-nombre">{p.referencia_nombre}{p.variacion ? ` (${p.variacion})` : ''}</span>
                                    {(p.categoria_nombre || p.subcategoria_nombre) && (
                                      <span className="ce-producto-cat">
                                        {[p.categoria_nombre, p.subcategoria_nombre].filter(Boolean).join(' · ')}
                                      </span>
                                    )}
                                  </div>
                                  <span className="ce-producto-costo">{formatCurrency(p.costo * p.cantidad)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )) : (
                        <p className="ce-det-empty">Sin facturas asociadas.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="empty-state-mobile">Sin registros.</div>
          )}
        </div>
      </div>

      <div className="ce-pagination-bar">
        <button className="ce-pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>
          <FaChevronLeft />
        </button>
        <span className="ce-pagination-info">Página {currentPage} de {totalPages}</span>
        <button className="ce-pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)}>
          <FaChevronRight />
        </button>
      </div>

      <ComprobanteEgresoPrintModal
        open={!!printPreviewItem}
        onClose={() => setPrintPreviewItem(null)}
        comprobante={printPreviewItem}
      />

      {/* Modal Confirmación Transferencia Egreso */}
      {ceToConfirm && (
        <Modal
          show={Boolean(ceToConfirm)}
          onClose={() => setCeToConfirm(null)}
          title="Confirmar Transferencia de Egreso"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0369a1', padding: '0.85rem 1.1rem', borderRadius: '10px', fontSize: '0.9rem' }}>
              <div style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '0.3rem' }}>
                Comprobante de Egreso #{ceToConfirm.id}
              </div>
              <div style={{ color: '#0284c7', fontSize: '0.88rem' }}>
                Proveedor: <strong>{ceToConfirm.proveedor_nombre || 'N/A'}</strong> • Valor: <strong>{formatCOP(ceToConfirm.valor)}</strong>
              </div>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#334155', margin: 0, lineHeight: '1.4' }}>
              ¿Confirmas que la transferencia bancaria correspondiente a este egreso ha sido procesada y verificada correctamente? El estado cambiará a <strong>Pagado</strong>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setCeToConfirm(null)}
                disabled={isConfirmingCE}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCE}
                disabled={isConfirmingCE}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37,99,235,0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isConfirmingCE ? 'Confirmando...' : '✓ Confirmar Pago'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ComprobantesEgreso;
