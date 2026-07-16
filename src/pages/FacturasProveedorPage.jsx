import React, { useState, useContext, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';
import { AppContext } from '../AppContext';
import { formatCOP, parseCOP } from '../utils/formatCOP';
import { FaPlus, FaTrashAlt, FaChevronDown, FaChevronUp, FaEdit, FaSave, FaTimes, FaBoxOpen, FaImage, FaCamera, FaUpload, FaSearch, FaLayerGroup, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
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
    cantidad: 1,
    grupoLocalId: '',
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
    grupoInstances: [],  // { localId, nombre } — grupos NUEVOS a crear
});

let _grupoCounter = 0;
const newGrupoLocalId = () => `g_${++_grupoCounter}_${Date.now()}`;

// Devuelve si un grupoLocalId es un ID existente en el backend (numérico)
const isExistingGrupoId = (localId) => localId && !String(localId).startsWith('g_') && !isNaN(parseInt(localId));

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
    const [gruposActivos, setGruposActivos] = useState([]);  // grupos activos del backend
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm());
    const [newGrupoName, setNewGrupoName] = useState('');   // input para crear grupo en el modal
    const [expandedId, setExpandedId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Toast
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const toastTimerRef = useRef(null);

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 4000);
    };

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
                const [facRes, catRes, subRes, ordRes, gruRes] = await Promise.all([
                    API.get('/suministros/facturas/'),
                    API.get('/suministros/categorias/'),
                    API.get('/suministros/subcategorias/'),
                    API.get('/get-pendientes-ids/'),
                    API.get('/suministros/grupos/'),
                ]);
                // Solo grupos activos (sin estado despachado / sin activo=false)
                const allGrupos = gruRes.data.results || gruRes.data || [];
                setGruposActivos(allGrupos.filter(g => g.activo !== false));
                
                const formattedFacturas = (facRes.data.results || facRes.data).map(f => ({
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
                setCategorias(catRes.data.results || catRes.data);
                setSubcategorias(subRes.data.results || subRes.data);
                setOrdenesPendientes(ordRes.data || []);
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

    // ─── Gestión de grupos dentro de la factura ────────────────────────────
    // grupoInstances = grupos NUEVOS que se crearán al guardar { localId, nombre }
    // El select por fila también puede apuntar a un grupo existente (ID numérico del backend)

    const addGrupoInstance = () => {
        const nombre = newGrupoName.trim();
        if (!nombre) return;
        // Verificar que no exista ya un grupo nuevo con ese nombre en esta factura
        const yaExiste = form.grupoInstances.some(g => g.nombre.toLowerCase() === nombre.toLowerCase());
        if (yaExiste) { showToast('Ya existe un grupo con ese nombre en esta factura.', 'error'); return; }
        const localId = newGrupoLocalId();
        setForm(prev => ({
            ...prev,
            grupoInstances: [...prev.grupoInstances, { localId, nombre }],
        }));
        setNewGrupoName('');
    };

    const removeGrupoInstance = (localId) => {
        setForm(prev => ({
            ...prev,
            productos: prev.productos.map(p =>
                p.grupoLocalId === localId ? { ...p, grupoLocalId: '' } : p
            ),
            grupoInstances: prev.grupoInstances.filter(g => g.localId !== localId),
        }));
    };

    const renameGrupoInstance = (localId, nombre) => {
        setForm(prev => ({
            ...prev,
            grupoInstances: prev.grupoInstances.map(g =>
                g.localId === localId ? { ...g, nombre } : g
            ),
        }));
    };

    const removeRefRow = index => setForm(prev => ({
        ...prev,
        productos: prev.productos.filter((_, i) => i !== index),
    }));

    // Total = sum of (cost * quantity) per row
    const totalCostos = form.productos.reduce((acc, p) => acc + ((parseInt(p.costo) || 0) * (parseInt(p.cantidad) || 1)), 0);
    const valorFactura = parseInt(form.valor) || 0;
    const canSubmit = valorFactura > 0 && totalCostos === valorFactura && form.proveedorId && form.idManual;

    const handleSubmit = async e => {
        e.preventDefault();
        
        if (!form.idManual || !form.proveedorId || valorFactura <= 0) {
            showToast('Por favor complete los campos obligatorios y asegúrese de que el total sea mayor a 0.', 'error');
            return;
        }
        if (totalCostos !== valorFactura) {
            showToast(`Error de validación: La suma de los productos agregados (${formatCOPInt(totalCostos)}) no coincide con el Valor Total de la factura (${formatCOPInt(valorFactura)}).`, 'error');
            return;
        }

        setIsCreating(true);

        // Paso 1: Crear grupos NUEVOS (localId string) que tengan al menos una fila asignada
        const grupoIdMap = {}; // localId → id real en BD
        for (const instance of form.grupoInstances) {
            const hasFila = form.productos.some(p => p.grupoLocalId === instance.localId && p.referenciaId);
            if (!hasFila) continue;
            try {
                const res = await API.post('/suministros/grupos/', {
                    nombre: instance.nombre,
                    descripcion: '',
                    activo: true,
                    componentes: [],
                });
                grupoIdMap[instance.localId] = res.data.id;
                // Actualizar grupos activos localmente
                setGruposActivos(prev => [...prev, res.data]);
            } catch (err) {
                console.error('Error creando grupo', instance.nombre, err);
                showToast(`Error al crear el grupo "${instance.nombre}". Intenta de nuevo.`, 'error');
                return;
            }
        }

        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0];
        const fechaConHora = form.fechaFactura.includes('T') ? form.fechaFactura : `${form.fechaFactura}T${timeString}`;

        // Paso 2: Registrar la factura con los IDs reales de grupo
        const payload = {
            id_manual: form.idManual,
            valor: parseCOP(form.valor),
            fecha_factura: fechaConHora,
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
                cantidad: parseInt(p.cantidad) || 1,
                // Si es ID existente del backend, usarlo directo; si es localId nuevo, buscar en mapa
                grupo_id: p.grupoLocalId
                    ? (isExistingGrupoId(p.grupoLocalId)
                        ? parseInt(p.grupoLocalId)
                        : (grupoIdMap[p.grupoLocalId] || null))
                    : null,
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
            showToast("Factura creada exitosamente.", "success");
            setShowModal(false);
        } catch (error) {
            console.error("Error creating factura:", error);
            showToast("Hubo un error al guardar la factura. Verifica la conexión.", "error");
        } finally {
            setIsCreating(false);
        }
    };

    const toggleExpand = id => setExpandedId(expandedId === id ? null : id);

    const filteredFacturas = React.useMemo(() => {
        return facturas.filter(f => {
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
    }, [facturas, filterSearch, filterEstado, filterProveedor, filterFechaDesde, filterFechaHasta]);

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
        setIsSavingEdit(true);
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
            showToast("Factura actualizada correctamente.", "success");
            setEditModal(null);
            fetchFacturas();
        } catch (err) {
            console.error(err);
            showToast("Error al actualizar la factura.", "error");
        } finally {
            setIsSavingEdit(false);
        }
    };

    return (
        <div className="page-container">
            <div className="v-glass-header" style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', overflowX: 'auto' }}>
                <div className="v-filters-bar" style={{ margin: 0, flex: 1 }}>
                    <div className="v-search-pill">
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="ID Factura..."
                            value={filterSearch}
                            onChange={e => setFilterSearch(e.target.value)}
                        />
                    </div>
                    <div className="v-select-pill">
                        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
                            <option value="">Estado: Todos</option>
                            {ESTADOS_FACTURA.map(e => (
                                <option key={e.value} value={e.value}>{e.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="v-select-pill">
                        <select value={filterProveedor} onChange={e => setFilterProveedor(e.target.value)}>
                            <option value="">Proveedor: Todos</option>
                            {[...new Set(facturas.map(f => f.proveedorNombre))].filter(Boolean).map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                    <div className="v-select-pill" style={{ height: 34, display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, padding: '0 0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Desde</label>
                        <input type="date" value={filterFechaDesde} onChange={e => setFilterFechaDesde(e.target.value)}
                            onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                            style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', color: '#334155', fontWeight: 600, cursor: 'pointer', outline: 'none', width: 'auto' }} />
                    </div>
                    <div className="v-select-pill" style={{ height: 34, display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, padding: '0 0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Hasta</label>
                        <input type="date" value={filterFechaHasta} onChange={e => setFilterFechaHasta(e.target.value)}
                            onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                            style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', color: '#334155', fontWeight: 600, cursor: 'pointer', outline: 'none', width: 'auto' }} />
                    </div>
                    {hasFilters && (
                        <button className="fct-clear-pill" onClick={handleClearFilters} title="Limpiar filtros">
                            <FaTimes />
                        </button>
                    )}
                </div>
                <div style={{ flexShrink: 0 }}>
                    <button className="v-btn-primary-glow" onClick={() => setShowModal(true)}>
                        <FaPlus />
                        <span>Nueva Factura</span>
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

                                                    {/* Items list */}
                                                    <div className="expanded-items-section">
                                                        {f.productos && f.productos.length > 0 ? (
                                                            <div className="expanded-items-list">
                                                                {f.productos.map((p, i) => {
                                                                    const refNombre = p.referencia_nombre || p.producto_nombre || (p.referenciaId ? `Ref. #${p.referenciaId}` : '—');
                                                                    const catNombre = p.categoria_nombre || null;
                                                                    const subNombre = p.subcategoria_nombre || null;
                                                                    const grupoNombre = p.grupo_nombre || null;
                                                                    return (
                                                                        <div key={i} className="invoice-item-card compact-card">
                                                                            <div className="compact-col compact-col-main">
                                                                                <div className="compact-title-group">
                                                                                    <span className="item-id-badge">#{p.id || '—'}</span>
                                                                                    <h4 className="item-title" title={refNombre}>{refNombre}</h4>
                                                                                </div>
                                                                                <div className="item-tags">
                                                                                    {grupoNombre && <span className="item-tag" style={{ background: '#e0f2fe', color: '#0284c7', borderColor: '#bae6fd' }}><FaLayerGroup style={{marginRight: 4}}/>{grupoNombre}</span>}
                                                                                    {catNombre && <span className="item-tag">{catNombre}</span>}
                                                                                    {subNombre && <span className="item-tag">{subNombre}</span>}
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            <div className="compact-col compact-col-desc">
                                                                                <div className="item-desc truncate-text" title={p.variacion || '—'}>
                                                                                    <span className="desc-label">Var:</span> <span className="desc-val">{p.variacion || '—'}</span>
                                                                                </div>
                                                                                <div className="item-desc truncate-text" title={p.observacion || '—'}>
                                                                                    <span className="desc-label">Obs:</span> <span className="desc-val">{p.observacion || '—'}</span>
                                                                                </div>
                                                                            </div>

                                                                            <div className="compact-col compact-col-status">
                                                                                {p.disponibilidad ? (
                                                                                    <span className={`disp-badge disp-${p.disponibilidad === 'no_venta' ? 'no_venta' : p.disponibilidad}`}>
                                                                                        {p.disponibilidad === 'no_venta' ? 'No a la venta' : p.disponibilidad === 'exhibicion' ? 'Exhibición' : p.disponibilidad === 'consignacion' ? 'Consignación' : p.disponibilidad === 'venta' ? 'Venta' : p.disponibilidad === 'por_despachar' ? 'Por Despachar' : (p.disponibilidad.charAt(0).toUpperCase() + p.disponibilidad.slice(1))}
                                                                                    </span>
                                                                                ) : <span className="empty-val">—</span>}
                                                                                <span className="item-venta-link">{p.ventaId ? `Venta #${p.ventaId}` : 'Sin asignar'}</span>
                                                                            </div>

                                                                            <div className="compact-col compact-col-price">
                                                                                <span className="item-costo">{formatCOP(p.costo)}</span>
                                                                            </div>

                                                                            {p.imagen && (
                                                                                <div className="compact-col compact-col-action">
                                                                                    <button type="button" className="btn-view-img" title="Ver imagen">
                                                                                        <FaImage />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
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
                <div className="fact-modal-overlay edit-factura-overlay" onClick={e => { if (e.target === e.currentTarget) setEditModal(null); }}>
                    <div className="edit-factura-modal">
                        <div className="edit-factura-header">
                            <h3>Editar Factura</h3>
                            <button className="fact-modal-close" onClick={() => setEditModal(null)}>×</button>
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
                            <button className="fact-btn-secondary" onClick={() => setEditModal(null)} disabled={isSavingEdit}>Cancelar</button>
                            <button className="fact-btn-primary" onClick={saveEditModal} disabled={isSavingEdit}>
                                <FaSave /> {isSavingEdit ? 'Guardando...' : 'Guardar cambios'}
                            </button>
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

                                {/* ── Sección de Grupos ── */}
                                <div className="fct-section-label">Grupos de esta Factura</div>
                                <div className="fct-grupos-panel">
                                    {/* Chips de grupos nuevos (a crear) */}
                                    <div className="fct-grupos-instancias">
                                        {form.grupoInstances.length === 0 ? (
                                            <span className="fct-grupos-empty">Sin grupos nuevos — puedes asignar ítems a grupos existentes desde el select de cada referencia</span>
                                        ) : form.grupoInstances.map(gi => (
                                            <div key={gi.localId} className="fct-grupo-chip">
                                                <FaLayerGroup style={{ fontSize: '0.75rem', color: '#2563eb', flexShrink: 0 }} />
                                                <input
                                                    type="text"
                                                    className="fct-grupo-chip-name"
                                                    value={gi.nombre}
                                                    onChange={e => renameGrupoInstance(gi.localId, e.target.value)}
                                                    placeholder="Nombre del grupo..."
                                                />
                                                <span className="fct-grupo-chip-count">
                                                    {form.productos.filter(p => p.grupoLocalId === gi.localId && p.referenciaId).length} ref.
                                                </span>
                                                <button
                                                    type="button"
                                                    className="fct-grupo-chip-remove"
                                                    onClick={() => removeGrupoInstance(gi.localId)}
                                                    title="Quitar grupo"
                                                >✕</button>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Input libre + botón crear grupo */}
                                    <div className="fct-grupo-create-row">
                                        <input
                                            type="text"
                                            className="fct-grupo-name-input"
                                            placeholder="Nombre del nuevo grupo (ej: Comedor Qatar)..."
                                            value={newGrupoName}
                                            onChange={e => setNewGrupoName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGrupoInstance(); } }}
                                        />
                                        <button
                                            type="button"
                                            className="fct-grupo-create-btn"
                                            onClick={addGrupoInstance}
                                            disabled={!newGrupoName.trim()}
                                        >
                                            <FaPlus /> Crear Grupo
                                        </button>
                                    </div>
                                </div>

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
                                        if (row.categoriaId && !r.categorias?.map(String).includes(String(row.categoriaId))) return false;
                                        if (row.subcategoriaId && !r.subcategorias?.map(String).includes(String(row.subcategoriaId))) return false;
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

                                            {/* Fila 2: Costo | Cantidad | Disponibilidad | (Venta) | Grupo | Observación | Imagen | Trash */}
                                            <div className={`fct-ref-row2${row.disponibilidad === 'venta' ? ' fct-ref-row2-venta' : ''}`}>
                                                <div className="fct-field fct-field-costo">
                                                    <label>Costo Unitario</label>
                                                    <div className="fct-prefix-wrap">
                                                        <span className="fct-prefix">$</span>
                                                        <input required type="text" placeholder="0"
                                                            className="fct-prefix-input"
                                                            value={row.costoDisplay} onChange={e => handleRefRow(index, 'costoDisplay', e.target.value)} />
                                                    </div>
                                                </div>
                                                <div className="fct-field fct-field-cantidad">
                                                    <label>Cantidad</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="200"
                                                        className="fct-cantidad-input"
                                                        value={row.cantidad}
                                                        onChange={e => handleRefRow(index, 'cantidad', Math.max(1, parseInt(e.target.value) || 1))}
                                                    />
                                                    {(parseInt(row.costo) > 0 && parseInt(row.cantidad) > 1) && (
                                                        <span className="fct-subtotal-hint">
                                                            = {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format((parseInt(row.costo) || 0) * (parseInt(row.cantidad) || 1))}
                                                        </span>
                                                    )}
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
                                                <div className="fct-field fct-field-grupo">
                                                    <label>
                                                        Grupo
                                                        <span className="fct-grupo-optional"> (opcional)</span>
                                                    </label>
                                                    <select
                                                        value={row.grupoLocalId}
                                                        onChange={e => handleRefRow(index, 'grupoLocalId', e.target.value)}
                                                        className={`fct-grupo-row-select${row.grupoLocalId ? ' fct-grupo-row-select--active' : ''}`}
                                                    >
                                                        <option value="">Individual</option>
                                                        {/* Grupos existentes activos del backend */}
                                                        {gruposActivos.length > 0 && (
                                                            <optgroup label="── Grupos existentes ──">
                                                                {gruposActivos.map(g => (
                                                                    <option key={`existing-${g.id}`} value={String(g.id)}>
                                                                        G{String(g.id).padStart(3, '0')} — {g.nombre}
                                                                    </option>
                                                                ))}
                                                            </optgroup>
                                                        )}
                                                        {/* Grupos nuevos creados en esta factura */}
                                                        {form.grupoInstances.length > 0 && (
                                                            <optgroup label="── Nuevos en esta factura ──">
                                                                {form.grupoInstances.map(gi => (
                                                                    <option key={gi.localId} value={gi.localId}>{gi.nombre}</option>
                                                                ))}
                                                            </optgroup>
                                                        )}
                                                    </select>
                                                </div>
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
                                </div>
                            </div>

                            <div className="fct-footer">
                                <button type="button" className="fact-btn-secondary" onClick={resetModal} disabled={isCreating}>Cancelar</button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto', marginRight: '1rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Total Productos:</span>
                                    <span className={`total-costos-label ${totalCostos === valorFactura && valorFactura > 0 ? 'total-match' : totalCostos > 0 ? 'total-mismatch' : ''}`}>
                                        {formatCOPInt(totalCostos)}
                                    </span>
                                </div>
                                <button type="submit" className="fact-btn-primary" disabled={isCreating}>
                                    {isCreating ? 'Guardando...' : 'Registrar Factura'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Toast Notification */}
            <div className={`fct-toast fct-toast--${toast.type}${toast.visible ? ' fct-toast--visible' : ''}`}>
                {toast.type === 'success'
                    ? <FaCheckCircle className="fct-toast-icon" />
                    : <FaExclamationCircle className="fct-toast-icon" />
                }
                <span className="fct-toast-msg">{toast.message}</span>
                <button className="fct-toast-close" onClick={() => setToast(t => ({ ...t, visible: false }))}>
                    <FaTimes />
                </button>
            </div>
        </div>
    );
}

export default FacturasProveedorPage;
