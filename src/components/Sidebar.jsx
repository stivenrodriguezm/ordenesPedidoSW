import { Link, useNavigate } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  const handleLogout = () => {
    localStorage.clear(); // Elimina todos los tokens y datos
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <h1>LOTTUS</h1>
      <nav>
        <ul>
          <li>
            <Link to="//">Órdenes de Pedido</Link>
          </li>
          {isAdmin && (
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
