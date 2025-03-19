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
      const response = await axios.get("http://127.0.0.1:8000/api/proveedores/", {
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
        <div className="principal">
          <button
            className="nuevoProveedorBtn"
            onClick={() => navigate("/ordenesPedidoSW/proveedores/nuevo")}
            aria-label="Agregar nuevo proveedor"
          >
            Nuevo proveedor
          </button>

          {loading ? (
            <p>Cargando proveedores...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : (
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
                {proveedores.length > 0 ? (
                  proveedores.map((proveedor) => (
                    <tr key={proveedor.id}>
                      <td>{proveedor.nombre_empresa || "N/A"}</td>
                      <td>{proveedor.nombre_encargado || "N/A"}</td>
                      <td>{proveedor.contacto || "N/A"}</td>
                      <td className="editarIcono">
                        <Link to={`/ordenesPedidoSW/proveedores/editar/${proveedor.id}`} aria-label="Editar proveedor">
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
          )}
        </div>
      </main>
    </div>
  );
}

export default ProveedoresPage;
