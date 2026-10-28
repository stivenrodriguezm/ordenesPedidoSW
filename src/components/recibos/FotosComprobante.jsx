import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCamera, FaTimes, FaSpinner, FaExternalLinkAlt } from 'react-icons/fa';
import API from '../../services/api';
import { MAX_FOTOS, miniatura, subirComprobante } from '../../utils/comprobantesRecibo';
import { useDialogo } from '../../hooks/useDialogo';
import './FotosComprobante.css';

/**
 * Adjuntar fotos de comprobantes de pago (2026-10-28). Cada foto se comprime en el navegador y
 * se sube al elegirla; `urls` son las ya subidas. `onSubiendo(n)` avisa cuántas faltan.
 */
export function AdjuntarComprobantes({ urls, onChange, onSubiendo, maximo = MAX_FOTOS, deshabilitado = false }) {
  const entrada = useRef(null);
  const [subiendo, setSubiendo] = useState(0);
  const [error, setError] = useState('');
  const urlsRef = useRef(urls);
  urlsRef.current = urls;
  useEffect(() => { onSubiendo?.(subiendo); }, [subiendo, onSubiendo]);

  const elegir = async (e) => {
    const archivos = Array.from(e.target.files || []).slice(0, Math.max(0, maximo - urls.length));
    e.target.value = '';
    if (!archivos.length) return;
    setError('');
    setSubiendo((n) => n + archivos.length);
    await Promise.all(archivos.map(async (archivo) => {
      try {
        const url = await subirComprobante(archivo);
        onChange([...urlsRef.current, url]);
        urlsRef.current = [...urlsRef.current, url];
      } catch (err) {
        setError(err.response?.data?.error || `No se pudo subir «${archivo.name}». Intenta de nuevo.`);
      } finally {
        setSubiendo((n) => n - 1);
      }
    }));
  };

  return (
    <div className="fc-adjuntar">
      {(urls.length > 0 || subiendo > 0) && (
        <ul className="fc-grid">
          {urls.map((url) => (
            <li key={url} className="fc-item">
              <a href={url} target="_blank" rel="noreferrer" title="Ver la foto completa"><img src={miniatura(url)} alt="Comprobante de pago" loading="lazy" /></a>
              <button type="button" className="fc-quitar" aria-label="Quitar esta foto" title="Quitar esta foto" disabled={deshabilitado}
                onClick={() => onChange(urls.filter((u) => u !== url))}><FaTimes /></button>
            </li>
          ))}
          {Array.from({ length: subiendo }, (_, i) => (
            <li key={`subiendo-${i}`} className="fc-item fc-item--subiendo" aria-live="polite"><FaSpinner className="fc-spin" /><span>Subiendo…</span></li>
          ))}
        </ul>
      )}
      {urls.length + subiendo < maximo && (
        <button type="button" className="fc-boton" onClick={() => entrada.current?.click()} disabled={deshabilitado}>
          <FaCamera /> {urls.length ? 'Agregar otra foto' : 'Adjuntar foto del comprobante'}
        </button>
      )}
      <input ref={entrada} type="file" accept="image/*" multiple hidden onChange={elegir} data-testid="fc-archivo" />
      {error && <p className="fc-error" role="alert">{error}</p>}
    </div>
  );
}

/** Fotos de un recibo ya guardado: verlas, agregar más (crear/editar recibos) y quitar (editar). */
export function FotosReciboModal({ recibo, onClose, onActualizado, puedeAgregar, puedeQuitar }) {
  const [nuevas, setNuevas] = useState([]);
  const [subiendo, setSubiendo] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const dialogoRef = useDialogo(true, onClose, { hayCambios: nuevas.length > 0 });
  const fotos = recibo.comprobantes || [];

  const guardar = async () => {
    setGuardando(true); setError('');
    try {
      const { data } = await API.post(`/recibos-caja/${recibo.id}/comprobantes/`, { comprobantes: nuevas });
      setNuevas([]);
      onActualizado(data);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron guardar las fotos.');
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async (foto) => {
    if (!window.confirm('¿Quitar esta foto del recibo?')) return;
    setError('');
    try {
      await API.delete(`/recibos-caja/comprobantes/${foto.id}/`);
      onActualizado({ ...recibo, comprobantes: fotos.filter((f) => f.id !== foto.id) });
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo quitar la foto.');
    }
  };

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lottus-form-modal fc-modal" ref={dialogoRef} role="dialog" aria-modal="true" aria-label={`Fotos del recibo ${recibo.id}`} tabIndex={-1}>
        <div className="lottus-modal-header">
          <div className="lottus-modal-title-wrap">
            <div className="lottus-modal-icon-badge"><FaCamera /></div>
            <div>
              <h3 className="lottus-modal-title">Comprobantes · Recibo #{recibo.id}</h3>
              <p className="lottus-modal-subtitle">Venta #{recibo.venta} · fotos del pago enviadas por el cliente</p>
            </div>
          </div>
          <button type="button" className="lottus-close-btn" onClick={onClose} aria-label="Cerrar" data-dialogo-cerrar="">×</button>
        </div>
        <div className="lottus-modal-form">
          {fotos.length > 0 ? (
            <ul className="fc-grid fc-grid--grande">
              {fotos.map((foto) => (
                <li key={foto.id} className="fc-item">
                  <a href={foto.url} target="_blank" rel="noreferrer" title="Ver la foto completa"><img src={miniatura(foto.url)} alt={`Comprobante del recibo ${recibo.id}`} loading="lazy" /></a>
                  <span className="fc-pie">{foto.subido_por_nombre || ''}<a href={foto.url} target="_blank" rel="noreferrer" aria-label="Abrir la foto"><FaExternalLinkAlt /></a></span>
                  {puedeQuitar && <button type="button" className="fc-quitar" aria-label="Quitar esta foto del recibo" title="Quitar esta foto" onClick={() => quitar(foto)}><FaTimes /></button>}
                </li>
              ))}
            </ul>
          ) : <p className="fc-vacio">Este recibo no tiene fotos.</p>}
          {puedeAgregar && <AdjuntarComprobantes urls={nuevas} onChange={setNuevas} onSubiendo={setSubiendo} maximo={MAX_FOTOS - fotos.length} deshabilitado={guardando} />}
          {error && <p className="fc-error" role="alert">{error}</p>}
          <div className="lottus-modal-actions">
            <button type="button" className="lottus-btn-cancel" onClick={onClose}>Cerrar</button>
            {puedeAgregar && (
              <button type="button" className="lottus-btn-submit" onClick={guardar} disabled={!nuevas.length || subiendo > 0 || guardando}>
                {guardando ? 'Guardando…' : subiendo > 0 ? 'Subiendo fotos…' : 'Guardar fotos'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
