import React, { useContext, useState, useEffect, useCallback } from 'react';
import './Clientes.css';
import { AppContext } from '../AppContext';
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
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Editar cliente #{cliente.id}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
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
          <button type="submit" className="modal-submit">Guardar Cambios</button>
        </form>
      </div>
    </div>
  );
};

const AddObservationModal = ({ onSave, onClose }) => {
  const [observationText, setObservationText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!observationText.trim()) {
      alert('La observación no puede estar vacía.');
      return;
    }
    onSave(observationText);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Agregar Observación</h3>
          <button className="modal-close" onClick={onClose}>×</button>
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
          <button type="submit" className="modal-submit">Guardar</button>
        </form>
      </div>
    </div>
  );
};

const Clientes = () => {
  const { usuario } = useContext(AppContext);
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

  // Server-side fetching
  const fetchClientes = useCallback(async (page, search) => {
    setIsLoading(true);
    try {
      const params = {
        page: page,
        page_size: pageSize,
        search: search // Assuming backend supports ?search= param for generic search
      };
      // If backend doesn't support generic 'search', we might need to adjust this
      // But usually DRF SearchFilter uses 'search'

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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchClientes(1, searchTerm);
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [searchTerm, fetchClientes]);

  // Pagination change
  useEffect(() => {
    fetchClientes(currentPage, searchTerm);
  }, [currentPage, fetchClientes]); // searchTerm is handled by debounce effect, but if page changes we need to refetch with current search

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
      // Export all matching current search
      const response = await API.get('/clientes/', {
        params: {
          search: searchTerm,
          page_size: 9999 // Large page size for export
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

      // Update list data locally to reflect changes without refetching
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
      <div className="page-header">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por ID, nombre o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {usuario?.role === 'administrador' && (
          <button className="btn-secondary" onClick={exportClientes}>
            <FaFileExport /> Exportar
          </button>
        )}
      </div>

      <div className="clientes-container">
        {/* Desktop View */}
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
                <tr><td colSpan="9"><div className="loading-container"><div className="loader"></div></div></td></tr>
              ) : clientesData.length > 0 ? (
                clientesData.map((cliente) => (
                  <React.Fragment key={cliente.id}>
                    <tr>
                      <td className="td-id">{cliente.id}</td>
                      <td className="td-nombre">{cliente.nombre}</td>
                      <td className="td-cedula">{cliente.cedula}</td>
                      <td className="td-correo">{cliente.correo}</td>
                      <td className="td-direccion">{cliente.direccion}</td>
                      <td className="td-ciudad">{cliente.ciudad}</td>
                      <td className="td-telefono">{cliente.telefono1}</td>
                      <td className="td-telefono td-telefono-2">{cliente.telefono2}</td>
                      <td className="td-accion">
                        <button className="btn-icon" onClick={() => handleExpandCliente(cliente.id)}>
                          <FaChevronDown style={{ transform: expandedClienteId === cliente.id ? 'rotate(180deg)' : 'none' }} />
                        </button>
                      </td>
                    </tr>
                    {expandedClienteId === cliente.id && (
                      <tr className="expanded-row">
                        <td colSpan="9">
                          {loadingDetails ? (
                            <div className="loading-container"><div className="loader"></div></div>
                          ) : expandedData ? (
                            <div className="details-view">
                              <div className="details-view-section details-info">
                                <h4>Detalles del Cliente</h4>
                                <div className="info-grid">
                                  <div className="info-item"><strong>Nombre:</strong> <span>{expandedData.nombre}</span></div>
                                  <div className="info-item"><strong>Correo:</strong> <span>{expandedData.correo || 'N/A'}</span></div>
                                  <div className="info-item"><strong>Dirección:</strong> <span>{expandedData.direccion}</span></div>
                                  <div className="info-item"><strong>Teléfono 1:</strong> <span>{expandedData.telefono1}</span></div>
                                  <div className="info-item"><strong>Teléfono 2:</strong> <span>{expandedData.telefono2 || 'N/A'}</span></div>
                                </div>
                              </div>
                              <div className="details-view-section details-ventas">
                                <h4>Compras Recientes</h4>
                                <ul className="ventas-list">
                                  {expandedData.ventas && expandedData.ventas.length > 0 ? expandedData.ventas.map((venta) => (
                                    <li key={venta.id} className="venta-item">
                                      <span className="venta-id">#{venta.id}</span>
                                      <span className={`venta-estado estado-${venta.estado.toLowerCase()}`}>{venta.estado}</span>
                                    </li>
                                  )) : <li className="empty-list">No hay compras registradas.</li>}
                                </ul>
                              </div>
                              <div className="details-view-section details-observaciones">
                                <h4>Observaciones</h4>
                                <ul className="observaciones-list">
                                  {expandedData.observaciones_cliente && expandedData.observaciones_cliente.length > 0 ? expandedData.observaciones_cliente.map((obs) => (
                                    <li key={obs.id} className="observacion-item">
                                      <p>{obs.texto}</p>
                                    </li>
                                  )) : <li className="empty-list">No hay observaciones.</li>}
                                </ul>
                              </div>
                              <div className="details-view-actions">
                                <button className="btn-secondary" onClick={() => setShowEditModal(true)}><FaEdit /> Editar Cliente</button>
                                <button className="btn-primary" onClick={() => setShowObservationModal(true)}><FaPlus /> Agregar Observación</button>
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

        {/* Mobile View: Cards */}
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
                          <button className="btn-secondary" onClick={() => setShowEditModal(true)}><FaEdit /> Editar Cliente</button>
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
        <AddObservationModal onSave={handleAddObservation} onClose={() => setShowObservationModal(false)} />
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