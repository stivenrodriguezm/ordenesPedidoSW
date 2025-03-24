import { Link } from "react-router-dom";
import "./AccesosRapidos.css";

function AccesosRapidos({ userRole }) {
  const accesos = [
    { nombre: "Crear pedido", ruta: "/ordenes/nuevo" },
    { nombre: "Ver pedidos", ruta: "/ordenes" },
  ];

  if (userRole === "ADMINISTRADOR" || userRole === "AUXILIAR") {
    accesos.push(
      { nombre: "Proveedores", ruta: "/proveedores" },
      { nombre: "Referencias", ruta: "/referencias" }
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
