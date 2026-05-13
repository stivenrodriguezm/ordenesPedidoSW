import React, { useState, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';
import { AppContext } from '../AppContext';
import { formatCOP, parseCOP } from '../utils/formatCOP';
import { FaPlus, FaTrashAlt, FaChevronDown, FaChevronUp, FaEdit, FaSave, FaTimes, FaBoxOpen, FaImage, FaCamera, FaUpload, FaSearch, FaLayerGroup } from 'react-icons/fa';
import './FacturasProveedorPage.css';

const getTodayStr = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().split('T')[0];
};

const emptyRef = () => ({ 
    referenciaId: '', 
    categoriaId: '', 
    subcategoriaId: '', 
    variacion: '', 
    costo: '', 
    costoDisplay: '', 
    observacion: '', 
    disponibilidad: 'exhibicion', 
    ventaId: '', 
    imagen: null, 
    visible: false 
});

const emptyForm = () => ({
    idManual: '',
    valor: '',
    valorDisplay: '',
    fechaFactura: getTodayStr(),
    fechaPago: '',
    proveedorId: '',
    observaciones: '',
    productos: [{ ...emptyRef(), visible: true }],
});

const formatCOPInt = (value) => {
    const n = parseInt(value) || 0;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
};

function formatDate(dtStr) {
    if (!dtStr) return '—';
    const parts = dtStr.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    const d = new Date(dtStr);
    if (isNaN(d)) return dtStr;
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Estados disponibles para facturas
const ESTADOS_FACTURA = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'pagada', label: 'Pagada' },
    { value: 'atrasada', label: 'Atrasada' },
    { value: 'anulada', label: 'Anulada' },
];

function FacturasProveedorPage() {
    const { proveedores } = useContext(AppContext);
    const [facturas, setFacturas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [ordenesPendientes, setOrdenesPendientes] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [selectedGrupoId, setSelectedGrupoId] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm());
    const [expandedId, setExpandedId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Filtros
    const [filterEstado, setFilterEstado] = useState('');
    const [filterProveedor, setFilterProveedor] = useState('');
    const [filterFechaDesde, setFilterFechaDesde] = useState('');
    const [filterFechaHasta, setFilterFechaHasta] = useState('');
    const [filterSearch, setFilterSearch] = useState('');

    // Modal editar factura (obs + estado)
    const [editModal, setEditModal] = useState(null); // { id, observaciones, estado }

    const { data: referencias = [] } = useQuery({
        queryKey: ['productos-all'],
        queryFn: async () => {
            const res = await API.get('/referencias/');
            return res.data.results || res.data || [];
        },
    });

    useEffect(() => {
        const fetchAll = async () => {
            setIsLoading(true);
            try {
                const [facRes, catRes, subRes, ordRes, grupoRes] = await Promise.all([
                    API.get('/suministros/facturas/'),
                    API.get('/suministros/categorias/'),
                    API.get('/suministros/subcategorias/'),
                    API.get('/get-pendientes-ids/'),
                    API.get('/suministros/grupos/')
                ]);
                
                const formattedFacturas = (facRes.data.results || facRes.data).map(f => ({
                    ...f,
                    idManual: f.id_manual,
                    fechaFactura: f.fecha_factura,
                    fechaPago: f.fecha_pago,
                    proveedorNombre: f.proveedor_nombre,
                    // items_inventario viene directamente del backend
                    // lo mapeamos a "productos" para mantener el estado interno igual
                    productos: (f.items_inventario || []).map(p => ({
                        ...p,
                        id: p.id_referencia,          // id del inventario
                        referenciaId: p.referencia,
                        categoriaId: p.categoria,
                        subcategoriaId: p.subcategoria,
                        ventaId: p.venta_id,          // viene del SerializerMethodField
                        costo: p.costo_especifico,    // campo renombrado
                        // los *_nombre ya vienen del serializer
                    }))
                }));
                setFacturas(formattedFacturas);
                setCategorias(catRes.data.results || catRes.data);
                setSubcategorias(subRes.data.results || subRes.data);
                setOrdenesPendientes(ordRes.data || []);
                setGrupos(grupoRes.data.results || grupoRes.data || []);
            } catch (err) {
                console.error("Error fetching facturas", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, []);

    const CATEGORIAS = categorias;
    const SUBCATEGORIAS = subcategorias;

    const resetModal = () => { setForm(emptyForm()); setShowModal(false); };

    const handleField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleValorChange = e => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setForm(prev => ({ ...prev, valor: raw, valorDisplay: raw ? formatCOP(parseInt(raw)) : '' }));
    };

    const handleRefRow = (index, field, value) => {
        setForm(prev => {
            const prods = [...prev.productos];
            if (field === 'costoDisplay') {
                const raw = value.replace(/[^0-9]/g, '');
                prods[index] = { ...prods[index], costo: raw, costoDisplay: raw ? formatCOP(parseInt(raw)) : '' };
            } else if (field === 'categoriaId') {
                prods[index] = { ...prods[index], categoriaId: value, subcategoriaId: '' };
            } else {
                prods[index] = { ...prods[index], [field]: value };
            }
            return { ...prev, productos: prods };
        });
    };

    const addRefRow = () => {
        const newRow = emptyRef();
        setForm(prev => ({ ...prev, productos: [...prev.productos, newRow] }));
        setTimeout(() => {
            setForm(prev => {
                const prods = [...prev.productos];
                const lastIdx = prods.length - 1;
                prods[lastIdx] = { ...prods[lastIdx], visible: true };
                return { ...prev, productos: prods };
            });
        }, 20);
    };

    // Import all components of a group as pre-filled rows
    const addGrupoRows = () => {
        if (!selectedGrupoId) return;
        const grupo = grupos.find(g => String(g.id) === String(selectedGrupoId));
        if (!grupo) return;

        const newRows = grupo.componentes.flatMap(comp => {
            const count = comp.cantidad || 1;
            return Array.from({ length: count }, () => ({
                ...emptyRef(),
                referenciaId: String(comp.referencia),
                categoriaId: comp.categoria ? String(comp.categoria) : '',
                subcategoriaId: comp.subcategoria ? String(comp.subcategoria) : '',
                variacion: comp.variacion || '',
                visible: true,
                _grupoNombre: grupo.nombre,
            }));
        });

        setForm(prev => ({
            ...prev,
            productos: [...prev.productos.filter(p => p.referenciaId), ...newRows],
        }));
        setSelectedGrupoId('');
    };

    const removeRefRow = index => setForm(prev => ({
        ...prev,
        productos: prev.productos.filter((_, i) => i !== index),
    }));

    const totalCostos = form.productos.reduce((acc, p) => acc + (parseInt(p.costo) || 0), 0);
    const valorFactura = parseInt(form.valor) || 0;
    const canSubmit = valorFactura > 0 && totalCostos === valorFactura;

    const handleSubmit = async e => {
        e.preventDefault();
        if (!canSubmit) return;
        
        const payload = {
            id_manual: form.idManual,
            valor: parseCOP(form.valor),
            fecha_factura: form.fechaFactura,
            fecha_pago: form.fechaPago || null,
            proveedor: form.proveedorId ? parseInt(form.proveedorId) : null,
            estado: 'pendiente',
            observaciones: form.observaciones,
            productos: form.productos.filter(p => p.referenciaId).map(p => ({
                referencia: parseInt(p.referenciaId),
                categoria: p.categoriaId ? parseInt(p.categoriaId) : null,
                subcategoria: p.subcategoriaId ? parseInt(p.subcategoriaId) : null,
                variacion: p.variacion,
                costo: parseCOP(p.costo),
                observacion: p.observacion,
                disponibilidad: p.disponibilidad,
                venta_id: p.ventaId,
            }))
        };
        
        try {
            await API.post('/suministros/facturas/', payload);
            const fRes = await API.get('/suministros/facturas/');
            const rawFacturas = fRes.data.results || fRes.data;
            const formattedFacturas = rawFacturas.map(f => ({
                ...f,
                idManual: f.id_manual,
                fechaFactura: f.fecha_factura,
                fechaPago: f.fecha_pago,
                proveedorNombre: f.proveedor_nombre,
                productos: (f.items_inventario || []).map(p => ({
                    ...p,
                    id: p.id_referencia,
                    referenciaId: p.referencia,
                    categoriaId: p.categoria,
                    subcategoriaId: p.subcategoria,
                    ventaId: p.venta_id,
                    costo: p.costo_especifico,
                }))
            }));
            setFacturas(formattedFacturas);
            resetModal();
        } catch (error) {
            console.error("Error saving factura", error);
            alert("Hubo un error al guardar la factura. Verifica la conexión.");
        }
    };

    const toggleExpand = id => setExpandedId(expandedId === id ? null : id);

    // Filtro aplicado
    const filteredFacturas = facturas.filter(f => {
        if (filterSearch) {
            const q = filterSearch.toLowerCase();
            if (
                !String(f.id).toLowerCase().includes(q) &&
                !(f.idManual || '').toLowerCase().includes(q)
            ) return false;
        }
        if (filterEstado && f.estado?.toLowerCase() !== filterEstado.toLowerCase()) return false;
        if (filterProveedor && f.proveedorNombre?.toLowerCase() !== filterProveedor.toLowerCase()) return false;
        if (filterFechaDesde && f.fechaFactura < filterFechaDesde) return false;
        if (filterFechaHasta && f.fechaFactura > filterFechaHasta) return false;
        return true;
    });

    const getEstadoClass = (estado) => {
        const e = (estado || '').toLowerCase();
        if (e === 'pagada') return 'status-badge status-finalizada';
        if (e === 'pendiente') return 'status-badge status-creada';
        if (e === 'atrasada') return 'status-badge status-anulada';
        if (e === 'anulada') return 'status-badge status-devuelta';
        // legacy "a tiempo"
        if (e === 'a tiempo') return 'status-badge status-despachada';
        return 'status-badge status-creada';
    };

    const hasFilters = filterEstado || filterProveedor || filterFechaDesde || filterFechaHasta || filterSearch;
    const handleClearFilters = () => {
        setFilterEstado('');
        setFilterProveedor('');
        setFilterFechaDesde('');
        setFilterFechaHasta('');
        setFilterSearch('');
    };

    // Guardar desde el modal de edición
    const saveEditModal = async () => {
        if (!editModal) return;
        try {
            await API.patch(`/suministros/facturas/${editModal.id}/`, {
                estado: editModal.estado,
                observaciones: editModal.observaciones
            });
            setFacturas(prev => prev.map(f =>
                f.id === editModal.id
                    ? { ...f, observaciones: editModal.observaciones, estado: editModal.estado }
                    : f
            ));
        } catch(error) {
            console.error("Error updating factura:", error);
            alert("Error al actualizar la factura.");
        }
        setEditModal(null);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-actions-wrapper">
                    <div className="filtros-inline">
                        <div className="filter-item">
                            <div className="rem-filter-search-wrap">
                                <FaSearch className="rem-filter-icon" />
                                <input
                                    type="text"
                                    placeholder="ID Factura..."
                                    value={filterSearch}
                                    onChange={e => setFilterSearch(e.target.value)}
                                    className="filter-inline-input"
                                />
                            </div>
                        </div>
                        <div className="filter-item">
                            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
                                <option value="">Estado: Todos</option>
                                {ESTADOS_FACTURA.map(e => (
                                    <option key={e.value} value={e.value}>{e.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-item">
                            <select value={filterProveedor} onChange={e => setFilterProveedor(e.target.value)}>
                                <option value="">Proveedor: Todos</option>
                                {[...new Set(facturas.map(f => f.proveedorNombre))].filter(Boolean).map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-item filter-fecha">
                            <label className="filter-fecha-label">Desde</label>
                            <input type="date" value={filterFechaDesde} onChange={e => setFilterFechaDesde(e.target.value)} />
                        </div>
                        <div className="filter-item filter-fecha">
                            <label className="filter-fecha-label">Hasta</label>
                            <input type="date" value={filterFechaHasta} onChange={e => setFilterFechaHasta(e.target.value)} />
                        </div>
                        {hasFilters && (
                            <button className="clear-filters-btn" onClick={handleClearFilters} title="Limpiar filtros">
                                <FaTimes />
                            </button>
                        )}
                    </div>
                    <button className="btn-primary" onClick={() => setShowModal(true)}>
                        <FaPlus /> Nueva Factura
                    </button>
                </div>
            </div>

            <div className="ordenes-container">
                <div className="desktop-view">
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>ID Factura</th>
                                <th>Proveedor</th>
                                <th>Fecha Factura</th>
                                <th>Fecha Pago</th>
                                <th>Estado</th>
                                <th>Valor</th>
                                <th>Observaciones</th>
                                <th style={{ width: 60, textAlign: 'center' }}>Detalle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="8"><div className="loading-container"><div className="loader"></div></div></td></tr>
                            ) : filteredFacturas.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem', fontStyle: 'italic' }}>No se encontraron facturas.</td></tr>
                            ) : filteredFacturas.map(f => (
                                <React.Fragment key={f.id}>
                                    <tr className={expandedId === f.id ? 'expanded-row-highlight' : ''}>
                                        <td><span className="id-manual-badge">{f.idManual}</span></td>
                                        <td title={f.proveedorNombre}>{f.proveedorNombre}</td>
                                        <td title={formatDate(f.fechaFactura)}>{formatDate(f.fechaFactura)}</td>
                                        <td title={f.fechaPago ? formatDate(f.fechaPago) : '—'}>{f.fechaPago ? formatDate(f.fechaPago) : <span className="empty-val">—</span>}</td>
                                        <td title={ESTADOS_FACTURA.find(e => e.value === f.estado?.toLowerCase())?.label || (f.estado ? f.estado.charAt(0).toUpperCase() + f.estado.slice(1) : 'Pendiente')}>
                                            <span className={getEstadoClass(f.estado)}>
                                                {ESTADOS_FACTURA.find(e => e.value === f.estado?.toLowerCase())?.label
                                                    || (f.estado ? f.estado.charAt(0).toUpperCase() + f.estado.slice(1) : 'Pendiente')}
                                            </span>
                                        </td>
                                        <td title={formatCOP(f.valor)}><span className="valor-cop">{formatCOP(f.valor)}</span></td>
                                        <td className="obs-cell" title={f.observaciones || ''}>{f.observaciones || <span className="empty-val">—</span>}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="action-btn" onClick={() => toggleExpand(f.id)}>
                                                {expandedId === f.id ? <FaChevronUp /> : <FaChevronDown />}
                                            </button>
                                        </td>
                                    </tr>

                                    {expandedId === f.id && (
                                        <tr className="expanded-row">
                                            <td colSpan="8">
                                                <div className="factura-expanded-premium">
                                                    {/* Top bar */}
                                                    <div className="expanded-top-bar">
                                                        <div className="expanded-label">
                                                            <FaBoxOpen />
                                                            <span>Referencias Recibidas · {f.productos?.length || 0} ítem{(f.productos?.length || 0) !== 1 ? 's' : ''}</span>
                                                        </div>

                                                        {/* Observation card — ahora botón abre modal */}
                                                        <div className="obs-card">
                                                            <div className="obs-icon"><FaEdit /></div>
                                                            <div className="obs-text-area">
                                                                <div className="obs-meta-label">Observación de Factura</div>
                                                                <p className={`obs-value${!f.observaciones ? ' empty' : ''}`}>
                                                                    {f.observaciones || 'Sin observaciones'}
                                                                </p>
                                                            </div>
                                                            <button
                                                                className="btn-edit-obs"
                                                                onClick={() => setEditModal({ id: f.id, observaciones: f.observaciones || '', estado: f.estado || 'pendiente' })}
                                                            >
                                                                <FaEdit /> Editar
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Items table */}
                                                    <div className="expanded-items-section">
                                                        {f.productos && f.productos.length > 0 ? (
                                                            <table className="items-table">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Id</th>
                                                                        <th>Referencia</th>
                                                                        <th>Categoría</th>
                                                                        <th>Subcategoría</th>
                                                                        <th>Variación</th>
                                                                        <th>Costo</th>
                                                                        <th>Observación</th>
                                                                        <th>Disponibilidad</th>
                                                                        <th>Venta</th>
                                                                        <th>Imagen</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                 {f.productos.map((p, i) => {
                                                                        // Use enriched names from serializer directly (avoids type mismatch on .find)
                                                                        const refNombre = p.referencia_nombre || p.producto_nombre || (p.referenciaId ? `Ref. #${p.referenciaId}` : '—');
                                                                        const catNombre = p.categoria_nombre || null;
                                                                        const subNombre = p.subcategoria_nombre || null;
                                                                        return (
                                                                            <tr key={i}>
                                                                                <td title={p.id || '—'}>{p.id || '—'}</td>
                                                                                <td title={refNombre}><span className="item-ref-name truncate-text">{refNombre}</span></td>
                                                                                <td title={catNombre || '—'}>{catNombre ? <span className="item-var-badge">{catNombre}</span> : <span className="empty-val">—</span>}</td>
                                                                                <td title={subNombre || '—'}>{subNombre ? <span className="item-var-badge">{subNombre}</span> : <span className="empty-val">—</span>}</td>
                                                                                <td title={p.variacion || '—'} className="truncate-text">{p.variacion || '—'}</td>
                                                                                <td title={formatCOP(p.costo)}><span className="item-costo">{formatCOP(p.costo)}</span></td>
                                                                                <td title={p.observacion || '—'} className="truncate-text"><span className="item-obs">{p.observacion || '—'}</span></td>
                                                                                <td title={p.disponibilidad ? (p.disponibilidad.charAt(0).toUpperCase() + p.disponibilidad.slice(1)) : '—'}>
                                                                                    {p.disponibilidad ? (
                                                                                        <span className={`disp-badge disp-${p.disponibilidad === 'no_venta' ? 'no_venta' : p.disponibilidad}`}>
                                                                                            {p.disponibilidad === 'no_venta' ? 'No a la venta' : p.disponibilidad === 'exhibicion' ? 'Exhibición' : p.disponibilidad === 'consignacion' ? 'Consignación' : p.disponibilidad === 'venta' ? 'Venta' : p.disponibilidad === 'por_despachar' ? 'Por Despachar' : (p.disponibilidad.charAt(0).toUpperCase() + p.disponibilidad.slice(1))}
                                                                                        </span>
                                                                                    ) : <span className="empty-val">—</span>}
                                                                                </td>
                                                                                <td title={p.ventaId ? `Venta #${p.ventaId}` : '—'}>{p.ventaId || '—'}</td>
                                                                                <td style={{ textAlign: 'center' }}>
                                                                                    {p.imagen && (
                                                                                        <button type="button" className="btn-view-img" title="Ver imagen">
                                                                                            <span className="icon-wrapper"><FaImage /></span>
                                                                                        </button>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        ) : (
                                                            <div className="no-items-expanded">No hay referencias registradas en esta factura.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ===== MODAL EDITAR OBSERVACIÓN + ESTADO ===== */}
            {editModal && (
                <div className="modal-overlay edit-factura-overlay" onClick={e => { if (e.target === e.currentTarget) setEditModal(null); }}>
                    <div className="edit-factura-modal">
                        <div className="edit-factura-header">
                            <h3>Editar Factura</h3>
                            <button className="modal-close" onClick={() => setEditModal(null)}>×</button>
                        </div>
                        <div className="edit-factura-body">
                            <div className="edit-factura-field">
                                <label>Estado</label>
                                <div className="edit-estado-options">
                                    {ESTADOS_FACTURA.map(e => (
                                        <button
                                            key={e.value}
                                            type="button"
                                            className={`estado-option-btn${editModal.estado === e.value ? ' selected' : ''} estado-color-${e.value}`}
                                            onClick={() => setEditModal(prev => ({ ...prev, estado: e.value }))}
                                        >
                                            {e.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="edit-factura-field">
                                <label>Observación</label>
                                <textarea
                                    rows="3"
                                    placeholder="Escribe la observación de la factura..."
                                    value={editModal.observaciones}
                                    onChange={e => setEditModal(prev => ({ ...prev, observaciones: e.target.value }))}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="edit-factura-footer">
                            <button className="btn-secondary" onClick={() => setEditModal(null)}>Cancelar</button>
                            <button className="btn-primary" onClick={saveEditModal}><FaSave /> Guardar cambios</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODAL NUEVA FACTURA ===== */}
            {showModal && (
                <div className="fct-overlay">
                    <div className="fct-modal">
                        <div className="fct-header">
                            <h3>Nueva Factura de Proveedor</h3>
                            <button className="fct-close" onClick={resetModal}>&times;</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="fct-body">
                                {/* Row 1: ID + Valor + Proveedor */}
                                <div className="fct-row-3col">
                                    <div className="fct-field">
                                        <label>ID Factura</label>
                                        <input required type="text" placeholder="FAC-2026-001"
                                            value={form.idManual} onChange={e => handleField('idManual', e.target.value)} />
                                    </div>
                                    <div className="fct-field">
                                        <label>Valor Total</label>
                                        <div className="fct-prefix-wrap">
                                            <span className="fct-prefix">$</span>
                                            <input required type="text" placeholder="0"
                                                className="fct-prefix-input"
                                                value={form.valorDisplay} onChange={handleValorChange} />
                                        </div>
                                    </div>
                                    <div className="fct-field">
                                        <label>Proveedor</label>
                                        <select required value={form.proveedorId}
                                            onChange={e => handleField('proveedorId', e.target.value)}>
                                            <option value="">Seleccione...</option>
                                            {proveedores.map(p => (
                                                <option key={p.id} value={p.id}>{p.nombre_empresa}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Row 2: Fecha Factura + Fecha Pago + Observaciones */}
                                <div className="fct-row-3col">
                                    <div className="fct-field">
                                        <label>Fecha Factura</label>
                                        <input required type="date" value={form.fechaFactura}
                                            onChange={e => handleField('fechaFactura', e.target.value)} />
                                    </div>
                                    <div className="fct-field">
                                        <label>Fecha de Pago</label>
                                        <input type="date" value={form.fechaPago}
                                            onChange={e => handleField('fechaPago', e.target.value)} />
                                    </div>
                                    <div className="fct-field">
                                        <label>Observaciones</label>
                                        <input type="text" placeholder="Opcional..."
                                            value={form.observaciones} onChange={e => handleField('observaciones', e.target.value)} />
                                    </div>
                                </div>

                                {/* References section */}
                                <div className="fct-section-label">Referencias que Ingresan</div>

                                {form.productos.map((row, index) => {
                                    // Step 1: all refs for selected proveedor
                                    const providerRefs = referencias.filter(r => String(r.proveedor) === String(form.proveedorId));

                                    // Step 2: subcats filtered by chosen category
                                    const subcatsFiltered = row.categoriaId
                                        ? SUBCATEGORIAS.filter(s => String(s.categoria) === String(row.categoriaId))
                                        : [];

                                    // Step 3: refs filtered by category + subcategory
                                    const filteredRefs = providerRefs.filter(r => {
                                        if (row.categoriaId && String(r.categoria) !== String(row.categoriaId)) return false;
                                        if (row.subcategoriaId && String(r.subcategoria) !== String(row.subcategoriaId)) return false;
                                        return true;
                                    });

                                    const noRefsMsg = !form.proveedorId
                                        ? 'Elige proveedor primero'
                                        : providerRefs.length === 0
                                        ? 'Proveedor sin referencias'
                                        : filteredRefs.length === 0
                                        ? 'Sin resultados para los filtros'
                                        : 'Seleccione...';

                                    return (
                                        <div key={index} className={`fct-ref-row${row.visible ? ' fct-ref-visible' : ''}`}>
                                            {/* Fila 1: Categoría | Subcategoría | Referencia | Variación */}
                                            <div className="fct-ref-row1">
                                                {/* Categoría */}
                                                <div className="fct-field">
                                                    <label>Categoría</label>
                                                    <select
                                                        value={row.categoriaId}
                                                        onChange={e => {
                                                            // Reset subcategory AND reference when category changes
                                                            setForm(prev => {
                                                                const prods = [...prev.productos];
                                                                prods[index] = { ...prods[index], categoriaId: e.target.value, subcategoriaId: '', referenciaId: '' };
                                                                return { ...prev, productos: prods };
                                                            });
                                                        }}
                                                    >
                                                        <option value="">Sin categoría</option>
                                                        {CATEGORIAS.map(c => (
                                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Subcategoría */}
                                                <div className="fct-field">
                                                    <label>Subcategoría</label>
                                                    <select
                                                        value={row.subcategoriaId}
                                                        disabled={!row.categoriaId}
                                                        onChange={e => {
                                                            // Reset reference when subcategory changes
                                                            setForm(prev => {
                                                                const prods = [...prev.productos];
                                                                prods[index] = { ...prods[index], subcategoriaId: e.target.value, referenciaId: '' };
                                                                return { ...prev, productos: prods };
                                                            });
                                                        }}
                                                    >
                                                        <option value="">{row.categoriaId ? (subcatsFiltered.length === 0 ? 'Sin subcategorías' : 'Sin filtro') : 'Elige categoría primero'}</option>
                                                        {subcatsFiltered.map(s => (
                                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Referencia — filtrada por proveedor + cat + subcat */}
                                                <div className="fct-field">
                                                    <label>Referencia</label>
                                                    <select
                                                        required
                                                        value={row.referenciaId}
                                                        onChange={e => handleRefRow(index, 'referenciaId', e.target.value)}
                                                        disabled={!form.proveedorId || (filteredRefs.length === 0 && (!!row.categoriaId || !!row.subcategoriaId))}
                                                    >
                                                        <option value="">{noRefsMsg}</option>
                                                        {filteredRefs.map(r => (
                                                            <option key={r.id} value={r.id}>{r.nombre}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Variación */}
                                                <div className="fct-field">
                                                    <label>Variación</label>
                                                    <input type="text" placeholder="Ej: Color, tamaño"
                                                        value={row.variacion} onChange={e => handleRefRow(index, 'variacion', e.target.value)} />
                                                </div>
                                            </div>

                                            {/* Fila 2: Costo | Disponibilidad | (Venta) | Observación | Imagen | Trash */}
                                            <div className={`fct-ref-row2${row.disponibilidad === 'venta' ? ' fct-ref-row2-venta' : ''}`}>
                                                <div className="fct-field fct-field-costo">
                                                    <label>Costo</label>
                                                    <div className="fct-prefix-wrap">
                                                        <span className="fct-prefix">$</span>
                                                        <input required type="text" placeholder="0"
                                                            className="fct-prefix-input"
                                                            value={row.costoDisplay} onChange={e => handleRefRow(index, 'costoDisplay', e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="fct-field">
                                                    <label>Disponibilidad</label>
                                                    <select value={row.disponibilidad} onChange={e => handleRefRow(index, 'disponibilidad', e.target.value)}>
                                                        <option value="exhibicion">Exhibición</option>
                                                        <option value="venta">Venta</option>
                                                        <option value="consignacion">Consignación</option>
                                                        <option value="por_despachar">Por Despachar</option>
                                                        <option value="no_venta">No a la venta</option>
                                                    </select>
                                                </div>
                                                {row.disponibilidad === 'venta' && (
                                                    <div className="fct-field">
                                                        <label>Venta Asociada</label>
                                                        <select value={row.ventaId} onChange={e => handleRefRow(index, 'ventaId', e.target.value)}>
                                                            <option value="">Seleccione...</option>
                                                            {ordenesPendientes.map(id => <option key={id} value={id}>{id}</option>)}
                                                        </select>
                                                    </div>
                                                )}
                                                <div className="fct-field fct-field-obs">
                                                    <label>Observación del Ítem</label>
                                                    <input type="text" placeholder="Opcional..."
                                                        value={row.observacion} onChange={e => handleRefRow(index, 'observacion', e.target.value)} />
                                                </div>
                                                <div className="fct-field fct-field-img">
                                                    <label>Imagen</label>
                                                    <div className="fct-img-zone">
                                                        {row.imagen ? (
                                                            <div className="fct-img-preview">
                                                                <FaImage style={{ fontSize: '0.9rem', color: '#3b82f6', flexShrink: 0 }} />
                                                                <span className="fct-img-name">{row.imagen.name}</span>
                                                                <button type="button" className="fct-img-remove" onClick={() => handleRefRow(index, 'imagen', null)}>&times;</button>
                                                            </div>
                                                        ) : (
                                                            <div className="fct-img-actions">
                                                                <label className="fct-img-btn">
                                                                    <FaUpload /> Adjuntar
                                                                    <input type="file" hidden accept="image/*" onChange={e => handleRefRow(index, 'imagen', e.target.files[0])} />
                                                                </label>
                                                                <button type="button" className="fct-img-btn" onClick={() => alert('Simulación: cámara')}>
                                                                    <FaCamera /> Foto
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {form.productos.length > 1 && (
                                                    <button type="button" className="fct-trash-btn"
                                                        onClick={() => removeRefRow(index)} title="Quitar">
                                                        <FaTrashAlt />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="fct-add-row-actions">
                                    <button type="button" className="fct-add-ref" onClick={addRefRow}>
                                        <FaPlus /> Agregar Referencia
                                    </button>
                                    <div className="fct-grupo-import">
                                        <FaLayerGroup className="fct-grupo-icon" />
                                        <select
                                            value={selectedGrupoId}
                                            onChange={e => setSelectedGrupoId(e.target.value)}
                                            className="fct-grupo-select"
                                        >
                                            <option value="">Ingresar por Grupo...</option>
                                            {grupos.filter(g => g.activo).map(g => (
                                                <option key={g.id} value={g.id}>{g.nombre}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            className="fct-grupo-btn"
                                            onClick={addGrupoRows}
                                            disabled={!selectedGrupoId}
                                            title="Agregar todas las referencias del grupo"
                                        >
                                            <FaPlus />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="fct-footer">
                                <button type="button" className="btn-secondary" onClick={resetModal}>Cancelar</button>
                                <span className={`total-costos-label ${canSubmit ? 'total-match' : totalCostos > 0 ? 'total-mismatch' : ''}`}>
                                    {formatCOPInt(totalCostos)}
                                </span>
                                <button type="submit" className="btn-primary" disabled={!canSubmit}>Registrar Factura</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FacturasProveedorPage;
