import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./NuevoProveedorPage.css";
import { AppContext } from "../AppContext";

function NuevoProveedorPage() {
  const [empresa, setEmpresa] = useState("");
  const [encargado, setEncargado] = useState("");
  const [contacto, setContacto] = useState("");
  const navigate = useNavigate();
  const { updateProveedores } = useContext(AppContext);

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
      await updateProveedores();
      navigate("/proveedores");
    } catch (error) {
      console.error("Error creating provider:", error);
    }
  };

  return (
    <div className="nuevo-proveedor-page">
      <form className="formNuevoProveedor" onSubmit={handleSubmit}>
        <h1>Nuevo Proveedor</h1>
  
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
          <button type="submit">Agregar</button>
          <button type="button" onClick={() => navigate("/proveedores")}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default NuevoProveedorPage;
