import React from 'react';
import { FaInbox, FaExclamationTriangle } from 'react-icons/fa';
import Button from './Button';
import './ui.css';

/** Estado vacío estándar. */
export const EmptyState = ({ icon: Icon = FaInbox, title = 'Sin resultados', message, action }) => (
  <div className="ds-empty">
    <div className="ds-empty__icon">
      <Icon />
    </div>
    <p className="ds-empty__title">{title}</p>
    {message && <p className="ds-empty__message">{message}</p>}
    {action && <div className="ds-empty__action">{action}</div>}
  </div>
);

/** Caja de error con reintento. */
export const ErrorState = ({ message = 'No se pudo cargar la información.', onRetry }) => (
  <div className="ds-error-box">
    <FaExclamationTriangle />
    <span>{message}</span>
    {onRetry && (
      <Button variant="danger-soft" size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    )}
  </div>
);
