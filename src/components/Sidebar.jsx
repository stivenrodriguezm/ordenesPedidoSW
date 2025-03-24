import { Link, useNavigate } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem("userRole");

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <h1><Link to="/">LOTTUS</Link></h1>
      <nav>
        <ul>
          <li>
            <Link to="/ordenes">Órdenes de Pedido</Link>
          </li>
          {(userRole === "ADMINISTRADOR" || userRole === "AUXILIAR") && (
            <>
              <li>
                <Link to="/referencias">Referencias</Link>
              </li>
              <li>
                <Link to="/proveedores">Proveedores</Link>
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
