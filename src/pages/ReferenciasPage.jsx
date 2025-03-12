import { useState, useEffect } from "react";
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

  const token = localStorage.getItem("accessToken");

  // Función para obtener la lista de proveedores
  const fetchProveedores = async () => {
    try {
      const response = await axios.get(
        "http://127.0.0.1:8000/api/proveedores/",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setProveedores(response.data);
    } catch (error) {
      console.error("Error fetching providers:", error);
    }
  };

  // Función para obtener la lista de referencias
  const fetchReferencias = async () => {
    try {
      const response = await axios.get(
        "http://127.0.0.1:8000/api/referencias/",
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

      setReferencias(referenciasWithProveedorName);

      // Actualizar sessionStorage para las referencias de cada proveedor
      const referenciasPorProveedor = {};
      referenciasWithProveedorName.forEach((ref) => {
        if (!referenciasPorProveedor[ref.proveedor]) {
          referenciasPorProveedor[ref.proveedor] = [];
        }
        referenciasPorProveedor[ref.proveedor].push(ref);
      });

      Object.keys(referenciasPorProveedor).forEach((proveedorId) => {
        sessionStorage.setItem(
          `referencias_${proveedorId}`,
          JSON.stringify(referenciasPorProveedor[proveedorId])
        );
      });
    } catch (error) {
      console.error("Error fetching references:", error);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      await fetchProveedores();
    };
    fetchData();
  }, []);

  // Actualizar referencias después de cargar proveedores
  useEffect(() => {
    if (proveedores.length > 0) {
      fetchReferencias();
    }
  }, [proveedores]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEditing) {
        // Editar referencia existente
        await axios.put(
          `http://127.0.0.1:8000/api/referencias/${editingId}/`,
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
          "http://127.0.0.1:8000/api/referencias/",
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
      fetchReferencias(); // Actualiza las referencias después de crear/editar
    } catch (error) {
      console.error("Error handling reference:", error);
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

