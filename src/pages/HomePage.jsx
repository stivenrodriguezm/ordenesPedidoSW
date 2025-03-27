import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../AppContext";
import AccesosRapidos from "./AccesosRapidos";
import "./HomePage.css";

function HomePage() {
  const { usuario } = useContext(AppContext);
  const navigate = useNavigate();

  // Validar si hay token y usuario
  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    // Si no hay token, redirigir a /login inmediatamente
    if (!token) {
      navigate("/login");
      return;
    }

    // Si hay token pero usuario es null, esperar a que se cargue
    // Si usuario sigue siendo null después de la solicitud, redirigir a /login
    if (token && !usuario) {
      const checkUser = async () => {
        try {
          const res = await fetch("https://api.muebleslottus.com/api/user/", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            throw new Error("No autorizado");
          }
        } catch (error) {
          console.error("Error verificando usuario:", error);
          localStorage.removeItem("accessToken"); // Limpiar token inválido
          navigate("/login");
        }
      };
      checkUser();
    }
  }, [usuario, navigate]);

  // Si no hay usuario, no renderizar nada mientras se valida
  if (!usuario) {
    return null; // O puedes mostrar un componente de carga: <div>Cargando...</div>
  }

  // Si el usuario está autenticado, renderizar el contenido
  return (
    <div className="homepage">
      <AccesosRapidos userRole={usuario?.role} />
    </div>
  );
}

export default HomePage;