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
      try {
        const response = await axios.get("https://api.muebleslottus.com/api/user/", {
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

    const fetchReferencias = async () => {
      try {
        const response = await axios.get(
          "https://api.muebleslottus.com/api/referencias/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Mapear las referencias para incluir el nombre del proveedor
        const referenciasWithProveedorName = response.data.map((ref) => {
          const proveedor = proveedores.find((prov) => prov.id === ref.proveedor);
          return {
            ...ref,
            proveedor_name: proveedor ? proveedor.nombre_empresa : "Desconocido",
          };
        });

        setReferencias(referenciasWithProveedorName);
      } catch (error) {
        console.error("Error fetching references:", error);
      }
    };

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

    const fetchData = async () => {
      await fetchProveedores();
      await fetchReferencias();
      await fetchUser();
    };

    fetchData();
  }, [proveedores]);

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


