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
  const [refresh, setRefresh] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Estado para el loader
  const token = localStorage.getItem("accessToken");

  // Peticion a API para obtener referencias en cada renderizado
  useEffect(() => {
    const fetchReferencias = async () => {
      try {
        setIsLoading(true); // Activar el loader
        const res = await axios.get("https://api.muebleslottus.com/api/referencias/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const referenciasWithProveedorName = res.data.map((ref) => {
          const proveedor = proveedores.find((prov) => prov.id === ref.proveedor);
          return { ...ref, proveedor_name: proveedor ? proveedor.nombre_empresa : "Desconocido" };
        });

        setReferencias(referenciasWithProveedorName);
      } catch (error) {
        console.error("Error cargando referencias:", error);
      } finally {
        setIsLoading(false); // Desactivar el loader
      }
    };

    fetchReferencias();
  }, [token, proveedores, refresh]);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      setRefresh(!refresh);
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
        <form className="form-referencias" onSubmit={handleSubmit}>
          <div className="form-group-refs">
            <label>Referencia:</label>
            <input
              type="text"
              className="referenciaInput"
              placeholder="Referencia"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              required
            />
          </div>
          <div className="form-group-refs">
            <label>Proveedor:</label>
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
          </div>
          <button type="submit" className="btn-primary">
            {isEditing ? "Editar" : "Agregar"}
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
            {isLoading ? (
              <tr>
                <td colSpan="3" className="loading-container">
                  <div className="loader"></div>
                  <p>Cargando Referencias...</p>
                </td>
              </tr>
            ) : referencias.length === 0 ? (
              <tr>
                <td colSpan="3" className="no-data-message">
                  No hay referencias disponibles.
                </td>
              </tr>
            ) : (
              referencias.map((referencia) => (
                <tr key={referencia.id}>
                  <td>{referencia.nombre}</td>
                  <td>{referencia.proveedor_name}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleEdit(referencia)}
                      className="btn-edit"
                    >
                      <CiEdit />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </main>
    </div>
  );
}

export default ReferenciasPage;