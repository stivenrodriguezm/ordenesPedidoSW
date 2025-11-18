import React, { useState } from 'react';
import './Modal.css'; // Reutilizamos los estilos de modales existentes

const CierreCajaModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const [cierreTipo, setCierreTipo] = useState('exacto');
  const [descuadre, setDescuadre] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {};
    if (cierreTipo === 'descuadre') {
      dataToSave.descuadre = descuadre;
    }
    onSave(dataToSave);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '500px' }}>
        <div className="modal-header">
          <h3>Registrar Cierre de Caja</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tipo de Cierre</label>
            <select value={cierreTipo} onChange={(e) => setCierreTipo(e.target.value)} required>
              <option value="exacto">Cierre Exacto</option>
              <option value="descuadre">Cierre con Descuadre</option>
            </select>
          </div>

          {cierreTipo === 'descuadre' && (
            <div className="form-group">
              <label>Valor del Descuadre</label>
              <input 
                type="number" 
                value={descuadre} 
                onChange={(e) => setDescuadre(e.target.value)} 
                required 
                step="any" 
                placeholder="Ingrese el monto del descuadre"
              />
            </div>
          )}

          <button type="submit" className="modal-submit" disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Confirmar Cierre'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CierreCajaModal;
