import React, { useContext, useState, useEffect } from 'react';
import './Clientes.css';
import { AppContext } from '../AppContext';

import * as XLSX from 'xlsx';
import { FaChevronDown, FaEdit, FaPlus, FaFileExport } from 'react-icons/fa';
import API from '../services/api';

const EditClienteModal = ({ cliente, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    id: cliente.id,
    nombre: cliente.nombre,
    cedula: cliente.cedula,
    correo: cliente.correo,
    direccion: cliente.direccion,
    ciudad: cliente.ciudad,
    telefono1: cliente.telefono1,
    telefono2: cliente.telefono2,
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
  const { clientes: contextClientes, isLoadingClientes, usuario } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClienteId, setExpandedClienteId] = useState(null);
  const [clienteDetails, setClienteDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filteredClientes, setFilteredClientes] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const pageSize = 30;

  useEffect(() => {
    if (!Array.isArray(contextClientes)) {
      setFilteredClientes([]);
      setTotalPages(1);
      return;
    }

    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = contextClientes.filter(cliente =>
      cliente.id.toString().toLowerCase().includes(lowercasedFilter) ||
      cliente.nombre.toLowerCase().includes(lowercasedFilter) ||
      cliente.cedula.toLowerCase().includes(lowercasedFilter)
    );

    setFilteredClientes(filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize));
    setTotalPages(Math.ceil(filtered.length / pageSize) || 1);
  }, [contextClientes, searchTerm, currentPage]);

  const handleExpandCliente = async (clienteId) => {
    if (expandedClienteId === clienteId) {
      setExpandedClienteId(null);
      return;
    }

    setExpandedClienteId(clienteId);
    setLoadingDetails(true);

    const token = localStorage.getItem("accessToken");
    try {
      const response = await API.get(`/clientes/${clienteId}/ventas-observaciones/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setClienteDetails(response.data);
      setSelectedCliente(contextClientes.find(cliente => cliente.id === clienteId));
    } catch (error) {
      setErrorMessage('Error al cargar los detalles del cliente.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const exportClientes = () => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = contextClientes.filter(cliente =>
      cliente.id.toString().toLowerCase().includes(lowercasedFilter) ||
      cliente.nombre.toLowerCase().includes(lowercasedFilter) ||
      cliente.cedula.toLowerCase().includes(lowercasedFilter)
    );

    const dataToExport = filtered.map(cliente => ({
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
  };

  const handleEditCliente = async (updatedCliente) => {
    const token = localStorage.getItem("accessToken");
    try {
      const response = await API.put(`/clientes/${updatedCliente.id}/`, updatedCliente, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Esta es una forma de actualizar el estado global. Necesitarías una función en tu context.
      // updateClientes(prev => prev.map(c => c.id === updatedCliente.id ? response.data : c));
      setShowEditModal(false);
    } catch (error) {
       setErrorMessage('Error al editar el cliente.');
    }
  };

  const handleAddObservation = async (observationText) => {
    const token = localStorage.getItem("accessToken");
    try {
      const response = await API.post(
        `clientes/${expandedClienteId}/observaciones/anadir/`,
        { texto: observationText },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setClienteDetails(prevDetails => ({
        ...prevDetails,
        observaciones_cliente: [...prevDetails.observaciones_cliente, response.data]
      }));
      setShowObservationModal(false);
    } catch (error) {
      setErrorMessage('Error al agregar la observación.');
    }
  };

  return (
    <div className="page-container clientes-page-container">
      <div className="page-header">
        <input
          type="text"
          className="search-input"
          placeholder="Buscar por ID, nombre o cédula..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
        {usuario?.role === 'administrador' && (
          <button className="btn-secondary" onClick={exportClientes}>
            <FaFileExport /> Exportar
          </button>
        )}
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="th-id">ID</th>
              <th className="th-nombre">Nombre</th>
              <th className="th-cedula">Cédula</th>
              <th className="th-correo">Correo</th>
              <th className="th-direccion">Dirección</th>
              <th className="th-ciudad">Ciudad</th>
              <th className="th-telefono">Teléfono 1</th>
              <th className="th-telefono">Teléfono 2</th>
              <th className="th-accion"></th>
            </tr>
          </thead>
          <tbody>
            {isLoadingClientes ? (
              <tr><td colSpan="9"><div className="loading-container"><div className="loader"></div></div></td></tr>
            ) : filteredClientes.length > 0 ? (
              filteredClientes.map((cliente) => (
                <React.Fragment key={cliente.id}>
                  <tr>
                    <td className="td-id">{cliente.id}</td>
                    <td className="td-nombre">{cliente.nombre}</td>
                    <td className="td-cedula">{cliente.cedula}</td>
                    <td className="td-correo">{cliente.correo}</td>
                    <td className="td-direccion">{cliente.direccion}</td>
                    <td className="td-ciudad">{cliente.ciudad}</td>
                    <td className="td-telefono">{cliente.telefono1}</td>
                    <td className="td-telefono">{cliente.telefono2}</td>
                    <td className="td-accion td-action-button">
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
                        ) : clienteDetails ? (
                          <div className="details-view flex flex-col">
                            {selectedCliente && (
                                <div className="flex flex-row gap-4 w-full">
                                    <div className="client-summary-details details-section flex-1"> {/* Detalles del Cliente */}
                                        <h4>Detalles del Cliente</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-gray-700 text-sm">
                                            <p><strong>Nombre:</strong> {selectedCliente.nombre}</p>
                                            <p><strong>Correo:</strong> {selectedCliente.correo}</p>
                                            <p><strong>Dirección:</strong> {selectedCliente.direccion}</p>
                                            <p><strong>Teléfono 1:</strong> {selectedCliente.telefono1}</p>
                                            <p><strong>Teléfono 2:</strong> {selectedCliente.telefono2 || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="details-section flex-1"> {/* Compras Recientes */}
                                        <h4 class="text-lg font-semibold text-gray-800 mb-3">Compras Recientes</h4>
                                        <ul>
                                            {clienteDetails.ventas.length > 0 ? clienteDetails.ventas.map((venta) => (
                                                <li key={venta.id}>
                                                    Venta #{venta.id} - {venta.estado}
                                                </li>
                                            )) : <li>No hay compras registradas.</li>}
                                        </ul>
                                    </div>
                                    <div className="details-section flex-1"> {/* Observaciones */}
                                        <h4 className="text-lg font-semibold text-gray-800 mb-3">Observaciones</h4>
                                        <ul>
                                            {clienteDetails.observaciones_cliente.length > 0 ? clienteDetails.observaciones_cliente.map((obs) => (
                                                <li key={obs.id}>{obs.texto}</li>
                                            )) : <li>No hay observaciones.</li>}
                                        </ul>
                                    </div>
                                </div>
                            )}
                            <div className="flex flex-row justify-end space-x-2 flex-[0_0_20%]"> {/* Adjusted flex property */}
                                <button className="btn-secondary" onClick={() => setShowEditModal(true)}><FaEdit/> Editar Cliente</button>
                                <button className="btn-primary" onClick={() => setShowObservationModal(true)}><FaPlus/> Agregar Observación</button>
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

      {showEditModal && selectedCliente && (
        <EditClienteModal cliente={selectedCliente} onSave={handleEditCliente} onClose={() => setShowEditModal(false)} />
      )}

      {showObservationModal && (
        <AddObservationModal onSave={handleAddObservation} onClose={() => setShowObservationModal(false)} />
      )}

      <div className="pagination-container">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Anterior</button>
        <span>Página {currentPage} de {totalPages}</span>
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Siguiente</button>
      </div>
    </div>
  );
};

export default Clientes;
