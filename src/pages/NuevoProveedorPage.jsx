import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./NuevoProveedorPage.css";
import { FaCircleUser } from "react-icons/fa6";

function NuevoProveedorPage() {
  const [empresa, setEmpresa] = useState("");
  const [encargado, setEncargado] = useState("");
  const [contacto, setContacto] = useState("");
  const navigate = useNavigate();

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
