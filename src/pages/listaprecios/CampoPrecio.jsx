import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { leerDecimal, leerPesos, mostrarPesos } from '../../utils/capturaPrecios';
import { mensajeDeError } from '../../services/errores';

export default function CampoPrecio({ valor, onCommit, label, tipo = 'moneda', sufijo, permiteNegativo = false, nullable = false, max, min, placeholder, className = '', disabled = false, esBorrador = false }) {
  const formato = (v) => v == null ? '' : tipo === 'moneda' ? mostrarPesos(v) : tipo === 'texto' ? String(v) : Number(v).toLocaleString('es-CO', { useGrouping: false, maximumFractionDigits: 2 });
  const [texto, setTexto] = useState(() => formato(valor));
  const [estado, setEstado] = useState('');
  const [error, setError] = useState('');
  const tocado = useRef(false);
  const vigente = useRef(valor);
  const entrada = useRef(null);
  const cursorDigitos = useRef(null);
  const id = useId();
  useEffect(() => {
    vigente.current = valor;
    if (!tocado.current) setTexto(valor == null ? '' : tipo === 'moneda' ? mostrarPesos(valor) : tipo === 'texto' ? String(valor) : Number(valor).toLocaleString('es-CO', { useGrouping: false, maximumFractionDigits: 2 }));
  }, [valor, tipo]);
  useLayoutEffect(() => {
    if (cursorDigitos.current == null || document.activeElement !== entrada.current) return;
    const cantidad = cursorDigitos.current;
    cursorDigitos.current = null;
    let vistos = 0;
    let posicion = texto.search(/\d/);
    for (let i = 0; i < texto.length && vistos < cantidad; i++) {
      if (/\d/.test(texto[i])) { vistos++; posicion = i + 1; }
    }
    entrada.current.setSelectionRange(Math.max(0, posicion), Math.max(0, posicion));
  }, [texto]);

  const guardar = async () => {
    if (!tocado.current || estado === 'guardando') return;
    let nuevo;
    try {
      nuevo = tipo === 'moneda' ? nullable && texto === '' ? null : leerPesos(texto, permiteNegativo) : tipo === 'texto' ? texto.trim() : leerDecimal(texto, { nullable, min, max });
      if (tipo === 'texto' && (!nuevo || nuevo.length > (max || 150))) throw new Error('Escribe un nombre de 1 a 150 caracteres.');
    } catch (e) { setError(e.message); setEstado('error'); return; }
    if (nuevo === (vigente.current == null ? null : tipo === 'texto' ? vigente.current : Number(vigente.current))) {
      tocado.current = false; setTexto(formato(nuevo)); setError(''); setEstado(''); return;
    }
    setEstado('guardando'); setError('');
    try {
      await onCommit(nuevo);
      vigente.current = nuevo; tocado.current = false; setTexto(formato(nuevo)); setEstado(esBorrador ? 'borrador' : 'guardado');
    } catch (e) {
      setEstado('error'); setError(e?.response ? mensajeDeError(e) : 'No se guardó. Conservamos tu entrada; vuelve a confirmar.');
    }
  };
  const cambiar = (raw, inputType, dato) => {
    tocado.current = true; setEstado('pendiente'); setError('');
    if (tipo === 'moneda') {
      // Durante edición de dígitos, los puntos existentes pertenecen al formato.
      const digitando = inputType?.startsWith('delete') || (inputType === 'insertText' && /^\d$/.test(dato || ''));
      const candidato = digitando ? raw.replace(/[$.\s]/g, '') : raw;
      try { setTexto(mostrarPesos(leerPesos(candidato, permiteNegativo))); } catch { setTexto(raw); }
    } else setTexto(raw);
  };
  return <div data-estado={estado} className={`lp-captura ${className} ${estado === 'error' ? 'lp-captura--error' : ''}`}>
    {label && <label htmlFor={id}>{label}</label>}
    <div className="lp-captura-control">
      <input id={id} ref={entrada} type="text" inputMode={tipo === 'moneda' ? 'numeric' : tipo === 'texto' ? undefined : 'decimal'}
        value={texto} disabled={disabled || estado === 'guardando'} aria-label={label} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
        placeholder={placeholder} autoComplete="off" spellCheck={false} className="lp-inline-input"
        onClick={(e) => e.stopPropagation()} onChange={(e) => {
          if (tipo === 'moneda') cursorDigitos.current = e.target.value.slice(0, e.target.selectionStart).replace(/\D/g, '').length;
          cambiar(e.target.value, e.nativeEvent.inputType, e.nativeEvent.data);
        }}
        onBlur={guardar} onPaste={tipo === 'moneda' ? (e) => {
          e.preventDefault(); const pegado = e.clipboardData.getData('text');
          try { const nuevo = leerPesos(pegado, permiteNegativo); cambiar(String(nuevo)); }
          catch (err) { tocado.current = true; setTexto(pegado); setEstado('error'); setError(err.message); }
        } : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); tocado.current = false; setTexto(formato(vigente.current)); setEstado(''); setError(''); }
        }} />
      {sufijo && <span className="lp-captura-sufijo" aria-hidden="true">{sufijo}</span>}
    </div>
    <span className={`lp-captura-estado lp-captura-estado--${estado}`} role="status">{estado === 'guardando' ? 'Guardando…' : estado === 'guardado' ? 'Guardado' : estado === 'borrador' ? 'Pendiente de guardar' : estado === 'pendiente' ? 'Sin guardar' : ''}</span>
    {error && <span id={`${id}-error`} className="lp-captura-error" role="alert">{error} <button type="button" onClick={guardar}>Reintentar</button></span>}
  </div>;
}

export function ConsumoMaterial({ valor, material, onCommit, disabled = false }) {
  const [activo, setActivo] = useState(valor != null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const label = material === 'cuero' ? 'Cuero' : 'Tela';
  const unidad = material === 'cuero' ? 'dm' : 'm';
  // No inferir cantidad a partir de otro material: una opción nueva exige un valor.
  useEffect(() => { if (valor != null) setActivo(true); }, [valor]);
  return <div className="lp-consumo-material">
    <label className="lp-consumo-toggle"><input type="checkbox" checked={activo} disabled={disabled || guardando}
      aria-label={`Aplica ${label.toLowerCase()}`} onChange={async (e) => {
        const marcar = e.target.checked; setActivo(marcar); setError('');
        if (!marcar && valor != null) {
          setGuardando(true);
          try { await onCommit(null); } catch { setActivo(true); setError('No se pudo desactivar. Intenta de nuevo.'); }
          finally { setGuardando(false); }
        }
      }} /> {label}</label>
    {activo ? <CampoPrecio tipo="decimal" valor={valor} label={material === 'cuero' ? 'Decimetraje de cuero' : 'Metraje de tela'} sufijo={unidad}
      placeholder="Cantidad" disabled={disabled || guardando} onCommit={onCommit} /> : <span className="lp-consumo-no">{guardando ? 'Guardando…' : 'No aplica'}</span>}
    {activo && valor == null && <small className="lp-consumo-pendiente">Indica el consumo para activarlo.</small>}
    {error && <small className="lp-captura-error" role="alert">{error}</small>}
  </div>;
}
