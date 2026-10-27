import React, { useId, useLayoutEffect, useRef } from 'react';
import { leerPesos, mostrarPesos } from '../../utils/capturaPrecios';

// Borrador síncrono: el botón Guardar valida el texto actual, sin esperar guardados al salir del input.
export default function CampoEspecial({ label, valor, onChange, moneda = false, sufijo, error, placeholder, ariaLabel, permiteNegativo = false }) {
  const id = useId(), input = useRef(null), cursor = useRef(null), vaciado = useRef(false);
  let texto = valor;
  if (moneda) {
    try { texto = mostrarPesos(leerPesos(valor, permiteNegativo)); } catch { /* Entrada incompleta: se conserva y se valida al guardar. */ }
  }
  useLayoutEffect(() => {
    if (cursor.current == null || document.activeElement !== input.current) return;
    let restantes = cursor.current, posicion = 0;
    for (let i = 0; i < texto.length && restantes > 0; i++) { if (/\d/.test(texto[i])) restantes--; posicion = i + 1; }
    input.current.setSelectionRange(posicion, posicion); cursor.current = null;
  }, [texto]);
  return <div className="lp-especial-campo"><label htmlFor={id}>{label}</label><div className="lp-especial-entrada">
    <input id={id} ref={input} type="text" inputMode={moneda ? 'numeric' : 'decimal'} value={texto} autoComplete="off" placeholder={placeholder}
      aria-label={ariaLabel} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
      // En cero se vacía al entrar para no escribir pegado al «0»; si se sale sin escribir, vuelve.
      onFocus={() => { if (valor !== '' && valor != null && Number(String(valor).replace(/[$.\s]/g, '').replace(',', '.')) === 0) { vaciado.current = true; onChange(''); } }}
      onBlur={() => { if (vaciado.current && texto === '') onChange('0'); vaciado.current = false; }}
      onChange={e => {
        vaciado.current = false;
        const raw = e.target.value;
        cursor.current = moneda ? raw.slice(0, e.target.selectionStart).replace(/\D/g, '').length : null;
        const digitando = e.nativeEvent.inputType?.startsWith('delete') || (e.nativeEvent.inputType === 'insertText' && /^\d$/.test(e.nativeEvent.data || ''));
        const candidato = moneda && digitando ? raw.replace(/[$.\s]/g, '') : raw;
        onChange(candidato);
      }} onPaste={moneda ? e => { e.preventDefault(); const raw = e.clipboardData.getData('text'); try { onChange(String(leerPesos(raw, permiteNegativo))); } catch { onChange(raw); } } : undefined} />
    {sufijo && <span>{sufijo}</span>}</div>{error && <small id={`${id}-error`} className="lp-especial-error-campo">{error}</small>}
  </div>;
}
