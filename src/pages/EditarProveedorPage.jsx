import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom"; // Para redirección y obtención de parámetros
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./NuevoProveedorPage.css";
import { FaCircleUser } from "react-icons/fa6";

function EditarProveedorPage() {
  const { id } = useParams(); // Obtiene el ID del proveedor desde la URL
  const [empresa, setEmpresa] = useState("");
  const [encargado, setEncargado] = useState("");
  const [contacto, setContacto] = useState("");
  const [user, setUser] = useState({ first_name: "", last_name: "" });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    const fetchUser = async () => {
      try {
        const response = await axios.get("https://147.93.43.111:8000/api/user/", {
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

    const fetchProveedor = async () => {
      try {
        const response = await axios.get(
          `https://147.93.43.111:8000/api/proveedores/${id}/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setEmpresa(response.data.nombre_empresa);
        setEncargado(response.data.nombre_encargado);
        setContacto(response.data.contacto);
      } catch (error) {
        console.error("Error fetching provider:", error);
      }
    };

    fetchUser();
    fetchProveedor();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken");

    try {
      await axios.put(
        `https://147.93.43.111:8000/api/proveedores/${id}/`,
        {
          nombre_empresa: empresa,
          nombre_encargado: encargado,
          contacto: contacto,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      navigate("/proveedores");
    } catch (error) {
      console.error("Error updating provider:", error);
    }
  };

  return (
    <div className="nuevo-proveedor-page">
      <Sidebar />
      <main>
        <div className="barraSuperior">
          <h1>Editar proveedor</h1>
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
            <button type="submit">Guardar cambios</button>
            <button type="button" onClick={() => navigate("/proveedores")}>
              Cancelar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default EditarProveedorPage;
