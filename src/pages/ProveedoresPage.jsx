import React, { useState, useEffect, useContext, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppContext } from "../AppContext";
import AppNotification from '../components/AppNotification';
import API from "../services/api";
import "./ProveedoresPage.css";
import { FaEdit, FaPlus, FaSort, FaSortUp, FaSortDown, FaFileExport } from "react-icons/fa";
import * as XLSX from 'xlsx';

const ProveedorModal = ({ isOpen, onClose, onSave, proveedor, isLoading }) => {
  const [nombre_empresa, setNombreEmpresa] = useState('');
  const [nombre_encargado, setNombreEncargado] = useState('');
  const [contacto, setContacto] = useState('');

  useEffect(() => {
    if (proveedor) {
      setNombreEmpresa(proveedor.nombre_empresa || '');
      setNombreEncargado(proveedor.nombre_encargado || '');
      setContacto(proveedor.contacto || '');
    } else {
      setNombreEmpresa('');
      setNombreEncargado('');
      setContacto('');
    }
  }, [proveedor, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ id: proveedor?.id, nombre_empresa, nombre_encargado, contacto });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Empresa:</label>
            <input type="text" value={nombre_empresa} onChange={(e) => setNombreEmpresa(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Encargado:</label>
            <input type="text" value={nombre_encargado} onChange={(e) => setNombreEncargado(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Contacto:</label>
            <input type="text" value={contacto} onChange={(e) => setContacto(e.target.value)} required />
          </div>
          <button type="submit" className="modal-submit" disabled={isLoading}>
            {isLoading ? 'Guardando...' : (proveedor ? 'Guardar Cambios' : 'Crear Proveedor')}
          </button>
        </form>
      </div>
    </div>
  );
};

function ProveedoresPage() {
  const { proveedores, isLoadingProveedores, fetchProveedores, usuario } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'nombre_empresa', direction: 'ascending' });
  const [notification, setNotification] = useState({ message: '', type: '' });
  const token = localStorage.getItem("accessToken");
  const queryClient = useQueryClient();

  const sortedProveedores = useMemo(() => {
    let sortableItems = [...(proveedores || [])];
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
  }, [proveedores, sortConfig]);

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
    mutationFn: (proveedorData) => proveedorData.id
      ? API.put(`proveedores/${proveedorData.id}/`, proveedorData, { headers: { Authorization: `Bearer ${token}` } })
      : API.post('proveedores/', proveedorData, { headers: { Authorization: `Bearer ${token}` } }),
    onSuccess: async (_, variables) => {
      fetchProveedores(); // Llama a la función para recargar los proveedores
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      handleCloseModal();
      setNotification({ message: `Proveedor ${variables.id ? 'actualizado' : 'creado'} exitosamente.`, type: 'success' });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.detail || error.message || 'Error al guardar el proveedor.';
      setNotification({ message: errorMsg, type: 'error' });
    }
  });

  const handleOpenModal = (proveedor = null) => {
    setEditingProveedor(proveedor);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => setIsModalOpen(false);
  const handleSave = (data) => mutation.mutate(data);

  const exportProveedores = () => {
    const dataToExport = sortedProveedores.map(proveedor => ({
      'Empresa': proveedor.nombre_empresa,
      'Encargado': proveedor.nombre_encargado,
      'Contacto': proveedor.contacto,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Proveedores');
    XLSX.writeFile(wb, 'Proveedores.xlsx');
  };

  return (
    <div className="page-container">
      <AppNotification 
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />
      <div className="page-header">
        {usuario?.role === 'administrador' && (
          <button className="btn-secondary" onClick={exportProveedores}>
            <FaFileExport /> Exportar
          </button>
        )}
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <FaPlus /> Nuevo Proveedor
        </button>
      </div>

      <div className="proveedores-container">
        {/* Desktop View: Table */}
        <div className="desktop-view">
          <table className="proveedores-table">
            <thead>
              <tr>
                <th className="th-empresa sortable" onClick={() => requestSort('nombre_empresa')}>
                  <span>Empresa</span> {getSortIcon('nombre_empresa')}
                </th>
                <th className="th-encargado sortable" onClick={() => requestSort('nombre_encargado')}>
                  <span>Encargado</span> {getSortIcon('nombre_encargado')}
                </th>
                <th className="th-contacto sortable" onClick={() => requestSort('contacto')}>
                  <span>Contacto</span> {getSortIcon('contacto')}
                </th>
                <th className="th-editar">Editar</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingProveedores ? (
                <tr><td colSpan="4"><div className="loading-container"><div className="loader"></div></div></td></tr>
              ) : sortedProveedores.length > 0 ? (
                sortedProveedores.map((proveedor) => (
                  <tr key={proveedor.id}>
                    <td className="td-empresa" data-label="Empresa">{proveedor.nombre_empresa}</td>
                    <td className="td-encargado" data-label="Encargado">{proveedor.nombre_encargado}</td>
                    <td className="td-contacto" data-label="Contacto">{proveedor.contacto}</td>
                    <td className="td-editar" data-label="Editar">
                      <button className="btn-icon" onClick={() => handleOpenModal(proveedor)}>
                        <FaEdit />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="4" className="empty-cell">No se encontraron proveedores.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="mobile-view">
          {isLoadingProveedores ? (
            <div className="loading-container"><div className="loader"></div></div>
          ) : sortedProveedores.length > 0 ? (
            sortedProveedores.map((proveedor) => (
              <div key={proveedor.id} className="card">
                <div className="card-body">
                  <h4 className="card-title">{proveedor.nombre_empresa}</h4>
                  <div className="card-details">
                    <p><strong>Encargado:</strong> {proveedor.nombre_encargado}</p>
                    <p><strong>Contacto:</strong> {proveedor.contacto}</p>
                  </div>
                </div>
                <div className="card-footer">
                  <button className="btn-icon" onClick={() => handleOpenModal(proveedor)}>
                    <FaEdit />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-cell">No se encontraron proveedores.</div>
          )}
        </div>
      </div>
      <ProveedorModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        proveedor={editingProveedor}
        isLoading={mutation.isLoading}
      />
    </div>
  );
}

export default ProveedoresPage;
