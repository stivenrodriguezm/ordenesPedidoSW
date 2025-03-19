import { Link, useNavigate } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem("userRole");

  const handleLogout = () => {
    localStorage.clear(); // Elimina todos los tokens y datos
    sessionStorage.clear();
    navigate("/ordenesPedidoSW/login");
  };

  return (
    <div className="sidebar">
      <h1><Link to="/">LOTTUS</Link></h1>
      <nav>
        <ul>
          <li>
            <Link to="/ordenesPedidoSW/ordenes">Órdenes de Pedido</Link>
          </li>
          {(userRole === "ADMINISTRADOR" || userRole === "AUXILIAR") && (
            <>
              <li>
                <Link to="/ordenesPedidoSW/referencias">Referencias</Link>
              </li>
              <li>
                <Link to="/ordenesPedidoSW/proveedores">Proveedores</Link>
              </li>
            </>
          )}
        </ul>
      </nav>
      <button onClick={handleLogout}>Salir</button>
    </div>
  );
}

export default Sidebar;
