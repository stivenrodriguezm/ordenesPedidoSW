import React, { useEffect, useRef, useState } from 'react';
import { FaCheckCircle, FaDesktop, FaExclamationTriangle, FaPrint } from 'react-icons/fa';
import { Button, Modal } from '../ui';
import {
  cargarImpresoras, consultarTrabajo, destinoGuardado, enviarTrabajo, guardarDestino, impresorasEnCache,
} from './impresoras';
import './BotonImprimir.css';

const EN_CURSO = ['pendiente', 'procesando', 'enviado'];
const SEGUIR_MS = 120000;

const haceCuanto = iso => {
  if (!iso) return 'sin conexión reciente';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `última conexión hace ${Math.max(min, 1)} min`;
  const h = Math.round(min / 60);
  return h < 48 ? `última conexión hace ${h} h` : 'sin conexión reciente';
};

/**
 * Botón «Imprimir» de toda la plataforma (2026-10-24). Antes de imprimir pregunta dónde:
 * en esta computadora (diálogo del navegador, como siempre) o en una impresora de la
 * oficina, a la que el documento llega por el servidor desde cualquier lugar.
 *
 * documento: () => HTML completo, el mismo que se imprime en el navegador.
 * imprimirLocal: imprime aquí (abre el diálogo del navegador).
 * Si no hay impresoras de oficina configuradas, imprime aquí directamente.
 */
export default function BotonImprimir({ documento, titulo, imprimirLocal, disabled, children = 'Imprimir', variant = 'primary', ...rest }) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => { cargarImpresoras(); }, []);

  const alPulsar = () => {
    const lista = impresorasEnCache();
    if (lista && lista.length === 0) imprimirLocal();
    else setAbierto(true);
  };

  return (
    <>
      <Button variant={variant} icon={FaPrint} onClick={alPulsar} disabled={disabled} {...rest}>{children}</Button>
      {abierto && (
        <SelectorImpresora
          titulo={titulo}
          documento={documento}
          imprimirLocal={imprimirLocal}
          onClose={() => setAbierto(false)}
        />
      )}
    </>
  );
}

function SelectorImpresora({ titulo, documento, imprimirLocal, onClose }) {
  const [impresoras, setImpresoras] = useState(impresorasEnCache() || []);
  const [destino, setDestino] = useState(destinoGuardado);
  const [copias, setCopias] = useState('1');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [trabajo, setTrabajo] = useState(null);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    cargarImpresoras({ forzar: true }).then(lista => vivo.current && setImpresoras(lista));
    return () => { vivo.current = false; };
  }, []);

  // Seguimiento del trabajo enviado hasta que se imprime (o falla), máximo dos minutos.
  useEffect(() => {
    if (!trabajo || !EN_CURSO.includes(trabajo.estado) || trabajo.sinSeguir) return undefined;
    const t = setTimeout(() => {
      consultarTrabajo(trabajo.id)
        .then(d => vivo.current && setTrabajo(prev => ({ ...prev, ...d, sinSeguir: Date.now() - prev.desde > SEGUIR_MS })))
        .catch(() => vivo.current && setTrabajo(prev => ({ ...prev, sinSeguir: true })));
    }, 3000);
    return () => clearTimeout(t);
  }, [trabajo]);

  const remota = impresoras.find(i => String(i.id) === String(destino));
  const elegido = remota ? String(remota.id) : 'local';
  const nCopias = Number(copias);
  const copiasValidas = Number.isInteger(nCopias) && nCopias >= 1 && nCopias <= 10;

  const imprimir = async () => {
    guardarDestino(elegido);
    if (!remota) {
      onClose();
      setTimeout(imprimirLocal, 0);
      return;
    }
    if (!copiasValidas) return;
    setEnviando(true);
    setError('');
    try {
      const d = await enviarTrabajo({ impresora: remota.id, titulo, html: documento(), copias: nCopias });
      if (vivo.current) setTrabajo({ ...d, desde: Date.now() });
    } catch (e) {
      if (vivo.current) setError(e?.response?.data?.error || 'No se pudo enviar el documento. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      if (vivo.current) setEnviando(false);
    }
  };

  if (trabajo) {
    const impresora = impresoras.find(i => i.id === trabajo.impresora) || remota;
    const enCurso = EN_CURSO.includes(trabajo.estado);
    const sinSeguir = enCurso && trabajo.sinSeguir;
    return (
      <Modal open onClose={onClose} title="Impresión en la oficina" size="sm" className="bi-modal"
        footer={<Button variant={enCurso ? 'secondary' : 'primary'} onClick={onClose}>{enCurso ? 'Cerrar (sigue en cola)' : 'Listo'}</Button>}>
        <div className={`bi-estado bi-estado--${trabajo.estado}`} role="status" aria-live="polite">
          {trabajo.estado === 'impreso' ? <FaCheckCircle aria-hidden /> : trabajo.estado === 'error' ? <FaExclamationTriangle aria-hidden /> : <span className="bi-girando" aria-hidden />}
          <div>
            <strong>{trabajo.estado_nombre}</strong>
            <p>
              {trabajo.titulo} · {trabajo.copias} {trabajo.copias === 1 ? 'copia' : 'copias'} en {impresora?.nombre || 'la impresora'}
              {impresora?.ubicacion ? ` (${impresora.ubicacion})` : ''}.
            </p>
            {trabajo.detalle && <p className="bi-detalle">{trabajo.detalle}</p>}
            {trabajo.estado === 'pendiente' && !trabajo.en_linea && (
              <p className="bi-detalle">La computadora de la oficina no está conectada: se imprimirá cuando se conecte (hasta 12 horas).</p>
            )}
            {sinSeguir && <p className="bi-detalle">Puedes cerrar: el documento sigue en la cola de la oficina.</p>}
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="¿Dónde imprimir?" size="sm" className="bi-modal"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button icon={FaPrint} onClick={imprimir} loading={enviando} disabled={!!remota && !copiasValidas}>Imprimir</Button>
      </>}>
      <div className="bi-opciones" role="radiogroup" aria-label="Impresora">
        <label className={`bi-opcion${elegido === 'local' ? ' is-activa' : ''}`}>
          <input type="radio" name="bi-destino" value="local" checked={elegido === 'local'} onChange={() => setDestino('local')} />
          <FaDesktop className="bi-opcion__icono" aria-hidden />
          <span>
            <strong>Esta computadora</strong>
            <small>Abre el diálogo de impresión del navegador para usar una impresora de aquí.</small>
          </span>
        </label>
        {impresoras.map(i => (
          <label key={i.id} className={`bi-opcion${elegido === String(i.id) ? ' is-activa' : ''}`}>
            <input type="radio" name="bi-destino" value={i.id} checked={elegido === String(i.id)} onChange={() => setDestino(String(i.id))} />
            <FaPrint className="bi-opcion__icono" aria-hidden />
            <span>
              <strong>{i.nombre}</strong>
              <small>{i.ubicacion || 'Impresora remota'}</small>
              <span className={`bi-conexion${i.en_linea ? ' is-en-linea' : ''}`}>
                {i.en_linea ? 'En línea' : `Desconectada · ${haceCuanto(i.ultima_conexion)}`}
              </span>
            </span>
          </label>
        ))}
      </div>
      {remota && (
        <div className="bi-copias">
          <label htmlFor="bi-copias">Copias</label>
          <input id="bi-copias" type="text" inputMode="numeric" value={copias} maxLength={2}
            onChange={e => setCopias(e.target.value.replace(/\D/g, ''))} aria-invalid={!copiasValidas} />
          {!copiasValidas && <span className="bi-detalle">De 1 a 10.</span>}
          {!remota.en_linea && <p className="bi-detalle">Se enviará igual y saldrá cuando la computadora de la oficina se conecte.</p>}
        </div>
      )}
      {error && <p className="bi-error" role="alert">{error}</p>}
    </Modal>
  );
}
