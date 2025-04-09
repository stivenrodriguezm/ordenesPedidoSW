// src/pages/ReferenciasPage.jsx
import { useState, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../services/api";
import "./ReferenciasPage.css";
import { CiEdit } from "react-icons/ci";
import { AppContext } from "../AppContext";

function ReferenciasPage() {
  const { proveedores, isLoading: contextLoading } = useContext(AppContext);
  const [referencia, setReferencia] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const token = localStorage.getItem("accessToken"); // Restauramos esta línea
  const queryClient = useQueryClient();

  // Consulta para obtener todas las referencias
  const { data: referencias = [], isLoading } = useQuery({
    queryKey: ["referencias"],
    queryFn: async () => {
      const res = await API.get("referencias/");
      return res.data.map((ref) => {
        const proveedor = proveedores.find((prov) => prov.id === ref.proveedor);
        return { ...ref, proveedor_name: proveedor ? proveedor.nombre_empresa : "Desconocido" };
      });
    },
    enabled: !!token && !contextLoading, // Espera a que contextLoading sea false
    staleTime: 5 * 60 * 1000, // 5 minutos de frescura
  });

  // Mutación para agregar o editar una referencia
  const referenciaMutation = useMutation({
    mutationFn: (data) =>
      isEditing
        ? API.put(`referencias/${editingId}/`, data, { headers: { Authorization: `Bearer ${token}` } })
        : API.post("referencias/", data, { headers: { Authorization: `Bearer ${token}` } }),
    onSuccess: () => {
      setReferencia("");
      setProveedorId("");
      setIsEditing(false);
      setEditingId(null);
      queryClient.invalidateQueries(["referencias"]); // Refrescar las referencias tras éxito
    },
    onError: (error) => {
      console.error("Error en la referencia:", error.response?.data || error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    referenciaMutation.mutate({ nombre: referencia, proveedor: proveedorId });
  };

  const handleEdit = (referencia) => {
    setReferencia(referencia.nombre);
    setProveedorId(referencia.proveedor);
    setIsEditing(true);
    setEditingId(referencia.id);
  };

  if (contextLoading) {
    return <div>Cargando datos iniciales...</div>;
  }

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
              disabled={referenciaMutation.isLoading}
            />
          </div>
          <div className="form-group-refs">
            <label>Proveedor:</label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              required
              disabled={referenciaMutation.isLoading}
            >
              <option value="">Selecciona un proveedor</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre_empresa}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={referenciaMutation.isLoading}>
            {referenciaMutation.isLoading ? "Guardando..." : isEditing ? "Editar" : "Agregar"}
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
                      disabled={referenciaMutation.isLoading}
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