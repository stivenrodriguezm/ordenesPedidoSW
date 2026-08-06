import React, { useState, useEffect } from 'react';
import { Modal, Button } from './ui';
import { getTodayStr } from '../utils/dates';

const RemisionModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const [remisionData, setRemisionData] = useState({ codigo: '', fecha: '' });

  useEffect(() => {
    if (isOpen) {
      setRemisionData({ codigo: '', fecha: getTodayStr() });
    }
  }, [isOpen]);

  const handleChange = (e) => setRemisionData({ ...remisionData, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); onSave(remisionData); };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Agregar Remisión"
      size="sm"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" form="remision-modal-form" loading={isLoading}>
            Guardar Remisión
          </Button>
        </>
      )}
    >
      <form id="remision-modal-form" onSubmit={handleSubmit}>
        <div className="ds-field">
          <label className="ds-label" htmlFor="remision-codigo">Código de Remisión</label>
          <input
            id="remision-codigo"
            className="ds-input"
            type="text"
            name="codigo"
            value={remisionData.codigo}
            onChange={handleChange}
            required
          />
        </div>
        <div className="ds-field">
          <label className="ds-label" htmlFor="remision-fecha">Fecha</label>
          <input
            id="remision-fecha"
            className="ds-input"
            type="date"
            onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }}
            name="fecha"
            value={remisionData.fecha}
            onChange={handleChange}
            required
          />
        </div>
      </form>
    </Modal>
  );
};

export default RemisionModal;
