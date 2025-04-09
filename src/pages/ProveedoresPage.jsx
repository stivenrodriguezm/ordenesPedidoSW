// src/pages/ProveedoresPage.jsx
import { useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./ProveedoresPage.css";
import { CiEdit } from "react-icons/ci";
import { AppContext } from "../AppContext";

function ProveedoresPage() {
  const { proveedores, isLoading: contextLoading } = useContext(AppContext);
  const navigate = useNavigate();

  if (contextLoading) {
    return (
      <div className="proveedores-page">
        <main>
          <div className="loading-container">
            <div className="loader"></div>
            <p>Cargando proveedores...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="proveedores-page">
      <main>
        <div className="botonesContainer">
          <button
            className="nuevoProveedorBtn"
            onClick={() => navigate("/proveedores/nuevo")}
            aria-label="Agregar nuevo proveedor"
          >
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
              {proveedores.length > 0 ? (
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