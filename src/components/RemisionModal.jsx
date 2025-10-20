import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const RemisionModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const [remisionData, setRemisionData] = useState({ codigo: '', fecha: '' });

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0'); // Enero es 0!
      const dd = String(today.getDate()).padStart(2, '0');
      const formattedToday = `${yyyy}-${mm}-${dd}`;
      setRemisionData({ codigo: '', fecha: formattedToday });
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