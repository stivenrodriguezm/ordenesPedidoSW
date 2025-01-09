import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./OrdenesPage.css";

function OrdenesPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [user, setUser] = useState({ first_name: "", last_name: "", is_staff: false });
  const [showAllOrders, setShowAllOrders] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    const fetchProveedores = async () => {
      try {
        const response = await axios.get("https://api.muebleslottus.com/api/proveedores/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProveedores(response.data);
      } catch (error) {
        console.error("Error fetching providers:", error);
      }
    };

    
    const fetchUsuarios = async () => {
      try {
        const response = await axios.get("https://api.muebleslottus.com/api/usuarios/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsuarios(response.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    const fetchOrdenes = async () => {
      try {
        const endpoint = showAllOrders
          ? "https://api.muebleslottus.com/api/ordenes/"
          : "https://api.muebleslottus.com/api/ordenes/?estado=pendiente";

        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setOrdenes(response.data);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    const fetchData = async () => {
      await fetchProveedores();
      await fetchUsuarios();
      await fetchOrdenes();
    };

    fetchData();
  }, [showAllOrders]);

  const enhanceOrdenes = () => {
    // Mapear las órdenes para incluir el nombre del proveedor y vendedor
    return ordenes.map((orden) => {
      const proveedor = proveedores.find((prov) => prov.id === orden.proveedor);
      const vendedor = usuarios.find((usuario) => usuario.id === orden.usuario);

      return {
        ...orden,
        proveedor_name: proveedor ? proveedor.nombre_empresa : "Desconocido",
        vendedor_name: vendedor
          ? `${vendedor.first_name} ${vendedor.last_name}`
          : "Desconocido",
      };
    });
  };

  const toggleShowAllOrders = () => {
    setShowAllOrders(!showAllOrders);
  };

  const handleCrearPedido = () => {
    navigate("/crear-pedido");
  };

  const ordenesEnhanced = enhanceOrdenes();

  return (
    <div className="ordenes-page">
      <main>
        <div className="principal">
          <div className="botones">
            <button className="crearPedidoBtn" onClick={handleCrearPedido}>
              Crear pedido
            </button>
            {user.is_staff && (
              <button className="mostrarPedidosBtn" onClick={toggleShowAllOrders}>
                {showAllOrders ? "Mostrar pendientes" : "Mostrar todos"}
              </button>
            )}
          </div>
          <table className="tablaOrdenes">
            <thead>
              <tr>
                <th>ID</th>
                <th>Proveedor</th>
                <th>Vendedor</th>
                <th>Estado</th>
                <th>Fecha Pedido</th>
                <th>Fecha Llegada</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {ordenesEnhanced.map((orden) => (
                <tr key={orden.id}>
                  <td>{orden.id}</td>
                  <td>{orden.proveedor_name}</td>
                  <td>{orden.vendedor_name}</td>
                  <td>{orden.estado}</td>
                  <td>{orden.fecha_creacion}</td>
                  <td>{orden.fecha_esperada}</td>
                  <td>{orden.notas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default OrdenesPage;

