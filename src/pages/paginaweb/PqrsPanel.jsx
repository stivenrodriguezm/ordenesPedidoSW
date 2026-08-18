import React, { useMemo, useState } from 'react';
import {
  FaSearch, FaEye, FaPaperPlane, FaInbox, FaHourglassHalf, FaCheckCircle,
  FaClipboardCheck, FaEnvelope, FaPhone, FaUser,
} from 'react-icons/fa';
import { updatePqrsEstado, responderPqrs } from '../../services/pqrsService';
import { Button, Badge, Modal, Skeleton, StatCard } from '../../components/ui';
import './Pqrs.css';

const TIPO_TONE = { peticion: 'info', queja: 'warning', reclamo: 'danger', sugerencia: 'accent' };
const ESTADO_TONE = { recibido: 'info', en_proceso: 'warning', respondido: 'success', cerrado: 'neutral' };
const ESTADOS = [
  { value: 'recibido', label: 'Recibido' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'respondido', label: 'Respondido' },
  { value: 'cerrado', label: 'Cerrado' },
];

function getErrorMessage(err, fallback) {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  const firstKey = Object.keys(data)[0];
  if (firstKey && Array.isArray(data[firstKey]) && data[firstKey][0]) return data[firstKey][0];
  return fallback;
}

function formatDate(iso) {
  if (!iso) return '-';
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function PqrsPanel({ pqrs, loading, notify, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [selected, setSelected] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingEstado, setUpdatingEstado] = useState(false);

  const stats = useMemo(() => {
    const total = pqrs.length;
    const pendientes = pqrs.filter((t) => t.estado === 'recibido' || t.estado === 'en_proceso').length;
    const respondidos = pqrs.filter((t) => t.estado === 'respondido').length;
    const cerrados = pqrs.filter((t) => t.estado === 'cerrado').length;
    return { total, pendientes, respondidos, cerrados };
  }, [pqrs]);

  const filtered = useMemo(() => {
    let list = pqrs;
    if (estadoFilter !== 'todos') {
      list = list.filter((t) => t.estado === estadoFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.nombre?.toLowerCase().includes(term) ||
          t.email?.toLowerCase().includes(term) ||
          t.radicado?.toLowerCase().includes(term) ||
          t.asunto?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [pqrs, searchTerm, estadoFilter]);

  const handleOpen = (ticket) => {
    setSelected(ticket);
    setRespuesta('');
  };

  const handleClose = () => {
    setSelected(null);
    setRespuesta('');
  };

  const handleChangeEstado = async (nuevoEstado) => {
    if (!selected || nuevoEstado === selected.estado) return;
    setUpdatingEstado(true);
    try {
      const updated = await updatePqrsEstado(selected.id, nuevoEstado);
      setSelected(updated);
      notify('Estado actualizado', 'success');
      onRefresh();
    } catch (err) {
      console.error('Error actualizando estado PQRS:', err);
      notify(getErrorMessage(err, 'Error al actualizar el estado'), 'error');
    } finally {
      setUpdatingEstado(false);
    }
  };

  const handleSendResponse = async (e) => {
    e.preventDefault();
    if (!selected || !respuesta.trim()) return;
    setSending(true);
    try {
      const updated = await responderPqrs(selected.id, respuesta.trim());
      setSelected(updated);
      setRespuesta('');
      notify('Respuesta enviada al correo del cliente', 'success');
      onRefresh();
    } catch (err) {
      console.error('Error respondiendo PQRS:', err);
      notify(getErrorMessage(err, 'Error al enviar la respuesta'), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="pw-stats-row">
        <StatCard icon={FaInbox} label="TOTAL PQRS" value={stats.total} hint="Recibidos desde Contacto" />
        <StatCard icon={FaHourglassHalf} tone="warning" label="PENDIENTES" value={stats.pendientes} hint="Recibido / En proceso" />
        <StatCard icon={FaCheckCircle} tone="success" label="RESPONDIDOS" value={stats.respondidos} hint="Correo enviado al cliente" />
        <StatCard icon={FaClipboardCheck} label="CERRADOS" value={stats.cerrados} hint="Casos finalizados" />
      </div>

      <div className="pw-main-card">
        <div className="pw-tools-bar">
          <div className="pw-search-input-wrapper">
            <FaSearch className="pw-search-icon" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo, radicado o asunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pw-search-input-field"
            />
          </div>
          <select
            className="ds-select pqrs-filter-select"
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            {ESTADOS.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Skeleton height="45px" />
            <Skeleton height="45px" />
            <Skeleton height="45px" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="pw-empty-state-panel">
            <p>No hay tickets PQRS que coincidan con este filtro.</p>
          </div>
        ) : (
          <div className="pw-table-container">
            <table className="pw-native-table">
              <thead>
                <tr>
                  <th>Radicado</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td><span className="pqrs-radicado">{t.radicado}</span></td>
                    <td>
                      <div className="pqrs-client-cell">
                        <span className="pw-product-name">{t.nombre}</span>
                        <span className="pqrs-client-email">{t.email}</span>
                      </div>
                    </td>
                    <td><Badge tone={TIPO_TONE[t.tipo] || 'neutral'}>{t.tipoDisplay || t.tipo}</Badge></td>
                    <td><Badge tone={ESTADO_TONE[t.estado] || 'neutral'}>{t.estadoDisplay || t.estado}</Badge></td>
                    <td className="pqrs-date-cell">{formatDate(t.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Button variant="secondary" size="sm" icon={FaEye} onClick={() => handleOpen(t)}>
                        Ver / Responder
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!selected}
        onClose={handleClose}
        title={selected ? `${selected.radicado} · ${selected.nombre}` : ''}
        size="lg"
        footer={
          <Button variant="secondary" onClick={handleClose}>Cerrar</Button>
        }
      >
        {selected && (
          <div className="pqrs-detail">
            <div className="pqrs-detail-meta">
              <div className="pqrs-meta-item"><FaUser /> {selected.nombre}</div>
              <div className="pqrs-meta-item"><FaEnvelope /> <a href={`mailto:${selected.email}`}>{selected.email}</a></div>
              {selected.telefono && <div className="pqrs-meta-item"><FaPhone /> {selected.telefono}</div>}
              <div className="pqrs-meta-item">
                <Badge tone={TIPO_TONE[selected.tipo] || 'neutral'}>{selected.tipoDisplay || selected.tipo}</Badge>
                {selected.asunto && <span className="pqrs-asunto-tag">{selected.asunto}</span>}
              </div>
            </div>

            <div className="pqrs-status-row">
              <span className="ds-label">Estado del caso</span>
              <select
                className="ds-select"
                value={selected.estado}
                disabled={updatingEstado}
                onChange={(e) => handleChangeEstado(e.target.value)}
              >
                {ESTADOS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>

            <div className="pqrs-modal-section">
              <h4 className="pw-form-sub-header">Mensaje del cliente</h4>
              <div className="pqrs-thread-bubble pqrs-thread-bubble--client">
                <p>{selected.mensaje}</p>
                <span className="pqrs-thread-date">{formatDate(selected.createdAt)}</span>
              </div>
            </div>

            {selected.respuestas && selected.respuestas.length > 0 && (
              <div className="pqrs-modal-section">
                <h4 className="pw-form-sub-header">Historial de respuestas</h4>
                {selected.respuestas.map((r, idx) => (
                  <div key={idx} className="pqrs-thread-bubble pqrs-thread-bubble--admin">
                    <p>{r.mensaje}</p>
                    <span className="pqrs-thread-date">{r.autor} · {formatDate(r.fecha)}</span>
                  </div>
                ))}
              </div>
            )}

            <form className="pqrs-modal-section" onSubmit={handleSendResponse}>
              <h4 className="pw-form-sub-header">Responder al cliente</h4>
              <textarea
                className="ds-textarea"
                rows={4}
                placeholder="Escribe la respuesta que recibirá el cliente por correo..."
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
              />
              <div className="pqrs-send-row">
                <span className="pw-field-hint">Se enviará por correo a {selected.email}</span>
                <Button type="submit" variant="primary" icon={FaPaperPlane} loading={sending} disabled={!respuesta.trim()}>
                  Enviar respuesta
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </>
  );
}

export default PqrsPanel;
