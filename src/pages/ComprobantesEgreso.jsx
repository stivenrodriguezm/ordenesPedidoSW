import { useExportacion } from '../hooks/useExportacion';
import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppContext, usePermissions } from '../AppContext';
import useDebounce from '../hooks/useDebounce';
import { useFiltrosUrl } from '../hooks/useFiltrosUrl';
import './ComprobantesEgreso.css';
import './VentasImprovements.css';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as pagosApi from '../services/pagosBancariosService';
import PrepararPagosCE, { CuentaFilaCE, AsociarBeneficiarioCE } from './pagos/PrepararPagosCE';
import CuentasBancarias from './pagos/CuentasBancarias';
import { EditorLote, PrepararNomina } from './pagos/PagosBancariosPage';
import { mostrarPesosAPI } from './pagos/pesos';
import { mensajeDeError } from '../services/errores';
import { groupProductos } from '../utils/groupProductos';
import {
  FaFileExport,
  FaPlus,
  FaSearch,
  FaMoneyBillWave,
  FaUniversity,
  FaCreditCard,
  FaReceipt,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaChevronUp,
  FaTimes,
  FaCheckCircle,
  FaPrint,
  FaStickyNote,
  FaEdit
} from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import { Modal } from '../components/ui';
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

// Estados del comprobante. 'Anulado' solo existe para abonos anulados (P10-02).
const etiquetaEstadoEgreso = (estado) => (
  estado === 'Pagado' ? '✓ Pagado' : estado === 'Anulado' ? 'Anulado' : 'Por Confirmar'
);
const claseEstadoEgreso = (estado) => (estado === 'Pagado' ? 'paid' : estado === 'Anulado' ? 'cancelled' : 'pending');

const ComprobantesEgreso = () => {
  const { proveedores } = useContext(AppContext);
  const navigate = useNavigate();
  const hasPermission = usePermissions();
  const qc = useQueryClient();
  const [urlParams, setUrlParams] = useSearchParams();
  const puedeVerCE = hasPermission('VER_COMPROBANTES_EGRESO');
  const puedeNomina = hasPermission('VER_NOMINA');
  const puedePreparar = hasPermission('VER_TODOS_EGRESOS') && hasPermission('CREAR_COMPROBANTE_EGRESO');
  const [seleccion, setSeleccion] = useState({});
  const [cuentasElegidas, setCuentasElegidas] = useState({});
  const [revisarPagos, setRevisarPagos] = useState(false);
  const [cuentasDe, setCuentasDe] = useState(null);
  const [asociar, setAsociar] = useState(null);
  const [nomina, setNomina] = useState(urlParams.get('nomina') === '1');
  const [archivoId, setArchivoId] = useState(urlParams.get('archivo'));
  const [bancoDestino, setBancoDestino] = useState('');
  const [soloPagables, setSoloPagables] = useState(false);
  const [seleccionandoTodos, setSeleccionandoTodos] = useState(false);
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
  const [filters, setFilters] = useFiltrosUrl({ fecha_inicio: '', fecha_fin: '', query: '' });
  const debouncedQuery = useDebounce(filters.query, 350);

  const filterBarRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 30;

  const [notification, setNotification] = useState({ message: '', type: '' });
  const { exportar, exportando } = useExportacion('egresos', 'Comprobantes_Egreso.xlsx', setNotification);
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
    setBancoDestino(''); setSoloPagables(false);
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

  const paramsConsulta = useMemo(() => ({ page: currentPage, page_size: pageSize,
    fecha_inicio: filters.fecha_inicio || undefined, fecha_fin: filters.fecha_fin || undefined, query: debouncedQuery || undefined,
    proveedores: selectedProveedores.join(',') || undefined, estados: selectedEstados.join(',') || undefined,
    medio_pago: selectedMedios.join(',') || undefined, banco_destino: bancoDestino || undefined, solo_pagables: soloPagables ? '1' : undefined,
  }), [currentPage, filters.fecha_inicio, filters.fecha_fin, debouncedQuery, selectedProveedores, selectedEstados, selectedMedios, bancoDestino, soloPagables]);
  const consulta = useQuery({ queryKey: ['egresos', paramsConsulta], queryFn: () => pagosApi.comprobantes(paramsConsulta), enabled: puedeVerCE });
  const comprobantesData = useMemo(() => consulta.data?.results || [], [consulta.data]);
  const totalFiltrado = consulta.data?.totales_filtrados?.valor || 0;
  const totalPages = Math.ceil((consulta.data?.count || 0) / pageSize) || 1;
  const isLoading = consulta.isPending;
  const cat = useQuery({ queryKey: ['pagos', 'catalogo'], queryFn: pagosApi.catalogo, enabled: puedePreparar });
  const nominasGuardadas = useQuery({ queryKey: ['pagos', 'lotes', 'nomina'], queryFn: () => pagosApi.lotes('nomina'), enabled: puedeNomina });
  const archivo = useQuery({ queryKey: ['pagos', 'lote', String(archivoId)], queryFn: () => pagosApi.lote(archivoId), enabled: Boolean(archivoId), refetchOnWindowFocus: false });
  const actualizarArchivo = d => { setArchivoId(d.id); qc.setQueryData(['pagos', 'lote', String(d.id)], d); qc.invalidateQueries({ queryKey: ['egresos'] }); qc.invalidateQueries({ queryKey: ['pagos', 'lotes'] }); };
  const cerrarArchivo = () => { setArchivoId(null); if (urlParams.has('archivo')) { const p = new URLSearchParams(urlParams); p.delete('archivo'); setUrlParams(p, { replace: true }); } };
  const cambiarCuenta = (ce, cuenta) => setCuentasElegidas(d => ({ ...d, [ce.id]: cuenta }));
  const elegirCE = (ce, elegido) => setSeleccion(d => { const n = { ...d }; if (elegido) n[ce.id] = ce; else delete n[ce.id]; return n; });
  const elegibles = comprobantesData.filter(ce => ce.pago_bancario?.disponible);
  const seleccionIds = Object.keys(seleccion).map(Number);
  const totalSeleccion = Object.values(seleccion).reduce((n, ce) => n + Number(ce.valor), 0);
  const elegirVisibles = elegido => setSeleccion(d => { const n = { ...d }; elegibles.forEach(ce => { if (elegido) n[ce.id] = ce; else delete n[ce.id]; }); return n; });
  const seleccionarFiltro = useMutation({ mutationFn: () => pagosApi.comprobantes({ ...paramsConsulta, page: 1, page_size: 500, solo_pagables: '1' }), onSuccess: d => {
    if (d.count > 500) { setNotification({ message: 'Hay más de 500 CE. Ajusta el banco, proveedor o las fechas para seleccionar hasta 500 por archivo.', type: 'error' }); return; }
    setSeleccion(prev => Object.fromEntries([...Object.values(prev), ...d.results].map(ce => [ce.id, ce]))); setSeleccionandoTodos(false);
  } });
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
      await pagosApi.confirmarCE(ceToConfirm.id);
      setNotification({ message: `Transferencia de egreso #${ceToConfirm.id} confirmada exitosamente.`, type: 'success' });
      setCeToConfirm(null);
      qc.invalidateQueries({ queryKey: ['egresos'] });
    } catch (error) {
      const data = error.response?.data;
      const errorMsg = data?.detail || data?.error || (typeof data === 'string' ? data : (data ? JSON.stringify(data) : 'Error al confirmar la transferencia de egreso.'));
      setNotification({ message: errorMsg, type: 'error' });
    } finally {
      setIsConfirmingCE(false);
    }
  };

  const exportData = () => exportar({
    fecha_inicio: filters.fecha_inicio, fecha_fin: filters.fecha_fin, query: filters.query,
    proveedores: selectedProveedores.join(','), estados: selectedEstados.join(','), medio_pago: selectedMedios.join(','), banco_destino: bancoDestino, solo_pagables: soloPagables ? '1' : '',
  });

  return (
    <div className="ds-page comprobantes-page ds-fade-in">
      <AppNotification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      {revisarPagos && <PrepararPagosCE seleccion={seleccionIds} preferencias={cuentasElegidas} cerrar={() => setRevisarPagos(false)} preparado={d => { setRevisarPagos(false); setSeleccion({}); actualizarArchivo(d); setNotification({ message: 'Archivo Davivienda descargado. Los pagos siguen por confirmar.', type: 'success' }); }} />}
      {cuentasDe && <Modal open title={`Cuentas · ${cuentasDe.nombre}`} onClose={() => setCuentasDe(null)}><CuentasBancarias titular={cuentasDe.titular} nombre={cuentasDe.nombre} /></Modal>}
      {asociar && <AsociarBeneficiarioCE ce={asociar} cerrar={() => setAsociar(null)} guardado={() => setNotification({ message: 'Beneficiario asociado al comprobante.', type: 'success' })} />}
      {nomina && <PrepararNomina cerrar={() => setNomina(false)} abrir={d => { setNomina(false); actualizarArchivo(d); }} />}
      {archivoId && <Modal open title="Agrupación de comprobantes" size="xl" onClose={cerrarArchivo}>{archivo.data ? <EditorLote key={`${archivo.data.id}-${archivo.data.revision}-${archivo.data.confirmados}`} lote={archivo.data} actualizado={actualizarArchivo} puedeEditar={archivo.data.tipo === 'nomina' ? hasPermission('GESTIONAR_NOMINA') : puedePreparar} puedeExportar={archivo.data.tipo === 'nomina' ? hasPermission('GESTIONAR_NOMINA') : hasPermission('EXPORTAR_EGRESOS')} /> : <p role="status">Cargando pagos…</p>}{archivo.error && <p role="alert">{mensajeDeError(archivo.error)}</p>}</Modal>}
      <PageHeader
        icon={FaReceipt}
        title="Comprobantes de Egreso"
        subtitle="Registro de egresos y pagos a proveedores"
        actions={
          <>
            {(hasPermission('VER_TODOS_EGRESOS') || puedeNomina) && <Button variant="secondary" icon={FaUniversity} onClick={() => navigate(`/comprobantes-egreso/pagos?tipo=${puedeVerCE ? 'proveedores' : 'nomina'}`)}>Pagos bancarios</Button>}
            {hasPermission('EXPORTAR_EGRESOS') && (
              <Button variant="ghost" icon={FaFileExport} onClick={exportData} loading={exportando} disabled={isLoading} aria-label="Exportar Excel" title="Exportar" />
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

      {(puedePreparar || puedeNomina) && <section className="ce-pay-toolbar">
        <div><strong>Prepara varios pagos desde aquí</strong><span>Selecciona los CE, revisa productos y descarga un archivo para Davivienda.</span></div>
        <div className="ce-pay-controls">{puedePreparar && <><label className="pb-check"><input type="checkbox" checked={soloPagables} onChange={e => { setSoloPagables(e.target.checked); setCurrentPage(1); }} />Solo transferencias disponibles</label>
        <label>Banco destino<select className="ds-input" value={bancoDestino} onChange={e => { setBancoDestino(e.target.value); setSoloPagables(true); setCurrentPage(1); }}><option value="">Todos los bancos</option><option value="51">Davivienda</option><option value="sin_cuenta">Sin cuenta asignada</option>{Object.entries(cat.data?.bancos || {}).filter(([k]) => k !== '51').sort((a,b) => a[1].localeCompare(b[1])).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label></>}
        {hasPermission('GESTIONAR_NOMINA') && <Button variant="secondary" onClick={() => setNomina(true)}>Preparar nómina</Button>}
        </div>
        {nominasGuardadas.data?.filter(n => n.estado === 'borrador').map(n => <button className="ce-nomina-ready" key={n.id} onClick={() => setArchivoId(n.id)}><span>{n.nombre} · {n.cantidad} empleados</span><strong>Revisar {mostrarPesosAPI(n.total)} →</strong></button>)}
      </section>}
      {consulta.error && <p role="alert" className="pb-error">{mensajeDeError(consulta.error)}</p>}
      {puedeVerCE && <>
      <div className="ds-card comprobantes-filters ds-fade-in" style={{ padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
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
              onClick={(e) => { try { e.target.showPicker(); } catch { /* navegador sin showPicker */ } }}
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
              onClick={(e) => { try { e.target.showPicker(); } catch { /* navegador sin showPicker */ } }}
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

      {puedePreparar && <div className="ce-selection-bar"><label className="pb-check"><input type="checkbox" checked={elegibles.length > 0 && elegibles.every(ce => Boolean(seleccion[ce.id]))} disabled={!elegibles.length || isLoading} onChange={e => elegirVisibles(e.target.checked)} />Seleccionar página</label><Button variant="ghost" size="sm" loading={seleccionarFiltro.isPending} onClick={() => { setSeleccionandoTodos(true); seleccionarFiltro.mutate(); }}>Seleccionar todos con estos filtros</Button><span className="ce-selection-total"><b>{seleccionIds.length} CE · {mostrarPesosAPI(totalSeleccion)}</b>{seleccionIds.length > 0 && <button className="ce-bank-link" onClick={() => setSeleccion({})}>Limpiar selección</button>}</span><Button disabled={!seleccionIds.length || seleccionIds.length > 500 || !hasPermission('EXPORTAR_EGRESOS')} onClick={() => setRevisarPagos(true)}>Revisar y pagar{seleccionIds.length ? ` (${seleccionIds.length})` : ''}</Button></div>}
      {seleccionandoTodos && seleccionarFiltro.error && <p role="alert" className="pb-error">{mensajeDeError(seleccionarFiltro.error)}</p>}

      <div className="content-area">
        {(filters.query || filters.fecha_inicio || filters.fecha_fin || selectedProveedores.length > 0 || selectedEstados.length > 0 || selectedMedios.length > 0) && (
          <div className="ds-totales-filtrados" role="status">
            Con estos filtros: <strong>total {formatCurrency(totalFiltrado)}</strong>
          </div>
        )}
        {/* Desktop Table */}
        <div className="desktop-table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                {puedePreparar && <th className="ce-select-col" aria-label="Seleccionar pagos" />}
                <th className="th-ce-id">CE</th>
                <th className="th-ce-fecha">Fecha</th>
                <th className="th-ce-proveedor">Proveedor</th>
                <th className="th-ce-concepto">Concepto</th>
                <th className="ce-bank-col">Banco y cuenta destino</th>
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
                        {puedePreparar && <td className="ce-select-col" onClick={e => e.stopPropagation()}><input type="checkbox" aria-label={`Seleccionar CE ${item.id}`} checked={Boolean(seleccion[item.id])} disabled={!item.pago_bancario?.disponible} onChange={e => elegirCE(item, e.target.checked)} /></td>}
                        <td className="font-bold">#{item.id}</td>
                        <td className="text-muted ce-date-cell">{formatDate(item.fecha)}</td>
                        <td className="ce-beneficiary-name" title={item.proveedor_nombre || ''}>{item.proveedor_nombre || '—'}</td>
                        <td className="ce-ellipsis" title={item.concepto || ''}>
                          {item.concepto}
                          {item.descripcion && <FaStickyNote className="ce-note-flag" title={item.descripcion} />}
                        </td>
                        <td className="ce-bank-col" onClick={e => e.stopPropagation()}><CuentaFilaCE ce={item} value={cuentasElegidas[item.id]} cambiar={cambiarCuenta} administrar={setCuentasDe} asociar={setAsociar} abrirArchivo={setArchivoId} editable={puedePreparar} /></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <span className={`status-badge ${claseEstadoEgreso(item.estado)}`}>
                              {etiquetaEstadoEgreso(item.estado)}
                            </span>
                            {item.estado === 'Por Confirmar Pago' && (
                              hasPermission('APROBAR_EGRESO') ? (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setCeToConfirm(item); }}
                                  className="ce-confirm-btn"
                                  title="Confirmar transferencia de egreso realizada"
                                >
                                  <FaCheckCircle size={11} /> Confirmar
                                </button>
                              ) : (
                                <span
                                  className="ce-confirm-btn disabled"
                                  title="Solo usuarios con permiso de aprobación pueden confirmar transferencias"
                                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                                >
                                  <FaCheckCircle size={11} /> Confirmar
                                </span>
                              )
                            )}
                          </div>
                        </td>
                        <td className="text-right font-mono value-expense">
                          -{formatCurrency(item.valor)}
                        </td>
                        <td className="ce-actions-cell">
                          {hasPermission('EDITAR_COMPROBANTE_EGRESO') ? (
                            <button type="button" className="action-btn" title="Editar comprobante" onClick={(e) => { e.stopPropagation(); navigate(`/comprobantes-egreso/${item.id}/editar`, { state: { comprobante: item } }); }}>
                              <FaEdit />
                            </button>
                          ) : (
                            <button type="button" className="action-btn" title="Sin permiso para editar comprobantes" disabled style={{ opacity: 0.35, cursor: 'not-allowed' }}>
                              <FaEdit />
                            </button>
                          )}
                          <button type="button" className="action-btn"
                            title={item.estado === 'Anulado' ? 'Comprobante anulado: no se imprime (el PDF siempre indica "Pagado")' : 'Imprimir comprobante'}
                            disabled={item.estado === 'Anulado'}
                            onClick={(e) => { e.stopPropagation(); setPrintPreviewItem(item); }}>
                            <FaPrint />
                          </button>
                          <button type="button" className="action-btn" title={isExpanded ? 'Ocultar detalle' : 'Ver detalle'} onClick={(e) => { e.stopPropagation(); toggleExpandCE(item.id); }}>
                            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="ce-expanded-row">
                          <td colSpan={puedePreparar ? 9 : 8} style={{ padding: 0 }}>
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
                                    <span className="ce-det-valor">{etiquetaEstadoEgreso(item.estado)}</span>
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
                <tr><td colSpan={puedePreparar ? 9 : 8} className="empty-state">No se encontraron comprobantes.</td></tr>
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
                  {puedePreparar && <div className="ce-mobile-bank"><label className="pb-check"><input type="checkbox" aria-label={`Seleccionar CE ${item.id}`} checked={Boolean(seleccion[item.id])} disabled={!item.pago_bancario?.disponible} onChange={e => elegirCE(item, e.target.checked)} />CE #{item.id}</label><CuentaFilaCE ce={item} value={cuentasElegidas[item.id]} cambiar={cambiarCuenta} administrar={setCuentasDe} asociar={setAsociar} abrirArchivo={setArchivoId} editable={puedePreparar} /></div>}
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
                      <span className={`status-badge ${claseEstadoEgreso(item.estado)}`} style={{ fontSize: '0.7rem' }}>
                        {etiquetaEstadoEgreso(item.estado)}
                      </span>
                      {item.estado === 'Por Confirmar Pago' && hasPermission('APROBAR_EGRESO') && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCeToConfirm(item); }}
                          style={{
                            background: 'var(--accent)',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div className="card-id">#{item.id}</div>
                      {hasPermission('EDITAR_COMPROBANTE_EGRESO') && (
                        <button type="button" className="ce-mobile-expand-btn" onClick={() => navigate(`/comprobantes-egreso/${item.id}/editar`, { state: { comprobante: item } })}>
                          <FaEdit /> Editar
                        </button>
                      )}
                      {item.estado !== 'Anulado' && (
                        <button type="button" className="ce-mobile-expand-btn" onClick={() => setPrintPreviewItem(item)}>
                          <FaPrint /> Imprimir
                        </button>
                      )}
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

      </>}
      <ComprobanteEgresoPrintModal
        open={!!printPreviewItem}
        onClose={() => setPrintPreviewItem(null)}
        comprobante={printPreviewItem}
      />

      {/* Modal Confirmación Transferencia Egreso */}
      {ceToConfirm && (
        <Modal
          open={Boolean(ceToConfirm)}
          onClose={() => setCeToConfirm(null)}
          title="Confirmar Transferencia de Egreso"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
            <div style={{ background: 'var(--info-soft)', border: '1px solid var(--info-line)', color: 'var(--info)', padding: '0.85rem 1.1rem', borderRadius: '10px', fontSize: '0.9rem' }}>
              <div style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '0.3rem' }}>
                Comprobante de Egreso #{ceToConfirm.id}
              </div>
              <div style={{ color: 'var(--info)', fontSize: '0.88rem' }}>
                Proveedor: <strong>{ceToConfirm.proveedor_nombre || 'N/A'}</strong> • Valor: <strong>{formatCOP(ceToConfirm.valor)}</strong>
              </div>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text)', margin: 0, lineHeight: '1.4' }}>
              ¿Confirmas que la transferencia bancaria correspondiente a este egreso ha sido procesada y verificada correctamente? El estado cambiará a <strong>Pagado</strong>.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => setCeToConfirm(null)}
                disabled={isConfirmingCE}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface)',
                  color: 'var(--text-secondary)',
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
                  background: 'var(--accent)',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(164, 141, 102,0.25)',
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
