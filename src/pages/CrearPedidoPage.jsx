import { useState, useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../services/api";
import { AppContext, usePermissions } from "../AppContext";
import "./CrearPedidoPage.css";
import { getTodayStr, formatDateCorta } from "../utils/dates";
import ImagenOrdenPedido from "../components/imagenes/ImagenOrdenPedido";
import { FaPlus, FaTrashAlt, FaFileSignature, FaClipboardList, FaBoxOpen, FaStickyNote } from "react-icons/fa";
import AppNotification from "../components/AppNotification";
import "../components/AppNotification.css";
import { PageHeader, Button, LoadingBlock } from "../components/ui";
import { useVendedores, usePendientesIds } from "../hooks/useSharedData";
import { useBorrador } from "../hooks/useBorrador";
import { describirError } from "../services/errores";

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

  const { data: vendedores = [] } = useVendedores();

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

  const { data: ventasPendientes = [], isLoading: ventasLoading, error: ventasError } = usePendientesIds(undefined, {
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
  const [esFeriaHogar, setEsFeriaHogar] = useState(false);

  const hayContenidoPedido = Boolean(
    proveedorId ||
    pedido.proveedor ||
    pedido.nota ||
    (pedido.productos.length > 0 && (pedido.productos[0].referencia || pedido.productos[0].descripcion || pedido.productos.length > 1))
  );

  const borrador = useBorrador({
    clave: 'crear-pedido',
    dueno: user?.id ?? user?.username ?? null,
    version: 1,
    datos: { pedido, proveedorId, llevaTela, esExhibicion, esFeriaHogar },
    hayContenido: hayContenidoPedido,
    restaurar: (d) => {
      if (!d) return;
      if (d.pedido) setPedido(d.pedido);
      if (d.proveedorId) setProveedorId(d.proveedorId);
      if (d.llevaTela !== undefined) setLlevaTela(d.llevaTela);
      if (d.esExhibicion !== undefined) setEsExhibicion(d.esExhibicion);
      if (d.esFeriaHogar !== undefined) setEsFeriaHogar(d.esFeriaHogar);
    },
  });

  const descartarBorrador = () => {
    borrador.descartar();
    setProveedorId('');
    setLlevaTela(false);
    setEsExhibicion(false);
    setEsFeriaHogar(false);
    setPedido({
      proveedor: "",
      vendedor: user?.id || "",
      fecha: "",
      nota: "",
      productos: [{ cantidad: 1, referencia: "", descripcion: "" }],
      ordenCompra: initialVentaId,
    });
  };

  const createOrderMutation = useMutation({
    mutationFn: (newOrder) =>
      API.post("ordenes-pedido/", newOrder),
    onSuccess: (response) => {
      setNumeroOP(response.data.id);
      borrador.limpiarTrasGuardar();
      queryClient.invalidateQueries({ queryKey: ['ordenes'] });
    },
    onError: (error) => {
      const desc = describirError(error, 'No se pudo crear el pedido.');
      showError(`Error al crear el pedido: ${desc.mensaje}`);
    },
  });

  const getTodayString = () => getTodayStr();

  // Formato visible histórico: 'dd-mmm-yyyy' (ej. '05-ene-2026'), montado sobre formatDateCorta.
  const formatFechaGuiones = (dateStr) => {
    const corta = formatDateCorta(dateStr); // '5 ene 2026'
    if (!corta) return "";
    const [d, m, y] = corta.split(" ");
    return `${String(d).padStart(2, "0")}-${m}-${y}`;
  };

  const getFormattedDate = () => formatFechaGuiones(getTodayStr());

  const formatDate = (date) => {
    if (!date) return "";
    return formatFechaGuiones(date);
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
    if (!pedido.productos || pedido.productos.length === 0) {
      showError('Debe agregar al menos un producto antes de crear el pedido.');
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
      es_feria_hogar: esFeriaHogar,
    });
  };

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (numeroOP) {
      const renderImage = async () => {
        setIsGenerating(true);
        const pedidoPreview = document.getElementById("pedido-preview-offscreen");
        if (pedidoPreview) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 100));
            const { default: html2canvas } = await import("html2canvas");
            const canvas = await html2canvas(pedidoPreview, {
              backgroundColor: "var(--surface)",
              scale: 2,
              useCORS: true,
              logging: false,
            });

            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = `pedido_${numeroOP}.png`;
            link.click();
            
            setNotification({ message: 'Pedido creado exitosamente.', type: 'success' });
            setTimeout(() => {
              navigate("/ordenes");
            }, 1800);
          } catch (error) {
            console.error("Error al generar imagen:", error);
            showError("Pedido creado, pero hubo un error al generar la imagen.");
            setTimeout(() => {
              navigate("/ordenes");
            }, 2000);
          } finally {
            setIsGenerating(false);
          }
        } else {
          setNotification({ message: 'Pedido creado exitosamente.', type: 'success' });
          setTimeout(() => {
            navigate("/ordenes");
          }, 1800);
          setIsGenerating(false);
        }
      };
      renderImage();
    }
  }, [numeroOP, navigate]);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['pendientes-ids'] });
  }, [queryClient]);

  if (contextLoading || ventasLoading) {
    return (
      <div className="ds-page">
        <LoadingBlock message="Cargando datos iniciales..." />
      </div>
    );
  }

  return (
    <div className="ds-page crear-pedido-container ds-fade-in">
      <AppNotification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />
      <PageHeader
        icon={FaFileSignature}
        title="Crear Nuevo Pedido"
        subtitle="Completa la información requerida para registrar la orden en el sistema."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(-1)} disabled={createOrderMutation.isPending || isGenerating}>Cancelar</Button>
            <Button variant="primary" type="submit" form="main-form" loading={createOrderMutation.isPending || isGenerating}>
              {createOrderMutation.isPending || isGenerating ? "Creando..." : "Crear Pedido"}
            </Button>
          </>
        }
      />

      {borrador.restaurado && (
        <div className="nv-borrador-banner" role="status" style={{ marginBottom: '1.25rem' }}>
          <span>
            Se recuperó un borrador de pedido guardado el{' '}
            {new Date(borrador.restaurado.guardadoAt).toLocaleString('es-CO')}.
          </span>
          <Button variant="ghost" onClick={descartarBorrador}>Descartar borrador</Button>
        </div>
      )}

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
              <label htmlFor="ordenCompra">Orden de Compra:{esFeriaHogar && ' (opcional)'}</label>
              {esFeriaHogar ? (
                <select id="ordenCompra" name="ordenCompra" value={pedido.ordenCompra} onChange={handleChange}>
                  <option value="">Sin O.C. asociada — Feria del Hogar</option>
                  {ventasPendientes.map((id) => <option key={id} value={id}>{id}</option>)}
                </select>
              ) : ventasError ? <p className="error-text">No se pudieron cargar las órdenes.</p>
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
              <input id="fecha" type="date" name="fecha" value={pedido.fecha} onChange={handleChange} min={getTodayString()} onClick={(e) => { try { e.target.showPicker(); } catch { /* navegador sin showPicker */ } }} required />
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
              <label className={`custom-toggle-card ${esFeriaHogar ? 'active' : ''}`}>
                <input id="esFeriaHogar" type="checkbox" checked={esFeriaHogar} onChange={(e) => setEsFeriaHogar(e.target.checked)} />
                <span className="toggle-checkbox-custom"></span>
                <span className="toggle-text">¿Corresponde a Feria del Hogar?</span>
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
        <ImagenOrdenPedido
          numero={numeroOP}
          proveedor={proveedores.length > 0 && pedido.proveedor
            ? proveedores.find((p) => String(p.id) === String(pedido.proveedor))?.nombre_empresa || "No seleccionado"
            : "Cargando..."}
          vendedor={vendedores.length > 0 && pedido.vendedor
            ? (vendedores.find((v) => String(v.id) === String(pedido.vendedor))?.first_name || user?.first_name)
            : (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : "Cargando...")}
          ordenCompra={esFeriaHogar
            ? (pedido.ordenCompra ? `${pedido.ordenCompra} (Feria del hogar)` : "Feria del hogar")
            : (pedido.ordenCompra || "No especificado")}
          fechaPedido={getFormattedDate()}
          fechaEntrega={formatDate(pedido.fecha)}
          productos={pedido.productos.map((producto) => ({
            cantidad: producto.cantidad,
            referencia: referencias.length > 0 && producto.referencia
              ? referencias.find((r) => String(r.id) === String(producto.referencia))?.nombre || "No seleccionado"
              : "Cargando...",
            descripcion: producto.descripcion,
          }))}
          nota={pedido.nota}
        />
      </div>
    </div>
  );
}

export default CrearPedidoPage;
