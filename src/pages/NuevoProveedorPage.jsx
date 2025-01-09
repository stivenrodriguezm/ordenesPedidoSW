import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./NuevoProveedorPage.css";
import { FaCircleUser } from "react-icons/fa6";

function NuevoProveedorPage() {
  const [empresa, setEmpresa] = useState("");
  const [encargado, setEncargado] = useState("");
  const [contacto, setContacto] = useState("");
  const [user, setUser] = useState({ first_name: "", last_name: "" }); // Estado para el usuario logueado
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    // Obtener información del usuario
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken");

    try {
      await axios.post(
        "https://api.muebleslottus.com/api/proveedores/",
        {
          nombre_empresa: empresa,
          nombre_encargado: encargado,
          contacto: contacto,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      navigate("/proveedores"); // Redirige a la página de proveedores
    } catch (error) {
      console.error("Error creating provider:", error);
    }
  };

  return (
    <div className="nuevo-proveedor-page">
      <Sidebar />
      <main>
        <div className="barraSuperior">
          <h1>Nuevo proveedor</h1>
          <div className="usuarioBarra">
            <p>{`${user.first_name} ${user.last_name}`}</p>
            <FaCircleUser />
          </div>
        </div>
        <form className="formNuevoProveedor" onSubmit={handleSubmit}>
          <label>
            Empresa:
            <input
              type="text"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              required
            />
          </label>
          <label>
            Encargado:
            <input
              type="text"
              value={encargado}
              onChange={(e) => setEncargado(e.target.value)}
              required
            />
          </label>
          <label>
            Contacto:
            <input
              type="text"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              required
            />
          </label>
          <div className="buttons">
            <button type="submit">Enviar</button>
            <button type="button" onClick={() => navigate("/proveedores")}>
              Cancelar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default NuevoProveedorPage;
