import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { FaBoxes, FaClipboardList, FaFileInvoiceDollar, FaHome, FaUsers, FaWarehouse, FaCashRegister, FaReceipt, FaFileInvoice, FaTimes, FaChevronLeft, FaChevronRight, FaScroll, FaBoxOpen, FaTruck, FaLayerGroup } from 'react-icons/fa';
import { AppContext, usePermissions } from "../AppContext";
import "./Sidebar.css";

function Sidebar({ isOpen, onClose, isCollapsed, toggleCollapse }) {
  const { usuario } = useContext(AppContext);
  const hasPermission = usePermissions();

  const navSections = [
    {
      title: "General",
      items: [
        { to: "/", icon: <FaHome />, label: "Inicio", feature: "VER_INICIO" },
        { to: "/ventas", icon: <FaFileInvoiceDollar />, label: "Ventas", feature: "VER_VENTAS" },
        { to: "/ordenes", icon: <FaClipboardList />, label: "Pedidos", feature: "VER_ORDENES" },
        { to: "/telas", icon: <FaScroll />, label: "Telas", feature: "VER_TELAS" },
      ]
    },
    {
      title: "Finanzas",
      items: [
        { to: "/caja", icon: <FaCashRegister />, label: "Caja", feature: "VER_CAJA" },
        { to: "/recibos-caja", icon: <FaReceipt />, label: "Recibos de Caja", feature: "VER_CAJA" },
        { to: "/comprobantes-egreso", icon: <FaFileInvoice />, label: "Egresos", feature: "VER_CAJA" },
      ]
    },
    {
      title: "Bases de Datos",
      items: [
        { to: "/clientes", icon: <FaUsers />, label: "Clientes", feature: "VER_CLIENTES" },
        { to: "/proveedores", icon: <FaWarehouse />, label: "Proveedores", feature: "VER_PROVEEDORES" },
        { to: "/referencias", icon: <FaBoxes />, label: "Referencias", feature: "VER_REFERENCIAS" },
      ]
    },
    {
      title: "Suministros",
      items: [
        { to: "/suministros/facturas", icon: <FaFileInvoice />, label: "Facturas Proveedor", feature: "VER_FACTURAS" },
        { to: "/suministros/remisiones", icon: <FaTruck />, label: "Remisiones", feature: "VER_REMISIONES" },
        { to: "/suministros/inventario", icon: <FaLayerGroup />, label: "Inventario", feature: "VER_INVENTARIO" },
        { to: "/suministros/grupos", icon: <FaBoxOpen />, label: "Grupos", feature: "VER_INVENTARIO" },
      ]
    }
  ];

  return (
    <>
      <aside className={`sidebar ${isOpen ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <NavLink to="/" className="logo-link">
            {isCollapsed ? "L" : "LOTTUS"}
          </NavLink>
          <button className="sidebar-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navSections.map(section => {
            const allowedItems = section.items.filter(item => hasPermission(item.feature));

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

        {/* Desktop Collapse Toggle */}
        <div className="sidebar-footer">
          <button className="collapse-btn" onClick={toggleCollapse}>
            {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>
      </aside>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}
    </>
  );
}

export default Sidebar;
