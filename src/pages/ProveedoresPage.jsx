import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Para la redirección
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./ProveedoresPage.css";
import { FaCircleUser } from "react-icons/fa6";
import { CiEdit } from "react-icons/ci";

function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [user, setUser] = useState({ first_name: "", last_name: "" });
  const navigate = useNavigate(); // Hook para redirección

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

    const fetchProveedores = async () => {
      try {
        const response = await axios.get(
          "https://147.93.43.111:8000/api/proveedores/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setProveedores(response.data);
      } catch (error) {
        console.error("Error fetching providers:", error);
      }
    };

    fetchUser();
    fetchProveedores();
  }, []);

  return (
    <div className="proveedores-page">
      <Sidebar />
      <main>
        <div className="barraSuperior">
          <h1>Proveedores</h1>
          <div className="usuarioBarra">
            <p>{`${user.first_name} ${user.last_name}`}</p>
            <FaCircleUser />
          </div>
        </div>
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
                <th>ID</th>
                <th>Empresa</th>
                <th>Encargado</th>
                <th>Contacto</th>
                <th>Editar</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((proveedor) => (
                <tr key={proveedor.id}>
                  <td>{proveedor.id}</td>
                  <td>{proveedor.nombre_empresa}</td>
                  <td>{proveedor.nombre_encargado}</td>
                  <td>{proveedor.contacto}</td>
                  <td className="editarIcono">
                    <a href={`/editar-proveedor/${proveedor.id}`}>
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
