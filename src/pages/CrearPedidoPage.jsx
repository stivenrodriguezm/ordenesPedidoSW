import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import "./CrearPedidoPage.css";
import { FaCircleUser } from "react-icons/fa6";
import html2canvas from "html2canvas"; // Importa html2canvas

function CrearPedidoPage() {
  const [proveedores, setProveedores] = useState([]);
  const [referencias, setReferencias] = useState([]); // Estado para las referencias
  const [user, setUser] = useState({ first_name: "", last_name: "" });
  const [pedido, setPedido] = useState({
    proveedor: "",
    ordenCompra: "",
    fecha: "",
    nota: "",
    productos: [{ cantidad: "", referencia: "", descripcion: "" }], // Producto #1
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
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setProveedores(response.data);
      } catch (error) {
        console.error("Error fetching providers:", error);
      }
    };

    fetchUser();
    fetchProveedores();
  }, []);

  // Maneja el cambio de proveedor y carga las referencias asociadas
  const handleProveedorChange = async (e) => {
    const proveedorId = e.target.value;
    setPedido({ ...pedido, proveedor: proveedorId });

    if (proveedorId) {
      const token = localStorage.getItem("accessToken");
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/api/referencias/?proveedor=${proveedorId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setReferencias(response.data); // Cargar referencias del proveedor seleccionado
      } catch (error) {
        console.error("Error fetching references:", error);
      }
    } else {
      setReferencias([]); // Vacía las referencias si no hay proveedor seleccionado
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
      // Enviar los datos al backend
      await axios.post(
        "http://127.0.0.1:8000/api/ordenes/",
        {
          proveedor: pedido.proveedor,
          notas: pedido.nota,
          fecha_esperada: pedido.fecha,
          detalles: pedido.productos.map((producto) => ({
            cantidad: producto.cantidad,
            referencia: producto.referencia,
            especificaciones: producto.descripcion,
          })),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
  
      // Actualizar el contenido de #pedido-preview antes de capturarlo
      const pedidoPreview = document.getElementById("pedido-preview");
  
      // Personalizar el contenido
      pedidoPreview.innerHTML = `
        <div style="text-align: center; font-family: Arial, sans-serif; padding: 10px;">
          <h1 style="color: #333;">Resumen del Pedido</h1>
          <p><strong>Proveedor:</strong> ${proveedores.find((p) => p.id === pedido.proveedor)?.nombre_empresa || ""}</p>
          <p><strong>Fecha esperada:</strong> ${pedido.fecha}</p>
          <p><strong>Nota:</strong> ${pedido.nota}</p>
          <h2>Productos</h2>
          <ul style="list-style: none; padding: 0;">
            ${pedido.productos.map((producto, index) => `
              <li style="margin-bottom: 10px;">
                <p><strong>Cantidad:</strong> ${producto.cantidad}</p>
                <p><strong>Referencia:</strong> ${referencias.find((r) => r.id === producto.referencia)?.nombre || ""}</p>
                <p><strong>Descripción:</strong> ${producto.descripcion}</p>
              </li>
            `).join("")}
          </ul>
        </div>
      `;
  
      // Mostrar y capturar la imagen
      pedidoPreview.style.display = "block";
      const canvas = await html2canvas(pedidoPreview);
      pedidoPreview.style.display = "none";
  
      // Descargar la imagen
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = "pedido.png";
      link.click();
  
      // Redirigir al usuario
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
          {/* Contenedor para previsualizar el pedido */}
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
          {/* Resto del formulario */}
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
          <label>Fecha:</label>
          <input
            type="date"
            name="fecha"
            value={pedido.fecha}
            onChange={handleChange}
            required
          />
          <label>Nota:</label>
          <textarea
            name="nota"
            value={pedido.nota}
            onChange={handleChange}
          ></textarea>
          <h2>Productos</h2>
          {pedido.productos.map((producto, index) => (
            <div key={index}>
              <input
                type="number"
                value={producto.cantidad}
                onChange={(e) => handleChange(e, index, "cantidad")}
                required
              />
              <select
                value={producto.referencia}
                onChange={(e) => handleChange(e, index, "referencia")}
                required
              >
                <option value="">Selecciona una</option>
                {referencias.map((ref) => (
                  <option key={ref.id} value={ref.id}>
                    {ref.nombre}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={producto.descripcion}
                onChange={(e) => handleChange(e, index, "descripcion")}
              />
            </div>
          ))}
          <button type="submit">Enviar</button>
        </form>
      </main>
    </div>
  );
}

export default CrearPedidoPage;


