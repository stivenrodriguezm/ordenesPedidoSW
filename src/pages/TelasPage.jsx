import React, { useState, useEffect, useContext, useRef } from 'react';
import API from '../services/api';
import { AppContext, usePermissions } from '../AppContext';
import './OrdenesPage.css';
import './TelasPage.css';
import './VentasImprovements.css';
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
    
    const [selectedProveedores, setSelectedProveedores] = useState([]);
    const [selectedEstados, setSelectedEstados] = useState(['Pendiente', 'En fabrica']);
    const [isProveedoresOpen, setIsProveedoresOpen] = useState(false);
    const [isEstadosOpen, setIsEstadosOpen] = useState(false);
    
    const proveedoresRef = useRef(null);
    const estadosRef = useRef(null);

    const estadosTelas = [
        { value: 'Pendiente', label: 'Pendiente' },
        { value: 'En fabrica', label: 'En fábrica' },
        { value: 'En Lottus', label: 'En Lottus' }
    ];

    const [hasInitializedProveedores, setHasInitializedProveedores] = useState(false);
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
    }, [selectedProveedores, selectedEstados, hasInitializedProveedores]);

    useEffect(() => {
        fetchProveedoresTelas();
        fetchDirecciones();
    }, []);

    useEffect(() => {
        if (proveedoresTelas.length > 0 && !hasInitializedProveedores) {
            setSelectedProveedores(proveedoresTelas.map(p => p.id));
            setHasInitializedProveedores(true);
        }
    }, [proveedoresTelas, hasInitializedProveedores]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (proveedoresRef.current && !proveedoresRef.current.contains(event.target)) setIsProveedoresOpen(false);
            if (estadosRef.current && !estadosRef.current.contains(event.target)) setIsEstadosOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleProveedor = (id) => {
        setSelectedProveedores(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    };

    const selectAllProveedores = () => {
        setSelectedProveedores(prev => prev.length === proveedoresTelas.length ? [] : proveedoresTelas.map(p => p.id));
    };

    const toggleEstado = (val) => {
        setSelectedEstados(prev => prev.includes(val) ? prev.filter(e => e !== val) : [...prev, val]);
    };

    const selectAllEstados = () => {
        setSelectedEstados(prev => prev.length === estadosTelas.length ? [] : estadosTelas.map(e => e.value));
    };

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
            if (selectedProveedores.length > 0) {
                query += `proveedor=${selectedProveedores.join(',')}&`;
            } else if (hasInitializedProveedores) {
                query += `proveedor=ninguno_imposible&`;
            }

            if (selectedEstados.length > 0) {
                query += `estado=${selectedEstados.join(',')}&`;
            } else {
                query += `estado=ninguno_imposible&`;
            }

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
        return orden ? orden.id : id;
    };

    const getVentaId = (ordenAsociadaId) => {
        if (pdfData?.venta_id) return pdfData.venta_id;
        if (!ordenAsociadaId) return null;
        const orden = ordenes.find(o => String(o.id) === String(ordenAsociadaId));
        return orden ? (orden.venta || orden.orden_venta || null) : null;
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
            <div className="o-glass-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', overflow: 'visible' }}>
                <div className="o-filters-bar" style={{ margin: 0, flex: 1, overflow: 'visible', flexWrap: 'wrap' }}>
                    <div className="v-multi-select-container" ref={proveedoresRef}>
                        <button type="button" className={`v-multi-select-btn ${selectedProveedores.length > 0 ? 'active-filter' : ''} ${isProveedoresOpen ? 'open' : ''}`} onClick={() => setIsProveedoresOpen(prev => !prev)}>
                            <span>{selectedProveedores.length === 0 ? 'Proveedor: Ninguno' : selectedProveedores.length === proveedoresTelas.length ? 'Proveedor: Todos' : `Proveedores (${selectedProveedores.length})`}</span>
                            <FaChevronDown style={{ fontSize: '0.65rem', opacity: 0.7 }} />
                        </button>
                        {isProveedoresOpen && (
                            <div className="v-multi-select-popover">
                                <div className="v-popover-header">
                                    <span className="v-popover-title">Proveedores</span>
                                    <button type="button" className="v-popover-action-btn" onClick={selectAllProveedores}>
                                        {selectedProveedores.length === proveedoresTelas.length ? 'Ninguno' : 'Todos'}
                                    </button>
                                </div>
                                {proveedoresTelas.length === 0 ? (
                                    <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>No hay proveedores</div>
                                ) : (
                                    proveedoresTelas.map(p => (
                                        <label key={p.id} className="v-popover-item">
                                            <input type="checkbox" checked={selectedProveedores.includes(p.id)} onChange={() => toggleProveedor(p.id)} />
                                            <span>{p.nombre_empresa}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="v-multi-select-container" ref={estadosRef}>
                        <button type="button" className={`v-multi-select-btn ${selectedEstados.length > 0 ? 'active-filter' : ''} ${isEstadosOpen ? 'open' : ''}`} onClick={() => setIsEstadosOpen(prev => !prev)}>
                            <span>{selectedEstados.length === 0 ? 'Estado: Ninguno' : selectedEstados.length === estadosTelas.length ? 'Estado: Todos' : `Estados (${selectedEstados.length})`}</span>
                            <FaChevronDown style={{ fontSize: '0.65rem', opacity: 0.7 }} />
                        </button>
                        {isEstadosOpen && (
                            <div className="v-multi-select-popover">
                                <div className="v-popover-header">
                                    <span className="v-popover-title">Estados</span>
                                    <button type="button" className="v-popover-action-btn" onClick={selectAllEstados}>
                                        {selectedEstados.length === estadosTelas.length ? 'Ninguno' : 'Todos'}
                                    </button>
                                </div>
                                {estadosTelas.map(e => (
                                    <label key={e.value} className="v-popover-item">
                                        <input type="checkbox" checked={selectedEstados.includes(e.value)} onChange={() => toggleEstado(e.value)} />
                                        <span>{e.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
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
                                    <th>Fabricante</th>
                                    <th>Fecha</th>
                                    <th>Estado</th>
                                    <th>Orden Asoc.</th>
                                    <th>Dirección</th>
                                    <th style={{ textAlign: 'right' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, index) => (
                                        <tr key={index} className="skeleton-row">
                                            <td><div className="skeleton skeleton-text" style={{ width: '30px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '50px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                                        </tr>
                                    ))
                                ) : pedidos.length === 0 ? (
                                    <tr><td colSpan="9" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No hay pedidos registrados</td></tr>
                                ) : (
                                    pedidos.map(pedido => (
                                    <React.Fragment key={pedido.id}>
                                        <tr className={`table-row-clickable ${expandedPedidoId === pedido.id ? 'expanded-row-highlight' : ''}`} onClick={() => toggleExpand(pedido.id)} style={{ cursor: 'pointer' }}>
                                            <td className="font-mono" style={{ fontWeight: '600' }}>#{pedido.id}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                                                        {pedido.usuario_nombre ? pedido.usuario_nombre.substring(0, 2).toUpperCase() : 'U'}
                                                    </div>
                                                    <span style={{ fontWeight: '500' }}>{pedido.usuario_nombre}</span>
                                                </div>
                                            </td>
                                            <td><span style={{ fontWeight: '600', color: '#0f172a' }}>{pedido.proveedor_nombre}</span></td>
                                            <td><span style={{ fontWeight: '500', color: '#475569' }}>{pedido.orden_proveedor_nombre || '-'}</span></td>
                                            <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{pedido.fecha_creacion}</td>
                                            <td>
                                                <span className={`status-badge ${pedido.estado?.toLowerCase().replace(/ /g, '-')}`}>
                                                    {pedido.estado}
                                                </span>
                                            </td>
                                            <td>{pedido.orden_id ? <span style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '0.75rem', color: '#3b82f6' }}>#{pedido.orden_id}</span> : '-'}</td>
                                            <td className="truncate-text" style={{ maxWidth: '350px', fontSize: '0.85rem', color: '#334155' }} title={pedido.direccion_entrega}>{pedido.direccion_entrega}</td>
                                            <td style={{ width: '50px', textAlign: 'right' }}>
                                                <button className="action-btn" onClick={(e) => { e.stopPropagation(); toggleExpand(pedido.id); }} style={{ marginLeft: 'auto' }}>
                                                    {expandedPedidoId === pedido.id ? <FaChevronUp /> : <FaChevronDown />}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedPedidoId === pedido.id && (
                                            <tr className="expanded-row">
                                                <td colSpan="9">
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

                {/* Mobile Card View */}
                <div className="mobile-view">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                            <div key={`skeleton-card-${index}`} className="mobile-card skeleton-item" style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                    <div className="skeleton skeleton-text" style={{ width: '50px' }}></div>
                                    <div className="skeleton skeleton-badge" style={{ width: '80px' }}></div>
                                </div>
                                <div className="skeleton skeleton-text" style={{ width: '120px', height: '1.25rem', marginBottom: '0.5rem' }}></div>
                                <div className="skeleton skeleton-text" style={{ width: '100px', marginBottom: '0.5rem' }}></div>
                            </div>
                        ))
                    ) : pedidos.length > 0 ? (
                        pedidos.map(pedido => (
                            <div className="mobile-card" key={pedido.id} style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div className="mobile-card-header" onClick={() => toggleExpand(pedido.id)} style={{ cursor: 'pointer' }}>
                                    <div className="header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span className="card-id" style={{ fontWeight: 'bold', color: '#0f172a' }}>PT #{pedido.id}</span>
                                        <span className={`status-badge ${pedido.estado?.toLowerCase().replace(/ /g, '-')}`}>
                                            {pedido.estado}
                                        </span>
                                    </div>
                                    <div className="header-main" style={{ marginBottom: '0.5rem' }}>
                                        <div style={{ fontWeight: '600', fontSize: '1rem', color: '#1e293b' }}>
                                            {pedido.proveedor_nombre}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                            Fabricante: <span style={{ fontWeight: '500', color: '#475569' }}>{pedido.orden_proveedor_nombre || '-'}</span>
                                        </div>
                                    </div>
                                    <div className="header-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                                        <span>{pedido.fecha_creacion}</span>
                                        <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                            {pedido.orden_id ? `Ord #${pedido.orden_id}` : 'Sin Orden'}
                                        </span>
                                    </div>
                                </div>
                                
                                {expandedPedidoId === pedido.id && (
                                    <div className="mobile-card-expanded" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Usuario Creador</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                                                    {pedido.usuario_nombre ? pedido.usuario_nombre.substring(0, 2).toUpperCase() : 'U'}
                                                </div>
                                                <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{pedido.usuario_nombre}</span>
                                            </div>
                                        </div>
                                        
                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Dirección de Entrega</div>
                                            <div style={{ fontSize: '0.9rem', color: '#334155' }}>{pedido.direccion_entrega}</div>
                                        </div>

                                        {hasPermission('EDITAR_ESTADO_TELA_ORDEN') && (
                                            <button 
                                                className="btn-edit-estado" 
                                                style={{ width: '100%', justifyContent: 'center', padding: '0.5rem', marginBottom: '1rem' }}
                                                onClick={() => setEditEstadoModal({
                                                    open: true,
                                                    pedidoId: pedido.id,
                                                    currentEstado: pedido.estado,
                                                    newEstado: pedido.estado
                                                })}
                                            >
                                                Editar Estado ✏️
                                            </button>
                                        )}

                                        <div className="tela-expanded-body" style={{ padding: '0' }}>
                                            <h4 style={{ fontSize: '0.9rem', color: '#0f172a', marginBottom: '0.5rem' }}>Detalles de Telas</h4>
                                            <table className="details-table" style={{ width: '100%' }}>
                                                <thead>
                                                    <tr>
                                                        <th>Tela</th>
                                                        <th>Cant.</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pedido.detalles && pedido.detalles.length > 0
                                                        ? pedido.detalles.map(detalle => (
                                                            <tr key={detalle.id}>
                                                                <td style={{ fontSize: '0.85rem' }}>{detalle.tela}</td>
                                                                <td style={{ fontSize: '0.85rem' }}>{detalle.cantidad}</td>
                                                            </tr>
                                                        ))
                                                        : <tr><td colSpan="2" style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>Sin detalles.</td></tr>
                                                    }
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            No hay pedidos registrados
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination Controls */}

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
                id="pedido-tela-preview"
                ref={previewRef}
                style={{
                    position: 'absolute',
                    top: '-9999px',
                    left: '-9999px',
                    width: '800px',
                    backgroundColor: '#ffffff',
                    padding: '36px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    display: 'none',
                }}
            >
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <h1 style={{ fontFamily: '"Audiowide", sans-serif', fontSize: '38px', margin: '0', color: '#0f172a', lineHeight: '1', textTransform: 'uppercase', letterSpacing: '2px' }}>LOTTUS</h1>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', margin: '6px 0 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>Mobiliario & Diseño</p>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pedido de Telas</h2>
                        <div style={{ display: 'inline-block', backgroundColor: '#0f172a', color: 'white', padding: '4px 12px', borderRadius: '4px', marginTop: '8px', fontSize: '18px', fontWeight: '700' }}>
                            Nº {createdPedidoId}
                        </div>
                    </div>
                </div>

                {/* Metadata Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px', fontSize: '14px', lineHeight: '1.6', color: '#334155', backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div>
                        <p style={{ margin: '0 0 8px 0' }}>
                            <strong style={{ color: '#0f172a', fontWeight: '600', display: 'inline-block', width: '130px' }}>Proveedor:</strong>{' '}
                            <span style={{ color: '#1e293b' }}>{pdfData ? proveedoresTelas.find(p => p.id === parseInt(pdfData.proveedor))?.nombre_empresa || 'N/A' : 'N/A'}</span>
                        </p>
                        <p style={{ margin: '0 0 8px 0' }}>
                            <strong style={{ color: '#0f172a', fontWeight: '600', display: 'inline-block', width: '130px' }}>Solicitante:</strong>{' '}
                            <span style={{ color: '#1e293b' }}>{usuario ? `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim() : 'N/A'}</span>
                        </p>
                        <p style={{ margin: '0' }}>
                            <strong style={{ color: '#0f172a', fontWeight: '600', display: 'inline-block', width: '130px' }}>Orden Asociada:</strong>{' '}
                            <span style={{ color: '#1e293b', fontWeight: '700' }}>{pdfData?.orden_asociada_id ? `#${getOrdenId(pdfData.orden_asociada_id)}` : (pdfData?.orden_id ? `#${pdfData.orden_id}` : 'N/A')}</span>
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 8px 0' }}>
                            <strong style={{ color: '#0f172a', fontWeight: '600' }}>Fecha:</strong>{' '}
                            <span style={{ color: '#1e293b' }}>{getFormattedDate()}</span>
                        </p>
                        <p style={{ margin: '0' }}>
                            <strong style={{ color: '#0f172a', fontWeight: '600' }}>Venta Asociada:</strong>{' '}
                            <span style={{ color: '#1e293b', fontWeight: '700' }}>{(() => {
                                const vId = getVentaId(pdfData?.orden_asociada_id);
                                return vId ? `#${vId}` : 'N/A';
                            })()}</span>
                        </p>
                    </div>
                </div>

                {/* Details Section */}
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detalles de Telas</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                    <thead style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                        <tr>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', borderRadius: '6px 0 0 0' }}>Descripción</th>
                            <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600', fontSize: '14px', width: '160px', borderRadius: '0 6px 0 0' }}>Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pdfData?.detalles && pdfData.detalles.length > 0 ? (
                            pdfData.detalles.map((detalle, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '14px 16px', fontSize: '15px', color: '#1e293b', fontWeight: '500' }}>{detalle.tela}</td>
                                    <td style={{ padding: '14px 16px', fontSize: '16px', color: '#0f172a', textAlign: 'center', fontWeight: '700' }}>{detalle.cantidad}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="2" style={{ padding: '14px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>Sin detalles registrados</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Delivery Address Section */}
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>Dirección de entrega:</h3>
                <div style={{ 
                    backgroundColor: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '6px', 
                    padding: '12px 16px', 
                    fontSize: '14px', 
                    color: '#334155',
                    lineHeight: '1.5'
                }}>
                    {pdfData?.direccion_entrega || 'No especificada'}
                </div>
            </div>
        </div>
    );
};

export default TelasPage;
