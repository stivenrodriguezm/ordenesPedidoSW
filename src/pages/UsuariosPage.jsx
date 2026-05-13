import React, { useState, useEffect, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../services/api';
import { FaPlus, FaEdit, FaUserShield, FaUserPlus, FaUserCog, FaUsers } from 'react-icons/fa';
import { AppContext } from '../AppContext';
import './UsuariosPage.css';

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
      <div className="user-modal">
        <div className="user-modal__header">
          <h3 className="user-modal__title">
            {isEditing ? <><FaEdit style={{ marginRight: '8px' }}/> Editar Usuario</> : <><FaUserPlus style={{ marginRight: '8px' }}/> Nuevo Usuario</>}
          </h3>
          <button className="user-modal__close" onClick={() => onClose(false)}>&times;</button>
        </div>
        <div className="user-modal__body">
          {errorObj && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.9rem' }}>
              {typeof errorObj === 'object' ? Object.keys(errorObj).map(k => <div key={k}><b>{k}:</b> {errorObj[k]}</div>) : errorObj}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="user-form__field">
              <label>Nombres</label>
              <input type="text" className="user-form__input" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required />
            </div>
            <div className="user-form__field">
              <label>Apellidos</label>
              <input type="text" className="user-form__input" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} required />
            </div>
          </div>
          <div className="user-form__field">
            <label>Nombre de Usuario (Login)</label>
            <input type="text" className="user-form__input" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="user-form__field">
              <label>Rol Interno</label>
              <select className="user-form__select" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                <option value="vendedor">Vendedor</option>
                <option value="auxiliar">Auxiliar</option>
                <option value="transportador">Transportador</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>
            <div className="user-form__field">
              <label>Contraseña {isEditing && <span style={{fontSize: '0.8rem', fontWeight: 'normal', color: '#64748b'}}>(Dejar vacío)</span>}</label>
              <input type="password" className="user-form__input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!isEditing} placeholder={isEditing ? "••••••••" : "Introduce contraseña"} />
            </div>
          </div>
          <div className="checkbox-wrap">
            <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
            <label htmlFor="is_active">
              Cuenta habilitada (Activa)
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>Si se desmarca, perderá el acceso inmediatamente sin eliminarse.</p>
            </label>
          </div>
        </div>
        <div className="user-modal__footer">
          <button className="btn-secondary" onClick={() => onClose(false)}>Cancelar</button>
          <button className="btn-primary" onClick={() => mutation.mutate(formData)} disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Guardando...' : 'Guardar Datos'}
          </button>
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
      // Reload current user's permissions so the sidebar updates immediately
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

  if (isLoading) return <div style={{ padding: '2rem' }}>Cargando reglas...</div>;

  return (
    <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
      <div style={{ width: '250px' }} className="glass-panel">
        <ul className="roles-list">
          <li className="roles-list-header">ROLES DISPONIBLES</li>
          {rolePerms.map(rp => (
            <li 
              key={rp.id} 
              className={`role-list-item ${selectedRp?.id === rp.id ? 'active' : ''}`}
              onClick={() => setSelectedRp(rp)}
            >
              {rp.role.toUpperCase()}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ flex: 1 }} className="glass-panel role-permissions-box">
        {!selectedRp ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Selecciona un Rol de la izquierda para editar sus permisos dinámicos.
          </div>
        ) : (
          <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Permisos para: <span style={{ color: '#2563eb' }}>{selectedRp.role.toUpperCase()}</span></h3>
              <button className="btn-primary" onClick={handleSave} disabled={mutation.isLoading}>
                {mutation.isLoading ? 'Guardando...' : 'Guardar Reglas'}
              </button>
            </div>

            <div className="features-grid">
              {FEATURES_CATALOG.map(module => (
                <div key={module.module} className="feature-module">
                  <h4 className="feature-module-title">{module.module}</h4>
                  {module.features.map(f => {
                    const isChecked = selectedRp.permissions.includes(f.code);
                    return (
                      <div key={f.code} className={`feature-toggle ${isChecked ? 'active' : ''}`} onClick={() => handleToggle(f.code)}>
                        <div className={`toggle-switch ${isChecked ? 'on' : 'off'}`}></div>
                        <span className="feature-label">{f.label}</span>
                      </div>
                    );
                  })}
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

  const notify = (msg, type) => setNotif({ message: msg, type });

  useEffect(() => {
    if (notif.message) {
      const t = setTimeout(() => setNotif({ message: '', type: '' }), 4000);
      return () => clearTimeout(t);
    }
  }, [notif.message]);

  const { data: usuarios = [], isLoading, isError } = useQuery({
    queryKey: ['usuarios-list'],
    queryFn: async () => {
      const resp = await API.get('/usuarios/');
      return resp.data?.results || resp.data || [];
    }
  });

  const handleCreate = () => { setSelectedUser(null); setIsModalOpen(true); };
  const handleEdit = (user) => { setSelectedUser(user); setIsModalOpen(true); };
  const handleCloseModal = (wasSaved) => {
    setIsModalOpen(false);
    if (wasSaved === true) notify('Usuario guardado exitosamente.', 'success');
  };

  if (isLoading) return <div style={{ padding: '2rem' }}>Cargando administrador...</div>;
  if (isError) return <div style={{ padding: '2rem', color: 'red' }}>Acceso denegado.</div>;

  return (
    <div className="page-container">
      {notif.message && <div className={`usr-notif usr-notif--${notif.type}`}>{notif.type === 'success' ? '✓ ' : '✕ '}{notif.message}</div>}

      <div className="page-header" style={{ marginBottom: '1rem', borderBottom: 'none' }}>
        <div className="header-title-group">
          <h2 className="page-title"><FaUserShield /> Administración del Sistema</h2>
          <span className="page-subtitle">Modificando cuentas, accesos y permisos</span>
        </div>
      </div>

      <div className="tabs-container">
        <button className={`tab-btn ${activeTab === 'cuentas' ? 'active' : ''}`} onClick={() => setActiveTab('cuentas')}>
          <FaUsers /> Cuentas
        </button>
        <button className={`tab-btn ${activeTab === 'permisos' ? 'active' : ''}`} onClick={() => setActiveTab('permisos')}>
          <FaUserCog /> Reglas de Roles
        </button>
      </div>

      {activeTab === 'cuentas' && (
        <div className="tab-pane fade-in">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn-primary" onClick={handleCreate}><FaPlus /> Crear Usuario</button>
          </div>
          <div className="glass-panel">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Usuario</th><th>Nombres</th><th>Rol / Permisos</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td>{u.first_name} {u.last_name}</td>
                    <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                    <td>
                      <span className={`status-badge status-${u.is_active ? 'active' : 'inactive'}`}>
                        {u.is_active ? 'Activo (Con Acceso)' : 'Inactivo (Bloqueado)'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="action-btn edit" onClick={() => handleEdit(u)} title="Editar usuario"><FaEdit size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'permisos' && (
        <div className="tab-pane fade-in">
          <RolePermissionsTab notify={notify} />
        </div>
      )}

      <UserModal isOpen={isModalOpen} onClose={handleCloseModal} user={selectedUser} isEditing={!!selectedUser} />
    </div>
  );
};

export default UsuariosPage;
