import React, { useContext, useState, useEffect, useCallback } from 'react';
import './Clientes.css';
import { AppContext, usePermissions } from '../AppContext';
import * as XLSX from 'xlsx';
import { FaChevronDown, FaEdit, FaPlus, FaFileExport, FaSearch } from 'react-icons/fa';
import API from '../services/api';
import AppNotification from '../components/AppNotification';

const EditClienteModal = ({ cliente, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    id: cliente.id,
    nombre: cliente.nombre || '',
    cedula: cliente.cedula || '',
    correo: cliente.correo || '',
    direccion: cliente.direccion || '',
    ciudad: cliente.ciudad || '',
    telefono1: cliente.telefono1 || '',
    telefono2: cliente.telefono2 || '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="cli-modal-overlay">
      <div className="cli-modal-content">
        <div className="cli-modal-header">
          <h3>Editar cliente #{cliente.id}</h3>
          <button className="cli-modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre:</label>
            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Cédula:</label>
            <input type="text" name="cedula" value={formData.cedula} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Correo:</label>
            <input type="email" name="correo" value={formData.correo} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Dirección:</label>
            <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Ciudad:</label>
            <input type="text" name="ciudad" value={formData.ciudad} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Teléfono 1:</label>
            <input type="text" name="telefono1" value={formData.telefono1} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Teléfono 2:</label>
            <input type="text" name="telefono2" value={formData.telefono2} onChange={handleChange} />
          </div>
          <button type="submit" className="cli-btn-primary">Guardar Cambios</button>
        </form>
      </div>
    </div>
  );
};

const AddObservationModal = ({ onSave, onClose, showToast }) => {
  const [observationText, setObservationText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!observationText.trim()) {
      showToast('La observación no puede estar vacía.', 'error');
      return;
    }
    onSave(observationText);
  };

  return (
    <div className="cli-modal-overlay">
      <div className="cli-modal-content">
        <div className="cli-modal-header">
          <h3>Agregar Observación</h3>
          <button className="cli-modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nueva Observación:</label>
            <textarea
              value={observationText}
              onChange={(e) => setObservationText(e.target.value)}
              placeholder="Escribe una observación..."
              required
              rows="4"
            />
          </div>
          <button type="submit" className="cli-btn-primary">Guardar</button>
        </form>
      </div>
    </div>
  );
};

const Clientes = () => {
  const { notify } = useContext(AppContext);
  const hasPermission = usePermissions();
  const [clientesData, setClientesData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClienteId, setExpandedClienteId] = useState(null);
  const [expandedData, setExpandedData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  const pageSize = 30;

  const fetchClientes = useCallback(async (page, search) => {
    setIsLoading(true);
    try {
      const params = {
        page: page,
        page_size: pageSize,
        query: search
      };
      const response = await API.get('/clientes/', { params });
      setClientesData(response.data.results || []);
      setTotalPages(Math.ceil(response.data.count / pageSize) || 1);
    } catch (error) {
      console.error("Error fetching clientes:", error);
      setNotification({ message: 'Error al cargar clientes.', type: 'error' });
      setClientesData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchClientes(1, searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchClientes]);

  useEffect(() => {
    fetchClientes(currentPage, searchTerm);
  }, [currentPage, fetchClientes]);

  const handleExpandCliente = async (clienteId) => {
    if (expandedClienteId === clienteId) {
      setExpandedClienteId(null);
      return;
    }

    setExpandedClienteId(clienteId);
    setLoadingDetails(true);
    setExpandedData(null);

    try {
      const [clienteRes, detailsRes] = await Promise.all([
        API.get(`/clientes/${clienteId}/`),
        API.get(`/clientes/${clienteId}/ventas-observaciones/`)
      ]);

      const mergedData = {
        ...clienteRes.data,
        ventas: detailsRes.data.ventas,
        observaciones_cliente: detailsRes.data.observaciones_cliente
      };

      setExpandedData(mergedData);

    } catch (error) {
      setNotification({ message: 'Error al cargar los detalles del cliente.', type: 'error' });
    } finally {
      setLoadingDetails(false);
    }
  };

  const exportClientes = async () => {
    try {
      const response = await API.get('/clientes/', {
        params: {
          search: searchTerm,
          page_size: 9999
        }
      });

      const dataToExport = (response.data.results || []).map(cliente => ({
        'ID': cliente.id,
        'Nombre': cliente.nombre,
        'Cédula': cliente.cedula,
        'Correo': cliente.correo,
        'Dirección': cliente.direccion,
        'Ciudad': cliente.ciudad,
        'Teléfono 1': cliente.telefono1,
        'Teléfono 2': cliente.telefono2,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
      XLSX.writeFile(wb, 'Clientes.xlsx');
      setNotification({ message: 'Exportación exitosa.', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Error al exportar clientes.', type: 'error' });
    }
  };

  const handleEditCliente = async (updatedCliente) => {
    try {
      const response = await API.put(`/clientes/${updatedCliente.id}/`, updatedCliente);
      setExpandedData(prevData => ({ ...prevData, ...response.data }));
      setClientesData(prev => prev.map(c => c.id === updatedCliente.id ? { ...c, ...response.data } : c));
      setNotification({ message: 'Cliente actualizado correctamente.', type: 'success' });
      setShowEditModal(false);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || 'Error al editar el cliente.';
      setNotification({ message: errorMsg, type: 'error' });
    }
  };

  const handleAddObservation = async (observationText) => {
    try {
      const response = await API.post(
        `/clientes/${expandedClienteId}/observaciones/anadir/`,
        { texto: observationText }
      );
      setExpandedData(prevData => ({
        ...prevData,
        observaciones_cliente: [...prevData.observaciones_cliente, response.data]
      }));
      setShowObservationModal(false);
      setNotification({ message: 'Observación agregada.', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Error al agregar la observación.', type: 'error' });
    }
  };

  return (
    <div className="page-container clientes-page-container">
      <AppNotification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />
      <div className="o-glass-header" style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', overflowX: 'auto' }}>
        <div className="o-filters-bar" style={{ margin: 0, flex: 1 }}>
          <div className="o-select-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaSearch style={{ color: '#94a3b8', fontSize: '0.8rem' }} />
            <input
              type="text"
              placeholder="Buscar por ID, nombre o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', color: '#334155', outline: 'none', minWidth: '180px' }}
            />
          </div>
        </div>
        <div className="header-actions" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {hasPermission('EXPORTAR_CLIENTES') && (
            <button className="o-btn-ghost" onClick={exportClientes} title="Exportar">
              <FaFileExport />
            </button>
          )}
        </div>
      </div>

      <div className="clientes-container">
        <div className="desktop-view">
          <table className="clientes-table">
            <thead>
              <tr>
                <th className="th-id">ID</th>
                <th className="th-nombre">Nombre</th>
                <th className="th-cedula">Cédula</th>
                <th className="th-correo">Correo</th>
                <th className="th-direccion">Dirección</th>
                <th className="th-ciudad">Ciudad</th>
                <th className="th-telefono">Teléfono 1</th>
                <th className="th-telefono th-telefono-2">Teléfono 2</th>
                <th className="th-accion"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="skeleton-row">
                    <td><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '180px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '90px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '90px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                  </tr>
                ))
              ) : clientesData.length > 0 ? (
                clientesData.map((cliente) => (
                  <React.Fragment key={cliente.id}>
                    <tr className={`table-row-clickable ${expandedClienteId === cliente.id ? 'expanded-row-highlight' : ''}`}
                        onClick={() => handleExpandCliente(cliente.id)}
                        style={{ cursor: 'pointer' }}
                    >
                      <td className="td-id">{cliente.id}</td>
                      <td className="td-nombre">{cliente.nombre}</td>
                      <td className="td-cedula">{cliente.cedula}</td>
                      <td className="td-correo">{cliente.correo}</td>
                      <td className="td-direccion">{cliente.direccion}</td>
                      <td className="td-ciudad">{cliente.ciudad}</td>
                      <td className="td-telefono">{cliente.telefono1}</td>
                      <td className="td-telefono td-telefono-2">{cliente.telefono2}</td>
                      <td className="td-accion">
                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleExpandCliente(cliente.id); }}>
                          <FaChevronDown style={{ transform: expandedClienteId === cliente.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>
                      </td>
                    </tr>
                    {expandedClienteId === cliente.id && (
                      <tr className="expanded-row">
                        <td colSpan="9">
                          {loadingDetails ? (
                            <div className="loading-container"><div className="loader"></div></div>
                          ) : expandedData ? (
                            <div className="cli-expanded-panel">
                              <div className="cli-expanded-grid">
                                <div className="cli-info-card">
                                  <div className="cli-info-card-header">
                                    <div className="cli-avatar">{expandedData.nombre?.charAt(0)?.toUpperCase()}</div>
                                    <div>
                                      <h3 className="cli-name">{expandedData.nombre}</h3>
                                      <span className="cli-id-badge">ID #{expandedData.id}</span>
                                    </div>
                                  </div>
                                  <div className="cli-info-rows">
                                    <div className="cli-info-row"><span className="cli-info-label">Cédula</span><span className="cli-info-value">{expandedData.cedula}</span></div>
                                    <div className="cli-info-row"><span className="cli-info-label">Correo</span><span className="cli-info-value">{expandedData.correo || '—'}</span></div>
                                    <div className="cli-info-row"><span className="cli-info-label">Dirección</span><span className="cli-info-value">{expandedData.direccion || '—'}</span></div>
                                    <div className="cli-info-row"><span className="cli-info-label">Ciudad</span><span className="cli-info-value">{expandedData.ciudad || '—'}</span></div>
                                    <div className="cli-info-row"><span className="cli-info-label">Tel. 1</span><span className="cli-info-value">{expandedData.telefono1 || '—'}</span></div>
                                    <div className="cli-info-row"><span className="cli-info-label">Tel. 2</span><span className="cli-info-value">{expandedData.telefono2 || '—'}</span></div>
                                  </div>
                                  <div className="cli-expanded-actions">
                                    {hasPermission('EDITAR_CLIENTE') && (
                                      <button className="o-btn-ghost" onClick={() => setShowEditModal(true)}><FaEdit /> Editar</button>
                                    )}
                                    <button className="o-btn-primary-glow" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }} onClick={() => setShowObservationModal(true)}><FaPlus /> Observación</button>
                                  </div>
                                </div>
                                <div className="cli-right-col">
                                  <div className="cli-section">
                                    <h4 className="cli-section-title">Compras Recientes</h4>
                                    <div className="cli-ventas-list">
                                      {expandedData.ventas && expandedData.ventas.length > 0 ? expandedData.ventas.map((venta) => (
                                        <div key={venta.id} className="cli-venta-row">
                                          <span className="cli-venta-id">Venta #{venta.id}</span>
                                          <span className={`status-badge ${venta.estado?.toLowerCase() === 'entregada' ? 'status-finalizada' : venta.estado?.toLowerCase() === 'cancelada' ? 'status-anulada' : 'status-creada'}`}>{venta.estado}</span>
                                        </div>
                                      )) : <p className="cli-empty">Sin compras registradas.</p>}
                                    </div>
                                  </div>
                                  <div className="cli-section">
                                    <h4 className="cli-section-title">Observaciones</h4>
                                    <div className="cli-obs-list">
                                      {expandedData.observaciones_cliente && expandedData.observaciones_cliente.length > 0 ? expandedData.observaciones_cliente.map((obs) => (
                                        <div key={obs.id} className="cli-obs-item">{obs.texto}</div>
                                      )) : <p className="cli-empty">Sin observaciones.</p>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr><td colSpan="9" className="empty-cell">No se encontraron clientes.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mobile-view">
          {isLoading ? (
            <div className="loading-container"><div className="loader"></div></div>
          ) : clientesData.length > 0 ? (
            clientesData.map((cliente) => (
              <div key={cliente.id} className={`card-clientes card ${expandedClienteId === cliente.id ? 'expanded' : ''}`}>
                <div className="card-header" onClick={() => handleExpandCliente(cliente.id)}>
                  <div className="card-header-info">
                    <h4 className="card-title">{cliente.nombre}</h4>
                    <p className="card-subtitle">C.C. {cliente.cedula}</p>
                  </div>
                  <button className="btn-icon">
                    <FaChevronDown className="chevron-icon" />
                  </button>
                </div>
                {expandedClienteId === cliente.id && (
                  <div className="card-details-wrapper">
                    {loadingDetails ? (
                      <div className="loading-container"><div className="loader"></div></div>
                    ) : expandedData ? (
                      <div className="card-expanded-content">
                        <div className="detail-item">
                          <strong>Correo:</strong>
                          <span>{expandedData.correo || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Dirección:</strong>
                          <span>{expandedData.direccion}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Ciudad:</strong>
                          <span>{expandedData.ciudad}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Teléfono 1:</strong>
                          <span>{expandedData.telefono1}</span>
                        </div>
                        <div className="detail-item">
                          <strong>Teléfono 2:</strong>
                          <span>{expandedData.telefono2 || 'N/A'}</span>
                        </div>
                        <div className="details-section">
                          <h4>Compras Recientes</h4>
                          <ul>
                            {expandedData.ventas && expandedData.ventas.length > 0 ? expandedData.ventas.map((venta) => (
                              <li key={venta.id}>Venta #{venta.id} - {venta.estado}</li>
                            )) : <li>No hay compras registradas.</li>}
                          </ul>
                        </div>
                        <div className="details-section">
                          <h4>Observaciones</h4>
                          <ul>
                            {expandedData.observaciones_cliente && expandedData.observaciones_cliente.length > 0 ? expandedData.observaciones_cliente.map((obs) => (
                              <li key={obs.id}>{obs.texto}</li>
                            )) : <li>No hay observaciones.</li>}
                          </ul>
                        </div>
                        <div className="card-actions">
                          {hasPermission('EDITAR_CLIENTE') && (
                            <button className="btn-secondary" onClick={() => setShowEditModal(true)}><FaEdit /> Editar Cliente</button>
                          )}
                          <button className="btn-primary" onClick={() => setShowObservationModal(true)}><FaPlus /> Agregar Observación</button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="empty-cell">No se encontraron clientes.</div>
          )}
        </div>
      </div>

      {showEditModal && expandedData && (
        <EditClienteModal cliente={expandedData} onSave={handleEditCliente} onClose={() => setShowEditModal(false)} />
      )}

      {showObservationModal && (
        <AddObservationModal onSave={handleAddObservation} onClose={() => setShowObservationModal(false)} showToast={showNotification} />
      )}

      <div className="pagination-container">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>Anterior</button>
        <span>Página {currentPage} de {totalPages}</span>
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)}>Siguiente</button>
      </div>
    </div>
  );
};

export default Clientes;