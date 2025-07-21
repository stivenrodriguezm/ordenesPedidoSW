import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { FaBoxes, FaClipboardList, FaFileInvoiceDollar, FaHome, FaUsers, FaWarehouse, FaCashRegister, FaReceipt, FaFileInvoice } from 'react-icons/fa';
import { AppContext } from "../AppContext";
import "./Sidebar.css";

function Sidebar() {
  const { usuario } = useContext(AppContext);

  const navSections = [
    {
      title: "General",
      items: [
        { to: "/", icon: <FaHome />, label: "Inicio" },
        { to: "/ventas", icon: <FaFileInvoiceDollar />, label: "Ventas" },
        { to: "/ordenes", icon: <FaClipboardList />, label: "Pedidos" },
      ],
      roles: ["ADMINISTRADOR", "VENDEDOR", "AUXILIAR"]
    },
    {
      title: "Finanzas",
      items: [
        { to: "/caja", icon: <FaCashRegister />, label: "Caja" },
        { to: "/recibos-caja", icon: <FaReceipt />, label: "Recibos de Caja" },
        { to: "/comprobantes-egreso", icon: <FaFileInvoice />, label: "Egresos" },
      ],
      roles: ["ADMINISTRADOR", "AUXILIAR"]
    },
    {
      title: "Bases de Datos",
      items: [
        { to: "/clientes", icon: <FaUsers />, label: "Clientes" },
        { to: "/proveedores", icon: <FaWarehouse />, label: "Proveedores" },
        { to: "/referencias", icon: <FaBoxes />, label: "Referencias" },
      ],
      roles: ["ADMINISTRADOR", "AUXILIAR"]
    }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <NavLink to="/" className="logo-link">LOTTUS</NavLink>
      </div>
      <nav className="sidebar-nav">
        {navSections.map(section => (
          (section.roles.includes(usuario?.role)) && (
            <div key={section.title}>
              <h3 className="nav-subtitle">{section.title}</h3>
              <ul>
                {section.items.map(item => (
                  <li key={item.to}>
                    <NavLink to={item.to} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
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
  );
}

export default Sidebar;
