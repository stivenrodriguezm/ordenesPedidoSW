import React, { useState, useEffect, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../services/api';
import { 
  FaPlus, FaEdit, FaUserShield, FaUsers, 
  FaChevronLeft, FaChevronRight, FaCheckCircle, FaExclamationCircle, FaUserCog
} from 'react-icons/fa';
import { AppContext, usePermissions } from '../AppContext';
import { PageHeader, Button, Badge, Modal, Tabs, LoadingBlock, ErrorState, EmptyState } from '../components/ui';
import './UsuariosPage.css';

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
const ToastNotification = ({ notification }) => {
  if (!notification.message) return null;
  const isSuccess = notification.type === 'success';
  return (
    <div className={`toast-notification ${isSuccess ? 'toast-success' : 'toast-error'}`} role={isSuccess ? 'status' : 'alert'}>
      {isSuccess ? <FaCheckCircle size={20} aria-hidden="true" /> : <FaExclamationCircle size={20} aria-hidden="true" />}
      <span>{notification.message}</span>
    </div>
  );
};

const roleTone = (role) => {
  const r = (role || '').toLowerCase();
  if (r === 'administrador') return 'accent';
  if (r === 'vendedor') return 'info';
  if (r === 'auxiliar') return 'warning';
  if (r === 'marketing') return 'success';
  if (r === 'contabilidad') return 'info';
  return 'neutral';
};

// ==========================================
// SECCIÓN: MODAL DE EDICIÓN DE USUARIOS
// ==========================================
const UserModal = ({ isOpen, onClose, user, isEditing }) => {
  const queryClient = useQueryClient();
  const { usuario, reloadUser } = useContext(AppContext);
  const esAdministrador = usuario?.role === 'administrador';
  const [formData, setFormData] = useState({
    username: '', first_name: '', last_name: '', role: 'vendedor', is_active: true, password: ''
  });
  const [errorObj, setErrorObj] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (isEditing && user) {
        setFormData({ username: user.username || '', first_name: user.first_name || '', last_name: user.last_name || '', role: user.role || 'vendedor', is_active: user.is_active, password: '', acceso_rapido_ia: !!user.acceso_rapido_ia });
      } else {
        setFormData({ username: '', first_name: '', last_name: '', role: 'vendedor', is_active: true, password: '', acceso_rapido_ia: false });
      }
      setErrorObj(null);
    }
  }, [isOpen, isEditing, user]);

  const mutation = useMutation({
    mutationFn: async (dataToSubmit) => {
      const url = isEditing ? `/usuarios/${user.id}/` : `/usuarios/`;
      let payload = { ...dataToSubmit };
      if (!esAdministrador) delete payload.acceso_rapido_ia;
      if (isEditing && !payload.password) delete payload.password;
      return isEditing ? (await API.put(url, payload)).data : (await API.post(url, payload)).data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["usuarios-list"] });
      if (user?.id === usuario?.id) await reloadUser();
      onClose(true);
    },
    onError: (err) => {
      setErrorObj(err.response?.data || { detail: "Error desconocido al guardar el usuario" });
    }
  });

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={() => onClose(false)}
      title={isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={() => onClose(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="usuario-form" loading={mutation.isPending}>
            Guardar Datos
          </Button>
        </>
      }
    >
      {errorObj && (
        <div className="ds-error-box" style={{ marginBottom: '1rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
          {typeof errorObj === 'object' ? Object.keys(errorObj).map(k => <div key={k}><b>{k}:</b> {errorObj[k]}</div>) : errorObj}
        </div>
      )}

      <form id="usuario-form" onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData); }} autoComplete="off">
        <div className="usuarios-form-grid">
          <div className="ds-field">
            <label className="ds-label">Nombres</label>
            <input className="ds-input" type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required autoComplete="off" />
          </div>
          <div className="ds-field">
            <label className="ds-label">Apellidos</label>
            <input className="ds-input" type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} required autoComplete="off" />
          </div>
        </div>

        <div className="ds-field">
          <label className="ds-label">Nombre de Usuario (Login)</label>
          <input className="ds-input" type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required autoComplete="new-username" />
        </div>

        <div className="usuarios-form-grid">
          <div className="ds-field">
            <label className="ds-label">Rol Interno</label>
            <select className="ds-select" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
              <option value="vendedor">Vendedor</option>
              <option value="auxiliar">Auxiliar</option>
              <option value="transportador">Transportador</option>
              <option value="marketing">Marketing</option>
              <option value="contabilidad">Contabilidad</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
          <div className="ds-field">
            <label className="ds-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Contraseña
              {isEditing && <span className="ds-field__hint" style={{ marginTop: 0 }}>Dejar vacío para no cambiar</span>}
            </label>
            <input className="ds-input" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!isEditing} placeholder={isEditing ? "••••••••" : "Introduce contraseña"} autoComplete="new-password" />
          </div>
        </div>

        {esAdministrador && <div className="checkbox-card">
          <input type="checkbox" id="acceso_rapido_ia" checked={!!formData.acceso_rapido_ia} onChange={e => setFormData({...formData, acceso_rapido_ia: e.target.checked})} />
          <label htmlFor="acceso_rapido_ia" style={{ cursor: 'pointer', margin: 0, width: '100%' }}>
            <span style={{ display: 'block', fontWeight: 600, color: 'var(--text)' }}>Botón de acceso rápido al chat de IA</span>
            <span className="ds-field__hint">Muestra el botón discreto de IA en toda la plataforma para esta cuenta. Requiere permiso de uso de IA. Solo los administradores pueden cambiarlo.</span>
          </label>
        </div>}

        <div className="checkbox-card">
          <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
          <label htmlFor="is_active" style={{ cursor: 'pointer', margin: 0, width: '100%' }}>
            <span style={{ display: 'block', fontWeight: 600, color: 'var(--text)' }}>Cuenta habilitada (Activa)</span>
            <span style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Si se desmarca, el usuario perderá el acceso inmediatamente sin eliminar sus registros.</span>
          </label>
        </div>
      </form>
    </Modal>
  );
};

// ==========================================
// SECCIÓN: EDITOR DE PERMISOS DE ROLES
// ==========================================
const FEATURES_CATALOG = [
  { module: "Vista Principal", features: [
      { code: "VER_INICIO", label: "Ver Inicio / Dashboard" },
      { code: "VER_DASHBOARD_PERSONAL", label: "Dashboard personal (propias ventas y pedidos)" },
      { code: "VER_DASHBOARD_GENERAL", label: "Dashboard general (cifras globales del negocio)" },
    ]
  },
  { module: "Ventas", features: [
      { code: "VER_TODAS_VENTAS", label: "Ver ventas de todos los usuarios" },
      { code: "VER_PROPIAS_VENTAS", label: "Ver solo ventas del vendedor" },
      { code: "CREAR_VENTA", label: "Habilitar creación de ventas" },
      { code: "EDITAR_PRODUCTOS_VENTA", label: "Completar productos y confirmar precios de lista de ventas" },
      { code: "AJUSTAR_PRECIO_LISTA_VENTA", label: "Autorizar productos especiales y ajustes de precio de lista con motivo" },
      { code: "EDITAR_VENTA", label: "Habilitar edición de ventas (monto, cliente, etc.)" },
      { code: "EDITAR_ESTADO_VENTA", label: "Editar estado de venta (Pendiente, Entregado, Anulada)" },
      { code: "EDITAR_ESTADO_PEDIDOS_VENTA", label: "Editar estado de pedidos" },
      { code: "VER_PRECIOS_VENTA", label: "Ver montos y precios de la venta" },
      { code: "MARCAR_VENTA_FACTURADA", label: "Facturación: ver la columna «Facturado» y marcar ventas como facturadas" },
      { code: "VER_MARGENES", label: "Ver márgenes y costos de venta" }
    ] 
  },
  { module: "Inventario", features: [
      { code: "VER_INVENTARIO", label: "Acceso a Inventario" },
      { code: "CREAR_ENTRADA_MANUAL", label: "Habilitar creación manual de ítems" },
      { code: "EDITAR_ITEM_INVENTARIO", label: "Habilitar edición de ítems" },
      { code: "EDITAR_ESTADO_ITEM", label: "Cambiar estado físico y disponibilidad" },
      { code: "VER_COSTOS_INVENTARIO", label: "Ver costos y totales del ítem" },
      { code: "CREAR_GRUPO_INVENTARIO", label: "Administrar grupos de inventario" },
    ] 
  },
  { module: "Facturas Proveedor", features: [
      { code: "VER_FACTURAS", label: "Acceso a Facturas" },
      { code: "CREAR_FACTURA", label: "Habilitar creación de facturas" },
      { code: "EDITAR_FACTURA", label: "Habilitar edición de facturas" },
      { code: "EDITAR_FECHAS_FACTURA", label: "Habilitar edición de fechas (Factura y Pago)" }
    ]
  },
  { module: "Pedidos", features: [
      { code: "VER_ORDENES", label: "Acceso a tabla de Pedidos" },
      { code: "VER_TODAS_ORDENES", label: "Acceso a todos los pedidos" },
      { code: "VER_PROPIAS_ORDENES", label: "Acceso a pedidos de su usuario" },
      { code: "CREAR_ORDEN", label: "Crear Pedidos (General)" },
      { code: "CREAR_PROPIAS_ORDENES", label: "Crear solo sus propios pedidos" },
      { code: "CREAR_ORDENES_OTROS", label: "Crear pedidos a nombre de otro usuario" },
      { code: "EDITAR_ESTADO_ORDEN", label: "Editar estado del pedido" },
      { code: "EDITAR_ESTADO_TELA_ORDEN", label: "Editar estado de tela en pedido" },
      { code: "ANULAR_ORDEN_PEDIDO", label: "Anular órdenes de pedido" },
      { code: "VER_COSTOS_ORDEN", label: "Ver costo del proveedor en pedidos" }
    ] 
  },
  { module: "Pedidos de Telas", features: [
      { code: "VER_PEDIDOS_TELAS", label: "Acceso a Pedidos de Telas" },
      { code: "VER_TODOS_PEDIDOS_TELAS", label: "Acceso a todos los pedidos de telas" },
      { code: "VER_PROPIOS_PEDIDOS_TELAS", label: "Acceso a pedidos de telas propios" },
      { code: "CREAR_PEDIDO_TELA", label: "Crear nuevo pedido de tela" },
      { code: "EDITAR_ESTADO_TELA_ORDEN", label: "Editar estado de tela (En progreso, fábrica, etc.)" },
      { code: "ELIMINAR_PEDIDO_TELA", label: "Eliminar/Anular pedido de tela" },
      { code: "DESCARGAR_PEDIDO_TELA", label: "Habilitar descarga de PDF del pedido" },
      { code: "ADMINISTRAR_PROVEEDORES_TELA", label: "Crear/Editar proveedores de tela" },
      { code: "ADMINISTRAR_DIRECCIONES_TELA", label: "Crear/Editar direcciones de entrega de tela" }
    ]
  },
  { module: "Remisiones", features: [
      { code: "VER_REMISIONES", label: "Acceso a Remisiones (solo las de sus ventas)" },
      { code: "VER_TODAS_REMISIONES", label: "Ver remisiones de todos los usuarios" },
      { code: "CREAR_REMISION", label: "Crear remisiones de sus ventas (propias o compartidas)" },
      { code: "CREAR_REMISION_TODAS_VENTAS", label: "Crear remisiones de cualquier venta sin entregar (y sin venta asociada)" },
      { code: "EDITAR_REMISION", label: "Editar y reprogramar remisiones (fecha, dirección, transportador, cobro)" },
      { code: "CAMBIAR_ESTADO_REMISION", label: "Marcar despachada, entregada o devuelta" },
      { code: "ANULAR_REMISION", label: "Anular remisiones" },
      { code: "DESCARGAR_REMISION", label: "Imprimir y reimprimir remisiones" },
      { code: "VER_COSTO_ENTREGA_REMISION", label: "Ver y registrar el costo del flete" }
    ]
  },
  { module: "Comprobantes de Egreso", features: [
      { code: "ACCESO_EGRESOS", label: "Acceso a Comprobantes de Egreso" },
      { code: "VER_TODOS_EGRESOS", label: "Ver comprobantes de todos los usuarios" },
      { code: "VER_PROPIOS_EGRESOS", label: "Ver solo comprobantes propios" },
      { code: "CREAR_COMPROBANTE_EGRESO", label: "Crear nuevos comprobantes de egreso" },
      { code: "EDITAR_COMPROBANTE_EGRESO", label: "Editar comprobantes de egreso (incluye revertir pagos)" },
      { code: "APROBAR_EGRESO", label: "Confirmar transferencias de egreso (Pago)" },
      { code: "EXPORTAR_EGRESOS", label: "Exportar comprobantes de egreso a Excel" }
    ] 
  },
  { module: "Gerencia", features: [
      { code: "USAR_ASISTENTE_IA", label: "IA Lottus: chat gerencial con IA (consulta datos de toda la empresa: ventas, asesores, cobros, caja, nómina)" },
      { code: "GESTIONAR_PERFILES_IA", label: "IA Lottus: crear y editar perfiles de IA (rol, instrucciones, acceso a datos y documentos)" }
    ]
  },
  { module: "Finanzas", features: [
      { code: "ACCESO_CAJA", label: "Acceso a Caja Principal" },
      { code: "CERRAR_CAJA", label: "Abrir y cerrar turnos de caja" },
      { code: "CREAR_INGRESO_CAJA", label: "Registrar ingresos manuales" },
      { code: "CREAR_EGRESO_CAJA", label: "Registrar egresos manuales" },
      { code: "ACCESO_RECIBOS", label: "Acceso a Recibos de Caja" },
      { code: "CREAR_RECIBO", label: "Crear Recibo de Caja" },
      { code: "EDITAR_RECIBO", label: "Editar Recibo de Caja" },
      { code: "APROBAR_RECIBO", label: "Confirmar Recibo de Caja" },
      { code: "VER_NOMINA", label: "Consultar la nómina de asesores (comisiones, bonificaciones, básicos)" },
      { code: "GESTIONAR_NOMINA", label: "Crear, editar y cerrar la nómina y sus reglas" }
    ] 
  },
  { module: "Bases de Datos", features: [
      { code: "BASES_DATOS", label: "Acceso al módulo (Dashboard)" },
      { code: "VER_CLIENTES", label: "Ver Clientes" },
      { code: "EDITAR_CLIENTE", label: "Editar Clientes" },
      { code: "VER_CALIDAD_CLIENTES", label: "Revisar posibles duplicados y formato (requiere Ver Clientes)" },
      { code: "NORMALIZAR_CLIENTES", label: "Aplicar correcciones de formato con historial (requiere editar y revisar calidad)" },
      { code: "EXPORTAR_CLIENTES", label: "Exportar Clientes a Excel" },
      { code: "ADMINISTRAR_PROVEEDORES", label: "Administrar Proveedores" },
      { code: "ADMINISTRAR_REFERENCIAS", label: "Administrar Referencias" },
      { code: "ADMINISTRAR_SEDES", label: "Administrar Sedes y Zonas" }
    ]
  },
  // La API de usuarios y permisos es exclusiva del rol administrador (y para él siempre
  // está activa, para no perder la vía de corrección): aquí solo se informa.
  { module: "Usuarios y Sistema", soloAdministrador: true, features: [
      { code: "VER_USUARIOS", label: "Acceso a Usuarios" },
      { code: "ADMINISTRAR_USUARIOS", label: "Crear y Editar Usuarios" },
      { code: "EDITAR_PERMISOS_SISTEMA", label: "Editar Roles y Permisos" }
    ]
  },
  { module: "Página Web", features: [
      { code: "GESTION_WEB", label: "Acceso a Gestión Web (ver y gestionar productos)" },
      { code: "CREAR_PRODUCTO_WEB", label: "Crear productos" },
      { code: "EDITAR_PRODUCTO_WEB", label: "Editar productos existentes" },
      { code: "ELIMINAR_PRODUCTO_WEB", label: "Eliminar productos" },
      { code: "EDITAR_CONFIGURACION_WEB", label: "Editar configuración del sitio (banner, textos)" },
      { code: "ADMINISTRAR_ASESORES_WEB", label: "Ver y administrar la Paleta de Vendedores (asesores)" },
      { code: "RESPONDER_PQRS", label: "Ver y responder tickets PQRS" }
    ]
  },
  { module: "Lista de Precios", features: [
      { code: "VER_LISTA_PRECIOS", label: "Acceso a Lista de Precios (catálogo de venta)" },
      { code: "VER_COSTOS_LISTA_PRECIOS", label: "Ver costos, cargos y matriz de margen" },
      { code: "EDITAR_LISTA_PRECIOS", label: "Editar líneas, precios, multiplicadores y fotos" }
    ]
  }
];

const RolePermissionsTab = ({ notify }) => {
  const queryClient = useQueryClient();
  const { reloadUser } = useContext(AppContext);
  const hasPermission = usePermissions();
  const [selectedRp, setSelectedRp] = useState(null);

  const { data: rolePerms = [], isLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const res = await API.get('/role-permissions/');
      return res.data?.results || res.data || [];
    }
  });

  useEffect(() => {
    if (rolePerms.length > 0 && !selectedRp) {
      setSelectedRp(rolePerms[0]);
    }
  }, [rolePerms, selectedRp]);

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

  // Copia nueva en cada cambio: antes se mutaba la lista en caché y un cambio sin
  // guardar seguía viéndose como aplicado al volver a ese rol.
  const handleToggle = (code) => {
    if (!selectedRp) return;
    const actuales = selectedRp.permissions || [];
    setSelectedRp({
      ...selectedRp,
      permissions: actuales.includes(code) ? actuales.filter(p => p !== code) : [...actuales, code],
    });
  };
  const esRolAdministrador = selectedRp?.role === 'administrador';

  const handleSave = () => mutation.mutate(selectedRp);

  if (isLoading) return <LoadingBlock message="Cargando permisos..." />;

  return (
    <div className="roles-container">
      
      {/* Roles Menu */}
      <div className="roles-sidebar ds-card">
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
      <div className="permissions-editor ds-card">
        {!selectedRp ? (
          <EmptyState
            icon={FaUserShield}
            title="Selecciona un Rol de la izquierda"
            message="Para visualizar y editar sus permisos dinámicos."
          />
        ) : (
          <div className="permissions-content">
            <div className="permissions-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)', color: 'var(--text)' }}>
                  Permisos para: <span className="role-highlight">{selectedRp.role.toUpperCase()}</span>
                </h3>
                <p className="ds-muted" style={{ margin: '0.5rem 0 0 0', fontSize: 'var(--fs-sm)' }}>
                  {esRolAdministrador
                    ? 'El administrador también sigue estos permisos. Gestión de usuarios siempre queda activa para no perder el acceso.'
                    : 'Activa o desactiva módulos para controlar el acceso a la plataforma.'}
                </p>
              </div>
              {hasPermission('EDITAR_PERMISOS_SISTEMA') && (
                <Button onClick={handleSave} loading={mutation.isPending}>
                  Guardar Reglas
                </Button>
              )}
            </div>

            <div className="permissions-grid">
              {FEATURES_CATALOG.map(module => (
                <div key={module.module} className="module-card">
                  <h4 className="module-title">{module.module}</h4>
                  {module.soloAdministrador && (
                    <p className="ds-muted module-nota">Exclusivo del rol administrador; para él siempre está activo.</p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {module.features.map(f => {
                      const fijo = !!module.soloAdministrador;
                      const isChecked = fijo ? esRolAdministrador : selectedRp.permissions.includes(f.code);
                      const editable = !fijo && hasPermission('EDITAR_PERMISOS_SISTEMA');
                      return (
                        <div 
                          key={f.code} 
                          className={`feature-toggle ${isChecked ? 'active' : ''}${fijo ? ' is-fijo' : ''}`}
                          onClick={() => editable && handleToggle(f.code)}
                        >
                          <span className="feature-label">
                            {f.label}
                          </span>
                          <label className="switch" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => handleToggle(f.code)} 
                              disabled={!editable}
                            />
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
  const hasPermission = usePermissions();
  
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

  const { data: pagedData, isLoading, isError, error, refetch } = useQuery({
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
    <div className="ds-page">
      <ErrorState
        message={`Error al cargar usuarios. ${error?.response?.data?.detail || error?.message || ''}`}
        onRetry={refetch}
      />
    </div>
  );

  return (
    <div className="ds-page usuarios-page ds-fade-in">
      <ToastNotification notification={notif} />

      <PageHeader
        icon={FaUsers}
        title="Usuarios y Permisos"
        subtitle="Gestiona las cuentas de acceso y las reglas de roles"
        actions={
          activeTab === 'cuentas' && hasPermission('ADMINISTRAR_USUARIOS') ? (
            <Button icon={FaPlus} onClick={handleCreate}>
              Crear Usuario
            </Button>
          ) : null
        }
      />

      <Tabs
        tabs={[
          { id: 'cuentas', label: <><FaUsers /> Cuentas de Usuario</> },
          { id: 'permisos', label: <><FaUserCog /> Reglas y Permisos de Roles</> },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* TAB: CUENTAS */}
      {activeTab === 'cuentas' && (
        <div>
          {isLoading ? (
            <LoadingBlock message="Cargando usuarios..." />
          ) : (
            <div className="ds-table-wrap">
              <div className="ds-table-scroll">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Nombres</th>
                      <th>Rol de Sistema</th>
                      <th>Estado</th>
                      <th>Acceso rápido IA</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          No se encontraron usuarios en esta página.
                        </td>
                      </tr>
                    ) : (
                      usuarios.map(u => (
                        <tr key={u.id}>
                          <td>
                            <span style={{ fontWeight: 600, color: 'var(--text)' }}>@{u.username}</span>
                          </td>
                          <td className="ds-muted" style={{ fontWeight: 500 }}>
                            {u.first_name} {u.last_name}
                          </td>
                          <td>
                            <Badge tone={roleTone(u.role)}>{u.role}</Badge>
                          </td>
                          <td>
                            <Badge tone={u.is_active ? 'success' : 'danger'}>
                              {u.is_active ? 'Activo' : 'Bloqueado'}
                            </Badge>
                          </td>
                          <td><Badge tone={u.acceso_rapido_ia ? 'success' : 'neutral'}>{u.acceso_rapido_ia ? 'Activado' : 'Desactivado'}</Badge></td>
                          <td style={{ textAlign: 'right' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={FaEdit}
                              onClick={() => handleEdit(u)}
                              title="Editar Usuario"
                              aria-label="Editar Usuario"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Controles de Paginación */}
              {totalCount > 0 && (
                <div className="pagination-controls">
                  <div className="ds-muted" style={{ fontSize: 'var(--fs-sm)' }}>
                    Mostrando <span style={{ fontWeight: 600, color: 'var(--text)' }}>{Math.min((currentPage - 1) * PAGE_SIZE + 1, totalCount)}</span> a <span style={{ fontWeight: 600, color: 'var(--text)' }}>{Math.min(currentPage * PAGE_SIZE, totalCount)}</span> de <span style={{ fontWeight: 600, color: 'var(--text)' }}>{totalCount}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={FaChevronLeft}
                      onClick={() => setCurrentPage(old => Math.max(old - 1, 1))}
                      disabled={currentPage === 1 || pagedData?.previous === null}
                      title="Página anterior"
                      aria-label="Página anterior"
                    />
                    <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 500, color: 'var(--text)', padding: '0 0.5rem' }}>
                      Página {currentPage} de {totalPages}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={FaChevronRight}
                      onClick={() => setCurrentPage(old => (currentPage < totalPages ? old + 1 : old))}
                      disabled={currentPage >= totalPages || pagedData?.next === null}
                      title="Página siguiente"
                      aria-label="Página siguiente"
                    />
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
