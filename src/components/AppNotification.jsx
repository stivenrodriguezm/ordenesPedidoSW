import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCheck, FaExclamation, FaInfo, FaTimes } from 'react-icons/fa';
import './AppNotification.css';

// Los errores suelen traer el motivo del servidor: más tiempo para leerlos.
const DURACION_MS = { error: 8000, otro: 4000 };
const SALIDA_MS = 180;
const TIPOS = {
  success: { titulo: 'Listo', Icono: FaCheck },
  error: { titulo: 'No se pudo completar', Icono: FaExclamation },
  warning: { titulo: 'Atención', Icono: FaExclamation },
  info: { titulo: 'Aviso', Icono: FaInfo },
};

// Aviso tipo toast, arriba a la derecha (2026-10-24). Accesible (P08-07, U10): se anuncia a
// lectores de pantalla (alert para errores, status para el resto), se pausa con el puntero o
// el foco encima (la barra de tiempo también) y el botón de cerrar tiene nombre.
const AppNotification = ({ message, type, onClose }) => {
  if (!message) return null;
  // Un mensaje nuevo es otro aviso: reinicia el tiempo y la animación.
  return <Toast key={`${type}:${message}`} message={message} type={type} onClose={onClose} />;
};

function Toast({ message, type, onClose }) {
  const duracion = type === 'error' ? DURACION_MS.error : DURACION_MS.otro;
  const [pausado, setPausado] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const restante = useRef(duracion);

  const cerrar = useCallback(() => {
    setSaliendo(true);
    setTimeout(() => onCloseRef.current?.(), SALIDA_MS);
  }, []);

  useEffect(() => {
    if (pausado || saliendo) return undefined;
    const inicio = Date.now();
    const timer = setTimeout(cerrar, restante.current);
    return () => {
      clearTimeout(timer);
      restante.current = Math.max(0, restante.current - (Date.now() - inicio));
    };
  }, [pausado, saliendo, cerrar]);

  const { titulo, Icono } = TIPOS[type] || TIPOS.info;
  return createPortal(
    <div
      className={`app-toast app-toast--${TIPOS[type] ? type : 'info'}${saliendo ? ' is-saliendo' : ''}${pausado ? ' is-pausado' : ''}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      style={{ '--toast-duracion': `${duracion}ms` }}
    >
      <span className="app-toast__icono" aria-hidden="true"><Icono /></span>
      <div className="app-toast__texto">
        <strong className="app-toast__titulo">{titulo}</strong>
        <span className="app-toast-msg">{message}</span>
      </div>
      <button type="button" onClick={cerrar} className="app-toast-close" aria-label="Cerrar aviso"><FaTimes aria-hidden="true" /></button>
      <span className="app-toast__tiempo" aria-hidden="true" />
    </div>,
    document.body
  );
}

export default AppNotification;
