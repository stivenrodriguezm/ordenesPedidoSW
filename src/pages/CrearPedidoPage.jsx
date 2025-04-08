import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./CrearPedidoPage.css";
import html2canvas from "html2canvas";
import logoFinal from "../assets/logoFinal.png";
import { IoIosClose } from "react-icons/io";

function CrearPedidoPage() {
  const [proveedores, setProveedores] = useState([]);
  const [referencias, setReferencias] = useState([]);
  const [user, setUser] = useState({ first_name: "", last_name: "" });
  const [pedido, setPedido] = useState({
    proveedor: "",
    fecha: "",
    nota: "",
    productos: [{ cantidad: "", referencia: "", descripcion: "" }],
    ordenCompra: "",
  });
  const [numeroOP, setNumeroOP] = useState(null);
  const navigate = useNavigate();
  const [llevaTela, setLlevaTela] = useState(false); // Nuevo estado para el checkbox de tela

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    const fetchAndUpdateUser = async () => {
      try {
        const response = await axios.get("https://api.muebleslottus.com/api/user/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        sessionStorage.setItem("user", JSON.stringify(response.data));
        setUser({
          first_name: response.data.first_name,
          last_name: response.data.last_name,
        });
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    const fetchAndUpdateProveedores = async () => {
      try {
        const response = await axios.get(
          "https://api.muebleslottus.com/api/proveedores/",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        sessionStorage.setItem("proveedores", JSON.stringify(response.data));
        setProveedores(response.data);
      } catch (error) {
        console.error("Error fetching providers:", error);
      }
    };

    fetchAndUpdateUser();
    fetchAndUpdateProveedores();
  }, []);

  const getFormattedDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const month = monthNames[today.getMonth()];
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatDate = (date) => {
    if (!date) return "";
    const [year, month, day] = date.split("-");
    const localDate = new Date(year, month - 1, day);
    const formattedDay = String(localDate.getDate()).padStart(2, "0");
    const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const formattedMonth = monthNames[localDate.getMonth()];
    const formattedYear = localDate.getFullYear();
    return `${formattedDay}-${formattedMonth}-${formattedYear}`;
  };

  const handleProveedorChange = async (e) => {
    const proveedorId = e.target.value;
    setPedido({ ...pedido, proveedor: proveedorId });

    if (proveedorId) {
      const cachedReferencias = sessionStorage.getItem(`referencias_${proveedorId}`);
      if (cachedReferencias) {
        setReferencias(JSON.parse(cachedReferencias));
      } else {
        const token = localStorage.getItem("accessToken");
        try {
          const response = await axios.get(
            `https://api.muebleslottus.com/api/referencias/?proveedor=${proveedorId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          sessionStorage.setItem(`referencias_${proveedorId}`, JSON.stringify(response.data));
          setReferencias(response.data);
        } catch (error) {
          console.error("Error fetching references:", error);
        }
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

  const handleRemoveProduct = (index) => {
    const updatedProductos = pedido.productos.filter((_, i) => i !== index);
    setPedido({ ...pedido, productos: updatedProductos });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("accessToken");

    try {
      const response = await axios.post(
        "https://api.muebleslottus.com/api/ordenes/",
        {
          proveedor: pedido.proveedor,
          fecha_esperada: pedido.fecha,
          notas: pedido.nota,
          orden_venta: pedido.ordenCompra,
          detalles: pedido.productos.map((producto) => ({
            cantidad: producto.cantidad,
            referencia: producto.referencia,
            especificaciones: producto.descripcion,
          })),
          tela: llevaTela ? "Por pedir" : "Sin tela", // Asignar el estado de la tela basado en el checkbox
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
          const canvas = await html2canvas(pedidoPreview, {
            backgroundColor: "#ffffff",
            scale: 2,
            useCORS: true,
          });
          pedidoPreview.style.display = "none";

          const image = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = image;
          link.download = `pedido_${numeroOP}.png`;
          link.click();

          navigate("/ordenes");
        }
      };

      renderImage();
    }
  }, [numeroOP, navigate]);

  return (
    <div className="crear-pedido-page">
      <main>
        <div className="botonesContainer">
          <button className="cancelarBtn" onClick={() => navigate(-1)} aria-label="Cancelar y volver atrás">
            Cancelar
          </button>
        </div>
        <form className="formPedido" onSubmit={handleSubmit}>
          <div className="form-container">
            <h2 className="tituloForm">Crear Nuevo Pedido</h2>
            <div className="form-group">
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
            <div className="form-group">
              <label>Orden de compra:</label>
              <input
                type="text"
                name="ordenCompra"
                value={pedido.ordenCompra || ""}
                onChange={(e) => handleChange(e)}
                placeholder="Número de orden de compra"
                required
              />
            </div>
            <div className="form-group">
              <label>Fecha esperada:</label>
              <input
                type="date"
                name="fecha"
                value={pedido.fecha}
                onChange={(e) => handleChange(e)}
                required
              />
            </div>
            <div className="form-group">
              <label className="labelTelas">Tela:</label>
              <input
                type="checkbox"
                checked={llevaTela}
                onChange={(e) => setLlevaTela(e.target.checked)}
                className="checkbox-tela"
              />
              <p className="textoTela">Incluye tela</p>
            </div>
            <h3 className="tituloProductos">Productos:</h3>
            {pedido.productos.map((producto, index) => (
              <div key={index} className="producto-group">
                {index > 0 && (
                  <button
                    type="button"
                    className="remove-product-btn"
                    onClick={() => handleRemoveProduct(index)}
                    aria-label="Eliminar producto"
                  >
                    <IoIosClose />
                  </button>
                )}
                <div className="producto-row">
                  <input
                    type="number"
                    value={producto.cantidad}
                    onChange={(e) => handleChange(e, index, "cantidad")}
                    required
                    placeholder="Cantidad"
                    className="input-cantidad"
                  />
                  <select
                    value={producto.referencia}
                    onChange={(e) => handleChange(e, index, "referencia")}
                    required
                    className="select-referencia"
                  >
                    <option value="">- Selecciona una referencia -</option>
                    {referencias.map((ref) => (
                      <option key={ref.id} value={ref.id}>
                        {ref.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={producto.descripcion}
                  onChange={(e) => handleChange(e, index, "descripcion")}
                  placeholder="Descripción del producto"
                  className="textarea-descripcion"
                />
              </div>
            ))}
            <div className="form-buttons">
              <button type="button" className="agregarProductoBtn" onClick={handleAddProduct}>
                Agregar producto
              </button>
            </div>
            <div className="form-group nota-group">
              <label>Observación:</label>
              <textarea
                name="nota"
                value={pedido.nota}
                onChange={(e) => handleChange(e)}
                placeholder="Observación general del pedido"
                className="textarea-nota"
              />
            </div>
            <div className="form-buttons">
              <button type="submit" className="enviarBtn">Enviar</button>
            </div>
          </div>
        </form>
        <div id="pedido-preview" style={{ display: "none" }}>
          <div className="preview-container">
            <div className="preview-header">
              <img src={logoFinal} className="logoPedido" alt="Logo Lottus" />
              <div className="numPedido">
                <h2>Orden de Pedido</h2>
                <p className="numeroOP">No. {numeroOP || "..."}</p>
              </div>
            </div>
            <div className="preview-info">
              <div className="info-column">
                <p><strong>Proveedor:</strong> {proveedores.length > 0 && pedido.proveedor
                  ? proveedores.find((p) => String(p.id) === String(pedido.proveedor))?.nombre_empresa || "No seleccionado"
                  : "Cargando..."}</p>
                <p><strong>Vendedor:</strong> {`${user.first_name} ${user.last_name}`}</p>
                <p><strong>Orden de compra:</strong> {pedido.ordenCompra || "No especificado"}</p>
              </div>
              <div className="info-column">
                <p><strong>Fecha pedido:</strong> {getFormattedDate()}</p>
                <p><strong>Fecha entrega:</strong> {formatDate(pedido.fecha)}</p>
              </div>
            </div>
            <h3 className="preview-productos-title">Productos:</h3>
            <table className="preview-productos-table">
              <thead>
                <tr>
                  <th>Cantidad</th>
                  <th>Referencia</th>
                  <th>Descripción</th>
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
                    <td className="desc-preview">{producto.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="preview-nota">
              <h3>Observación:</h3>
              <p
                dangerouslySetInnerHTML={{
                  __html: pedido.nota ? pedido.nota.replace(/\n/g, "<br />") : "Sin observaciones",
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CrearPedidoPage;