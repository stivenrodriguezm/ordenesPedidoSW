import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./ReferenciasPage.css";
import { FaCircleUser } from "react-icons/fa6";
import { CiEdit } from "react-icons/ci";

function ReferenciasPage() {
  const [referencias, setReferencias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [referencia, setReferencia] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [user, setUser] = useState({ first_name: "", last_name: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
  
    const fetchUser = async () => {
      const cachedUser = sessionStorage.getItem("user");
      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
      } else {
        try {
          const response = await axios.get("https://api.muebleslottus.com/api/user/", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const userData = {
            first_name: response.data.first_name,
            last_name: response.data.last_name,
          };
          sessionStorage.setItem("user", JSON.stringify(userData));
          setUser(userData);
        } catch (error) {
          console.error("Error fetching user info:", error);
        }
      }
    };
  
    const fetchProveedores = async () => {
      const cachedProveedores = sessionStorage.getItem("proveedores");
      if (cachedProveedores) {
        setProveedores(JSON.parse(cachedProveedores));
      } else {
        try {
          const response = await axios.get(
            "https://api.muebleslottus.com/api/proveedores/",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          sessionStorage.setItem("proveedores", JSON.stringify(response.data));
          setProveedores(response.data);
        } catch (error) {
          console.error("Error fetching providers:", error);
        }
      }
    };
  
    const fetchReferencias = async () => {
      const cachedReferencias = sessionStorage.getItem("referencias");
      if (cachedReferencias) {
        setReferencias(JSON.parse(cachedReferencias));
      } else {
        try {
          const response = await axios.get(
            "https://api.muebleslottus.com/api/referencias/",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
  
          const referenciasWithProveedorName = response.data.map((ref) => {
            const proveedor = proveedores.find((prov) => prov.id === ref.proveedor);
            return {
              ...ref,
              proveedor_name: proveedor ? proveedor.nombre_empresa : "Desconocido",
            };
          });
  
          sessionStorage.setItem("referencias", JSON.stringify(referenciasWithProveedorName));
          setReferencias(referenciasWithProveedorName);
        } catch (error) {
          console.error("Error fetching references:", error);
        }
      }
    };
  
    const fetchData = async () => {
      await fetchProveedores();
      await fetchReferencias();
      await fetchUser();
    };
  
    fetchData();
  }, []);  

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken");

    try {
      if (isEditing) {
        // Editar referencia existente
        await axios.put(
          `https://api.muebleslottus.com/api/referencias/${editingId}/`,
          {
            nombre: referencia,
            proveedor: proveedorId,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } else {
        // Crear nueva referencia
        await axios.post(
          "https://api.muebleslottus.com/api/referencias/",
          {
            nombre: referencia,
            proveedor: proveedorId,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      // Reiniciar formulario y recargar referencias
      setReferencia("");
      setProveedorId("");
      setIsEditing(false);
      setEditingId(null);

      const updatedReferencias = await axios.get(
        "https://api.muebleslottus.com/api/referencias/",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setReferencias(updatedReferencias.data);
    } catch (error) {
      console.error("Error handling reference:", error);
    }
  };

  const handleEdit = (referencia) => {
    setReferencia(referencia.nombre);
    setProveedorId(referencia.proveedor); // Establece correctamente el proveedor asociado
    setIsEditing(true);
    setEditingId(referencia.id);
  };

  return (
    <div className="referencias-page">
      <Sidebar />
      <main>
        <div className="barraSuperior">
          <h1>Referencias</h1>
          <div className="usuarioBarra">
            <p>{`${user.first_name} ${user.last_name}`}</p>
            <FaCircleUser />
          </div>
        </div>
        <form className="formReferencias" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Referencia"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            required
          />
          <select
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            required
          >
            <option value="">Selecciona un proveedor</option>
            {proveedores.map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.nombre_empresa}
              </option>
            ))}
          </select>
          <button type="submit">
            {isEditing ? "Editar referencia" : "Agregar referencia"}
          </button>
        </form>
        <table className="tablaReferencias">
          <thead>
            <tr>
              <th>Referencia</th>
              <th>Proveedor</th>
              <th>Editar</th>
            </tr>
          </thead>
          <tbody>
            {referencias.map((referencia) => (
              <tr key={referencia.id}>
                <td>{referencia.nombre}</td>
                <td>{referencia.proveedor_name}</td>
                <td className="editarIcono">
                  <button
                    type="button"
                    onClick={() => handleEdit(referencia)}
                    className="editButton"
                  >
                    <CiEdit />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}

export default ReferenciasPage;


