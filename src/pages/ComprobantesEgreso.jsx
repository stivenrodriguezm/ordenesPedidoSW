import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AppContext, usePermissions } from '../AppContext';
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
  FaReceipt,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import Modal from '../components/Modal';

import { formatCOP } from '../utils/formatCOP';

// --- Helper Components ---

const PaymentIcon = ({ method }) => {
  const m = method ? method.toLowerCase() : '';
  if (m.includes('efectivo')) return <div className="payment-icon-wrapper cash"><FaMoneyBillWave /></div>;
  if (m.includes('transferencia') || m.includes('bancolombia')) return <div className="payment-icon-wrapper bank"><FaUniversity /></div>;
  return <div className="payment-icon-wrapper other"><FaCreditCard /></div>;
};

const CreateCEModal = ({ isOpen, onClose, onSave, mediosPago, proveedores, isLoading }) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [newCE, setNewCE] = useState({ id: '', fecha: todayStr, medio_pago: '', proveedor: '', valor: '', descripcion: '', concepto: '' });
  const [motivoOtro, setMotivoOtro] = useState('');
  const [tipoConcepto, setTipoConcepto] = useState('facturas'); // 'facturas' | 'otro'
  const [facturasDisponibles, setFacturasDisponibles] = useState([]);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewCE({ id: '', fecha: todayStr, medio_pago: '', proveedor: '', valor: '', descripcion: '', concepto: '' });
      setMotivoOtro('');
      setTipoConcepto('facturas');
      setFacturasDisponibles([]);
      setFacturasSeleccionadas([]);
    }
  }, [isOpen]);

  // Load facturas when proveedor changes (only in 'facturas' mode)
  useEffect(() => {
    if (tipoConcepto === 'facturas' && newCE.proveedor) {
      setLoadingFacturas(true);
      setFacturasSeleccionadas([]);
      API.get('/suministros/facturas/', { params: { proveedor: newCE.proveedor, page_size: 100 } })
        .then(res => {
          const all = res.data.results || res.data;
          setFacturasDisponibles(all.filter(f => f.estado !== 'pagada'));
        })
        .catch(() => setFacturasDisponibles([]))
        .finally(() => setLoadingFacturas(false));
    } else {
      setFacturasDisponibles([]);
      setFacturasSeleccionadas([]);
    }
  }, [newCE.proveedor, tipoConcepto]);

  const handleChange = (e) => setNewCE({ ...newCE, [e.target.name]: e.target.value });
  const handleValorChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setNewCE({ ...newCE, valor: raw });
  };

  const toggleFactura = (id) => {
    setFacturasSeleccionadas(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      // Auto-calculate sum of selected facturas
      const totalFacturas = next.reduce((sum, fId) => {
        const fact = facturasDisponibles.find(f => f.id === fId);
        return sum + (fact ? (parseFloat(fact.valor) || 0) : 0);
      }, 0);
      if (totalFacturas > 0) {
        setNewCE(c => ({ ...c, valor: String(Math.round(totalFacturas)) }));
      }
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...newCE };
    if (tipoConcepto === 'facturas' && facturasSeleccionadas.length > 0) {
      payload.facturas_ids = facturasSeleccionadas;
      delete payload.concepto;
    }
    if (payload.medio_pago === 'Otro' && motivoOtro) {
      payload.descripcion = `(Medio de pago: ${motivoOtro}) ${payload.descripcion || ''}`.trim();
    }
    onSave(payload);
  };

  const fmt = (v) => v ? formatCOP(v) : '$0';

  const conceptoPreview = tipoConcepto === 'facturas' && facturasSeleccionadas.length > 0
    ? `Pago fact. ${facturasSeleccionadas.map(id => facturasDisponibles.find(f => f.id === id)?.id_manual || id).join(', ')}`
    : null;

  if (!isOpen) return null;

  const numericVal = parseInt(newCE.valor) || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="lottus-form-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="lottus-modal-header">
          <div className="lottus-modal-title-wrap">
            <div className="lottus-modal-icon-badge">
              <FaArrowDown />
            </div>
            <div>
              <div className="lottus-modal-type-badge">
                <span className="lottus-badge-dot"></span> Comprobante de Egreso
              </div>
              <h3 className="lottus-modal-title">Nuevo Comprobante de Egreso</h3>
              <p className="lottus-modal-subtitle">Registra los datos generales de la salida de dinero.</p>
            </div>
          </div>
          <button className="lottus-close-btn" onClick={onClose} type="button" title="Cerrar">×</button>
        </div>

        <form onSubmit={handleSubmit} className="lottus-modal-form">
          {/* Row 1: ID + Fecha */}
          <div className="lottus-form-row">
            <div className="lottus-form-group">
              <label>No. Comprobante <span className="lottus-req">*</span></label>
              <input type="text" name="id" value={newCE.id} onChange={handleChange} required placeholder="Ej: CE-001" className="lottus-input" />
            </div>
            <div className="lottus-form-group">
              <label>Fecha <span className="lottus-req">*</span></label>
              <input type="date" onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }} name="fecha" value={newCE.fecha} onChange={handleChange} required className="lottus-input" />
            </div>
          </div>

          {/* Proveedor */}
          <div className="lottus-form-group full">
            <label>Proveedor <span className="lottus-req">*</span></label>
            <select name="proveedor" value={newCE.proveedor} onChange={handleChange} required className="lottus-select">
              <option value="">Seleccionar Proveedor...</option>
              {Array.isArray(proveedores) && proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre_empresa}</option>
              ))}
            </select>
          </div>

          {/* Row 2: Medio de Pago + Valor */}
          <div className="lottus-form-row">
            <div className="lottus-form-group">
              <label>Medio de Pago <span className="lottus-req">*</span></label>
              <select name="medio_pago" value={newCE.medio_pago} onChange={handleChange} required className="lottus-select">
                <option value="">Seleccionar...</option>
                {mediosPago.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            
            {newCE.medio_pago === 'Otro' && (
              <div className="lottus-form-group">
                <label>Especificar Medio <span className="lottus-req">*</span></label>
                <input 
                  type="text" 
                  value={motivoOtro} 
                  onChange={(e) => setMotivoOtro(e.target.value)} 
                  required 
                  placeholder="Ej: Tarjeta Crédito" 
                  className="lottus-input" 
                />
              </div>
            )}

            <div className="lottus-form-group">
              <div className="lottus-label-flex">
                <label>Valor Egreso <span className="lottus-req">*</span></label>
                {numericVal > 0 && <span className="lottus-val-preview">{formatCOP(numericVal)}</span>}
              </div>
              <div className="lottus-input-icon">
                <span className="lottus-prefix">$</span>
                <input 
                  type="text" 
                  name="valor" 
                  value={newCE.valor ? formatCOP(numericVal).replace('$', '').trim() : ''} 
                  onChange={handleValorChange} 
                  required 
                  placeholder="0" 
                  className="lottus-input lottus-input-pl" 
                />
              </div>
            </div>
          </div>

          {/* Tipo Concepto Toggle */}
          <div className="lottus-form-group full">
            <label>Tipo de Concepto</label>
            <div className="lottus-toggle-row">
              <button
                type="button"
                className={`lottus-toggle-btn ${tipoConcepto === 'facturas' ? 'active' : ''}`}
                onClick={() => setTipoConcepto('facturas')}
              >
                📄 Pagar Facturas
              </button>
              <button
                type="button"
                className={`lottus-toggle-btn ${tipoConcepto === 'otro' ? 'active' : ''}`}
                onClick={() => setTipoConcepto('otro')}
              >
                ✏️ Otro Concepto
              </button>
            </div>
          </div>

          {/* Facturas Section */}
          {tipoConcepto === 'facturas' && (
            <div className="lottus-form-group full">
              <label>Facturas Pendientes {newCE.proveedor ? '' : <span className="lottus-hint">(elige proveedor primero)</span>}</label>
              {!newCE.proveedor ? (
                <div className="lottus-facturas-empty">Selecciona un proveedor para ver sus facturas pendientes.</div>
              ) : loadingFacturas ? (
                <div className="lottus-facturas-empty">Cargando facturas del proveedor...</div>
              ) : facturasDisponibles.length === 0 ? (
                <div className="lottus-facturas-empty">No hay facturas pendientes para este proveedor.</div>
              ) : (
                <div className="lottus-facturas-list">
                  {facturasDisponibles.map(f => (
                    <label key={f.id} className={`lottus-factura-item ${facturasSeleccionadas.includes(f.id) ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={facturasSeleccionadas.includes(f.id)}
                        onChange={() => toggleFactura(f.id)}
                      />
                      <div className="lottus-factura-info">
                        <span className="lottus-factura-id">Factura #{f.id_manual}</span>
                        <span className="lottus-factura-valor">{fmt(f.valor)}</span>
                      </div>
                      <span className={`lottus-factura-estado ${f.estado}`}>{f.estado}</span>
                    </label>
                  ))}
                </div>
              )}
              {conceptoPreview && (
                <div className="lottus-concepto-preview">
                  <span>Concepto generado: </span><strong>{conceptoPreview}</strong>
                </div>
              )}
            </div>
          )}

          {/* Concepto libre */}
          {tipoConcepto === 'otro' && (
            <div className="lottus-form-group full">
              <label>Concepto del Egreso <span className="lottus-req">*</span></label>
              <input type="text" name="concepto" value={newCE.concepto} onChange={handleChange} required placeholder="Ej: Pago de servicios públicos, nómina..." className="lottus-input" />
            </div>
          )}

          {/* Descripción */}
          <div className="lottus-form-group full">
            <label>Notas / Observaciones <span className="lottus-hint">(opcional)</span></label>
            <textarea name="descripcion" value={newCE.descripcion} onChange={handleChange} placeholder="Detalles adicionales..." rows="2" className="lottus-input" />
          </div>

          {/* Footer Actions */}
          <div className="lottus-modal-actions">
            <button type="button" className="lottus-btn-cancel" onClick={onClose} disabled={isLoading}>
              Cancelar
            </button>
            <button type="submit" className="lottus-btn-submit" disabled={isLoading || !newCE.id || !newCE.proveedor || !newCE.medio_pago || numericVal <= 0}>
              {isLoading ? 'Guardando...' : 'Crear Comprobante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const ComprobantesEgreso = () => {
  const { proveedores, usuario, notify } = useContext(AppContext);
  const location = useLocation();
  const hasPermission = usePermissions();
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
    { value: 'Transferencia', label: 'Transferencia' },
    { value: 'Otro', label: 'Otro' }
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

      <div className="o-glass-header" style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', overflowX: 'auto' }}>
        <div className="o-filters-bar" style={{ margin: 0, flex: 1 }}>
          <div className="o-select-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaSearch style={{ color: '#94a3b8', fontSize: '0.8rem' }} />
            <input type="text" name="query" placeholder="Buscar CE, Proveedor..." value={filters.query} onChange={handleFilterChange}
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
              {mediosPago.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
            </select>
          </div>
          {(filters.query || filters.fecha_inicio || filters.medio_pago) && (
            <button className="o-btn-ghost" onClick={clearFilters} title="Limpiar filtros"><FaUndo /></button>
          )}
        </div>

        <div className="header-actions" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {usuario?.role === 'administrador' && (
            <button className="o-btn-ghost" onClick={exportData} title="Exportar"><FaFileExport /></button>
          )}
          {hasPermission('CREAR_COMPROBANTE_EGRESO') && (
            <button className="o-btn-primary-glow" onClick={() => setIsCreatingCE(true)}>
              <FaPlus />
              <span className="long-text">Nuevo Comprobante</span>
              <span className="short-text">Nuevo</span>
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
                <th className="th-ce-valor text-right">Valor</th>
                <th className="th-ce-desc">Nota</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '90px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '130px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '110px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td className="text-right"><div className="skeleton skeleton-text" style={{ width: '80px', marginLeft: 'auto' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></td>
                  </tr>
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
            <div className="loading-spinner"></div>
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

      <div className="ce-pagination-bar">
        <button className="ce-pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>
          <FaChevronLeft />
        </button>
        <span className="ce-pagination-info">Página {currentPage} de {totalPages}</span>
        <button className="ce-pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)}>
          <FaChevronRight />
        </button>
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
