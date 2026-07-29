import React, { useState, useEffect, useRef, useContext } from 'react';
import API from '../services/api';
import { AppContext } from '../AppContext';
import { FaTrashAlt, FaPlus, FaBuilding, FaMapMarkerAlt, FaBoxes, FaLayerGroup } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import AppNotification from './AppNotification';
import './CrearPedidoTelaModal.css';

const CrearPedidoTelaModal = ({ isOpen, onClose, onSuccess, initialOrdenAsociadaId = '', showNotification }) => {
    const { usuario } = useContext(AppContext);
    const [ordenes, setOrdenes] = useState([]);
    const [proveedoresTelas, setProveedoresTelas] = useState([]);
    const [direcciones, setDirecciones] = useState([]);
    const [showProveedorModal, setShowProveedorModal] = useState(false);
    const [showDireccionModal, setShowDireccionModal] = useState(false);
    const [isOtraDireccion, setIsOtraDireccion] = useState(false);
    const [createdPedidoId, setCreatedPedidoId] = useState(null);
    const [pdfData, setPdfData] = useState(null);
    const [toast, setToast] = useState({ message: '', type: '' });
    const previewRef = useRef(null);

    const showToast = (message, type = 'success') => {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        }
        setToast({ message, type });
    };

    const [tipoMaterial, setTipoMaterial] = useState('Tela'); // 'Tela' | 'Cuero'

    const [newPedido, setNewPedido] = useState({
        proveedor: '',
        direccion_entrega: '',
        direccion_entrega_custom: '',
        orden_asociada_id: initialOrdenAsociadaId,
        detalles: [{ referencia: '', color: '', cantidad: '' }]
    });

    const [newProveedor, setNewProveedor] = useState({
        nombre_empresa: '',
        nombre_encargado: '',
        contacto: ''
    });

    const [newDireccion, setNewDireccion] = useState({ nombre: '', detalles: '' });

    useEffect(() => {
        if (isOpen) {
            fetchOrdenes();
            fetchProveedoresTelas();
            fetchDirecciones();
            setNewPedido(prev => ({ ...prev, orden_asociada_id: initialOrdenAsociadaId }));
            setToast({ message: '', type: '' });
        }
    }, [isOpen, initialOrdenAsociadaId]);

    const fetchOrdenes = async () => {
        try {
            const response = await API.get('listar-pedidos/?estado=en_proceso&tela=Por pedir');
            const data = Array.isArray(response.data.results) ? response.data.results : (Array.isArray(response.data) ? response.data : []);
            setOrdenes(data);
        } catch (error) {
            console.error("Error fetching ordenes:", error);
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

    const handleCreateProveedor = async (e) => {
        e.preventDefault();
        try {
            await API.post('proveedores-telas/', newProveedor);
            setShowProveedorModal(false);
            setNewProveedor({ nombre_empresa: '', nombre_encargado: '', contacto: '' });
            fetchProveedoresTelas();
            showToast('Proveedor creado exitosamente', 'success');
        } catch (error) {
            console.error("Error creating proveedor:", error);
            showToast('Error al crear proveedor', 'error');
        }
    };

    const handleCreateDireccion = async (e) => {
        e.preventDefault();
        try {
            await API.post('direcciones-entrega/', newDireccion);
            setShowDireccionModal(false);
            setNewDireccion({ nombre: '', detalles: '' });
            fetchDirecciones();
            showToast('Dirección guardada exitosamente', 'success');
        } catch (error) {
            console.error("Error creating direccion:", error);
            showToast('Error al guardar dirección', 'error');
        }
    };

    const handleDeleteDireccion = async (id) => {
        if (!window.confirm("¿Está seguro de eliminar esta dirección predefinida?")) return;
        try {
            await API.delete(`direcciones-entrega/${id}/`);
            fetchDirecciones();
            if (newPedido.direccion_entrega === String(id)) {
                setNewPedido(prev => ({ ...prev, direccion_entrega: '', direccion_entrega_custom: '' }));
                setIsOtraDireccion(false);
            }
        } catch (error) {
            console.error("Error deleting direccion:", error);
            showToast('Error al eliminar la dirección', 'error');
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

    const handleAddDetalle = () => {
        setNewPedido({
            ...newPedido,
            detalles: [...newPedido.detalles, { referencia: '', color: '', cantidad: '' }]
        });
    };

    const handleRemoveDetalle = (index) => {
        const updatedDetalles = newPedido.detalles.filter((_, i) => i !== index);
        setNewPedido({ ...newPedido, detalles: updatedDetalles });
    };

    const handleDetalleChange = (index, field, value) => {
        const updatedDetalles = [...newPedido.detalles];
        updatedDetalles[index][field] = value;
        setNewPedido({ ...newPedido, detalles: updatedDetalles });
    };

    const handleCreatePedido = async (e) => {
        e.preventDefault();
        
        if (!newPedido.proveedor) {
            showToast("Por favor seleccione un proveedor.", 'error');
            return;
        }

        let finalDireccion = '';
        if (isOtraDireccion) {
            if (!newPedido.direccion_entrega_custom.trim()) {
                showToast("Por favor escriba la dirección de entrega.", 'error');
                return;
            }
            finalDireccion = newPedido.direccion_entrega_custom.trim();
        } else {
            const dirObj = direcciones.find(d => String(d.id) === String(newPedido.direccion_entrega));
            finalDireccion = dirObj ? `${dirObj.nombre} - ${dirObj.detalles}` : '';
        }

        if (!finalDireccion) {
            showToast("Por favor seleccione o escriba la dirección de entrega.", 'error');
            return;
        }

        const validDetalles = newPedido.detalles.filter(d => d.referencia.trim() !== '' && parseFloat(d.cantidad) > 0);

        if (validDetalles.length === 0) {
            showToast("Por favor ingrese al menos una referencia y cantidad válida.", 'error');
            return;
        }

        const payload = {
            proveedor: parseInt(newPedido.proveedor),
            direccion_entrega: finalDireccion,
            estado: 'Pendiente',
            orden_asociada_id: newPedido.orden_asociada_id ? parseInt(newPedido.orden_asociada_id) : null,
            detalles: validDetalles.map(d => {
                const desc = `${tipoMaterial === 'Cuero' ? '[CUERO] ' : ''}${d.referencia.trim()}${d.color && d.color.trim() ? ` - Color: ${d.color.trim()}` : ''}`;
                return {
                    tela: desc,
                    cantidad: parseFloat(String(d.cantidad).replace(',', '.')) || 1
                };
            })
        };

        setPdfData({
            ...payload,
            tipo_material: tipoMaterial,
            detalles: validDetalles.map(d => ({
                referencia: d.referencia.trim(),
                color: d.color && d.color.trim() ? d.color.trim() : 'Standard',
                cantidad: parseFloat(d.cantidad) || 1,
                unidad: tipoMaterial === 'Cuero' ? 'dm' : 'mts'
            }))
        });

        try {
            const response = await API.post('pedidos-telas/', payload);

            setCreatedPedidoId(response.data.id);
            setNewPedido({
                proveedor: '',
                direccion_entrega: '',
                direccion_entrega_custom: '',
                orden_asociada_id: '',
                detalles: [{ referencia: '', color: '', cantidad: '' }]
            });
            setTipoMaterial('Tela');
            setIsOtraDireccion(false);
        } catch (error) {
            console.error("Error creating pedido tela:", error.response?.data || error);
            const serverMsg = error.response?.data ? JSON.stringify(error.response.data) : 'Error al crear pedido de tela';
            showToast(serverMsg.length < 100 ? serverMsg : 'Error al crear pedido de tela', 'error');
        }
    };

    useEffect(() => {
        if (createdPedidoId && previewRef.current) {
            const generatePDF = async () => {
                try {
                    previewRef.current.style.display = 'block';
                    if (document.fonts && document.fonts.ready) {
                        await document.fonts.ready;
                    }
                    await new Promise(resolve => setTimeout(resolve, 150));
                    const canvas = await html2canvas(previewRef.current, {
                        backgroundColor: '#ffffff',
                        scale: 2,
                        useCORS: true,
                        logging: false,
                    });
                    previewRef.current.style.display = 'none';

                    const image = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.href = image;
                    link.download = `pedido_material_${createdPedidoId}.png`;
                    link.click();

                    showToast(`Pedido de ${tipoMaterial.toLowerCase()} creado exitosamente`, 'success');
                    setCreatedPedidoId(null);
                    if (onSuccess) onSuccess();
                    onClose();
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    showToast('Pedido creado exitosamente, pero hubo un error al descargar la imagen.', 'error');
                    setCreatedPedidoId(null);
                    if (onSuccess) onSuccess();
                    onClose();
                }
            };
            generatePDF();
        }
    }, [createdPedidoId, onClose, onSuccess, tipoMaterial]);

    const getOrdenId = (idStr) => {
        if (!idStr) return '';
        const found = ordenes.find(o => String(o.id) === String(idStr));
        return found ? found.id : idStr;
    };

    const getVentaId = (idStr) => {
        if (!idStr) return null;
        const found = ordenes.find(o => String(o.id) === String(idStr));
        return found ? (found.venta || found.orden_venta || null) : null;
    };

    const getFormattedDate = () => {
        const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const d = new Date();
        return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
    };

    if (!isOpen) return null;

    const unitSuffix = tipoMaterial === 'Cuero' ? 'dcm.' : 'mts.';

    return (
        <>
            <div className="pt-modal-overlay">
                <div className="pt-modal-content">
                    <div className="pt-modal-header">
                        <div className="pt-modal-title">
                            <span className="pt-modal-icon">📦</span>
                            <div>
                                <h2>Nuevo Pedido de Materiales</h2>
                                <p>Solicita telas o cueros rápidamente al proveedor.</p>
                            </div>
                        </div>
                        <button className="pt-modal-close" type="button" onClick={onClose}>&times;</button>
                    </div>
                    
                    <form onSubmit={handleCreatePedido} className="pt-modal-body">
                        {/* Fila 1: Proveedor y Orden */}
                        <div className="pt-grid-2">
                            <div className="pt-form-group">
                                <label><FaBuilding /> Proveedor</label>
                                <div className="pt-select-wrapper">
                                    <select required name="proveedor" value={newPedido.proveedor} onChange={handlePedidoChange}>
                                        <option value="">Seleccione...</option>
                                        {proveedoresTelas.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre_empresa}</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="button" className="pt-link-btn" onClick={() => setShowProveedorModal(true)}>+ Nuevo Proveedor</button>
                            </div>

                            <div className="pt-form-group">
                                <label><FaBoxes /> Orden Asociada</label>
                                <div className="pt-select-wrapper">
                                    <select name="orden_asociada_id" value={newPedido.orden_asociada_id} onChange={handlePedidoChange}>
                                        <option value="">(Opcional) Seleccione orden...</option>
                                        {ordenes.map(o => (
                                            <option key={o.id} value={o.id}>Orden #{o.id} - {o.proveedor_nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Sección Tipo de Material & Detalles */}
                        <div className="pt-section-box">
                            <div className="pt-section-header">
                                <div className="pt-section-title-group">
                                    <h4>Detalles del Pedido</h4>
                                </div>
                                <div className="pt-material-toggle">
                                    <button 
                                        type="button" 
                                        className={`pt-toggle-btn ${tipoMaterial === 'Tela' ? 'active' : ''}`} 
                                        onClick={() => setTipoMaterial('Tela')}
                                    >
                                        🧵 Tela (mts.)
                                    </button>
                                    <button 
                                        type="button" 
                                        className={`pt-toggle-btn ${tipoMaterial === 'Cuero' ? 'active' : ''}`} 
                                        onClick={() => setTipoMaterial('Cuero')}
                                    >
                                        🐄 Cuero (dcm.)
                                    </button>
                                </div>
                            </div>

                            <div className="pt-detalles-list">
                                {newPedido.detalles.map((detalle, index) => (
                                    <div key={index} className="pt-detalle-row">
                                        <div className="pt-detalle-col pt-col-ref">
                                            <label className="pt-col-label">Referencia</label>
                                            <input 
                                                required 
                                                type="text" 
                                                placeholder={tipoMaterial === 'Cuero' ? 'Ej. Nappa Premium' : 'Ej. Lino Blanco'} 
                                                value={detalle.referencia} 
                                                onChange={(e) => handleDetalleChange(index, 'referencia', e.target.value)} 
                                            />
                                        </div>
                                        <div className="pt-detalle-col pt-col-color">
                                            <label className="pt-col-label">Color</label>
                                            <input 
                                                type="text" 
                                                placeholder="Ej. Negro / Azul" 
                                                value={detalle.color} 
                                                onChange={(e) => handleDetalleChange(index, 'color', e.target.value)} 
                                            />
                                        </div>
                                        <div className="pt-detalle-col pt-col-qty">
                                            <label className="pt-col-label">Cant. ({unitSuffix})</label>
                                            <input 
                                                required 
                                                type="text" 
                                                placeholder={tipoMaterial === 'Cuero' ? 'Ej. 1400' : 'Ej. 1.6'} 
                                                value={detalle.cantidad} 
                                                onChange={(e) => handleDetalleChange(index, 'cantidad', e.target.value)} 
                                            />
                                        </div>
                                        <div className="pt-detalle-col-action">
                                            {newPedido.detalles.length > 1 ? (
                                                <button type="button" className="pt-btn-icon-danger" onClick={() => handleRemoveDetalle(index)} title="Eliminar fila">
                                                    <FaTrashAlt />
                                                </button>
                                            ) : (
                                                <div className="pt-btn-placeholder"></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button type="button" className="pt-btn-add" onClick={handleAddDetalle}>
                                <FaPlus /> Añadir {tipoMaterial === 'Cuero' ? 'cuero' : 'tela'}
                            </button>
                        </div>

                        {/* Fila Dirección de Entrega */}
                        <div className="pt-form-group">
                            <label style={{ justifyContent: 'space-between', width: '100%' }}>
                                <span><FaMapMarkerAlt /> Dirección de Entrega</span>
                                {(usuario?.role?.toLowerCase() === 'administrador' || usuario?.role?.toLowerCase() === 'auxiliar') && (
                                    <button type="button" className="pt-link-btn" onClick={() => setShowDireccionModal(true)}>
                                        ⚙️ Gestionar
                                    </button>
                                )}
                            </label>
                            <div className="pt-select-wrapper">
                                <select required name="direccion_entrega" value={newPedido.direccion_entrega} onChange={handlePedidoChange}>
                                    <option value="">Seleccione una dirección...</option>
                                    {direcciones.map(d => (
                                        <option key={d.id} value={d.id}>{d.nombre} - {d.detalles}</option>
                                    ))}
                                    <option value="OTRA">Otra dirección (escribir manualmente)</option>
                                </select>
                            </div>
                        </div>

                        {isOtraDireccion && (
                            <div className="pt-form-group">
                                <textarea required name="direccion_entrega_custom" value={newPedido.direccion_entrega_custom} onChange={handlePedidoChange} placeholder="Escriba la dirección de entrega detallada..." rows="2"></textarea>
                            </div>
                        )}

                        <div className="pt-modal-footer">
                            <button type="button" className="pt-btn-secondary" onClick={onClose}>Cancelar</button>
                            <button type="submit" className="pt-btn-primary">Guardar Pedido</button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Modal Crear Proveedor */}
            {showProveedorModal && (
                <div className="pt-modal-overlay pt-z-max">
                    <div className="pt-modal-content pt-modal-sm">
                        <div className="pt-modal-header">
                            <h3>Nuevo Proveedor</h3>
                            <button className="pt-modal-close" type="button" onClick={() => setShowProveedorModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreateProveedor} className="pt-modal-body">
                            <div className="pt-form-group">
                                <label>Nombre Empresa</label>
                                <input required type="text" value={newProveedor.nombre_empresa} onChange={(e) => setNewProveedor({ ...newProveedor, nombre_empresa: e.target.value })} />
                            </div>
                            <div className="pt-form-group">
                                <label>Encargado</label>
                                <input required type="text" value={newProveedor.nombre_encargado} onChange={(e) => setNewProveedor({ ...newProveedor, nombre_encargado: e.target.value })} />
                            </div>
                            <div className="pt-form-group">
                                <label>Contacto</label>
                                <input required type="text" value={newProveedor.contacto} onChange={(e) => setNewProveedor({ ...newProveedor, contacto: e.target.value })} />
                            </div>
                            <div className="pt-modal-footer">
                                <button type="button" className="pt-btn-secondary" onClick={() => setShowProveedorModal(false)}>Cancelar</button>
                                <button type="submit" className="pt-btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Gestionar Direcciones */}
            {showDireccionModal && (
                <div className="pt-modal-overlay pt-z-max">
                    <div className="pt-modal-content pt-modal-md">
                        <div className="pt-modal-header">
                            <h3>Gestionar Direcciones de Entrega</h3>
                            <button className="pt-modal-close" type="button" onClick={() => setShowDireccionModal(false)}>&times;</button>
                        </div>
                        <div className="pt-modal-body">
                            <div className="pt-direcciones-list">
                                {direcciones.length === 0 ? (
                                    <p className="pt-empty-text">No hay direcciones registradas.</p>
                                ) : (
                                    direcciones.map(d => (
                                        <div key={d.id} className="pt-direccion-item">
                                            <div>
                                                <strong>{d.nombre}</strong>
                                                <span>{d.detalles}</span>
                                            </div>
                                            <button type="button" onClick={() => handleDeleteDireccion(d.id)} title="Eliminar dirección" className="pt-btn-icon-danger">
                                                <FaTrashAlt />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                            <hr className="pt-hr" />
                            <h4 className="pt-subtitle">Agregar Nueva Dirección</h4>
                            <form onSubmit={handleCreateDireccion}>
                                <div className="pt-form-group">
                                    <label>Nombre Corto</label>
                                    <input required type="text" value={newDireccion.nombre} onChange={(e) => setNewDireccion({ ...newDireccion, nombre: e.target.value })} placeholder="Identificador..." />
                                </div>
                                <div className="pt-form-group">
                                    <label>Detalles de la Dirección</label>
                                    <textarea required value={newDireccion.detalles} onChange={(e) => setNewDireccion({ ...newDireccion, detalles: e.target.value })} placeholder="Calle, Barrio..." rows="2"></textarea>
                                </div>
                                <div className="pt-modal-footer">
                                    <button type="button" className="pt-btn-secondary" onClick={() => setShowDireccionModal(false)}>Cerrar</button>
                                    <button type="submit" className="pt-btn-primary">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Div for PDF/Image Generation (Corporate Elegant Modern Redesign) */}
            <div
                id="pedido-tela-preview"
                ref={previewRef}
                style={{
                    position: 'absolute',
                    top: '-9999px',
                    left: '-9999px',
                    width: '800px',
                    backgroundColor: '#ffffff',
                    padding: '40px',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                    display: 'none',
                }}
            >
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000000', paddingBottom: '16px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        {/* REDISEÑO COMPLETO DEL LOGO LOTTUS */}
                        <div style={{ 
                            backgroundColor: '#000000', 
                            width: '260px',
                            height: '66px',
                            position: 'relative',
                            overflow: 'hidden',
                            boxSizing: 'border-box' 
                        }}>
                            <span style={{ 
                                position: 'absolute',
                                left: '0',
                                right: '0',
                                textAlign: 'center',
                                top: '2px',
                                fontFamily: '"Audiowide", sans-serif', 
                                fontSize: '34px', 
                                color: '#ffffff', 
                                letterSpacing: '6px', 
                                lineHeight: '1', 
                                margin: '0',
                                padding: '0',
                                display: 'block'
                            }}>
                                LOTTUS
                            </span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>ORDEN DE MATERIAL</span>
                        <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '1' }}>
                            {pdfData?.tipo_material === 'Cuero' ? 'PEDIDO DE CUEROS' : 'PEDIDO DE TELAS'}
                        </h2>
                        {/* NÚMERO DE ORDEN EN ROJO */}
                        <span style={{ 
                            color: '#dc2626', 
                            fontSize: '16px', 
                            fontWeight: '900', 
                            letterSpacing: '1px', 
                            lineHeight: '1', 
                            marginTop: '2px'
                        }}>
                            Nº {createdPedidoId}
                        </span>
                    </div>
                </div>

                {/* Metadata Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', fontSize: '13px', color: '#334155', backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div>
                        <p style={{ margin: '0 0 8px 0' }}>
                            <strong style={{ color: '#0f172a', fontWeight: '700', display: 'inline-block', width: '110px' }}>Proveedor:</strong>{' '}
                            <span style={{ color: '#0f172a', fontWeight: '700' }}>{pdfData ? proveedoresTelas.find(p => p.id === parseInt(pdfData.proveedor))?.nombre_empresa || 'N/A' : 'N/A'}</span>
                        </p>
                        <p style={{ margin: '0 0 8px 0' }}>
                            <strong style={{ color: '#0f172a', fontWeight: '700', display: 'inline-block', width: '110px' }}>Fabricante:</strong>{' '}
                            <span style={{ color: '#0f172a', fontWeight: '700' }}>{pdfData && pdfData.orden_asociada_id ? ordenes.find(o => String(o.id) === String(pdfData.orden_asociada_id))?.proveedor_nombre || 'N/A' : 'N/A'}</span>
                        </p>
                        <p style={{ margin: '0 0 8px 0' }}>
                            <strong style={{ color: '#0f172a', fontWeight: '700', display: 'inline-block', width: '110px' }}>Solicitante:</strong>{' '}
                            <span style={{ color: '#334155', fontWeight: '600' }}>{usuario ? `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim() : 'N/A'}</span>
                        </p>
                        <p style={{ margin: '0' }}>
                            <strong style={{ color: '#0f172a', fontWeight: '700', display: 'inline-block', width: '110px' }}>Material:</strong>{' '}
                            <span style={{ color: '#0f172a', fontWeight: '800' }}>{pdfData?.tipo_material || 'Tela'}</span>
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 8px 0' }}>
                            <strong style={{ color: '#0f172a', fontWeight: '700' }}>Fecha:</strong>{' '}
                            <span style={{ color: '#334155', fontWeight: '600' }}>{getFormattedDate()}</span>
                        </p>
                        <p style={{ margin: '0 0 8px 0' }}>
                            <strong style={{ color: '#0f172a', fontWeight: '700' }}>Orden Asociada:</strong>{' '}
                            <span style={{ color: '#0f172a', fontWeight: '700' }}>{pdfData?.orden_asociada_id ? `#${getOrdenId(pdfData.orden_asociada_id)}` : 'N/A'}</span>
                        </p>
                        <p style={{ margin: '0' }}>
                            <strong style={{ color: '#0f172a', fontWeight: '700' }}>Venta Asociada:</strong>{' '}
                            <span style={{ color: '#0f172a', fontWeight: '700' }}>{(() => {
                                const vId = getVentaId(pdfData?.orden_asociada_id);
                                return vId ? `#${vId}` : 'N/A';
                            })()}</span>
                        </p>
                    </div>
                </div>

                {/* Details Section */}
                <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    ESPECIFICACIÓN DE MATERIALES
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                    <thead style={{ backgroundColor: '#000000', color: '#ffffff' }}>
                        <tr>
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', fontSize: '12px', width: '40px', letterSpacing: '0.5px', color: '#ffffff' }}>#</th>
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', fontSize: '12px', letterSpacing: '0.5px', color: '#ffffff' }}>Referencia</th>
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', fontSize: '12px', width: '180px', letterSpacing: '0.5px', color: '#ffffff' }}>Color</th>
                            <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', fontSize: '12px', width: '140px', letterSpacing: '0.5px', color: '#ffffff' }}>Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pdfData?.detalles && pdfData.detalles.length > 0 ? (
                            pdfData.detalles.map((detalle, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                    <td style={{ padding: '12px 14px', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{index + 1}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '14px', color: '#0f172a', fontWeight: '700' }}>{detalle.referencia}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '13px', color: '#334155', fontWeight: '500' }}>{detalle.color || 'Standard'}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '14px', color: '#000000', textAlign: 'right', fontWeight: '800' }}>
                                        {detalle.cantidad} {detalle.unidad}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" style={{ padding: '14px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>Sin detalles registrados</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Delivery Address Section */}
                <div style={{ 
                    backgroundColor: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px', 
                    padding: '14px 18px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px' 
                }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>
                        Dirección de entrega:
                    </span>
                    <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '600' }}>
                        {pdfData?.direccion_entrega || 'No especificada'}
                    </span>
                </div>
            </div>

            {/* AppToast / Notification Component for Modal alerts */}
            <AppNotification 
                message={toast.message} 
                type={toast.type} 
                onClose={() => setToast({ message: '', type: '' })} 
            />
        </>
    );
};

export default CrearPedidoTelaModal;
