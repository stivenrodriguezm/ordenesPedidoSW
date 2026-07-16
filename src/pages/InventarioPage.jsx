import React, { useState, useContext, useEffect } from 'react';
import API from '../services/api';
import { formatCOP } from '../utils/formatCOP';
import { exportToCSV } from '../utils/exportToCSV';
import {
    FaSearch, FaFileExport, FaTimes, FaPlus, FaImage, FaCamera, FaUpload,
    FaLayerGroup, FaEdit, FaSave, FaChevronDown, FaChevronUp,
    FaSort, FaSortUp, FaSortDown, FaTable, FaList, FaDollarSign, FaFilter
} from 'react-icons/fa';
import { AppContext } from '../AppContext';
import './InventarioPage.css';

const CATEGORY_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899',
];

function getCatColor(catId) {
    return CATEGORY_COLORS[(catId - 1) % CATEGORY_COLORS.length] || '#94a3b8';
}

const DISPONIBILIDAD_LABELS = {
    exhibicion: 'Exhibición',
    venta: 'Venta',
    consignacion: 'Consignación',
    por_despachar: 'Por Despachar',
    no_venta: 'No a la venta',
    // 'cliente' kept only for display of legacy data
    cliente: 'Cliente',
};

// Options available for selection (no legacy 'cliente')
const DISPONIBILIDAD_OPTIONS = [
    { key: 'exhibicion',    label: 'Exhibición' },
    { key: 'venta',         label: 'Venta' },
    { key: 'consignacion',  label: 'Consignación' },
    { key: 'por_despachar', label: 'Por Despachar' },
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

// ═════════════════════════════════════════════════════════════════════════════
function InventarioPage() {
    const { proveedores } = useContext(AppContext);

    // ── Data ──────────────────────────────────────────────────────────────────
    const [inventario, setInventario]           = useState([]);
    const [categorias, setCategorias]           = useState([]);
    const [subcategorias, setSubcategorias]     = useState([]);
    const [productos, setProductos]             = useState([]);
    const [ordenesPendientes, setOrdenesPendientes] = useState([]);
    const [grupos, setGrupos]                   = useState([]);
    const [isLoading, setIsLoading]             = useState(true);

    // ── Filters ───────────────────────────────────────────────────────────────
    const [filterProveedor, setFilterProveedor]         = useState('');
    const [filterSearch, setFilterSearch]               = useState('');
    const [filterCategoria, setFilterCategoria]         = useState('');
    const [filterSubcategoria, setFilterSubcategoria]   = useState('');
    const [filterDisponibilidad, setFilterDisponibilidad] = useState('');
    const [filterGrupo, setFilterGrupo]                 = useState(''); // D
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

    // ── Modal / Form ──────────────────────────────────────────────────────────
    const [showModal, setShowModal]       = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [previewImg, setPreviewImg]     = useState({ open: false, url: '' });
    const [form, setForm] = useState({
        proveedorId: '', productoId: '', categoriaId: '', subcategoriaId: '',
        variacion: '', ventaId: '', observacion: '', costo: '', costoExtra: '',
        disponibilidad: 'exhibicion', cantidad: 1, grupoId: '', imagen: null
    });

    // ── Group expand/edit ─────────────────────────────────────────────────────
    const [expandedGroups, setExpandedGroups]   = useState({});
    const [grupoEditModal, setGrupoEditModal]   = useState(null);
    const [grupoEditSaving, setGrupoEditSaving] = useState(false);

    // ── Nuevo Grupo Modal ─────────────────────────────────────────────────────
    const [nuevoGrupoModal, setNuevoGrupoModal] = useState({ open: false, nombre: '', categoriaId: '', subcategoriaId: '', descripcion: '', observacion: '', ventaId: '' });
    const [nuevoGrupoSaving, setNuevoGrupoSaving] = useState(false);

    // ── Edit Item Modal ───────────────────────────────────────────────────────
    const [itemEditModal, setItemEditModal] = useState({ open: false, item: null, form: null, saving: false });

    // ── Fetch ─────────────────────────────────────────────────────────────────
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
                    API.get('/suministros/grupos/'),
                ]);
                setInventario(invRes.data.results || invRes.data);
                setCategorias(catRes.data.results || catRes.data);
                setSubcategorias(subcatRes.data.results || subcatRes.data);
                setProductos(prodRes.data.results || prodRes.data);
                setOrdenesPendientes(ordRes.data || []);
                setGrupos(grupoRes.data.results || grupoRes.data || []);
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
            setForm({
                proveedorId: '', productoId: '', categoriaId: '', subcategoriaId: '',
                variacion: '', ventaId: '', observacion: '', costo: '', costoExtra: '',
                disponibilidad: 'exhibicion', cantidad: 1, grupoId: '', imagen: null
            });
        }, 300);
    };

    const handleField = (field, value) => {
        setForm(prev => {
            const nf = { ...prev, [field]: value };
            if (field === 'proveedorId') { nf.productoId = ''; nf.categoriaId = ''; nf.subcategoriaId = ''; }
            return nf;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.productoId) { alert('Debes seleccionar una Referencia (Producto) antes de guardar.'); return; }
        try {
            const cat = getCategoria(parseInt(form.categoriaId));
            const catPrefix = cat?.nombre ? cat.nombre.substring(0, 2).toUpperCase() : 'XX';
            let qty = parseInt(form.cantidad, 10);
            if (isNaN(qty) || qty < 1) qty = 1;
            const finalGrupoId = form.grupoId ? parseInt(form.grupoId) : null;
            const promises = [];
            for (let i = 0; i < qty; i++) {
                promises.push(API.post('/suministros/inventario/', {
                    id_referencia: `${catPrefix}${Math.floor(1000 + Math.random() * 9000)}`,
                    referencia: parseInt(form.productoId),
                    categoria: form.categoriaId ? parseInt(form.categoriaId) : null,
                    subcategoria: form.subcategoriaId ? parseInt(form.subcategoriaId) : null,
                    variacion: form.variacion,
                    costo_especifico: (parseFloat(form.costo) || 0) + (parseFloat(form.costoExtra) || 0),
                    observacion: form.observacion,
                    disponibilidad: form.disponibilidad,
                    venta: form.ventaId ? parseInt(form.ventaId) : null,
                    grupo: finalGrupoId,
                }));
            }
            await Promise.all(promises);
            const invRes = await API.get('/suministros/inventario/');
            setInventario(invRes.data.results || invRes.data);
            closeModal();
        } catch (error) {
            console.error('Error saving inventory item:', error);
            alert('Hubo un error al guardar la entrada de inventario.');
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
        } catch (e) {
            console.error('Error updating disponibilidad:', e);
            alert('Error al actualizar disponibilidad.');
        }
        setInlineEditItem(null);
    };

    // ── Group handlers ────────────────────────────────────────────────────────
    const toggleGroup = (grupoId) => setExpandedGroups(prev => ({ ...prev, [grupoId]: !prev[grupoId] }));

    const openGrupoEdit = (grupo, grupoItems) => {
        setGrupoEditModal({ 
            grupo, 
            nombre: grupo.nombre, 
            disponibilidad: '', 
            categoriaId: grupo.categoria_id || '',
            subcategoriaId: grupo.subcategoria_id || '',
            descripcion: grupo.descripcion || '',
            observacion: grupo.observacion || '',
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
            await API.post('/suministros/grupos/', payload);
            const gruRes = await API.get('/suministros/grupos/');
            setGrupos(gruRes.data.results || gruRes.data || []);
            setNuevoGrupoModal({ open: false, nombre: '', categoriaId: '', subcategoriaId: '', descripcion: '', observacion: '', ventaId: '' });
        } catch (err) {
            console.error('Error creando grupo:', err);
            alert('Error al crear el grupo.');
        } finally {
            setNuevoGrupoSaving(false);
        }
    };

    const openItemEdit = (item) => {
        setItemEditModal({
            open: true,
            item,
            saving: false,
            form: {
                variacion: item.variacion || '',
                costo: item.costo_especifico ? Math.floor(parseFloat(item.costo_especifico)) : '',
                observacion: item.observacion || '',
                disponibilidad: item.disponibilidad || 'exhibicion',
                ventaId: item.venta || '',
                grupoId: item.grupo || ''
            }
        });
    };

    const closeItemEdit = () => setItemEditModal({ open: false, item: null, form: null, saving: false });

    const saveItemEdit = async (e) => {
        e.preventDefault();
        const { item, form } = itemEditModal;
        setItemEditModal(prev => ({ ...prev, saving: true }));
        try {
            const payload = {
                variacion: form.variacion,
                costo_especifico: parseFloat(form.costo) || 0,
                observacion: form.observacion,
                disponibilidad: form.disponibilidad,
                venta: form.ventaId ? parseInt(form.ventaId) : null,
                grupo: form.grupoId ? parseInt(form.grupoId) : null
            };
            await API.patch(`/suministros/inventario/${item.dbId}/`, payload);
            setInventario(prev => prev.map(i => i.id === item.dbId ? { ...i, ...payload } : i));
            
            if (item.grupo || payload.grupo) {
                try {
                    const gruRes = await API.get('/suministros/grupos/');
                    setGrupos(gruRes.data.results || gruRes.data || []);
                } catch (e) { console.error('Error reloading groups', e); }
            }
            
            closeItemEdit();
        } catch (err) {
            console.error('Error updating item:', err);
            alert('Error al actualizar el ítem.');
            setItemEditModal(prev => ({ ...prev, saving: false }));
        }
    };

    const saveGrupoEdit = async () => {
        if (!grupoEditModal) return;
        setGrupoEditSaving(true);
        const { grupo, nombre, disponibilidad, categoriaId, subcategoriaId, descripcion, observacion, removedDbIds, addedItems, items: gItems, ventaId } = grupoEditModal;
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
            if (disponibilidad) {
                await Promise.all(gItems.map(item => API.patch(`/suministros/inventario/${item.dbId}/`, { disponibilidad })));
            }
            const [invRes, gruRes] = await Promise.all([API.get('/suministros/inventario/'), API.get('/suministros/grupos/')]);
            setInventario(invRes.data.results || invRes.data);
            setGrupos(gruRes.data.results || gruRes.data || []);
            closeGrupoEdit();
        } catch (err) {
            console.error('Error guardando grupo:', err);
            alert('Error al guardar los cambios del grupo.');
        } finally {
            setGrupoEditSaving(false);
        }
    };

    // ── Enriched items ────────────────────────────────────────────────────────
    const items = inventario.map(inv => ({
        ...inv,
        dbId: inv.id,
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
    }));

    // ── Filter ────────────────────────────────────────────────────────────────
    const filtered = items.filter(item => {
        if (filterProveedor    && item.prod?.proveedorId !== parseInt(filterProveedor)) return false;
        if (filterCategoria    && String(item.prod?.categoriaId) !== filterCategoria)  return false;
        if (filterSubcategoria && String(item.subcategoriaId) !== filterSubcategoria)  return false;
        if (filterDisponibilidad && item.disponibilidad !== filterDisponibilidad)       return false;
        if (filterGrupo === '__sin_grupo__' && item.grupoId) return false;
        if (filterGrupo && filterGrupo !== '__sin_grupo__' && String(item.grupoId) !== filterGrupo) return false;
        if (filterFechaInicio && item.fechaIngreso && item.fechaIngreso < filterFechaInicio) return false;
        if (filterFechaFin && item.fechaIngreso && item.fechaIngreso > filterFechaFin) return false;
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

    const hasFilters = filterProveedor || filterSearch || filterCategoria || filterSubcategoria || filterDisponibilidad || filterGrupo || filterFechaInicio || filterFechaFin;
    const clearFilters = () => {
        setFilterProveedor(''); setFilterSearch(''); setFilterCategoria('');
        setFilterSubcategoria(''); setFilterDisponibilidad(''); setFilterGrupo('');
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
                <td className="inv-numeric" title={inv.ventaId}>{inv.ventaId}</td>
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
                <td title={inv.variacion || ''}>{inv.variacion || <span className="empty-val">—</span>}</td>
                <td className="obs-cell-col"><ObsCell text={inv.observacion} /></td>
                {showCostoCol && (
                    <td className="inv-costo-col">
                        {inv.costo_especifico > 0 ? formatCOP(inv.costo_especifico) : <span className="empty-val">—</span>}
                    </td>
                )}
                {viewMode !== 'products_only' && (
                    <td style={{ textAlign: 'center' }}>
                        <div className="inv-group-actions" style={{ justifyContent: 'center' }}>
                            <button className="inv-group-edit-btn" title="Editar ítem"
                                onClick={e => { e.stopPropagation(); openItemEdit(inv); }}>
                                <FaEdit />
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
    const colSpan = showCostoCol ? 13 : 12;

    const renderTableBody = () => {
        if (isLoading) {
            return <tr><td colSpan={colSpan}><div className="loading-container"><div className="loader"></div></div></td></tr>;
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

            rows.push(
                <tr key={`grupo-${grupoId}`} className="inv-group-header-row" onClick={() => toggleGroup(grupoId)}>
                    <td><span className="inv-group-id-badge">G{String(grupoId).padStart(3, '0')}</span></td>
                    <td className="empty-val">—</td><td className="empty-val">—</td><td className="empty-val">—</td>
                    <td>
                        {dispUni
                            ? <span className={`disp-badge disp-${dispUni}`}>{DISPONIBILIDAD_LABELS[dispUni]}</span>
                            : <span className="disp-badge inv-disp-mixto">Mixto</span>}
                    </td>
                    <td className="empty-val">—</td>
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
                    <td>
                        <span className="inv-group-count-pill" style={{ marginLeft: 0 }}>{gItems.length} ítem{gItems.length !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="empty-val">—</td>
                    {showCostoCol && (
                        <td className="inv-costo-col" style={{ fontWeight: 700, color: '#1e293b' }}>
                            {formatCOP(parseFloat(grupoObj.costo_total) || 0)}
                        </td>
                    )}
                    <td style={{ textAlign: 'center' }}>
                        <div className="inv-group-actions">
                            <button className="inv-group-edit-btn" title="Editar grupo"
                                onClick={e => { e.stopPropagation(); openGrupoEdit(grupoObj, gItems); }}>
                                <FaEdit />
                            </button>
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
                        <button className={`v-btn-ghost ${showFiltersMenu ? 'active' : ''}`} onClick={() => setShowFiltersMenu(!showFiltersMenu)}>
                            <FaFilter /> Filtros {(hasFilters && !filterSearch) ? '*' : ''}
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
                                        <label>Grupo</label>
                                        <select value={filterGrupo} onChange={e => setFilterGrupo(e.target.value)}>
                                            <option value="">Todos</option>
                                            <option value="__sin_grupo__">Sin grupo</option>
                                            {grupos.filter(g => g.activo !== false).map(g => (
                                                <option key={g.id} value={g.id}>G{String(g.id).padStart(3, '0')} — {g.nombre}</option>
                                            ))}
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
                    <button
                        className={`v-btn-ghost${showCostoCol ? ' v-btn-ghost--active' : ''}`}
                        onClick={() => setShowCostoCol(v => !v)}
                        title={showCostoCol ? 'Ocultar costos' : 'Mostrar costos'}
                    >
                        <FaDollarSign />
                    </button>

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
                        <table className={`inventario-table${showCostoCol ? ' inv-table-with-cost' : ''}${viewMode === 'products_only' ? ' inv-table-products-only' : ''}${viewMode === 'groups_only' ? ' inv-table-groups-only' : ''}`}>
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
                                    {sortTh('variacion', 'Variación', 'col-var')}
                                    {sortTh('observacion', 'Observación', 'col-obs')}
                                    {showCostoCol && sortTh('costo_especifico', 'Costo', 'col-costo')}
                                    {viewMode !== 'products_only' && <th className="col-acc"></th>}
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
                                            <label className="ifg-label">Costo Base</label>
                                            <div className="ifg-input-prefix">
                                                <span>$</span>
                                                <input type="text" className="ifg-input-raw" value={form.costo} onChange={e => handleField('costo', e.target.value)} placeholder="0.00" />
                                            </div>
                                        </div>
                                        <div className="ifg-group">
                                            <label className="ifg-label">Costo Adicional <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
                                            <div className="ifg-input-prefix">
                                                <span>$</span>
                                                <input type="text" className="ifg-input-raw" value={form.costoExtra} onChange={e => handleField('costoExtra', e.target.value)} placeholder="0.00" />
                                            </div>
                                        </div>
                                        <div className="ifg-group">
                                            <label className="ifg-label">Disponibilidad</label>
                                            <select className="ifg-input" value={form.disponibilidad} onChange={e => handleField('disponibilidad', e.target.value)}>
                                                {DISPONIBILIDAD_OPTIONS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
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
                                            <select className="ifg-input" value={form.grupoId || ''} onChange={e => handleField('grupoId', e.target.value)}>
                                                <option value="">Sin grupo (individual)</option>
                                                {grupos.filter(g => g.activo !== false).map(g => (
                                                    <option key={g.id} value={g.id}>G{String(g.id).padStart(3, '0')} — {g.nombre}</option>
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
                                <button type="submit" className="btn-primary" style={{ width: 'auto' }}><FaPlus /> Guardar Entrada</button>
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
                            <button type="button" className="btn-primary" style={{ width: 'auto' }}
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

                        <div className="inv-grupo-edit-body">
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
                                <label className="ifg-label">Observación</label>
                                <textarea className="ifg-input ifg-textarea"
                                    value={grupoEditModal.observacion || ''}
                                    onChange={e => setGrupoEditModal(prev => ({ ...prev, observacion: e.target.value }))}
                                    placeholder="Notas del grupo..." style={{ minHeight: '60px' }} />
                            </div>

                            <div className="inv-grupo-field">
                                <label className="ifg-label">Venta asociada <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
                                <select className="ifg-input"
                                    value={grupoEditModal.ventaId || ''}
                                    onChange={e => setGrupoEditModal(prev => ({ ...prev, ventaId: e.target.value }))}>
                                    <option value="">Ninguna venta asociada</option>
                                    {ordenesPendientes.map(id => <option key={id} value={id}>{id}</option>)}
                                </select>
                            </div>

                            <div className="inv-grupo-field">
                                <label className="ifg-label">
                                    Cambiar disponibilidad de <strong>todos</strong> los ítems
                                    <span style={{ color: '#94a3b8', fontWeight: 400 }}> (opcional)</span>
                                </label>
                                <select className="ifg-input"
                                    value={grupoEditModal.disponibilidad}
                                    onChange={e => setGrupoEditModal(prev => ({ ...prev, disponibilidad: e.target.value }))}>
                                    <option value="">Sin cambio</option>
                                    {DISPONIBILIDAD_OPTIONS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
                                </select>
                            </div>

                            <div className="inv-grupo-section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Ítems en el grupo ({grupoEditModal.items.length})</span>
                                {showCostoCol && (
                                    <span style={{ background: '#f1f5f9', color: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                                        Costo Total: {formatCOP(grupoEditModal.items.reduce((acc, curr) => acc + (parseFloat(curr.costo_especifico) || 0), 0))}
                                    </span>
                                )}
                            </div>
                            <div className="inv-grupo-items-list">
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
                                    <div className="inv-grupo-section-label" style={{ marginTop: '1rem' }}>Agregar ítems sin grupo</div>
                                    <div className="inv-grupo-add-list">
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
                            <button type="button" className="btn-primary" style={{ width: 'auto' }}
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
                            <div className="inv-grupo-edit-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="inv-grupo-field">
                                    <label className="ifg-label">Variación</label>
                                    <input type="text" className="ifg-input"
                                        value={itemEditModal.form.variacion}
                                        onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, variacion: e.target.value } }))}
                                        placeholder="Ej: Color, tamaño..." />
                                </div>
                                <div className="inv-grupo-field">
                                    <label className="ifg-label">Costo</label>
                                    <div className="ifg-input-prefix" style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #cbd5e1', borderRadius: '6px', background: 'white' }}>
                                        <span style={{ padding: '0 0.5rem', color: '#64748b' }}>$</span>
                                        <input type="text" className="ifg-input-raw" style={{ flex: 1, border: 'none', padding: '0.4rem', outline: 'none' }}
                                            value={itemEditModal.form.costo}
                                            onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, costo: e.target.value } }))}
                                            placeholder="0.00" />
                                    </div>
                                </div>
                                <div className="inv-grupo-field">
                                    <label className="ifg-label">Disponibilidad</label>
                                    <select className="ifg-input"
                                        value={itemEditModal.form.disponibilidad}
                                        onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, disponibilidad: e.target.value } }))}>
                                        {DISPONIBILIDAD_OPTIONS.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
                                    </select>
                                </div>
                                <div className="inv-grupo-field">
                                    <label className="ifg-label">Venta Asignada</label>
                                    <select className="ifg-input"
                                        value={itemEditModal.form.ventaId}
                                        onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, ventaId: e.target.value } }))}>
                                        <option value="">Ninguna</option>
                                        {ordenesPendientes.map(id => <option key={id} value={id}>{id}</option>)}
                                    </select>
                                </div>
                                <div className="inv-grupo-field" style={{ gridColumn: 'span 2' }}>
                                    <label className="ifg-label">Grupo</label>
                                    <select className="ifg-input"
                                        value={itemEditModal.form.grupoId}
                                        onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, grupoId: e.target.value } }))}>
                                        <option value="">Ninguno (individual)</option>
                                        {grupos.filter(g => g.activo !== false).map(g => (
                                            <option key={g.id} value={g.id}>G{String(g.id).padStart(3, '0')} — {g.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="inv-grupo-field" style={{ gridColumn: 'span 2' }}>
                                    <label className="ifg-label">Observación</label>
                                    <textarea className="ifg-input ifg-textarea" style={{ minHeight: '60px' }}
                                        value={itemEditModal.form.observacion}
                                        onChange={e => setItemEditModal(prev => ({ ...prev, form: { ...prev.form, observacion: e.target.value } }))}
                                        placeholder="Notas adicionales..." />
                                </div>
                            </div>
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

        </div>
    );
}

export default InventarioPage;
