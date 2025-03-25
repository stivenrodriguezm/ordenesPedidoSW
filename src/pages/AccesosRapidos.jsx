import { Link } from "react-router-dom";
import { FaFileAlt, FaList, FaUsers, FaBox } from "react-icons/fa";
import "./AccesosRapidos.css";

function AccesosRapidos({ userRole }) {
  const accesos = [
    { nombre: "Crear pedido", ruta: "/ordenes/nuevo", icono: <FaFileAlt />, className: "crear-pedido" },
    { nombre: "Ver pedidos", ruta: "/ordenes", icono: <FaList />, className: "ver-pedidos" },
  ];

  if (userRole === "ADMINISTRADOR" || userRole === "AUXILIAR") {
    accesos.push(
      { nombre: "Proveedores", ruta: "/proveedores", icono: <FaUsers />, className: "proveedores" },
      { nombre: "Referencias", ruta: "/referencias", icono: <FaBox />, className: "referencias" }
    );
  }

  return (
    <div className="accesosRapidos">
      {accesos.map((acceso, index) => (
        <Link
          key={index}
          to={acceso.ruta}
          className={`tarjetaAcceso ${acceso.className}`}
          style={{ animationDelay: `${index * 0.2}s` }}
        >
          <div className="tarjeta-icono">{acceso.icono}</div>
          <p>{acceso.nombre}</p>
        </Link>
      ))}
    </div>
  );
}

export default AccesosRapidos;