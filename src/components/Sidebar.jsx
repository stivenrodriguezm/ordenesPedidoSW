import React, { useContext, useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaBoxes, FaClipboardList, FaFileInvoiceDollar, FaHome, FaCashRegister, FaReceipt, FaFileInvoice, FaTimes, FaChevronLeft, FaChevronRight, FaChevronUp, FaScroll, FaTruck, FaLayerGroup, FaGlobe, FaTags, FaRobot, FaUser, FaUserShield, FaSignOutAlt } from 'react-icons/fa';
import { useQueryClient } from "@tanstack/react-query";
import { AppContext, usePermissions } from "../AppContext";
import API from "../services/api";
import "./Sidebar.css";

const iniciales = (nombre = '', apellido = '') => `${nombre ? nombre[0] : ''}${apellido ? apellido[0] : ''}`.toUpperCase();

/* Perfil del usuario al pie del menú (antes en la barra superior):
   Mi perfil, Gestión de usuarios (administradores) y Cerrar sesión. */
function UsuarioSidebar({ isCollapsed, onNavegar }) {
  const { usuario, setUsuario } = useContext(AppContext) || {};
  const [abierto, setAbierto] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    const escape = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', escape); };
  }, [abierto]);

  if (!usuario) return null;

  const ir = (ruta) => { setAbierto(false); onNavegar?.(); navigate(ruta); };

  const cerrarSesion = () => {
    // Revoca el refresh en el servidor (sin esperar: el cierre local no
    // depende de la red; si falla, el refresh vence solo).
    const refresh = localStorage.getItem('refreshToken');
    if (refresh) API.post('/logout/', { refresh }).catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUsuario(null);
    queryClient.clear(); // Limpiar la caché de React Query
    setAbierto(false);
    navigate("/login");
  };

  const nombre = `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim() || usuario.username;
  const titulo = (texto) => (isCollapsed ? texto : undefined);

  return (
    <div className={`sidebar-user ${abierto ? 'is-abierto' : ''}`} ref={ref}>
      <div className="sidebar-user__menu" id="sidebar-user-menu" hidden={!abierto}>
        <button type="button" className="sidebar-user__opcion" onClick={() => ir('/perfil')} title={titulo('Mi Perfil')}>
          <FaUser /><span>Mi Perfil</span>
        </button>
        {usuario.role === 'administrador' && (
          <button type="button" className="sidebar-user__opcion" onClick={() => ir('/gestion-usuarios')} title={titulo('Gestión de Usuarios')}>
            <FaUserShield /><span>Gestión de Usuarios</span>
          </button>
        )}
        <button type="button" className="sidebar-user__opcion sidebar-user__opcion--salir" onClick={cerrarSesion} title={titulo('Cerrar Sesión')}>
          <FaSignOutAlt /><span>Cerrar Sesión</span>
        </button>
      </div>
      <button type="button" className="sidebar-user__tarjeta" onClick={() => setAbierto(v => !v)}
        aria-expanded={abierto} aria-controls="sidebar-user-menu" aria-label={`Cuenta de ${nombre}`} title={titulo(nombre)}>
        <span className="sidebar-user__avatar">{iniciales(usuario.first_name, usuario.last_name) || (usuario.username || '?')[0].toUpperCase()}</span>
        <span className="sidebar-user__datos">
          <strong>{nombre}</strong>
          <small>{usuario.role}</small>
        </span>
        <FaChevronUp className="sidebar-user__flecha" aria-hidden="true" />
      </button>
    </div>
  );
}

// En celular el menú siempre se abre completo, aunque en el computador esté contraído.
const MOVIL = '(max-width: 992px)';
function useMovil() {
  const [movil, setMovil] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(MOVIL).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(MOVIL);
    if (!mq) return undefined;
    const cambiar = () => setMovil(mq.matches);
    mq.addEventListener?.('change', cambiar);
    return () => mq.removeEventListener?.('change', cambiar);
  }, []);
  return movil;
}

function Sidebar({ isOpen, onClose, isCollapsed: colapsadoEscritorio, toggleCollapse }) {
  const movil = useMovil();
  const isCollapsed = colapsadoEscritorio && !movil;

  const hasPermission = usePermissions();

  const navSections = [
    {
      title: "General",
      items: [
        { to: "/", icon: <FaHome />, label: "Inicio", feature: "VER_INICIO", end: true },
        { to: "/ventas", icon: <FaFileInvoiceDollar />, label: "Ventas", feature: "VER_VENTAS" },
        { to: "/ordenes", icon: <FaClipboardList />, label: "Pedidos", feature: "VER_ORDENES" },
        { to: "/telas", icon: <FaScroll />, label: "Telas", feature: "VER_TELAS" },
        { to: "/suministros/remisiones", icon: <FaTruck />, label: "Remisiones", feature: "VER_REMISIONES" },
        { to: "/suministros/inventario", icon: <FaLayerGroup />, label: "Inventario", feature: "VER_INVENTARIO" },
      ]
    },
    {
      title: "Finanzas",
      items: [
        { to: "/caja", icon: <FaCashRegister />, label: "Caja", feature: "ACCESO_CAJA" },
        { to: "/recibos-caja", icon: <FaReceipt />, label: "Recibos de caja", feature: "ACCESO_RECIBOS" },
        { to: "/comprobantes-egreso", icon: <FaReceipt />, label: "Comprobantes de egreso", feature: "ACCESO_EGRESOS" },
        { to: "/suministros/facturas", icon: <FaFileInvoice />, label: "Facturas proveedor", feature: "VER_FACTURAS" },
        { to: "/nomina", icon: <FaFileInvoiceDollar />, label: "Nómina", feature: "VER_NOMINA" },
      ]
    },
    {
      title: "Bases de datos",
      items: [{ to: "/bases-de-datos", icon: <FaBoxes />, label: "Bases de datos", feature: "BASES_DATOS" }]
    },
    {
      title: "Productos",
      items: [
        { to: "/paginaweb/gestion", icon: <FaGlobe />, label: "Gestión web", feature: "GESTION_WEB" },
        { to: "/lista-precios", icon: <FaTags />, label: "Consultar precios", feature: "VER_LISTA_PRECIOS", end: true },
        { to: "/lista-precios/administrar", icon: <FaTags />, label: "Administrar lista", feature: "EDITAR_LISTA_PRECIOS" },
      ]
    },
    {
      title: "IA",
      items: [{ to: "/IA", icon: <FaRobot />, label: "IA Lottus", feature: "ACCESO_OFICINA" }]
    }
  ];

  return (
    <>
      <aside className={`sidebar ${isOpen ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <NavLink to="/" className="logo-link">
            <span className="logo-text">{isCollapsed ? "L" : "LOTTUS"}</span>
          </NavLink>
          <button type="button" className="sidebar-close" onClick={onClose} aria-label="Cerrar menú">
            <FaTimes />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navSections.map(section => {
            const allowedItems = section.items.filter(item => !item.feature || hasPermission(item.feature));

            if (allowedItems.length === 0) return null;

            return (
              <div key={section.title} className="nav-section">
                {!isCollapsed && <h3 className="nav-subtitle">{section.title}</h3>}
                {isCollapsed && <div className="nav-divider"></div>}
                <ul>
                  {allowedItems.map(item => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        onClick={onClose}
                        title={isCollapsed ? item.label : ""}
                      >
                        <div className="nav-icon">{item.icon}</div>
                        {!isCollapsed && <span>{item.label}</span>}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <UsuarioSidebar isCollapsed={isCollapsed} onNavegar={onClose} />
          {/* Desktop Collapse Toggle */}
          <button className="collapse-btn" onClick={toggleCollapse} aria-label={isCollapsed ? 'Expandir menú' : 'Contraer menú'}>
            {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>
      </aside>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}
    </>
  );
}

export default Sidebar;
