import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaReceipt, FaCalendarDay, FaBuilding, FaUserCheck, FaMoneyBillWave,
  FaStickyNote, FaChevronDown, FaChevronUp, FaSearch, FaBoxOpen, FaFileInvoiceDollar,
  FaPlus, FaTrashAlt,
} from 'react-icons/fa';
import API from '../services/api';
import { AppContext } from '../AppContext';
import { getTodayStr } from '../utils/dates';
import { formatCOP } from '../utils/formatCOP';
import { PageHeader, Button } from '../components/ui';
import ComprobanteEgresoPrintModal from '../components/ComprobanteEgresoPrintModal';
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

export default function NuevaComprobanteEgresoPage() {
  const { proveedores, notify } = useContext(AppContext);
  const navigate = useNavigate();
  const todayStr = getTodayStr();

  const [fecha, setFecha] = useState(todayStr);
  const [proveedor, setProveedor] = useState('');
  const [proveedorOtroNombre, setProveedorOtroNombre] = useState('');
  const [recibidoPor, setRecibidoPor] = useState('');
  const [medioPago, setMedioPago] = useState('');
  const [motivoOtro, setMotivoOtro] = useState('');
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);
  const [descripcion, setDescripcion] = useState('');

  // Concepto "mixto": facturas seleccionadas Y conceptos libres pueden combinarse
  // libremente — elegir uno nunca borra al otro.
  const [otrosConceptos, setOtrosConceptos] = useState([]); // [{ id, descripcion, valor }]

  const [facturasDisponibles, setFacturasDisponibles] = useState([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState([]);
  const [facturasSinDescuento, setFacturasSinDescuento] = useState([]);
  const [expandedFacturaIds, setExpandedFacturaIds] = useState([]);
  const [facturaSearch, setFacturaSearch] = useState('');

  const [saldoCaja, setSaldoCaja] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [printPreview, setPrintPreview] = useState(null); // comprobante recién creado

  const isProveedorOtro = proveedor === PROVEEDOR_OTRO;

  useEffect(() => {
    API.get('/caja/')
      .then(res => {
        if (res.data?.stats?.saldo_actual !== undefined) setSaldoCaja(res.data.stats.saldo_actual);
      })
      .catch(() => {});
  }, []);

  // Auto-completar % descuento y "recibido por" según el proveedor
  useEffect(() => {
    if (!proveedor || isProveedorOtro || !Array.isArray(proveedores)) return;
    const prov = proveedores.find(p => String(p.id) === String(proveedor));
    if (!prov) return;
    setPorcentajeDescuento(prov.porcentaje_descuento != null ? parseFloat(prov.porcentaje_descuento) || 0 : 0);
    if (prov.nombre_encargado && prov.nombre_encargado !== 'N/A') {
      setRecibidoPor(prov.nombre_encargado);
    }
  }, [proveedor, proveedores]);

  // Cargar facturas pendientes del proveedor (proveedor "Otro" no tiene facturas propias)
  useEffect(() => {
    if (!proveedor || isProveedorOtro) {
      setFacturasDisponibles([]);
      setFacturasSeleccionadas([]);
      setFacturasSinDescuento([]);
      setExpandedFacturaIds([]);
      return;
    }
    setLoadingFacturas(true);
    setFacturasSeleccionadas([]);
    setFacturasSinDescuento([]);
    setExpandedFacturaIds([]);
    API.get('/suministros/facturas/', { params: { proveedor, estado: 'pendiente', page_size: 100, full: 'true' } })
      .then(res => {
        const all = res.data.results || res.data;
        if (Array.isArray(all)) {
          const sorted = [...all].sort((a, b) => {
            const dateA = a.fecha_pago || a.fecha_factura || '9999-12-31';
            const dateB = b.fecha_pago || b.fecha_factura || '9999-12-31';
            return dateA.localeCompare(dateB);
          });
          setFacturasDisponibles(sorted);
        } else {
          setFacturasDisponibles([]);
        }
      })
      .catch(() => setFacturasDisponibles([]))
      .finally(() => setLoadingFacturas(false));
  }, [proveedor]);

  const toggleFactura = (fId) => {
    setFacturasSeleccionadas(prev => prev.includes(fId) ? prev.filter(x => x !== fId) : [...prev, fId]);
  };
  const toggleDescuentoFactura = (e, fId) => {
    e.stopPropagation();
    setFacturasSinDescuento(prev => prev.includes(fId) ? prev.filter(x => x !== fId) : [...prev, fId]);
  };
  const toggleExpandFactura = (e, fId) => {
    e.stopPropagation();
    setExpandedFacturaIds(prev => prev.includes(fId) ? prev.filter(x => x !== fId) : [...prev, fId]);
  };

  const addOtroConcepto = () => {
    setOtrosConceptos(prev => [...prev, { id: newOtroConceptoId(), descripcion: '', valor: '' }]);
  };
  const updateOtroConcepto = (ocId, field, value) => {
    setOtrosConceptos(prev => prev.map(o => (o.id === ocId ? { ...o, [field]: value } : o)));
  };
  const removeOtroConcepto = (ocId) => {
    setOtrosConceptos(prev => prev.filter(o => o.id !== ocId));
  };

  const facturasFiltradas = useMemo(() => {
    if (!facturaSearch.trim()) return facturasDisponibles;
    const q = facturaSearch.trim().toLowerCase();
    return facturasDisponibles.filter(f => String(f.id_manual || f.id).toLowerCase().includes(q));
  }, [facturasDisponibles, facturaSearch]);

  const facturasTotal = facturasSeleccionadas.reduce((sum, fId) => {
    const fact = facturasDisponibles.find(f => f.id === fId);
    return sum + (fact ? (parseFloat(fact.valor) || 0) : 0);
  }, 0);
  const otrosTotal = otrosConceptos.reduce((sum, o) => sum + (parseInt(o.valor) || 0), 0);
  const numericVal = facturasTotal + otrosTotal;

  // El % de descuento global solo aplica a facturas de proveedor, no a conceptos libres.
  const descuentoMonto = useMemo(() => {
    const pct = parseFloat(porcentajeDescuento) || 0;
    return facturasSeleccionadas.reduce((sum, fId) => {
      if (facturasSinDescuento.includes(fId)) return sum;
      const fact = facturasDisponibles.find(f => f.id === fId);
      if (!fact) return sum;
      return sum + Math.round((parseFloat(fact.valor) || 0) * (pct / 100));
    }, 0);
  }, [facturasSeleccionadas, facturasSinDescuento, facturasDisponibles, porcentajeDescuento]);

  const valorFinal = numericVal - descuentoMonto;

  // Productos consolidados de todas las facturas seleccionadas — la vista
  // "fácil" de ver qué se está pagando, sin tener que abrir factura por factura.
  const productosIncluidos = useMemo(() => {
    const list = [];
    facturasSeleccionadas.forEach(fId => {
      const fact = facturasDisponibles.find(f => f.id === fId);
      if (!fact) return;
      const items = fact.items_inventario || fact.detalles || [];
      items.forEach(item => {
        list.push({
          key: `${fId}-${item.id || item.id_referencia || list.length}`,
          facturaLabel: fact.id_manual || fact.id,
          nombre: item.referencia_nombre || item.referencia || item.descripcion || 'Producto',
          variacion: item.variacion || '',
          costo: parseFloat(item.costo_especifico ?? item.costo ?? item.costo_unitario) || 0,
        });
      });
    });
    return list;
  }, [facturasSeleccionadas, facturasDisponibles]);

  const otrosConceptosValidos = otrosConceptos.filter(o => o.descripcion.trim());

  const conceptoPreview = useMemo(() => {
    const facturasPart = facturasSeleccionadas.length > 0
      ? `Pago fact. ${facturasSeleccionadas.map(fId => facturasDisponibles.find(f => f.id === fId)?.id_manual || fId).join(', ')}`
      : '';
    const otrosPart = otrosConceptosValidos.map(o => o.descripcion.trim()).join(', ');
    return [facturasPart, otrosPart].filter(Boolean).join(' + ') || null;
  }, [facturasSeleccionadas, facturasDisponibles, otrosConceptosValidos]);

  const isEfectivo = medioPago === 'Efectivo';
  const isExceedingCash = isEfectivo && saldoCaja !== null && valorFinal > saldoCaja;

  const proveedorInvalido = !proveedor || (isProveedorOtro && !proveedorOtroNombre.trim());
  const tieneAlgoQuePagar = facturasSeleccionadas.length > 0
    || otrosConceptos.some(o => o.descripcion.trim() && (parseInt(o.valor) || 0) > 0);
  const isFormInvalid = proveedorInvalido
    || !medioPago
    || (medioPago === 'Otro' && !motivoOtro.trim())
    || !recibidoPor.trim()
    || valorFinal <= 0
    || isExceedingCash
    || !tieneAlgoQuePagar;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFormInvalid) return;
    setSubmitError(null);
    setIsSubmitting(true);

    const otrosBreakdown = otrosConceptos
      .filter(o => o.descripcion.trim() && (parseInt(o.valor) || 0) > 0)
      .map(o => `${o.descripcion.trim()}: ${formatCOP(parseInt(o.valor))}`)
      .join('; ');

    const notasFinal = [
      otrosBreakdown ? `Conceptos adicionales — ${otrosBreakdown}.` : '',
      medioPago === 'Otro' && motivoOtro ? `(Medio de pago: ${motivoOtro})` : '',
      descripcion || '',
    ].filter(Boolean).join(' ').trim();

    const payload = {
      fecha,
      proveedor: isProveedorOtro ? '' : proveedor,
      proveedor_otro_nombre: isProveedorOtro ? proveedorOtroNombre : '',
      recibido_por: recibidoPor,
      medio_pago: medioPago,
      valor: String(valorFinal),
      concepto: conceptoPreview || 'Pago a proveedor',
      descripcion: notasFinal,
    };
    if (facturasSeleccionadas.length > 0) {
      payload.facturas_ids = facturasSeleccionadas;
    }

    try {
      const res = await API.post('/comprobantes-egreso/crear/', payload);
      notify('Comprobante creado exitosamente.', 'success');
      setPrintPreview(res.data);
    } catch (err) {
      console.error('Error creando comprobante de egreso:', err);
      const data = err?.response?.data;
      const message = typeof data?.detail === 'string'
        ? data.detail
        : (data && typeof data === 'object' ? Object.values(data).flat().filter(Boolean).join(' ') : null);
      setSubmitError(message || 'No se pudo crear el comprobante. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClosePrintPreview = () => {
    setPrintPreview(null);
    navigate('/comprobantes-egreso');
  };

  return (
    <div className="ds-page nce-page ds-fade-in">
      <PageHeader
        icon={FaReceipt}
        title="Nuevo Comprobante de Egreso"
        subtitle="Registra un pago realizado a un proveedor."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {valorFinal > 0 && (
              <div className="nce-header-total">
                <span className="nce-header-total-label">Total a Pagar</span>
                <span className="nce-header-total-value">{formatCOP(valorFinal)}</span>
              </div>
            )}
            <Button variant="secondary" onClick={() => navigate('/comprobantes-egreso')} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="nueva-ce-form" loading={isSubmitting} disabled={isFormInvalid || isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear Comprobante'}
            </Button>
          </div>
        }
      />

      <form id="nueva-ce-form" onSubmit={handleSubmit} className="nce-form-layout">
        {/* COLUMNA IZQUIERDA */}
        <div className="nce-left-column">
          <div className="nce-card">
            <div className="nce-card-header">
              <div className="nce-card-icon-badge badge-blue"><FaFileInvoiceDollar /></div>
              <div>
                <h3 className="nce-card-title">Información del Comprobante</h3>
                <p className="nce-card-desc">Datos generales del egreso.</p>
              </div>
            </div>
            <div className="nce-card-body">
              <div className="nce-form-group">
                <label><FaCalendarDay /> Fecha <span className="nce-req">*</span></label>
                <input type="date" required value={fecha} onClick={e => { try { e.target.showPicker(); } catch (err) {} }} onChange={e => setFecha(e.target.value)} />
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
                  <span className="nce-hint">Proveedor no registrado: no se podrán asociar facturas.</span>
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
                </div>
              </div>

              {medioPago === 'Otro' && (
                <div className="nce-form-group">
                  <label>Especificar Medio <span className="nce-req">*</span></label>
                  <input type="text" required placeholder="Ej: Tarjeta Crédito" value={motivoOtro} onChange={e => setMotivoOtro(e.target.value)} />
                </div>
              )}
            </div>
          </div>

          <div className="nce-card">
            <div className="nce-card-header">
              <div className="nce-card-icon-badge badge-green"><FaMoneyBillWave /></div>
              <div>
                <h3 className="nce-card-title">Resumen de Pago</h3>
                <p className="nce-card-desc">Se actualiza en vivo según lo seleccionado.</p>
              </div>
            </div>
            <div className="nce-card-body">
              <div className="nce-resumen-row">
                <span>Valor Bruto</span>
                <span>{formatCOP(numericVal)}</span>
              </div>
              {facturasTotal > 0 && otrosTotal > 0 && (
                <div className="nce-resumen-row nce-resumen-sub">
                  <span>· Facturas</span>
                  <span>{formatCOP(facturasTotal)}</span>
                </div>
              )}
              {facturasTotal > 0 && otrosTotal > 0 && (
                <div className="nce-resumen-row nce-resumen-sub">
                  <span>· Otros conceptos</span>
                  <span>{formatCOP(otrosTotal)}</span>
                </div>
              )}
              {descuentoMonto > 0 && (
                <div className="nce-resumen-row nce-resumen-descuento">
                  <span>Descuento facturas ({parseFloat(porcentajeDescuento) || 0}%)</span>
                  <span>-{formatCOP(descuentoMonto)}</span>
                </div>
              )}
              <div className="nce-resumen-total">
                <span>Neto a Pagar</span>
                <span>{formatCOP(valorFinal)}</span>
              </div>

              {isExceedingCash && (
                <div className="nce-warning">
                  ⚠️ Saldo insuficiente en caja. Disponible: {formatCOP(saldoCaja)}.
                </div>
              )}

              {productosIncluidos.length > 0 && (
                <div className="nce-productos-incluidos">
                  <div className="nce-productos-incluidos-title">
                    <FaBoxOpen /> Productos incluidos en este pago ({productosIncluidos.length})
                  </div>
                  <div className="nce-productos-incluidos-list">
                    {productosIncluidos.map(p => (
                      <div key={p.key} className="nce-producto-incluido-item">
                        <span className="nce-producto-incluido-fact">#{p.facturaLabel}</span>
                        <span className="nce-producto-incluido-nombre">
                          {p.nombre}{p.variacion ? ` — ${p.variacion}` : ''}
                        </span>
                        <span className="nce-producto-incluido-costo">{formatCOP(p.costo)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {otrosConceptosValidos.length > 0 && (
                <div className="nce-productos-incluidos">
                  <div className="nce-productos-incluidos-title">
                    <FaStickyNote /> Otros conceptos incluidos ({otrosConceptosValidos.length})
                  </div>
                  <div className="nce-productos-incluidos-list">
                    {otrosConceptosValidos.map(o => (
                      <div key={o.id} className="nce-producto-incluido-item">
                        <span className="nce-producto-incluido-nombre">{o.descripcion}</span>
                        <span className="nce-producto-incluido-costo">{formatCOP(parseInt(o.valor) || 0)}</span>
                      </div>
                    ))}
                  </div>
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
                <p className="nce-card-desc">Selecciona facturas y/o agrega conceptos adicionales — se pueden combinar libremente.</p>
              </div>
            </div>
            <div className="nce-card-body">
              <div className="nce-concepto-section-title">📄 Facturas Pendientes</div>
              <div className="nce-facturas-section">
                {!proveedor || isProveedorOtro ? (
                  <div className="nce-facturas-empty">
                    {isProveedorOtro ? "Proveedor no registrado: no hay facturas para asociar." : 'Selecciona un proveedor para ver sus facturas pendientes.'}
                  </div>
                ) : loadingFacturas ? (
                  <div className="nce-facturas-empty">Cargando facturas del proveedor...</div>
                ) : facturasDisponibles.length === 0 ? (
                  <div className="nce-facturas-empty">No hay facturas pendientes para este proveedor.</div>
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
                        const isSelected = facturasSeleccionadas.includes(f.id);
                        const isDescuentoDisabled = facturasSinDescuento.includes(f.id);
                        const isExpanded = expandedFacturaIds.includes(f.id);
                        const items = f.items_inventario || f.detalles || [];
                        const pctDcto = parseFloat(porcentajeDescuento) || 0;
                        const factDcto = isDescuentoDisabled ? 0 : Math.round((parseFloat(f.valor) || 0) * (pctDcto / 100));

                        return (
                          <div key={f.id} className={`nce-factura-card ${isSelected ? 'selected' : ''}`}>
                            <div className="nce-factura-card-header">
                              <label className="nce-factura-check-label">
                                <input type="checkbox" checked={isSelected} onChange={() => toggleFactura(f.id)} />
                                <div className="nce-factura-info">
                                  <div className="nce-factura-info-top">
                                    <span className="nce-factura-num">Factura #{f.id_manual || f.id}</span>
                                    {f.observaciones && <span className="nce-factura-obs" title={f.observaciones}>📝 {f.observaciones}</span>}
                                  </div>
                                  <div className="nce-factura-info-dates">
                                    {f.fecha_factura && <span>Factura: {formatDateShort(f.fecha_factura)}</span>}
                                    {f.fecha_factura && f.fecha_pago && <span className="nce-dot">•</span>}
                                    {f.fecha_pago && <span className="nce-factura-vence">Vence: {formatDateShort(f.fecha_pago)}</span>}
                                  </div>
                                </div>
                              </label>
                              <span className="nce-factura-valor">{formatCOP(f.valor)}</span>
                            </div>

                            <div className="nce-factura-card-actions">
                              {isSelected && pctDcto > 0 ? (
                                <button type="button" className={`nce-descuento-btn ${isDescuentoDisabled ? 'disabled' : ''}`} onClick={e => toggleDescuentoFactura(e, f.id)}>
                                  {isDescuentoDisabled ? '🚫 Exenta de Descuento' : `✓ Descuento Aplicado (${pctDcto}%)`}
                                </button>
                              ) : (
                                <span className="nce-factura-hint">{isSelected ? 'Sin descuento global' : 'Selecciona para pagar'}</span>
                              )}
                              <button type="button" className="nce-ver-productos-btn" onClick={e => toggleExpandFactura(e, f.id)}>
                                {isExpanded ? <><FaChevronUp /> Ocultar productos</> : <><FaChevronDown /> Ver productos ({items.length})</>}
                              </button>
                            </div>

                            {isExpanded && (
                              <div className="nce-factura-productos">
                                {items.length === 0 ? (
                                  <div className="nce-factura-productos-empty">No hay ítems registrados en esta factura.</div>
                                ) : (
                                  <>
                                    {items.map((item, idx) => (
                                      <div key={item.id || item.id_referencia || idx} className="nce-factura-producto-row">
                                        <span className="nce-factura-producto-nombre">
                                          {item.referencia_nombre || item.referencia || item.descripcion || 'Producto'}
                                          {item.variacion ? ` (${item.variacion})` : ''}
                                        </span>
                                        <span className="nce-factura-producto-costo">
                                          {formatCOP(item.costo_especifico ?? item.costo ?? item.costo_unitario)}
                                        </span>
                                      </div>
                                    ))}
                                    {factDcto > 0 && (
                                      <div className="nce-factura-producto-descuento">
                                        <span>Descuento individual ({pctDcto}%)</span>
                                        <span>-{formatCOP(factDcto)}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="nce-concepto-section-title nce-concepto-section-title-spaced">✏️ Otros Conceptos</div>
              <div className="nce-otros-conceptos-section">
                {otrosConceptos.length === 0 ? (
                  <div className="nce-facturas-empty">Sin conceptos adicionales. Úsalo para envíos, instalaciones, servicios u otros pagos que no correspondan a una factura.</div>
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

              {conceptoPreview && (
                <div className="nce-concepto-preview">
                  Concepto generado: <strong>{conceptoPreview}</strong>
                </div>
              )}
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

      <ComprobanteEgresoPrintModal
        open={!!printPreview}
        onClose={handleClosePrintPreview}
        comprobante={printPreview}
      />
    </div>
  );
}
