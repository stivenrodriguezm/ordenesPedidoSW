import { useState, useEffect, useContext } from "react";
import axios from "axios";
import "./ReferenciasPage.css";
import { CiEdit } from "react-icons/ci";
import { AppContext } from "../AppContext";

function ReferenciasPage() {
  const { proveedores } = useContext(AppContext);
  const [referencias, setReferencias] = useState([]);
  const [referencia, setReferencia] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [refresh, setRefresh] = useState(false); //  Estado ficticio para forzar la re-renderización
  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    const fetchReferencias = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/referencias/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const referenciasWithProveedorName = res.data.map((ref) => {
          const proveedor = proveedores.find((prov) => prov.id === ref.proveedor);
          return { ...ref, proveedor_name: proveedor ? proveedor.nombre_empresa : "Desconocido" };
        });

        setReferencias(referenciasWithProveedorName);
      } catch (error) {
        console.error("Error cargando referencias:", error);
      }
    };

    fetchReferencias();
  }, [token, proveedores, refresh]); //  Dependencia de refresh

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(
          `http://127.0.0.1:8000/api/referencias/${editingId}/`,
          { nombre: referencia, proveedor: proveedorId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          "http://127.0.0.1:8000/api/referencias/",
          { nombre: referencia, proveedor: proveedorId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setReferencia("");
      setProveedorId("");
      setIsEditing(false);
      setEditingId(null);

      const res = await axios.get("http://127.0.0.1:8000/api/referencias/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const referenciasWithProveedorName = res.data.map((ref) => {
        const proveedor = proveedores.find((prov) => prov.id === ref.proveedor);
        return { ...ref, proveedor_name: proveedor ? proveedor.nombre_empresa : "Desconocido" };
      });

      setReferencias(referenciasWithProveedorName);
      setRefresh(!refresh); //  Forzamos la re-renderización
    } catch (error) {
      console.error("Error en la referencia:", error);
    }
  };

  const handleEdit = (referencia) => {
    setReferencia(referencia.nombre);
    setProveedorId(referencia.proveedor);
    setIsEditing(true);
    setEditingId(referencia.id);
  };

  return (
    <div className="referencias-page">
      <main>
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