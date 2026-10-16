import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  FaReceipt, FaCalendarDay, FaBuilding, FaUserCheck, FaMoneyBillWave,
  FaStickyNote, FaChevronDown, FaChevronUp, FaSearch, FaFileInvoiceDollar,
  FaPlus, FaTrashAlt, FaExclamationTriangle, FaUndo, FaCheckCircle,
} from 'react-icons/fa';
import API from '../services/api';
import { AppContext, usePermissions } from '../AppContext';
import { formatCOP } from '../utils/formatCOP';
import { groupProductos } from '../utils/groupProductos';
import { PageHeader, Button } from '../components/ui';
import './NuevaComprobanteEgresoPage.css';

const PROVEEDOR_OTRO = '__otro__';

const MEDIOS_PAGO = [
  { value: 'Efectivo', label: 'Efectivo' },
  { value: 'Transferencia', label: 'Transferencia' },
  { value: 'Otro', label: 'Otro' },
];

const formatDateShort = (str) => {
  if (!str) return '—';
  const [y, m, d] = String(str).split('T')[0].split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(d)}-${months[parseInt(m) - 1]}-${y}`;
};

let _otroConceptoCounter = 0;
const newOtroConceptoId = () => `oc_${++_otroConceptoCounter}_${Date.now()}`;

export default function EditarComprobanteEgresoPage() {
  const { proveedores, notify } = useContext(AppContext);
  const hasPermission = usePermissions();
  // Confirmar o revertir el pago es una aprobación aparte de editar (el
  // backend lo exige con APROBAR_EGRESO).
  const puedeAprobar = hasPermission('APROBAR_EGRESO');
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const [comprobante, setComprobante] = useState(location.state?.comprobante || null);
  const [loadingComprobante, setLoadingComprobante] = useState(!location.state?.comprobante);
  const [loadError, setLoadError] = useState(null);

  const [fecha, setFecha] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [proveedorOtroNombre, setProveedorOtroNombre] = useState('');
  const [recibidoPor, setRecibidoPor] = useState('');
  const [medioPago, setMedioPago] = useState('');
  const [estado, setEstado] = useState('Por Confirmar Pago');
  const [valor, setValor] = useState('');
  const [concepto, setConcepto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [otrosConceptos, setOtrosConceptos] = useState([]);
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);
  const [facturasSinDescuento, setFacturasSinDescuento] = useState([]); // ids exentos del % global

  // Facturas ya vinculadas a este comprobante (vienen en facturas_detalle) — se
  // pueden desmarcar para "soltarlas" (vuelven a pendiente).
  const [facturasVinculadas, setFacturasVinculadas] = useState([]); // shape facturas_detalle
  const [facturasVinculadasKeep, setFacturasVinculadasKeep] = useState([]); // ids que se conservan

  // Facturas pendientes del proveedor disponibles para agregar de nuevas.
  const [facturasDisponibles, setFacturasDisponibles] = useState([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [facturasNuevasSeleccionadas, setFacturasNuevasSeleccionadas] = useState([]);
  const [expandedFacturaIds, setExpandedFacturaIds] = useState([]);
  const [facturaSearch, setFacturaSearch] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const isProveedorOtro = proveedor === PROVEEDOR_OTRO;

  // --- Cargar el comprobante (si no llegó por navigation state, ej. F5) ---
  useEffect(() => {
    if (comprobante) return;
    setLoadingComprobante(true);
    API.get('/comprobantes-egreso/', { params: { query: id, page_size: 1 } })
      .then(res => {
        const list = res.data?.results || res.data || [];
        const found = Array.isArray(list) ? list.find(c => String(c.id) === String(id)) : null;
        if (found) setComprobante(found);
        else setLoadError('No se encontró el comprobante de egreso solicitado.');
      })
      .catch(() => setLoadError('No se pudo cargar el comprobante de egreso.'))
      .finally(() => setLoadingComprobante(false));
  }, [id, comprobante]);

  // --- Prefill del formulario cuando ya tenemos el comprobante ---
  useEffect(() => {
    if (!comprobante) return;
    setFecha((comprobante.fecha || '').split('T')[0]);
    setProveedor(comprobante.proveedor ? String(comprobante.proveedor) : PROVEEDOR_OTRO);
    setProveedorOtroNombre(comprobante.proveedor_otro_nombre || '');
    setRecibidoPor(comprobante.recibido_por || '');
    setMedioPago(comprobante.medio_pago || '');
    setEstado(comprobante.estado || 'Por Confirmar Pago');
    setValor(comprobante.valor != null ? String(parseInt(comprobante.valor)) : '');
    setConcepto(comprobante.concepto || '');
    setDescripcion(comprobante.descripcion || '');
    setOtrosConceptos(
      Array.isArray(comprobante.otros_conceptos)
        ? comprobante.otros_conceptos.map(o => ({ id: newOtroConceptoId(), descripcion: o.descripcion || '', valor: o.valor != null ? String(o.valor) : '' }))
        : []
    );
    const vinculadas = Array.isArray(comprobante.facturas_detalle) ? comprobante.facturas_detalle : [];
    setFacturasVinculadas(vinculadas);
    setFacturasVinculadasKeep(vinculadas.map(f => f.id));
  }, [comprobante]);

  // Auto-completar % descuento según el proveedor seleccionado (mismo comportamiento
  // que la página de creación) — solo se dispara cuando el usuario cambia el
  // proveedor manualmente, no pisa el 0% inicial del prefill del comprobante.
  useEffect(() => {
    if (!comprobante || !proveedor || isProveedorOtro || !Array.isArray(proveedores)) return;
    if (String(proveedor) === String(comprobante.proveedor)) return;
    const prov = proveedores.find(p => String(p.id) === String(proveedor));
    if (!prov) return;
    setPorcentajeDescuento(prov.porcentaje_descuento != null ? parseFloat(prov.porcentaje_descuento) || 0 : 0);
  }, [proveedor, proveedores, comprobante, isProveedorOtro]);

  // --- Cargar facturas pendientes disponibles del proveedor para poder agregar más ---
  useEffect(() => {
    if (!proveedor || isProveedorOtro) {
      setFacturasDisponibles([]);
      setFacturasNuevasSeleccionadas([]);
      return;
    }
    setLoadingFacturas(true);
    API.get('/suministros/facturas/', { params: { proveedor, estado: 'pendiente', page_size: 100, full: 'true' } })
      .then(res => {
        const all = res.data.results || res.data;
        setFacturasDisponibles(Array.isArray(all) ? all : []);
      })
      .catch(() => setFacturasDisponibles([]))
      .finally(() => setLoadingFacturas(false));
  }, [proveedor, isProveedorOtro]);

  const toggleKeepVinculada = (fId) => {
    setFacturasVinculadasKeep(prev => prev.includes(fId) ? prev.filter(x => x !== fId) : [...prev, fId]);
  };
  const toggleNuevaFactura = (fId) => {
    setFacturasNuevasSeleccionadas(prev => prev.includes(fId) ? prev.filter(x => x !== fId) : [...prev, fId]);
  };
  const toggleDescuentoFactura = (e, fId) => {
    e.stopPropagation();
    setFacturasSinDescuento(prev => prev.includes(fId) ? prev.filter(x => x !== fId) : [...prev, fId]);
  };
  const toggleExpandFactura = (e, fId) => {
    e.stopPropagation();
    setExpandedFacturaIds(prev => prev.includes(fId) ? prev.filter(x => x !== fId) : [...prev, fId]);
  };

  const addOtroConcepto = () => setOtrosConceptos(prev => [...prev, { id: newOtroConceptoId(), descripcion: '', valor: '' }]);
  const updateOtroConcepto = (ocId, field, value) => setOtrosConceptos(prev => prev.map(o => (o.id === ocId ? { ...o, [field]: value } : o)));
  const removeOtroConcepto = (ocId) => setOtrosConceptos(prev => prev.filter(o => o.id !== ocId));

  const facturasFiltradas = useMemo(() => {
    if (!facturaSearch.trim()) return facturasDisponibles;
    const q = facturaSearch.trim().toLowerCase();
    return facturasDisponibles.filter(f => String(f.id_manual || f.id).toLowerCase().includes(q));
  }, [facturasDisponibles, facturaSearch]);

  const facturasIdsFinal = useMemo(() => (
    [...facturasVinculadasKeep, ...facturasNuevasSeleccionadas]
  ), [facturasVinculadasKeep, facturasNuevasSeleccionadas]);

  const sugerenciaFacturasTotal = useMemo(() => {
    const vinculadasTotal = facturasVinculadas
      .filter(f => facturasVinculadasKeep.includes(f.id))
      .reduce((sum, f) => sum + (parseFloat(f.valor) || 0), 0);
    const nuevasTotal = facturasNuevasSeleccionadas.reduce((sum, fId) => {
      const fact = facturasDisponibles.find(f => f.id === fId);
      return sum + (fact ? (parseFloat(fact.valor) || 0) : 0);
    }, 0);
    const otrosTotal = otrosConceptos.reduce((sum, o) => sum + (parseInt(o.valor) || 0), 0);
    return vinculadasTotal + nuevasTotal + otrosTotal;
  }, [facturasVinculadas, facturasVinculadasKeep, facturasNuevasSeleccionadas, facturasDisponibles, otrosConceptos]);

  // El % de descuento global solo aplica a las facturas (vinculadas conservadas +
  // nuevas seleccionadas), nunca a "otros conceptos" — mismo criterio que Nueva.
  const descuentoMonto = useMemo(() => {
    const pct = parseFloat(porcentajeDescuento) || 0;
    if (pct <= 0) return 0;
    const montoFactura = (fId) => {
      if (facturasSinDescuento.includes(fId)) return 0;
      const vinculada = facturasVinculadas.find(f => f.id === fId);
      if (vinculada) return Math.round((parseFloat(vinculada.valor) || 0) * (pct / 100));
      const nueva = facturasDisponibles.find(f => f.id === fId);
      return nueva ? Math.round((parseFloat(nueva.valor) || 0) * (pct / 100)) : 0;
    };
    return facturasIdsFinal.reduce((sum, fId) => sum + montoFactura(fId), 0);
  }, [facturasIdsFinal, facturasSinDescuento, facturasVinculadas, facturasDisponibles, porcentajeDescuento]);

  const sugerenciaConDescuento = sugerenciaFacturasTotal - descuentoMonto;

  

  const isEfectivo = medioPago === 'Efectivo';
  const wasEfectivoPagado = comprobante?.estado === 'Pagado' && comprobante?.medio_pago === 'Efectivo';
  const willEfectivoPagado = estado === 'Pagado' && isEfectivo;
  const revierteAPagoNoEfectivo = wasEfectivoPagado && !willEfectivoPagado;
  const nuevoPagoEfectivo = !wasEfectivoPagado && willEfectivoPagado;
  const cambioValorEfectivoPagado = wasEfectivoPagado && willEfectivoPagado && parseInt(valor || 0) !== parseInt(comprobante?.valor || 0);
  const facturasQueSeSoltaran = facturasVinculadas.filter(f => !facturasVinculadasKeep.includes(f.id));

  const proveedorInvalido = isProveedorOtro ? !proveedorOtroNombre.trim() : !proveedor;
  const isFormInvalid = proveedorInvalido
    || !medioPago
    || !estado
    || !recibidoPor.trim()
    || !concepto.trim()
    || (parseInt(valor) || 0) <= 0
    || isSubmitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFormInvalid) return;
    setSubmitError(null);
    setIsSubmitting(true);

    const otrosConceptosPayload = otrosConceptos
      .filter(o => o.descripcion.trim() && (parseInt(o.valor) || 0) > 0)
      .map(o => ({ descripcion: o.descripcion.trim(), valor: parseInt(o.valor) || 0 }));

    const payload = {
      fecha,
      proveedor: isProveedorOtro ? '' : proveedor,
      proveedor_otro_nombre: isProveedorOtro ? proveedorOtroNombre : '',
      recibido_por: recibidoPor,
      medio_pago: medioPago,
      estado,
      valor: String(parseInt(valor) || 0),
      concepto: concepto.trim(),
      descripcion,
      otros_conceptos: otrosConceptosPayload,
      facturas_ids: isProveedorOtro ? [] : facturasIdsFinal,
    };

    try {
      await API.put(`/comprobantes-egreso/${id}/editar/`, payload);
      notify('Comprobante actualizado exitosamente.', 'success');
      navigate('/comprobantes-egreso');
    } catch (err) {
      console.error('Error editando comprobante de egreso:', err);
      const data = err?.response?.data;
      const message = typeof data?.detail === 'string'
        ? data.detail
        : (data && typeof data === 'object' ? Object.values(data).flat().filter(Boolean).join(' ') : null);
      setSubmitError(message || 'No se pudo actualizar el comprobante. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingComprobante) {
    return (
      <div className="ds-page nce-page ds-fade-in">
        <PageHeader icon={FaReceipt} title="Editar Comprobante de Egreso" subtitle="Cargando..." />
      </div>
    );
  }

  if (loadError || !comprobante) {
    return (
      <div className="ds-page nce-page ds-fade-in">
        <PageHeader icon={FaReceipt} title="Editar Comprobante de Egreso" subtitle={loadError || 'Comprobante no disponible.'} />
        <Button variant="secondary" onClick={() => navigate('/comprobantes-egreso')}>Volver</Button>
      </div>
    );
  }

  return (
    <div className="ds-page nce-page ds-fade-in">
      <PageHeader
        icon={FaReceipt}
        title={`Editar Comprobante #${comprobante.id}`}
        subtitle="Modifica cualquier dato del comprobante, incluyendo revertir un pago ya realizado."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => navigate('/comprobantes-egreso')} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="editar-ce-form" loading={isSubmitting} disabled={isFormInvalid}>
              {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        }
      />

      <form id="editar-ce-form" onSubmit={handleSubmit} className="nce-form-layout">
        {/* COLUMNA IZQUIERDA */}
        <div className="nce-left-column">
          <div className="nce-card">
            <div className="nce-card-header">
              <div className="nce-card-icon-badge badge-blue"><FaFileInvoiceDollar /></div>
              <div>
                <h3 className="nce-card-title">Información del Comprobante</h3>
                <p className="nce-card-desc">Todos los campos son editables.</p>
              </div>
            </div>
            <div className="nce-card-body">
              <div className="nce-form-group">
                <label><FaCalendarDay /> Fecha <span className="nce-req">*</span></label>
                <input type="date" required value={fecha} onClick={e => { try { e.target.showPicker(); } catch { /* navegador sin showPicker */ } }} onChange={e => setFecha(e.target.value)} />
              </div>

              <div className="nce-form-group">
                <label><FaBuilding /> Proveedor <span className="nce-req">*</span></label>
                <select required value={proveedor} onChange={e => setProveedor(e.target.value)}>
                  <option value="">Seleccionar proveedor...</option>
                  {Array.isArray(proveedores) && proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre_empresa}</option>
                  ))}
                  <option value={PROVEEDOR_OTRO}>Otro</option>
                </select>
              </div>

              {isProveedorOtro && (
                <div className="nce-form-group">
                  <label>Nombre del Proveedor <span className="nce-req">*</span></label>
                  <input type="text" required placeholder="Ej: Ferretería El Tornillo" value={proveedorOtroNombre} onChange={e => setProveedorOtroNombre(e.target.value)} />
                  <span className="nce-hint">Proveedor no registrado: no se pueden asociar facturas.</span>
                </div>
              )}

              <div className="nce-form-group">
                <label><FaUserCheck /> Recibido por (persona que recibe) <span className="nce-req">*</span></label>
                <input type="text" required placeholder="Nombre de quien recibe el dinero..." value={recibidoPor} onChange={e => setRecibidoPor(e.target.value)} />
              </div>

              <div className="nce-grid-2">
                <div className="nce-form-group">
                  <label><FaMoneyBillWave /> Medio de Pago <span className="nce-req">*</span></label>
                  <select required value={medioPago} onChange={e => setMedioPago(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {MEDIOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="nce-form-group">
                  <label>Valor <span className="nce-req">*</span></label>
                  <div className="nce-prefix-wrap">
                    <span className="nce-prefix">$</span>
                    <input
                      type="text"
                      required
                      placeholder="0"
                      value={valor ? formatCOP(parseInt(valor)).replace('$', '').trim() : ''}
                      onChange={e => setValor(e.target.value.replace(/[^0-9]/g, ''))}
                      className="nce-prefix-input"
                    />
                  </div>
                </div>
              </div>

              {!isProveedorOtro && (
                <div className="nce-form-group">
                  <label>% Descuento Global</label>
                  <div className="nce-suffix-wrap">
                    <input
                      type="number" min="0" max="100" step="0.01" placeholder="0"
                      value={porcentajeDescuento === 0 || porcentajeDescuento === '0' ? '' : porcentajeDescuento}
                      onChange={e => setPorcentajeDescuento(e.target.value)}
                      onBlur={() => { if (porcentajeDescuento === '' || isNaN(parseFloat(porcentajeDescuento))) setPorcentajeDescuento(0); }}
                      className="nce-suffix-input"
                    />
                    <span className="nce-suffix">%</span>
                  </div>
                  <span className="nce-hint">Aplica solo a las facturas vinculadas/agregadas, no a "Otros Conceptos".</span>
                </div>
              )}

              {sugerenciaFacturasTotal > 0 && sugerenciaConDescuento !== (parseInt(valor) || 0) && (
                <div className="nce-hint">
                  Suma de facturas/conceptos seleccionados: {formatCOP(sugerenciaFacturasTotal)}
                  {descuentoMonto > 0 && <> — Descuento ({parseFloat(porcentajeDescuento) || 0}%): -{formatCOP(descuentoMonto)}</>}.{' '}
                  <button type="button" className="nce-btn-add-concepto" style={{ display: 'inline-flex', padding: '0.15rem 0.5rem' }} onClick={() => setValor(String(sugerenciaConDescuento))}>
                    Usar este valor
                  </button>
                </div>
              )}

              <div className="nce-form-group">
                <label>Estado del Comprobante <span className="nce-req">*</span></label>
                <select required value={estado} onChange={e => setEstado(e.target.value)} disabled={!puedeAprobar}>
                  <option value="Por Confirmar Pago">Por Confirmar Pago</option>
                  <option value="Pagado">Pagado</option>
                </select>
                {!puedeAprobar && (
                  <span className="nce-hint">Confirmar o revertir el pago requiere el permiso de aprobar egresos.</span>
                )}
              </div>

              {revierteAPagoNoEfectivo && (
                <div className="nce-warning">
                  <FaUndo /> Vas a <strong>revertir un pago en efectivo ya realizado</strong>. Se registrará un movimiento de <strong>ingreso</strong> en Caja por {formatCOP(comprobante.valor)} para compensar el egreso original, y la(s) factura(s) vinculada(s) volverán a estado "en proceso".
                </div>
              )}
              {nuevoPagoEfectivo && (
                <div className="nce-warning">
                  <FaCheckCircle /> Este cambio marcará el comprobante como <strong>Pagado en efectivo</strong>: se registrará un nuevo movimiento de <strong>egreso</strong> en Caja por {formatCOP(parseInt(valor) || 0)}.
                </div>
              )}
              {cambioValorEfectivoPagado && (
                <div className="nce-warning">
                  <FaExclamationTriangle /> El comprobante sigue Pagado en efectivo pero cambiaste el valor: se revertirá el movimiento original ({formatCOP(comprobante.valor)}) y se registrará uno nuevo por {formatCOP(parseInt(valor) || 0)}.
                </div>
              )}
              {facturasQueSeSoltaran.length > 0 && (
                <div className="nce-warning">
                  <FaExclamationTriangle /> {facturasQueSeSoltaran.length === 1 ? 'La factura' : 'Las facturas'} {facturasQueSeSoltaran.map(f => `#${f.id_manual || f.id}`).join(', ')} se desvinculará(n) de este comprobante y volverá(n) a estado "pendiente".
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="nce-right-column">
          <div className="nce-card">
            <div className="nce-card-header">
              <div className="nce-card-icon-badge badge-indigo"><FaStickyNote /></div>
              <div>
                <h3 className="nce-card-title">Concepto del Pago</h3>
                <p className="nce-card-desc">Facturas vinculadas y conceptos adicionales.</p>
              </div>
            </div>
            <div className="nce-card-body">
              <div className="nce-form-group">
                <label>Concepto <span className="nce-req">*</span></label>
                <input type="text" required value={concepto} onChange={e => setConcepto(e.target.value)} />
              </div>

              {facturasVinculadas.length > 0 && (
                <>
                  <div className="nce-concepto-section-title">📄 Facturas Vinculadas a este Comprobante</div>
                  <div className="nce-facturas-list">
                    {facturasVinculadas.map(f => {
                      const isKept = facturasVinculadasKeep.includes(f.id);
                      const isExpanded = expandedFacturaIds.includes(f.id);
                      const grouped = groupProductos(f.productos || []);
                      return (
                        <div key={f.id} className={`nce-factura-card ${isKept ? 'selected' : ''}`}>
                          <div className="nce-factura-card-header">
                            <label className="nce-factura-check-label">
                              <input type="checkbox" checked={isKept} onChange={() => toggleKeepVinculada(f.id)} />
                              <div className="nce-factura-info">
                                <div className="nce-factura-info-top">
                                  <span className="nce-factura-num">Factura #{f.id_manual || f.id}</span>
                                  <span className={`nce-status-mini ${f.estado === 'pagada' ? 'paid' : 'pending'}`}>{f.estado}</span>
                                </div>
                                <div className="nce-factura-info-dates">
                                  {f.fecha_factura && <span>Factura: {formatDateShort(f.fecha_factura)}</span>}
                                  {f.fecha_pago && <span className="nce-dot">•</span>}
                                  {f.fecha_pago && <span>Pagada: {formatDateShort(f.fecha_pago)}</span>}
                                </div>
                              </div>
                            </label>
                            <span className="nce-factura-valor">{formatCOP(f.valor)}</span>
                          </div>
                          <div className="nce-factura-card-actions">
                            {isKept && (parseFloat(porcentajeDescuento) || 0) > 0 ? (
                              <button type="button" className={`nce-descuento-btn ${facturasSinDescuento.includes(f.id) ? 'disabled' : ''}`} onClick={e => toggleDescuentoFactura(e, f.id)}>
                                {facturasSinDescuento.includes(f.id) ? '🚫 Exenta de Descuento' : `✓ Descuento Aplicado (${parseFloat(porcentajeDescuento) || 0}%)`}
                              </button>
                            ) : (
                              <span className="nce-factura-hint">{isKept ? 'Se mantiene en este comprobante' : 'Se soltará (vuelve a pendiente)'}</span>
                            )}
                            {grouped.length > 0 && (
                              <button type="button" className="nce-ver-productos-btn" onClick={e => toggleExpandFactura(e, f.id)}>
                                {isExpanded ? <><FaChevronUp /> Ocultar productos</> : <><FaChevronDown /> Ver productos ({grouped.length})</>}
                              </button>
                            )}
                          </div>
                          {isExpanded && (
                            <div className="nce-factura-productos">
                              {grouped.map((p, idx) => (
                                <div key={idx} className="nce-factura-producto-row">
                                  <span className="nce-factura-producto-nombre">
                                    {p.cantidad > 1 ? `x${p.cantidad} ` : ''}{p.referencia_nombre}{p.variacion ? ` (${p.variacion})` : ''}
                                  </span>
                                  <span className="nce-factura-producto-costo">{formatCOP((parseFloat(p.costo) || 0) * p.cantidad)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {!isProveedorOtro && proveedor && (
                <>
                  <div className="nce-concepto-section-title nce-concepto-section-title-spaced">➕ Agregar más facturas pendientes</div>
                  <div className="nce-facturas-section">
                    {loadingFacturas ? (
                      <div className="nce-facturas-empty">Cargando facturas del proveedor...</div>
                    ) : facturasDisponibles.length === 0 ? (
                      <div className="nce-facturas-empty">No hay otras facturas pendientes para este proveedor.</div>
                    ) : (
                      <>
                        {facturasDisponibles.length > 5 && (
                          <div className="nce-factura-search">
                            <FaSearch />
                            <input type="text" placeholder="Buscar factura por número..." value={facturaSearch} onChange={e => setFacturaSearch(e.target.value)} />
                          </div>
                        )}
                        <div className="nce-facturas-list">
                          {facturasFiltradas.map(f => {
                            const isSelected = facturasNuevasSeleccionadas.includes(f.id);
                            return (
                              <div key={f.id} className={`nce-factura-card ${isSelected ? 'selected' : ''}`}>
                                <div className="nce-factura-card-header">
                                  <label className="nce-factura-check-label">
                                    <input type="checkbox" checked={isSelected} onChange={() => toggleNuevaFactura(f.id)} />
                                    <div className="nce-factura-info">
                                      <div className="nce-factura-info-top">
                                        <span className="nce-factura-num">Factura #{f.id_manual || f.id}</span>
                                      </div>
                                      {f.fecha_factura && <div className="nce-factura-info-dates"><span>Factura: {formatDateShort(f.fecha_factura)}</span></div>}
                                    </div>
                                  </label>
                                  <span className="nce-factura-valor">{formatCOP(f.valor)}</span>
                                </div>
                                {isSelected && (parseFloat(porcentajeDescuento) || 0) > 0 && (
                                  <div className="nce-factura-card-actions">
                                    <button type="button" className={`nce-descuento-btn ${facturasSinDescuento.includes(f.id) ? 'disabled' : ''}`} onClick={e => toggleDescuentoFactura(e, f.id)}>
                                      {facturasSinDescuento.includes(f.id) ? '🚫 Exenta de Descuento' : `✓ Descuento Aplicado (${parseFloat(porcentajeDescuento) || 0}%)`}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              <div className="nce-concepto-section-title nce-concepto-section-title-spaced">✏️ Otros Conceptos</div>
              <div className="nce-otros-conceptos-section">
                {otrosConceptos.length === 0 ? (
                  <div className="nce-facturas-empty">Sin conceptos adicionales.</div>
                ) : (
                  <div className="nce-otros-conceptos-list">
                    {otrosConceptos.map((o, idx) => (
                      <div key={o.id} className="nce-otro-concepto-row">
                        <span className="nce-otro-concepto-badge">#{idx + 1}</span>
                        <input
                          type="text"
                          placeholder="Ej: Envío, instalación, servicios..."
                          value={o.descripcion}
                          onChange={e => updateOtroConcepto(o.id, 'descripcion', e.target.value)}
                          className="nce-otro-concepto-desc"
                        />
                        <div className="nce-prefix-wrap nce-otro-concepto-valor">
                          <span className="nce-prefix">$</span>
                          <input
                            type="text"
                            placeholder="0"
                            value={o.valor ? formatCOP(parseInt(o.valor)).replace('$', '').trim() : ''}
                            onChange={e => updateOtroConcepto(o.id, 'valor', e.target.value.replace(/[^0-9]/g, ''))}
                            className="nce-prefix-input"
                          />
                        </div>
                        <button type="button" className="nce-otro-concepto-remove" onClick={() => removeOtroConcepto(o.id)} title="Quitar este concepto">
                          <FaTrashAlt />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" className="nce-btn-add-concepto" onClick={addOtroConcepto}>
                  <FaPlus /> Agregar Concepto
                </button>
              </div>
            </div>
          </div>

          <div className="nce-card">
            <div className="nce-card-header">
              <div className="nce-card-icon-badge badge-purple"><FaStickyNote /></div>
              <div>
                <h3 className="nce-card-title">Notas / Observaciones</h3>
                <p className="nce-card-desc">Opcional — detalles adicionales del egreso.</p>
              </div>
            </div>
            <div className="nce-card-body">
              <textarea rows="3" placeholder="Detalles adicionales..." value={descripcion} onChange={e => setDescripcion(e.target.value)} />
            </div>
          </div>

          {submitError && (
            <div className="nce-error-banner">⚠️ {submitError}</div>
          )}
        </div>
      </form>
    </div>
  );
}
