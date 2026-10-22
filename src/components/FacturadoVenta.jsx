import React, { useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import API from '../services/api';
import { mensajeDeError } from '../services/errores';
import './FacturadoVenta.css';

const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Marca de venta facturada (2026-10-21). Solo se muestra a quien tiene MARCAR_VENTA_FACTURADA
 *  (p. ej. Contabilidad). Un clic la marca; quitar la marca pide confirmación. */
export default function FacturadoVenta({ venta, onCambio, onError }) {
  const [guardando, setGuardando] = useState(false);
  const anulada = venta.estado === 'anulada';
  const cambiar = async (e) => {
    e.stopPropagation();
    if (venta.facturada && !window.confirm(`¿Quitar la marca de facturada a la venta ${venta.id}?`)) return;
    setGuardando(true);
    try {
      const { data } = await API.post(`/ventas/${venta.id}/facturada/`, { facturada: !venta.facturada });
      onCambio?.(data);
    } catch (err) {
      onError?.(mensajeDeError(err, 'No se pudo cambiar la marca de facturada.'));
    } finally {
      setGuardando(false);
    }
  };
  const detalle = venta.facturada ? `Facturada${venta.facturada_por_nombre ? ` por ${venta.facturada_por_nombre}` : ''}${venta.facturada_en ? ` el ${fecha(venta.facturada_en)}` : ''}`
    : anulada ? 'Venta anulada: no se factura' : 'Marcar como facturada';
  return (
    <button type="button" role="switch" aria-checked={!!venta.facturada} aria-label={`Venta ${venta.id} facturada`} title={detalle}
      className={`fv-marca${venta.facturada ? ' is-facturada' : ''}`} disabled={guardando || (anulada && !venta.facturada)} onClick={cambiar}>
      {venta.facturada ? <><FaCheck aria-hidden="true" /> Facturada</> : 'Marcar'}
    </button>
  );
}
