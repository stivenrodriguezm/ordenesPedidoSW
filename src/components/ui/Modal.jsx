import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaTimes } from 'react-icons/fa';
import './ui.css';

/**
 * Modal único del design system (reemplaza los overlays duplicados).
 * size: 'sm' | 'md' | 'lg' | 'xl'
 */
const Modal = ({ open, onClose, title, size = 'md', footer, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className="ds-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`ds-modal ds-modal--${size}`} role="dialog" aria-modal="true">
        <div className="ds-modal__header">
          <h2 className="ds-modal__title">{title}</h2>
          <button className="ds-modal__close" onClick={onClose} aria-label="Cerrar">
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
