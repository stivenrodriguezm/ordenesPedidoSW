import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaSignOutAlt, FaUser } from "react-icons/fa";
import "./Header.css";
import { AppContext } from "../AppContext";

function Header() {
  const { usuario, setUsuario } = useContext(AppContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  const getTitle = () => {
    const path = location.pathname;
    if (path === "/") return "Inicio";
    const title = path.split('/')[1] || 'inicio';
    return title
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setUsuario(null);
    setMenuOpen(false);
    navigate("/login");
  };

  const handleNavigateToProfile = () => {
    navigate("/perfil");
    setMenuOpen(false);
  };

  const getInitials = (name = '', lastName = '') => {
    const firstNameInitial = name ? name[0] : '';
    const lastNameInitial = lastName ? lastName[0] : '';
    return `${firstNameInitial}${lastNameInitial}`.toUpperCase();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h2 className="header-title">{getTitle()}</h2>
        </div>
        
        <div className="header-right">
          {usuario ? (
            <div className="user-menu" ref={menuRef}>
              <button className="user-button" onClick={() => setMenuOpen(prev => !prev)}>
                <div className="user-avatar">
                  <span>{getInitials(usuario.first_name, usuario.last_name)}</span>
                </div>
              </button>
              
              {menuOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">
                    <span className="user-fullname">{`${usuario.first_name} ${usuario.last_name}`}</span>
                    <span className="user-role">{usuario.role}</span>
                  </div>
                  <ul>
                    <li onClick={handleNavigateToProfile}>
                      <FaUser className="dropdown-icon" />
                      <span>Mi Perfil</span>
                    </li>
                    <li onClick={handleLogout} className="logout-item">
                      <FaSignOutAlt className="dropdown-icon" />
                      <span>Cerrar Sesión</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
             <button onClick={() => navigate('/login')} className="login-button">Iniciar Sesión</button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
