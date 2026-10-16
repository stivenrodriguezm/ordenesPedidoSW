import React, { useId } from 'react';
import { createPortal } from 'react-dom';
import { NO_FOCO_INICIAL, confirmarDescarte, useDialogo } from '../hooks/useDialogo';
import './Modal.css';

// Mismo comportamiento accesible que ui/Modal (P08-07); conserva su aspecto.
const Modal = ({ children, show, open, onClose, title, footer, hayCambios = false }) => {
  const isVisible = show !== undefined ? show : open;
  const ref = useDialogo(Boolean(isVisible), onClose, { hayCambios });
  const tituloId = useId();
  if (!isVisible) {
    return null;
  }

  return createPortal(
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget && confirmarDescarte(hayCambios)) onClose(); }}>
      <div
        ref={ref}
        className="modal-content"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? tituloId : undefined}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h3 className="modal-title" id={tituloId}>{title}</h3>
          <button onClick={onClose} className="modal-close-button" aria-label="Cerrar" {...{ [NO_FOCO_INICIAL]: '' }}>&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
