import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { FaBoxes, FaClipboardList, FaFileInvoiceDollar, FaHome, FaUsers, FaWarehouse, FaCashRegister, FaReceipt, FaFileInvoice, FaTimes } from 'react-icons/fa';
import { AppContext } from "../AppContext";
import "./Sidebar.css";

function Sidebar({ isOpen, onClose }) {
  const { usuario } = useContext(AppContext);

  const navSections = [
    {
      title: "General",
      items: [
        { to: "/", icon: <FaHome />, label: "Inicio" },
        { to: "/ventas", icon: <FaFileInvoiceDollar />, label: "Ventas" },
        { to: "/ordenes", icon: <FaClipboardList />, label: "Pedidos" },
      ],
      roles: ["administrador", "vendedor", "auxiliar"]
    },
    {
      title: "Finanzas",
      items: [
        { to: "/caja", icon: <FaCashRegister />, label: "Caja" },
        { to: "/recibos-caja", icon: <FaReceipt />, label: "Recibos de Caja" },
        { to: "/comprobantes-egreso", icon: <FaFileInvoice />, label: "Egresos" },
      ],
      roles: ["administrador", "auxiliar"]
    },
    {
      title: "Bases de Datos",
      items: [
        { to: "/clientes", icon: <FaUsers />, label: "Clientes" },
        { to: "/proveedores", icon: <FaWarehouse />, label: "Proveedores" },
        { to: "/referencias", icon: <FaBoxes />, label: "Referencias" },
      ],
      roles: ["administrador", "auxiliar"]
    }
  ];

  return (
    <>
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <NavLink to="/" className="logo-link">LOTTUS</NavLink>
          <button className="sidebar-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <nav className="sidebar-nav">
          {navSections.map(section => (
            (section.roles.includes(usuario?.role.toLowerCase())) && (
              <div key={section.title}>
                <h3 className="nav-subtitle">{section.title}</h3>
                <ul>
                  {section.items.map(item => (
                    <li key={item.to}>
                      <NavLink 
                        to={item.to} 
                        className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
                        onClick={onClose}
                      >
                        <div className="nav-icon">{item.icon}</div>
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ))}
        </nav>
      </aside>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}
    </>
  );
}

export default Sidebar;
