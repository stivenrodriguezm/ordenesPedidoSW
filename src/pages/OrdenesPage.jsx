import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { TbLayoutNavbarExpand } from "react-icons/tb";
import { MdOutlineFileDownload } from "react-icons/md";
import * as XLSX from "xlsx";
import "./OrdenesPage.css";
import { AppContext } from "../AppContext";

function OrdenesPage() {
  const { proveedores, usuario: user } = useContext(AppContext);
  const [ordenes, setOrdenes] = useState([]); // Datos actuales de la tabla
  const [vendedores, setVendedores] = useState([]);
  const [estados] = useState(["en_proceso", "anulado", "recibido"]);
  const [filtros, setFiltros] = useState({ proveedor: "", vendedor: "", estado: "en_proceso" });
  const [isFetching, setIsFetching] = useState(false); // Rastrear la solicitud en curso
  const [error, setError] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [productos, setProductos] = useState([]);
  const [formCosto, setFormCosto] = useState({});
  const [formEstado, setFormEstado] = useState({});

  const navigate = useNavigate();
  const API_BASE_URL = "https://api.muebleslottus.com/api";
  const token = localStorage.getItem("accessToken");

  const fetchOrdenes = async () => {
    try {
      setIsFetching(true); // Indica que estamos cargando datos
      let endpoint = `${API_BASE_URL}/listar-pedidos/`;
      const params = [];
      if (user && user.rol === "Vendedor") params.push(`usuario_id=${user.id}`);
      if (filtros.proveedor && filtros.proveedor !== "") params.push(`id_proveedor=${filtros.proveedor}`);
      if (filtros.vendedor && filtros.vendedor !== "") params.push(`id_vendedor=${filtros.vendedor}`);
      if (filtros.estado && filtros.estado !== "") params.push(`estado=${filtros.estado}`);
      if (params.length) endpoint += `?${params.join("&")}`;

      console.log("URL solicitada:", endpoint); // Depuración
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Datos recibidos:", response.data); // Depuración
      setOrdenes(response.data); // Actualiza la tabla solo cuando los datos están listos
      setError(null); // Limpia cualquier error previo
    } catch (err) {
      setError("Error al cargar los datos. Intenta nuevamente.");
      console.error("Error fetching orders:", err);
    } finally {
      setIsFetching(false); // Finaliza el estado de carga
    }
  };

  // Carga inicial de datos (vendedores y órdenes)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsFetching(true); // Indica carga inicial
        const vendedoresResponse = await axios.get(`${API_BASE_URL}/vendedores/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setVendedores(vendedoresResponse.data.filter((user) => user.first_name && user.first_name.trim() !== ""));
        await fetchOrdenes();
      } catch (err) {
        setError("Error al cargar los datos iniciales.");
        console.error("Error fetching initial data:", err);
      } finally {
        setIsFetching(false);
      }
    };
    fetchInitialData();
  }, [token, user]);

  // Filtrado automático cuando cambian los filtros
  useEffect(() => {
    fetchOrdenes();
  }, [filtros, token, user]); // Dependencias: filtros, token y user

  const fetchProductos = async (orderId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/detalles-pedido/${orderId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(response.data)) {
        setProductos(response.data);
      } else {
        setProductos([]);
        console.error("API response for products is not an array:", response.data);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setProductos([]);
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

  const handleFiltroChange = (e) => {
    setFiltros((prevFiltros) => ({
      ...prevFiltros,
      [e.target.name]: e.target.value,
    }));
  };

  const handleActualizarPedido = async (id) => {
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

  function formatCurrency(amount) {
    return `$${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  }

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

  // Si hay un error crítico y no hay datos previos, mostramos el mensaje de error
  if (error && !ordenes.length) return <div className="error">{error}</div>;

  return (
    <div className="ordenes-page">
      <main>
        <div className="principal">
          <div className="botones">
            <button className="crearPedidoBtn" onClick={() => navigate("/ordenesPedidoSW/ordenes/nuevo")}>
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
            {user && (user.role === "ADMINISTRADOR" || user.role === "AUXILIAR") && (
              <select
                name="vendedor"
                value={filtros.vendedor}
                onChange={handleFiltroChange}
                className="selectFiltro"
              >
                <option value="">Seleccionar Usuario</option>
                {vendedores.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.first_name} {usuario.last_name}
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
                {(user && (user.role === "ADMINISTRADOR" || user.role === "AUXILIAR")) && (
                  <th className="costoTablaOrdenes">Costo</th>
                )}
                <th>
                  <button className="descargarExcelBtn" onClick={handleDescargarExcel}>
                    <MdOutlineFileDownload />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((orden) => (
                <React.Fragment key={orden.id_orden}>
                  <tr className="trTablaOrdenes">
                    <td className="opTablaOrdenesTD">{orden.id_orden}</td>
                    <td>{orden.proveedor}</td>
                    <td className="centradoEnTabla">{orden.vendedor}</td>
                    <td className="ventaTablaOrdenesTD">{orden.orden_venta}</td>
                    <td className="centradoEnTabla">{orden.fecha_creacion}</td>
                    <td className="centradoEnTabla">{orden.fecha_esperada}</td>
                    <td className="centradoEnTabla">{orden.estado}</td>
                    <td className="notaTablaOrdenesTD">{orden.nota}</td>
                    {(user && (user.role === "ADMINISTRADOR" || user.role === "AUXILIAR")) && (
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
                        {(user && (user.role === "ADMINISTRADOR" || user.role === "AUXILIAR")) && (
                          <div className="formularioActualizacion">
                            <input
                              type="number"
                              placeholder="Costo"
                              value={formCosto[orden.id_orden] || ""}
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(/\./g, "");
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
                            <button onClick={() => handleActualizarPedido(orden.id_orden)}>Enviar</button>
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
                            {Array.isArray(productos) &&
                              productos.map((producto) => (
                                <tr key={producto.id}>
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
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default OrdenesPage;