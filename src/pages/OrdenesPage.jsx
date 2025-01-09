import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./OrdenesPage.css";
import { FaCircleUser } from "react-icons/fa6";
import { CiTrash } from "react-icons/ci";

function OrdenesPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [user, setUser] = useState({ first_name: "", last_name: "", is_staff: false });
  const [showAllOrders, setShowAllOrders] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
  
    // Fetch user info
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
            is_staff: response.data.is_staff,
          };
          sessionStorage.setItem("user", JSON.stringify(userData));
          setUser(userData);
        } catch (error) {
          console.error("Error fetching user info:", error);
        }
      }
    };
  
    // Fetch proveedores
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
  
    // Fetch ordenes
    const fetchOrdenes = async () => {
      const cacheKey = showAllOrders ? "ordenes_todas" : "ordenes_pendientes";
      const cachedOrdenes = sessionStorage.getItem(cacheKey);
  
      if (cachedOrdenes) {
        setOrdenes(JSON.parse(cachedOrdenes));
      } else {
        try {
          const endpoint = showAllOrders
            ? "https://api.muebleslottus.com/api/ordenes/"
            : "https://api.muebleslottus.com/api/ordenes/?estado=pendiente";
  
          const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
          });
  
          const ordenesWithNames = response.data.map((orden) => {
            const proveedor = proveedores.find((prov) => prov.id === orden.proveedor);
            return {
              ...orden,
              proveedor_name: proveedor ? proveedor.nombre_empresa : "Desconocido",
              vendedor_name: orden.usuario_first_name || "Desconocido",
            };
          });
  
          sessionStorage.setItem(cacheKey, JSON.stringify(ordenesWithNames));
          setOrdenes(ordenesWithNames);
        } catch (error) {
          console.error("Error fetching orders:", error);
        }
      }
    };
  
    const fetchData = async () => {
      await fetchProveedores();
      await fetchUser();
      await fetchOrdenes();
    };
  
    fetchData();
  }, [showAllOrders]);

  const toggleShowAllOrders = () => {
    setShowAllOrders(!showAllOrders);
  };

  const handleCrearPedido = () => {
    navigate("/crear-pedido");
  };

  const handleEliminar = async (id) => {
    const token = localStorage.getItem("accessToken");

    if (window.confirm("¿Estás seguro de que deseas eliminar este pedido?")) {
      try {
        await axios.delete(`https://127.0.0.1/api/ordenes/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrdenes(ordenes.filter((orden) => orden.id !== id));
      } catch (error) {
        console.error("Error deleting order:", error);
      }
    }
  };

  return (
    <div className="ordenes-page">
      <Sidebar />
      <main>
        <div className="barraSuperior">
          <h1>Órdenes de pedido</h1>
          <div className="usuarioBarra">
            <p>{`${user.first_name} ${user.last_name}`}</p>
            <FaCircleUser />
          </div>
        </div>
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
                <th>Estado</th>
                <th>Fecha Pedido</th>
                <th>Fecha Llegada</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((orden) => (
                <tr key={orden.id}>
                  <td>{orden.id}</td>
                  <td>{orden.proveedor_name}</td>
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

