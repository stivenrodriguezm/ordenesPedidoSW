import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./OrdenesPage.css";

function OrdenesPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [user, setUser] = useState({ first_name: "", last_name: "", is_staff: false, id: null });
  const [showAllOrders, setShowAllOrders] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
    
      const token = localStorage.getItem("accessToken");
    
      try {
        // Fetch user info
        const userResponse = await axios.get("https://api.muebleslottus.com/api/user/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = userResponse.data;
        setUser(userData);
    
        // Construir el endpoint con los filtros adecuados
        let endpoint = "https://api.muebleslottus.com/api/listar-pedidos/";
    
        if (!userData.is_staff) {
          // Si es vendedor, incluir su ID como filtro
          endpoint += `?usuario_id=${userData.id}`;
        } else if (!showAllOrders) {
          // Si es administrador y no muestra todos, filtrar por "en_proceso"
          endpoint += "?estado=en_proceso";
        }
    
        // Fetch orders
        const ordersResponse = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrdenes(ordersResponse.data);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Error al cargar los pedidos. Por favor, intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };
    

    fetchData();
  }, [showAllOrders]);

  const toggleShowAllOrders = () => {
    setShowAllOrders(!showAllOrders);
  };

  const handleCrearPedido = () => {
    navigate("/crear-pedido");
  };

  if (loading) {
    return <div>Cargando pedidos...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

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
                <th>Fecha Pedido</th>
                <th>Fecha Llegada</th>
                <th>Estado</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((orden, index) => (
                <tr key={index}>
                  <td>{orden.id_orden}</td>
                  <td>{orden.proveedor}</td>
                  <td>{orden.vendedor}</td>
                  <td>{orden.fecha_creacion}</td>
                  <td>{orden.fecha_esperada}</td>
                  <td>{orden.estado}</td>
                  <td>{orden.nota}</td>
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
