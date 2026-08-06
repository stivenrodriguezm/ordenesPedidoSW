import React, { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { AppContext, usePermissions } from '../AppContext';
import useDebounce from '../hooks/useDebounce';
import './ComprobantesEgreso.css';
import './VentasImprovements.css';
import API from '../services/api';
import { getTodayStr } from '../utils/dates';
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
  FaCheckCircle
} from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import Modal from '../components/Modal';
import { PageHeader, Button } from '../components/ui';

import { formatCOP } from '../utils/formatCOP';

// --- Helper Components ---

const PaymentIcon = ({ method }) => {
  const m = method ? method.toLowerCase() : '';
  if (m.includes('efectivo')) return <div className="payment-icon-wrapper cash"><FaMoneyBillWave /></div>;
  if (m.includes('transferencia') || m.includes('bancolombia')) return <div className="payment-icon-wrapper bank"><FaUniversity /></div>;
  return <div className="payment-icon-wrapper other"><FaCreditCard /></div>;
};

const CreateCEModal = ({ isOpen, onClose, onSave, mediosPago, proveedores, isLoading }) => {
  const todayStr = getTodayStr();

  const [newCE, setNewCE] = useState({ id: '', fecha: todayStr, medio_pago: '', proveedor: '', recibido_por: '', valor: '', descripcion: '', concepto: '' });
  const [motivoOtro, setMotivoOtro] = useState('');
  const [tipoConcepto, setTipoConcepto] = useState('facturas'); // 'facturas' | 'otro'
  const [facturasDisponibles, setFacturasDisponibles] = useState([]);
  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState([]);
  const [facturasSinDescuento, setFacturasSinDescuento] = useState([]);
  const [expandedFacturaIds, setExpandedFacturaIds] = useState([]);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);
  const [savedData, setSavedData] = useState(null);
  const pdfRef = useRef(null);

  const [saldoCaja, setSaldoCaja] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setNewCE({ id: '', fecha: todayStr, medio_pago: '', proveedor: '', recibido_por: '', valor: '', descripcion: '', concepto: '' });
      setMotivoOtro('');
      setTipoConcepto('facturas');
      setFacturasDisponibles([]);
      setFacturasSeleccionadas([]);
      setFacturasSinDescuento([]);
      setExpandedFacturaIds([]);
      setPorcentajeDescuento(0);
      setSavedData(null);
      API.get('/caja/')
        .then(res => {
          if (res.data?.stats?.saldo_actual !== undefined) {
            setSaldoCaja(res.data.stats.saldo_actual);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Auto-load discount % and persona que recibe from proveedor when proveedor changes
  useEffect(() => {
    if (newCE.proveedor && Array.isArray(proveedores)) {
      const prov = proveedores.find(p => String(p.id) === String(newCE.proveedor));
      if (prov) {
        if (prov.porcentaje_descuento != null) {
          setPorcentajeDescuento(parseFloat(prov.porcentaje_descuento) || 0);
        } else {
          setPorcentajeDescuento(0);
        }
        if (prov.nombre_encargado && prov.nombre_encargado !== 'N/A') {
          setNewCE(c => ({ ...c, recibido_por: prov.nombre_encargado }));
        }
      }
    }
  }, [newCE.proveedor, proveedores]);

  // Load facturas when proveedor changes (only in 'facturas' mode)
  useEffect(() => {
    if (tipoConcepto === 'facturas' && newCE.proveedor) {
      setLoadingFacturas(true);
      setFacturasSeleccionadas([]);
      setFacturasSinDescuento([]);
      setExpandedFacturaIds([]);
      API.get('/suministros/facturas/', { params: { proveedor: newCE.proveedor, estado: 'pendiente', page_size: 100, full: 'true' } })
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
    } else {
      setFacturasDisponibles([]);
      setFacturasSeleccionadas([]);
      setFacturasSinDescuento([]);
      setExpandedFacturaIds([]);
    }
  }, [newCE.proveedor, tipoConcepto]);

  // Auto-update Valor Bruto when tipoConcepto === 'facturas'
  useEffect(() => {
    if (tipoConcepto === 'facturas') {
      const totalFacturas = facturasSeleccionadas.reduce((sum, fId) => {
        const fact = facturasDisponibles.find(f => f.id === fId);
        return sum + (fact ? (parseFloat(fact.valor) || 0) : 0);
      }, 0);
      setNewCE(c => ({ ...c, valor: String(Math.round(totalFacturas)) }));
    }
  }, [facturasSeleccionadas, facturasDisponibles, tipoConcepto]);

  const handleChange = (e) => setNewCE({ ...newCE, [e.target.name]: e.target.value });
  const handleValorChange = (e) => {
    if (tipoConcepto === 'facturas') return; // Read-only in facturas mode
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setNewCE({ ...newCE, valor: raw });
  };

  const toggleFactura = (id) => {
    setFacturasSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleDescuentoFactura = (e, id) => {
    e.stopPropagation();
    setFacturasSinDescuento(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleExpandFactura = (e, id) => {
    e.stopPropagation();
    setExpandedFacturaIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const numericVal = parseInt(newCE.valor) || 0;

  const descuentoMonto = useMemo(() => {
    if (tipoConcepto === 'facturas') {
      return facturasSeleccionadas.reduce((sum, fId) => {
        if (facturasSinDescuento.includes(fId)) return sum;
        const fact = facturasDisponibles.find(f => f.id === fId);
        if (!fact) return sum;
        const valFact = parseFloat(fact.valor) || 0;
        return sum + Math.round(valFact * (porcentajeDescuento / 100));
      }, 0);
    } else {
      return Math.round(numericVal * (porcentajeDescuento / 100));
    }
  }, [tipoConcepto, facturasSeleccionadas, facturasSinDescuento, facturasDisponibles, porcentajeDescuento, numericVal]);

  const valorFinal = numericVal - descuentoMonto;

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsGeneratingPDF(true);

    const payload = { ...newCE, valor: String(valorFinal) };
    if (tipoConcepto === 'facturas' && facturasSeleccionadas.length > 0) {
      payload.facturas_ids = facturasSeleccionadas;
      delete payload.concepto;
    }
    if (payload.medio_pago === 'Otro' && motivoOtro) {
      payload.descripcion = `(Medio de pago: ${motivoOtro}) ${payload.descripcion || ''}`.trim();
    }
    
    const provObj = Array.isArray(proveedores) ? proveedores.find(p => String(p.id) === String(newCE.proveedor)) : null;
    const facturasInfo = facturasSeleccionadas.map(id => facturasDisponibles.find(f => f.id === id)).filter(Boolean);

    const pdfData = {
      ...payload,
      id: newCE.id || 'N/A',
      fecha: newCE.fecha || todayStr,
      proveedor_nombre: provObj?.nombre_empresa || 'Proveedor',
      proveedor_nit: provObj?.nit || provObj?.cedula || '',
      recibido_por: newCE.recibido_por || provObj?.nombre_encargado || provObj?.nombre_empresa || '',
      facturas_info: facturasInfo,
      bruto: numericVal,
      descuento_pct: parseFloat(porcentajeDescuento) || 0,
      descuento_monto: descuentoMonto,
      valor_final: valorFinal,
      concepto: payload.concepto || (tipoConcepto === 'facturas' && facturasInfo.length > 0
        ? `Pago fact. ${facturasInfo.map(f => f.id_manual || f.id).join(', ')}`
        : 'Pago a proveedor'),
    };

    try {
      // 1. Post to API
      const createdRes = await onSave(payload);
      const createdId = createdRes?.id || newCE.id || 'N/A';
      pdfData.id = createdId;
      pdfData.estado = createdRes?.estado || (pdfData.medio_pago === 'Efectivo' ? 'Pagado' : 'Por Confirmar Pago');

      // 2. Set saved data & render PDF template
      setSavedData(pdfData);
      await new Promise(r => setTimeout(r, 150));

      if (pdfRef.current) {
        pdfRef.current.style.display = 'block';
        await new Promise(r => setTimeout(r, 250));

        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(pdfRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false,
        });
        pdfRef.current.style.display = 'none';

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
        
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const canvasAspect = canvas.height / canvas.width;
        const imgW = pageW;
        const imgH = imgW * canvasAspect;

        pdf.addImage(imgData, 'PNG', 0, 0, imgW, Math.min(imgH, pageH));
        pdf.save(`Comprobante_Egreso_CE_${createdId}.pdf`);
      }

      onClose();
    } catch (err) {
      console.error('Error procesando comprobante o PDF:', err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const fmt = (v) => v ? formatCOP(v) : '$0';

  const conceptoPreview = tipoConcepto === 'facturas' && facturasSeleccionadas.length > 0
    ? `Pago fact. ${facturasSeleccionadas.map(id => facturasDisponibles.find(f => f.id === id)?.id_manual || id).join(', ')}`
    : null;

  const formatDateShort = (str) => {
    if (!str) return '—';
    const [y, m, d] = str.split('-');
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${parseInt(d)}-${months[parseInt(m)-1]}-${y}`;
  };

  if (!isOpen) return null;

  return createPortal(
    <>
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

            {/* Proveedor & Recibido por */}
            <div className="lottus-form-row">
              <div className="lottus-form-group">
                <label>Proveedor <span className="lottus-req">*</span></label>
                <select name="proveedor" value={newCE.proveedor} onChange={handleChange} required className="lottus-select">
                  <option value="">Seleccionar Proveedor...</option>
                  {Array.isArray(proveedores) && proveedores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre_empresa}</option>
                  ))}
                </select>
              </div>
              <div className="lottus-form-group">
                <label>Recibido por (Persona que recibe) <span className="lottus-hint">(opcional)</span></label>
                <input
                  type="text"
                  name="recibido_por"
                  value={newCE.recibido_por}
                  onChange={handleChange}
                  placeholder="Nombre de quien recibe el dinero..."
                  className="lottus-input"
                />
              </div>
            </div>

            {/* Row 2: Medio de Pago + Valor + Descuento */}
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
                  <label>Valor Bruto <span className="lottus-req">*</span></label>
                  {numericVal > 0 && <span className="lottus-val-preview">{formatCOP(numericVal)}</span>}
                </div>
                <div className="lottus-input-icon">
                  <span className="lottus-prefix">$</span>
                  <input 
                    type="text" 
                    name="valor" 
                    value={newCE.valor ? formatCOP(numericVal).replace('$', '').trim() : ''} 
                    onChange={handleValorChange} 
                    readOnly={tipoConcepto === 'facturas'}
                    required 
                    placeholder="0" 
                    className={`lottus-input lottus-input-pl ${tipoConcepto === 'facturas' ? 'lottus-input-readonly' : ''}`}
                    title={tipoConcepto === 'facturas' ? "El valor bruto se suma automáticamente de las facturas seleccionadas" : ""}
                  />
                </div>
                {tipoConcepto === 'facturas' && (
                  <span className="lottus-hint" style={{ fontSize: '0.72rem', marginTop: '0.25rem', color: 'var(--info)' }}>
                    ⚡ Automático según facturas seleccionadas
                  </span>
                )}
              </div>

              <div className="lottus-form-group" style={{ position: 'relative' }}>
                <label>% Descuento Global</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="0.01"
                    placeholder="0"
                    value={porcentajeDescuento === 0 || porcentajeDescuento === '0' ? '' : porcentajeDescuento} 
                    onChange={e => setPorcentajeDescuento(e.target.value)} 
                    onBlur={() => {
                      if (porcentajeDescuento === '' || isNaN(parseFloat(porcentajeDescuento))) {
                        setPorcentajeDescuento(0);
                      }
                    }}
                    className="lottus-input" 
                    style={{ paddingRight: '2.2rem' }}
                  />
                  <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontSize: '0.85rem', pointerEvents: 'none' }}>%</span>
                </div>
              </div>
            </div>

            {/* Value summary if discount applied */}
            {descuentoMonto > 0 && numericVal > 0 && (
              <div className="lottus-descuento-summary">
                <div className="lottus-descuento-row">
                  <span>Valor bruto total:</span>
                  <span>{formatCOP(numericVal)}</span>
                </div>
                <div className="lottus-descuento-row descuento">
                  <span>Descuento total aplicado:</span>
                  <span>-{formatCOP(descuentoMonto)}</span>
                </div>
                <div className="lottus-descuento-row total">
                  <span><strong>Valor final a pagar:</strong></span>
                  <span><strong>{formatCOP(valorFinal)}</strong></span>
                </div>
              </div>
            )}

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
                    {facturasDisponibles.map(f => {
                      const isSelected = facturasSeleccionadas.includes(f.id);
                      const isDescuentoDisabled = facturasSinDescuento.includes(f.id);
                      const isExpanded = expandedFacturaIds.includes(f.id);
                      const items = f.items_inventario || f.detalles || [];
                      const factVal = parseFloat(f.valor) || 0;
                      const pctDcto = parseFloat(porcentajeDescuento) || 0;
                      const factDcto = isDescuentoDisabled ? 0 : Math.round(factVal * (pctDcto / 100));

                      return (
                        <div
                          key={f.id}
                          className={`lottus-factura-card ${isSelected ? 'selected' : ''}`}
                          style={{
                            flexShrink: 0,
                            border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            marginBottom: '5px',
                            background: isSelected ? '#f8fafc' : '#ffffff',
                            boxShadow: isSelected ? '0 1px 3px rgba(37,99,235,0.08)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Header Row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, minWidth: 0 }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleFactura(f.id)}
                                style={{ width: '15px', height: '15px', accentColor: '#2563eb', cursor: 'pointer', flexShrink: 0 }}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: '700', fontSize: '0.83rem', color: '#0f172a' }}>
                                    Factura #{f.id_manual || f.id}
                                  </span>
                                  {f.observaciones && (
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={f.observaciones}>
                                      📝 {f.observaciones}
                                    </span>
                                  )}
                                </div>
                                {/* Dates: Subtle gray text */}
                                <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {f.fecha_factura && <span>Factura: {formatDateShort(f.fecha_factura)}</span>}
                                  {f.fecha_factura && f.fecha_pago && <span style={{ color: '#cbd5e1' }}>•</span>}
                                  {f.fecha_pago && <span style={{ fontWeight: '600', color: '#0284c7' }}>Vence: {formatDateShort(f.fecha_pago)}</span>}
                                </div>
                              </div>
                            </label>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                              <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' }}>
                                {fmt(f.valor)}
                              </span>
                            </div>
                          </div>

                          {/* Actions Row: Discount Exemption + Ver Productos */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                            <div>
                              {isSelected && pctDcto > 0 ? (
                                <button
                                  type="button"
                                  onClick={(e) => toggleDescuentoFactura(e, f.id)}
                                  style={{
                                    background: isDescuentoDisabled ? '#fff1f2' : '#f0fdf4',
                                    color: isDescuentoDisabled ? '#e11d48' : '#16a34a',
                                    border: `1px solid ${isDescuentoDisabled ? '#fda4af' : '#86efac'}`,
                                    borderRadius: '4px',
                                    padding: '2px 8px',
                                    fontSize: '0.73rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title={isDescuentoDisabled ? "Clic para aplicar el descuento a esta factura" : "Clic para eximir esta factura del descuento"}
                                >
                                  {isDescuentoDisabled ? '🚫 Exenta de Descuento' : `✓ Descuento Aplicado (${pctDcto}%)`}
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
                                  {isSelected ? 'Sin descuento global' : 'Selecciona para pagar'}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleExpandFactura(e, f.id); }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#2563eb',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>{isExpanded ? 'Ocultar productos ▲' : `Ver productos (${items.length}) ▼`}</span>
                            </button>
                          </div>

                          {/* Expanded products content */}
                          {isExpanded && (
                            <div style={{ marginTop: '8px', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              {items.length === 0 ? (
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '4px' }}>
                                  No hay ítems registrados en esta factura.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ fontSize: '0.73rem', fontWeight: '600', color: '#475569', marginBottom: '2px' }}>
                                    Productos recibidos:
                                  </div>
                                  {items.map((item, idx) => (
                                    <div key={item.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '3px 0', borderBottom: idx < items.length - 1 ? '1px dashed #e2e8f0' : 'none' }}>
                                      <span style={{ color: '#1e293b', fontWeight: '500' }}>
                                        {item.referencia_nombre || item.referencia || item.descripcion || 'Producto'}
                                        {item.variacion ? ` (${item.variacion})` : ''}
                                      </span>
                                      <span style={{ color: '#475569' }}>
                                        {item.cantidad} {item.unidad_medida || 'und'} x {fmt(item.costo_especifico || item.costo || item.costo_unitario)} = <strong>{fmt((item.cantidad || 1) * (parseFloat(item.costo_especifico || item.costo || item.costo_unitario) || 0))}</strong>
                                      </span>
                                    </div>
                                  ))}
                                  {factDcto > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#16a34a', fontWeight: '600', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #dcfce7' }}>
                                      <span>Descuento individual ({pctDcto}%):</span>
                                      <span>-{fmt(factDcto)}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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

            {/* Warning when cash balance is insufficient */}
            {(() => {
              const isEfectivo = newCE.medio_pago?.toLowerCase() === 'efectivo';
              const numericVal = parseFloat(newCE.valor) || 0;
              const isExceedingCash = isEfectivo && saldoCaja !== null && numericVal > saldoCaja;
              if (!isExceedingCash) return null;
              return (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⚠️</span>
                  <span>Saldo insuficiente en caja de efectivo. Saldo disponible: {formatCOP(saldoCaja)}. Intenta egresar: {formatCOP(numericVal)}.</span>
                </div>
              );
            })()}

            {/* Footer Actions */}
            <div className="lottus-modal-actions">
              <button type="button" className="lottus-btn-cancel" onClick={onClose} disabled={isLoading}>
                Cancelar
              </button>
              <button
                type="submit"
                className="lottus-btn-submit"
                disabled={(() => {
                  const isEfectivo = newCE.medio_pago?.toLowerCase() === 'efectivo';
                  const numericVal = parseFloat(newCE.valor) || 0;
                  const isExceedingCash = isEfectivo && saldoCaja !== null && numericVal > saldoCaja;
                  return isLoading || !newCE.id || !newCE.proveedor || !newCE.medio_pago || numericVal <= 0 || isExceedingCash;
                })()}
              >
                {isLoading ? 'Guardando...' : 'Crear Comprobante'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Hidden PDF template for Letter print */}
      {savedData && (
        <div
          ref={pdfRef}
          style={{
            display: 'none',
            position: 'absolute',
            top: '-9999px',
            left: '-9999px',
            width: '794px',
            backgroundColor: '#ffffff',
            padding: '40px 48px',
            fontFamily: '"Segoe UI", Arial, sans-serif',
            color: '#0f172a',
            boxSizing: 'border-box',
            borderRadius: '0'
          }}
        >
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px', borderRadius: '0' }}>
            {/* Logo LOTTUS - Audiowide Regular, explicit padding for html2canvas vertical centering */}
            <div style={{ backgroundColor: '#000', padding: '6px 22px 14px 22px', display: 'inline-block', borderRadius: '0' }}>
              <span style={{ color: '#ffffff', fontWeight: '400', fontSize: '22px', letterSpacing: '4px', fontFamily: '"Audiowide", cursive, sans-serif', textTransform: 'uppercase', lineHeight: '1', margin: 0, padding: 0, display: 'block' }}>
                LOTTUS
              </span>
            </div>
            
            {/* Document Title */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '3px' }}>
                COMPROBANTE DE EGRESO
              </div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', letterSpacing: '0.5px' }}>
                NO. CE-{savedData.id}
              </div>
              <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: '600' }}>
                FECHA: {formatDateShort(savedData.fecha)}
              </div>
            </div>
          </div>

          {/* General Metadata Box (Clean subtle grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #cbd5e1', marginBottom: '22px', borderRadius: '0' }}>
            <div style={{ padding: '12px 16px', borderRight: '1px solid #cbd5e1', borderRadius: '0' }}>
              <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '1px', marginBottom: '4px' }}>
                BENEFICIARIO / PROVEEDOR
              </div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                {savedData.proveedor_nombre || 'N/A'}
              </div>
              {savedData.recibido_por && (
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px', fontWeight: '600' }}>
                  Recibido por: {savedData.recibido_por}
                </div>
              )}
            </div>

            <div style={{ padding: '12px 16px', borderRadius: '0' }}>
              <div style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '1px', marginBottom: '4px' }}>
                MEDIO DE PAGO
              </div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                {savedData.medio_pago || 'Efectivo'}
              </div>
              <div style={{ fontSize: '11px', color: '#475569', fontWeight: '600', marginTop: '3px' }}>
                Estado: Pagado
              </div>
            </div>
          </div>

          {/* Facturas Detail Table (if facturas payment) */}
          {savedData.facturas_info && savedData.facturas_info.length > 0 && (
            <div style={{ marginBottom: '22px', borderRadius: '0' }}>
              <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', color: '#475569' }}>
                DETALLE DE FACTURAS PAGADAS
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#000000', color: '#ffffff', borderRadius: '0' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', borderRight: '1px solid #333333', color: '#ffffff' }}>No. Factura</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', borderRight: '1px solid #333333', color: '#ffffff' }}>Fecha Emisión</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', borderRight: '1px solid #333333', color: '#ffffff' }}>Fecha Vencimiento</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#ffffff' }}>Valor Bruto</th>
                  </tr>
                </thead>
                <tbody>
                  {savedData.facturas_info.map((f, i) => (
                    <tr key={f.id || i} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '700', borderRight: '1px solid #e2e8f0' }}>Factura #{f.id_manual || f.id}</td>
                      <td style={{ padding: '8px 12px', color: '#475569', borderRight: '1px solid #e2e8f0' }}>{formatDateShort(f.fecha_factura)}</td>
                      <td style={{ padding: '8px 12px', color: '#475569', borderRight: '1px solid #e2e8f0' }}>{formatDateShort(f.fecha_pago)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{fmt(f.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals Summary Box (Clean, non-red discount) */}
          <div style={{ marginLeft: 'auto', width: '290px', border: '1px solid #cbd5e1', marginBottom: '28px', borderRadius: '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
              <span style={{ color: '#475569', fontWeight: '600' }}>VALOR BRUTO</span>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>{formatCOP(savedData.bruto)}</span>
            </div>
            {savedData.descuento_monto > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
                <span style={{ color: '#475569', fontWeight: '600' }}>DESCUENTO ({savedData.descuento_pct}%)</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>-{formatCOP(savedData.descuento_monto)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#000000', color: '#ffffff', borderRadius: '0' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '0.5px', color: '#ffffff' }}>NETO A PAGAR</span>
              <span style={{ fontSize: '14px', fontWeight: '900', color: '#ffffff' }}>{formatCOP(savedData.valor_final)}</span>
            </div>
          </div>

          {/* Signature Area (Single Recipient signature box with generous height) */}
          <div style={{ marginTop: '32px', paddingTop: '10px', borderRadius: '0' }}>
            <div style={{ border: '1px solid #cbd5e1', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '170px', borderRadius: '0' }}>
              <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#475569', letterSpacing: '1px' }}>
                RECIBÍ CONFORME (BENEFICIARIO / PROVEEDOR)
              </div>
              <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '8px', marginTop: '75px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a' }}>Firma, C.C. / NIT y Fecha de Recepción</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Nombre: {savedData.recibido_por || savedData.proveedor_nombre}</div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div style={{ marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '8px', textAlign: 'center', fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
            LOTTUS • DOCUMENTO OFICIAL DE COMPROBANTE DE EGRESO • GENERADO EL {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
          </div>
        </div>
      )}
    </>,
    document.body
  );
};


const ComprobantesEgreso = () => {
  const { proveedores, usuario, notify } = useContext(AppContext);
  const location = useLocation();
  const hasPermission = usePermissions();
  const [comprobantesData, setComprobantesData] = useState([]);

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') setIsCreatingCE(true);
  }, [location]);

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

  const handleCreateCE = async (ceData) => {
    setIsSubmitting(true);
    try {
      const res = await API.post(`/comprobantes-egreso/crear/`, ceData);
      setNotification({ message: 'Comprobante creado exitosamente.', type: 'success' });
      fetchData(filters, 1);
      return res.data;
    } catch (error) {
      const data = error.response?.data;
      const errorMsg = data?.detail || data?.error || (typeof data === 'string' ? data : (data ? JSON.stringify(data) : 'Error al crear el comprobante de egreso.'));
      setNotification({ message: errorMsg, type: 'error' });
      throw error;
    } finally {
      setIsSubmitting(false);
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
              <Button variant="primary" icon={FaPlus} onClick={() => setIsCreatingCE(true)}>
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
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className={`status-badge ${item.estado === 'Pagado' ? 'paid' : 'pending'}`}>
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
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 1px 3px rgba(37,99,235,0.2)',
                              transition: 'all 0.15s ease'
                            }}
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
