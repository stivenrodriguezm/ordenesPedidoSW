import { useExportacion } from '../hooks/useExportacion';
import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { AppContext, usePermissions } from '../AppContext';
import './RecibosCaja.css';
import { useIdempotencia } from '../hooks/useIdempotencia';
import { confirmarDescarte, useDialogo } from '../hooks/useDialogo';
import { useFiltrosUrl } from '../hooks/useFiltrosUrl';
import API from '../services/api';
import { getTodayStr } from '../utils/dates';
import {
  FaFileExport,
  FaPlus,
  FaTimes,
  FaCheckCircle,
  FaSearch,
  FaMoneyBillWave,
  FaCreditCard,
  FaUniversity,
  FaMobileAlt,
  FaCalendarDay,
  FaWallet,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaCalculator,
  FaEdit,
  FaLock,
  FaBan,
  FaExclamationTriangle,
  FaCamera
} from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import Modal from '../components/Modal';
import { PageHeader, Button, Badge } from '../components/ui';

import { formatCOP } from '../utils/formatCOP';
import { AdjuntarComprobantes, FotosReciboModal } from '../components/recibos/FotosComprobante';
import { miniatura } from '../utils/comprobantesRecibo';
import '../components/recibos/FotosComprobante.css';
import { usePendientesIds } from '../hooks/useSharedData';

// --- Helper Components ---

const PaymentIcon = ({ method }) => {
  const m = method ? method.toLowerCase() : '';
  if (m.includes('efectivo')) return <div className="payment-icon-wrapper cash"><FaMoneyBillWave /></div>;
  if (m.includes('davivienda') || m.includes('bancolombia')) return <div className="payment-icon-wrapper bank"><FaUniversity /></div>;
  if (m.includes('bold') || m.includes('datafono')) return <div className="payment-icon-wrapper card"><FaCalculator /></div>;
  return <div className="payment-icon-wrapper other"><FaMobileAlt /></div>;
};

const PAYMENT_METHODS = [
  { label: 'Efectivo', icon: <FaMoneyBillWave /> },
  { label: 'Davivienda', icon: <FaUniversity /> },
  { label: 'Bancolombia', icon: <FaUniversity /> },
  { label: 'Bold', icon: <FaCalculator /> },
  { label: 'Datafono Lottus', icon: <FaCreditCard /> },
  { label: 'Otro', icon: <FaMobileAlt /> },
];

const emptyPago = () => ({ metodo_pago: '', valor: '' });

// Número automático o manual (2026-10-28): el formulario siempre abre en Manual (pedido del usuario).

const CreateRCModal = ({ isOpen, onClose, onSave, ventas, isLoading }) => {
  const todayStr = getTodayStr();

  const [newRC, setNewRC] = useState({ id: '', fecha: todayStr, venta: '', nota: '', pagos: [emptyPago()] });
  const [ventaSearch, setVentaSearch] = useState('');
  const [showVentaDropdown, setShowVentaDropdown] = useState(false);
  const [numeroAutomatico, setNumeroAutomatico] = useState(false);
  const [siguienteNumero, setSiguienteNumero] = useState(null);
  const [comprobantes, setComprobantes] = useState([]);
  const [subiendoFotos, setSubiendoFotos] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setNewRC({ id: '', fecha: todayStr, venta: '', nota: '', pagos: [emptyPago()] });
      setVentaSearch('');
      setShowVentaDropdown(false);
      setComprobantes([]);
      setNumeroAutomatico(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !numeroAutomatico) return undefined;
    let vigente = true;
    setSiguienteNumero(null);
    API.get('/recibos-caja/siguiente-numero/').then(({ data }) => { if (vigente) setSiguienteNumero(data.numero); }).catch(() => {});
    return () => { vigente = false; };
  }, [isOpen, numeroAutomatico]);


  const handleChange = (e) => setNewRC({ ...newRC, [e.target.name]: e.target.name === 'id' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value });

  const handlePagoMetodo = (index, metodo) => {
    const pagos = [...newRC.pagos];
    pagos[index] = { ...pagos[index], metodo_pago: metodo };
    setNewRC({ ...newRC, pagos });
  };
  const handlePagoValor = (index, e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const pagos = [...newRC.pagos];
    pagos[index] = { ...pagos[index], valor: raw };
    setNewRC({ ...newRC, pagos });
  };
  const handleAddPago = () => setNewRC({ ...newRC, pagos: [...newRC.pagos, emptyPago()] });
  const handleRemovePago = (index) => setNewRC({ ...newRC, pagos: newRC.pagos.filter((_, i) => i !== index) });

  const handleSubmit = (e) => {
    e.preventDefault();
    const pagosValidos = newRC.pagos.filter(p => p.metodo_pago && (parseInt(p.valor) || 0) > 0);
    if (pagosValidos.length === 0 || subiendoFotos > 0) return;
    const { id, ...resto } = newRC;
    onSave({
      ...resto,
      ...(numeroAutomatico ? { numero_automatico: true } : { id: parseInt(id, 10) }),
      comprobantes,
      pagos: pagosValidos.map(p => ({ metodo_pago: p.metodo_pago, valor: parseInt(p.valor) || 0 })),
    });
  };

  const hayCambios = Boolean(newRC.venta || newRC.nota || comprobantes.length || newRC.pagos.some(p => p.metodo_pago || p.valor));
  const dialogoRef = useDialogo(isOpen, onClose, { hayCambios });

  if (!isOpen) return null;

  const totalVal = newRC.pagos.reduce((sum, p) => sum + (parseInt(p.valor) || 0), 0);
  const pagosValidos = newRC.pagos.filter(p => p.metodo_pago && (parseInt(p.valor) || 0) > 0);
  const filteredVentas = ventas.filter(v => v.id_venta.toString().includes(ventaSearch));

  return createPortal(
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget && confirmarDescarte(hayCambios)) onClose(); }}>
      <div className="lottus-form-modal" onClick={e => e.stopPropagation()} ref={dialogoRef} role="dialog" aria-modal="true" aria-label={"Nuevo recibo de caja"} tabIndex={-1}>
        {/* Header */}
        <div className="lottus-modal-header">
          <div className="lottus-modal-title-wrap">
            <div className="lottus-modal-icon-badge">
              <FaWallet />
            </div>
            <div>
              <div className="lottus-modal-type-badge">
                <span className="lottus-badge-dot"></span> Recibo de Ingreso
              </div>
              <h3 className="lottus-modal-title">Nuevo Recibo de Caja</h3>
              <p className="lottus-modal-subtitle">Ingresa los datos generales del recibo de ingreso.</p>
            </div>
          </div>
          <button type="button" className="lottus-close-btn" onClick={onClose} title="Cerrar" aria-label="Cerrar" data-dialogo-cerrar="">×</button>
        </div>

        <form onSubmit={handleSubmit} className="lottus-modal-form">
          {/* Row: ID + Fecha */}
          <div className="lottus-form-row">
            <div className="lottus-form-group">
              <label id="rc-numero-label">No. Recibo <span className="lottus-req">*</span></label>
              <div className="rc-numero-modo" role="group" aria-labelledby="rc-numero-label">
                <button type="button" aria-pressed={numeroAutomatico} onClick={() => setNumeroAutomatico(true)}>Automático</button>
                <button type="button" aria-pressed={!numeroAutomatico} onClick={() => setNumeroAutomatico(false)}>Manual</button>
              </div>
              {numeroAutomatico
                ? <div className="rc-numero-auto" aria-live="polite">{siguienteNumero ? `Siguiente: No. ${siguienteNumero}` : 'Se asigna al guardar'}</div>
                : <input type="text" inputMode="numeric" name="id" value={newRC.id} onChange={handleChange} required placeholder="Ej: 4756" className="lottus-input" aria-label="No. Recibo manual" />}
            </div>
            <div className="lottus-form-group">
              <label>Fecha <span className="lottus-req">*</span></label>
              <input type="date" onClick={(e) => { try { e.target.showPicker(); } catch { /* navegador sin showPicker */ } }} name="fecha" value={newRC.fecha} onChange={handleChange} required className="lottus-input" />
            </div>
          </div>

          {/* Venta */}
          <div className="lottus-form-group full" style={{ position: 'relative' }}>
            <label>Venta Asociada <span className="lottus-req">*</span></label>
            
            <div 
              className="lottus-select" 
              onClick={() => setShowVentaDropdown(!showVentaDropdown)}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>{newRC.venta ? `Venta #${newRC.venta}` : 'Seleccionar Venta...'}</span>
              <FaChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
            </div>

            {showVentaDropdown && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 2, borderRadius: '8px 8px 0 0' }}>
                  <input 
                    type="text" 
                    placeholder="Buscar # de venta..." 
                    value={ventaSearch}
                    onChange={(e) => setVentaSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-strong)', borderRadius: '6px', background: 'var(--surface-muted)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none' }}
                    autoFocus
                  />
                </div>
                <div style={{ overflowY: 'auto', flex: 1, maxHeight: '200px' }}>
                  {filteredVentas.length > 0 ? filteredVentas.map(venta => (
                    <div 
                      key={venta.id_venta}
                      onClick={() => {
                        setNewRC({ ...newRC, venta: venta.id_venta });
                        setShowVentaDropdown(false);
                        setVentaSearch('');
                      }}
                      style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f2f1eb', background: newRC.venta === venta.id_venta ? '#edf3e9' : 'transparent', color: newRC.venta === venta.id_venta ? '#4c7a4f' : '#3e3e37', fontWeight: newRC.venta === venta.id_venta ? '600' : '400', transition: 'background 0.2s, color 0.2s' }}
                      onMouseEnter={(e) => { if(newRC.venta !== venta.id_venta) e.target.style.background = '#faf9f5' }}
                      onMouseLeave={(e) => { if(newRC.venta !== venta.id_venta) e.target.style.background = 'transparent' }}
                    >
                      Venta #{venta.id_venta}
                    </div>
                  )) : (
                    <div style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem' }}>
                      No se encontraron ventas
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pago(s) — uno o varios medios de pago para el mismo recibo */}
          <div className="lottus-form-group full">
            <div className="lottus-label-flex">
              <label>Pago(s) <span className="lottus-req">*</span></label>
              {totalVal > 0 && (
                <span className="lottus-val-preview">Total: {formatCOP(totalVal)}</span>
              )}
            </div>
            <div className="rc-pagos-list">
              {newRC.pagos.map((pago, index) => (
                <div key={index} className="rc-pago-row">
                  <select
                    className="lottus-select"
                    value={pago.metodo_pago}
                    onChange={(e) => handlePagoMetodo(index, e.target.value)}
                  >
                    <option value="">Método...</option>
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.label} value={m.label}>{m.label}</option>
                    ))}
                  </select>
                  <div className="lottus-input-icon rc-pago-valor-wrap">
                    <span className="lottus-prefix">$</span>
                    <input
                      type="text"
                      value={pago.valor ? formatCOP(parseInt(pago.valor) || 0).replace('$', '').trim() : ''}
                      onChange={(e) => handlePagoValor(index, e)}
                      placeholder="0"
                      className="lottus-input lottus-input-pl"
                    />
                  </div>
                  {newRC.pagos.length > 1 && (
                    <button type="button" className="rc-pago-remove-btn" onClick={() => handleRemovePago(index)} title="Quitar este pago">
                      <FaTimes />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="rc-btn-add-pago" onClick={handleAddPago}>
              <FaPlus /> Agregar otro medio de pago
            </button>
            <p className="lottus-hint" style={{ marginTop: '0.15rem' }}>
              Si el pago se dividió en varios medios (ej. parte efectivo, parte transferencia), agrega una línea por cada uno. El efectivo se confirma al instante; los demás quedan pendientes hasta que un administrador los confirme.
            </p>
          </div>

          {/* Fotos del comprobante (opcional) */}
          <div className="lottus-form-group full">
            <label>Comprobante de pago <span className="lottus-hint">(opcional · se comprime sola)</span></label>
            <AdjuntarComprobantes urls={comprobantes} onChange={setComprobantes} onSubiendo={setSubiendoFotos} deshabilitado={isLoading} />
          </div>

          {/* Nota */}
          <div className="lottus-form-group full">
            <label>Notas / Observaciones <span className="lottus-hint">(opcional)</span></label>
            <textarea name="nota" value={newRC.nota} onChange={handleChange} placeholder="Detalles o notas sobre el recibo..." rows="2" className="lottus-input" />
          </div>

          {/* Footer Actions */}
          <div className="lottus-modal-actions">
            <button type="button" className="lottus-btn-cancel" onClick={onClose} disabled={isLoading}>
              Cancelar
            </button>
            <button type="submit" className="lottus-btn-submit" disabled={isLoading || subiendoFotos > 0 || pagosValidos.length === 0 || (!numeroAutomatico && !newRC.id) || !newRC.venta || totalVal <= 0}>
              {isLoading ? 'Guardando...' : subiendoFotos > 0 ? 'Subiendo fotos…' : 'Crear Recibo'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};


const estadoInicialEdicion = (recibo) => {
  const pendientes = (recibo.pagos || [])
    .filter(p => p.estado !== 'Confirmado')
    .map(p => ({ id: p.id, metodo_pago: p.metodo_pago, valor: String(p.valor ?? '') }));
  return {
    fecha: recibo.fecha || '',
    venta: recibo.venta || '',
    nota: recibo.nota || '',
    pagosPendientes: pendientes.length > 0 ? pendientes : [emptyPago()],
  };
};

const EditRCModal = ({ isOpen, onClose, onSave, onAnular, recibo, ventas, isLoading }) => {
  const [editRC, setEditRC] = useState({ fecha: '', venta: '', nota: '', pagosPendientes: [] });
  const [ventaSearch, setVentaSearch] = useState('');
  const [showVentaDropdown, setShowVentaDropdown] = useState(false);
  const [confirmingAnular, setConfirmingAnular] = useState(false);

  useEffect(() => {
    if (isOpen && recibo) {
      setEditRC(estadoInicialEdicion(recibo));
      setVentaSearch('');
      setShowVentaDropdown(false);
      setConfirmingAnular(false);
    }
  }, [isOpen, recibo]);

  const hayCambios = Boolean(recibo) && JSON.stringify(editRC) !== JSON.stringify(estadoInicialEdicion(recibo));
  const dialogoRef = useDialogo(Boolean(isOpen && recibo), onClose, { hayCambios });

  if (!isOpen || !recibo) return null;

  const isAnulado = recibo.estado === 'Anulado';
  const pagosConfirmados = (recibo.pagos || []).filter(p => p.estado === 'Confirmado');
  const hasConfirmados = pagosConfirmados.length > 0;
  const totalReciboActual = (recibo.pagos || []).reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
  const hasEfectivoConfirmado = pagosConfirmados.some(p => p.metodo_pago === 'Efectivo');

  const handleChange = (e) => setEditRC({ ...editRC, [e.target.name]: e.target.value });

  const handlePagoMetodo = (index, metodo) => {
    const pagosPendientes = [...editRC.pagosPendientes];
    pagosPendientes[index] = { ...pagosPendientes[index], metodo_pago: metodo };
    setEditRC({ ...editRC, pagosPendientes });
  };
  const handlePagoValor = (index, e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const pagosPendientes = [...editRC.pagosPendientes];
    pagosPendientes[index] = { ...pagosPendientes[index], valor: raw };
    setEditRC({ ...editRC, pagosPendientes });
  };
  const handleAddPago = () => setEditRC({ ...editRC, pagosPendientes: [...editRC.pagosPendientes, emptyPago()] });
  const handleRemovePago = (index) => setEditRC({ ...editRC, pagosPendientes: editRC.pagosPendientes.filter((_, i) => i !== index) });

  const pagosPendientesValidos = editRC.pagosPendientes.filter(p => p.metodo_pago && (parseInt(p.valor) || 0) > 0);
  const totalConfirmado = pagosConfirmados.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
  const totalPendiente = pagosPendientesValidos.reduce((sum, p) => sum + (parseInt(p.valor) || 0), 0);
  const totalVal = totalConfirmado + totalPendiente;
  const puedeGuardar = hasConfirmados || pagosPendientesValidos.length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!puedeGuardar) return;
    onSave(recibo.id, {
      fecha: editRC.fecha,
      venta: editRC.venta,
      nota: editRC.nota,
      pagos_pendientes: pagosPendientesValidos.map(p => ({
        ...(p.id ? { id: p.id } : {}),
        metodo_pago: p.metodo_pago,
        valor: parseInt(p.valor) || 0,
      })),
    });
  };

  const filteredVentas = ventas.filter(v => v.id_venta.toString().includes(ventaSearch));

  return createPortal(
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget && confirmarDescarte(hayCambios)) onClose(); }}>
      <div className="lottus-form-modal" onClick={e => e.stopPropagation()} ref={dialogoRef} role="dialog" aria-modal="true" aria-label={`Editar recibo ${recibo.id}`} tabIndex={-1}>
        {/* Header */}
        <div className="lottus-modal-header">
          <div className="lottus-modal-title-wrap">
            <div className="lottus-modal-icon-badge">
              <FaWallet />
            </div>
            <div>
              <div className="lottus-modal-type-badge">
                <span className="lottus-badge-dot"></span> Recibo de Ingreso
              </div>
              <h3 className="lottus-modal-title">Editar Recibo de Caja #{recibo.id}</h3>
              <p className="lottus-modal-subtitle">
                {isAnulado ? 'Este recibo está anulado — solo lectura.' : 'Corrige los datos del recibo. Los pagos ya confirmados no se pueden modificar.'}
              </p>
            </div>
          </div>
          <button type="button" className="lottus-close-btn" onClick={onClose} title="Cerrar" aria-label="Cerrar" data-dialogo-cerrar="">×</button>
        </div>

        {isAnulado && (
          <div className="rc-anulado-banner">
            <FaBan /> Este recibo fue anulado y quedó bloqueado para edición. Los movimientos de caja y el abono a la venta ya fueron revertidos.
          </div>
        )}

        <form onSubmit={handleSubmit} className="lottus-modal-form">
        <fieldset
          disabled={isAnulado}
          style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: isAnulado ? 0.55 : 1 }}
        >
          {/* Row: ID (fijo) + Fecha */}
          <div className="lottus-form-row">
            <div className="lottus-form-group">
              <label>No. Recibo</label>
              <input type="text" value={`#${recibo.id}`} disabled className="lottus-input" />
            </div>
            <div className="lottus-form-group">
              <label>Fecha <span className="lottus-req">*</span></label>
              <input type="date" onClick={(e) => { try { e.target.showPicker(); } catch { /* navegador sin showPicker */ } }} name="fecha" value={editRC.fecha} onChange={handleChange} required className="lottus-input" />
            </div>
          </div>

          {/* Venta */}
          <div className="lottus-form-group full" style={{ position: 'relative' }}>
            <label>
              Venta Asociada <span className="lottus-req">*</span>
              {hasConfirmados && <span className="lottus-hint" style={{ marginLeft: '0.4rem' }}><FaLock size={10} /> Bloqueada (ya hay pagos confirmados)</span>}
            </label>

            <div
              className="lottus-select"
              onClick={() => !hasConfirmados && setShowVentaDropdown(!showVentaDropdown)}
              style={{ cursor: hasConfirmados ? 'not-allowed' : 'pointer', opacity: hasConfirmados ? 0.6 : 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>{editRC.venta ? `Venta #${editRC.venta}` : 'Seleccionar Venta...'}</span>
              {!hasConfirmados && <FaChevronDown size={12} style={{ color: 'var(--text-muted)' }} />}
            </div>

            {!hasConfirmados && showVentaDropdown && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 2, borderRadius: '8px 8px 0 0' }}>
                  <input
                    type="text"
                    placeholder="Buscar # de venta..."
                    value={ventaSearch}
                    onChange={(e) => setVentaSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid var(--border-strong)', borderRadius: '6px', background: 'var(--surface-muted)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none' }}
                    autoFocus
                  />
                </div>
                <div style={{ overflowY: 'auto', flex: 1, maxHeight: '200px' }}>
                  {filteredVentas.length > 0 ? filteredVentas.map(venta => (
                    <div
                      key={venta.id_venta}
                      onClick={() => {
                        setEditRC({ ...editRC, venta: venta.id_venta });
                        setShowVentaDropdown(false);
                        setVentaSearch('');
                      }}
                      style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f2f1eb', background: editRC.venta === venta.id_venta ? '#edf3e9' : 'transparent', color: editRC.venta === venta.id_venta ? '#4c7a4f' : '#3e3e37', fontWeight: editRC.venta === venta.id_venta ? '600' : '400', transition: 'background 0.2s, color 0.2s' }}
                      onMouseEnter={(e) => { if(editRC.venta !== venta.id_venta) e.target.style.background = '#faf9f5' }}
                      onMouseLeave={(e) => { if(editRC.venta !== venta.id_venta) e.target.style.background = 'transparent' }}
                    >
                      Venta #{venta.id_venta}
                    </div>
                  )) : (
                    <div style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem' }}>
                      No se encontraron ventas
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pagos confirmados: solo lectura */}
          {hasConfirmados && (
            <div className="lottus-form-group full">
              <label>Pagos ya confirmados <FaLock size={10} /></label>
              <div className="rc-pagos-list">
                {pagosConfirmados.map(pago => (
                  <div key={pago.id} className="rc-pago-row" style={{ opacity: 0.65 }}>
                    <div className="lottus-select" style={{ pointerEvents: 'none' }}>{pago.metodo_pago}</div>
                    <div className="lottus-input-icon rc-pago-valor-wrap">
                      <span className="lottus-prefix">$</span>
                      <input type="text" value={formatCOP(parseInt(pago.valor) || 0).replace('$', '').trim()} disabled className="lottus-input lottus-input-pl" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagos pendientes: editables */}
          <div className="lottus-form-group full">
            <div className="lottus-label-flex">
              <label>Pagos pendientes / nuevos {!hasConfirmados && <span className="lottus-req">*</span>}</label>
              {totalVal > 0 && (
                <span className="lottus-val-preview">Total: {formatCOP(totalVal)}</span>
              )}
            </div>
            <div className="rc-pagos-list">
              {editRC.pagosPendientes.map((pago, index) => (
                <div key={pago.id || `new-${index}`} className="rc-pago-row">
                  <select
                    className="lottus-select"
                    value={pago.metodo_pago}
                    onChange={(e) => handlePagoMetodo(index, e.target.value)}
                  >
                    <option value="">Método...</option>
                    {PAYMENT_METHODS.map(m => (
                      <option key={m.label} value={m.label}>{m.label}</option>
                    ))}
                  </select>
                  <div className="lottus-input-icon rc-pago-valor-wrap">
                    <span className="lottus-prefix">$</span>
                    <input
                      type="text"
                      value={pago.valor ? formatCOP(parseInt(pago.valor) || 0).replace('$', '').trim() : ''}
                      onChange={(e) => handlePagoValor(index, e)}
                      placeholder="0"
                      className="lottus-input lottus-input-pl"
                    />
                  </div>
                  {editRC.pagosPendientes.length > 1 && (
                    <button type="button" className="rc-pago-remove-btn" onClick={() => handleRemovePago(index)} title="Quitar este pago">
                      <FaTimes />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="rc-btn-add-pago" onClick={handleAddPago}>
              <FaPlus /> Agregar otro medio de pago
            </button>
            <p className="lottus-hint" style={{ marginTop: '0.15rem' }}>
              Una línea nueva en Efectivo se confirma al instante, igual que al crear un recibo. Los demás medios quedan pendientes hasta que un administrador los confirme.
            </p>
          </div>

          {/* Nota */}
          <div className="lottus-form-group full">
            <label>Notas / Observaciones <span className="lottus-hint">(opcional)</span></label>
            <textarea name="nota" value={editRC.nota} onChange={handleChange} placeholder="Detalles o notas sobre el recibo..." rows="2" className="lottus-input" />
          </div>
        </fieldset>

          {/* Anular recibo */}
          {!isAnulado && onAnular && (
            <div className="rc-anular-section">
              {!confirmingAnular ? (
                <button type="button" className="rc-btn-anular-trigger" onClick={() => setConfirmingAnular(true)} disabled={isLoading}>
                  <FaBan /> Anular Recibo
                </button>
              ) : (
                <div className="rc-anular-confirm">
                  <p className="rc-anular-confirm-text">
                    <FaExclamationTriangle />{' '}
                    {hasEfectivoConfirmado
                      ? 'Se revertirá el abono a la venta y se registrará un movimiento de egreso en Caja por los pagos en efectivo ya confirmados.'
                      : hasConfirmados
                        ? 'Se revertirá el abono ya aplicado a la venta por los pagos confirmados.'
                        : `Este recibo (${formatCOP(totalReciboActual)}) quedará marcado como anulado.`}
                    {' '}Esta acción no se puede deshacer.
                  </p>
                  <div className="rc-anular-confirm-actions">
                    <button type="button" className="lottus-btn-cancel" onClick={() => setConfirmingAnular(false)} disabled={isLoading}>
                      Volver
                    </button>
                    <button type="button" className="lottus-btn-danger" onClick={() => onAnular(recibo.id)} disabled={isLoading}>
                      {isLoading ? 'Anulando...' : 'Sí, anular recibo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="lottus-modal-actions">
            <button type="button" className="lottus-btn-cancel" onClick={onClose} disabled={isLoading}>
              Cancelar
            </button>
            {!isAnulado && (
              <button type="submit" className="lottus-btn-submit" disabled={isLoading || !puedeGuardar || !editRC.venta}>
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};


const ConfirmModal = ({ isOpen, onClose, onConfirm, title, children, isLoading }) => {
  if (!isOpen) return null;
  return (
    <Modal show={isOpen} onClose={onClose} title={title}>
      <div className="rc-confirm-modal-body">
        {children}
      </div>
      <div className="rc-confirm-modal-actions">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={onConfirm} loading={isLoading}>
          {isLoading ? 'Confirmando...' : 'Confirmar Ingreso'}
        </Button>
      </div>
    </Modal>
  );
};

const RecibosCaja = () => {
  const idempotencia = useIdempotencia();
  const { usuario } = useContext(AppContext);
  const hasPermission = usePermissions();
  const location = useLocation();
  const [recibosData, setRecibosData] = useState([]);
  const [totalFiltrado, setTotalFiltrado] = useState(0);
  const [filters, setFilters] = useFiltrosUrl({
    fecha_inicio: '',
    fecha_fin: '',
    medio_pago: '',
    query: ''
  });
  const [isCreatingRC, setIsCreatingRC] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [fotosTarget, setFotosTarget] = useState(null);
  const { data: pendientesIds = [], isError: pendientesIdsError, error: pendientesIdsErr } = usePendientesIds();
  const ventas = useMemo(() => pendientesIds.map(id => ({ id_venta: id })), [pendientesIds]);
  const editVentas = useMemo(() => {
    if (!editTarget || ventas.some(v => v.id_venta === editTarget.venta)) return ventas;
    return [...ventas, { id_venta: editTarget.venta }];
  }, [ventas, editTarget]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { recibo, pago }
  const [expandedReciboId, setExpandedReciboId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 30;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });
  const { exportar, exportando } = useExportacion('recibos', 'Recibos_Caja.xlsx', setNotification);

  const mediosPago = ['Efectivo', 'Davivienda', 'Bancolombia', 'Bold', 'Datafono Lottus', 'Otro'];

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    const total = recibosData.reduce((sum, item) => sum + parseFloat(item.valor || 0), 0);
    const pending = recibosData.filter(item => item.estado === 'Pendiente' || item.estado === 'Parcial').length;
    return { total, pending };
  }, [recibosData]);

  // --- Sorting: Mostrar pendientes/parciales primero, luego mantener orden por fecha/id ---
  const sortedRecibosData = useMemo(() => {
    return [...recibosData].sort((a, b) => {
      const aPending = (a.estado === 'Pendiente' || a.estado === 'Parcial') ? 0 : 1;
      const bPending = (b.estado === 'Pendiente' || b.estado === 'Parcial') ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return 0;
    });
  }, [recibosData]);

  const formatCurrency = (value) => {
    if (value === null || isNaN(value)) return '$0';
    return `$${Math.round(value).toLocaleString('es-CO')}`;
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
    Object.keys(params).forEach(key => (params[key] === '' || params[key] === null) && delete params[key]);

    try {
      const response = await API.get(`/recibos-caja/`, { params });
      setRecibosData(response.data.results || []);
      setTotalFiltrado(response.data.totales_filtrados?.valor || 0);
      setTotalPages(Math.ceil(response.data.count / pageSize) || 1);
    } catch {
      setNotification({ message: 'Error al cargar los recibos.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    fetchData(filters, currentPage);
  }, [filters, currentPage, fetchData]);

  useEffect(() => {
    if (location.state?.openForm) {
      setIsCreatingRC(true);
      window.history.replaceState({}, document.title);
    }
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'create') setIsCreatingRC(true);
  }, [location]);

  useEffect(() => {
    if (pendientesIdsError) console.error('Error details:', pendientesIdsErr);
  }, [pendientesIdsError, pendientesIdsErr]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ fecha_inicio: '', fecha_fin: '', medio_pago: '', query: '' });
    setCurrentPage(1);
  };

  const handleCreateRC = async (rcData) => {
    setIsSubmitting(true);
    setNotification({ message: '', type: '' });
    try {
      const { data: creado } = await API.post(`/recibos-caja/crear/`, rcData, { headers: idempotencia.cabeceras(rcData) });
      idempotencia.confirmar();
      setNotification({ message: rcData.numero_automatico ? `Recibo No. ${creado.id} creado exitosamente.` : 'Recibo creado exitosamente.', type: 'success' });
      setIsCreatingRC(false);
      fetchData(filters, 1);
    } catch (error) {
      const data = error.response?.data;
      const errorMsg = data?.detail || data?.error || (typeof data === 'string' ? data : (data ? JSON.stringify(data) : 'Error al crear el recibo.'));
      setNotification({ message: errorMsg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRC = async (reciboId, rcData) => {
    setIsSubmitting(true);
    setNotification({ message: '', type: '' });
    try {
      await API.put(`/recibos-caja/${reciboId}/editar/`, rcData);
      setNotification({ message: 'Recibo actualizado exitosamente.', type: 'success' });
      setEditTarget(null);
      fetchData(filters, currentPage);
    } catch (error) {
      const data = error.response?.data;
      const errorMsg = data?.detail || data?.error || (typeof data === 'string' ? data : (data ? JSON.stringify(data) : 'Error al actualizar el recibo.'));
      setNotification({ message: errorMsg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnularRC = async (reciboId) => {
    setIsSubmitting(true);
    setNotification({ message: '', type: '' });
    try {
      await API.put(`/recibos-caja/${reciboId}/anular/`, {});
      setNotification({ message: 'Recibo anulado exitosamente.', type: 'success' });
      setEditTarget(null);
      fetchData(filters, currentPage);
    } catch (error) {
      const data = error.response?.data;
      const errorMsg = data?.detail || data?.error || (typeof data === 'string' ? data : (data ? JSON.stringify(data) : 'Error al anular el recibo.'));
      setNotification({ message: errorMsg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRecibo = async () => {
    if (!confirmTarget?.pago) return;
    setIsSubmitting(true);
    try {
      await API.patch(`/recibos-caja/pagos/${confirmTarget.pago.id}/confirmar/`, {});
      setNotification({ message: 'Pago confirmado.', type: 'success' });
      setShowConfirmModal(false);
      fetchData(filters, currentPage);
    } catch (error) {
      const data = error.response?.data;
      const errorMsg = data?.detail || data?.error || (typeof data === 'string' ? data : (data ? JSON.stringify(data) : 'Error al confirmar.'));
      setNotification({ message: errorMsg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportData = () => exportar(filters);
  const puedeAdjuntar = hasPermission('CREAR_RECIBO') || hasPermission('EDITAR_RECIBO');

  return (
    <div className="ds-page recibos-page ds-fade-in">
      <AppNotification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      <PageHeader
        icon={FaWallet}
        title="Recibos de Caja"
        subtitle="Registro y confirmación de ingresos"
        actions={
          <>
            {usuario?.role === 'administrador' && (
              <Button variant="ghost" icon={FaFileExport} onClick={exportData} loading={exportando} disabled={isLoading} aria-label="Exportar Excel" title="Exportar Excel" />
            )}
            {hasPermission('CREAR_RECIBO') && (
              <Button variant="primary" icon={FaPlus} onClick={() => setIsCreatingRC(true)}>
                <span className="long-text">Nuevo Ingreso</span>
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
            <span className="stat-label">Recibos Pendientes</span>
            <span className="stat-value">{stats.pending}</span>
          </div>
        </div>
      </div>

      <div className="ds-card recibos-filters ds-fade-in" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem' }}>
        <div className="v-filters-bar" style={{ margin: 0, flex: 1, overflow: 'visible', flexWrap: 'wrap' }}>
          <div className="v-search-pill">
            <FaSearch />
            <input
              type="text"
              name="query"
              placeholder="Buscar RC o Venta..."
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
          <div className="v-select-pill">
            <select name="medio_pago" value={filters.medio_pago} onChange={handleFilterChange}>
              <option value="">Medio: Todos</option>
              {mediosPago.map((medio) => (<option key={medio} value={medio}>{medio}</option>))}
            </select>
          </div>
          {(filters.query || filters.fecha_inicio || filters.fecha_fin || filters.medio_pago) && (
            <button type="button" className="fct-clear-pill" onClick={clearFilters} title="Limpiar filtros">
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      <div className="content-area">
        {(filters.query || filters.fecha_inicio || filters.fecha_fin || filters.medio_pago) && (
          <div className="ds-totales-filtrados" role="status">
            Con estos filtros: <strong>total {formatCOP(totalFiltrado)}</strong>
          </div>
        )}
        {/* Desktop Table View */}
        <div className="desktop-table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th>RC ID</th>
                <th>Fecha</th>
                <th>Venta</th>
                <th>Vendedor</th>
                <th>Método</th>
                <th className="text-right">Valor</th>
                <th>Nota</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td><div className="skeleton skeleton-text" style={{ width: '50px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '90px' }}></div></td>
                    <td className="text-right"><div className="skeleton skeleton-text" style={{ width: '80px', marginLeft: 'auto' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                    <td><div className="skeleton skeleton-badge"></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '24px' }}></div></td>
                  </tr>
                ))
              ) : sortedRecibosData.length > 0 ? (
                sortedRecibosData.map((item) => {
                  const pagos = item.pagos || [];
                  const isMultiple = pagos.length > 1;
                  const isExpanded = expandedReciboId === item.id;
                  const singlePendingPago = pagos.length === 1 && pagos[0].estado === 'Pendiente' ? pagos[0] : null;
                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        className={`table-row-hover ${isMultiple ? 'table-row-clickable' : ''}`}
                        onClick={isMultiple ? () => setExpandedReciboId(isExpanded ? null : item.id) : undefined}
                      >
                        <td className="font-bold">#{item.id}</td>
                        <td className="text-muted">{formatDate(item.fecha)}</td>
                        <td><span className="venta-tag">#{item.venta}</span></td>
                        <td className="text-muted">{item.vendedor_nombre || '-'}</td>
                        <td>
                          <div className="method-cell">
                            <PaymentIcon method={item.metodo_pago} />
                            <span>{item.metodo_pago}</span>
                          </div>
                        </td>
                        <td className="text-right font-mono">{formatCurrency(item.valor)}</td>
                        <td className="note-cell" title={item.nota}>{item.nota || '—'}</td>
                        <td>
                          <Badge tone={item.estado.toLowerCase() === 'confirmado' ? 'success' : item.estado.toLowerCase() === 'anulado' ? 'danger' : item.estado.toLowerCase() === 'parcial' ? 'info' : 'warning'}>
                            {item.estado}
                          </Badge>
                        </td>
                        <td className="actions-cell">
                          {(item.comprobantes?.length > 0 || puedeAdjuntar) && (
                            <button
                              className="action-btn rc-fotos-btn"
                              onClick={(e) => { e.stopPropagation(); setFotosTarget(item); }}
                              title={item.comprobantes?.length ? `Ver comprobantes (${item.comprobantes.length})` : 'Adjuntar comprobante'}
                              aria-label={`Comprobantes del recibo ${item.id}`}
                            >
                              <FaCamera />
                              {item.comprobantes?.length > 0 && <span className="rc-fotos-count">{item.comprobantes.length}</span>}
                            </button>
                          )}
                          {hasPermission('EDITAR_RECIBO') && (
                            item.estado === 'Anulado' ? (
                              <button
                                className="action-btn"
                                disabled
                                title="Este recibo está anulado y no se puede editar"
                              >
                                <FaEdit />
                              </button>
                            ) : (
                              <button
                                className="action-btn"
                                onClick={(e) => { e.stopPropagation(); setEditTarget(item); }}
                                title="Editar Recibo"
                              >
                                <FaEdit />
                              </button>
                            )
                          )}
                          {singlePendingPago && hasPermission('APROBAR_RECIBO') && (
                            <button
                              className="action-btn confirm"
                              onClick={(e) => { e.stopPropagation(); setConfirmTarget({ recibo: item, pago: singlePendingPago }); setShowConfirmModal(true); }}
                              title="Confirmar Ingreso"
                            >
                              <FaCheckCircle />
                            </button>
                          )}
                          {isMultiple && (
                            <button
                              className="action-btn"
                              onClick={(e) => { e.stopPropagation(); setExpandedReciboId(isExpanded ? null : item.id); }}
                              title="Ver pagos"
                            >
                              <FaChevronDown style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                            </button>
                          )}
                        </td>
                      </tr>
                      {isMultiple && isExpanded && (
                        <tr className="expanded-row">
                          <td colSpan="9">
                            <div className="rc-pagos-detail">
                              {pagos.map(pago => (
                                <div key={pago.id} className="rc-pago-detail-row">
                                  <PaymentIcon method={pago.metodo_pago} />
                                  <span className="rc-pago-detail-metodo">{pago.metodo_pago}</span>
                                  <span className="rc-pago-detail-valor font-mono">{formatCurrency(pago.valor)}</span>
                                  <Badge tone={pago.estado === 'Confirmado' ? 'success' : pago.estado === 'Anulado' ? 'danger' : 'warning'}>{pago.estado}</Badge>
                                  {pago.estado === 'Pendiente' && hasPermission('APROBAR_RECIBO') && (
                                    <button
                                      className="action-btn confirm"
                                      onClick={() => { setConfirmTarget({ recibo: item, pago }); setShowConfirmModal(true); }}
                                      title="Confirmar este pago"
                                    >
                                      <FaCheckCircle />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr><td colSpan="9" className="empty-state">No se encontraron recibos.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Transaction List View */}
        <div className="mobile-transaction-list">
          {isLoading ? (
            <div className="loading-spinner"></div>
          ) : sortedRecibosData.length > 0 ? (
            sortedRecibosData.map((item) => {
              const pagos = item.pagos || [];
              const isMultiple = pagos.length > 1;
              const singlePendingPago = pagos.length === 1 && pagos[0].estado === 'Pendiente' ? pagos[0] : null;
              return (
                <div className="transaction-card" key={item.id}>
                  <div className="card-left">
                    <PaymentIcon method={item.metodo_pago} />
                    <div className="card-info">
                      <div className="card-title">Recibo #{item.id}</div>
                      <div className="card-subtitle">{formatDate(item.fecha)} • Venta #{item.venta}{item.vendedor_nombre ? ` • ${item.vendedor_nombre}` : ''}</div>
                    </div>
                  </div>
                  <div className="card-right">
                    <div className="card-amount">{formatCurrency(item.valor)}</div>
                    <span className={`status-dot ${item.estado.toLowerCase()}`}></span>
                  </div>
                  {hasPermission('EDITAR_RECIBO') && (
                    item.estado === 'Anulado' ? (
                      <button className="mobile-edit-btn" disabled title="Este recibo está anulado y no se puede editar">
                        <FaEdit /> Anulado
                      </button>
                    ) : (
                      <button className="mobile-edit-btn" onClick={() => setEditTarget(item)}>
                        <FaEdit /> Editar
                      </button>
                    )
                  )}
                  {singlePendingPago && hasPermission('APROBAR_RECIBO') && (
                    <button className="mobile-confirm-btn" onClick={() => { setConfirmTarget({ recibo: item, pago: singlePendingPago }); setShowConfirmModal(true); }}>
                      Confirmar
                    </button>
                  )}
                  {(item.comprobantes?.length > 0 || puedeAdjuntar) && (
                    <button className="mobile-edit-btn" onClick={() => setFotosTarget(item)}>
                      <FaCamera /> {item.comprobantes?.length ? `Fotos (${item.comprobantes.length})` : 'Adjuntar foto'}
                    </button>
                  )}
                  {isMultiple && (
                    <div className="rc-pagos-detail" style={{ marginTop: '0.5rem' }}>
                      {pagos.map(pago => (
                        <div key={pago.id} className="rc-pago-detail-row">
                          <PaymentIcon method={pago.metodo_pago} />
                          <span className="rc-pago-detail-metodo">{pago.metodo_pago}</span>
                          <span className="rc-pago-detail-valor font-mono">{formatCurrency(pago.valor)}</span>
                          <Badge tone={pago.estado === 'Confirmado' ? 'success' : pago.estado === 'Anulado' ? 'danger' : 'warning'}>{pago.estado}</Badge>
                          {pago.estado === 'Pendiente' && hasPermission('APROBAR_RECIBO') && (
                            <button className="mobile-confirm-btn" onClick={() => { setConfirmTarget({ recibo: item, pago }); setShowConfirmModal(true); }}>
                              Confirmar
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="empty-state-mobile">No hay movimientos.</div>
          )}
        </div>
      </div>

      <div className="rc-pagination-bar">
        <button className="rc-pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>
          <FaChevronLeft />
        </button>
        <span className="rc-pagination-info">Página {currentPage} de {totalPages}</span>
        <button className="rc-pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)}>
          <FaChevronRight />
        </button>
      </div>

      <CreateRCModal
        isOpen={isCreatingRC}
        onClose={() => setIsCreatingRC(false)}
        onSave={handleCreateRC}
        ventas={ventas}
        mediosPago={mediosPago}
        isLoading={isSubmitting}
      />

      <EditRCModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleEditRC}
        onAnular={hasPermission('EDITAR_RECIBO') ? handleAnularRC : null}
        recibo={editTarget}
        ventas={editVentas}
        isLoading={isSubmitting}
      />

      {fotosTarget && (
        <FotosReciboModal
          recibo={fotosTarget}
          onClose={() => setFotosTarget(null)}
          puedeAgregar={puedeAdjuntar && fotosTarget.estado !== 'Anulado'}
          puedeQuitar={hasPermission('EDITAR_RECIBO')}
          onActualizado={(recibo) => {
            setFotosTarget(recibo);
            setRecibosData(prev => prev.map(r => (r.id === recibo.id ? { ...r, comprobantes: recibo.comprobantes } : r)));
          }}
        />
      )}

      {confirmTarget && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmRecibo}
          title="Confirmar Pago"
          isLoading={isSubmitting}
        >
          <div className="rc-confirm-container">
            <div className="rc-confirm-row">
              <span className="rc-confirm-label">N° Recibo</span>
              <span className="rc-confirm-val font-mono">#{confirmTarget.recibo.id}</span>
            </div>
            <div className="rc-confirm-row">
              <span className="rc-confirm-label">Valor del Pago</span>
              <span className="rc-confirm-val amount">{formatCurrency(confirmTarget.pago.valor)}</span>
            </div>
            <div className="rc-confirm-row">
              <span className="rc-confirm-label">Método de Pago</span>
              <span className="rc-confirm-val method">
                <PaymentIcon method={confirmTarget.pago.metodo_pago} />
                {confirmTarget.pago.metodo_pago || 'N/A'}
              </span>
            </div>
            {confirmTarget.recibo.venta && (
              <div className="rc-confirm-row">
                <span className="rc-confirm-label">Venta Asociada</span>
                <span className="rc-confirm-val">Venta #{confirmTarget.recibo.venta}</span>
              </div>
            )}
            {confirmTarget.recibo.fecha && (
              <div className="rc-confirm-row">
                <span className="rc-confirm-label">Fecha</span>
                <span className="rc-confirm-val">{confirmTarget.recibo.fecha}</span>
              </div>
            )}
            {confirmTarget.recibo.comprobantes?.length > 0 && (
              <div className="rc-confirm-fotos">
                <span className="rc-confirm-label">Comprobantes del cliente</span>
                <ul className="fc-grid">
                  {confirmTarget.recibo.comprobantes.map(foto => (
                    <li key={foto.id} className="fc-item">
                      <a href={foto.url} target="_blank" rel="noreferrer" title="Ver la foto completa"><img src={miniatura(foto.url)} alt="Comprobante de pago" loading="lazy" /></a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};

export default RecibosCaja;