import React, { useState, useEffect, useContext, useRef } from 'react';
import API from '../services/api';
import { AppContext, usePermissions } from '../AppContext';
import './TelasPage.css';
import * as XLSX from 'xlsx';
import { FaPlus, FaChevronDown, FaChevronUp, FaTrashAlt, FaCog, FaFileExport } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import logoFinal from '../assets/logoFinal.png';
import CrearPedidoTelaModal from '../components/CrearPedidoTelaModal';
import AppNotification from '../components/AppNotification';

const TelasPage = () => {
    const { usuario } = useContext(AppContext);
    const hasPermission = usePermissions();
    const [pedidos, setPedidos] = useState([]);
    const [ordenes, setOrdenes] = useState([]);
    const [proveedoresTelas, setProveedoresTelas] = useState([]);
    const [filters, setFilters] = useState({
        proveedor: '',
        estado: ''
    });
    const [expandedPedidoId, setExpandedPedidoId] = useState(null);
    const [showPedidoModal, setShowPedidoModal] = useState(false);
    const [showProveedorModal, setShowProveedorModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [createdPedidoId, setCreatedPedidoId] = useState(null);
    const [pdfData, setPdfData] = useState(null);
    const [editEstadoModal, setEditEstadoModal] = useState({ open: false, pedidoId: null, currentEstado: '', newEstado: '' });
    const [notification, setNotification] = useState({ message: '', type: '' });
    const previewRef = useRef(null);

    // Direcciones de Entrega state
    const [direcciones, setDirecciones] = useState([]);
    const [showDireccionModal, setShowDireccionModal] = useState(false);
    const [isOtraDireccion, setIsOtraDireccion] = useState(false);
    const [newDireccion, setNewDireccion] = useState({ nombre: '', detalles: '' });

    // New Order Form State
    const [newPedido, setNewPedido] = useState({
        proveedor: '',
        direccion_entrega: '',
        direccion_entrega_custom: '',
        orden_asociada_id: '',
        detalles: [{ tela: '', cantidad: '' }]
    });

    // New Provider Form State
    const [newProveedor, setNewProveedor] = useState({
        nombre_empresa: '',
        nombre_encargado: '',
        contacto: ''
    });

    useEffect(() => {
        fetchData();
        fetchOrdenes();
        fetchProveedoresTelas();
        fetchDirecciones();
    }, [filters]);

    // --- Permisos y edición de estado de PedidoTela ---
    // Devuelve true si el usuario puede VER el botón de editar (acceso al pedido)
    const canAccessPedidoTela = (pedido) => {
        if (!usuario) return false;
        const role = usuario.role?.toLowerCase();
        if (role === 'administrador' || role === 'auxiliar') return true;
        // Vendedor: solo sus propios pedidos (backend ya filtra, pero doble check)
        if (role === 'vendedor') return pedido.usuario === usuario.id;
        return false;
    };

    // Devuelve true si el select de estado debe estar habilitado
    const canEditEstado = (currentEstado) => {
        if (!usuario) return false;
        const role = usuario.role?.toLowerCase();
        if (role === 'administrador') return true;
        // auxiliar y vendedor: solo si NO está en 'En fabrica'
        return currentEstado !== 'En fabrica';
    };

    const handleSaveEstado = async () => {
        if (!editEstadoModal.newEstado) return;
        try {
            const response = await API.patch(`pedidos-telas/${editEstadoModal.pedidoId}/`, { estado: editEstadoModal.newEstado });
            // Update local list
            setPedidos(prev => prev.map(p =>
                p.id === editEstadoModal.pedidoId ? { ...p, estado: response.data.estado } : p
            ));
            setEditEstadoModal({ open: false, pedidoId: null, currentEstado: '', newEstado: '' });
        } catch (error) {
            console.error('Error actualizando estado:', error);
            showNotification(error.response?.data?.error || 'Error al actualizar el estado.', 'error');
        }
    };


    const fetchProveedoresTelas = async () => {
        try {
            const response = await API.get('proveedores-telas/');
            setProveedoresTelas(response.data.results || response.data);
        } catch (error) {
            console.error("Error fetching proveedores telas:", error);
        }
    };

    const fetchDirecciones = async () => {
        try {
            const response = await API.get('direcciones-entrega/');
            setDirecciones(response.data.results || response.data);
        } catch (error) {
            console.error("Error fetching direcciones:", error);
        }
    };

    // Generate PDF when pedido is created
    useEffect(() => {
        if (createdPedidoId && previewRef.current) {
            const generatePDF = async () => {
                try {
                    previewRef.current.style.display = 'block';
                    const canvas = await html2canvas(previewRef.current, {
                        backgroundColor: '#ffffff',
                        scale: 2,
                        useCORS: true,
                    });
                    
                    const image = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.href = image;
                    link.download = `pedido_telas_${createdPedidoId}.png`;
                    link.click();

                    setNotification({ message: 'Pedido de tela creado y descargado exitosamente.', type: 'success' });
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    setNotification({ message: 'Pedido de tela creado, pero hubo un error al descargar la imagen.', type: 'error' });
                } finally {
                    if (previewRef.current) {
                        previewRef.current.style.display = 'none';
                    }
                    setCreatedPedidoId(null);
                }
            };
            generatePDF();
        }
    }, [createdPedidoId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let query = '?';
            if (filters.proveedor) query += `proveedor=${filters.proveedor}&`;
            if (filters.estado) query += `estado=${filters.estado}&`;

            const response = await API.get(`pedidos-telas/${query}`);
            setPedidos(response.data.results || response.data);
        } catch (error) {
            console.error("Error fetching pedidos telas:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrdenes = async () => {
        try {
            // listar-pedidos handles role-based filtering automatically:
            // - vendedor: sees only their own orders
            // - admin/auxiliar: sees all orders
            // estado=en_proceso filters to 'en_proceso' and 'pendiente' states
            const response = await API.get('listar-pedidos/?estado=en_proceso&tela=Por pedir');
            const data = Array.isArray(response.data.results) ? response.data.results : (Array.isArray(response.data) ? response.data : []);
            setOrdenes(data);
        } catch (error) {
            console.error("Error fetching ordenes:", error);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const toggleExpand = (id) => {
        setExpandedPedidoId(expandedPedidoId === id ? null : id);
    };

    const handleCreateProveedor = async (e) => {
        e.preventDefault();
        try {
            await API.post('proveedores-telas/', newProveedor);
            setShowProveedorModal(false);
            setNewProveedor({ nombre_empresa: '', nombre_encargado: '', contacto: '' });
            // Refresh proveedores from context
            showNotification('Proveedor creado exitosamente', 'success');
        } catch (error) {
            console.error("Error creating proveedor:", error);
            showNotification('Error al crear proveedor', 'error');
        }
    };

    const handleCreateDireccion = async (e) => {
        e.preventDefault();
        try {
            await API.post('direcciones-entrega/', newDireccion);
            setNewDireccion({ nombre: '', detalles: '' });
            fetchDirecciones();
            showNotification('Dirección agregada exitosamente', 'success');
        } catch (error) {
            console.error("Error creating direccion:", error);
            showNotification('Error al guardar dirección', 'error');
        }
    };

    const handleDeleteDireccion = async (id) => {
        if (!window.confirm("¿Está seguro de eliminar esta dirección predefinida?")) return;
        try {
            await API.delete(`direcciones-entrega/${id}/`);
            fetchDirecciones();
            // Si el pedido actual en creación tiene esa dirección, quitamos OTRA
            if (newPedido.direccion_entrega === String(id)) {
                setNewPedido(prev => ({ ...prev, direccion_entrega: '', direccion_entrega_custom: '' }));
                setIsOtraDireccion(false);
            }
        } catch (error) {
            console.error("Error deleting direccion:", error);
            showNotification('Error al eliminar la dirección', 'error');
        }
    };

    const handlePedidoChange = (e) => {
        const { name, value } = e.target;
        if (name === 'direccion_entrega') {
            setIsOtraDireccion(value === 'OTRA');
            if (value !== 'OTRA') {
                setNewPedido(prev => ({ ...prev, [name]: value, direccion_entrega_custom: '' }));
                return;
            }
        }
        setNewPedido(prev => ({ ...prev, [name]: value }));
    };

    const handleDetalleChange = (index, field, value) => {
        const newDetalles = [...newPedido.detalles];
        newDetalles[index][field] = value;
        setNewPedido(prev => ({ ...prev, detalles: newDetalles }));
    };

    const addDetalle = () => {
        setNewPedido(prev => ({
            ...prev,
            detalles: [...prev.detalles, { tela: '', cantidad: '' }]
        }));
    };

    const removeDetalle = (index) => {
        const newDetalles = newPedido.detalles.filter((_, i) => i !== index);
        setNewPedido(prev => ({ ...prev, detalles: newDetalles }));
    };

    const handleCreatePedido = async (e) => {
        e.preventDefault();

        // Si es CUSTOM, nos aseguramos que el textbox tenga contenido
        let dirFila = newPedido.direccion_entrega;
        if (isOtraDireccion) {
            if (!newPedido.direccion_entrega_custom.trim()) {
                showNotification("Por favor escriba la dirección de entrega.", 'error');
                return;
            }
            dirFila = newPedido.direccion_entrega_custom;
        } else {
            // Buscamos los detalles de la dirección predefinida
            const addr = direcciones.find(d => String(d.id) === String(newPedido.direccion_entrega));
            if (addr) dirFila = `${addr.nombre} - ${addr.detalles}`;
        }

        try {
            const payload = {
                proveedor: parseInt(newPedido.proveedor),
                direccion_entrega: dirFila,
                estado: 'Pendiente', // Always Pendiente
                orden_asociada_id: newPedido.orden_asociada_id ? parseInt(newPedido.orden_asociada_id) : null,
                detalles: newPedido.detalles.filter(d => d.tela && d.cantidad)
            };

            const response = await API.post('pedidos-telas/', payload);

            // Save data for PDF generation BEFORE clearing the form
            setPdfData({
                proveedor: newPedido.proveedor,
                direccion_entrega: dirFila,
                orden_asociada_id: newPedido.orden_asociada_id,
                detalles: newPedido.detalles.filter(d => d.tela && d.cantidad)
            });

            setCreatedPedidoId(response.data.id);
            setShowPedidoModal(false);
            setNewPedido({
                proveedor: '',
                direccion_entrega: '',
                direccion_entrega_custom: '',
                orden_asociada_id: '',
                detalles: [{ tela: '', cantidad: '' }]
            });
            setIsOtraDireccion(false);
            fetchData();
        } catch (error) {
            console.error("Error creating pedido tela:", error);
            setNotification({ message: 'Error al crear pedido de tela', type: 'error' });
        }
    };

    const getFormattedDate = () => {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
        const month = monthNames[today.getMonth()];
        const year = today.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const getOrdenId = (id) => {
        const orden = ordenes.find(o => o.id === parseInt(id));
        return orden ? orden.id : '';
    };

    const exportPedidos = () => {
        const dataToExport = pedidos.map(p => ({
            'ID': p.id,
            'Usuario': p.usuario_nombre,
            'Proveedor': p.proveedor_nombre,
            'Fecha': p.fecha_creacion,
            'Estado': p.estado,
            'Orden Asociada': p.orden_id ? `#${p.orden_id}` : '-',
            'Dirección Entrega': p.direccion_entrega,
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pedidos Telas');
        XLSX.writeFile(wb, 'PedidosTelas.xlsx');
    };

    return (
        <div className="page-container">
            <AppNotification 
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ message: '', type: '' })}
            />
            <div className="o-glass-header" style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', overflowX: 'auto' }}>
                <div className="o-filters-bar" style={{ margin: 0, flex: 1 }}>
                    <div className="o-select-pill">
                        <select name="proveedor" value={filters.proveedor} onChange={handleFilterChange}>
                            <option value="">Proveedor: Todos</option>
                            {proveedoresTelas.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre_empresa}</option>
                            ))}
                        </select>
                    </div>
                    <div className="o-select-pill">
                        <select name="estado" value={filters.estado} onChange={handleFilterChange}>
                            <option value="">Estado: Todos</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="En fabrica">En fábrica</option>
                            <option value="En Lottus">En Lottus</option>
                        </select>
                    </div>
                </div>

                <div className="header-actions" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {hasPermission('DESCARGAR_PEDIDO_TELA') && (
                        <button className="o-btn-ghost" onClick={exportPedidos} title="Exportar Excel">
                            <FaFileExport /> Exportar
                        </button>
                    )}
                    {hasPermission('ADMINISTRAR_DIRECCIONES_TELA') && (
                        <button className="o-btn-ghost" onClick={() => setShowDireccionModal(true)} title="Gestionar Direcciones">
                            <FaCog /> Direcciones
                        </button>
                    )}
                    {hasPermission('ADMINISTRAR_PROVEEDORES_TELA') && (
                        <button className="o-btn-ghost" onClick={() => setShowProveedorModal(true)} title="Nuevo Proveedor">
                            <FaPlus /> Proveedor
                        </button>
                    )}
                    {hasPermission('CREAR_PEDIDO_TELA') && (
                        <button className="o-btn-primary-glow" onClick={() => setShowPedidoModal(true)}>
                            <FaPlus /> <span className="long-text">Nuevo Pedido</span><span className="short-text">Nuevo</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="ordenes-container">
                <div className="desktop-view">
                        <table className="premium-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Usuario</th>
                                    <th>Proveedor</th>
                                    <th>Fecha</th>
                                    <th>Estado</th>
                                    <th>Orden Asoc.</th>
                                    <th>Dirección</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, index) => (
                                        <tr key={index} className="skeleton-row">
                                            <td><div className="skeleton skeleton-text" style={{ width: '30px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '50px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                                        </tr>
                                    ))
                                ) : pedidos.length === 0 ? (
                                    <tr><td colSpan="8" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No hay pedidos registrados</td></tr>
                                ) : (
                                    pedidos.map(pedido => (
                                    <React.Fragment key={pedido.id}>
                                        <tr className={`table-row-clickable ${expandedPedidoId === pedido.id ? 'expanded-row-highlight' : ''}`} onClick={() => toggleExpand(pedido.id)} style={{ cursor: 'pointer' }}>
                                            <td className="font-mono">{pedido.id}</td>
                                            <td>{pedido.usuario_nombre}</td>
                                            <td>{pedido.proveedor_nombre}</td>
                                            <td>{pedido.fecha_creacion}</td>
                                            <td>
                                                <span className={`status-badge ${pedido.estado.toLowerCase().replace(' ', '-')}`}>
                                                    {pedido.estado}
                                                </span>
                                            </td>
                                            <td>{pedido.orden_id ? `#${pedido.orden_id}` : '-'}</td>
                                            <td className="truncate-text" style={{ maxWidth: '200px' }}>{pedido.direccion_entrega}</td>
                                            <td>
                                                <button className="action-btn" onClick={(e) => { e.stopPropagation(); toggleExpand(pedido.id); }}>
                                                    {expandedPedidoId === pedido.id ? <FaChevronUp /> : <FaChevronDown />}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedPedidoId === pedido.id && (
                                            <tr className="expanded-row">
                                                <td colSpan="8">
                                                    <div className="details-view-wrapper telas-details-wrapper">
                                                        <div className="tela-expanded-wrapper">
                                                            <div className="tela-expanded-header">
                                                                <div className="tela-expanded-meta">
                                                                    <span className="tela-meta-id">PT #{pedido.id}</span>
                                                                    <span className="tela-meta-sep">·</span>
                                                                    <span className="tela-meta-sep">·</span>
                                                                    <span className="tela-meta-sep">·</span>
                                                                </div>
                                                                <div className="tela-expanded-actions">
                                                                    {hasPermission('EDITAR_ESTADO_TELA_ORDEN') ? (
                                                                        <span
                                                                            className={`status-badge ${pedido.estado?.toLowerCase().replace(/ /g, '-')}`}
                                                                            onClick={() => setEditEstadoModal({
                                                                                open: true,
                                                                                pedidoId: pedido.id,
                                                                                currentEstado: pedido.estado,
                                                                                newEstado: pedido.estado
                                                                            })}
                                                                            title="Clic para editar estado"
                                                                            style={{ cursor: 'pointer' }}
                                                                        >
                                                                            {pedido.estado} ✏️
                                                                        </span>
                                                                    ) : (
                                                                        <span className={`status-badge ${pedido.estado?.toLowerCase().replace(/ /g, '-')}`}>
                                                                            {pedido.estado}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="tela-expanded-body">
                                                                <table className="details-table">
                                                                    <thead>
                                                                        <tr>
                                                                            <th>Tela / Descripción</th>
                                                                            <th>Cantidad</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {pedido.detalles && pedido.detalles.length > 0
                                                                            ? pedido.detalles.map(detalle => (
                                                                                <tr key={detalle.id}>
                                                                                    <td>{detalle.tela}</td>
                                                                                    <td>{detalle.cantidad}</td>
                                                                                </tr>
                                                                            ))
                                                                            : <tr><td colSpan="2" style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>Sin detalles registrados.</td></tr>
                                                                        }
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            {/* Modal Editar Estado de Pedido Tela */}
            {editEstadoModal.open && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>Editar Estado</h3>
                            <button className="modal-close" type="button" onClick={() => setEditEstadoModal({ open: false, pedidoId: null, currentEstado: '', newEstado: '' })}>×</button>
                        </div>
                        <div className="form-group">
                            <label>PT #{editEstadoModal.pedidoId} &mdash; Estado actual: <strong>{editEstadoModal.currentEstado}</strong></label>
                            <select
                                value={editEstadoModal.newEstado}
                                onChange={(e) => setEditEstadoModal(prev => ({ ...prev, newEstado: e.target.value }))}
                                disabled={!canEditEstado(editEstadoModal.currentEstado)}
                            >
                                <option value="Pendiente">Pendiente</option>
                                <option value="En fabrica">En fabrica</option>
                                <option value="En Lottus">En Lottus</option>
                            </select>
                            {!canEditEstado(editEstadoModal.currentEstado) && (
                                <p className="estado-locked-note">🔒 No se puede editar un pedido en estado "En fabrica".</p>
                            )}
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn-secondary" onClick={() => setEditEstadoModal({ open: false, pedidoId: null, currentEstado: '', newEstado: '' })}>Cancelar</button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleSaveEstado}
                                disabled={!canEditEstado(editEstadoModal.currentEstado)}
                            >Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear Proveedor */}
            {showProveedorModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Nuevo Proveedor de Telas</h3>
                        <form onSubmit={handleCreateProveedor}>
                            <div className="form-group">
                                <label>Nombre Empresa</label>
                                <input required type="text" value={newProveedor.nombre_empresa} onChange={(e) => setNewProveedor({ ...newProveedor, nombre_empresa: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Encargado</label>
                                <input required type="text" value={newProveedor.nombre_encargado} onChange={(e) => setNewProveedor({ ...newProveedor, nombre_encargado: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Contacto</label>
                                <input required type="text" value={newProveedor.contacto} onChange={(e) => setNewProveedor({ ...newProveedor, contacto: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowProveedorModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Crear Dirección (Solo admin o auxiliar) */}
            {showDireccionModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>Gestionar Direcciones de Entrega</h3>
                            <button className="modal-close" type="button" onClick={() => setShowDireccionModal(false)}>×</button>
                        </div>

                        <div className="direcciones-list" style={{ marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {direcciones.length === 0 ? (
                                <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', margin: '1rem 0' }}>No hay direcciones registradas.</p>
                            ) : (
                                direcciones.map(d => (
                                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.75rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '6px', marginBottom: '0.5rem' }}>
                                        <div>
                                            <strong style={{ fontSize: '0.9rem', color: '#1e293b', display: 'block' }}>{d.nombre}</strong>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{d.detalles}</span>
                                        </div>
                                        <button type="button" className="btn-icon btn-remove" onClick={() => handleDeleteDireccion(d.id)} title="Eliminar dirección" style={{ padding: '0.25rem' }}>
                                            <FaTrashAlt />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '1.5rem 0' }} />

                        <h4 style={{ fontSize: '1rem', color: '#1e293b', marginBottom: '1rem' }}>Agregar Nueva Dirección</h4>
                        <form onSubmit={handleCreateDireccion}>
                            <div className="form-group">
                                <label>Nombre Corto (Ej. "Bodega Principal")</label>
                                <input required type="text" value={newDireccion.nombre} onChange={(e) => setNewDireccion({ ...newDireccion, nombre: e.target.value })} placeholder="Identificador..." />
                            </div>
                            <div className="form-group">
                                <label>Detalles de la Dirección</label>
                                <textarea required value={newDireccion.detalles} onChange={(e) => setNewDireccion({ ...newDireccion, detalles: e.target.value })} placeholder="Calle, Barrio, Ciudad..." rows="2"></textarea>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowDireccionModal(false)}>Cerrar</button>
                                <button type="submit" className="btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Crear Pedido */}
            {showPedidoModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h3>Nuevo Pedido de Telas</h3>
                            <button className="modal-close" type="button" onClick={() => setShowPedidoModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreatePedido}>
                            <div className="form-group">
                                <label>Proveedor</label>
                                <select required name="proveedor" value={newPedido.proveedor} onChange={handlePedidoChange}>
                                    <option value="">Seleccione...</option>
                                    {proveedoresTelas.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre_empresa}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Orden Asociada</label>
                                <select required name="orden_asociada_id" value={newPedido.orden_asociada_id} onChange={handlePedidoChange}>
                                    <option value="">Seleccione una orden...</option>
                                    {ordenes.map(o => (
                                        <option key={o.id} value={o.id}>Orden #{o.id} - {o.proveedor_nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <h4 style={{ marginTop: '1.5rem', marginBottom: '1rem', color: '#1e293b' }}>Detalles (Telas)</h4>
                            {newPedido.detalles.map((detalle, index) => (
                                <div key={index} className="detalle-row">
                                    <div style={{ flex: 2 }}>
                                        <label>Tela (Descripción)</label>
                                        <input required type="text" value={detalle.tela} onChange={(e) => handleDetalleChange(index, 'tela', e.target.value)} placeholder="Ej. Lino Blanco" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label>Cantidad</label>
                                        <input required type="number" step="0.01" value={detalle.cantidad} onChange={(e) => handleDetalleChange(index, 'cantidad', e.target.value)} />
                                    </div>
                                    {newPedido.detalles.length > 1 && (
                                        <button type="button" className="btn-icon btn-remove" onClick={() => removeDetalle(index)} title="Eliminar tela">
                                            <FaTrashAlt />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button type="button" className="btn-info btn-sm" onClick={addDetalle}>+ Agregar Tela</button>

                            <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    Dirección de Entrega
                                    {(usuario?.role?.toLowerCase() === 'administrador' || usuario?.role?.toLowerCase() === 'auxiliar') && (
                                        <button
                                            type="button"
                                            className="btn-icon-small"
                                            title="Agregar nueva dirección predefinida"
                                            onClick={() => setShowDireccionModal(true)}
                                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
                                        >
                                            <FaCog />
                                        </button>
                                    )}
                                </label>
                                <select required name="direccion_entrega" value={newPedido.direccion_entrega} onChange={handlePedidoChange}>
                                    <option value="">Seleccione una dirección...</option>
                                    {direcciones.map(d => (
                                        <option key={d.id} value={d.id}>{d.nombre} - {d.detalles}</option>
                                    ))}
                                    <option value="OTRA">Otra dirección (escribir manualmente)</option>
                                </select>
                            </div>

                            {isOtraDireccion && (
                                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                    <textarea required name="direccion_entrega_custom" value={newPedido.direccion_entrega_custom} onChange={handlePedidoChange} placeholder="Escriba la dirección de entrega detallada..." rows="2"></textarea>
                                </div>
                            )}

                            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                                <button type="button" className="btn-secondary" onClick={() => setShowPedidoModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Crear Pedido</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Hidden Preview for PDF/Image Generation */}
            <div
                id="telas-preview"
                ref={previewRef}
                style={{
                    position: 'absolute',
                    top: '-9999px',
                    left: '-9999px',
                    width: '800px',
                    backgroundColor: '#ffffff',
                    padding: '40px',
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    color: '#000000',
                    display: 'none',
                }}
            >
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ 
                        backgroundColor: '#000000', 
                        color: '#ffffff', 
                        padding: '12px 24px', 
                        fontWeight: 'bold', 
                        fontSize: '36px', 
                        letterSpacing: '5px',
                        display: 'inline-block',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}>
                        LOTTUS
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h1 style={{ margin: '0', fontSize: '24px', fontWeight: 'normal', color: '#1e293b' }}>Pedido de Telas</h1>
                        <h2 style={{ margin: '5px 0 0', fontSize: '20px', fontWeight: 'bold', color: '#dc2626' }}>No. {createdPedidoId}</h2>
                    </div>
                </div>

                {/* Thick Black Divider Line */}
                <hr style={{ border: 'none', borderTop: '3px solid #000000', margin: '0 0 25px 0' }} />

                {/* Metadata Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', fontSize: '15px', color: '#1e293b', lineHeight: '1.8' }}>
                    <div>
                        <div><strong>Proveedor:</strong> {pdfData ? proveedoresTelas.find(p => p.id === parseInt(pdfData.proveedor))?.nombre_empresa || '' : ''}</div>
                        <div><strong>Usuario:</strong> {usuario ? `${usuario.first_name} ${usuario.last_name}` : ''}</div>
                        <div><strong>Orden Asociada:</strong> {pdfData?.orden_asociada_id ? `#${getOrdenId(pdfData.orden_asociada_id)}` : 'N/A'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div><strong>Fecha:</strong> {getFormattedDate()}</div>
                    </div>
                </div>

                {/* Details Section */}
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: '25px 0 12px 0' }}>Telas:</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>Descripción</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 'bold', fontSize: '15px', color: '#1e293b', width: '250px' }}>Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pdfData?.detalles.map((detalle, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 16px', fontSize: '15px', color: '#334155' }}>{detalle.tela}</td>
                                <td style={{ padding: '12px 16px', fontSize: '15px', color: '#334155' }}>{detalle.cantidad}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Delivery Address Section */}
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: '25px 0 12px 0' }}>Dirección de Entrega:</h3>
                <div style={{ 
                    backgroundColor: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '6px', 
                    padding: '12px 16px', 
                    fontSize: '15px', 
                    color: '#334155' 
                }}>
                    {pdfData?.direccion_entrega || 'No especificada'}
                </div>
            </div>
        </div>
    );
};

export default TelasPage;
