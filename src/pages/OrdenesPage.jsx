import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AiOutlineCreditCard } from "react-icons/ai";
import "./OrdenesPage.css";

function OrdenesPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [user, setUser] = useState({ first_name: "", last_name: "", is_staff: false, id: null });
  const [proveedores, setProveedores] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [estados, setEstados] = useState(["en_proceso", "anulado", "recibido"]);
  const [filtros, setFiltros] = useState({ proveedor: "", vendedor: "", estado: "en_proceso" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null); // Para rastrear la orden expandida
  const [productos, setProductos] = useState([]); // Productos de la orden expandida
  const navigate = useNavigate();
  const [formCosto, setFormCosto] = useState({});
  const [formEstado, setFormEstado] = useState({});


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

        // Fetch options for filtros
        await fetchProveedores(token);
        await fetchVendedores(token);

        // Fetch orders
        await fetchOrdenes(userData, token);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Error al cargar los datos. Por favor, intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchProveedores = async (token) => {
    try {
      const response = await axios.get("https://api.muebleslottus.com/api/proveedores/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProveedores(response.data);
    } catch (err) {
      console.error("Error fetching proveedores:", err);
    }
  };

  const fetchVendedores = async (token) => {
    try {
      const response = await axios.get("https://api.muebleslottus.com/api/vendedores/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const vendedoresFiltrados = response.data.filter(
        (vend) => vend.first_name && vend.first_name.trim() !== ""
      );
      setVendedores(vendedoresFiltrados);
    } catch (err) {
      console.error("Error fetching vendedores:", err);
    }
  };

  const fetchOrdenes = async (userData, token) => {
    let endpoint = "https://api.muebleslottus.com/api/listar-pedidos/";
    const params = [];

    if (!userData.is_staff) {
      params.push(`usuario_id=${userData.id}`);
    }

    if (filtros.proveedor) {
      params.push(`id_proveedor=${filtros.proveedor}`);
    }

    if (filtros.vendedor) {
      params.push(`id_vendedor=${filtros.vendedor}`);
    }

    if (filtros.estado) {
      params.push(`estado=${filtros.estado}`);
    }

    if (params.length > 0) {
      endpoint += `?${params.join("&")}`;
    }

    try {
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrdenes(response.data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const fetchProductos = async (orderId) => {
    const token = localStorage.getItem("accessToken");
    try {
      const response = await axios.get(
        `https://api.muebleslottus.com/api/detalles-pedido/${orderId}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProductos(response.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const handleToggleProductos = async (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      setProductos([]);
      setFormCosto({});
      setFormEstado({});
    } else {
      setExpandedOrderId(orderId);
      await fetchProductos(orderId);
      const order = ordenes.find((o) => o.id_orden === orderId);
      setFormCosto((prev) => ({ ...prev, [orderId]: order.costo }));
      setFormEstado((prev) => ({ ...prev, [orderId]: order.estado }));
    }
  };

  const handleFiltrar = async () => {
    const token = localStorage.getItem("accessToken");
    await fetchOrdenes(user, token);
  };

  const handleCrearPedido = () => {
    navigate("/crear-pedido");
  };

  const handleFiltroChange = (e) => {
    setFiltros({ ...filtros, [e.target.name]: e.target.value });
  };

  if (loading) {
    return <div>Cargando pedidos...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const handleActualizarPedido = async (id) => {
    const token = localStorage.getItem("accessToken");
    const costo = parseFloat(formCosto[id]);
    const estado = formEstado[id];
  
    if (!estado) {
      alert("Selecciona un estado válido.");
      return;
    }
  
    if (isNaN(costo)) {
      alert("El costo debe ser un número válido.");
      return;
    }
  
    try {
      await axios.put(
        `https://api.muebleslottus.com/api/ordenes/${id}/`,
        { costo, estado },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Pedido actualizado correctamente");
      setOrdenes((prev) =>
        prev.map((orden) =>
          orden.id_orden === id ? { ...orden, costo, estado } : orden
        )
      );
    } catch (error) {
      console.error("Error al actualizar el pedido:", error);
      alert("Error al actualizar el pedido");
    }
  };
  

  return (
    <div className="ordenes-page">
      <main>
        <div className="principal">
          <div className="botones">
            <button className="crearPedidoBtn" onClick={handleCrearPedido}>
              Crear pedido
            </button>
          </div>
          <div className="filtro-form">
            <select
              name="proveedor"
              value={filtros.proveedor}
              onChange={handleFiltroChange}
              className="selectFiltro"
            >
              <option value="">Seleccionar Proveedor</option>
              {proveedores.map((prov) => (
                <option key={prov.id} value={prov.id}>
                  {prov.nombre_empresa}
                </option>
              ))}
            </select>
            {user.is_staff && (
              <select
                name="vendedor"
                value={filtros.vendedor}
                onChange={handleFiltroChange}
                className="selectFiltro"
              >
                <option value="">Seleccionar Vendedor</option>
                {vendedores.map((vend) => (
                  <option key={vend.id} value={vend.id}>
                    {vend.first_name} {vend.last_name}
                  </option>
                ))}
              </select>
            )}
            <select
              name="estado"
              value={filtros.estado}
              onChange={handleFiltroChange}
              className="selectFiltro"
            >
              <option value="">Seleccionar Estado</option>
              {estados.map((estado, index) => (
                <option key={index} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
            <button className="filtrarBtn" onClick={handleFiltrar}>
              Filtrar
            </button>
          </div>
          <table className="tablaOrdenes">
            <thead>
              <tr>
                <th className="opTablaOrdenes">O.P.</th>
                <th className="proveedorTablaOrdenes">Proveedor</th>
                <th className="vendedorTablaOrdenes">Vendedor</th>
                <th className="ventaTablaOrdenes">Venta</th>
                <th className="fechasTablaOrdenes">Fecha Pedido</th>
                <th className="fechasTablaOrdenes">Fecha Llegada</th>
                <th className="estadoTablaOrdenes">Estado</th>
                <th className="notaTablaOrdenes">Nota</th>
                {user.is_staff && <th className="costoTablaOrdenes">Costo</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((orden) => (
                <>
                  <tr key={orden.id_orden} className="trTablaOrdenes">
                    <td className="opTablaOrdenesTD">{orden.id_orden}</td>
                    <td>{orden.proveedor}</td>
                    <td className="centradoEnTabla">{orden.vendedor}</td>
                    <td className="ventaTablaOrdenesTD">{orden.orden_venta}</td>
                    <td className="centradoEnTabla">{orden.fecha_creacion}</td>
                    <td className="centradoEnTabla">{orden.fecha_esperada}</td>
                    <td className="centradoEnTabla">{orden.estado}</td>
                    <td className="notaTablaOrdenesTD">{orden.nota}</td>
                    {user.is_staff && (
                      <td className="costoTablaOrdenesTD">{orden.costo}</td>
                    )}
                    <td className="opcionesTablaOrdenesTD">
                      <button onClick={() => handleToggleProductos(orden.id_orden)}>
                        <AiOutlineCreditCard />
                      </button>
                    </td>
                  </tr>
                  {expandedOrderId === orden.id_orden && (
                    <tr className="detalleProductos">
                      <td colSpan="10">
                        {user.is_staff && (
                          <div className="formularioActualizacion">
                            <input
                              type="number"
                              placeholder="Costo"
                              value={formCosto[orden.id_orden] || ""}
                              onChange={(e) =>
                                setFormCosto((prev) => ({
                                  ...prev,
                                  [orden.id_orden]: e.target.value,
                                }))
                              }
                            />
                            <select
                              value={formEstado[orden.id_orden] || ""}
                              onChange={(e) =>
                                setFormEstado((prev) => ({
                                  ...prev,
                                  [orden.id_orden]: e.target.value,
                                }))
                              }
                            >
                              <option value="en_proceso">En Proceso</option>
                              <option value="recibido">Recibido</option>
                              <option value="anulado">Anulado</option>
                            </select>
                            <button onClick={() => handleActualizarPedido(orden.id_orden)}>
                              Enviar
                            </button>
                          </div>
                        )}
                        <h3 className="tituloProductos">Productos</h3>
                        <table className="tablaInternaDescPedidos">
                          <thead>
                            <tr>
                              <th>Cantidad</th>
                              <th>Referencia</th>
                              <th>Descripción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productos.map((producto, index) => (
                              <tr key={index}>
                                <td className="tdCentrar">{producto.cantidad}</td>
                                <td className="tdCentrar">{producto.referencia}</td>
                                <td className="tdDescripcion">{producto.especificaciones}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <h3 className="tituloProductos">Observación:</h3>
                        <p className="tituloProductos">{orden.nota}</p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );  
}

export default OrdenesPage;
