import { Link } from "react-router-dom";
import "./AccesosRapidos.css";

function AccesosRapidos({ userRole }) {
  const accesos = [
    { nombre: "Crear pedido", ruta: "/ordenesPedidoSW/ordenes/nuevo" },
    { nombre: "Ver pedidos", ruta: "/ordenesPedidoSW/ordenes" },
  ];

  if (userRole === "ADMINISTRADOR" || userRole === "AUXILIAR") {
    accesos.push(
      { nombre: "Proveedores", ruta: "/ordenesPedidoSW/proveedores" },
      { nombre: "Referencias", ruta: "/ordenesPedidoSW/referencias" }
    );
  }

  return (
    <div className="accesosRapidos">
      {accesos.map((acceso, index) => (
        <Link key={index} to={acceso.ruta} className="tarjetaAcceso">
          <p>{acceso.nombre}</p>
        </Link>
      ))}
    </div>
  );
}

export default AccesosRapidos;
