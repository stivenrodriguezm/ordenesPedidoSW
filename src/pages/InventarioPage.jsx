import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import API from '../services/api';
import { formatCOP } from '../utils/formatCOP';
import { exportToCSV } from '../utils/exportToCSV';
import {
    FaSearch, FaFileExport, FaTimes, FaPlus, FaImage, FaCamera, FaUpload,
    FaLayerGroup, FaEdit, FaSave, FaChevronDown, FaChevronUp,
    FaSort, FaSortUp, FaSortDown, FaTable, FaList, FaDollarSign, FaFilter, FaQrcode, FaExchangeAlt, FaCheckCircle
} from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { AppContext, usePermissions } from '../AppContext';
import './InventarioPage.css';

const CATEGORY_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899',
];

function getCatColor(catId) {
    return CATEGORY_COLORS[(catId - 1) % CATEGORY_COLORS.length] || '#94a3b8';
}

const DISPONIBILIDAD_LABELS = {
    exhibicion: 'Exhibición',
    cliente: 'Cliente',
    por_despachar: 'Por Despachar',
    despachado: 'Despachado',
    entregado: 'Entregado',
    por_reparar: 'Por Reparar',
    consignacion: 'Consignación',
    no_venta: 'No a la venta',
};

const DISPONIBILIDAD_OPTIONS = [
    { key: 'exhibicion',    label: 'Exhibición' },
    { key: 'cliente',       label: 'Cliente' },
    { key: 'por_despachar', label: 'Por Despachar' },
    { key: 'despachado',    label: 'Despachado' },
    { key: 'entregado',     label: 'Entregado' },
    { key: 'por_reparar',   label: 'Por Reparar' },
    { key: 'consignacion',  label: 'Consignación' },
    { key: 'no_venta',      label: 'No a la venta' },
];

// ── Obs tooltip ──────────────────────────────────────────────────────────────
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
                <span className="obs-tooltip-popup" style={{ left: pos.x + 14, top: pos.y - 10 }}>
                    {text}
                </span>
            )}
        </span>
    );
}

// ── Lightbox ─────────────────────────────────────────────────────────────────
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

// ── Sort indicator (defined outside to avoid remount issues) ──────────────────
function SortIndicator({ sortConfig, colKey }) {
    if (sortConfig.key !== colKey) return <FaSort className="sort-icon sort-icon--idle" />;
    return sortConfig.dir === 'asc'
        ? <FaSortUp className="sort-icon sort-icon--active" />
        : <FaSortDown className="sort-icon sort-icon--active" />;
}

// ── Kanban Board removed ──────────────────────────────────────────────────────

// ── Modal Form Helpers ────────────────────────────────────────────────────────
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
    visible: true,
    telas_cueros: [],  // [{ tipo, referencia, color, costo_unidad, cantidad }]
});

const emptyForm = () => ({
    proveedorId: '',
    productos: [emptyRef()],
    grupoInstances: [],  // { localId, nombre, categoriaId, subcategoriaId, observacion }
});

let _grupoCounter = 0;
const newGrupoLocalId = () => `g_${++_grupoCounter}_${Date.now()}`;
const isExistingGrupoId = (localId) => localId && !String(localId).startsWith('g_') && !isNaN(parseInt(localId));

// ═════════════════════════════════════════════════════════════════════════════
function InventarioPage() {
    const { proveedores } = useContext(AppContext);
    const hasPermission = usePermissions();

    // ── Data ──────────────────────────────────────────────────────────────────
    const [inventario, setInventario]           = useState([]);
    const [categorias, setCategorias]           = useState([]);
    const [subcategorias, setSubcategorias]     = useState([]);
    const [productos, setProductos]             = useState([]);
    const [ordenesPendientes, setOrdenesPendientes] = useState([]);
    const [grupos, setGrupos]                   = useState([]);
    const [zonas, setZonas]                     = useState([]);
    const [isLoading, setIsLoading]             = useState(true);

    // ── Filters ───────────────────────────────────────────────────────────────
    const [filterProveedor, setFilterProveedor]         = useState('');
    const [filterSearch, setFilterSearch]               = useState('');
    const [filterCategoria, setFilterCategoria]         = useState('');
    const [filterSubcategoria, setFilterSubcategoria]   = useState('');
    const [filterDisponibilidad, setFilterDisponibilidad] = useState('');
    const [filterSede, setFilterSede]                   = useState('');
    const [filterZona, setFilterZona]                   = useState('');
    const [filterEstadoFisico, setFilterEstadoFisico]   = useState('');
    const [filterFechaInicio, setFilterFechaInicio]     = useState('');
    const [filterFechaFin, setFilterFechaFin]           = useState('');
    const [showFiltersMenu, setShowFiltersMenu]         = useState(false);

    // ── View / Display ────────────────────────────────────────────────────────
    const [viewMode, setViewMode]       = useState('default'); // default | groups_only | products_only
    const [showCostoCol, setShowCostoCol] = useState(false);  // A

    // ── Sort (E) ──────────────────────────────────────────────────────────────
    const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' });

    // ── Inline disp edit (C) ──────────────────────────────────────────────────
    const [inlineEditItem, setInlineEditItem] = useState(null); // dbId
    const [inlineEditVenta, setInlineEditVenta] = useState(null); // dbId

    // ── Modal / Form ──────────────────────────────────────────────────────────
    const [showModal, setShowModal]       = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [previewImg, setPreviewImg]     = useState({ open: false, url: '' });
    const [form, setForm] = useState(emptyForm());
    const [newGrupoName, setNewGrupoName] = useState('');
    const [newGrupoCategoria, setNewGrupoCategoria] = useState('');
    const [newGrupoSubcategoria, setNewGrupoSubcategoria] = useState('');
    const [newGrupoObservacion, setNewGrupoObservacion] = useState('');

    // ── Group expand/edit ─────────────────────────────────────────────────────
    const [expandedGroups, setExpandedGroups]   = useState({});
    const [grupoEditModal, setGrupoEditModal]   = useState(null);
    const [grupoEditSaving, setGrupoEditSaving] = useState(false);

    // ── Nuevo Grupo Modal ─────────────────────────────────────────────────────
    const [nuevoGrupoModal, setNuevoGrupoModal] = useState({ open: false, nombre: '', categoriaId: '', subcategoriaId: '', descripcion: '', observacion: '', ventaId: '' });
    const [nuevoGrupoSaving, setNuevoGrupoSaving] = useState(false);

    // ── Edit Item Modal ───────────────────────────────────────────────────────
    const [itemEditModal, setItemEditModal] = useState({ open: false, item: null, form: null, saving: false });
    const [costosList, setCostosList] = useState([]);      // costos adicionales del ítem en edición
    const [newCosto, setNewCosto] = useState({ descripcion: '', valor: '' }); // form inline
    const [costosLoading, setCostosLoading] = useState(false);

    // ── QR & Traslado Modals ──────────────────────────────────────────────────
    const [qrModal, setQrModal] = useState({ open: false, item: null });
    const [trasladoModal, setTrasladoModal] = useState({ open: false, item: null, zonaId: '', observacion: '', saving: false });

    // ── Toast Notification ────────────────────────────────────────────────────
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const toastTimerRef = useRef(null);

    const showToast = useCallback((message, type = 'success') => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ visible: true, message, type });
        toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 4000);
    }, []);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [invRes, catRes, subcatRes, prodRes, ordRes, grupoRes, zonasRes] = await Promise.all([
                    API.get('/suministros/inventario/'),
                    API.get('/suministros/categorias/'),
                    API.get('/suministros/subcategorias/'),
                    API.get('/referencias/'),
                    API.get('/get-pendientes-ids/'),
                    API.get('/suministros/grupos/'),
                    API.get('/suministros/zonas/')
                ]);
                setInventario(invRes.data.results || invRes.data);
                setCategorias(catRes.data.results || catRes.data);
                setSubcategorias(subcatRes.data.results || subcatRes.data);
                setProductos(prodRes.data.results || prodRes.data);
                setOrdenesPendientes(ordRes.data || []);
                setGrupos(grupoRes.data.results || grupoRes.data || []);
                setZonas(zonasRes.data.results || zonasRes.data || []);
            } catch (error) {
                console.error('Error fetching inventario data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const CATEGORIAS    = categorias;
    const SUBCATEGORIAS = subcategorias;
    const PRODUCTOS     = productos;
    const getCategoria  = (id) => categorias.find(c => c.id === id);

    // ── Modal helpers ─────────────────────────────────────────────────────────
    const openModal = () => { setShowModal(true); setTimeout(() => setModalVisible(true), 10); };
    const closeModal = () => {
        setModalVisible(false);
        setTimeout(() => {
            setShowModal(false);
            setForm(emptyForm());
            setNewGrupoName('');
            setNewGrupoCategoria('');
            setNewGrupoSubcategoria('');
            setNewGrupoObservacion('');
        }, 300);
    };

    const handleField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleTelaChange = (index, field, value) => {
        setForm(prev => {
            const prods = [...prev.productos];
            prods[index] = { ...prods[index], [field]: value };
            return { ...prev, productos: prods };
        });
    };

    const handleRefRow = (index, field, value) => {
        setForm(prev => {
            const prods = [...prev.productos];
            const currentProd = prods[index];
            let newGrupoInstances = [...prev.grupoInstances];

            if (field === 'costoDisplay') {
                const raw = value.replace(/[^0-9]/g, '');
                prods[index] = { ...currentProd, costo: raw, costoDisplay: raw ? formatCOP(parseInt(raw)) : '' };
            } else if (field === 'categoriaId') {
                if (currentProd.grupoLocalId) {
                    const newGroup = prev.grupoInstances.find(g => String(g.localId) === String(currentProd.grupoLocalId));
                    if (newGroup && String(newGroup.categoriaId) !== String(value)) {
                        showToast(`Este producto pertenece al grupo "${newGroup.nombre}" que exige la categoría seleccionada al crearlo.`, 'error');
                        return prev;
                    }
                }
                prods[index] = { ...currentProd, categoriaId: value, subcategoriaId: '' };
            } else if (field === 'grupoLocalId') {
                let newVentaId = currentProd.ventaId;
                if (value) {
                    const existGroup = grupos.find(g => String(g.id) === String(value));
                    const newGroup = prev.grupoInstances.find(g => String(g.localId) === String(value));
                    
                    if (existGroup) {
                        newVentaId = String(existGroup.venta || existGroup.venta_id || '');
                    } else if (newGroup) {
                        if (currentProd.categoriaId && String(newGroup.categoriaId) !== String(currentProd.categoriaId)) {
                            showToast(`El grupo "${newGroup.nombre}" es para otra categoría.`, 'error');
                            return prev;
                        }
                        if (newGroup.ventaId) {
                            newVentaId = newGroup.ventaId;
                        } else if (currentProd.ventaId) {
                            newGroup.ventaId = currentProd.ventaId;
                            newVentaId = currentProd.ventaId;
                            newGrupoInstances = newGrupoInstances.map(g => g.localId === newGroup.localId ? newGroup : g);
                        }
                    }
                }
                prods[index] = { ...currentProd, grupoLocalId: value, ventaId: newVentaId };
            } else if (field === 'ventaId') {
                if (currentProd.grupoLocalId) {
                    const newGroup = prev.grupoInstances.find(g => String(g.localId) === String(currentProd.grupoLocalId));
                    if (newGroup) {
                        newGroup.ventaId = value;
                        newGrupoInstances = newGrupoInstances.map(g => g.localId === newGroup.localId ? newGroup : g);
                        prods.forEach((p, i) => {
                            if (p.grupoLocalId === currentProd.grupoLocalId) {
                                prods[i] = { ...p, ventaId: value };
                            }
                        });
                    }
                }
                prods[index] = { ...prods[index], ventaId: value };
            } else {
                prods[index] = { ...currentProd, [field]: value };
            }

            return { ...prev, productos: prods, grupoInstances: newGrupoInstances };
        });
    };

    const handleAddRow = () => setForm(prev => ({ ...prev, productos: [...prev.productos, emptyRef()] }));
    const removeRefRow = (index) => setForm(prev => ({ ...prev, productos: prev.productos.filter((_, i) => i !== index) }));

    const handleAddGrupo = () => {
        if (!newGrupoName.trim()) {
            showToast('El nombre del grupo es requerido.', 'error');
            return;
        }
        setForm(prev => {
            const newG = {
                localId: newGrupoLocalId(),
                nombre: newGrupoName.trim(),
                categoriaId: newGrupoCategoria,
                subcategoriaId: newGrupoSubcategoria,
                observacion: newGrupoObservacion,
                ventaId: ''
            };
            return { ...prev, grupoInstances: [...prev.grupoInstances, newG] };
        });
        setNewGrupoName('');
        setNewGrupoCategoria('');
        setNewGrupoSubcategoria('');
        setNewGrupoObservacion('');
        showToast('Grupo creado localmente. Seleccionable en las referencias.', 'success');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const validProds = form.productos.filter(p => p.referenciaId && p.visible);
        if (validProds.length === 0) {
            showToast('Debes agregar al menos una referencia válida.', 'error');
            return;
        }

        try {
            // FASE 1: Crear Grupos Nuevos
            const mapGrupos = {}; // localId -> dbId
            for (const g of form.grupoInstances) {
                const res = await API.post('/suministros/grupos/', {
                    nombre: g.nombre,
                    categoria_id: g.categoriaId ? parseInt(g.categoriaId) : null,
                    subcategoria_id: g.subcategoriaId ? parseInt(g.subcategoriaId) : null,
                    observacion: g.observacion,
                    venta_id: g.ventaId ? parseInt(g.ventaId) : null
                });
                mapGrupos[g.localId] = res.data.id;
            }

            // FASE 2: Crear Items
            const promises = [];
            for (const item of validProds) {
                let finalGrupoId = null;
                if (item.grupoLocalId) {
                    if (isExistingGrupoId(item.grupoLocalId)) {
                        finalGrupoId = parseInt(item.grupoLocalId);
                    } else if (mapGrupos[item.grupoLocalId]) {
                        finalGrupoId = mapGrupos[item.grupoLocalId];
                    }
                }

                const cat = getCategoria(parseInt(item.categoriaId));
                const catPrefix = cat?.nombre ? cat.nombre.substring(0, 2).toUpperCase() : 'XX';
                const qty = parseInt(item.cantidad) || 1;
                const cost = parseInt(item.costo) || 0;

                for (let i = 0; i < qty; i++) {
                    promises.push(API.post('/suministros/inventario/', {
                        id_referencia: `${catPrefix}${Math.floor(1000 + Math.random() * 9000)}`,
                        referencia: parseInt(item.referenciaId),
                        categoria: item.categoriaId ? parseInt(item.categoriaId) : null,
                        subcategoria: item.subcategoriaId ? parseInt(item.subcategoriaId) : null,
                        variacion: item.variacion,
                        costo_especifico: cost,
                        observacion: item.observacion,
                        disponibilidad: item.disponibilidad,
                        estado_fisico: item.estado_fisico || 'buen_estado',
                        zona: item.zonaId ? parseInt(item.zonaId) : null,
                        venta: item.ventaId ? parseInt(item.ventaId) : null,
                        grupo: finalGrupoId,
                        proveedor: form.proveedorId ? parseInt(form.proveedorId) : null,
                        telas_cueros: (item.telas_cueros || []).map(tc => ({
                            tipo: tc.tipo || 'tela',
                            referencia: (tc.referencia || '').trim(),
                            color: (tc.color || '').trim(),
                            unidad_medida: tc.tipo === 'cuero' ? 'decimetro' : 'metro',
                            costo_unidad: parseFloat(tc.costo_unidad) || 0,
                            cantidad: parseFloat(tc.cantidad) || 0,
                        })),
                    }));
                }
            }

            await Promise.all(promises);
            
            const [invRes, gruRes] = await Promise.all([
                API.get('/suministros/inventario/'),
                API.get('/suministros/grupos/')
            ]);
            setInventario(invRes.data.results || invRes.data);
            setGrupos(gruRes.data.results || gruRes.data || []);
            
            showToast('Inventario creado exitosamente.', 'success');
            closeModal();
        } catch (error) {
            console.error('Error creating inventory:', error);
            showToast('Hubo un error al guardar la entrada de inventario.', 'error');
        }
    };

    // ── Sort handler (E) ──────────────────────────────────────────────────────
    const handleSort = (key) => {
        setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    };

    // ── Inline disp handler (C) ───────────────────────────────────────────────
    const handleInlineDisp = async (dbId, newDisp) => {
        try {
            await API.patch(`/suministros/inventario/${dbId}/`, { disponibilidad: newDisp });
            setInventario(prev => prev.map(i => i.id === dbId ? { ...i, disponibilidad: newDisp } : i));
            showToast('Disponibilidad actualizada.', 'success');
        } catch (e) {
            console.error('Error updating disponibilidad:', e);
            showToast('Error al actualizar disponibilidad.', 'error');
        }
        setInlineEditItem(null);
    };

    const handleInlineVenta = async (dbId, newVentaId) => {
        try {
            const val = newVentaId ? parseInt(newVentaId) : null;
            await API.patch(`/suministros/inventario/${dbId}/`, { venta: val });
            setInventario(prev => prev.map(i => i.id === dbId ? { ...i, venta: val, venta_numero: val } : i));
            showToast('Venta actualizada.', 'success');
        } catch (e) {
            console.error('Error updating venta:', e);
            showToast('Error al actualizar venta.', 'error');
        }
        setInlineEditVenta(null);
    };

    // ── Group handlers ────────────────────────────────────────────────────────
    const toggleGroup = (grupoId) => setExpandedGroups(prev => ({ ...prev, [grupoId]: !prev[grupoId] }));

    const openGrupoEdit = (grupo, grupoItems) => {
        setGrupoEditModal({ 
            grupo, 
            nombre: grupo.nombre, 
            disponibilidad: '', 
            estadoFisico: '',
            zonaId: '',
            categoriaId: grupo.categoria_id || '',
            subcategoriaId: grupo.subcategoria_id || '',
            descripcion: grupo.descripcion || '',
            observacion: grupo.observacion || '',
            ventaId: grupo.venta || grupo.venta_id || '',
            costo_total: grupo.costo_total || 0,
            items: [...grupoItems], 
            removedDbIds: [], 
            addedItems: [] 
        });
    };
    const closeGrupoEdit = () => setGrupoEditModal(null);

    const removeItemFromGrupoModal = (dbId) => {
        setGrupoEditModal(prev => ({
            ...prev,
            items: prev.items.filter(i => i.dbId !== dbId),
            removedDbIds: [...prev.removedDbIds, dbId],
        }));
    };

    const addItemToGrupoModal = (item) => {
        if (grupoEditModal.items.find(i => i.dbId === item.dbId)) return;
        
        const groupVentaId = grupoEditModal.ventaId || '';
        const itemVentaId = item.venta || item.ventaId || item.venta_id || '';
        if (String(groupVentaId) !== String(itemVentaId)) {
            showToast(`El ítem debe tener la misma venta que el grupo. (Venta del grupo: ${groupVentaId || 'Ninguna'}, Venta del ítem: ${itemVentaId || 'Ninguna'})`, 'error');
            return;
        }

        const groupCategoriaId = grupoEditModal.categoriaId || '';
        const itemCategoriaId = item.categoria || item.categoria_id || item.cat?.id || item.categoriaId || '';
        if (String(groupCategoriaId) !== String(itemCategoriaId)) {
            showToast(`El ítem debe tener la misma categoría que el grupo. (Categoría del grupo: ${groupCategoriaId || 'Ninguna'}, Categoría del ítem: ${itemCategoriaId || 'Ninguna'})`, 'error');
            return;
        }

        setGrupoEditModal(prev => ({ ...prev, items: [...prev.items, item], addedItems: [...prev.addedItems, item] }));
    };

    const saveNuevoGrupo = async () => {
        if (!nuevoGrupoModal.nombre.trim()) return;
        setNuevoGrupoSaving(true);
        try {
            const payload = {
                nombre: nuevoGrupoModal.nombre,
                categoria_id: nuevoGrupoModal.categoriaId ? parseInt(nuevoGrupoModal.categoriaId) : null,
                subcategoria_id: nuevoGrupoModal.subcategoriaId ? parseInt(nuevoGrupoModal.subcategoriaId) : null,
                descripcion: nuevoGrupoModal.descripcion || '',
                observacion: nuevoGrupoModal.observacion,
                venta_id: nuevoGrupoModal.ventaId || null,
            };
            const res = await API.post('/suministros/grupos/', payload);
            setGrupos(prev => [...prev, res.data]);
            showToast('Grupo creado correctamente.', 'success');
            setNuevoGrupoModal({ open: false, nombre: '', categoriaId: '', subcategoriaId: '', descripcion: '', observacion: '', ventaId: '' });
        } catch (err) {
            console.error('Error creando grupo:', err);
            showToast('Error al crear el grupo.', 'error');
        } finally {
            setNuevoGrupoSaving(false);
        }
    };

    const openItemEdit = (item) => {
        // Normalize telas_cueros: prefer array, fallback to legacy single-fabric fields
        let telasInit = [];
        if (Array.isArray(item.telas_cueros) && item.telas_cueros.length > 0) {
            telasInit = item.telas_cueros.map(tc => ({
                id: tc.id,
                tipo: tc.tipo || 'tela',
                referencia: tc.referencia || '',
                color: tc.color || '',
                unidad_medida: tc.unidad_medida || (tc.tipo === 'cuero' ? 'decimetro' : 'metro'),
                costo_unidad: tc.costo_unidad || '',
                cantidad: tc.cantidad || '',
            }));
        } else if (item.lleva_tela || item.tela_referencia) {
            telasInit = [{ tipo: 'tela', referencia: item.tela_referencia || '', color: item.tela_color || '', unidad_medida: 'metro', costo_unidad: item.tela_costo_metro || '', cantidad: item.tela_cantidad_metros || '' }];
        }

        setItemEditModal({
            open: true,
            item,
            saving: false,
            form: {
                variacion: item.variacion || '',
                costo: item.costo_especifico ? Math.floor(parseFloat(item.costo_especifico)) : '',
                observacion: item.observacion || '',
                disponibilidad: item.disponibilidad || 'exhibicion',
                estadoFisico: item.estado_fisico || 'buen_estado',
                zonaId: item.zona || '',
                categoriaId: item.categoria || '',
                subcategoriaId: item.subcategoria || '',
                ventaId: item.venta || '',
                grupoId: item.grupo || '',
                referenciaId: item.referencia_id || item.referencia?.id || item.referencia || '',
                fecha_ingreso: item.fecha_ingreso || '',
                factura_manual: item.factura_manual || '',
                imagen: item.imagen || '',
                telas_cueros: telasInit,
            }
        });
        // Load existing costos adicionales for this item
        setCostosList(item.costos_adicionales || []);
        setNewCosto({ descripcion: '', valor: '' });
        if (item.dbId) {
            setCostosLoading(true);
            API.get(`/suministros/costos-adicionales/?inventario=${item.dbId}`)
                .then(res => setCostosList(res.data.results || res.data || []))
                .catch(() => {})
                .finally(() => setCostosLoading(false));
        }
    };

    const closeItemEdit = () => {
        setItemEditModal({ open: false, item: null, form: null, saving: false });
        setCostosList([]);
        setNewCosto({ descripcion: '', valor: '' });
    };

    const handleAddCosto = async () => {
        if (!newCosto.descripcion.trim() || !newCosto.valor) return;
        const { item } = itemEditModal;
        try {
            const res = await API.post('/suministros/costos-adicionales/', {
                inventario: item.dbId,
                descripcion: newCosto.descripcion.trim(),
                valor: parseFloat(newCosto.valor)
            });
            setCostosList(prev => [...prev, res.data]);
            setNewCosto({ descripcion: '', valor: '' });
            // Update local inventory total
            setInventario(prev => prev.map(i =>
                i.id === item.dbId
                    ? { ...i, costos_adicionales: [...(i.costos_adicionales || []), res.data], costo_total: (parseFloat(i.costo_especifico || 0) + [...(i.costos_adicionales || []), res.data].reduce((s, c) => s + parseFloat(c.valor), 0)) }
                    : i
            ));
        } catch (err) {
            showToast('Error al agregar costo adicional.', 'error');
        }
    };

    const handleDeleteCosto = async (costoId) => {
        const { item } = itemEditModal;
        try {
            await API.delete(`/suministros/costos-adicionales/${costoId}/`);
            setCostosList(prev => prev.filter(c => c.id !== costoId));
            setInventario(prev => prev.map(i =>
                i.id === item.dbId
                    ? { ...i, costos_adicionales: (i.costos_adicionales || []).filter(c => c.id !== costoId) }
                    : i
            ));
        } catch (err) {
            showToast('Error al eliminar costo adicional.', 'error');
        }
    };

    const saveItemEdit = async (e) => {
        e.preventDefault();
        const { item, form } = itemEditModal;
        setItemEditModal(prev => ({ ...prev, saving: true }));
        try {
            let finalEstadoFisico = form.estadoFisico;
            if (finalEstadoFisico === 'nuevo' || !finalEstadoFisico) {
                finalEstadoFisico = 'buen_estado';
            }

            const payload = {
                variacion: form.variacion,
                costo_especifico: parseFloat(form.costo) || 0,
                observacion: form.observacion,
                disponibilidad: form.disponibilidad,
                estado_fisico: finalEstadoFisico,
                zona: form.zonaId ? parseInt(form.zonaId) : null,
                categoria: form.categoriaId ? parseInt(form.categoriaId) : null,
                subcategoria: form.subcategoriaId ? parseInt(form.subcategoriaId) : null,
                venta: form.ventaId ? parseInt(form.ventaId) : null,
                grupo: form.grupoId ? parseInt(form.grupoId) : null,
                referencia_id: form.referenciaId || null,
                fecha_ingreso: form.fecha_ingreso || null,
                factura_manual: form.factura_manual || '',
                imagen: form.imagen || '',
                telas_cueros: (form.telas_cueros || []).map(tc => ({
                    tipo: tc.tipo || 'tela',
                    referencia: (tc.referencia || '').trim(),
                    color: (tc.color || '').trim(),
                    unidad_medida: tc.tipo === 'cuero' ? 'decimetro' : 'metro',
                    costo_unidad: parseFloat(tc.costo_unidad) || 0,
                    cantidad: parseFloat(tc.cantidad) || 0,
                })),
            };

            if (payload.grupo) {
                const targetGroup = grupos.find(g => String(g.id) === String(payload.grupo));
                if (targetGroup) {
                    const groupVentaId = targetGroup.venta || targetGroup.venta_id || '';
                    if (String(payload.venta || '') !== String(groupVentaId)) {
                        showToast(`El ítem debe tener la misma venta que su grupo (Venta del grupo: ${groupVentaId || 'Ninguna'}).`, 'error');
                        setItemEditModal(prev => ({ ...prev, saving: false }));
                        return;
                    }
                    
                    const groupCategoriaId = targetGroup.categoria || targetGroup.categoria_id || '';
                    if (String(payload.categoria || '') !== String(groupCategoriaId)) {
                        showToast(`El ítem debe tener la misma categoría que su grupo (Categoría del grupo: ${groupCategoriaId || 'Ninguna'}).`, 'error');
                        setItemEditModal(prev => ({ ...prev, saving: false }));
                        return;
                    }

                }
            }

            await API.patch(`/suministros/inventario/${item.dbId}/`, payload);
            setInventario(prev => prev.map(i => i.id === item.dbId ? { ...i, ...payload } : i));
            
            if (item.grupo || payload.grupo) {
                try {
                    const [invRes, gruRes] = await Promise.all([API.get('/suministros/inventario/'), API.get('/suministros/grupos/')]);
                    setInventario(invRes.data.results || invRes.data);
                    setGrupos(gruRes.data.results || gruRes.data || []);
                } catch (e) { console.error('Error reloading groups', e); }
            }
            
            showToast('Ítem actualizado correctamente.', 'success');
            closeItemEdit();
        } catch (err) {
            console.error('Error updating item:', err);
            const backendMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
            showToast(`Error al actualizar: ${backendMsg}`, 'error');
            setItemEditModal(prev => ({ ...prev, saving: false }));
        }
    };

    const saveGrupoEdit = async () => {
        if (!grupoEditModal) return;
        setGrupoEditSaving(true);
        const { grupo, nombre, disponibilidad, estadoFisico, zonaId, categoriaId, subcategoriaId, descripcion, observacion, removedDbIds, addedItems, items: gItems, ventaId } = grupoEditModal;
        try {
            const payload = { 
                nombre,
                categoria_id: categoriaId ? parseInt(categoriaId) : null,
                subcategoria_id: subcategoriaId ? parseInt(subcategoriaId) : null,
                descripcion: descripcion || '',
                observacion,
                venta_id: ventaId || null,
            };
            await API.patch(`/suministros/grupos/${grupo.id}/`, payload);
            await Promise.all(removedDbIds.map(dbId => API.patch(`/suministros/inventario/${dbId}/`, { grupo: null })));
            await Promise.all(addedItems.map(item => API.patch(`/suministros/inventario/${item.dbId}/`, { grupo: grupo.id })));
            
            // Mass updates for items
            const itemPatchPayload = {};
            if (disponibilidad) itemPatchPayload.disponibilidad = disponibilidad;
            if (estadoFisico) itemPatchPayload.estado_fisico = estadoFisico;
            if (zonaId) itemPatchPayload.zona = parseInt(zonaId);
            
            const originalVentaId = grupo.venta || grupo.venta_id || '';
            const isDesynced = gItems.some(item => {
                const iVenta = (item.ventaId === '—') ? '' : item.ventaId;
                return String(iVenta) !== String(ventaId || '');
            });

            if (String(originalVentaId) !== String(ventaId) || isDesynced) {
                itemPatchPayload.venta = ventaId ? parseInt(ventaId) : null;
            }
            
            const originalCategoriaId = grupo.categoria || grupo.categoria_id || '';
            const isCategoriaDesynced = gItems.some(item => {
                const iCat = item.categoria || item.categoria_id || item.cat?.id || item.categoriaId || '';
                return String(iCat) !== String(categoriaId || '');
            });
            
            if (String(originalCategoriaId) !== String(categoriaId) || isCategoriaDesynced) {
                itemPatchPayload.categoria = categoriaId ? parseInt(categoriaId) : null;
            }

            if (Object.keys(itemPatchPayload).length > 0) {
                await Promise.all(gItems.map(item => API.patch(`/suministros/inventario/${item.dbId}/`, itemPatchPayload)));
            }
            
            const [invRes, gruRes] = await Promise.all([API.get('/suministros/inventario/'), API.get('/suministros/grupos/')]);
            setInventario(invRes.data.results || invRes.data);
            setGrupos(gruRes.data.results || gruRes.data || []);
            showToast('Grupo actualizado correctamente.', 'success');
            closeGrupoEdit();
        } catch (err) {
            console.error('Error guardando grupo:', err);
            const backendMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
            showToast(`Error al guardar grupo: ${backendMsg}`, 'error');
        } finally {
            setGrupoEditSaving(false);
        }
    };

    // ── Enriched items ────────────────────────────────────────────────────────
    const items = inventario.map(inv => {
        const tcArr = Array.isArray(inv.telas_cueros) ? inv.telas_cueros : [];
        let rawTela, rawColor;
        if (tcArr.length === 0) {
            rawTela = inv.tela_referencia || (inv.lleva_tela ? 'Sí' : '');
            rawColor = inv.tela_color || '';
        } else if (tcArr.length === 1) {
            const tc = tcArr[0];
            const unit = tc.unidad_medida === 'decimetro' ? 'dm' : 'm';
            const cantStr = tc.cantidad ? ` (${tc.cantidad}${unit})` : '';
            rawTela = `${tc.referencia || (tc.tipo === 'cuero' ? 'Cuero' : 'Tela')}${cantStr}`;
            rawColor = tc.color || '';
        } else {
            rawTela = 'Mixto';
            rawColor = 'Mixto';
        }
        return {
            ...inv,
            dbId: inv.id_referencia,
            id: inv.id_referencia,
            grupoId: inv.grupo || null,
            prod: {
                id: inv.referencia,
                nombre: inv.producto_nombre || (inv.referencia ? `Ref #${inv.referencia}` : ''),
                categoriaId: inv.categoria_id || inv.categoria,
                proveedorId: inv.proveedor_id,
            },
            cat:   { id: inv.categoria_id || inv.categoria, nombre: inv.categoria_nombre || '' },
            subcat: { id: inv.subcategoria, nombre: inv.subcategoria_nombre || '' },
            facturaManual: inv.factura_id_manual || inv.factura_manual || '—',
            proveedorNombre: inv.proveedor_nombre || '—',
            ventaId: inv.venta_numero || inv.venta || '—',
            fechaIngreso: inv.fecha_ingreso || null,
            productoId: inv.referencia,
            subcategoriaId: inv.subcategoria,
            telaNombre: rawTela || '—',
            telaColor: rawColor || '—',
        };
    });

    // ── Filter ────────────────────────────────────────────────────────────────
    const filtered = items.filter(item => {
        const grupoObj = item.grupoId ? grupos.find(g => g.id === item.grupoId) : null;

        if (filterProveedor && item.prod?.proveedorId !== parseInt(filterProveedor)) return false;
        
        if (filterCategoria) {
            const matchItem = String(item.prod?.categoriaId) === filterCategoria || String(item.cat?.id) === filterCategoria;
            const matchGroup = grupoObj && (String(grupoObj.categoria) === filterCategoria || String(grupoObj.categoria_id) === filterCategoria);
            if (!matchItem && !matchGroup) return false;
        }
        
        if (filterSubcategoria) {
            const matchItem = String(item.subcat?.id) === filterSubcategoria;
            const matchGroup = grupoObj && (String(grupoObj.subcategoria) === filterSubcategoria || String(grupoObj.subcategoria_id) === filterSubcategoria);
            if (!matchItem && !matchGroup) return false;
        }

        if (filterDisponibilidad && item.disponibilidad !== filterDisponibilidad) return false;
        
        if (filterSede) {
            const itemZonaObj = zonas.find(z => z.id === item.zona);
            if (!itemZonaObj || String(itemZonaObj.sede) !== filterSede) return false;
        }
        
        if (filterZona && String(item.zona) !== filterZona) return false;
        if (filterEstadoFisico && item.estado_fisico !== filterEstadoFisico) return false;
        if (filterFechaInicio && item.fechaIngreso && item.fechaIngreso < filterFechaInicio) return false;
        if (filterFechaFin && item.fechaIngreso && item.fechaIngreso > filterFechaFin) return false;
        
        if (filterSearch) {
            const q = filterSearch.toLowerCase();
            const matchItemSearch = (
                item.prod?.nombre?.toLowerCase().includes(q) ||
                item.cat?.nombre?.toLowerCase().includes(q) ||
                item.subcat?.nombre?.toLowerCase().includes(q) ||
                item.variacion?.toLowerCase().includes(q) ||
                String(item.id).includes(q) ||
                item.observacion?.toLowerCase().includes(q) ||
                item.facturaManual?.toLowerCase().includes(q)
            );
            const matchGroupSearch = grupoObj && (
                grupoObj.nombre?.toLowerCase().includes(q) ||
                String(grupoObj.id).includes(q) ||
                grupoObj.observacion?.toLowerCase().includes(q)
            );
            
            if (!matchItemSearch && !matchGroupSearch) return false;
        }
        return true;
    });

    // ── Sort (E) ──────────────────────────────────────────────────────────────
    const getSorted = (list) => {
        if (!sortConfig.key) return list;
        return [...list].sort((a, b) => {
            let av, bv;
            switch (sortConfig.key) {
                case 'prod':           av = a.prod?.nombre || '';      bv = b.prod?.nombre || '';      break;
                case 'cat':            av = a.cat?.nombre || '';       bv = b.cat?.nombre || '';       break;
                case 'disponibilidad': av = a.disponibilidad || '';    bv = b.disponibilidad || '';    break;
                case 'fechaIngreso':   av = a.fechaIngreso || '';      bv = b.fechaIngreso || '';      break;
                case 'proveedorNombre':av = a.proveedorNombre || '';   bv = b.proveedorNombre || '';   break;
                case 'costo_especifico':
                    av = parseFloat(a.costo_especifico) || 0;
                    bv = parseFloat(b.costo_especifico) || 0;
                    return sortConfig.dir === 'asc' ? av - bv : bv - av;
                case 'id': av = String(a.id || ''); bv = String(b.id || ''); break;
                case 'facturaManual': av = String(a.facturaManual || ''); bv = String(b.facturaManual || ''); break;
                case 'ventaId': av = String(a.ventaId || ''); bv = String(b.ventaId || ''); break;
                case 'variacion': av = String(a.variacion || ''); bv = String(b.variacion || ''); break;
                case 'observacion': av = String(a.observacion || ''); bv = String(b.observacion || ''); break;
                case 'subcat': av = a.subcat?.nombre || ''; bv = b.subcat?.nombre || ''; break;
                case 'telaNombre': av = a.telaNombre || ''; bv = b.telaNombre || ''; break;
                case 'telaColor': av = a.telaColor || ''; bv = b.telaColor || ''; break;
                default: av = String(a[sortConfig.key] || ''); bv = String(b[sortConfig.key] || '');
            }
            const cmp = av.localeCompare(bv, 'es');
            return sortConfig.dir === 'asc' ? cmp : -cmp;
        });
    };

    // ── Summary stats (B) ─────────────────────────────────────────────────────
    const stats = {
        total:      items.length,
        venta:      items.filter(i => i.disponibilidad === 'venta').length,
        exhibicion: items.filter(i => i.disponibilidad === 'exhibicion').length,
        grupos:     grupos.length,
        conGrupo:   items.filter(i => i.grupoId).length,
        sinGrupo:   items.filter(i => !i.grupoId).length,
    };

    // ── Dropdown helpers ──────────────────────────────────────────────────────
    const subcatsDropdown = filterCategoria
        ? SUBCATEGORIAS.filter(s => String(s.categoria) === filterCategoria)
        : SUBCATEGORIAS;

    const formSubcats  = form.categoriaId ? SUBCATEGORIAS.filter(s => s.categoria === parseInt(form.categoriaId)) : [];
    const formProducts = form.proveedorId ? PRODUCTOS.filter(p => p.proveedor === parseInt(form.proveedorId)) : [];

    const sedes = Array.from(new Set(zonas.map(z => JSON.stringify({ id: z.sede, nombre: z.sede_nombre })))).map(s => JSON.parse(s));

    const hasFilters = filterProveedor || filterSearch || filterCategoria || filterSubcategoria || filterDisponibilidad || filterSede || filterZona || filterEstadoFisico || filterFechaInicio || filterFechaFin;
    const clearFilters = () => {
        setFilterProveedor(''); setFilterSearch(''); setFilterCategoria('');
        setFilterSubcategoria(''); setFilterDisponibilidad(''); 
        setFilterSede(''); setFilterZona(''); setFilterEstadoFisico('');
        setFilterFechaInicio(''); setFilterFechaFin('');
    };

    const handleExport = () => {
        exportToCSV('Inventario_Lottus.csv', filtered.map(item => ({
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
            'Costo': item.costo_especifico || '',
            'Observación': item.observacion || '',
        })));
    };

    // ── Inline disponibilidad badge (C) ───────────────────────────────────────
    const renderDispBadge = (inv) => {
        if (inlineEditItem === inv.dbId) {
            return (
                <select
                    className="inv-inline-disp-select"
                    defaultValue={inv.disponibilidad}
                    autoFocus
                    onChange={e => handleInlineDisp(inv.dbId, e.target.value)}
                    onBlur={() => setInlineEditItem(null)}
                    onClick={e => e.stopPropagation()}
                >
                    {DISPONIBILIDAD_OPTIONS.map(({ key, label }) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            );
        }
        return (
            <span
                className={`disp-badge disp-${inv.disponibilidad} inv-disp-clickable`}
                onClick={e => { e.stopPropagation(); setInlineEditItem(inv.dbId); }}
                title="Click para cambiar disponibilidad"
            >
                {DISPONIBILIDAD_LABELS[inv.disponibilidad] || '—'}
            </span>
        );
    };

    // ── Sortable th helper ────────────────────────────────────────────────────
    const sortTh = (colKey, label, className = '') => (
        <th className={`sortable-th ${className}`} style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(colKey)}>
            <span className="th-sort-wrap">{label} <SortIndicator sortConfig={sortConfig} colKey={colKey} /></span>
        </th>
    );

    // ── Common row renderer ───────────────────────────────────────────────────
    const renderItemRow = (inv, key, extraClass = '', showGroupCol = false) => {
        const color = inv.prod ? getCatColor(inv.prod.categoriaId) : '#94a3b8';
        const grupoObj = inv.grupoId ? grupos.find(g => g.id === inv.grupoId) : null;
        return (
            <tr key={key} className={extraClass}>
                <td><span className="inv-id-badge">{inv.id}</span></td>
                <td className="inv-proveedor-col" title={inv.proveedorNombre}>{inv.proveedorNombre}</td>
                <td className="inv-factura-col" title={inv.facturaManual}>{inv.facturaManual}</td>
                <td className="inv-numeric" title={inv.ventaId} onClick={() => {
                    if (inv.grupoId) {
                        showToast('Este ítem pertenece a un grupo. Para cambiar su venta, edita el grupo directamente o retira el ítem del grupo.', 'error');
                        return;
                    }
                    if (inv.disponibilidad === 'cliente' || inv.disponibilidad === 'por_despachar') {
                        setInlineEditVenta(inv.dbId);
                    }
                }} style={{ cursor: inv.grupoId ? 'not-allowed' : (inv.disponibilidad === 'cliente' || inv.disponibilidad === 'por_despachar') ? 'pointer' : 'default' }}>
                    {inlineEditVenta === inv.dbId ? (
                        <select
                            autoFocus
                            defaultValue={inv.ventaId === '—' ? '' : inv.ventaId}
                            onChange={(e) => handleInlineVenta(inv.dbId, e.target.value)}
                            onBlur={() => setInlineEditVenta(null)}
                            onClick={e => e.stopPropagation()}
                            style={{ width: '100px', fontSize: '0.8rem', padding: '2px' }}
                        >
                            <option value="">Sin asignar</option>
                            {ordenesPendientes.map(id => <option key={id} value={id}>{id}</option>)}
                        </select>
                    ) : (
                        inv.ventaId
                    )}
                </td>
                <td title={inv.disponibilidad}>{renderDispBadge(inv)}</td>
                <td title={inv.fechaIngreso}>{inv.fechaIngreso ? inv.fechaIngreso.split('-').reverse().join('/') : '—'}</td>
                <td title={inv.prod?.nombre || ''}><span className="inv-prod-name">{inv.prod?.nombre || '—'}</span></td>
                {showGroupCol && (
                    <td>
                        {grupoObj ? (
                            <div className="inv-grupo-col-cell" title={grupoObj.nombre}>
                                <span className="inv-group-id-badge" style={{ fontSize: '0.65rem' }}>
                                    G{String(grupoObj.id).padStart(3, '0')}
                                </span>
                                <span className="inv-grupo-col-name">{grupoObj.nombre}</span>
                            </div>
                        ) : (
                            <span className="empty-val">—</span>
                        )}
                    </td>
                )}
                <td title={inv.cat?.nombre || ''}>
                    {inv.cat?.nombre && (
                        <span className="cat-badge cat-badge--standalone" style={{ '--cat-color': color }}>
                            {inv.cat.nombre}
                        </span>
                    )}
                </td>
                <td title={inv.subcat?.nombre || ''}>{inv.subcat?.nombre || <span className="empty-val">—</span>}</td>
                <td title={inv.telaNombre || ''}><span className="inv-tela-cell">{inv.telaNombre}</span></td>
                <td title={inv.telaColor || ''}><span className="inv-color-cell">{inv.telaColor}</span></td>
                <td title={inv.variacion || ''}>{inv.variacion || <span className="empty-val">—</span>}</td>
                <td title={inv.estado_fisico ? inv.estado_fisico.replace(/_/g, ' ') : ''} style={{textTransform: 'capitalize'}}>{inv.estado_fisico ? inv.estado_fisico.replace(/_/g, ' ') : <span className="empty-val">—</span>}</td>
                <td title={inv.sede_nombre || ''}>{inv.sede_nombre || <span className="empty-val">—</span>}</td>
                <td title={inv.zona_nombre || ''}>{inv.zona_nombre || <span className="empty-val">—</span>}</td>
                <td className="obs-cell-col"><ObsCell text={inv.observacion} /></td>
                {hasPermission('VER_COSTOS_INVENTARIO') && showCostoCol && (
                    <td className="inv-costo-col">
                        {inv.costo_especifico > 0 ? formatCOP(inv.costo_especifico) : <span className="empty-val">—</span>}
                    </td>
                )}
                {viewMode !== 'products_only' && (
                    <td style={{ textAlign: 'center' }}>
                        <div className="inv-group-actions" style={{ justifyContent: 'center' }}>
                            {hasPermission('EDITAR_ITEM_INVENTARIO') && (
                                <button className="inv-group-edit-btn" title="Editar ítem"
                                    onClick={(e) => { e.stopPropagation(); openItemEdit(inv); }}>
                                    <FaEdit />
                                </button>
                            )}
                            <button className="inv-group-edit-btn" title="Código QR"
                                onClick={e => { e.stopPropagation(); setQrModal({ open: true, item: inv }); }}>
                                <FaQrcode />
                            </button>
                            <button className="inv-group-edit-btn" title="Trasladar"
                                onClick={e => { e.stopPropagation(); setTrasladoModal({ open: true, item: inv, zonaId: '', observacion: '', saving: false }); }}>
                                <FaExchangeAlt />
                            </button>
                            {inv.imagen && (
                                <button className="btn-view-img" title="Ver imagen"
                                    onClick={(e) => { e.stopPropagation(); setPreviewImg({ open: true, url: inv.imagen }) }}>
                                    <FaImage />
                                </button>
                            )}
                        </div>
                    </td>
                )}
            </tr>
        );
    };

    // ── Table body content ────────────────────────────────────────────────────
    const colSpan = (hasPermission('VER_COSTOS_INVENTARIO') && showCostoCol) ? 18 : 17;

    const renderTableBody = () => {
        if (isLoading) {
            return Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`} className="skeleton-row">
                    <td><div className="skeleton skeleton-text" style={{ width: '30px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '90px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '70px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                    <td><div className="skeleton skeleton-badge"></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '70px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                    {viewMode === 'products_only' && <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>}
                    <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '50px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '70px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '70px' }}></div></td>
                    <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                    {hasPermission('VER_COSTOS_INVENTARIO') && showCostoCol && <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>}
                    <td style={{ textAlign: 'center' }}><div className="skeleton skeleton-text" style={{ width: '20px', margin: '0 auto' }}></div></td>
                </tr>
            ));
        }
        if (filtered.length === 0) {
            return <tr><td colSpan={colSpan} style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '2rem' }}>No se encontraron ítems con ese criterio.</td></tr>;
        }

        // ── PRODUCTS ONLY — flat list, all items with dedicated group column ──
        if (viewMode === 'products_only') {
            return getSorted(filtered).map(inv => renderItemRow(inv, inv.dbId, '', true));
        }

        // ── GROUPS + DEFAULT ── groups collapsed/expanded + optional ungrouped
        const groupedById = {};
        const ungrouped   = [];
        filtered.forEach(inv => {
            if (inv.grupoId) {
                if (!groupedById[inv.grupoId]) groupedById[inv.grupoId] = [];
                groupedById[inv.grupoId].push(inv);
            } else {
                ungrouped.push(inv);
            }
        });

        const rows = [];

        Object.entries(groupedById).forEach(([gIdStr, gItems]) => {
            const grupoId   = parseInt(gIdStr);
            const grupoObj  = grupos.find(g => g.id === grupoId) || { id: grupoId, nombre: `Grupo ${gIdStr}` };
            const isExpanded = expandedGroups[grupoId];
            const first     = gItems[0];
            const color     = first.prod ? getCatColor(first.prod.categoriaId) : '#94a3b8';
            const dispSet   = new Set(gItems.map(i => i.disponibilidad));
            const dispUni   = dispSet.size === 1 ? [...dispSet][0] : null;
            const nonBuenEstado = gItems.find(i => i.estado_fisico && i.estado_fisico !== 'buen_estado');
            const grupoEstadoFisico = nonBuenEstado ? nonBuenEstado.estado_fisico : 'buen_estado';

            const uProveedor = [...new Set(gItems.map(i => i.proveedorNombre))];
            const gProveedor = uProveedor.length === 1 && uProveedor[0] ? uProveedor[0] : null;

            const uFactura = [...new Set(gItems.map(i => i.facturaManual))];
            const gFactura = uFactura.length === 1 && uFactura[0] ? uFactura[0] : null;

            const uFecha = [...new Set(gItems.map(i => i.fechaIngreso))];
            const gFecha = uFecha.length === 1 && uFecha[0] ? uFecha[0].split('-').reverse().join('/') : null;

            const uSede = [...new Set(gItems.map(i => i.sede_nombre))];
            const gSede = uSede.length === 1 && uSede[0] ? uSede[0] : null;

            const uZona = [...new Set(gItems.map(i => i.zona_nombre))];
            const gZona = uZona.length === 1 && uZona[0] ? uZona[0] : null;

            rows.push(
                <tr key={`grupo-${grupoId}`} className="inv-group-header-row" onClick={() => toggleGroup(grupoId)}>
                    <td><span className="inv-group-id-badge">G{String(grupoId).padStart(3, '0')}</span></td>
                    <td className="inv-proveedor-col" title={gProveedor || ''}>{gProveedor || <span className="empty-val">—</span>}</td>
                    <td className="inv-factura-col" title={gFactura || ''}>{gFactura || <span className="empty-val">—</span>}</td>
                    <td className="inv-numeric" title={grupoObj.venta_id}>{grupoObj.venta_id || <span className="empty-val">—</span>}</td>
                    <td>
                        {dispUni
                            ? <span className={`disp-badge disp-${dispUni}`}>{DISPONIBILIDAD_LABELS[dispUni]}</span>
                            : <span className="disp-badge inv-disp-mixto">Mixto</span>}
                    </td>
                    <td title={gFecha || ''}>{gFecha || <span className="empty-val">—</span>}</td>
                    <td title={grupoObj.nombre}>
                        <div className="prod-name-cell">
                            <span className="inv-group-nombre-small">{grupoObj.nombre}</span>
                        </div>
                    </td>
                    <td>
                        {grupoObj.categoria_nombre && (
                            <span className="cat-badge cat-badge--standalone" style={{ '--cat-color': getCatColor(grupoObj.categoria_id) || '#94a3b8' }}>
                                {grupoObj.categoria_nombre}
                            </span>
                        )}
                    </td>
                    <td title={grupoObj.subcategoria_nombre || ''}>{grupoObj.subcategoria_nombre || <span className="empty-val">—</span>}</td>
                    <td><span className="empty-val">—</span></td>
                    <td><span className="empty-val">—</span></td>
                    <td>
                        <span className="inv-group-count-pill" style={{ marginLeft: 0 }}>{gItems.length} ítem{gItems.length !== 1 ? 's' : ''}</span>
                    </td>
                    <td title={grupoEstadoFisico} style={{textTransform: 'capitalize'}}>{grupoEstadoFisico.replace(/_/g, ' ')}</td>
                    <td title={gSede || ''}>{gSede || <span className="empty-val">—</span>}</td>
                    <td title={gZona || ''}>{gZona || <span className="empty-val">—</span>}</td>
                    <td className="inv-obs-col" title={grupoObj.observacion || ''}>{grupoObj.observacion || <span className="empty-val">—</span>}</td>
                    {hasPermission('VER_COSTOS_INVENTARIO') && showCostoCol && (
                        <td className="inv-costo-col" style={{ fontWeight: 700, color: '#1e293b' }}>
                            {formatCOP(parseFloat(grupoObj.costo_total) || 0)}
                        </td>
                    )}
                    <td style={{ textAlign: 'center' }}>
                        <div className="inv-group-actions">
                            {hasPermission('EDITAR_ITEM_INVENTARIO') && (
                                <button className="inv-group-edit-btn" title="Editar grupo"
                                    onClick={e => { e.stopPropagation(); openGrupoEdit(grupoObj, gItems); }}>
                                    <FaEdit />
                                </button>
                            )}
                            <button className={`inv-group-toggle ${isExpanded ? 'active' : ''}`}
                                onClick={e => { e.stopPropagation(); toggleGroup(grupoId); }}>
                                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                            </button>
                        </div>
                    </td>
                </tr>
            );

            if (isExpanded) {
                gItems.forEach((inv, i) =>
                    rows.push(renderItemRow(inv, `g${grupoId}-item-${i}`, 'inv-group-child-row'))
                );
            }
        });

        if (viewMode === 'default') {
            ungrouped.forEach(inv => rows.push(renderItemRow(inv, inv.dbId)));
        }

        if (viewMode === 'groups_only' && rows.length === 0) {
            return <tr><td colSpan={colSpan} style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '2rem' }}>No hay grupos con los filtros actuales.</td></tr>;
        }

        return rows;
    };

    // ── QR & Traslado Handlers ────────────────────────────────────────────────
    const handlePrintQR = () => {
        const svg = document.getElementById('qr-code-svg');
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const windowPrint = window.open('', '', 'width=400,height=400');
        windowPrint.document.write(`
            <html>
                <head><title>Imprimir QR</title></head>
                <body style="display:flex; justify-content:center; align-items:center; height:100vh; margin:0; font-family: sans-serif;">
                    <div style="text-align:center;">
                        ${svgData}
                        <p style="margin-top: 10px; font-weight: bold; font-size: 14px;">ID: ${qrModal.item?.id}</p>
                        <p style="font-size: 12px; color: #555;">${qrModal.item?.prod?.nombre || ''}</p>
                    </div>
                    <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
                </body>
            </html>
        `);
        windowPrint.document.close();
    };

    const handleTrasladoSubmit = async (e) => {
        e.preventDefault();
        if (!trasladoModal.zonaId) return showToast('Seleccione una zona destino', 'error');
        setTrasladoModal(prev => ({ ...prev, saving: true }));
        try {
            await API.post(`/suministros/inventario/${trasladoModal.item.dbId}/trasladar/`, {
                zona_destino: parseInt(trasladoModal.zonaId),
                observacion: trasladoModal.observacion
            });
            const invRes = await API.get('/suministros/inventario/');
            setInventario(invRes.data.results || invRes.data);
            setTrasladoModal({ open: false, item: null, zonaId: '', observacion: '', saving: false });
            showToast('Traslado realizado exitosamente', 'success');
        } catch (err) {
            console.error('Error al trasladar:', err);
            showToast('Error al realizar el traslado', 'error');
            setTrasladoModal(prev => ({ ...prev, saving: false }));
        }
    };

    // ════════════════════════════════════════════════════════════════════════
    return (
        <div className="page-container">

            {/* ── HEADER ──────────────────────────────────────────────────── */}
            <div className="v-glass-header inv-header-wrap">
                <div className="inv-filters-wrapper">
                    <div className="v-search-pill" style={{ flex: 1, maxWidth: '400px' }}>
                        <FaSearch />
                        <input type="text" placeholder="Buscar por referencia, nombre, ID..."
                            value={filterSearch} onChange={e => setFilterSearch(e.target.value)} />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <button className={`v-btn-ghost ${showFiltersMenu ? 'active' : ''}`} onClick={() => setShowFiltersMenu(!showFiltersMenu)} style={{ position: 'relative', paddingRight: (hasFilters && !filterSearch) ? '1.5rem' : '' }}>
                            <FaFilter /> Filtros
                            {(hasFilters && !filterSearch) && (
                                <span style={{ position: 'absolute', top: '25%', right: '8px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)' }}></span>
                            )}
                        </button>
                        {showFiltersMenu && (
                            <div className="inv-filters-dropdown">
                                <div className="inv-filters-grid">
                                    <div className="inv-filter-group">
                                        <label>Proveedor</label>
                                        <select value={filterProveedor} onChange={e => setFilterProveedor(e.target.value)}>
                                            <option value="">Todos</option>
                                            {(proveedores || []).map(p => <option key={p.id} value={p.id}>{p.nombre_empresa}</option>)}
                                        </select>
                                    </div>
                                    <div className="inv-filter-group">
                                        <label>Categoría</label>
                                        <select value={filterCategoria} onChange={e => { setFilterCategoria(e.target.value); setFilterSubcategoria(''); }}>
                                            <option value="">Todas</option>
                                            {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div className="inv-filter-group">
                                        <label>Subcategoría</label>
                                        <select value={filterSubcategoria} onChange={e => setFilterSubcategoria(e.target.value)}>
                                            <option value="">Todas</option>
                                            {subcatsDropdown.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div className="inv-filter-group">
                                        <label>Disponibilidad</label>
                                        <select value={filterDisponibilidad} onChange={e => setFilterDisponibilidad(e.target.value)}>
                                            <option value="">Todas</option>
                                            <option value="venta">Venta</option>
                                            <option value="exhibicion">Exhibición</option>
                                            <option value="consignacion">Consignación</option>
                                            <option value="por_despachar">Por Despachar</option>
                                            <option value="no_venta">No a la venta</option>
                                        </select>
                                    </div>
                                    <div className="inv-filter-group">
                                        <label>Sede</label>
                                        <select value={filterSede} onChange={e => { setFilterSede(e.target.value); setFilterZona(''); }}>
                                            <option value="">Todas</option>
                                            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div className="inv-filter-group">
                                        <label>Zona</label>
                                        <select value={filterZona} onChange={e => setFilterZona(e.target.value)}>
                                            <option value="">Todas</option>
                                            {(filterSede ? zonas.filter(z => String(z.sede) === filterSede) : zonas).map(z => (
                                                <option key={z.id} value={z.id}>{z.sede_nombre} - {z.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="inv-filter-group">
                                        <label>Estado Físico</label>
                                        <select value={filterEstadoFisico} onChange={e => setFilterEstadoFisico(e.target.value)}>
                                            <option value="">Todos</option>
                                            <option value="buen_estado">Buen estado</option>
                                            <option value="por_reparar">Por reparar</option>
                                            <option value="por_modificar">Por modificar</option>
                                        </select>
                                    </div>
                                    <div className="inv-filter-group">
                                        <label>Fecha Ingreso (Desde)</label>
                                        <input type="date" value={filterFechaInicio} onChange={e => setFilterFechaInicio(e.target.value)} />
                                    </div>
                                    <div className="inv-filter-group">
                                        <label>Fecha Ingreso (Hasta)</label>
                                        <input type="date" value={filterFechaFin} onChange={e => setFilterFechaFin(e.target.value)} />
                                    </div>
                                </div>
                                {hasFilters && (
                                    <div className="inv-filters-actions">
                                        <button className="inv-clear-pill w-full" onClick={clearFilters}><FaTimes /> Limpiar Filtros</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="header-actions" style={{ flexShrink: 0, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {/* View mode toggle */}
                    <div className="inv-view-mode-toggle">
                        <button className={`inv-view-btn ${viewMode === 'default' ? 'active' : ''}`}
                            onClick={() => setViewMode('default')} title="Vista combinada (grupos + individuales)">
                            <FaTable />
                        </button>
                        <button className={`inv-view-btn ${viewMode === 'groups_only' ? 'active' : ''}`}
                            onClick={() => setViewMode('groups_only')} title="Solo grupos">
                            <FaLayerGroup />
                        </button>
                        <button className={`inv-view-btn ${viewMode === 'products_only' ? 'active' : ''}`}
                            onClick={() => setViewMode('products_only')} title="Todos los productos (vista plana)">
                            <FaList />
                        </button>
                    </div>

                    {/* A: Toggle cost column */}
                    {hasPermission('VER_COSTOS_INVENTARIO') && (
                        <button
                            className={`v-btn-ghost${showCostoCol ? ' v-btn-ghost--active' : ''}`}
                            onClick={() => setShowCostoCol(v => !v)}
                            title={showCostoCol ? 'Ocultar costos' : 'Mostrar costos'}
                        >
                            <FaDollarSign />
                        </button>
                    )}

                    <button className="v-btn-ghost" onClick={handleExport} title="Exportar a CSV">
                        <FaFileExport />
                    </button>
                    <button className="btn-ghost-inv" onClick={() => setNuevoGrupoModal({ open: true, nombre: '', categoriaId: '', subcategoriaId: '', descripcion: '', observacion: '', ventaId: '' })}>
                        <FaLayerGroup /><span>Nuevo Grupo</span>
                    </button>
                    <button className="v-btn-primary-glow" onClick={openModal}>
                        <FaPlus /><span>Agregar</span>
                    </button>
                </div>
            </div>

            {/* ── B: SUMMARY CARDS ────────────────────────────────────────── */}
            <div className="inv-summary-row">
                <div className="inv-summary-card accent">
                    <div className="inv-sum-value">{stats.total}</div>
                    <div className="inv-sum-label">Total inventario</div>
                </div>
                <div className="inv-summary-card">
                    <div className="inv-sum-value" style={{ color: '#15803d' }}>{stats.venta}</div>
                    <div className="inv-sum-label">En venta</div>
                </div>
                <div className="inv-summary-card">
                    <div className="inv-sum-value" style={{ color: '#92400e' }}>{stats.exhibicion}</div>
                    <div className="inv-sum-label">En exhibición</div>
                </div>
                <div className="inv-summary-card">
                    <div className="inv-sum-value" style={{ color: '#3b82f6' }}>{stats.grupos}</div>
                    <div className="inv-sum-label">Grupos activos</div>
                </div>
                <div className="inv-summary-card">
                    <div className="inv-sum-value" style={{ color: '#6d28d9' }}>{stats.conGrupo}</div>
                    <div className="inv-sum-label">En grupo</div>
                </div>
                <div className="inv-summary-card">
                    <div className="inv-sum-value" style={{ color: '#64748b' }}>{stats.sinGrupo}</div>
                    <div className="inv-sum-label">Sin grupo</div>
                </div>
            </div>

            {/* ── F: TABLE ───────────────────────────────────────── */}
            <div className="ordenes-container">
                    <div className="desktop-view">
                        <table className={`inventario-table${(hasPermission('VER_COSTOS_INVENTARIO') && showCostoCol) ? ' inv-table-with-cost' : ''}${viewMode === 'products_only' ? ' inv-table-products-only' : ''}${viewMode === 'groups_only' ? ' inv-table-groups-only' : ''}`}>
                            <thead>
                                <tr>
                                    {sortTh('id', 'ID', 'col-id')}
                                    {sortTh('proveedorNombre', 'Proveedor', 'col-prov')}
                                    {sortTh('facturaManual', 'Factura', 'col-fac')}
                                    {sortTh('ventaId', 'Venta', 'col-ven')}
                                    {sortTh('disponibilidad', 'Disponibilidad', 'col-disp')}
                                    {sortTh('fechaIngreso', 'F. Ingreso', 'col-fec')}
                                    {sortTh('prod', 'Referencia', 'col-ref')}
                                    {viewMode === 'products_only' && <th className="col-grp">Grupo</th>}
                                    {sortTh('cat', 'Categoría', 'col-cat')}
                                    {sortTh('subcat', 'Subcategoría', 'col-subcat')}
                                    {sortTh('telaNombre', 'Tela', 'col-tela')}
                                    {sortTh('telaColor', 'Color', 'col-color')}
                                    {sortTh('variacion', 'Variación', 'col-var')}
                                    {sortTh('estado_fisico', 'Estado', 'col-est')}
                                    {sortTh('sede_nombre', 'Sede', 'col-sede')}
                                    {sortTh('zona_nombre', 'Zona', 'col-zona')}
                                    {sortTh('observacion', 'Observación', 'col-obs')}
                                    {hasPermission('VER_COSTOS_INVENTARIO') && showCostoCol && sortTh('costo_especifico', 'Costo', 'col-costo')}
                                    {viewMode !== 'products_only' && <th className="col-acc">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody>{renderTableBody()}</tbody>
                        </table>
                    </div>
                </div>

            <ImagePreviewModal
                isOpen={previewImg.open}
                onClose={() => setPreviewImg({ open: false, url: '' })}
                imageUrl={previewImg.url}
            />

            {/* ── MODAL: AGREGAR ENTRADA ──────────────────────────────────── */}
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
                                {/* TOP METADATA & NEW GROUP - COMPACT ROW */}
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {/* PROVEEDOR */}
                                    <div className="inv-section" style={{ flex: '1 1 250px', padding: '0.75rem 1rem' }}>
                                        <div className="inv-section-title" style={{ marginBottom: '0.4rem', fontSize: '0.65rem' }}>Información General</div>
                                        <div className="ifg-group">
                                            <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Proveedor</label>
                                            <select className="ifg-input" value={form.proveedorId} onChange={e => handleField('proveedorId', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                                <option value="">Seleccionar...</option>
                                                {(proveedores || []).map(p => <option key={p.id} value={p.id}>{p.nombre_empresa}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* CREAR GRUPO RAPIDO */}
                                    <div className="inv-section" style={{ flex: '2 1 500px', background: '#f0f9ff', borderColor: '#bae6fd', padding: '0.75rem 1rem' }}>
                                        <div className="inv-section-title" style={{ color: '#0284c7', marginBottom: '0.4rem', fontSize: '0.65rem' }}>Crear Nuevo Grupo (Opcional)</div>
                                        <div className="ifg-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr auto', alignItems: 'end', gap: '0.5rem' }}>
                                            <div className="ifg-group">
                                                <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Nombre</label>
                                                <input type="text" className="ifg-input" value={newGrupoName} onChange={e => setNewGrupoName(e.target.value)} placeholder="Ej: Juego de Sala" style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }} />
                                            </div>
                                            <div className="ifg-group">
                                                <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Categoría</label>
                                                <select className="ifg-input" value={newGrupoCategoria} onChange={e => setNewGrupoCategoria(e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                                    <option value="">Ninguna</option>
                                                    {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                                </select>
                                            </div>
                                            <div className="ifg-group">
                                                <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Subcategoría</label>
                                                <select className="ifg-input" value={newGrupoSubcategoria} onChange={e => setNewGrupoSubcategoria(e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                                    <option value="">Ninguna</option>
                                                    {(newGrupoCategoria ? SUBCATEGORIAS.filter(s => String(s.categoria) === String(newGrupoCategoria)) : SUBCATEGORIAS).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                                </select>
                                            </div>
                                            <button type="button" className="v-btn-primary-glow" onClick={handleAddGrupo} style={{ padding: '0.35rem 0.75rem', height: '28px', fontSize: '0.75rem' }}>
                                                <FaPlus /> Crear
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* REFERENCIAS (PRODUCTOS) */}
                                <div className="inv-section" style={{ padding: '0', background: 'transparent', border: 'none' }}>
                                    <div className="fct-section-label" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8' }}>Referencias que Ingresan</span>
                                        <button type="button" onClick={handleAddRow} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#0f172a', cursor: 'pointer', fontWeight: 600 }}>
                                            <FaPlus /> Añadir Fila
                                        </button>
                                    </div>

                                    {form.productos.map((row, index) => {
                                        // Filter references by selected provider
                                        const providerRefs = productos.filter(r => String(r.proveedor) === String(form.proveedorId));
                                        const subcatsFiltered = row.categoriaId ? SUBCATEGORIAS.filter(s => String(s.categoria) === String(row.categoriaId)) : [];
                                        const filteredRefs = providerRefs.filter(r => {
                                            if (row.categoriaId && !r.categorias?.map(String).includes(String(row.categoriaId))) return false;
                                            if (row.subcategoriaId && !r.subcategorias?.map(String).includes(String(row.subcategoriaId))) return false;
                                            return true;
                                        });
                                        const noRefsMsg = !form.proveedorId ? 'Elige proveedor' : providerRefs.length === 0 ? 'Sin referencias' : filteredRefs.length === 0 ? 'Sin resultados' : 'Seleccione...';

                                        return (
                                            <div key={index} className="fct-ref-row" style={{ position: 'relative', background: 'white', borderRadius: '8px', padding: '1rem', border: '1px solid #e2e8f0', marginBottom: '1rem', opacity: row.visible ? 1 : 0, transition: 'opacity 0.3s' }}>
                                                {form.productos.length > 1 && (
                                                    <button type="button" className="fct-trash-btn" onClick={() => removeRefRow(index)} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', zIndex: 10 }}>
                                                        <FaTrashAlt />
                                                    </button>
                                                )}
                                                
                                                <div className="ifg-grid" style={{ gridTemplateColumns: 'repeat(12, 1fr)', gap: '0.6rem', alignItems: 'end' }}>
                                                    {/* ROW 1 */}
                                                    <div className="ifg-group" style={{ gridColumn: 'span 3' }}>
                                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Categoría</label>
                                                        <select className="ifg-input" value={row.categoriaId} onChange={e => handleRefRow(index, 'categoriaId', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                                            <option value="">Sin categoría</option>
                                                            {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="ifg-group" style={{ gridColumn: 'span 3' }}>
                                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Subcategoría</label>
                                                        <select className="ifg-input" value={row.subcategoriaId} disabled={!row.categoriaId} onChange={e => handleRefRow(index, 'subcategoriaId', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                                            <option value="">{row.categoriaId ? 'Sin filtro' : 'Elige categoría'}</option>
                                                            {subcatsFiltered.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="ifg-group" style={{ gridColumn: 'span 4' }}>
                                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Referencia</label>
                                                        <select className="ifg-input" required value={row.referenciaId} onChange={e => handleRefRow(index, 'referenciaId', e.target.value)} disabled={!form.proveedorId} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                                            <option value="">{noRefsMsg}</option>
                                                            {filteredRefs.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="ifg-group" style={{ gridColumn: 'span 2' }}>
                                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Variación</label>
                                                        <input className="ifg-input" type="text" placeholder="Ej: Color..." value={row.variacion} onChange={e => handleRefRow(index, 'variacion', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }} />
                                                    </div>

                                                    {/* ROW 2 */}
                                                    <div className="ifg-group" style={{ gridColumn: 'span 2' }}>
                                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Costo</label>
                                                        <div className="ifg-input-prefix">
                                                            <span style={{ padding: '0 0.5rem', fontSize: '0.75rem' }}>$</span>
                                                            <input className="ifg-input-raw" required type="text" placeholder="0" value={row.costoDisplay} onChange={e => handleRefRow(index, 'costoDisplay', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }} />
                                                        </div>
                                                    </div>
                                                    <div className="ifg-group" style={{ gridColumn: 'span 2' }}>
                                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Cantidad</label>
                                                        <input className="ifg-input" type="number" min="1" max="200" value={row.cantidad} onChange={e => handleRefRow(index, 'cantidad', Math.max(1, parseInt(e.target.value) || 1))} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }} />
                                                    </div>
                                                    <div className="ifg-group" style={{ gridColumn: 'span 2' }}>
                                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Estado</label>
                                                        <select className="ifg-input" value={row.estado_fisico} onChange={e => handleRefRow(index, 'estado_fisico', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                                            <option value="buen_estado">Buen estado</option>
                                                            <option value="por_reparar">Por reparar</option>
                                                            <option value="por_modificar">Por modificar</option>
                                                        </select>
                                                    </div>
                                                    <div className="ifg-group" style={{ gridColumn: 'span 3' }}>
                                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Disponibilidad</label>
                                                        <select className="ifg-input" value={row.disponibilidad} onChange={e => handleRefRow(index, 'disponibilidad', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                                            {DISPONIBILIDAD_OPTIONS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="ifg-group" style={{ gridColumn: 'span 3' }}>
                                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Zona</label>
                                                        <select className="ifg-input" value={row.zonaId} onChange={e => handleRefRow(index, 'zonaId', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                                            <option value="">Seleccione...</option>
                                                            {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                                                        </select>
                                                    </div>

                                                    {/* ROW 3 */}
                                                    <div className="ifg-group" style={{ gridColumn: 'span 4' }}>
                                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Grupo</label>
                                                        <select className="ifg-input" value={row.grupoLocalId} onChange={e => handleRefRow(index, 'grupoLocalId', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                                            <option value="">(Sin grupo)</option>
                                                            {form.grupoInstances.length > 0 && (
                                                                <optgroup label="Nuevos en esta sesión">
                                                                    {form.grupoInstances.map(g => (
                                                                        <option key={g.localId} value={g.localId}>{g.nombre} (NUEVO)</option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                            {grupos.filter(g => g.activo !== false).length > 0 && (
                                                                <optgroup label="Existentes">
                                                                    {grupos.filter(g => g.activo !== false).map(g => (
                                                                        <option key={g.id} value={g.id}>G{String(g.id).padStart(3, '0')} — {g.nombre}</option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                        </select>
                                                    </div>
                                                    <div className="ifg-group" style={{ gridColumn: 'span 3' }}>
                                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>ID Venta</label>
                                                        <select className="ifg-input" value={row.ventaId} disabled={row.disponibilidad !== 'cliente' && row.disponibilidad !== 'por_despachar'} onChange={e => handleRefRow(index, 'ventaId', e.target.value)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                                            <option value="">Ninguno</option>
                                                            {ordenesPendientes.map(id => <option key={id} value={id}>{id}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="ifg-group" style={{ gridColumn: 'span 5' }}>
                                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Observación</label>
                                                        <input className="ifg-input" type="text" value={row.observacion} onChange={e => handleRefRow(index, 'observacion', e.target.value)} placeholder="Notas internas..." style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }} />
                                                    </div>

                                                    {/* ROW 4: Telas y Cueros (Costos Adicionales) */}
                                                    <div style={{ gridColumn: 'span 12', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.65rem', marginTop: '0.3rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155' }}>🧵 Telas y Cueros (Costos Adicionales)</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setForm(prev => {
                                                                    const prods = [...prev.productos];
                                                                    const tcs = prods[index].telas_cueros || [];
                                                                    prods[index] = { ...prods[index], telas_cueros: [...tcs, { tipo: 'tela', referencia: '', color: '', costo_unidad: '', cantidad: '' }] };
                                                                    return { ...prev, productos: prods };
                                                                })}
                                                                style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                                            >
                                                                <FaPlus style={{ fontSize: '0.6rem' }} /> Agregar
                                                            </button>
                                                        </div>
                                                        {(!row.telas_cueros || row.telas_cueros.length === 0) ? (
                                                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic' }}>Sin telas o cueros asignados.</div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                                {row.telas_cueros.map((tc, tcIdx) => {
                                                                    const isCuero = tc.tipo === 'cuero';
                                                                    const unitLabel = isCuero ? 'dm' : 'm';
                                                                    const tcSub = (parseFloat(tc.costo_unidad) || 0) * (parseFloat(tc.cantidad) || 0);
                                                                    return (
                                                                        <div key={tcIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#fff', padding: '0.3rem', borderRadius: '5px', border: '1px solid #cbd5e1' }}>
                                                                            <select value={tc.tipo || 'tela'}
                                                                                onChange={e => setForm(prev => { const prods = [...prev.productos]; const tcs = [...(prods[index].telas_cueros || [])]; tcs[tcIdx] = { ...tcs[tcIdx], tipo: e.target.value }; prods[index] = { ...prods[index], telas_cueros: tcs }; return { ...prev, productos: prods }; })}
                                                                                style={{ padding: '0.25rem', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700, color: isCuero ? '#c2410c' : '#0369a1', background: isCuero ? '#fff7ed' : '#f0f9ff' }}>
                                                                                <option value="tela">Tela (m)</option>
                                                                                <option value="cuero">Cuero (dm)</option>
                                                                            </select>
                                                                            <input type="text" placeholder={isCuero ? 'Ref. Cuero' : 'Ref. Tela'} value={tc.referencia || ''}
                                                                                onChange={e => setForm(prev => { const prods = [...prev.productos]; const tcs = [...(prods[index].telas_cueros || [])]; tcs[tcIdx] = { ...tcs[tcIdx], referencia: e.target.value }; prods[index] = { ...prods[index], telas_cueros: tcs }; return { ...prev, productos: prods }; })}
                                                                                style={{ flex: 1, padding: '0.25rem 0.35rem', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                                                            <input type="text" placeholder="Color" value={tc.color || ''}
                                                                                onChange={e => setForm(prev => { const prods = [...prev.productos]; const tcs = [...(prods[index].telas_cueros || [])]; tcs[tcIdx] = { ...tcs[tcIdx], color: e.target.value }; prods[index] = { ...prods[index], telas_cueros: tcs }; return { ...prev, productos: prods }; })}
                                                                                style={{ width: '70px', padding: '0.25rem 0.35rem', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                                                            <div style={{ position: 'relative', width: '88px' }}>
                                                                                <span style={{ position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.68rem' }}>$</span>
                                                                                <input type="text" placeholder={isCuero ? '$/dm' : '$/m'} value={tc.costo_unidad ? formatCOP(parseInt(tc.costo_unidad)) : ''}
                                                                                    onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setForm(prev => { const prods = [...prev.productos]; const tcs = [...(prods[index].telas_cueros || [])]; tcs[tcIdx] = { ...tcs[tcIdx], costo_unidad: raw }; prods[index] = { ...prods[index], telas_cueros: tcs }; return { ...prev, productos: prods }; }); }}
                                                                                    style={{ width: '100%', padding: '0.25rem 0.25rem 0.25rem 0.9rem', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                                                            </div>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                                                                                <input type="number" step="0.1" min="0" placeholder={isCuero ? 'dm' : 'm'} value={tc.cantidad || ''}
                                                                                    onChange={e => setForm(prev => { const prods = [...prev.productos]; const tcs = [...(prods[index].telas_cueros || [])]; tcs[tcIdx] = { ...tcs[tcIdx], cantidad: e.target.value }; prods[index] = { ...prods[index], telas_cueros: tcs }; return { ...prev, productos: prods }; })}
                                                                                    style={{ width: '58px', padding: '0.25rem 0.3rem', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                                                                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>{unitLabel}</span>
                                                                            </div>
                                                                            {tcSub > 0 && <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>= {formatCOP(tcSub)}</span>}
                                                                            <button type="button"
                                                                                onClick={() => setForm(prev => { const prods = [...prev.productos]; prods[index] = { ...prods[index], telas_cueros: (prods[index].telas_cueros || []).filter((_, i) => i !== tcIdx) }; return { ...prev, productos: prods }; })}
                                                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.15rem', fontSize: '0.75rem' }} title="Quitar">
                                                                                <FaTimes />
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="inv-modal-footer">
                                <button type="button" className="btn-secondary" style={{ width: 'auto' }} onClick={closeModal}>Cancelar</button>
                                <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={isLoading}>
                                    <FaSave /> {isLoading ? 'Guardando...' : 'Crear Entrada'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── MODAL: NUEVO GRUPO ──────────────────────────────────────── */}
            {nuevoGrupoModal.open && (
                <div className="inv-overlay inv-overlay-visible inv-overlay-grupo"
                    onClick={e => { if (e.target === e.currentTarget) setNuevoGrupoModal({ open: false, nombre: '', categoriaId: '', subcategoriaId: '', descripcion: '', observacion: '', ventaId: '' }); }}>
                    <div className="inv-grupo-edit-modal inv-modal-visible" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="inv-modal-header">
                            <div className="inv-modal-header-left">
                                <FaLayerGroup className="inv-modal-icon" />
                                <h3>Nuevo Grupo</h3>
                            </div>
                            <button className="inv-modal-close" onClick={() => setNuevoGrupoModal({ open: false, nombre: '', categoriaId: '', subcategoriaId: '', descripcion: '', observacion: '', ventaId: '' })}>&times;</button>
                        </div>
                        <div className="inv-grupo-edit-body">
                            <div className="inv-grupo-field">
                                <label className="ifg-label">Nombre del Grupo</label>
                                <input type="text" className="ifg-input"
                                    value={nuevoGrupoModal.nombre}
                                    onChange={e => setNuevoGrupoModal(prev => ({ ...prev, nombre: e.target.value }))}
                                    placeholder="Ej: Comedor Qatar..." autoFocus />
                            </div>
                            <div className="inv-grupo-field">
                                <label className="ifg-label">Categoría <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
                                <select className="ifg-input"
                                    value={nuevoGrupoModal.categoriaId}
                                    onChange={e => setNuevoGrupoModal(prev => ({ ...prev, categoriaId: e.target.value, subcategoriaId: '' }))}>
                                    <option value="">Ninguna</option>
                                    {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                            <div className="inv-grupo-field">
                                <label className="ifg-label">Subcategoría <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
                                <select className="ifg-input"
                                    value={nuevoGrupoModal.subcategoriaId}
                                    onChange={e => setNuevoGrupoModal(prev => ({ ...prev, subcategoriaId: e.target.value }))}>
                                    <option value="">Ninguna</option>
                                    {(nuevoGrupoModal.categoriaId ? SUBCATEGORIAS.filter(s => String(s.categoria) === String(nuevoGrupoModal.categoriaId)) : SUBCATEGORIAS).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>

                            <div className="inv-grupo-field">
                                <label className="ifg-label">Observación <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
                                <textarea className="ifg-input ifg-textarea"
                                    value={nuevoGrupoModal.observacion}
                                    onChange={e => setNuevoGrupoModal(prev => ({ ...prev, observacion: e.target.value }))}
                                    placeholder="Notas internas del grupo..." style={{ minHeight: '60px' }} />
                            </div>
                            <div className="inv-grupo-field">
                                <label className="ifg-label">Venta asociada <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
                                <select className="ifg-input"
                                    value={nuevoGrupoModal.ventaId}
                                    onChange={e => setNuevoGrupoModal(prev => ({ ...prev, ventaId: e.target.value }))}>
                                    <option value="">Ninguna venta asociada</option>
                                    {ordenesPendientes.map(id => <option key={id} value={id}>{id}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="inv-modal-footer">
                            <button type="button" className="btn-secondary" style={{ width: 'auto' }} onClick={() => setNuevoGrupoModal({ open: false, nombre: '', categoriaId: '', subcategoriaId: '', descripcion: '', observacion: '', ventaId: '' })}>Cancelar</button>
                            <button type="button" className="btn-general" style={{ width: 'auto' }}
                                onClick={saveNuevoGrupo} disabled={nuevoGrupoSaving || !nuevoGrupoModal.nombre.trim()}>
                                <FaPlus /> {nuevoGrupoSaving ? 'Creando...' : 'Crear Grupo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: EDITAR GRUPO ─────────────────────────────────────── */}
            {grupoEditModal && (
                <div className="inv-overlay inv-overlay-visible inv-overlay-grupo"
                    onClick={e => { if (e.target === e.currentTarget) closeGrupoEdit(); }}>
                    <div className="inv-grupo-edit-modal inv-modal-visible" onClick={e => e.stopPropagation()}>
                        <div className="inv-modal-header">
                            <div className="inv-modal-header-left">
                                <span className="inv-group-id-badge">G{String(grupoEditModal.grupo.id).padStart(3, '0')}</span>
                                <h3>Editar Grupo</h3>
                            </div>
                            <button className="inv-modal-close" onClick={closeGrupoEdit}>&times;</button>
                        </div>

                        <div className="inv-grupo-edit-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                            <div className="inv-grupo-field">
                                <label className="ifg-label">Nombre del Grupo</label>
                                <input type="text" className="ifg-input"
                                    value={grupoEditModal.nombre}
                                    onChange={e => setGrupoEditModal(prev => ({ ...prev, nombre: e.target.value }))}
                                    placeholder="Ej: Comedor Qatar..." />
                            </div>

                            <div className="inv-grupo-field">
                                <label className="ifg-label">Categoría</label>
                                <select className="ifg-input"
                                    value={grupoEditModal.categoriaId || ''}
                                    onChange={e => setGrupoEditModal(prev => ({ ...prev, categoriaId: e.target.value, subcategoriaId: '' }))}>
                                    <option value="">Ninguna</option>
                                    {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                                <small style={{ color: '#f59e0b', display: 'block', marginTop: '0.3rem', fontSize: '0.75rem', lineHeight: '1.2' }}>
                                    Al cambiar la categoría, se actualizarán todos los ítems del grupo.
                                </small>
                            </div>

                            <div className="inv-grupo-field">
                                <label className="ifg-label">Subcategoría</label>
                                <select className="ifg-input"
                                    value={grupoEditModal.subcategoriaId || ''}
                                    onChange={e => setGrupoEditModal(prev => ({ ...prev, subcategoriaId: e.target.value }))}>
                                    <option value="">Ninguna</option>
                                    {(grupoEditModal.categoriaId ? SUBCATEGORIAS.filter(s => String(s.categoria) === String(grupoEditModal.categoriaId)) : SUBCATEGORIAS).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>

                            <div className="inv-grupo-field">
                                <label className="ifg-label">Venta asociada <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
                                <select className="ifg-input"
                                    value={grupoEditModal.ventaId || ''}
                                    onChange={e => setGrupoEditModal(prev => ({ ...prev, ventaId: e.target.value }))}>
                                    <option value="">Ninguna venta asociada</option>
                                    {ordenesPendientes.map(id => <option key={id} value={id}>{id}</option>)}
                                </select>
                                <small style={{ color: '#f59e0b', display: 'block', marginTop: '0.3rem', fontSize: '0.75rem', lineHeight: '1.2' }}>
                                    Al cambiar la venta del grupo, todos sus productos se actualizarán automáticamente.
                                </small>
                            </div>

                            <div className="inv-grupo-field" style={{ gridColumn: 'span 2' }}>
                                <label className="ifg-label">Observación</label>
                                <textarea className="ifg-input ifg-textarea"
                                    value={grupoEditModal.observacion || ''}
                                    onChange={e => setGrupoEditModal(prev => ({ ...prev, observacion: e.target.value }))}
                                    placeholder="Notas del grupo..." style={{ minHeight: '60px' }} />
                            </div>

                            <div className="inv-grupo-section-label" style={{ gridColumn: 'span 2', marginTop: '0.5rem', marginBottom: '0', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.3rem' }}>
                                Edición Masiva de Ítems <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 400 }}>(Sobreescribe todos los ítems)</span>
                            </div>

                            <div className="inv-grupo-field">
                                <label className="ifg-label">Disponibilidad</label>
                                <select className="ifg-input"
                                    value={grupoEditModal.disponibilidad}
                                    onChange={e => setGrupoEditModal(prev => ({ ...prev, disponibilidad: e.target.value }))}>
                                    <option value="">Sin cambio</option>
                                    {DISPONIBILIDAD_OPTIONS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
                                </select>
                            </div>

                            <div className="inv-grupo-field">
                                <label className="ifg-label">Estado Físico</label>
                                <select className="ifg-input"
                                    value={grupoEditModal.estadoFisico}
                                    onChange={e => setGrupoEditModal(prev => ({ ...prev, estadoFisico: e.target.value }))}>
                                    <option value="">Sin cambio</option>
                                    <option value="buen_estado">Buen estado</option>
                                    <option value="por_reparar">Por reparar</option>
                                    <option value="por_modificar">Por modificar</option>
                                </select>
                            </div>

                            <div className="inv-grupo-field">
                                <label className="ifg-label">Zona</label>
                                <select className="ifg-input"
                                    value={grupoEditModal.zonaId}
                                    onChange={e => setGrupoEditModal(prev => ({ ...prev, zonaId: e.target.value }))}>
                                    <option value="">Sin cambio</option>
                                    {zonas.map(z => <option key={z.id} value={z.id}>{z.sede_nombre} - {z.nombre}</option>)}
                                </select>
                            </div>

                            <div className="inv-grupo-section-label" style={{ gridColumn: 'span 2', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Ítems en el grupo ({grupoEditModal.items.length})</span>
                                {showCostoCol && (
                                    <span style={{ background: '#f1f5f9', color: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                                        Costo Total: {formatCOP(grupoEditModal.items.reduce((acc, curr) => acc + (parseFloat(curr.costo_especifico) || 0), 0))}
                                    </span>
                                )}
                            </div>
                            <div className="inv-grupo-items-list" style={{ gridColumn: 'span 2' }}>
                                {grupoEditModal.items.length === 0 ? (
                                    <div className="inv-grupo-empty">Sin ítems en este grupo</div>
                                ) : grupoEditModal.items.map(item => (
                                    <div key={item.dbId} className="inv-grupo-item-row">
                                        <span className="inv-id-badge" style={{ fontSize: '0.65rem' }}>{item.id}</span>
                                        <span className="inv-grupo-item-name">
                                            {item.prod?.nombre || '—'}
                                            {item.variacion ? <em> · {item.variacion}</em> : ''}
                                        </span>
                                        <span className={`disp-badge disp-${item.disponibilidad}`} style={{ fontSize: '0.65rem' }}>
                                            {DISPONIBILIDAD_LABELS[item.disponibilidad] || '—'}
                                        </span>
                                        <button className="inv-grupo-item-remove" title="Quitar del grupo"
                                            onClick={() => removeItemFromGrupoModal(item.dbId)}>
                                            <FaTimes />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {items.filter(i => !i.grupoId && !grupoEditModal.items.find(gi => gi.dbId === i.dbId)).length > 0 && (
                                <>
                                    <div className="inv-grupo-section-label" style={{ gridColumn: 'span 2', marginTop: '1rem' }}>Agregar ítems sin grupo</div>
                                    <div className="inv-grupo-add-list" style={{ gridColumn: 'span 2' }}>
                                        {items
                                            .filter(i => !i.grupoId && !grupoEditModal.items.find(gi => gi.dbId === i.dbId))
                                            .slice(0, 30)
                                            .map(item => (
                                                <div key={item.dbId} className="inv-grupo-item-row inv-grupo-item-addable">
                                                    <span className="inv-id-badge" style={{ fontSize: '0.65rem' }}>{item.id}</span>
                                                    <span className="inv-grupo-item-name">{item.prod?.nombre || '—'}</span>
                                                    <span className={`disp-badge disp-${item.disponibilidad}`} style={{ fontSize: '0.65rem' }}>
                                                        {DISPONIBILIDAD_LABELS[item.disponibilidad] || '—'}
                                                    </span>
                                                    <button className="inv-grupo-item-add-btn" title="Agregar al grupo"
                                                        onClick={() => addItemToGrupoModal(item)}>
                                                        <FaPlus />
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="inv-modal-footer">
                            <button type="button" className="btn-secondary" style={{ width: 'auto' }} onClick={closeGrupoEdit}>Cancelar</button>
                            <button type="button" className="btn-general" style={{ width: 'auto' }}
                                onClick={saveGrupoEdit}
                                disabled={grupoEditSaving || !grupoEditModal.nombre.trim()}>
                                <FaSave /> {grupoEditSaving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: EDITAR ÍTEM INDIVIDUAL ────────────────────────────── */}
            {itemEditModal.open && itemEditModal.item && (
                <div className="inv-overlay inv-overlay-visible inv-overlay-grupo"
                    onClick={e => { if (e.target === e.currentTarget) closeItemEdit(); }}>
                    <div className="inv-grupo-edit-modal inv-modal-visible" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="inv-modal-header">
                            <div className="inv-modal-header-left">
                                <FaEdit className="inv-modal-icon" />
                                <h3>Editar Ítem: {itemEditModal.item.id_referencia}</h3>
                            </div>
                            <button className="inv-modal-close" onClick={closeItemEdit}>&times;</button>
                        </div>
                        <form className="inv-form" onSubmit={saveItemEdit}>
                            <div className="inv-grupo-edit-body" style={{ padding: '1.5rem 1rem' }}>
                                <div className="ifg-grid" style={{ gridTemplateColumns: 'repeat(12, 1fr)', gap: '0.6rem', alignItems: 'end' }}>
                                    {/* ROW 1 */}
                                    <div className="ifg-group" style={{ gridColumn: 'span 4' }}>
                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Referencia</label>
                                        <select className="ifg-input" value={itemEditModal.form.referenciaId} onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, referenciaId: e.target.value } }))} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                            <option value="">(Referencia Original)</option>
                                            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div className="ifg-group" style={{ gridColumn: 'span 4' }}>
                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Variación</label>
                                        <input type="text" className="ifg-input" value={itemEditModal.form.variacion} onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, variacion: e.target.value } }))} placeholder="Ej: Color, tamaño..." style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }} />
                                    </div>
                                    <div className="ifg-group" style={{ gridColumn: 'span 4' }}>
                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Costo</label>
                                        <div className="ifg-input-prefix">
                                            <span style={{ padding: '0 0.5rem', fontSize: '0.75rem' }}>$</span>
                                            <input type="text" className="ifg-input-raw" value={itemEditModal.form.costo} onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, costo: e.target.value } }))} placeholder="0" style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }} />
                                        </div>
                                    </div>

                                    {/* ROW 2 */}
                                    <div className="ifg-group" style={{ gridColumn: 'span 3' }}>
                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Categoría</label>
                                        <select className="ifg-input" value={itemEditModal.form.categoriaId} disabled={!!itemEditModal.form.grupoId} onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, categoriaId: e.target.value, subcategoriaId: '' } }))} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                            <option value="">(De Referencia)</option>
                                            {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div className="ifg-group" style={{ gridColumn: 'span 3' }}>
                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Subcategoría</label>
                                        <select className="ifg-input" value={itemEditModal.form.subcategoriaId} onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, subcategoriaId: e.target.value } }))} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                            <option value="">(De Referencia)</option>
                                            {(itemEditModal.form.categoriaId ? SUBCATEGORIAS.filter(s => String(s.categoria) === String(itemEditModal.form.categoriaId)) : SUBCATEGORIAS).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div className="ifg-group" style={{ gridColumn: 'span 3' }}>
                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Disponibilidad</label>
                                        <select className="ifg-input" value={itemEditModal.form.disponibilidad} onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, disponibilidad: e.target.value } }))} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                            {DISPONIBILIDAD_OPTIONS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
                                        </select>
                                    </div>
                                    <div className="ifg-group" style={{ gridColumn: 'span 3' }}>
                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Estado Físico</label>
                                        <select className="ifg-input" value={itemEditModal.form.estadoFisico} onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, estadoFisico: e.target.value } }))} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                            <option value="buen_estado">Buen estado</option>
                                            <option value="por_reparar">Por reparar</option>
                                            <option value="por_modificar">Por modificar</option>
                                        </select>
                                    </div>

                                    {/* ROW 3 */}
                                    <div className="ifg-group" style={{ gridColumn: 'span 3' }}>
                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Zona</label>
                                        <select className="ifg-input" value={itemEditModal.form.zonaId} onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, zonaId: e.target.value } }))} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                            <option value="">Ninguna</option>
                                            {zonas.map(z => <option key={z.id} value={z.id}>{z.sede_nombre} - {z.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div className="ifg-group" style={{ gridColumn: 'span 4' }}>
                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Venta Asignada</label>
                                        <select className="ifg-input" value={itemEditModal.form.ventaId} disabled={!!itemEditModal.form.grupoId || (itemEditModal.form.disponibilidad !== 'cliente' && itemEditModal.form.disponibilidad !== 'por_despachar')} onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, ventaId: e.target.value } }))} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                            <option value="">Ninguna</option>
                                            {ordenesPendientes.map(id => <option key={id} value={id}>{id}</option>)}
                                        </select>
                                    </div>
                                    <div className="ifg-group" style={{ gridColumn: 'span 5' }}>
                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Grupo</label>
                                        <select className="ifg-input" value={itemEditModal.form.grupoId} onChange={e => {
                                            const newGroupId = e.target.value;
                                            let newVentaId = itemEditModal.form.ventaId;
                                            let newCategoriaId = itemEditModal.form.categoriaId;
                                            if (newGroupId) {
                                                const nGroup = grupos.find(g => String(g.id) === String(newGroupId));
                                                if (nGroup) {
                                                    newVentaId = String(nGroup.venta || nGroup.venta_id || '');
                                                    newCategoriaId = String(nGroup.categoria || nGroup.categoria_id || '');
                                                }
                                            }
                                            setItemEditModal(prev => ({ ...prev, form: { ...prev.form, grupoId: newGroupId, ventaId: newVentaId, categoriaId: newCategoriaId } }));
                                        }} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}>
                                            <option value="">Ninguno (individual)</option>
                                            {grupos.filter(g => g.activo !== false).map(g => (
                                                <option key={g.id} value={g.id}>G{String(g.id).padStart(3, '0')} — {g.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* ROW 4 */}
                                    <div className="ifg-group" style={{ gridColumn: 'span 3' }}>
                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Factura Manual</label>
                                        <input type="text" className="ifg-input" value={itemEditModal.form.factura_manual} onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, factura_manual: e.target.value } }))} placeholder="Ej: FCT-123" style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }} />
                                    </div>
                                    <div className="ifg-group" style={{ gridColumn: 'span 3' }}>
                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Fecha Ingreso</label>
                                        <input type="date" className="ifg-input" value={itemEditModal.form.fecha_ingreso} onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, fecha_ingreso: e.target.value } }))} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }} />
                                    </div>
                                    <div className="ifg-group" style={{ gridColumn: 'span 6' }}>
                                        <label className="ifg-label" style={{ fontSize: '0.6rem' }}>Observación</label>
                                        <input type="text" className="ifg-input" value={itemEditModal.form.observacion} onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, observacion: e.target.value } }))} placeholder="Notas adicionales..." style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }} />
                                    </div>{/* end ROW 4 observacion */}
                                </div>{/* end ifg-grid */}

                                {itemEditModal.form.grupoId && (
                                    <div style={{ marginTop: '0.8rem', padding: '0.6rem', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                        <small style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', lineHeight: '1.2' }}>
                                            <span style={{ fontSize: '1rem' }}>⚠️</span> 
                                            Al pertenecer a un grupo, este ítem hereda su categoría y venta automáticamente. Para cambiarlas, debes removerlo del grupo o editar el grupo entero.
                                        </small>
                                    </div>
                                )}

                                {/* ── TELAS Y CUEROS ─────────────────────────────────── */}
                                <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.8rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0369a1' }}>
                                            🧵 Telas y Cueros (Costos Adicionales)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, telas_cueros: [...(prev.form.telas_cueros || []), { tipo: 'tela', referencia: '', color: '', unidad_medida: 'metro', costo_unidad: '', cantidad: '' }] } }))}
                                            style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                        >
                                            <FaPlus style={{ fontSize: '0.65rem' }} /> Agregar Tela/Cuero
                                        </button>
                                    </div>

                                    {(!itemEditModal.form.telas_cueros || itemEditModal.form.telas_cueros.length === 0) ? (
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '0.5rem' }}>Sin telas o cueros registrados.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                            {itemEditModal.form.telas_cueros.map((tc, tcIdx) => {
                                                const isCuero = tc.tipo === 'cuero';
                                                const unitLabel = isCuero ? 'dm' : 'm';
                                                const tcSub = (parseFloat(tc.costo_unidad) || 0) * (parseFloat(tc.cantidad) || 0);
                                                return (
                                                    <div key={tc.id || tcIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', padding: '0.35rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                        <select
                                                            value={tc.tipo || 'tela'}
                                                            onChange={e => setItemEditModal(prev => { const tcs = [...prev.form.telas_cueros]; tcs[tcIdx] = { ...tcs[tcIdx], tipo: e.target.value }; return { ...prev, form: { ...prev.form, telas_cueros: tcs } }; })}
                                                            style={{ padding: '0.28rem', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700, color: isCuero ? '#c2410c' : '#0369a1', background: isCuero ? '#fff7ed' : '#f0f9ff' }}
                                                        >
                                                            <option value="tela">Tela (m)</option>
                                                            <option value="cuero">Cuero (dm)</option>
                                                        </select>
                                                        <input type="text" placeholder={isCuero ? 'Ref. Cuero' : 'Ref. Tela'} value={tc.referencia || ''}
                                                            onChange={e => setItemEditModal(prev => { const tcs = [...prev.form.telas_cueros]; tcs[tcIdx] = { ...tcs[tcIdx], referencia: e.target.value }; return { ...prev, form: { ...prev.form, telas_cueros: tcs } }; })}
                                                            style={{ flex: 1, padding: '0.28rem 0.4rem', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                                        <input type="text" placeholder="Color" value={tc.color || ''}
                                                            onChange={e => setItemEditModal(prev => { const tcs = [...prev.form.telas_cueros]; tcs[tcIdx] = { ...tcs[tcIdx], color: e.target.value }; return { ...prev, form: { ...prev.form, telas_cueros: tcs } }; })}
                                                            style={{ width: '75px', padding: '0.28rem 0.4rem', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                                        <div style={{ position: 'relative', width: '90px' }}>
                                                            <span style={{ position: 'absolute', left: '5px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.68rem' }}>$</span>
                                                            <input type="text" placeholder={isCuero ? '$/dm' : '$/m'} value={tc.costo_unidad ? formatCOP(parseInt(tc.costo_unidad)) : ''}
                                                                onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ''); setItemEditModal(prev => { const tcs = [...prev.form.telas_cueros]; tcs[tcIdx] = { ...tcs[tcIdx], costo_unidad: raw }; return { ...prev, form: { ...prev.form, telas_cueros: tcs } }; }); }}
                                                                style={{ width: '100%', padding: '0.28rem 0.28rem 0.28rem 1rem', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                                                            <input type="number" step="0.1" min="0" placeholder={isCuero ? 'dm' : 'm'} value={tc.cantidad || ''}
                                                                onChange={e => setItemEditModal(prev => { const tcs = [...prev.form.telas_cueros]; tcs[tcIdx] = { ...tcs[tcIdx], cantidad: e.target.value }; return { ...prev, form: { ...prev.form, telas_cueros: tcs } }; })}
                                                                style={{ width: '60px', padding: '0.28rem 0.35rem', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                                                            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>{unitLabel}</span>
                                                        </div>
                                                        {tcSub > 0 && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>= {formatCOP(tcSub)}</span>}
                                                        <button type="button" onClick={() => setItemEditModal(prev => { const tcs = prev.form.telas_cueros.filter((_, i) => i !== tcIdx); return { ...prev, form: { ...prev.form, telas_cueros: tcs } }; })}
                                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem', fontSize: '0.78rem' }} title="Quitar">
                                                            <FaTimes />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* ── COSTOS ADICIONALES (Mano de Obra, Herrajes, etc.) ── */}

                                <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.8rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>Otros Costos Adicionales (Mano de Obra, Herrajes, etc.)</span>
                                        {costosList.length > 0 && (
                                            <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: '600' }}>
                                                Total adicional: {formatCOP(costosList.reduce((s, c) => s + parseFloat(c.valor), 0))}
                                            </span>
                                        )}
                                    </div>
                                    {costosLoading ? (
                                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.3rem 0' }}>Cargando...</p>
                                    ) : costosList.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.5rem' }}>
                                            {costosList.map(c => (
                                                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', borderRadius: '6px', padding: '0.35rem 0.6rem', border: '1px solid #e2e8f0' }}>
                                                    <span style={{ flex: 1, fontSize: '0.78rem', color: '#334155' }}>{c.descripcion}</span>
                                                    <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#16a34a', whiteSpace: 'nowrap' }}>{formatCOP(c.valor)}</span>
                                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{c.fecha}</span>
                                                    <button type="button" onClick={() => handleDeleteCosto(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0 0.2rem', lineHeight: 1, fontSize: '0.9rem' }} title="Eliminar">&#x00D7;</button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 0.5rem', fontStyle: 'italic' }}>Sin costos adicionales registrados.</p>
                                    )}
                                    {/* Formulario inline para agregar */}
                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            placeholder="Descripción (ej: Tela microfibra)"
                                            value={newCosto.descripcion}
                                            onChange={e => setNewCosto(p => ({ ...p, descripcion: e.target.value }))}
                                            style={{ flex: 2, minWidth: '140px', padding: '0.3rem 0.5rem', fontSize: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontFamily: 'inherit' }}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Valor"
                                            value={newCosto.valor}
                                            onChange={e => setNewCosto(p => ({ ...p, valor: e.target.value }))}
                                            style={{ width: '100px', padding: '0.3rem 0.5rem', fontSize: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontFamily: 'inherit' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCosto}
                                            disabled={!newCosto.descripcion.trim() || !newCosto.valor}
                                            style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', opacity: (!newCosto.descripcion.trim() || !newCosto.valor) ? 0.5 : 1 }}
                                        >+ Agregar</button>
                                    </div>
                                    {/* Resumen costo total */}
                                    {(parseFloat(itemEditModal.form?.costo || 0) > 0 || costosList.length > 0) && (
                                        <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '600' }}>Costo Total Real:</span>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#15803d' }}>
                                                {formatCOP((parseFloat(itemEditModal.form?.costo || 0)) + costosList.reduce((s, c) => s + parseFloat(c.valor), 0))}
                                            </span>
                                        </div>
                                    )}
                                </div>

                            </div>{/* end form-body */}
                            <div className="inv-modal-footer">
                                <button type="button" className="btn-secondary" style={{ width: 'auto' }} onClick={closeItemEdit}>Cancelar</button>
                                <button type="submit" className="btn-primary" style={{ width: 'auto' }} disabled={itemEditModal.saving}>
                                    <FaSave /> {itemEditModal.saving ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            )}

            {/* ── MODAL: QR ──────────────────────────────────────────────────────── */}
            {qrModal.open && qrModal.item && (
                <div className="inv-overlay inv-overlay-visible" onClick={() => setQrModal({ open: false, item: null })}>
                    <div className="inv-modal inv-modal-visible" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', color: '#1e293b', fontWeight: 800, fontSize: '1.5rem' }}>Código QR</h3>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            <QRCodeSVG
                                id="qr-code-svg"
                                value={qrModal.item.qr_uuid || `item-${qrModal.item.id}`}
                                size={200}
                                level={"H"}
                                includeMargin={true}
                            />
                            </div>
                        </div>
                        <p style={{ marginTop: '1rem', fontWeight: 'bold', color: '#334155' }}>
                            {qrModal.item.prod?.nombre || 'Ítem'} (ID: {qrModal.item.id})
                        </p>
                        <div className="inv-modal-footer" style={{ justifyContent: 'center', marginTop: '2rem' }}>
                            <button className="btn-secondary" onClick={() => setQrModal({ open: false, item: null })}>Cerrar</button>
                            <button className="btn-primary" onClick={handlePrintQR}>Imprimir QR</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: TRASLADO ────────────────────────────────────────────────── */}
            {trasladoModal.open && trasladoModal.item && (
                <div className="inv-overlay inv-overlay-visible" onClick={() => setTrasladoModal({ open: false, item: null, zonaId: '', observacion: '', saving: false })}>
                    <div className="inv-modal inv-modal-visible" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="inv-modal-header">
                            <h3 style={{ margin: 0 }}>Trasladar Ítem</h3>
                            <button className="inv-modal-close" onClick={() => setTrasladoModal({ open: false, item: null, zonaId: '', observacion: '', saving: false })}>&times;</button>
                        </div>
                        <form onSubmit={handleTrasladoSubmit} style={{ padding: '1.5rem' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <strong style={{ color: '#475569' }}>Ítem:</strong> {trasladoModal.item.prod?.nombre} (ID: {trasladoModal.item.id})
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <strong style={{ color: '#475569' }}>Zona Actual:</strong> {trasladoModal.item.zona_nombre || 'No asignada'}
                            </div>

                            <div className="inv-field-group">
                                <label className="ifg-label" style={{ fontWeight: 600, color: '#334155', marginBottom: '0.4rem', display: 'block' }}>Zona Destino *</label>
                                <select className="ifg-input" required value={trasladoModal.zonaId} onChange={e => setTrasladoModal(prev => ({ ...prev, zonaId: e.target.value }))}>
                                    <option value="">Seleccione Zona...</option>
                                    {zonas.map(z => (
                                        <option key={z.id} value={z.id}>{z.sede_nombre} - {z.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="inv-field-group" style={{ marginTop: '1rem' }}>
                                <label className="ifg-label" style={{ fontWeight: 600, color: '#334155', marginBottom: '0.4rem', display: 'block' }}>Observación (Opcional)</label>
                                <textarea className="ifg-input ifg-textarea" style={{ minHeight: '80px' }}
                                    value={trasladoModal.observacion}
                                    onChange={e => setTrasladoModal(prev => ({ ...prev, observacion: e.target.value }))}
                                    placeholder="Motivo del traslado..." />
                            </div>

                            <div className="inv-modal-footer" style={{ marginTop: '2rem' }}>
                                <button type="button" className="btn-secondary" onClick={() => setTrasladoModal({ open: false, item: null, zonaId: '', observacion: '', saving: false })}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={trasladoModal.saving}>
                                    {trasladoModal.saving ? 'Trasladando...' : 'Confirmar Traslado'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* ===== TOAST NOTIFICATION ===== */}
            <div className={`inv-toast inv-toast--${toast.type}${toast.visible ? ' inv-toast--visible' : ''}`}>
                {toast.type === 'success' ? <FaCheckCircle className="inv-toast-icon" /> : <FaTimes className="inv-toast-icon" />}
                <span className="inv-toast-msg">{toast.message}</span>
                <button className="inv-toast-close" onClick={() => setToast(t => ({ ...t, visible: false }))}>
                    <FaTimes />
                </button>
            </div>
        </div>
    );
}

export default InventarioPage;
