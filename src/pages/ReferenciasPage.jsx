import React, { useState, useContext, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../services/api";
import "./ReferenciasPage.css";
import { FaEdit, FaPlus, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { AppContext } from "../AppContext";
import AppNotification from '../components/AppNotification';


// Componente del Modal para crear y editar Referencias
const ReferenciaModal = ({ isOpen, onClose, onSave, proveedores, referencia, isLoading }) => {
  const [nombre, setNombre] = useState('');
  const [proveedorId, setProveedorId] = useState('');

  useEffect(() => {
    if (referencia) {
      setNombre(referencia.nombre || '');
      setProveedorId(referencia.proveedor || '');
    } else {
      setNombre('');
      setProveedorId('');
    }
  }, [referencia, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: referencia?.id,
      nombre,
      proveedor: proveedorId,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{referencia ? 'Editar Referencia' : 'Nueva Referencia'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre de la Referencia</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Proveedor</label>
            <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} required>
              <option value="">Selecciona un proveedor</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre_empresa}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="modal-submit" disabled={isLoading}>
            {isLoading ? 'Guardando...' : (referencia ? 'Guardar Cambios' : 'Crear Referencia')}
          </button>
        </form>
      </div>
    </div>
  );
};


function ReferenciasPage() {
  const { proveedores, isLoading: contextLoading, isLoadingProveedores, fetchProveedores } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReferencia, setEditingReferencia] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'proveedor_name', direction: 'ascending' });
  const [notification, setNotification] = useState({ message: '', type: '' });
  const token = localStorage.getItem("accessToken");
  const queryClient = useQueryClient();

  const { data: referencias = [], isLoading, isError } = useQuery({
    queryKey: ["referencias"],
    queryFn: async () => {
      const response = await API.get("/referencias/");
      return (Array.isArray(response.data) ? response.data : []).map((ref) => {
        const proveedor = proveedores.find((prov) => prov.id === ref.proveedor);
        return { ...ref, proveedor_name: proveedor ? proveedor.nombre_empresa : "Desconocido" };
      });
    },
    enabled: !!token && !contextLoading && !isLoadingProveedores,
    onError: (error) => {
      const errorMsg = error.response?.data?.detail || error.message || 'Error al cargar las referencias.';
      setNotification({ message: errorMsg, type: 'error' });
    },
  });

  const sortedReferencias = useMemo(() => {
    let sortableItems = [...referencias];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key]?.toLowerCase() || '';
        const valB = b[sortConfig.key]?.toLowerCase() || '';
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return 1 * (sortConfig.direction === 'ascending' ? 1 : -1);
        return 0;
      });
    }
    return sortableItems;
  }, [referencias, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name) => {
    if (!sortConfig || sortConfig.key !== name) return <FaSort className="sort-icon" />;
    return sortConfig.direction === 'ascending' ? <FaSortUp className="sort-icon active" /> : <FaSortDown className="sort-icon active" />;
  };

  const mutation = useMutation({
    mutationFn: (referenciaData) => {
      const { id, ...data } = referenciaData;
      return id ? API.put(`referencias/${id}/`, data, { headers: { Authorization: `Bearer ${token}` } }) : API.post("referencias/", data, { headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["referencias"] });
      await fetchProveedores(); // Forzar la recarga de proveedores
      handleCloseModal();
      setNotification({ message: `Referencia ${variables.id ? 'actualizada' : 'creada'} exitosamente.`, type: 'success' });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.detail || error.message || 'Error al guardar la referencia.';
      setNotification({ message: errorMsg, type: 'error' });
    },
  });

  const handleOpenModal = (referencia = null) => {
    setEditingReferencia(referencia);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => setIsModalOpen(false);
  const handleSave = (data) => mutation.mutate(data);
  
  return (
    <div className="page-container">
      <AppNotification 
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />
      <div className="page-header">
        {/* Título eliminado de aquí para ser manejado por el Header global */}
        <div/> {/* Div vacío para alinear el botón a la derecha */}
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <FaPlus /> Nueva Referencia
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th className="th-ref-nombre sortable" onClick={() => requestSort('nombre')}>
                <span>Referencia</span> {getSortIcon('nombre')}
              </th>
              <th className="th-ref-proveedor sortable" onClick={() => requestSort('proveedor_name')}>
                <span>Proveedor</span> {getSortIcon('proveedor_name')}
              </th>
              <th className="th-ref-editar">Editar</th>
            </tr>
          </thead>
          <tbody>
            {isLoading || contextLoading || isLoadingProveedores ? (
              <tr><td colSpan="3"><div className="loading-container"><div className="loader"></div></div></td></tr>
            ) : isError ? (
              <tr><td colSpan="3" className="error-cell">Error al cargar datos.</td></tr>
            ) : sortedReferencias.length > 0 ? (
              sortedReferencias.map((ref) => (
                <tr key={ref.id}>
                  <td className="td-ref-nombre">{ref.nombre}</td>
                  <td className="td-ref-proveedor">{ref.proveedor_name}</td>
                  <td className="td-ref-editar">
                    <button type="button" onClick={() => handleOpenModal(ref)} className="btn-icon" disabled={mutation.isLoading}><FaEdit /></button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="3" className="empty-cell">No hay referencias disponibles.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <ReferenciaModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        proveedores={proveedores}
        referencia={editingReferencia}
        isLoading={mutation.isLoading}
      />
    </div>
  );
}

export default ReferenciasPage;
