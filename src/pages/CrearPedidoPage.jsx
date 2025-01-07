import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./CrearPedidoPage.css";
import { FaCircleUser } from "react-icons/fa6";
import html2canvas from "html2canvas";

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
      await axios.post(
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

      const pedidoPreview = document.getElementById("pedido-preview");
      pedidoPreview.style.display = "block";

      const canvas = await html2canvas(pedidoPreview);
      pedidoPreview.style.display = "none";

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = "pedido.png";
      link.click();

      navigate("/");
    } catch (error) {
      console.error("Error creating order:", error.response?.data || error);
    }
  };

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
        <div id="pedido-preview" style={{ display: "none" }}>
          <h2>Pedido</h2>
          <p>Proveedor: {proveedores.find((p) => p.id === pedido.proveedor)?.nombre_empresa || ""}</p>
          <p>Fecha esperada: {pedido.fecha}</p>
          <p>Nota: {pedido.nota}</p>
          <h3>Productos</h3>
          <ul>
            {pedido.productos.map((producto, index) => (
              <li key={index}>
                <p>Cantidad: {producto.cantidad}</p>
                <p>Referencia: {referencias.find((r) => r.id === producto.referencia)?.nombre || ""}</p>
                <p>Descripción: {producto.descripcion}</p>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}

export default CrearPedidoPage;

