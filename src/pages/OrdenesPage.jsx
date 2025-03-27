import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaChevronDown } from "react-icons/fa";
import * as XLSX from "xlsx";
import "./OrdenesPage.css";
import { AppContext } from "../AppContext";

function OrdenesPage() {
  const { proveedores, usuario: user } = useContext(AppContext);
  const [ordenes, setOrdenes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [estados] = useState(["en_proceso", "anulado", "recibido"]);
  const [filtros, setFiltros] = useState({ proveedor: "", vendedor: "", estado: "en_proceso" });
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [productos, setProductos] = useState([]);
  const [formCosto, setFormCosto] = useState({});
  const [formEstado, setFormEstado] = useState({});
  const [isLoadingProductos, setIsLoadingProductos] = useState(false);

  const navigate = useNavigate();
  const API_BASE_URL = "https://api.muebleslottus.com/api";
  const token = localStorage.getItem("accessToken");

  const fetchOrdenes = async () => {
    try {
      setIsFetching(true);
      let endpoint = `${API_BASE_URL}/listar-pedidos/`;
      const params = [];
      if (user && user.rol === "Vendedor") params.push(`usuario_id=${user.id}`);
      if (filtros.proveedor && filtros.proveedor !== "") params.push(`id_proveedor=${filtros.proveedor}`);
      if (filtros.vendedor && filtros.vendedor !== "") params.push(`id_vendedor=${filtros.vendedor}`);
      if (filtros.estado && filtros.estado !== "") params.push(`estado=${filtros.estado}`);
      if (params.length) endpoint += `?${params.join("&")}`;

      const response = await axios.get(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      setOrdenes(response.data);
      setError(null);
    } catch (err) {
      setError("Error al cargar los datos. Intenta nuevamente.");
      console.error("Error fetching orders:", err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsFetching(true);
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

  useEffect(() => {
    fetchOrdenes();
  }, [filtros, token, user]);

  const fetchProductos = async (orderId) => {
    try {
      setIsLoadingProductos(true);
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
    } finally {
      setIsLoadingProductos(false);
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
      setProductos([]); // Limpia productos mientras carga
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
      alert("Datos inválidas. Revisa el costo y el estado.");
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

  function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year}`;
  }

  // Nueva función para determinar el estado visual del botón
  const getEstadoButton = (estado, fechaEsperada) => {
    const today = new Date(); // Fecha actual (25 de marzo de 2025)
    let fechaEsperadaDate;

    if (fechaEsperada) {
      const [year, month, day] = fechaEsperada.split("-");
      fechaEsperadaDate = new Date(`${year}-${month}-${day}`);
    }

    if (estado === "en_proceso") {
      if (fechaEsperadaDate && fechaEsperadaDate < today) {
        return <span className="estado-btn atrasado">Atrasado</span>;
      }
      return <span className="estado-btn pendiente">Pendiente</span>;
    } else if (estado === "recibido") {
      return <span className="estado-btn recibido">Recibido</span>;
    } else if (estado === "anulado") {
      return <span className="estado-btn anulado">Anulado</span>;
    }
    return estado; // Por si hay algún estado no contemplado
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
      "Fecha Pedido": formatDate(orden.fecha_creacion),
      "Fecha Llegada": formatDate(orden.fecha_esperada),
      Estado: orden.estado || "N/A",
      Nota: orden.nota || "N/A",
      Costo: orden.costo ? `$${orden.costo.toLocaleString()}` : "$0",
    }));

    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Ordenes");
    XLSX.writeFile(libro, "ordenes_filtradas.xlsx");
  };

  if (error && !ordenes.length) return <div className="error">{error}</div>;

  return (
    <div className="ordenes-page">
      <main>
        <div className="botonesContainer">
          <button className="exportarBtn" onClick={handleDescargarExcel} aria-label="Exportar lista de órdenes">
            Exportar
          </button>
          <button
            className="nuevoProveedorBtn"
            onClick={() => navigate("/ordenes/nuevo")}
            aria-label="Crear nuevo pedido"
          >
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

        <div className="tabla-contenedor">
          <table className="tablaOrdenes">
            <thead>
              <tr>
                <th>O.P.</th>
                <th>Proveedor</th>
                <th>Vendedor</th>
                <th>Venta</th>
                <th>Fecha Pedido</th>
                <th>Fecha Llegada</th>
                <th>Estado</th>
                <th>Observación</th>
                {(user && (user.role === "ADMINISTRADOR" || user.role === "AUXILIAR")) && <th>Costo</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isFetching && !ordenes.length ? (
                <tr>
                  <td colSpan="10" className="loading-container">
                    <div className="loader"></div>
                    <p>Cargando órdenes...</p>
                  </td>
                </tr>
              ) : ordenes.length > 0 ? (
                ordenes.map((orden) => (
                  <React.Fragment key={orden.id_orden}>
                    <tr>
                      <td>{orden.id_orden}</td>
                      <td>{orden.proveedor}</td>
                      <td>{orden.vendedor}</td>
                      <td>{orden.orden_venta}</td>
                      <td>{formatDate(orden.fecha_creacion)}</td>
                      <td>{formatDate(orden.fecha_esperada)}</td>
                      <td>{getEstadoButton(orden.estado, orden.fecha_esperada)}</td>
                      <td>{orden.nota}</td>
                      {(user && (user.role === "ADMINISTRADOR" || user.role === "AUXILIAR")) && (
                        <td>{formatCurrency(orden.costo)}</td>
                      )}
                      <td className="accionesIcono">
                        <button className="btnIconoTabla" onClick={() => handleToggleProductos(orden.id_orden)}>
                          <FaChevronDown />
                        </button>
                      </td>
                    </tr>
                    {expandedOrderId === orden.id_orden && (
                      <tr className="detalleProductos">
                        <td colSpan="10">
                          <div className="detalle-container">
                            {isLoadingProductos ? (
                              <div className="loading-container">
                                <div className="loader"></div>
                                <p>Cargando pedido...</p>
                              </div>
                            ) : (
                              <>
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
                                      className="selectDetallePedido"
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
                                <h3 className="tituloProductos">Productos:</h3>
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
                                      productos.map((producto, index) => (
                                        <tr key={producto.id} className={index % 2 === 0 ? "even-row" : "odd-row"}>
                                          <td className="tdCantidad">{producto.cantidad}</td>
                                          <td className="tdReferencia">{producto.referencia}</td>
                                          <td className="tdDescripcion">{producto.especificaciones}</td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                                <h3 className="tituloProductos">Observación:</h3>
                                <p className="observacionTexto">{orden.nota || "Sin observaciones"}</p>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="10">No hay órdenes disponibles</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default OrdenesPage;