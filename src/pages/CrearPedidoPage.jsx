import { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../services/api";
import { AppContext, usePermissions } from "../AppContext";
import "./CrearPedidoPage.css";
import html2canvas from "html2canvas";
import logoFinal from "../assets/logoFinal.png";
import { FaPlus, FaTrashAlt, FaFileSignature, FaClipboardList, FaBoxOpen, FaStickyNote } from "react-icons/fa";
import AppNotification from "../components/AppNotification";
import "../components/AppNotification.css";

function CrearPedidoPage() {
  const { proveedores, usuario: user, isLoading: contextLoading } = useContext(AppContext);
  const hasPermission = usePermissions();
  const canCreateOthers = hasPermission('CREAR_ORDENES_OTROS') || user?.role?.toLowerCase() === 'administrador';

  const navigate = useNavigate();
  const location = useLocation();
  const initialVentaId = location.state?.ventaId || "";
  const token = localStorage.getItem("accessToken");
  const queryClient = useQueryClient();

  const [notification, setNotification] = useState({ message: '', type: '' });

  const showError = (msg) => setNotification({ message: msg, type: 'error' });

  const { data: vendedores = [] } = useQuery({
    queryKey: ["vendedores"],
    queryFn: async () => (await API.get("vendedores/")).data,
    enabled: true,
  });

  const [proveedorId, setProveedorId] = useState("");
  const { data: referencias = [], isLoading: referenciasLoading } = useQuery({
    queryKey: ["referencias", proveedorId],
    queryFn: async () => {
      const response = await API.get(`referencias/?proveedor=${proveedorId}`);
      return response.data;
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
    staleTime: 0,
  });

  const [pedido, setPedido] = useState({
    proveedor: "",
    vendedor: user?.id || "",
    fecha: "",
    nota: "",
    productos: [{ cantidad: 1, referencia: "", descripcion: "" }],
    ordenCompra: initialVentaId,
  });

  useEffect(() => {
    if (user?.id && !pedido.vendedor) {
      setPedido((prev) => ({ ...prev, vendedor: user.id }));
    }
  }, [user]);
  const [numeroOP, setNumeroOP] = useState(null);
  const [llevaTela, setLlevaTela] = useState(false);
  const [esExhibicion, setEsExhibicion] = useState(false);

  const createOrderMutation = useMutation({
    mutationFn: (newOrder) =>
      API.post("ordenes-pedido/", newOrder),
    onSuccess: (response) => {
      setNumeroOP(response.data.id);
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
    },
    onError: (error) => {
      const data = error.response?.data;
      if (!data) {
        showError('Error de conexión. El servidor no respondió.');
        return;
      }
      // DRF puede retornar: {"field": ["msg"]}, {"detail": "msg"}, {"error": "msg"}
      const msg =
        data.detail ||
        data.error ||
        data.detalles ||
        (typeof data === 'object'
          ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
          : String(data));
      showError(`Error al crear el pedido: ${msg}`);
    },
  });

  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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

    // Validación explícita para cubrir casos donde HTML5 validation no aplica
    if (!pedido.proveedor) {
      showError('Por favor seleccione un proveedor.');
      return;
    }
    if (!pedido.fecha) {
      showError('Por favor ingrese la fecha esperada de llegada.');
      return;
    }
    const todayStr = getTodayString();
    if (pedido.fecha < todayStr) {
      showError('La fecha esperada no puede ser anterior al día de hoy.');
      return;
    }
    const productoInvalido = pedido.productos.find(p => !p.referencia);
    if (productoInvalido) {
      showError('Por favor seleccione una referencia para cada producto.');
      return;
    }

    createOrderMutation.mutate({
      proveedor: parseInt(pedido.proveedor),
      vendedor: pedido.vendedor ? parseInt(pedido.vendedor) : null,
      fecha_esperada: pedido.fecha,
      observacion: pedido.nota || null,
      detalles: pedido.productos.map((producto) => ({
        cantidad: parseInt(producto.cantidad) || 1,
        referencia: parseInt(producto.referencia),
        especificaciones: producto.descripcion || '-',
      })),
      tela: llevaTela ? "Por pedir" : "Sin tela",
      venta: pedido.ordenCompra ? parseInt(pedido.ordenCompra) : null,
      es_exhibicion: esExhibicion,
    });
  };

  useEffect(() => {
    if (numeroOP) {
      const renderImage = async () => {
        const pedidoPreview = document.getElementById("pedido-preview-offscreen");
        if (pedidoPreview) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const canvas = await html2canvas(pedidoPreview, {
            backgroundColor: "#ffffff",
            scale: 2,
            useCORS: true,
            logging: false,
          });

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

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['ventasPendientes'] });
  }, [queryClient]);

  if (contextLoading || ventasLoading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Cargando datos iniciales...</p>
      </div>
    );
  }

  return (
    <div className="page-container crear-pedido-container">
      <AppNotification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />
      <div className="form-title-header premium-v2">
        <div className="title-wrapper">
          <div className="title-icon-badge">
            <FaFileSignature className="title-icon" />
          </div>
          <div className="title-text-group">
            <h1>Crear Nuevo Pedido</h1>
            <p className="title-subtitle">Completa la información requerida para registrar la orden en el sistema.</p>
          </div>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-cancel-action" onClick={() => navigate(-1)}>
            Cancelar
          </button>
          <button type="submit" form="main-form" className="btn-submit-action" disabled={createOrderMutation.isLoading}>
            {createOrderMutation.isLoading ? "Creando..." : "Crear Pedido"}
          </button>
        </div>
      </div>

      <form id="main-form" className="form-main-layout" onSubmit={handleSubmit}>
        {/* --- COLUMNA IZQUIERDA: CONFIGURACIÓN --- */}
        <div className="form-left-column">
          <div className="form-section-container main-info-card">
            <div className="form-section-header">
              <div className="form-section-title">
                <div className="section-icon-badge badge-blue"><FaClipboardList /></div>
                <h3>Información Principal</h3>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="proveedor">Proveedor:</label>
              <select id="proveedor" name="proveedor" value={pedido.proveedor} onChange={handleProveedorChange} required>
                <option value="">Seleccione un proveedor</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre_empresa}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="vendedor">Vendedor:</label>
              <select id="vendedor" name="vendedor" value={pedido.vendedor || user?.id || ""} onChange={handleChange} disabled={!canCreateOthers}>
                {vendedores.length > 0 ? (
                  vendedores.map((v) => <option key={v.id} value={v.id}>{v.first_name || v.username}</option>)
                ) : (
                  <option value={user?.id || ""}>{user?.first_name || user?.username}</option>
                )}
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
              <input id="fecha" type="date" name="fecha" value={pedido.fecha} onChange={handleChange} min={getTodayString()} required />
            </div>

            <div className="form-group-toggles">
              <label className={`custom-toggle-card ${llevaTela ? 'active' : ''}`}>
                <input id="llevaTela" type="checkbox" checked={llevaTela} onChange={(e) => setLlevaTela(e.target.checked)} />
                <span className="toggle-checkbox-custom"></span>
                <span className="toggle-text">¿Se debe pedir tela?</span>
              </label>
              <label className={`custom-toggle-card ${esExhibicion ? 'active' : ''}`}>
                <input id="esExhibicion" type="checkbox" checked={esExhibicion} onChange={(e) => setEsExhibicion(e.target.checked)} />
                <span className="toggle-checkbox-custom"></span>
                <span className="toggle-text">¿Es para exhibición?</span>
              </label>
            </div>
          </div>
        </div>

        {/* --- COLUMNA DERECHA: DETALLES --- */}
        <div className="form-right-column">
          <div className="form-section-container products-card">
            <div className="form-section-header">
              <div className="form-section-title">
                <div className="section-icon-badge badge-indigo"><FaBoxOpen /></div>
                <h3>Productos</h3>
              </div>
              <button type="button" className="btn-add-product-pill" onClick={handleAddProduct}>
                <FaPlus /> Agregar Producto
              </button>
            </div>

            <div className="productos-table-wrapper">
              <div className="products-table-header">
                <span className="th-badge">#</span>
                <span className="th-cant">Cant.</span>
                <span className="th-ref">Referencia</span>
                <span className="th-desc">Descripción / Especificaciones</span>
                <span className="th-action"></span>
              </div>
              <div className="productos-list">
                {pedido.productos.map((producto, index) => (
                  <div key={index} className="product-compact-row">
                    <span className="product-row-badge">#{index + 1}</span>
                    <input type="number" value={producto.cantidad} onChange={(e) => handleChange(e, index, "cantidad")} required placeholder="1" className="input-cantidad-v3" min="1" />
                    <select value={producto.referencia} onChange={(e) => handleChange(e, index, "referencia")} required className="select-referencia-v3" disabled={referenciasLoading || !proveedorId}>
                      <option value="">{referenciasLoading ? "Cargando..." : "Seleccionar referencia"}</option>
                      {referencias.map((ref) => <option key={ref.id} value={ref.id}>{ref.nombre}</option>)}
                    </select>
                    <textarea value={producto.descripcion} onChange={(e) => handleChange(e, index, "descripcion")} placeholder="Detalles de la referencia (opcional)..." className="textarea-descripcion-v3" rows="1" />
                    {pedido.productos.length > 1 ? (
                      <button type="button" className="btn-remove-row-v3" onClick={() => handleRemoveProduct(index)} title="Eliminar producto">
                        <FaTrashAlt />
                      </button>
                    ) : <span className="action-placeholder"></span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="form-section-container notes-card">
            <div className="form-section-header">
              <div className="form-section-title">
                <div className="section-icon-badge badge-amber"><FaStickyNote /></div>
                <h3>Observaciones</h3>
              </div>
            </div>
            <textarea id="nota" name="nota" value={pedido.nota} onChange={handleChange} placeholder="Añadir observaciones generales sobre el pedido (detalles de entrega, instrucciones especializadas, etc.)..." rows="4" className="textarea-notes-v2" />
          </div>
        </div>
      </form>

      {/* --- VISTA PREVIA OCULTA FUERA DE PANTALLA PARA GENERAR IMAGEN PNG --- */}
      <div id="pedido-preview-offscreen">
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
                <strong>Vendedor:</strong>{" "}
                {vendedores.length > 0 && pedido.vendedor
                  ? (vendedores.find((v) => String(v.id) === String(pedido.vendedor))?.first_name || user?.first_name)
                  : (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : "Cargando...")}
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
                  <td className="desc-preview">{producto.descripcion || "Sin descripción"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="preview-nota">
            <h3>Observación:</h3>
            <div className="preview-nota-box">
              <p
                dangerouslySetInnerHTML={{
                  __html: pedido.nota ? pedido.nota.replace(/\n/g, "<br />") : "Sin observaciones",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrearPedidoPage;
