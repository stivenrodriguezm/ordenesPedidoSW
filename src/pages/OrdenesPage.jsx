import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { TbLayoutNavbarExpand } from "react-icons/tb";
import { MdOutlineFileDownload } from "react-icons/md";
import * as XLSX from "xlsx";
import "./OrdenesPage.css";

function OrdenesPage() {
  const [ordenes, setOrdenes] = useState([]);
  const [user, setUser] = useState({ first_name: "", last_name: "", is_staff: false, id: null });
  const [proveedores, setProveedores] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [estados] = useState(["en_proceso", "anulado", "recibido"]);
  const [filtros, setFiltros] = useState({ proveedor: "", vendedor: "", estado: "en_proceso" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [productos, setProductos] = useState([]);
  const [formCosto, setFormCosto] = useState({});
  const [formEstado, setFormEstado] = useState({});
  
  const navigate = useNavigate();
  const API_BASE_URL = "https://api.muebleslottus.com/api";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("accessToken");

      try {
        const userResponse = await axios.get(`${API_BASE_URL}/user/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(userResponse.data);

        await Promise.all([fetchProveedores(token), fetchVendedores(token), fetchOrdenes(userResponse.data, token)]);
      } catch (err) {
        setError("Error al cargar los datos. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchProveedores = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/proveedores/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProveedores(response.data);
    } catch (err) {
      console.error("Error fetching proveedores:", err);
    }
  };

  const fetchVendedores = async (token) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/vendedores/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVendedores(response.data.filter((vend) => vend.first_name && vend.first_name.trim() !== ""));
    } catch (err) {
      console.error("Error fetching vendedores:", err);
    }
  };

  const fetchOrdenes = async (userData, token) => {
    let endpoint = `${API_BASE_URL}/listar-pedidos/`;
    const params = [];

    if (userData.rol === "Vendedor") params.push(`usuario_id=${userData.id}`);
    if (filtros.proveedor) params.push(`id_proveedor=${filtros.proveedor}`);
    if (filtros.vendedor) params.push(`id_vendedor=${filtros.vendedor}`);
    if (filtros.estado) params.push(`estado=${filtros.estado}`);

    if (params.length) endpoint += `?${params.join("&")}`;

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
      const response = await axios.get(`${API_BASE_URL}/detalles-pedido/${orderId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
      setFormCosto({ [orderId]: parseFloat(order.costo) });
      setFormEstado({ [orderId]: order.estado });
    }
  };

  const handleFiltrar = async () => {
    const token = localStorage.getItem("accessToken");
    await fetchOrdenes(user, token);
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prevFiltros) => ({
      ...prevFiltros,
      [name]: value,
    }));
  };
  

  const handleActualizarPedido = async (id) => {
    const token = localStorage.getItem("accessToken");
    const costo = parseFloat(formCosto[id]);
    const estado = formEstado[id];

    if (!estado || isNaN(costo)) {
      alert("Datos inválidos. Revisa el costo y el estado.");
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/ordenes/${id}/`,
        { costo, estado },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Pedido actualizado correctamente");
      setOrdenes((prev) =>
        prev.map((orden) => (orden.id_orden === id ? { ...orden, costo, estado } : orden))
      );
    } catch (error) {
      console.error("Error al actualizar el pedido:", error);
      alert("Error al actualizar el pedido");
    }
  };

  const handleDescargarExcel = () => {
    if (ordenes.length === 0) {
      alert("No hay datos para descargar.");
      return;
    }

    const datos = ordenes.map((orden) => ({
      "O.P.": orden.id_orden,
      Proveedor: orden.proveedor || "N/A",
      Vendedor: orden.vendedor || "N/A",
      Venta: orden.orden_venta || "N/A",
      "Fecha Pedido": orden.fecha_creacion || "N/A",
      "Fecha Llegada": orden.fecha_esperada || "N/A",
      Estado: orden.estado || "N/A",
      Nota: orden.nota || "N/A",
      Costo: orden.costo ? `$${orden.costo.toLocaleString()}` : "$0",
    }));

    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Ordenes");
    XLSX.writeFile(libro, "ordenes_filtradas.xlsx");
  };

  if (loading) return <div>Cargando pedidos...</div>;
  if (error) return <div className="error">{error}</div>;
  return (
    <div className="ordenes-page">
      <main>
        <div className="principal">
        <div className="botones">
          <button className="crearPedidoBtn" onClick={() => navigate("/crear-pedido")}>Crear pedido</button>
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
            {(user.role === "ADMINISTRADOR" || user.role === "AUXILIAR") && (
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
            <button className="filtrarBtn" onClick={handleFiltrar}>Filtrar</button>
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
                <th className="notaTablaOrdenes">Observación</th>
                {user.is_staff && <th className="costoTablaOrdenes">Costo</th>}
                <th>
                  <button className="descargarExcelBtn" onClick={handleDescargarExcel}>
                    <MdOutlineFileDownload />
                  </button>
                </th>
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
                      <td className="costoTablaOrdenesTD">{formatCurrency(orden.costo)}</td>
                    )}
                    <td className="opcionesTablaOrdenesTD">
                      <button className="btnIconoTabla" onClick={() => handleToggleProductos(orden.id_orden)}>
                        <TbLayoutNavbarExpand />
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
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(/\./g, ""); // Remover puntos
                                if (!isNaN(rawValue)) {
                                  setFormCosto((prev) => ({
                                    ...prev,
                                    [orden.id_orden]: parseFloat(rawValue),
                                  }));
                                }
                              }}
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
