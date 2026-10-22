import React, { useState, useEffect, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import API from '../services/api';
import { mensajeDeError } from '../services/errores';
import { AppContext } from '../AppContext';
import { FaTrashAlt, FaPlus, FaBuilding, FaMapMarkerAlt, FaBoxes } from 'react-icons/fa';
import AppNotification from './AppNotification';
import { useDialogo } from '../hooks/useDialogo';
import ImagenPedidoTela from './imagenes/ImagenPedidoTela';
import './CrearPedidoTelaModal.css';

const CrearPedidoTelaModal = ({ isOpen, onClose, onSuccess, initialOrdenAsociadaId = '', showNotification }) => {
    const { usuario } = useContext(AppContext) || {};
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
        observacion: '',
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
            observacion: newPedido.observacion.trim() || null,
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
                observacion: '',
                detalles: [{ referencia: '', color: '', cantidad: '' }]
            });
            setTipoMaterial('Tela');
            setIsOtraDireccion(false);
        } catch (error) {
            console.error("Error creating pedido tela:", error.response?.data || error);
            showToast(mensajeDeError(error, 'Error al crear pedido de tela'), 'error');
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
                    const { default: html2canvas } = await import('html2canvas');
                    const canvas = await html2canvas(previewRef.current, {
                        backgroundColor: 'var(--surface)',
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

    // Foco confinado y devuelto (P08-07). El formulario principal no se cierra
    // con Escape (tampoco con clic fuera); los secundarios sí.
    const pedidoDialogoRef = useDialogo(isOpen);
    const proveedorDialogoRef = useDialogo(isOpen && showProveedorModal, () => setShowProveedorModal(false), {
        hayCambios: Boolean(newProveedor.nombre_empresa || newProveedor.nombre_encargado || newProveedor.contacto),
    });
    const direccionDialogoRef = useDialogo(isOpen && showDireccionModal, () => setShowDireccionModal(false));

    if (!isOpen) return null;

    const unitSuffix = tipoMaterial === 'Cuero' ? 'dcm.' : 'mts.';

    return createPortal(
        <>
            <div className="pt-modal-overlay">
                <div className="pt-modal-content" ref={pedidoDialogoRef} role="dialog" aria-modal="true" aria-label="Nuevo pedido de materiales" tabIndex={-1}>
                    <div className="pt-modal-header">
                        <div className="pt-modal-title">
                            <span className="pt-modal-icon">📦</span>
                            <div>
                                <h2>Nuevo Pedido de Materiales</h2>
                                <p>Solicita telas o cueros rápidamente al proveedor.</p>
                            </div>
                        </div>
                        <button className="pt-modal-close" type="button" onClick={onClose} aria-label="Cerrar" data-dialogo-cerrar="">&times;</button>
                    </div>
                    
                    <form onSubmit={handleCreatePedido} className="pt-modal-body">
                        {/* Fila 1: Proveedor y Orden */}
                        <div className="pt-grid-2">
                            <div className="pt-form-group">
                                <label><FaBuilding /> Proveedor</label>
                                <div className="pt-select-wrapper">
                                    <select required name="proveedor" value={newPedido.proveedor} onChange={handlePedidoChange} aria-label="Proveedor">
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
                                    <select required={usuario?.role?.toLowerCase() !== 'administrador'} name="orden_asociada_id" value={newPedido.orden_asociada_id} onChange={handlePedidoChange} aria-label="Orden asociada">
                                        <option value="">{usuario?.role?.toLowerCase() === 'administrador' ? '(Opcional) ' : ''}Seleccione orden...</option>
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

                        {/* Observación General (opcional) */}
                        <div className="pt-form-group">
                            <label>📝 Observación General (opcional)</label>
                            <textarea
                                name="observacion"
                                value={newPedido.observacion}
                                onChange={handlePedidoChange}
                                placeholder="Alguna nota o indicación general para este pedido de material..."
                                rows="2"
                            ></textarea>
                        </div>

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
                    <div className="pt-modal-content pt-modal-sm" ref={proveedorDialogoRef} role="dialog" aria-modal="true" aria-label="Nuevo proveedor" tabIndex={-1}>
                        <div className="pt-modal-header">
                            <h3>Nuevo Proveedor</h3>
                            <button className="pt-modal-close" type="button" onClick={() => setShowProveedorModal(false)} aria-label="Cerrar" data-dialogo-cerrar="">&times;</button>
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
                    <div className="pt-modal-content pt-modal-md" ref={direccionDialogoRef} role="dialog" aria-modal="true" aria-label="Gestionar direcciones de entrega" tabIndex={-1}>
                        <div className="pt-modal-header">
                            <h3>Gestionar Direcciones de Entrega</h3>
                            <button className="pt-modal-close" type="button" onClick={() => setShowDireccionModal(false)} aria-label="Cerrar" data-dialogo-cerrar="">&times;</button>
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

            {/* Imagen del pedido (plantilla compartida con Ventas) */}
            <ImagenPedidoTela
                ref={previewRef}
                style={{ position: 'absolute', top: '-9999px', left: '-9999px', display: 'none' }}
                numero={createdPedidoId}
                proveedor={pdfData ? proveedoresTelas.find(p => p.id === parseInt(pdfData.proveedor))?.nombre_empresa : ''}
                solicitante={usuario ? `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim() : ''}
                material={pdfData?.tipo_material}
                fecha={getFormattedDate()}
                orden={pdfData?.orden_asociada_id ? getOrdenId(pdfData.orden_asociada_id) : null}
                venta={getVentaId(pdfData?.orden_asociada_id)}
                detalles={pdfData?.detalles || []}
                direccion={pdfData?.direccion_entrega}
                observacion={pdfData?.observacion}
            />

            {/* AppToast / Notification Component for Modal alerts */}
            <AppNotification 
                message={toast.message} 
                type={toast.type} 
                onClose={() => setToast({ message: '', type: '' })} 
            />
        </>,
        document.body
    );
};

export default CrearPedidoTelaModal;
