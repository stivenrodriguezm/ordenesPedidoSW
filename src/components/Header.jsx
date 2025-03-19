import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom"; 
import axios from "axios";
import { FaCircleUser } from "react-icons/fa6";

function Header() {
  const [user, setUser] = useState({ first_name: "", last_name: "" });
  const location = useLocation();
  const navigate = useNavigate(); // Permite redirigir a otra página

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    const fetchUser = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/user/", {
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

  // Determinar el título según la ruta actual
  const getTitle = () => {
    if (location.pathname.includes("/ordenesPedidoSW/ordenes")) return "Órdenes de pedido";
    if (location.pathname.includes("/ordenesPedidoSW/referencias")) return "Referencias";
    if (location.pathname.includes("/ordenesPedidoSW/proveedores")) return "Proveedores";
    return "Inicio";
  };

  return (
    <div className="barraSuperior">
      <h1>{getTitle()}</h1>
      <div className="usuarioBarra" onClick={() => navigate("/ordenesPedidoSW/perfil")} style={{ cursor: "pointer" }}>
        <p>{`${user.first_name} ${user.last_name}`}</p>
        <FaCircleUser />
      </div>
    </div>
  );
}

export default Header;
