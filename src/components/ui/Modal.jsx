import React, { useId } from 'react';
import ReactDOM from 'react-dom';
import { FaTimes } from 'react-icons/fa';
import { NO_FOCO_INICIAL, confirmarDescarte, useDialogo } from '../../hooks/useDialogo';
import './ui.css';

/**
 * Modal único del design system (reemplaza los overlays duplicados).
 * size: 'sm' | 'md' | 'lg' | 'xl'
 * className: clase extra opcional para el contenedor del modal.
 * Foco inicial, confinado y devuelto al cerrar; Escape cierra solo el de
 * arriba; nombre accesible tomado del título (P08-07). Con hayCambios, Escape
 * y el clic fuera piden confirmación antes de descartar.
 */
const Modal = ({ open, onClose, title, size = 'md', footer, className = '', hayCambios = false, children }) => {
  const ref = useDialogo(open, onClose, { hayCambios });
  const tituloId = useId();

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className="ds-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && confirmarDescarte(hayCambios)) onClose?.();
      }}
    >
      <div
        ref={ref}
        className={`ds-modal ds-modal--${size}${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? tituloId : undefined}
        tabIndex={-1}
      >
        <div className="ds-modal__header">
          <h2 className="ds-modal__title" id={tituloId}>{title}</h2>
          <button className="ds-modal__close" onClick={onClose} aria-label="Cerrar" {...{ [NO_FOCO_INICIAL]: '' }}>
            <FaTimes />
          </button>
        </div>
        <div className="ds-modal__body">{children}</div>
        {footer && <div className="ds-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
