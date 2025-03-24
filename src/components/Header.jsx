import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom"; 
import axios from "axios";
import { FaCircleUser } from "react-icons/fa6";

function Header() {
  const [user, setUser] = useState({ first_name: "", last_name: "" });
  const location = useLocation();
  const navigate = useNavigate(); 

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

  // Determinar el título según la ruta actual en HashRouter
  const getTitle = () => {
    const path = location.hash ? location.hash.replace("#", "") : location.pathname;
    console.log("Final path used:", path);
  
    if (path.startsWith("/ordenes")) return "Órdenes de pedido";
    if (path.startsWith("/referencias")) return "Referencias";
    if (path.startsWith("/proveedores")) return "Proveedores";
    return "Inicio";
  };
  

  return (
    <div className="barraSuperior">
      <h1>{getTitle()}</h1>
      <div className="usuarioBarra" onClick={() => navigate("/perfil")} style={{ cursor: "pointer" }}>
        <p>{`${user.first_name} ${user.last_name}`}</p>
        <FaCircleUser />
      </div>
    </div>
  );
}

export default Header;
