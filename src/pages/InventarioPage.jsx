import React, { useState, useContext, useEffect } from 'react';
import API from '../services/api';
import { formatCOP } from '../utils/formatCOP';
import { exportToCSV } from '../utils/exportToCSV';
import { FaSearch, FaFileExport, FaTimes, FaPlus, FaImage, FaCamera, FaUpload } from 'react-icons/fa';
import { AppContext } from '../AppContext';
import './InventarioPage.css';

const CATEGORY_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899',
];

function getCatColor(catId) {
    return CATEGORY_COLORS[(catId - 1) % CATEGORY_COLORS.length] || '#94a3b8';
}

const DISPONIBILIDAD_LABELS = {
    cliente: 'Cliente',
    exhibicion: 'Exhibición',
    venta: 'Venta',
    consignacion: 'Consignación',
    por_despachar: 'Por Despachar',
    no_venta: 'No a la venta',
};

const DISPONIBILIDAD_COLORS = {
    exhibicion: '#92400e', // Amber
    venta: '#1d4ed8',   // Blue
    consignacion: '#6d28d9', // Purple
    por_despachar: '#f97316', // Orange
    no_venta: '#ef4444',     // Red
};

// Obs tooltip component
function ObsCell({ text }) {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    if (!text) return <span className="empty-val">—</span>;
    return (
        <span
            className="obs-cell-trigger"
            onMouseEnter={e => { setVisible(true); setPos({ x: e.clientX, y: e.clientY }); }}
            onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setVisible(false)}
        >
            <span className="obs-text-truncated">{text}</span>
            {visible && (
                <span
                    className="obs-tooltip-popup"
                    style={{ left: pos.x + 14, top: pos.y - 10 }}
                >
                    {text}
                </span>
            )}
        </span>
    );
}


// Image Preview Modal (Lightbox)
function ImagePreviewModal({ isOpen, onClose, imageUrl }) {
    if (!isOpen) return null;
    return (
        <div className="img-lightbox-overlay" onClick={onClose}>
            <div className="img-lightbox-content" onClick={e => e.stopPropagation()}>
                <button className="img-lightbox-close" onClick={onClose}>&times;</button>
                <img src={imageUrl} alt="Vista previa del producto" className="img-lightbox-main" />
            </div>
        </div>
    );
}

function InventarioPage() {
    const { proveedores } = useContext(AppContext);

    const [inventario, setInventario] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [productos, setProductos] = useState([]);
    const [ordenesPendientes, setOrdenesPendientes] = useState([]);
    const [grupos, setGrupos] = useState([]);

    // Filters
    const [filterProveedor, setFilterProveedor] = useState('');
    const [filterSearch, setFilterSearch] = useState(''); // referencia / producto text search
    const [filterCategoria, setFilterCategoria] = useState('');
    const [filterSubcategoria, setFilterSubcategoria] = useState('');
    const [filterDisponibilidad, setFilterDisponibilidad] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Modal & Form State
    const [showModal, setShowModal] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [previewImg, setPreviewImg] = useState({ open: false, url: '' });
    const [form, setForm] = useState({
        proveedorId: '',
        productoId: '',
        categoriaId: '',
        subcategoriaId: '',
        variacion: '',
        ventaId: '',
        observacion: '',
        costo: '',
        disponibilidad: 'exhibicion',
        cantidad: 1,
        grupoId: '',
        imagen: null
    });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [invRes, catRes, subcatRes, prodRes, ordRes, grupoRes] = await Promise.all([
                    API.get('/suministros/inventario/'),
                    API.get('/suministros/categorias/'),
                    API.get('/suministros/subcategorias/'),
                    API.get('/referencias/'),
                    API.get('/get-pendientes-ids/'),
                    API.get('/suministros/grupos/')
                ]);
                setInventario(invRes.data.results || invRes.data);
                setCategorias(catRes.data.results || catRes.data);
                setSubcategorias(subcatRes.data.results || subcatRes.data);
                setProductos(prodRes.data.results || prodRes.data);
                setOrdenesPendientes(ordRes.data || []);
                setGrupos(grupoRes.data.results || grupoRes.data || []);
            } catch (error) {
                console.error("Error fetching inventario data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const getProducto = (id) => productos.find(p => p.id === id);
    const getCategoria = (id) => categorias.find(c => c.id === id);
    const getSubcategoria = (id) => subcategorias.find(s => s.id === id);

    const openModal = () => {
        setShowModal(true);
        setTimeout(() => setModalVisible(true), 10);
    };

    const closeModal = () => {
        setModalVisible(false);
        setTimeout(() => {
            setShowModal(false);
            setForm({
                proveedorId: '',
                productoId: '',
                categoriaId: '',
                subcategoriaId: '',
                variacion: '',
                ventaId: '',
                observacion: '',
                costo: '',
                disponibilidad: 'exhibicion',
                cantidad: 1,
                grupoId: '',
                imagen: null
            });
        }, 300);
    };

    const handleField = (field, value) => {
        setForm(prev => {
            const newForm = { ...prev, [field]: value };
            if (field === 'productoId') {
                // references don't have built-in categories in legacy model, user must pick manually
            }
            if (field === 'proveedorId') {
                newForm.productoId = '';
                newForm.categoriaId = '';
                newForm.subcategoriaId = '';
            }
            return newForm;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.productoId) {
            alert('Debes seleccionar una Referencia (Producto) antes de guardar.');
            return;
        }
        try {
            const cat = getCategoria(parseInt(form.categoriaId));
            const catPrefix = cat && cat.nombre ? cat.nombre.substring(0,2).toUpperCase() : 'XX';

            let qty = parseInt(form.cantidad, 10);
            if (isNaN(qty) || qty < 1) qty = 1;

            const promises = [];
            for (let i = 0; i < qty; i++) {
                const generatedId = `${catPrefix}${Math.floor(1000 + Math.random() * 9000)}`;
                const payload = {
                    id_referencia: generatedId,
                    referencia: parseInt(form.productoId),
                    categoria: form.categoriaId ? parseInt(form.categoriaId) : null,
                    subcategoria: form.subcategoriaId ? parseInt(form.subcategoriaId) : null,
                    variacion: form.variacion,
                    costo_especifico: form.costo || 0,
                    observacion: form.observacion,
                    disponibilidad: form.disponibilidad,
                    venta: form.ventaId ? parseInt(form.ventaId) : null,
                    grupo: form.grupoId ? parseInt(form.grupoId) : null,
                };
                promises.push(API.post('/suministros/inventario/', payload));
            }

            await Promise.all(promises);
            
            // Refresh
            const invRes = await API.get('/suministros/inventario/');
            setInventario(invRes.data.results || invRes.data);
            
            closeModal();
        } catch (error) {
            console.error("Error saving inventory item:", error);
            alert("Hubo un error al guardar o verificar los registros duplicados.");
        }
    };

    // Constants alias to maintain rendering logic
    const CATEGORIAS = categorias;
    const SUBCATEGORIAS = subcategorias;
    const PRODUCTOS = productos;

    // Build enriched items
    const items = inventario.map(inv => {
        const prod = {
            id: inv.referencia,
            nombre: inv.producto_nombre || (inv.referencia ? `Ref #${inv.referencia}` : ''),
            categoriaId: inv.categoria_id || inv.categoria,
            proveedorId: inv.proveedor_id
        };
        const cat = {
            id: inv.categoria_id || inv.categoria,
            nombre: inv.categoria_nombre || ''
        };
        const subcat = {
            id: inv.subcategoria,
            nombre: inv.subcategoria_nombre || ''
        };
        return {
            ...inv,
            id: inv.id_referencia,
            prod,
            cat,
            subcat,
            facturaManual: inv.factura_id_manual || inv.factura_manual || '—',
            proveedorNombre: inv.proveedor_nombre || '—',
            // venta_numero viene del SerializerMethodField; inv.venta es el raw FK int
            ventaId: inv.venta_numero || inv.venta || '—',
            fechaIngreso: inv.fecha_ingreso || null,
            productoId: inv.referencia,
            subcategoriaId: inv.subcategoria
        };
    });

    const filtered = items.filter(item => {
        if (filterProveedor && item.prod?.proveedorId !== parseInt(filterProveedor)) return false;
        if (filterCategoria && String(item.prod?.categoriaId) !== filterCategoria) return false;
        if (filterSubcategoria && String(item.subcategoriaId) !== filterSubcategoria) return false;
        if (filterDisponibilidad && item.disponibilidad !== filterDisponibilidad) return false;
        if (filterSearch) {
            const q = filterSearch.toLowerCase();
            return (
                item.prod?.nombre?.toLowerCase().includes(q) ||
                item.cat?.nombre?.toLowerCase().includes(q) ||
                item.subcat?.nombre?.toLowerCase().includes(q) ||
                item.variacion?.toLowerCase().includes(q) ||
                String(item.id).includes(q) ||
                item.observacion?.toLowerCase().includes(q) ||
                item.facturaManual?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const handleExport = () => {
        const dataToExport = filtered.map(item => ({
            'ID Producto': item.id,
            'Proveedor': item.proveedorNombre,
            'Factura': item.facturaManual || '',
            'Venta': item.venta || '',
            'Disponibilidad': DISPONIBILIDAD_LABELS[item.disponibilidad] || '—',
            'F. Ingreso': item.fechaIngreso ? new Date(item.fechaIngreso).toLocaleDateString('es-ES') : '—',
            'Producto': item.prod?.nombre || '',
            'Categoría': item.cat?.nombre || '',
            'Subcategoría': item.subcat?.nombre || '',
            'Variación': item.variacion || '',
            'Observación': item.observacion || ''
        }));
        exportToCSV('Inventario_Lottus.csv', dataToExport);
    };

    const subcatsDropdown = filterCategoria
        ? SUBCATEGORIAS.filter(s => String(s.categoria) === filterCategoria)
        : SUBCATEGORIAS;

    // Subcats for form
    const formSubcats = form.categoriaId
        ? SUBCATEGORIAS.filter(s => s.categoria === parseInt(form.categoriaId))
        : [];

    // Products for form filtered by provider
    const formProducts = form.proveedorId
        ? PRODUCTOS.filter(p => p.proveedor === parseInt(form.proveedorId))
        : [];

    const hasFilters = filterProveedor || filterSearch || filterCategoria || filterSubcategoria || filterDisponibilidad;

    const clearFilters = () => {
        setFilterProveedor('');
        setFilterSearch('');
        setFilterCategoria('');
        setFilterSubcategoria('');
        setFilterDisponibilidad('');
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-actions-wrapper">
                    <div className="filtros-inline">
                        <div className="filter-item">
                            <div className="inv-filter-search-wrap">
                                <FaSearch className="inv-filter-icon" />
                                <input
                                    type="text"
                                    placeholder="Referencia o producto..."
                                    value={filterSearch}
                                    onChange={e => setFilterSearch(e.target.value)}
                                    className="filter-inline-input"
                                />
                            </div>
                        </div>

                        <div className="filter-item">
                            <select value={filterProveedor} onChange={e => setFilterProveedor(e.target.value)}>
                                <option value="">Proveedor: Todos</option>
                                {(proveedores || []).map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre_empresa}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-item">
                            <select value={filterCategoria} onChange={e => {
                                setFilterCategoria(e.target.value);
                                setFilterSubcategoria('');
                            }}>
                                <option value="">Categoría: Todas</option>
                                {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>

                        <div className="filter-item">
                            <select value={filterSubcategoria} onChange={e => setFilterSubcategoria(e.target.value)}>
                                <option value="">Subcategoría: Todas</option>
                                {subcatsDropdown.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>

                        <div className="filter-item">
                            <select value={filterDisponibilidad} onChange={e => setFilterDisponibilidad(e.target.value)}>
                                <option value="">Disponib.: Todos</option>
                                <option value="venta">Venta</option>
                                <option value="exhibicion">Exhibición</option>
                                <option value="consignacion">Consignación</option>
                                <option value="por_despachar">Por Despachar</option>
                                <option value="no_venta">No a la venta</option>
                            </select>
                        </div>

                        {hasFilters && (
                            <button className="clear-filters-btn" onClick={clearFilters} title="Limpiar filtros">
                                <FaTimes />
                            </button>
                        )}
                    </div>

                    <button className="btn-ghost-inv" onClick={handleExport} title="Exportar a CSV">
                        <FaFileExport />
                    </button>

                    <button className="btn-primary" onClick={openModal}>
                        <FaPlus /> Agregar
                    </button>
                </div>
            </div>

            <div className="ordenes-container">
                <div className="desktop-view">
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Proveedor</th>
                                <th>Factura</th>
                                <th>Venta</th>
                                <th>Disponibilidad</th>
                                <th>F. Ingreso</th>
                                <th>Referencia</th>
                                <th>Categoría</th>
                                <th>Subcategoría</th>
                                <th>Variación</th>
                                <th>Observación</th>
                                <th>Grupo</th>
                                <th style={{ width: '40px' }}></th>
                            </tr>
                        </thead>

                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="12">
                                        <div className="loading-container">
                                            <div className="loader"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="12" style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '2rem' }}>
                                        No se encontraron ítems con ese criterio.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(inv => {
                                    const color = inv.prod ? getCatColor(inv.prod.categoriaId) : '#94a3b8';
                                    return (
                                        <tr key={inv.id}>
                                            <td><span className="inv-id-badge">{inv.id}</span></td>
                                            <td className="inv-proveedor-col">{inv.proveedorNombre}</td>
                                            <td className="inv-factura-col"><span className="text-plain">{inv.facturaManual}</span></td>
                                            <td className="inv-numeric">{inv.ventaId}</td>
                                            <td>
                                                <span className={`disp-badge disp-${inv.disponibilidad}`}>
                                                    {DISPONIBILIDAD_LABELS[inv.disponibilidad] || '—'}
                                                </span>
                                            </td>
                                            <td>{inv.fechaIngreso ? inv.fechaIngreso.split('-').reverse().join('/') : '—'}</td>
                                            <td>
                                                <div className="prod-name-cell">
                                                    <span className="inv-prod-name">{inv.prod?.nombre || '—'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                {inv.cat && (
                                                    <span className="cat-badge cat-badge--standalone" style={{ '--cat-color': color }}>
                                                        {inv.cat.nombre}
                                                    </span>
                                                )}
                                            </td>
                                            <td>{inv.subcat?.nombre || '—'}</td>
                                            <td><span className="text-plain">{inv.variacion || '—'}</span></td>
                                            <td className="obs-cell-col">
                                                <ObsCell text={inv.observacion} />
                                            </td>
                                            <td>
                                                {inv.grupo_nombre
                                                    ? <span className="grupo-inv-badge">{inv.grupo_nombre}</span>
                                                    : <span className="empty-val">—</span>}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {inv.imagen && (
                                                    <button 
                                                        className="btn-view-img" 
                                                        title="Ver imagen"
                                                        onClick={() => setPreviewImg({ open: true, url: inv.imagen })}
                                                    >
                                                        <FaImage />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ===== MODAL AGREGAR ENTRADA ===== */}
            {showModal && (
                <div className={`inv-overlay${modalVisible ? ' inv-overlay-visible' : ''}`} onClick={closeModal}>
                    <div className={`inv-modal${modalVisible ? ' inv-modal-visible' : ''}`} onClick={e => e.stopPropagation()}>
                        <div className="inv-modal-header">
                            <div className="inv-modal-header-left">
                                <FaPlus className="inv-modal-icon" />
                                <h3>Nueva Entrada de Inventario</h3>
                            </div>
                            <button className="inv-modal-close" onClick={closeModal}>&times;</button>
                        </div>

                        <form className="inv-form" onSubmit={handleSubmit}>
                            <div className="inv-form-body">
                                <div className="inv-section">
                                    <div className="inv-section-title">Detalles del Producto</div>
                                    <div className="ifg-grid">
                                        <div className="ifg-group">
                                            <label className="ifg-label">Proveedor</label>
                                            <select className="ifg-input" value={form.proveedorId} onChange={e => handleField('proveedorId', e.target.value)}>
                                                <option value="">Seleccionar...</option>
                                                {(proveedores || []).map(p => <option key={p.id} value={p.id}>{p.nombre_empresa}</option>)}
                                            </select>
                                        </div>

                                        <div className="ifg-group">
                                            <label className="ifg-label">Referencia (Producto)</label>
                                            <select className="ifg-input" value={form.productoId} onChange={e => handleField('productoId', e.target.value)} disabled={!form.proveedorId}>
                                                <option value="">Seleccionar...</option>
                                                {formProducts.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                            </select>
                                        </div>

                                        <div className="ifg-group">
                                            <label className="ifg-label">Categoría</label>
                                            <select className="ifg-input" value={form.categoriaId} onChange={e => handleField('categoriaId', e.target.value)}>
                                                <option value="">Seleccionar...</option>
                                                {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                            </select>
                                        </div>

                                        <div className="ifg-group">
                                            <label className="ifg-label">Subcategoría</label>
                                            <select className="ifg-input" value={form.subcategoriaId} onChange={e => handleField('subcategoriaId', e.target.value)} disabled={!form.categoriaId}>
                                                <option value="">Seleccionar...</option>
                                                {formSubcats.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                            </select>
                                        </div>

                                        <div className="ifg-group">
                                            <label className="ifg-label">Variación</label>
                                            <input type="text" className="ifg-input" value={form.variacion} onChange={e => handleField('variacion', e.target.value)} placeholder="Ej: Color, tamaño..." />
                                        </div>

                                        <div className="ifg-group">
                                            <label className="ifg-label">Costo</label>
                                            <div className="ifg-input-prefix">
                                                <span>$</span>
                                                <input type="text" className="ifg-input-raw" value={form.costo} onChange={e => handleField('costo', e.target.value)} placeholder="0.00" />
                                            </div>
                                        </div>

                                        <div className="ifg-group">
                                            <label className="ifg-label">Disponibilidad</label>
                                            <select className="ifg-input" value={form.disponibilidad} onChange={e => handleField('disponibilidad', e.target.value)}>
                                                {Object.entries(DISPONIBILIDAD_LABELS).map(([key, label]) => (
                                                    <option key={key} value={key}>{label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {form.disponibilidad === 'venta' && (
                                            <div className="ifg-group">
                                                <label className="ifg-label">ID de Venta</label>
                                                <select className="ifg-input" value={form.ventaId} onChange={e => handleField('ventaId', e.target.value)}>
                                                    <option value="">Seleccionar Venta...</option>
                                                    {ordenesPendientes.map(id => <option key={id} value={id}>{id}</option>)}
                                                </select>
                                            </div>
                                        )}

                                        <div className="ifg-group">
                                            <label className="ifg-label">Cantidad a crear</label>
                                            <input type="number" min="1" max="100" className="ifg-input" value={form.cantidad} onChange={e => handleField('cantidad', e.target.value)} />
                                        </div>

                                        <div className="ifg-group">
                                            <label className="ifg-label">Asignar a Grupo <span style={{ color: '#64748b', fontWeight: 400 }}>(opcional)</span></label>
                                            <select className="ifg-input" value={form.grupoId} onChange={e => handleField('grupoId', e.target.value)}>
                                                <option value="">Sin grupo</option>
                                                {grupos.filter(g => g.activo).map(g => (
                                                    <option key={g.id} value={g.id}>{g.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="ifg-group ifg-full">
                                            <label className="ifg-label">Observación</label>
                                            <textarea className="ifg-input ifg-textarea" value={form.observacion} onChange={e => handleField('observacion', e.target.value)} placeholder="Notas adicionales..." />
                                        </div>

                                        <div className="ifg-group ifg-full">
                                            <label className="ifg-label">Imagen del Producto</label>
                                            <div className="img-upload-zone">
                                                {form.imagen ? (
                                                    <div className="img-preview-container">
                                                        <div className="img-preview-placeholder">
                                                            <FaImage style={{ fontSize: '2rem', color: '#3b82f6' }} />
                                                            <span>{form.imagen.name}</span>
                                                        </div>
                                                        <button type="button" className="img-remove-btn" onClick={() => handleField('imagen', null)}>&times;</button>
                                                    </div>
                                                ) : (
                                                    <div className="img-upload-empty">
                                                        <FaUpload className="img-upload-icon" />
                                                        <div className="img-upload-text">Arrastra una imagen aquí o usa las opciones:</div>
                                                        <div className="img-upload-actions">
                                                            <label className="btn-upload-action">
                                                                <FaUpload /> Cargar archivo
                                                                <input type="file" hidden accept="image/*" onChange={e => handleField('imagen', e.target.files[0])} />
                                                            </label>
                                                            <button type="button" className="btn-upload-action" onClick={() => alert('Simulación: Abriendo cámara...')}>
                                                                <FaCamera /> Tomar foto
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="inv-modal-footer">
                                <button type="button" className="btn-secondary" style={{ width: 'auto' }} onClick={closeModal}>Cancelar</button>
                                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
                                    <FaPlus /> Guardar Entrada
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InventarioPage;
