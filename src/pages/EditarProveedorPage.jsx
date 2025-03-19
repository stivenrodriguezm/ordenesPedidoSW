import { useState, useEffect, useContext } from "react"; // Importamos useContext
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./NuevoProveedorPage.css";
import { AppContext } from "../AppContext"; // Importamos AppContext

function EditarProveedorPage() {
  const { id } = useParams();
  const [empresa, setEmpresa] = useState("");
  const [encargado, setEncargado] = useState("");
  const [contacto, setContacto] = useState("");
  const navigate = useNavigate();
  const { updateProveedores } = useContext(AppContext); // Usamos updateProveedores del Contexto

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    const fetchProveedor = async () => {
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/api/proveedores/${id}/`,
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

    fetchProveedor();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken");

    try {
      await axios.put(
        `http://127.0.0.1:8000/api/proveedores/${id}/`,
        {
          nombre_empresa: empresa,
          nombre_encargado: encargado,
          contacto: contacto,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await updateProveedores(); // Actualizamos el AppContext después de editar el proveedor
      navigate("/ordenesPedidoSW/proveedores");
    } catch (error) {
      console.error("Error updating provider:", error);
    }
  };

  return (
    <div className="nuevo-proveedor-page">
      <main>
        <form className="formNuevoProveedor" onSubmit={handleSubmit}>
          <label className="labelNuevoProveedor">
            Empresa:
            <input
              type="text"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              required
            />
          </label>
          <label className="labelNuevoProveedor">
            Encargado:
            <input
              type="text"
              value={encargado}
              onChange={(e) => setEncargado(e.target.value)}
              required
            />
          </label>
          <label className="labelNuevoProveedor">
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
            <button type="button" onClick={() => navigate("/ordenesPedidoSW/proveedores")}>
              Cancelar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default EditarProveedorPage;