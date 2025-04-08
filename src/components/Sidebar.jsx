import { Link, useNavigate } from "react-router-dom";
import "./Sidebar.css";
import { FiGitPullRequest } from "react-icons/fi";
import { MdRoomPreferences } from "react-icons/md";
import { GrUserWorker } from "react-icons/gr";

function Sidebar() {
  const userRole = localStorage.getItem("userRole");

  return (
    <div className="sidebar">
      <h1><Link to="/">LOTTUS</Link></h1>
      <nav>
        <ul>
          <li>
            <Link to="/ordenes"><FiGitPullRequest /><p>Órdenes de Pedido</p></Link>
          </li>
          {(userRole === "ADMINISTRADOR" || userRole === "AUXILIAR") && (
            <>
              <li>
                <Link to="/referencias"><MdRoomPreferences /> <p>Referencias</p></Link>
              </li>
              <li>
                <Link to="/proveedores"><GrUserWorker /><p>Proveedores</p> </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </div>
  );
}

export default Sidebar;