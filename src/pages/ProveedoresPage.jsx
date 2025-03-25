import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./ProveedoresPage.css";
import { CiEdit } from "react-icons/ci";
import { Link } from "react-router-dom";

function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("accessToken");

  const fetchProveedores = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("https://api.muebleslottus.com/api/proveedores/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProveedores(response.data);
    } catch (error) {
      console.error("Error fetching providers:", error);
      setError("Error al cargar los proveedores. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProveedores();
  }, []);

  return (
    <div className="proveedores-page">
      <main>
        <div className="botonesContainer">
          <button
            className="nuevoProveedorBtn"
            onClick={() => navigate("/proveedores/nuevo")}
            aria-label="Agregar nuevo proveedor">
            Nuevo Proveedor
          </button>
        </div>

        <div className="tabla-contenedor">
          <table className="tablaProveedores">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Encargado</th>
                <th>Contacto</th>
                <th>Editar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="loading-container">
                    <div className="loader"></div>
                    <p>Cargando proveedores...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="4" className="error">{error}</td>
                </tr>
              ) : proveedores.length > 0 ? (
                proveedores.map((proveedor) => (
                  <tr key={proveedor.id}>
                    <td>{proveedor.nombre_empresa || "N/A"}</td>
                    <td>{proveedor.nombre_encargado || "N/A"}</td>
                    <td>{proveedor.contacto || "N/A"}</td>
                    <td className="editarIcono">
                      <Link to={`/proveedores/editar/${proveedor.id}`} aria-label="Editar proveedor">
                        <CiEdit />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No hay proveedores disponibles</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default ProveedoresPage;