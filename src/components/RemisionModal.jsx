import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const RemisionModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const [remisionData, setRemisionData] = useState({ codigo: '', fecha: '' });

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setRemisionData({ codigo: '', fecha: today });
    }
  }, [isOpen]);

  const handleChange = (e) => setRemisionData({ ...remisionData, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); onSave(remisionData); };

  if (!isOpen) return null;

  return (
    <Modal show={isOpen} onClose={onClose} title="Agregar Remisión">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Código de Remisión:</label>
          <input type="text" name="codigo" value={remisionData.codigo} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Fecha:</label>
          <input type="date" name="fecha" value={remisionData.fecha} onChange={handleChange} required />
        </div>
        <button type="submit" className="modal-submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Guardar Remisión'}
        </button>
      </form>
    </Modal>
  );
};

export default RemisionModal;