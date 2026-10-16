import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCheckCircle, FaTimes } from 'react-icons/fa';
import './AppNotification.css';

// Los errores suelen traer el motivo del servidor: más tiempo para leerlos.
const DURACION_MS = { error: 8000, otro: 4000 };

// Aviso accesible (P08-07, U10): se anuncia a lectores de pantalla (alert para
// errores, status para el resto), se pausa con el puntero o el foco encima y
// el botón de cerrar tiene nombre.
const AppNotification = ({ message, type, onClose }) => {
  const [pausado, setPausado] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!message || pausado) return undefined;
    const timer = setTimeout(() => onCloseRef.current?.(), type === 'error' ? DURACION_MS.error : DURACION_MS.otro);
    return () => clearTimeout(timer);
  }, [message, type, pausado]);

  if (!message) {
    return null;
  }

  return createPortal(
    <div
      className={`app-toast app-toast--visible app-toast--${type}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      {type === 'success' ? <FaCheckCircle className="app-toast-icon" aria-hidden="true" /> : <FaTimes className="app-toast-icon" aria-hidden="true" />}
      <span className="app-toast-msg">{message}</span>
      <button onClick={onClose} className="app-toast-close" aria-label="Cerrar aviso"><FaTimes aria-hidden="true" /></button>
    </div>,
    document.body
  );
};

export default AppNotification;
