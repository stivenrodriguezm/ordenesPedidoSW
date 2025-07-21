import React from 'react';
import Modal from './Modal'; // Reutilizamos el componente Modal genérico

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, children, isLoading }) => {
  if (!isOpen) return null;

  return (
    <Modal show={isOpen} onClose={onClose} title={title}>
      {children}
      <div className="modal-actions">
        <button className="btn-secondary" onClick={onClose} disabled={isLoading}>Cancelar</button>
        <button className="btn-primary" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? 'Confirmando...' : 'Confirmar'}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
