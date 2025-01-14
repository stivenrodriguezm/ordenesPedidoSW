import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Para la redirección
import axios from "axios";
import "./ProveedoresPage.css";
import { CiEdit } from "react-icons/ci";

function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const navigate = useNavigate(); // Hook para redirección

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    const fetchProveedores = async () => {
      try {
        const response = await axios.get(
          "https://api.muebleslottus.com/api/proveedores/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setProveedores(response.data);
      } catch (error) {
        console.error("Error fetching providers:", error);
      }
    };

    fetchProveedores();
  }, []);

  return (
    <div className="proveedores-page">
      <main>
        <div className="principal">
          <button
            className="nuevoProveedorBtn"
            onClick={() => navigate("/nuevo-proveedor")}
          >
            Nuevo proveedor
          </button>
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
              {proveedores.map((proveedor) => (
                <tr key={proveedor.id}>
                  <td>{proveedor.nombre_empresa}</td>
                  <td>{proveedor.nombre_encargado}</td>
                  <td>{proveedor.contacto}</td>
                  <td className="editarIcono">
                    <a href={`/ordenesPedidoSW/editar-proveedor/${proveedor.id}`}>
                      <CiEdit />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default ProveedoresPage;
