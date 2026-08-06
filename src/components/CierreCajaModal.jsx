import React, { useState, useEffect } from 'react';
import { formatCOP } from '../utils/formatCOP';
import { Button, Modal } from './ui';
import './CierreCajaModal.css';

const CierreCajaModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const [cierreTipo, setCierreTipo] = useState('exacto');
  const [descuadre, setDescuadre] = useState('');
  const [descuadreTipo, setDescuadreTipo] = useState('faltante');

  useEffect(() => {
    if (isOpen) {
      setCierreTipo('exacto');
      setDescuadre('');
      setDescuadreTipo('faltante');
    }
  }, [isOpen]);

  const handleDescuadreChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setDescuadre(raw);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {};
    if (cierreTipo === 'descuadre') {
      dataToSave.descuadre = descuadre;
      dataToSave.signo = descuadreTipo;
    }
    onSave(dataToSave);
  };

  const numericDescuadre = parseInt(descuadre) || 0;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Cierre de Caja"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="cierre-caja-form"
            loading={isLoading}
            disabled={cierreTipo === 'descuadre' && numericDescuadre <= 0}
          >
            Confirmar Cierre
          </Button>
        </>
      }
    >
      <p className="lottus-modal-subtitle">Registra el cierre del turno actual de caja.</p>
      <form id="cierre-caja-form" onSubmit={handleSubmit} className="lottus-modal-form">
        {/* Tipo de Cierre */}
        <div className="lottus-form-group">
          <label>Tipo de Cierre <span className="lottus-req">*</span></label>
          <div className="lottus-toggle-row">
            <button
              type="button"
              className={`lottus-toggle-btn ${cierreTipo === 'exacto' ? 'active' : ''}`}
              onClick={() => setCierreTipo('exacto')}
            >
              Cierre Exacto
            </button>
            <button
              type="button"
              className={`lottus-toggle-btn ${cierreTipo === 'descuadre' ? 'active' : ''}`}
              onClick={() => setCierreTipo('descuadre')}
            >
              Con Descuadre
            </button>
          </div>
        </div>

        {/* Descuadre fields */}
        {cierreTipo === 'descuadre' && (
          <>
            <div className="lottus-form-group">
              <label>Tipo de Descuadre <span className="lottus-req">*</span></label>
              <select
                value={descuadreTipo}
                onChange={(e) => setDescuadreTipo(e.target.value)}
                required
                className="lottus-select"
              >
                <option value="faltante">Faltante (Menos dinero en caja)</option>
                <option value="sobrante">Sobrante (Más dinero en caja)</option>
              </select>
            </div>

            <div className="lottus-form-group">
              <div className="lottus-label-flex">
                <label>Valor del Descuadre <span className="lottus-req">*</span></label>
                {numericDescuadre > 0 && (
                  <span className="lottus-val-preview">{formatCOP(numericDescuadre)}</span>
                )}
              </div>
              <div className="lottus-input-icon">
                <span className="lottus-prefix">$</span>
                <input
                  type="text"
                  value={descuadre ? formatCOP(numericDescuadre).replace('$', '').trim() : ''}
                  onChange={handleDescuadreChange}
                  required
                  placeholder="0"
                  className="lottus-input lottus-input-pl"
                />
              </div>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};

export default CierreCajaModal;
