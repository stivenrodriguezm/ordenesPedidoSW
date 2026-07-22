import React, { useState, useEffect, useRef, useContext } from 'react';
import API from '../services/api';
import { AppContext } from '../AppContext';
import { FaTrashAlt, FaPlus, FaBuilding, FaMapMarkerAlt, FaBoxes } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import logoFinal from '../assets/logoFinal.png';
import './CrearPedidoTelaModal.css';

const CrearPedidoTelaModal = ({ isOpen, onClose, onSuccess, initialOrdenAsociadaId = '' }) => {
    const { usuario } = useContext(AppContext);
    const [ordenes, setOrdenes] = useState([]);
    const [proveedoresTelas, setProveedoresTelas] = useState([]);
    const [direcciones, setDirecciones] = useState([]);
    const [showProveedorModal, setShowProveedorModal] = useState(false);
    const [showDireccionModal, setShowDireccionModal] = useState(false);
    const [isOtraDireccion, setIsOtraDireccion] = useState(false);
    const [createdPedidoId, setCreatedPedidoId] = useState(null);
    const [pdfData, setPdfData] = useState(null);
    const previewRef = useRef(null);

    const [newPedido, setNewPedido] = useState({
        proveedor: '',
        direccion_entrega: '',
        direccion_entrega_custom: '',
        orden_asociada_id: initialOrdenAsociadaId,
        detalles: [{ tela: '', cantidad: '' }]
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
            alert('Proveedor creado exitosamente');
        } catch (error) {
            console.error("Error creating proveedor:", error);
            alert('Error al crear proveedor');
        }
    };

    const handleCreateDireccion = async (e) => {
        e.preventDefault();
        try {
            await API.post('direcciones-entrega/', newDireccion);
            setShowDireccionModal(false);
            setNewDireccion({ nombre: '', detalles: '' });
            fetchDirecciones();
            alert('Dirección guardada exitosamente');
        } catch (error) {
            console.error("Error creating direccion:", error);
            alert('Error al guardar dirección');
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
            alert('Error al eliminar la dirección');
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
        let dirFila = newPedido.direccion_entrega;
        if (isOtraDireccion) {
            if (!newPedido.direccion_entrega_custom.trim()) {
                alert("Por favor escriba la dirección de entrega.");
                return;
            }
            dirFila = newPedido.direccion_entrega_custom;
        } else {
            const addr = direcciones.find(d => String(d.id) === String(newPedido.direccion_entrega));
            if (addr) dirFila = `${addr.nombre} - ${addr.detalles}`;
        }

        try {
            const payload = {
                proveedor: parseInt(newPedido.proveedor),
                direccion_entrega: dirFila,
                estado: 'Pendiente',
                orden_asociada_id: newPedido.orden_asociada_id ? parseInt(newPedido.orden_asociada_id) : null,
                detalles: newPedido.detalles.filter(d => d.tela && d.cantidad)
            };

            const response = await API.post('pedidos-telas/', payload);

            setPdfData({
                proveedor: newPedido.proveedor,
                direccion_entrega: dirFila,
                orden_asociada_id: newPedido.orden_asociada_id,
                detalles: newPedido.detalles.filter(d => d.tela && d.cantidad)
            });

            setCreatedPedidoId(response.data.id);
            setNewPedido({
                proveedor: '',
                direccion_entrega: '',
                direccion_entrega_custom: '',
                orden_asociada_id: '',
                detalles: [{ tela: '', cantidad: '' }]
            });
            setIsOtraDireccion(false);
        } catch (error) {
            console.error("Error creating pedido tela:", error);
            alert('Error al crear pedido de tela');
        }
    };

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
                    previewRef.current.style.display = 'none';

                    const image = canvas.toDataURL('image/png');
                    const link = document.createElement('a');
                    link.href = image;
                    link.download = `pedido_telas_${createdPedidoId}.png`;
                    link.click();

                    setCreatedPedidoId(null);
                    alert('Pedido de tela creado exitosamente');
                    if (onSuccess) onSuccess();
                    onClose();
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    alert('Pedido de tela creado exitosamente, pero hubo un error al descargar la imagen.');
                    setCreatedPedidoId(null);
                    if (onSuccess) onSuccess();
                    onClose();
                }
            };
            generatePDF();
        }
    }, [createdPedidoId, onClose, onSuccess]);

    const getOrdenId = (idStr) => {
        if (!idStr) return '';
        const found = ordenes.find(o => String(o.id) === String(idStr));
        return found ? found.id : idStr;
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="pt-modal-overlay">
                <div className="pt-modal-content">
                    <div className="pt-modal-header">
                        <div className="pt-modal-title">
                            <span className="pt-modal-icon">📦</span>
                            <div>
                                <h2>Nuevo Pedido de Telas</h2>
                                <p>Solicita material rápidamente al proveedor.</p>
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

                        {/* Productos / Telas */}
                        <div className="pt-section-box">
                            <div className="pt-section-header">
                                <h4>Detalles (Telas)</h4>
                            </div>
                            <div className="pt-detalles-list">
                                {newPedido.detalles.map((detalle, index) => (
                                    <div key={index} className="pt-detalle-row">
                                        <div className="pt-detalle-col-main">
                                            <input required type="text" placeholder="Referencia / Descripción de Tela" value={detalle.tela} onChange={(e) => handleDetalleChange(index, 'tela', e.target.value)} />
                                        </div>
                                        <div className="pt-detalle-col-qty">
                                            <input required type="text" placeholder="Cant. (ej. 150m)" value={detalle.cantidad} onChange={(e) => handleDetalleChange(index, 'cantidad', e.target.value)} />
                                        </div>
                                        <div className="pt-detalle-col-action">
                                            {newPedido.detalles.length > 1 ? (
                                                <button type="button" className="pt-btn-icon-danger" onClick={() => removeDetalle(index)} title="Eliminar fila">
                                                    <FaTrashAlt />
                                                </button>
                                            ) : (
                                                <div style={{width: '32px'}}></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button type="button" className="pt-btn-add" onClick={addDetalle}>
                                <FaPlus /> Añadir otra tela
                            </button>
                        </div>

                        {/* Lugar de Entrega */}
                        <div className="pt-form-group pt-mt-4">
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span><FaMapMarkerAlt /> Lugar de Entrega</span>
                                <button type="button" className="pt-link-btn" onClick={() => setShowDireccionModal(true)}>
                                    + Gestionar Direcciones
                                </button>
                            </label>
                            <div className="pt-select-wrapper">
                                <select required name="direccion_entrega" value={newPedido.direccion_entrega} onChange={handlePedidoChange}>
                                    <option value="">Seleccione lugar de entrega...</option>
                                    {direcciones.map(d => (
                                        <option key={d.id} value={d.id}>{d.nombre} ({d.detalles})</option>
                                    ))}
                                    <option value="OTRA">+ Especificar otra dirección...</option>
                                </select>
                            </div>
                        </div>

                        {isOtraDireccion && (
                            <div className="pt-form-group pt-custom-address">
                                <label>Dirección Específica</label>
                                <textarea placeholder="Escriba la dirección de entrega detallada..." value={newPedido.direccion_entrega_custom} onChange={(e) => setNewPedido(prev => ({ ...prev, direccion_entrega_custom: e.target.value }))} rows="2"></textarea>
                            </div>
                        )}

                        {/* Footer Sticky */}
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
                            <h3>Nuevo Proveedor de Telas</h3>
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

            {/* Hidden Div for PDF/Image Generation */}
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
                        <div><strong>Fecha:</strong> {(() => {
                            const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
                            const d = new Date();
                            return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
                        })()}</div>
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
        </>
    );
};

export default CrearPedidoTelaModal;
