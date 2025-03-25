import { useState, useEffect, useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./NuevoProveedorPage.css";
import { AppContext } from "../AppContext";

function EditarProveedorPage() {
  const { id } = useParams();
  const [empresa, setEmpresa] = useState("");
  const [encargado, setEncargado] = useState("");
  const [contacto, setContacto] = useState("");
  const navigate = useNavigate();
  const { updateProveedores } = useContext(AppContext);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    const fetchProveedor = async () => {
      try {
        const response = await axios.get(
          `https://api.muebleslottus.com/api/proveedores/${id}/`,
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
        `https://api.muebleslottus.com/api/proveedores/${id}/`,
        {
          nombre_empresa: empresa,
          nombre_encargado: encargado,
          contacto: contacto,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await updateProveedores();
      navigate("/ordenesPedidoSW/proveedores");
    } catch (error) {
      console.error("Error updating provider:", error);
    }
  };

  return (
    <div className="nuevo-proveedor-page">
      <form className="formNuevoProveedor" onSubmit={handleSubmit}>
        <h1>Editar Proveedor</h1>

        <label className="labelNuevoProveedor">
          <span>Empresa:</span>
          <input
            type="text"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            required
          />
        </label>

        <label className="labelNuevoProveedor">
          <span>Encargado:</span>
          <input
            type="text"
            value={encargado}
            onChange={(e) => setEncargado(e.target.value)}
            required
          />
        </label>

        <label className="labelNuevoProveedor">
          <span>Contacto:</span>
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
    </div>
  );
}

export default EditarProveedorPage;