import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom"; 
import axios from "axios";
import { FaUser } from "react-icons/fa";
import "./Header.css";

function Header() {
  const [user, setUser] = useState({ first_name: "", last_name: "" });
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate(); 
  const menuRef = useRef(null);
  const userBarRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    const fetchUser = async () => {
      try {
        const response = await axios.get("https://api.muebleslottus.com/api/user/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser({
          first_name: response.data.first_name,
          last_name: response.data.last_name,
        });
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login");
  };

  const handleNavigateToProfile = () => {
    navigate("/perfil");
    setMenuOpen(false);
  };

  const getTitle = () => {
    const path = location.hash ? location.hash.replace("#", "") : location.pathname;
  
    if (path.startsWith("/ordenes")) return "Órdenes de pedido";
    if (path.startsWith("/referencias")) return "Referencias";
    if (path.startsWith("/proveedores")) return "Proveedores";
    return "Inicio";
  };

  // Manejar clics fuera del menú o en usuarioBarra para cerrar el menú
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current && !menuRef.current.contains(event.target) &&
        userBarRef.current && !userBarRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div className="barraSuperior">
      <p className="tituloHeader">{getTitle()}</p>
      <div
        className="usuarioBarra"
        ref={userBarRef}
        onClick={() => setMenuOpen((prev) => !prev)}
        style={{ cursor: "pointer" }}
      >
        <p className="usuarioHeader">{`${user.first_name} ${user.last_name}`}</p>
        <FaUser />
      </div>
      {menuOpen && (
        <ul className="menuDesplegable" ref={menuRef}>
          <li onClick={handleNavigateToProfile}>Cambiar Contraseña</li>
          <li onClick={handleLogout}>Cerrar Sesión</li>
        </ul>
      )}
    </div>
  );
}

export default Header;
