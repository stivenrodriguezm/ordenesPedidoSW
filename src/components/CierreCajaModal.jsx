import React, { useState, useEffect } from 'react';
import { FaLock } from 'react-icons/fa';
import { formatCOP } from '../utils/formatCOP';
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

  if (!isOpen) return null;

  const numericDescuadre = parseInt(descuadre) || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="lottus-form-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="lottus-modal-header">
          <div className="lottus-modal-title-wrap">
            <div className="lottus-modal-icon-badge">
              <FaLock />
            </div>
            <div>
              <div className="lottus-modal-type-badge">
                <span className="lottus-badge-dot"></span> Caja General
              </div>
              <h3 className="lottus-modal-title">Cierre de Caja</h3>
              <p className="lottus-modal-subtitle">Registra el cierre del turno actual de caja.</p>
            </div>
          </div>
          <button type="button" className="lottus-close-btn" onClick={onClose} title="Cerrar">×</button>
        </div>

        <form onSubmit={handleSubmit} className="lottus-modal-form">
          {/* Tipo de Cierre */}
          <div className="lottus-form-group full">
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
              <div className="lottus-form-group full">
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

              <div className="lottus-form-group full">
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

          {/* Footer Actions */}
          <div className="lottus-modal-actions">
            <button type="button" className="lottus-btn-cancel" onClick={onClose} disabled={isLoading}>
              Cancelar
            </button>
            <button
              type="submit"
              className="lottus-btn-submit"
              disabled={isLoading || (cierreTipo === 'descuadre' && numericDescuadre <= 0)}
            >
              {isLoading ? 'Guardando...' : 'Confirmar Cierre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CierreCajaModal;
