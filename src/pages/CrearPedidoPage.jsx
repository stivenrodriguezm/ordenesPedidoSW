import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./CrearPedidoPage.css";
import { FaCircleUser } from "react-icons/fa6";
import html2canvas from "html2canvas";
import logoFinal from "../assets/logoFinal.png";

function CrearPedidoPage() {
  const [proveedores, setProveedores] = useState([]);
  const [referencias, setReferencias] = useState([]);
  const [user, setUser] = useState({ first_name: "", last_name: "" });
  const [pedido, setPedido] = useState({
    proveedor: "",
    fecha: "",
    nota: "",
    productos: [{ cantidad: "", referencia: "", descripcion: "" }],
  });
  const [numeroOP, setNumeroOP] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    const fetchUser = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/api/user/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser({
          first_name: response.data.first_name,
          last_name: response.data.last_name,
        });
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    const fetchProveedores = async () => {
      try {
        const response = await axios.get(
          "http://127.0.0.1:8000/api/proveedores/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setProveedores(response.data);
      } catch (error) {
        console.error("Error fetching providers:", error);
      }
    };

    fetchUser();
    fetchProveedores();
  }, []);

  const getFormattedDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0"); // Mes comienza desde 0
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleProveedorChange = async (e) => {
    const proveedorId = e.target.value;
    setPedido({ ...pedido, proveedor: proveedorId });

    if (proveedorId) {
      const token = localStorage.getItem("accessToken");
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/api/referencias/?proveedor=${proveedorId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setReferencias(response.data);
      } catch (error) {
        console.error("Error fetching references:", error);
      }
    } else {
      setReferencias([]);
    }
  };

  const handleChange = (e, index, field) => {
    if (field) {
      const updatedProductos = [...pedido.productos];
      updatedProductos[index][field] = e.target.value;
      setPedido({ ...pedido, productos: updatedProductos });
    } else {
      setPedido({ ...pedido, [e.target.name]: e.target.value });
    }
  };

  const handleAddProduct = () => {
    setPedido({
      ...pedido,
      productos: [...pedido.productos, { cantidad: "", referencia: "", descripcion: "" }],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken");

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/ordenes/",
        {
          proveedor: pedido.proveedor,
          fecha_esperada: pedido.fecha,
          notas: pedido.nota,
          detalles: pedido.productos.map((producto) => ({
            cantidad: producto.cantidad,
            referencia: producto.referencia,
            especificaciones: producto.descripcion,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNumeroOP(response.data.id);
    } catch (error) {
      console.error("Error creating order:", error.response?.data || error);
    }
  };

  useEffect(() => {
    if (numeroOP) {
      const renderImage = async () => {
        const pedidoPreview = document.getElementById("pedido-preview");
        if (pedidoPreview) {
          pedidoPreview.style.display = "block";
          const canvas = await html2canvas(pedidoPreview);
          pedidoPreview.style.display = "none";

          const image = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = image;
          link.download = `pedido_${numeroOP}.png`;
          link.click();

          navigate("/");
        }
      };

      renderImage();
    }
  }, [numeroOP]);

  return (
    <div className="crear-pedido-page">
      <Sidebar />
      <main>
        <div className="barraSuperior">
          <h1>Crear pedido</h1>
          <div className="usuarioBarra">
            <p>{`${user.first_name} ${user.last_name}`}</p>
            <FaCircleUser />
          </div>
        </div>
        <form className="formPedido" onSubmit={handleSubmit}>
          <div className="formFlexLabel">
            <label>Proveedor:</label>
            <select
              name="proveedor"
              value={pedido.proveedor}
              onChange={handleProveedorChange}
              required
            >
              <option value="">- Elige un proveedor -</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre_empresa}
                </option>
              ))}
            </select>
          </div>
          <div className="formFlexLabel">
            <label>Fecha esperada:</label>
            <input
              type="date"
              name="fecha"
              value={pedido.fecha}
              onChange={(e) => handleChange(e)}
              required
            />
          </div>
          <div className="formFlexLabel">
            <label>Nota:</label>
            <textarea
              name="nota"
              value={pedido.nota}
              onChange={(e) => handleChange(e)}
            ></textarea>
          </div>
          <h2>Productos</h2>
          {pedido.productos.map((producto, index) => (
            <div key={index} className="producto">
              <div className="formFlexLabel">
                <input
                  type="number"
                  value={producto.cantidad}
                  onChange={(e) => handleChange(e, index, "cantidad")}
                  required
                  placeholder="Cantidad"
                  className="prodsCantidad"
                />
                <select
                  className="refCantidad"
                  value={producto.referencia}
                  onChange={(e) => handleChange(e, index, "referencia")}
                  required
                >
                  <option value="">- Selecciona una referencia -</option>
                  {referencias.map((ref) => (
                    <option key={ref.id} value={ref.id}>
                      {ref.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <input
                className="descProducto"
                type="text"
                value={producto.descripcion}
                onChange={(e) => handleChange(e, index, "descripcion")}
                placeholder="Descripción"
              />
            </div>
          ))}
          <button type="button" onClick={handleAddProduct}>
            Agregar producto
          </button>
          <button type="submit">Enviar</button>
        </form>
        <div id="pedido-preview" style={{ display: "block" }}>
          <div className="headerPedido">
            <img src={logoFinal} className="logoPedido" alt="Logo Lottus" />
            <div className="numPedido">
              <h2>Pedido No.</h2>
              <p className="numeroOP">{numeroOP || "..."}</p>
            </div>
          </div>
          <div className="proveedorFechaPedido">
            <p className="proveedorPedido">
              Proveedor: {proveedores.length > 0 && pedido.proveedor
                ? proveedores.find((p) => String(p.id) === String(pedido.proveedor))?.nombre_empresa || "No seleccionado"
                : "Cargando..."}
            </p>
            <p className="fechaActual">Fecha: {getFormattedDate()}</p>
          </div>
          <p className="fechaPedido">Fecha pedido: {formatDate(pedido.fecha)}</p>
          <p className="notaPedido">Nota: {pedido.nota}</p>
          <h3 className="productoTituloPedidos">Productos</h3>
          <table className="tablaPedidosFoto">
            <thead>
              <tr>
                <th>Cantidad</th>
                <th>Referencia</th>
                <th className="descTablaPedidos">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {pedido.productos.map((producto, index) => (
                <tr key={index}>
                  <td>{producto.cantidad}</td>
                  <td>
                    {referencias.length > 0 && producto.referencia
                      ? referencias.find((r) => String(r.id) === String(producto.referencia))?.nombre || "No seleccionado"
                      : "Cargando..."}
                  </td>
                  <td className="descTablaPedidosTD">{producto.descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default CrearPedidoPage;
