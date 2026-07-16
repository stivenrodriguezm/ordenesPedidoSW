import React, { useState, useEffect, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../services/api';
import { 
  FaPlus, FaEdit, FaUserShield, FaUserPlus, FaUserCog, FaUsers, 
  FaChevronLeft, FaChevronRight, FaTimes, FaSpinner, FaCheckCircle, FaExclamationCircle
} from 'react-icons/fa';
import { AppContext } from '../AppContext';
import Loader from '../components/Loader';
import './UsuariosPage.css';

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
const ToastNotification = ({ notification }) => {
  if (!notification.message) return null;
  const isSuccess = notification.type === 'success';
  return (
    <div className={`toast-notification ${isSuccess ? 'toast-success' : 'toast-error'}`}>
      {isSuccess ? <FaCheckCircle size={20} /> : <FaExclamationCircle size={20} />}
      <span>{notification.message}</span>
    </div>
  );
};

// ==========================================
// SECCIÓN: MODAL DE EDICIÓN DE USUARIOS
// ==========================================
const UserModal = ({ isOpen, onClose, user, isEditing }) => {
  const queryClient = useQueryClient();
  const token = localStorage.getItem("accessToken");
  const [formData, setFormData] = useState({
    username: '', first_name: '', last_name: '', role: 'vendedor', is_active: true, password: ''
  });
  const [errorObj, setErrorObj] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (isEditing && user) {
        setFormData({ username: user.username || '', first_name: user.first_name || '', last_name: user.last_name || '', role: user.role || 'vendedor', is_active: user.is_active, password: '' });
      } else {
        setFormData({ username: '', first_name: '', last_name: '', role: 'vendedor', is_active: true, password: '' });
      }
      setErrorObj(null);
    }
  }, [isOpen, isEditing, user]);

  const mutation = useMutation({
    mutationFn: async (dataToSubmit) => {
      const url = isEditing ? `/usuarios/${user.id}/` : `/usuarios/`;
      const config = { headers: { Authorization: `Bearer ${token}` } };
      let payload = { ...dataToSubmit };
      if (isEditing && !payload.password) delete payload.password;
      return isEditing ? (await API.put(url, payload, config)).data : (await API.post(url, payload, config)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["usuarios-list"]);
      onClose(true);
    },
    onError: (err) => {
      setErrorObj(err.response?.data || { detail: "Error desconocido al guardar el usuario" });
    }
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div className="modal-header">
          <h3>
            {isEditing ? <><FaEdit style={{ marginRight: '8px', color: 'var(--color-primary)' }}/> Editar Usuario</> : <><FaUserPlus style={{ marginRight: '8px', color: 'var(--color-primary)' }}/> Nuevo Usuario</>}
          </h3>
          <button onClick={() => onClose(false)} className="modal-close">
            <FaTimes />
          </button>
        </div>

        <div>
          {errorObj && (
            <div style={{ backgroundColor: '#fce8e8', color: 'var(--color-destructive)', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem', border: '1px solid #f8d7da' }}>
              {typeof errorObj === 'object' ? Object.keys(errorObj).map(k => <div key={k}><b>{k}:</b> {errorObj[k]}</div>) : errorObj}
            </div>
          )}
          
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData); }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Nombres</label>
                <input type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Apellidos</label>
                <input type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} required />
              </div>
            </div>
            
            <div className="form-group">
              <label>Nombre de Usuario (Login)</label>
              <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Rol Interno</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="vendedor">Vendedor</option>
                  <option value="auxiliar">Auxiliar</option>
                  <option value="transportador">Transportador</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Contraseña 
                  {isEditing && <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-placeholder)' }}>Dejar vacío para no cambiar</span>}
                </label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!isEditing} placeholder={isEditing ? "••••••••" : "Introduce contraseña"} />
              </div>
            </div>

            <div className="checkbox-card">
              <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
              <label htmlFor="is_active" style={{ cursor: 'pointer', margin: 0, width: '100%' }}>
                <span style={{ display: 'block', fontWeight: 600, color: 'var(--color-text-primary)' }}>Cuenta habilitada (Activa)</span>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>Si se desmarca, el usuario perderá el acceso inmediatamente sin eliminar sus registros.</span>
              </label>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => onClose(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={mutation.isLoading}>
                {mutation.isLoading ? <FaSpinner className="loader" style={{ width: '1rem', height: '1rem', marginBottom: 0, borderWidth: '2px' }}/> : 'Guardar Datos'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// SECCIÓN: EDITOR DE PERMISOS DE ROLES
// ==========================================
const FEATURES_CATALOG = [
  { module: "Vista Principal", features: [{ code: "VER_INICIO", label: "Ver Inicio / Dashboard" }] },
  { module: "Ventas", features: [{ code: "VER_VENTAS", label: "Acceso a tabla de Ventas" }, { code: "CREAR_VENTA", label: "Registrar Nueva Venta" }, { code: "EDITAR_VENTA", label: "Editar Venta Existente" }] },
  { module: "Pedidos", features: [{ code: "VER_ORDENES", label: "Acceso a tabla de Pedidos" }, { code: "CREAR_ORDEN", label: "Crear Pedido" }] },
  { module: "Almacen y BD", features: [{ code: "VER_TELAS", label: "Ver Telas" }, { code: "VER_REFERENCIAS", label: "Ver Referencias" }, { code: "VER_PROVEEDORES", label: "Ver Proveedores" }, { code: "VER_CLIENTES", label: "Ver Clientes" }] },
  { module: "Suministros", features: [{ code: "VER_FACTURAS", label: "Ver Facturas de Proveedor" }, { code: "VER_REMISIONES", label: "Ver Remisiones" }, { code: "VER_INVENTARIO", label: "Ver Inventarios" }] },
  { module: "Finanzas", features: [{ code: "VER_CAJA", label: "Acceso a Caja, Egresos y Recibos" }] },
];

const RolePermissionsTab = ({ notify }) => {
  const queryClient = useQueryClient();
  const { reloadUser } = useContext(AppContext);
  const [selectedRp, setSelectedRp] = useState(null);

  const { data: rolePerms = [], isLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const res = await API.get('/role-permissions/');
      return res.data?.results || res.data || [];
    }
  });

  const mutation = useMutation({
    mutationFn: async (updatedRp) => {
      return await API.put(`/role-permissions/${updatedRp.id}/`, updatedRp);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries(['role-permissions']);
      notify('Permisos actualizados correctamente', 'success');
      if (reloadUser) await reloadUser();
    },
    onError: () => notify('Error actualizando permisos', 'error')
  });

  const handleToggle = (code) => {
    if (!selectedRp) return;
    const isEditing = { ...selectedRp };
    if (isEditing.permissions.includes(code)) {
      isEditing.permissions = isEditing.permissions.filter(p => p !== code);
    } else {
      isEditing.permissions.push(code);
    }
    setSelectedRp(isEditing);
  };

  const handleSave = () => mutation.mutate(selectedRp);

  if (isLoading) return <Loader />;

  return (
    <div className="roles-container">
      
      {/* Roles Menu */}
      <div className="roles-sidebar">
        <div className="roles-sidebar-header">
          Roles Disponibles
        </div>
        <ul className="roles-list">
          {rolePerms.map(rp => {
            const isActive = selectedRp?.id === rp.id;
            return (
              <li key={rp.id}>
                <button 
                  className={`role-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedRp(rp)}
                >
                  {rp.role.toUpperCase()}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Permissions Editor */}
      <div className="permissions-editor">
        {!selectedRp ? (
          <div className="permissions-empty">
            <FaUserShield size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--color-text-secondary)', margin: 0 }}>Selecciona un Rol de la izquierda</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Para visualizar y editar sus permisos dinámicos.</p>
          </div>
        ) : (
          <div className="permissions-content">
            <div className="permissions-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                  Permisos para: <span className="role-highlight">{selectedRp.role.toUpperCase()}</span>
                </h3>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Activa o desactiva módulos para controlar el acceso a la plataforma.</p>
              </div>
              <button 
                className="btn-primary" 
                style={{ width: 'auto' }}
                onClick={handleSave} 
                disabled={mutation.isLoading}
              >
                {mutation.isLoading ? <FaSpinner className="loader" style={{ width: '1rem', height: '1rem', marginBottom: 0, borderWidth: '2px' }}/> : 'Guardar Reglas'}
              </button>
            </div>

            <div className="permissions-grid">
              {FEATURES_CATALOG.map(module => (
                <div key={module.module} className="module-card">
                  <h4 className="module-title">{module.module}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {module.features.map(f => {
                      const isChecked = selectedRp.permissions.includes(f.code);
                      return (
                        <div 
                          key={f.code} 
                          className={`feature-toggle ${isChecked ? 'active' : ''}`}
                          onClick={() => handleToggle(f.code)}
                        >
                          <span className="feature-label">
                            {f.label}
                          </span>
                          <label className="switch" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={isChecked} onChange={() => handleToggle(f.code)} />
                            <span className="slider"></span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
};


// ==========================================
// SECCIÓN: PAGINA PRINCIPAL (TABS)
// ==========================================
const UsuariosPage = () => {
  const [activeTab, setActiveTab] = useState('cuentas'); // cuentas | permisos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notif, setNotif] = useState({ message: '', type: '' });
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10; 

  const notify = (msg, type) => setNotif({ message: msg, type });

  useEffect(() => {
    if (notif.message) {
      const t = setTimeout(() => setNotif({ message: '', type: '' }), 4000);
      return () => clearTimeout(t);
    }
  }, [notif.message]);

  const { data: pagedData, isLoading, isError, error } = useQuery({
    queryKey: ['usuarios-list', currentPage],
    queryFn: async () => {
      const resp = await API.get(`/usuarios/?page=${currentPage}`);
      return resp.data;
    }
  });

  const usuarios = pagedData?.results || (Array.isArray(pagedData) ? pagedData : []);
  const totalCount = pagedData?.count || usuarios.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handleCreate = () => { setSelectedUser(null); setIsModalOpen(true); };
  const handleEdit = (user) => { setSelectedUser(user); setIsModalOpen(true); };
  const handleCloseModal = (wasSaved) => {
    setIsModalOpen(false);
    if (wasSaved === true) notify('Usuario guardado exitosamente.', 'success');
  };

  if (isError) return (
    <div className="page-container" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', backgroundColor: 'var(--color-surface)', padding: '3rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <FaExclamationCircle style={{ color: 'var(--color-destructive)', fontSize: '3rem', marginBottom: '1rem' }} />
        <h2>Error al cargar usuarios</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>{error?.message || "Error desconocido"}</p>
        <p style={{ color: 'var(--color-text-placeholder)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error?.response?.data?.detail || JSON.stringify(error?.response?.data)}</p>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <ToastNotification notification={notif} />

      {/* Tabs */}
      <div className="usuarios-tabs-container">
        <button 
          className={`usuarios-tab ${activeTab === 'cuentas' ? 'active' : ''}`}
          onClick={() => setActiveTab('cuentas')}
        >
          <FaUsers /> Cuentas de Usuario
        </button>
        <button 
          className={`usuarios-tab ${activeTab === 'permisos' ? 'active' : ''}`}
          onClick={() => setActiveTab('permisos')}
        >
          <FaUserCog /> Reglas y Permisos de Roles
        </button>
      </div>

      {/* TAB: CUENTAS */}
      {activeTab === 'cuentas' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn-primary" style={{ width: 'auto' }} onClick={handleCreate}>
              <FaPlus /> Crear Usuario
            </button>
          </div>

          {isLoading ? (
            <Loader />
          ) : (
            <div className="table-container">
              <table className="standard-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Nombres</th>
                    <th>Rol de Sistema</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-placeholder)' }}>
                        No se encontraron usuarios en esta página.
                      </td>
                    </tr>
                  ) : (
                    usuarios.map(u => (
                      <tr key={u.id}>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>@{u.username}</span>
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                          {u.first_name} {u.last_name}
                        </td>
                        <td>
                          <span className={`badge badge-${u.role}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          {u.is_active ? (
                            <span className="badge status-active">
                              <span className="status-dot"></span> Activo
                            </span>
                          ) : (
                            <span className="badge status-inactive">
                              <span className="status-dot"></span> Bloqueado
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            onClick={() => handleEdit(u)} 
                            className="action-btn"
                            title="Editar Usuario"
                          >
                            <FaEdit size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Controles de Paginación */}
              {totalCount > 0 && (
                <div className="pagination-controls">
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    Mostrando <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{Math.min((currentPage - 1) * PAGE_SIZE + 1, totalCount)}</span> a <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{Math.min(currentPage * PAGE_SIZE, totalCount)}</span> de <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{totalCount}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button 
                      onClick={() => setCurrentPage(old => Math.max(old - 1, 1))}
                      disabled={currentPage === 1 || pagedData?.previous === null}
                      title="Página anterior"
                    >
                      <FaChevronLeft />
                    </button>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text-primary)', padding: '0 0.5rem' }}>
                      Página {currentPage} de {totalPages}
                    </div>
                    <button 
                      onClick={() => setCurrentPage(old => (currentPage < totalPages ? old + 1 : old))}
                      disabled={currentPage >= totalPages || pagedData?.next === null}
                      title="Página siguiente"
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: PERMISOS */}
      {activeTab === 'permisos' && (
        <RolePermissionsTab notify={notify} />
      )}

      {/* MODAL */}
      <UserModal isOpen={isModalOpen} onClose={handleCloseModal} user={selectedUser} isEditing={!!selectedUser} />
    </div>
  );
};

export default UsuariosPage;
