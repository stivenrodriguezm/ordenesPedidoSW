import React, { useState, useEffect } from "react";
import API from "../services/api";
import "./SedesZonasPage.css";
import { FaEdit, FaPlus, FaTrash, FaMapMarkerAlt, FaBuilding } from "react-icons/fa";
import AppNotification from '../components/AppNotification';

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
    <div className="sz-modal-overlay">
      <div className="sz-modal-content">
        <div className="sz-modal-header">
          <h3>{sede ? 'Editar Sede' : 'Nueva Sede'}</h3>
          <button className="sz-modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ id: sede?.id, nombre, descripcion }); }}>
          <div className="sz-modal-body">
            <div className="form-group">
              <label>Nombre de Sede:</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Ej: Lottus 1" />
            </div>
            <div className="form-group">
              <label>Descripción:</label>
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Opcional..." rows="3" />
            </div>
          </div>
          <div className="sz-modal-footer">
            <button type="button" className="sz-btn-cancel" onClick={onClose} disabled={isLoading}>Cancelar</button>
            <button type="submit" className="sz-btn-save" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
    <div className="sz-modal-overlay">
      <div className="sz-modal-content">
        <div className="sz-modal-header">
          <h3>{zona ? 'Editar Zona' : 'Nueva Zona'}</h3>
          <button className="sz-modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ id: zona?.id, sede: sedeId, nombre, descripcion }); }}>
          <div className="sz-modal-body">
            <div className="form-group">
              <label>Sede a la que pertenece:</label>
              <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} required>
                <option value="">Seleccione una sede...</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Nombre de Zona:</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Ej: Bodega Principal" />
            </div>
            <div className="form-group">
              <label>Descripción:</label>
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Opcional..." rows="3" />
            </div>
          </div>
          <div className="sz-modal-footer">
            <button type="button" className="sz-btn-cancel" onClick={onClose} disabled={isLoading}>Cancelar</button>
            <button type="submit" className="sz-btn-save" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
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

  return (
    <div className="sz-container">
      <AppNotification 
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      {/* Sedes Section */}
      <section className="sz-section">
        <div className="sz-section-header">
          <h2><FaBuilding style={{ color: '#3b82f6' }} /> Sedes</h2>
          <button className="o-btn-primary-glow" onClick={() => setSedeModal({ isOpen: true, data: null, isLoading: false })}>
            <FaPlus /> <span>Nueva Sede</span>
          </button>
        </div>
        <div className="sz-table-wrapper">
          <table className="sz-table">
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
                Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index} className="skeleton-row">
                    <td><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '200px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                  </tr>
                ))
              ) : sedes.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>No hay sedes registradas.</td></tr>
              ) : (
                sedes.map(sede => {
                  const numZonas = zonas.filter(z => z.sede === sede.id).length;
                  return (
                    <tr key={sede.id}>
                      <td style={{ fontWeight: 500, color: '#0f172a' }}>{sede.nombre}</td>
                      <td style={{ color: '#475569' }}>{sede.descripcion || '—'}</td>
                      <td><span className="sz-badge">{numZonas}</span></td>
                      <td>
                        <div className="sz-actions">
                          <button className="sz-btn-edit" title="Editar Sede" onClick={() => setSedeModal({ isOpen: true, data: sede, isLoading: false })}>
                            <FaEdit />
                          </button>
                          <button className="sz-btn-delete" title="Eliminar Sede" onClick={() => handleDeleteSede(sede.id)}>
                            <FaTrash />
                          </button>
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
      <section className="sz-section">
        <div className="sz-section-header">
          <h2><FaMapMarkerAlt style={{ color: '#ef4444' }} /> Zonas de Inventario</h2>
          <button 
            className="o-btn-primary-glow" 
            onClick={() => {
              if(sedes.length === 0) {
                setNotification({ message: 'Debes crear al menos una sede primero.', type: 'error' });
                return;
              }
              setZonaModal({ isOpen: true, data: null, isLoading: false });
            }}
          >
            <FaPlus /> <span>Nueva Zona</span>
          </button>
        </div>
        <div className="sz-table-wrapper">
          <table className="sz-table">
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
                Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index} className="skeleton-row">
                    <td><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '200px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                  </tr>
                ))
              ) : zonas.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>No hay zonas registradas.</td></tr>
              ) : (
                zonas.map(zona => (
                  <tr key={zona.id}>
                    <td><span className="sz-badge" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1' }}>{getSedeName(zona.sede)}</span></td>
                    <td style={{ fontWeight: 500, color: '#0f172a' }}>{zona.nombre}</td>
                    <td style={{ color: '#475569' }}>{zona.descripcion || '—'}</td>
                    <td>
                      <div className="sz-actions">
                        <button className="sz-btn-edit" title="Editar Zona" onClick={() => setZonaModal({ isOpen: true, data: zona, isLoading: false })}>
                          <FaEdit />
                        </button>
                        <button className="sz-btn-delete" title="Eliminar Zona" onClick={() => handleDeleteZona(zona.id)}>
                          <FaTrash />
                        </button>
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
