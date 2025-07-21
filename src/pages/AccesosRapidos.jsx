import { Link } from "react-router-dom";
import { FaPlus, FaBoxOpen, FaCashRegister, FaReceipt, FaSignOutAlt } from "react-icons/fa";
import "./AccesosRapidos.css";

const AccesoRapidoCard = ({ to, icon, title, description, className }) => (
  <Link to={to} className={`acceso-rapido-card ${className || ''}`}>
    <div className="acceso-rapido-icon">{icon}</div>
    <div className="acceso-rapido-info">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  </Link>
);

function AccesosRapidos() {
  const accesos = [
    { to: "/nuevaVenta", icon: <FaPlus />, title: "Crear Venta", description: "Registra una nueva venta.", className: "ventas" },
    { to: "/ordenes/nuevo", icon: <FaBoxOpen />, title: "Crear Pedido", description: "Genera una nueva orden de pedido.", className: "crear-pedido" },
    { to: "/caja?action=create", icon: <FaCashRegister />, title: "Movimiento Caja", description: "Registra un movimiento de caja.", className: "caja" },
    { to: "/recibos-caja?action=create", icon: <FaReceipt />, title: "Recibo de Caja", description: "Genera un nuevo recibo de caja.", className: "recibos" },
    { to: "/comprobantes-egreso?action=create", icon: <FaSignOutAlt />, title: "Comprobante de Egreso", description: "Genera un nuevo comprobante de egreso.", className: "egresos" },
  ];

  return (
    <div className="accesos-rapidos-grid">
      {accesos.map((acceso, index) => (
        <AccesoRapidoCard key={index} {...acceso} />
      ))}
    </div>
  );
}

export default AccesosRapidos;

