import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

import API from '../services/api';
import { AppContext, usePermissions } from '../AppContext';
import './OrdenesPage.css';
import './TelasPage.css';
import './VentasImprovements.css';
import { usePageRefresh } from '../hooks/usePageRefresh';
import useDebounce from '../hooks/useDebounce';
import { useDialogo } from '../hooks/useDialogo';
import { FaPlus, FaChevronDown, FaChevronUp, FaTrashAlt, FaCog, FaFileExport, FaSearch, FaLayerGroup, FaEdit } from 'react-icons/fa';
import '../assets/logoFinal.png';
import CrearPedidoTelaModal from '../components/CrearPedidoTelaModal';
import DescargarPedidoTela from '../components/imagenes/DescargarPedidoTela';
import AppNotification from '../components/AppNotification';
import { PageHeader, Button, Modal } from '../components/ui';

const TelasPage = () => {
    const { usuario } = useContext(AppContext);
    const hasPermission = usePermissions();
    const [pedidos, setPedidos] = useState([]);
    const [proveedoresTelas, setProveedoresTelas] = useState([]);
    
    const [selectedProveedores, setSelectedProveedores] = useState([]);
    const [selectedEstados, setSelectedEstados] = useState(['Pendiente', 'En Lottus']);
    const [isProveedoresOpen, setIsProveedoresOpen] = useState(false);
    const [isEstadosOpen, setIsEstadosOpen] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 400);

    const proveedoresRef = useRef(null);
    const estadosRef = useRef(null);

    const estadosTelas = [
        { value: 'Pendiente', label: 'Pendiente' },
        { value: 'En fabrica', label: 'En fábrica' },
        { value: 'En Lottus', label: 'En Lottus' },
        { value: 'Anulado', label: 'Anulado' }
    ];

    const [hasInitializedProveedores, setHasInitializedProveedores] = useState(false);
    const [expandedPedidoId, setExpandedPedidoId] = useState(null);
    const [showPedidoModal, setShowPedidoModal] = useState(false);
    const [showProveedorModal, setShowProveedorModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [createdPedidoId, setCreatedPedidoId] = useState(null);
    const EDITAR_ESTADO_CERRADO = { open: false, pedidoId: null, currentEstado: '', newEstado: '', motivo: '', pedido: null, guardando: false };
    const [editEstadoModal, setEditEstadoModal] = useState(EDITAR_ESTADO_CERRADO);
    const abrirEditarEstado = pedido => setEditEstadoModal({ ...EDITAR_ESTADO_CERRADO, open: true, pedidoId: pedido.id, currentEstado: pedido.estado, newEstado: pedido.estado, pedido });
    const cerrarEditarEstado = () => setEditEstadoModal(prev => prev.guardando ? prev : EDITAR_ESTADO_CERRADO);
    const [notification, setNotification] = useState({ message: '', type: '' });
    const showNotification = (message, type) => setNotification({ message, type });
    const previewRef = useRef(null);

    // Direcciones de Entrega state
    const [direcciones, setDirecciones] = useState([]);
    const [showDireccionModal, setShowDireccionModal] = useState(false);
    const [, setIsOtraDireccion] = useState(false);
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

    const fetchData = async () => {
        setLoading(true);
        try {
            let query = '?';

            // Con búsqueda activa, el backend ignora los filtros de Proveedor/Estado
            // y busca en TODO lo que el usuario puede ver — así "buscar" siempre
            // encuentra lo que existe, sin depender de qué haya quedado marcado en
            // esos popovers. page_size más alto para no truncar resultados de búsqueda.
            if (debouncedSearchTerm) {
                query += `search=${encodeURIComponent(debouncedSearchTerm)}&page_size=100&`;
            } else {
                if (selectedProveedores.length > 0) {
                    query += `proveedor=${encodeURIComponent(selectedProveedores.join(','))}&`;
                } else if (hasInitializedProveedores) {
                    query += `proveedor=ninguno_imposible&`;
                }

                if (selectedEstados.length > 0) {
                    query += `estado=${encodeURIComponent(selectedEstados.join(','))}&`;
                } else {
                    query += `estado=ninguno_imposible&`;
                }
            }

            const response = await API.get(`pedidos-telas/${query}`);
            setPedidos(response.data.results || response.data);
        } catch (error) {
            console.error("Error fetching pedidos telas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only fetch data once providers have been initialized (or if filters change after that)
        if (hasInitializedProveedores || debouncedSearchTerm) {
            fetchData();
        }
    }, [selectedProveedores, selectedEstados, hasInitializedProveedores, debouncedSearchTerm]);

    const fetchInit = useCallback(async () => {
        await Promise.allSettled([fetchProveedoresTelas(), fetchDirecciones()]);
    }, []);

    usePageRefresh(fetchInit);

    const proveedorDialogoRef = useDialogo(showProveedorModal, () => setShowProveedorModal(false), {
        hayCambios: Boolean(newProveedor.nombre_empresa || newProveedor.nombre_encargado || newProveedor.contacto),
    });
    const direccionDialogoRef = useDialogo(showDireccionModal, () => setShowDireccionModal(false));

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
    

    // Devuelve true si el select de estado debe estar habilitado
    const canEditEstado = (currentEstado) => {
        if (!usuario || currentEstado === 'Anulado') return false;
        const role = usuario.role?.toLowerCase();
        if (role === 'administrador') return true;
        // auxiliar y vendedor: solo si NO está en 'En fabrica'
        return currentEstado !== 'En fabrica';
    };

    const anulando = editEstadoModal.newEstado === 'Anulado' && editEstadoModal.currentEstado !== 'Anulado';
    const handleSaveEstado = async () => {
        if (!editEstadoModal.newEstado || editEstadoModal.guardando) return;
        const motivo = editEstadoModal.motivo.trim();
        if (anulando && !motivo) {
            showNotification('Escribe el motivo de la anulación.', 'error');
            return;
        }
        setEditEstadoModal(prev => ({ ...prev, guardando: true }));
        try {
            const datos = anulando ? { estado: 'Anulado', motivo_anulacion: motivo } : { estado: editEstadoModal.newEstado };
            const response = await API.patch(`pedidos-telas/${editEstadoModal.pedidoId}/`, datos);
            // Update local list
            setPedidos(prev => prev.map(p =>
                p.id === editEstadoModal.pedidoId ? { ...p, ...response.data } : p
            ));
            setEditEstadoModal(EDITAR_ESTADO_CERRADO);
            if (anulando) showNotification(`Pedido de tela PT #${response.data.id} anulado.`, 'success');
        } catch (error) {
            console.error('Error actualizando estado:', error);
            // Se conserva lo escrito (motivo incluido) para corregir y reintentar.
            setEditEstadoModal(prev => ({ ...prev, guardando: false }));
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
                    const { default: html2canvas } = await import('html2canvas');
                    const canvas = await html2canvas(previewRef.current, {
                        backgroundColor: 'var(--surface)',
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

    

    

    

    

    

    

    

    

    const getFabricante = (pedido) => {
        if (pedido.orden_proveedor_nombre && pedido.orden_proveedor_nombre !== '-' && pedido.orden_proveedor_nombre !== 'N/A') {
            return pedido.orden_proveedor_nombre;
        }
        // El backend ya resuelve el fabricante de la orden asociada; antes se
        // descargaba la primera página de órdenes solo como respaldo (P08-03).
        return '-';
    };

    // El filtrado (por proveedor/estado O por búsqueda de texto) ya lo hace
    // el backend en fetchData — re-filtrar acá en cliente con una lista
    // reducida de campos (sin fabricante/vendedor/venta) era lo que borraba
    // resultados válidos que el servidor sí encontraba correctamente.
    const displayedPedidos = pedidos;

    const exportPedidos = async () => {
        const XLSX = await import('xlsx');
        const dataToExport = displayedPedidos.map(p => ({
            'ID': p.id,
            'Usuario': p.usuario_nombre,
            'Proveedor': p.proveedor_nombre,
            'Fabricante': getFabricante(p),
            'Fecha': p.fecha_creacion,
            'Estado': p.estado,
            'Orden Asociada': p.orden_id ? `#${p.orden_id}` : '-',
            'Venta': p.venta_id ? `#${p.venta_id}` : '-',
            'Vendedor': p.venta_vendedor_nombre || '-',
            'Dirección Entrega': p.direccion_entrega,
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pedidos Telas');
        XLSX.writeFile(wb, 'PedidosTelas.xlsx');
    };

    return (
        <div className="ds-page telas-page ds-fade-in">
            <AppNotification 
                message={notification.message}
                type={notification.type}
                onClose={() => setNotification({ message: '', type: '' })}
            />

            <PageHeader
                icon={FaLayerGroup}
                title="Telas"
                subtitle="Gestión y seguimiento de pedidos de telas a proveedores"
                actions={
                    <>
                        {hasPermission('DESCARGAR_PEDIDO_TELA') && (
                            <Button variant="ghost" icon={FaFileExport} onClick={exportPedidos} title="Exportar Excel" />
                        )}
                        {hasPermission('ADMINISTRAR_DIRECCIONES_TELA') && (
                            <Button variant="ghost" icon={FaCog} onClick={() => setShowDireccionModal(true)} title="Gestionar Direcciones">
                                <span className="long-text">Direcciones</span>
                            </Button>
                        )}
                        {hasPermission('ADMINISTRAR_PROVEEDORES_TELA') && (
                            <Button variant="ghost" icon={FaPlus} onClick={() => setShowProveedorModal(true)} title="Nuevo Proveedor">
                                <span className="long-text">Proveedor</span>
                            </Button>
                        )}
                        {hasPermission('CREAR_PEDIDO_TELA') && (
                            <Button variant="primary" icon={FaPlus} onClick={() => setShowPedidoModal(true)}>
                                <span className="long-text">Nuevo Pedido</span>
                                <span className="short-text">Nuevo</span>
                            </Button>
                        )}
                    </>
                }
            />

            <div className="ds-card telas-filters">
                <div className="o-filters-bar" style={{ margin: 0, flex: 1, overflow: 'visible', flexWrap: 'wrap' }}>
                    
                    {/* Nuevo Buscador */}
                    <div className="v-search-pill">
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="Buscar PT, Proveedor, Cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

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
                                    <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No hay proveedores</div>
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
                                    <th>Venta</th>
                                    <th>Vendedor</th>
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
                                            <td><div className="skeleton skeleton-text" style={{ width: '50px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                                            <td><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                                        </tr>
                                    ))
                                ) : displayedPedidos.length === 0 ? (
                                    <tr><td colSpan="11" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No hay pedidos registrados</td></tr>
                                ) : (
                                    displayedPedidos.map(pedido => (
                                    <React.Fragment key={pedido.id}>
                                        <tr className={`table-row-clickable ${expandedPedidoId === pedido.id ? 'expanded-row-highlight' : ''}`} onClick={() => toggleExpand(pedido.id)} style={{ cursor: 'pointer' }}>
                                            <td className="font-mono" style={{ fontWeight: '600' }}>#{pedido.id}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--gray-200)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                                                        {pedido.usuario_nombre ? pedido.usuario_nombre.substring(0, 2).toUpperCase() : 'U'}
                                                    </div>
                                                    <span style={{ fontWeight: '500' }}>{pedido.usuario_nombre}</span>
                                                </div>
                                            </td>
                                            <td><span style={{ fontWeight: '600', color: 'var(--text)' }}>{pedido.proveedor_nombre}</span></td>
                                            <td><span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>{getFabricante(pedido)}</span></td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{pedido.fecha_creacion}</td>
                                            <td>
                                                <span className={`status-badge ${pedido.estado?.toLowerCase().replace(/ /g, '-')}`}>
                                                    {pedido.estado}
                                                </span>
                                            </td>
                                            <td>{pedido.orden_id ? <span style={{ backgroundColor: 'var(--gray-100)', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '0.75rem', color: 'var(--text)' }}>#{pedido.orden_id}</span> : '-'}</td>
                                            <td>{pedido.venta_id ? <span style={{ backgroundColor: 'var(--gray-100)', padding: '4px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '0.75rem', color: '#0d9488' }}>#{pedido.venta_id}</span> : '-'}</td>
                                            <td><span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>{pedido.venta_vendedor_nombre || '-'}</span></td>
                                            <td className="truncate-text" style={{ maxWidth: '350px', fontSize: '0.85rem', color: 'var(--text)' }} title={pedido.direccion_entrega}>{pedido.direccion_entrega}</td>
                                            <td style={{ width: '50px', textAlign: 'right' }}>
                                                <button className="action-btn" onClick={(e) => { e.stopPropagation(); toggleExpand(pedido.id); }} style={{ marginLeft: 'auto' }}>
                                                    {expandedPedidoId === pedido.id ? <FaChevronUp /> : <FaChevronDown />}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedPedidoId === pedido.id && (
                                             <tr className="expanded-row">
                                                 <td colSpan="11">
                                                     <div className="details-view-wrapper telas-details-wrapper">
                                                         <div className="tela-expanded-wrapper">
                                                             <div className="tela-expanded-header">
                                                                 <div className="tela-expanded-title-box">
                                                                     <span className="tela-meta-badge">PT #{pedido.id}</span>
                                                                     <span className="tela-meta-prov">{pedido.proveedor_nombre || 'Proveedor de Tela'}</span>
                                                                 </div>
                                                                 <div className="tela-expanded-actions">
                                                                     {hasPermission('DESCARGAR_IMAGEN_PEDIDO_TELA') && (
                                                                         <DescargarPedidoTela pedido={pedido} size="sm" onError={(m) => setNotification({ message: m, type: 'error' })} />
                                                                     )}
                                                                     {hasPermission('EDITAR_ESTADO_TELA_ORDEN') ? (
                                                                         <button
                                                                             type="button"
                                                                             className="btn-edit-estado-badge"
                                                                             onClick={() => abrirEditarEstado(pedido)}
                                                                             title="Clic para editar estado del pedido de tela"
                                                                         >
                                                                             <span className={`status-badge ${pedido.estado?.toLowerCase().replace(/ /g, '-')}`}>
                                                                                 {pedido.estado}
                                                                             </span>
                                                                             <FaEdit className="edit-icon-badge" />
                                                                         </button>
                                                                     ) : (
                                                                         <span className={`status-badge ${pedido.estado?.toLowerCase().replace(/ /g, '-')}`}>
                                                                             {pedido.estado}
                                                                         </span>
                                                                     )}
                                                                 </div>
                                                             </div>

                                                             {/* Metadata Grid */}
                                                             <div className="tela-expanded-info-grid">
                                                                 <div className="tela-info-item">
                                                                     <span className="tela-info-label">Usuario Solicitante</span>
                                                                     <span className="tela-info-value">{pedido.usuario_nombre || '—'}</span>
                                                                 </div>
                                                                 <div className="tela-info-item">
                                                                     <span className="tela-info-label">Dirección de Entrega</span>
                                                                     <span className="tela-info-value">{pedido.direccion_entrega || 'No especificada'}</span>
                                                                 </div>
                                                                 <div className="tela-info-item">
                                                                     <span className="tela-info-label">Fecha Pedido</span>
                                                                     <span className="tela-info-value">{pedido.fecha_pedido ? pedido.fecha_pedido.split('-').reverse().join('/') : '—'}</span>
                                                                 </div>
                                                                 <div className="tela-info-item">
                                                                     <span className="tela-info-label">Fecha Esperada</span>
                                                                     <span className="tela-info-value">{pedido.fecha_esperada ? pedido.fecha_esperada.split('-').reverse().join('/') : '—'}</span>
                                                                 </div>
                                                             </div>

                                                             {pedido.observacion && (
                                                                 <div className="tela-info-item" style={{ marginBottom: '1rem' }}>
                                                                     <span className="tela-info-label">Observación</span>
                                                                     <span className="tela-info-value" style={{ whiteSpace: 'pre-line' }}>{pedido.observacion}</span>
                                                                 </div>
                                                             )}

                                                             {pedido.estado === 'Anulado' && (
                                                                 <div className="tela-info-item tela-anulacion" style={{ marginBottom: '1rem' }}>
                                                                     <span className="tela-info-label">Anulado{pedido.anulado_por_nombre ? ` por ${pedido.anulado_por_nombre}` : ''}{pedido.anulado_en ? ` el ${new Date(pedido.anulado_en).toLocaleDateString('es-CO')}` : ''}</span>
                                                                     <span className="tela-info-value" style={{ whiteSpace: 'pre-line' }}>{pedido.motivo_anulacion || 'Sin motivo registrado.'}</span>
                                                                 </div>
                                                             )}

                                                             <div className="tela-expanded-body">
                                                                 <h4 className="tela-section-subtitle">Detalles del Pedido de Tela</h4>
                                                                 <table className="details-table">
                                                                     <thead>
                                                                         <tr>
                                                                             <th>Tela / Descripción</th>
                                                                             <th style={{ textAlign: 'right' }}>Cantidad</th>
                                                                         </tr>
                                                                     </thead>
                                                                     <tbody>
                                                                         {pedido.detalles && pedido.detalles.length > 0
                                                                             ? pedido.detalles.map(detalle => (
                                                                                 <tr key={detalle.id}>
                                                                                     <td style={{ fontWeight: '500' }}>{detalle.tela}</td>
                                                                                     <td style={{ textAlign: 'right', fontWeight: '600' }}>{detalle.cantidad}</td>
                                                                                 </tr>
                                                                             ))
                                                                             : <tr><td colSpan="2" style={{ color: 'var(--text-muted, var(--text-muted))', fontStyle: 'italic', textAlign: 'center' }}>Sin detalles registrados.</td></tr>
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
                            <div key={`skeleton-card-${index}`} className="mobile-card skeleton-item" style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                    <div className="skeleton skeleton-text" style={{ width: '50px' }}></div>
                                    <div className="skeleton skeleton-badge" style={{ width: '80px' }}></div>
                                </div>
                                <div className="skeleton skeleton-text" style={{ width: '120px', height: '1.25rem', marginBottom: '0.5rem' }}></div>
                                <div className="skeleton skeleton-text" style={{ width: '100px', marginBottom: '0.5rem' }}></div>
                            </div>
                        ))
                    ) : displayedPedidos.length > 0 ? (
                        displayedPedidos.map(pedido => (
                            <div className="mobile-card" key={pedido.id} style={{ padding: '1rem', marginBottom: '1rem', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div className="mobile-card-header" onClick={() => toggleExpand(pedido.id)} style={{ cursor: 'pointer' }}>
                                    <div className="header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span className="card-id" style={{ fontWeight: 'bold', color: 'var(--text)' }}>PT #{pedido.id}</span>
                                        <span className={`status-badge ${pedido.estado?.toLowerCase().replace(/ /g, '-')}`}>
                                            {pedido.estado}
                                        </span>
                                    </div>
                                    <div className="header-main" style={{ marginBottom: '0.5rem' }}>
                                        <div style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text)' }}>
                                            {pedido.proveedor_nombre}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            Fabricante: <span style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>{getFabricante(pedido)}</span>
                                        </div>
                                    </div>
                                    <div className="header-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        <span>{pedido.fecha_creacion}</span>
                                        <span style={{ backgroundColor: 'var(--gray-100)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                            {pedido.orden_id ? `Ord #${pedido.orden_id}` : 'Sin Orden'}
                                        </span>
                                    </div>
                                </div>
                                
                                {expandedPedidoId === pedido.id && (
                                    <div className="mobile-card-expanded" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Usuario Creador</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--gray-200)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                                                    {pedido.usuario_nombre ? pedido.usuario_nombre.substring(0, 2).toUpperCase() : 'U'}
                                                </div>
                                                <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{pedido.usuario_nombre}</span>
                                            </div>
                                        </div>
                                        
                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Dirección de Entrega</div>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{pedido.direccion_entrega}</div>
                                        </div>

                                        {pedido.observacion && (
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Observación</div>
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'pre-line' }}>{pedido.observacion}</div>
                                            </div>
                                        )}

                                        {hasPermission('DESCARGAR_IMAGEN_PEDIDO_TELA') && (
                                            <DescargarPedidoTela pedido={pedido} size="sm" style={{ width: '100%', justifyContent: 'center', marginBottom: '0.5rem' }}
                                                onError={(m) => setNotification({ message: m, type: 'error' })} />
                                        )}

                                        {hasPermission('EDITAR_ESTADO_TELA_ORDEN') && (
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                icon={FaEdit}
                                                style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem' }}
                                                onClick={() => abrirEditarEstado(pedido)}
                                            >
                                                Editar Estado
                                            </Button>
                                        )}

                                        <div className="tela-expanded-body" style={{ padding: '0' }}>
                                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.5rem' }}>Detalles de Telas</h4>
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
                                                        : <tr><td colSpan="2" style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>Sin detalles.</td></tr>
                                                    }
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            No hay pedidos registrados
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Editar Estado de Pedido Tela */}
            <Modal
                open={editEstadoModal.open}
                onClose={cerrarEditarEstado}
                title="Editar Estado de Tela"
                size="sm"
                footer={
                    <>
                        <Button 
                            variant="secondary" 
                            onClick={cerrarEditarEstado}
                            disabled={editEstadoModal.guardando}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            variant={anulando ? 'danger' : 'primary'} 
                            onClick={handleSaveEstado} 
                            loading={editEstadoModal.guardando}
                            disabled={!canEditEstado(editEstadoModal.currentEstado) || (anulando && !editEstadoModal.motivo.trim())}
                        >
                            {anulando ? 'Anular pedido' : 'Guardar Cambios'}
                        </Button>
                    </>
                }
            >
                <div className="ds-field">
                    <label className="ds-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                        PT #{editEstadoModal.pedidoId} &mdash; Estado actual: <strong style={{ color: 'var(--accent, var(--text))' }}>{editEstadoModal.currentEstado}</strong>
                    </label>
                    <select
                        className="ds-select"
                        value={editEstadoModal.newEstado}
                        onChange={(e) => setEditEstadoModal(prev => ({ ...prev, newEstado: e.target.value }))}
                        disabled={!canEditEstado(editEstadoModal.currentEstado) || editEstadoModal.guardando}
                        aria-label="Nuevo estado del pedido de tela"
                    >
                        <option value="Pendiente">Pendiente</option>
                        <option value="En fabrica">En fabrica</option>
                        <option value="En Lottus">En Lottus</option>
                        {(hasPermission('ANULAR_PEDIDO_TELA') || editEstadoModal.currentEstado === 'Anulado') && <option value="Anulado">Anulado</option>}
                    </select>
                    {anulando && (
                        <div className="tela-anular" style={{ marginTop: '0.75rem' }}>
                            <p className="ds-field__hint" style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>
                                El pedido no se borra: queda anulado con su motivo y la tela de sus productos vuelve a quedar por pedir. No se puede deshacer.
                            </p>
                            <label className="ds-label" htmlFor="motivo-anulacion-tela">Motivo de la anulación</label>
                            <textarea
                                id="motivo-anulacion-tela"
                                className="ds-textarea"
                                rows={3}
                                maxLength={1000}
                                value={editEstadoModal.motivo}
                                onChange={(e) => setEditEstadoModal(prev => ({ ...prev, motivo: e.target.value }))}
                                disabled={editEstadoModal.guardando}
                                placeholder="Ej.: se pidió con el color equivocado"
                            />
                        </div>
                    )}
                    {editEstadoModal.currentEstado === 'Anulado' ? (
                        <p className="ds-field__hint" style={{ marginTop: '0.5rem' }}>
                            Pedido anulado{editEstadoModal.pedido?.anulado_por_nombre ? ` por ${editEstadoModal.pedido.anulado_por_nombre}` : ''}: {editEstadoModal.pedido?.motivo_anulacion || 'sin motivo registrado'}. Su estado ya no cambia.
                        </p>
                    ) : !canEditEstado(editEstadoModal.currentEstado) && (
                        <p className="ds-field__hint" style={{ color: 'var(--danger, var(--danger))', marginTop: '0.5rem' }}>
                            🔒 No se puede editar un pedido en estado "En fabrica".
                        </p>
                    )}
                </div>
            </Modal>

            {/* Modal Crear Proveedor */}
            {showProveedorModal && createPortal(
                <div className="modal-overlay">
                    <div className="modal-content" ref={proveedorDialogoRef} role="dialog" aria-modal="true" aria-label="Nuevo proveedor de telas" tabIndex={-1}>
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
                </div>,
                document.body
            )}

            {/* Modal Crear Dirección (Solo admin o auxiliar) */}
            {showDireccionModal && createPortal(
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }} ref={direccionDialogoRef} role="dialog" aria-modal="true" aria-label="Gestionar direcciones de entrega" tabIndex={-1}>
                        <div className="modal-header">
                            <h3>Gestionar Direcciones de Entrega</h3>
                            <button className="modal-close" type="button" onClick={() => setShowDireccionModal(false)} aria-label="Cerrar" data-dialogo-cerrar="">×</button>
                        </div>

                        <div className="direcciones-list" style={{ marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            {direcciones.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', margin: '1rem 0' }}>No hay direcciones registradas.</p>
                            ) : (
                                direcciones.map(d => (
                                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.75rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-muted)', borderRadius: '6px', marginBottom: '0.5rem' }}>
                                        <div>
                                            <strong style={{ fontSize: '0.9rem', color: 'var(--text)', display: 'block' }}>{d.nombre}</strong>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{d.detalles}</span>
                                        </div>
                                        <button type="button" className="btn-icon btn-remove" onClick={() => handleDeleteDireccion(d.id)} title="Eliminar dirección" style={{ padding: '0.25rem' }}>
                                            <FaTrashAlt />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />

                        <h4 style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: '1rem' }}>Agregar Nueva Dirección</h4>
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
                </div>,
                document.body
            )}

            {/* Componente Modal Unificado para Crear Pedido de Telas/Cueros */}
            <CrearPedidoTelaModal 
                isOpen={showPedidoModal} 
                onClose={() => setShowPedidoModal(false)} 
                onSuccess={fetchData} 
                showNotification={(msg, type) => setNotification({ message: msg, type })}
            />
        </div>
    );
};

export default TelasPage;
