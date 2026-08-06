import React, { useState, useEffect, useContext, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppContext } from "../AppContext";
import AppNotification from '../components/AppNotification';
import API from "../services/api";
import "./ProveedoresPage.css";
import { FaEdit, FaPlus, FaSort, FaSortUp, FaSortDown, FaFileExport, FaSearch, FaTruck } from "react-icons/fa";
import { Button, PageHeader, Modal, LoadingBlock, Skeleton } from '../components/ui';

const ProveedorModal = ({ isOpen, onClose, onSave, proveedor, isLoading }) => {
  const [nombre_empresa, setNombreEmpresa] = useState('');
  const [nombre_encargado, setNombreEncargado] = useState('');
  const [contacto, setContacto] = useState('');
  const [dias_pago, setDiasPago] = useState(0);
  const [porcentaje_descuento, setPorcentajeDescuento] = useState(0);

  useEffect(() => {
    if (proveedor) {
      setNombreEmpresa(proveedor.nombre_empresa || '');
      setNombreEncargado(proveedor.nombre_encargado || '');
      setContacto(proveedor.contacto || '');
      setDiasPago(proveedor.dias_pago || 0);
      setPorcentajeDescuento(proveedor.porcentaje_descuento || 0);
    } else {
      setNombreEmpresa('');
      setNombreEncargado('');
      setContacto('');
      setDiasPago(0);
      setPorcentajeDescuento(0);
    }
  }, [proveedor, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ id: proveedor?.id, nombre_empresa, nombre_encargado, contacto, dias_pago, porcentaje_descuento });
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="prov-form" loading={isLoading}>
            {proveedor ? 'Guardar Cambios' : 'Crear Proveedor'}
          </Button>
        </>
      }
    >
      <form id="prov-form" onSubmit={handleSubmit}>
        <div className="ds-field">
          <label className="ds-label">Empresa:</label>
          <input className="ds-input" type="text" value={nombre_empresa} onChange={(e) => setNombreEmpresa(e.target.value)} required />
        </div>
        <div className="ds-field">
          <label className="ds-label">Encargado:</label>
          <input className="ds-input" type="text" value={nombre_encargado} onChange={(e) => setNombreEncargado(e.target.value)} required />
        </div>
        <div className="ds-field">
          <label className="ds-label">Contacto:</label>
          <input className="ds-input" type="text" value={contacto} onChange={(e) => setContacto(e.target.value)} required />
        </div>
        <div className="ds-field">
          <label className="ds-label">Días de Pago:</label>
          <input className="ds-input" type="number" min="0" value={dias_pago} onChange={(e) => setDiasPago(e.target.value)} required />
        </div>
        <div className="ds-field">
          <label className="ds-label">% de Descuento:</label>
          <input className="ds-input" type="number" min="0" step="0.01" value={porcentaje_descuento} onChange={(e) => setPorcentajeDescuento(e.target.value)} required />
        </div>
      </form>
    </Modal>
  );
};

function ProveedoresPage() {
  const { proveedores, isLoadingProveedores, fetchProveedores, usuario } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'nombre_empresa', direction: 'ascending' });
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const sortedProveedores = useMemo(() => {
    let sortableItems = [...(proveedores || [])];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      sortableItems = sortableItems.filter(p =>
        (p.nombre_empresa || '').toLowerCase().includes(q) ||
        (p.nombre_encargado || '').toLowerCase().includes(q) ||
        (p.contacto || '').toLowerCase().includes(q)
      );
    }
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
  }, [proveedores, sortConfig, searchTerm]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name) => {
    if (!sortConfig || sortConfig.key !== name) return <FaSort className="prov-sort-icon" />;
    return sortConfig.direction === 'ascending' ? <FaSortUp className="prov-sort-icon active" /> : <FaSortDown className="prov-sort-icon active" />;
  };

  const mutation = useMutation({
    mutationFn: (proveedorData) => proveedorData.id
      ? API.put(`/proveedores/${proveedorData.id}/`, proveedorData)
      : API.post('/proveedores/', proveedorData),
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

  const exportProveedores = async () => {
    const XLSX = await import('xlsx');
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
    <div className="ds-page proveedores-page ds-fade-in">
      <AppNotification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />

      <PageHeader
        icon={FaTruck}
        title="Proveedores"
        subtitle="Gestión de proveedores de productos y suministros"
        actions={
          <>
            <div className="v-search-pill" style={{ width: '280px', maxWidth: '100%' }}>
              <FaSearch />
              <input
                type="text"
                placeholder="Buscar proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            {usuario?.role === 'administrador' && (
              <Button variant="secondary" icon={FaFileExport} onClick={exportProveedores} title="Exportar">
                Exportar
              </Button>
            )}
            <Button icon={FaPlus} onClick={() => handleOpenModal()}>
              Nuevo Proveedor
            </Button>
          </>
        }
      />

      <div className="proveedores-container">
        {/* Desktop View: Table */}
        <div className="desktop-view">
          <div className="ds-table-scroll">
            <table className="ds-table proveedores-table">
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
                  <th className="th-dias sortable" onClick={() => requestSort('dias_pago')}>
                    <span>Días de Pago</span> {getSortIcon('dias_pago')}
                  </th>
                  <th className="th-descuento sortable" onClick={() => requestSort('porcentaje_descuento')}>
                    <span>% Dcto.</span> {getSortIcon('porcentaje_descuento')}
                  </th>
                  <th className="th-editar">Editar</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingProveedores ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      {['150px', '120px', '100px', '80px', '60px', '40px'].map((w, i) => (
                        <td key={i}><Skeleton width={w} /></td>
                      ))}
                    </tr>
                  ))
                ) : sortedProveedores.length > 0 ? (
                  sortedProveedores.map((proveedor) => (
                    <tr key={proveedor.id}>
                      <td className="td-empresa" data-label="Empresa">{proveedor.nombre_empresa}</td>
                      <td className="td-encargado" data-label="Encargado">{proveedor.nombre_encargado}</td>
                      <td className="td-contacto" data-label="Contacto">{proveedor.contacto}</td>
                      <td className="td-dias" data-label="Días de Pago">{proveedor.dias_pago}</td>
                      <td className="td-descuento" data-label="% Dcto.">{proveedor.porcentaje_descuento}%</td>
                      <td className="td-editar" data-label="Editar">
                        <Button variant="ghost" size="sm" icon={FaEdit} onClick={() => handleOpenModal(proveedor)} title="Editar proveedor" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" className="empty-cell">No se encontraron proveedores.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="mobile-view">
          {isLoadingProveedores ? (
            <LoadingBlock message="Cargando proveedores..." />
          ) : sortedProveedores.length > 0 ? (
            sortedProveedores.map((proveedor) => (
              <div key={proveedor.id} className="card">
                <div className="card-body">
                  <h4 className="card-title">{proveedor.nombre_empresa}</h4>
                  <div className="card-details">
                    <p><strong>Encargado:</strong> {proveedor.nombre_encargado}</p>
                    <p><strong>Contacto:</strong> {proveedor.contacto}</p>
                    <p><strong>Días de Pago:</strong> {proveedor.dias_pago}</p>
                    <p><strong>% Dcto:</strong> {proveedor.porcentaje_descuento}%</p>
                  </div>
                </div>
                <div className="card-footer">
                  <Button variant="ghost" size="sm" icon={FaEdit} onClick={() => handleOpenModal(proveedor)} title="Editar proveedor" />
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
        isLoading={mutation.isPending}
      />
    </div>
  );
}

export default ProveedoresPage;
