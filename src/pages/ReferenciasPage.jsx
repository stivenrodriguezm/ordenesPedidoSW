import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./ReferenciasPage.css";
import { CiEdit } from "react-icons/ci";

function ReferenciasPage() {
  const [referencias, setReferencias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [referencia, setReferencia] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const [proveedoresRes, referenciasRes] = await Promise.all([
          axios.get("https://api.muebleslottus.com/api/proveedores/", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("https://api.muebleslottus.com/api/referencias/", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setProveedores(proveedoresRes.data);
        
        const referenciasWithProveedorName = referenciasRes.data.map((ref) => {
          const proveedor = proveedoresRes.data.find((prov) => prov.id === ref.proveedor);
          return { ...ref, proveedor_name: proveedor ? proveedor.nombre_empresa : "Desconocido" };
        });

        setReferencias(referenciasWithProveedorName);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Manejo de formulario
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken");

    try {
      if (isEditing) {
        await axios.put(
          `https://api.muebleslottus.com/api/referencias/${editingId}/`,
          { nombre: referencia, proveedor: proveedorId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          "https://api.muebleslottus.com/api/referencias/",
          { nombre: referencia, proveedor: proveedorId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setReferencia("");
      setProveedorId("");
      setIsEditing(false);
      setEditingId(null);
      
      // Recargar referencias
      const referenciasRes = await axios.get("https://api.muebleslottus.com/api/referencias/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setReferencias(referenciasRes.data);
    } catch (error) {
      console.error("Error handling reference:", error);
    }
  }, [isEditing, editingId, referencia, proveedorId]);

  const handleEdit = useCallback((referencia) => {
    setReferencia(referencia.nombre);
    setProveedorId(referencia.proveedor);
    setIsEditing(true);
    setEditingId(referencia.id);
  }, []);

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


