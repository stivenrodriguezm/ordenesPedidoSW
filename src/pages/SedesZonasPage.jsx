import React, { useState, useEffect } from "react";
import API from "../services/api";
import "./SedesZonasPage.css";
import { FaEdit, FaPlus, FaTrash, FaMapMarkerAlt, FaBuilding, FaBoxOpen } from "react-icons/fa";
import AppNotification from '../components/AppNotification';
import { Button, Modal, Badge, Skeleton, EmptyState } from '../components/ui';

const SedeModal = ({ isOpen, onClose, onSave, sede, isLoading }) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    if (sede) {
      setNombre(sede.nombre || '');
      setDescripcion(sede.descripcion || '');
    } else {
      setNombre('');
      setDescripcion('');
    }
  }, [sede, isOpen]);

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={sede ? 'Editar Sede' : 'Nueva Sede'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button type="submit" form="sede-form" loading={isLoading}>Guardar</Button>
        </>
      }
    >
      <form id="sede-form" onSubmit={(e) => { e.preventDefault(); onSave({ id: sede?.id, nombre, descripcion }); }}>
        <div className="ds-field">
          <label className="ds-label">Nombre de Sede:</label>
          <input className="ds-input" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Ej: Lottus 1" />
        </div>
        <div className="ds-field" style={{ marginBottom: 0 }}>
          <label className="ds-label">Descripción:</label>
          <textarea className="ds-textarea" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Opcional..." rows="3" />
        </div>
      </form>
    </Modal>
  );
};

const ZonaModal = ({ isOpen, onClose, onSave, zona, sedes, isLoading }) => {
  const [sedeId, setSedeId] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    if (zona) {
      setSedeId(zona.sede || (sedes.length > 0 ? sedes[0].id : ''));
      setNombre(zona.nombre || '');
      setDescripcion(zona.descripcion || '');
    } else {
      setSedeId(sedes.length > 0 ? sedes[0].id : '');
      setNombre('');
      setDescripcion('');
    }
  }, [zona, sedes, isOpen]);

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={zona ? 'Editar Zona' : 'Nueva Zona'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancelar</Button>
          <Button type="submit" form="zona-form" loading={isLoading}>Guardar</Button>
        </>
      }
    >
      <form id="zona-form" onSubmit={(e) => { e.preventDefault(); onSave({ id: zona?.id, sede: sedeId, nombre, descripcion }); }}>
        <div className="ds-field">
          <label className="ds-label">Sede a la que pertenece:</label>
          <select className="ds-select" value={sedeId} onChange={(e) => setSedeId(e.target.value)} required>
            <option value="">Seleccione una sede...</option>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div className="ds-field">
          <label className="ds-label">Nombre de Zona:</label>
          <input className="ds-input" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Ej: Bodega Principal" />
        </div>
        <div className="ds-field" style={{ marginBottom: 0 }}>
          <label className="ds-label">Descripción:</label>
          <textarea className="ds-textarea" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Opcional..." rows="3" />
        </div>
      </form>
    </Modal>
  );
};

export default function SedesZonasPage() {
  const [sedes, setSedes] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ message: '', type: '' });
  
  // Modals state
  const [sedeModal, setSedeModal] = useState({ isOpen: false, data: null, isLoading: false });
  const [zonaModal, setZonaModal] = useState({ isOpen: false, data: null, isLoading: false });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSedes, resZonas] = await Promise.all([
        API.get('/suministros/sedes/?page_size=1000'),
        API.get('/suministros/zonas/?page_size=1000')
      ]);
      setSedes(resSedes.data.results || resSedes.data || []);
      setZonas(resZonas.data.results || resZonas.data || []);
    } catch (err) {
      setNotification({ message: 'Error cargando sedes y zonas.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Handlers Sedes
  const handleSaveSede = async (data) => {
    setSedeModal(prev => ({ ...prev, isLoading: true }));
    try {
      if (data.id) {
        await API.put(`/suministros/sedes/${data.id}/`, data);
        setNotification({ message: 'Sede actualizada.', type: 'success' });
      } else {
        await API.post('/suministros/sedes/', data);
        setNotification({ message: 'Sede creada.', type: 'success' });
      }
      fetchData();
      setSedeModal({ isOpen: false, data: null, isLoading: false });
    } catch (err) {
      setNotification({ message: 'Error guardando sede.', type: 'error' });
      setSedeModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteSede = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta sede? Se eliminarán también sus zonas.')) return;
    try {
      await API.delete(`/suministros/sedes/${id}/`);
      setNotification({ message: 'Sede eliminada.', type: 'success' });
      fetchData();
    } catch (err) {
      setNotification({ message: 'Error al eliminar sede.', type: 'error' });
    }
  };

  // Handlers Zonas
  const handleSaveZona = async (data) => {
    setZonaModal(prev => ({ ...prev, isLoading: true }));
    try {
      if (data.id) {
        await API.put(`/suministros/zonas/${data.id}/`, data);
        setNotification({ message: 'Zona actualizada.', type: 'success' });
      } else {
        await API.post('/suministros/zonas/', data);
        setNotification({ message: 'Zona creada.', type: 'success' });
      }
      fetchData();
      setZonaModal({ isOpen: false, data: null, isLoading: false });
    } catch (err) {
      setNotification({ message: 'Error guardando zona.', type: 'error' });
      setZonaModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteZona = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta zona?')) return;
    try {
      await API.delete(`/suministros/zonas/${id}/`);
      setNotification({ message: 'Zona eliminada.', type: 'success' });
      fetchData();
    } catch (err) {
      setNotification({ message: 'Error al eliminar zona.', type: 'error' });
    }
  };

  const getSedeName = (sedeId) => sedes.find(s => s.id === sedeId)?.nombre || 'Desconocida';

  const renderSkeletonRows = (cols) =>
    Array.from({ length: 3 }).map((_, index) => (
      <tr key={index}>
        {Array.from({ length: cols }).map((__, i) => (
          <td key={i}><Skeleton height={14} width={i === 0 ? '60%' : '80%'} /></td>
        ))}
      </tr>
    ));

  return (
    <div className="sz-container">
      <AppNotification 
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      {/* Sedes Section */}
      <section className="ds-card sz-section">
        <div className="sz-section-header">
          <h2><FaBuilding style={{ color: 'var(--info)' }} /> Sedes</h2>
          <Button size="sm" icon={FaPlus} onClick={() => setSedeModal({ isOpen: true, data: null, isLoading: false })}>
            Nueva Sede
          </Button>
        </div>
        <div className="ds-table-scroll">
          <table className="ds-table" style={{ minWidth: '500px' }}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Zonas Totales</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                renderSkeletonRows(4)
              ) : sedes.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: 0 }}>
                    <EmptyState
                      icon={FaBoxOpen}
                      title="Sin sedes"
                      message="No hay sedes registradas."
                    />
                  </td>
                </tr>
              ) : (
                sedes.map(sede => {
                  const numZonas = zonas.filter(z => z.sede === sede.id).length;
                  return (
                    <tr key={sede.id}>
                      <td style={{ fontWeight: 500, color: 'var(--text)' }}>{sede.nombre}</td>
                      <td className="ds-muted">{sede.descripcion || '—'}</td>
                      <td><Badge tone="info">{numZonas}</Badge></td>
                      <td>
                        <div className="sz-actions">
                          <Button variant="ghost" size="sm" icon={FaEdit} title="Editar Sede" aria-label="Editar Sede" onClick={() => setSedeModal({ isOpen: true, data: sede, isLoading: false })} />
                          <Button variant="danger-soft" size="sm" icon={FaTrash} title="Eliminar Sede" aria-label="Eliminar Sede" onClick={() => handleDeleteSede(sede.id)} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Zonas Section */}
      <section className="ds-card sz-section">
        <div className="sz-section-header">
          <h2><FaMapMarkerAlt style={{ color: 'var(--danger)' }} /> Zonas de Inventario</h2>
          <Button
            size="sm"
            icon={FaPlus}
            onClick={() => {
              if(sedes.length === 0) {
                setNotification({ message: 'Debes crear al menos una sede primero.', type: 'error' });
                return;
              }
              setZonaModal({ isOpen: true, data: null, isLoading: false });
            }}
          >
            Nueva Zona
          </Button>
        </div>
        <div className="ds-table-scroll">
          <table className="ds-table" style={{ minWidth: '500px' }}>
            <thead>
              <tr>
                <th>Sede</th>
                <th>Nombre de Zona</th>
                <th>Descripción</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                renderSkeletonRows(4)
              ) : zonas.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: 0 }}>
                    <EmptyState
                      icon={FaBoxOpen}
                      title="Sin zonas"
                      message="No hay zonas registradas."
                    />
                  </td>
                </tr>
              ) : (
                zonas.map(zona => (
                  <tr key={zona.id}>
                    <td><Badge tone="neutral">{getSedeName(zona.sede)}</Badge></td>
                    <td style={{ fontWeight: 500, color: 'var(--text)' }}>{zona.nombre}</td>
                    <td className="ds-muted">{zona.descripcion || '—'}</td>
                    <td>
                      <div className="sz-actions">
                        <Button variant="ghost" size="sm" icon={FaEdit} title="Editar Zona" aria-label="Editar Zona" onClick={() => setZonaModal({ isOpen: true, data: zona, isLoading: false })} />
                        <Button variant="danger-soft" size="sm" icon={FaTrash} title="Eliminar Zona" aria-label="Eliminar Zona" onClick={() => handleDeleteZona(zona.id)} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modals */}
      <SedeModal 
        isOpen={sedeModal.isOpen} 
        sede={sedeModal.data} 
        isLoading={sedeModal.isLoading}
        onClose={() => setSedeModal({ isOpen: false, data: null, isLoading: false })}
        onSave={handleSaveSede}
      />

      <ZonaModal 
        isOpen={zonaModal.isOpen} 
        zona={zonaModal.data} 
        sedes={sedes}
        isLoading={zonaModal.isLoading}
        onClose={() => setZonaModal({ isOpen: false, data: null, isLoading: false })}
        onSave={handleSaveZona}
      />
    </div>
  );
}
