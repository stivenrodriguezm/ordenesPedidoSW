import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../services/api";
import { AppContext } from "../AppContext";
import "./CrearPedidoPage.css";
import html2canvas from "html2canvas";
import logoFinal from "../assets/logoFinal.png";
import { FaPlus, FaTrashAlt } from "react-icons/fa";

function CrearPedidoPage() {
  const { proveedores, usuario: user, isLoading: contextLoading } = useContext(AppContext);
  const navigate = useNavigate();
  const token = localStorage.getItem("accessToken");
  const queryClient = useQueryClient();

  const [proveedorId, setProveedorId] = useState("");
  const { data: referencias = [], isLoading: referenciasLoading } = useQuery({
    queryKey: ["referencias", proveedorId],
    queryFn: async () => {
      console.log("Fetching references for proveedorId:", proveedorId);
      const response = await API.get(`referencias/?proveedor=${proveedorId}`);
      console.log("Full references API response data:", response.data); // Log the full data object
      return response.data; // Return the full data object for now
    },
    enabled: !!proveedorId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: ventasPendientes = [], isLoading: ventasLoading, error: ventasError } = useQuery({
    queryKey: ["ventasPendientes"],
    queryFn: () =>
      API.get("get-pendientes-ids/", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        return res.data;
      }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const [pedido, setPedido] = useState({
    proveedor: "",
    fecha: "",
    nota: "",
    productos: [{ cantidad: 1, referencia: "", descripcion: "" }],
    ordenCompra: "",
  });
  const [numeroOP, setNumeroOP] = useState(null);
  const [llevaTela, setLlevaTela] = useState(false);

  const createOrderMutation = useMutation({
    mutationFn: (newOrder) =>
      API.post("ordenes-pedido/", newOrder, { headers: { Authorization: `Bearer ${token}` } }),
    onSuccess: (response) => {
      setNumeroOP(response.data.id);
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.detalles || error.response?.data?.error || "Error al crear la orden.";
      alert(`Error: ${JSON.stringify(errorMsg)}`);
      console.error("Error creating order:", error.response);
    },
  });

  // Funciones de formato de fecha (sin cambios)
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
    const [year, month, day] = date.split("-").map(Number);
    const localDate = new Date(year, month - 1, day);
    const formattedDay = String(localDate.getDate()).padStart(2, "0");
    const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const formattedMonth = monthNames[localDate.getMonth()];
    const formattedYear = localDate.getFullYear();
    return `${formattedDay}-${formattedMonth}-${formattedYear}`;
  };

  const handleProveedorChange = (e) => {
    const id = e.target.value;
    setProveedorId(id);
    setPedido({ ...pedido, proveedor: id, productos: [{ cantidad: 1, referencia: "", descripcion: "" }] });
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
      productos: [...pedido.productos, { cantidad: 1, referencia: "", descripcion: "" }],
    });
  };

  const handleRemoveProduct = (index) => {
    const updatedProductos = pedido.productos.filter((_, i) => i !== index);
    setPedido({ ...pedido, productos: updatedProductos });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createOrderMutation.mutate({
      proveedor: pedido.proveedor,
      fecha_esperada: pedido.fecha,
      notas: pedido.nota,
      detalles: pedido.productos.map((producto) => ({
        cantidad: producto.cantidad,
        referencia: producto.referencia,
        especificaciones: producto.descripcion,
      })),
      tela: llevaTela ? "Por pedir" : "Sin tela",
      venta: pedido.ordenCompra,
    });
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

  if (contextLoading || ventasLoading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Cargando datos iniciales...</p>
      </div>
    );
  }

  return (
    <div className="page-container crear-pedido-container recuadro_contenedor">
        <div className="form-title-header">
            <h1>Crear Nuevo Pedido</h1>
            <div className="header-actions">
               <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
                Cancelar
              </button>
              <button type="submit" form="main-form" className="btn-primary" disabled={createOrderMutation.isLoading}>
                {createOrderMutation.isLoading ? "Creando..." : "Crear Pedido"}
              </button>
            </div>
        </div>

      <form id="main-form" className="form-main-layout" onSubmit={handleSubmit}>
          {/* --- COLUMNA IZQUIERDA: CONFIGURACIÓN --- */}
          <div className="form-left-column">
            <div className="form-section-container">
              <h3 className="form-section-title">Información Principal</h3>
              <div className="form-group">
                <label htmlFor="proveedor">Proveedor:</label>
                <select id="proveedor" name="proveedor" value={pedido.proveedor} onChange={handleProveedorChange} required>
                  <option value="">Seleccione un proveedor</option>
                  {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre_empresa}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="ordenCompra">Orden de Compra:</label>
                {ventasError ? <p className="error-text">No se pudieron cargar las órdenes.</p>
                  : ventasPendientes.length === 0 ? <p className="info-text">No hay O.C. pendientes.</p>
                  : (
                  <select id="ordenCompra" name="ordenCompra" value={pedido.ordenCompra} onChange={handleChange} required>
                    <option value="">Seleccione una O.C.</option>
                    {ventasPendientes.map((id) => <option key={id} value={id}>{id}</option>)}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="fecha">Fecha Esperada:</label>
                <input id="fecha" type="date" name="fecha" value={pedido.fecha} onChange={handleChange} required />
              </div>
              <div className="form-group checkbox-group">
                <input id="llevaTela" type="checkbox" checked={llevaTela} onChange={(e) => setLlevaTela(e.target.checked)} />
                <label htmlFor="llevaTela">¿Se debe pedir tela?</label>
              </div>
            </div>
          </div>

          {/* --- COLUMNA DERECHA: DETALLES --- */}
          <div className="form-right-column">
            <div className="form-section-container">
              <div className="form-section-header">
                <h3 className="form-section-title">Productos</h3>
                <button type="button" className="btn-secondary" onClick={handleAddProduct}>
                  <FaPlus /> Agregar
                </button>
              </div>
              <div className="productos-list">
                {pedido.productos.map((producto, index) => (
                  <div key={index} className="producto-item">
                    <input type="number" value={producto.cantidad} onChange={(e) => handleChange(e, index, "cantidad")} required placeholder="Cant." className="input-cantidad" min="1" />
                    <select value={producto.referencia} onChange={(e) => handleChange(e, index, "referencia")} required className="select-referencia" disabled={referenciasLoading || !proveedorId}>
                      <option value="">{referenciasLoading ? "Cargando..." : "Referencia"}</option>
                      {referencias.map((ref) => <option key={ref.id} value={ref.id}>{ref.nombre}</option>)}
                    </select>
                    <textarea value={producto.descripcion} onChange={(e) => handleChange(e, index, "descripcion")} placeholder="Descripción del producto" className="textarea-descripcion" rows="1"></textarea>
                    {pedido.productos.length > 1 && (
                      <button type="button" className="remove-btn" onClick={() => handleRemoveProduct(index)} aria-label="Eliminar producto">
                        <FaTrashAlt />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="form-section-container">
               <h3 className="form-section-title">Observaciones</h3>
               <textarea id="nota" name="nota" value={pedido.nota} onChange={handleChange} placeholder="Añadir observaciones generales sobre el pedido..." rows="5" />
            </div>
          </div>
      </form>

      {/* --- VISTA PREVIA PARA IMAGEN (SIN CAMBIOS) --- */}
      <div id="pedido-preview" style={{ display: "none" }}>
        {/* ... El contenido de la vista previa permanece sin cambios ... */}
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
              <p>
                <strong>Proveedor:</strong>{" "}
                {proveedores.length > 0 && pedido.proveedor
                  ? proveedores.find((p) => String(p.id) === String(pedido.proveedor))?.nombre_empresa || "No seleccionado"
                  : "Cargando..."}
              </p>
              <p>
                <strong>Vendedor:</strong> {user ? `${user.first_name} ${user.last_name}` : "Cargando..."}
              </p>
              <p>
                <strong>Orden de compra:</strong> {pedido.ordenCompra || "No especificado"}
              </p>
            </div>
            <div className="info-column">
              <p>
                <strong>Fecha pedido:</strong> {getFormattedDate()}
              </p>
              <p>
                <strong>Fecha entrega:</strong> {formatDate(pedido.fecha)}
              </p>
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
    </div>
  );
}

export default CrearPedidoPage;
