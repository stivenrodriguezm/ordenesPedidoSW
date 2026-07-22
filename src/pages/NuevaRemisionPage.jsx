import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfWeek, addDays, addWeeks, subDays, subWeeks, format, isSameDay, startOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import API from '../services/api';
import { formatCOP } from '../utils/formatCOP';
import { generateRemisionPDF } from '../utils/generateRemisionPDF';
import { FaPlus, FaSearch, FaChevronDown, FaChevronUp, FaTimes, FaClock, FaImage, FaEdit, FaList, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { AppContext, usePermissions } from '../AppContext';
import './RemisionesPage.css';

const ESTADO_LABELS = {
    creada: 'Creada',
    despachada: 'Despachada',
    finalizada: 'Finalizada',
    anulada: 'Anulada',
    devuelta: 'Devuelta',
};

const METODOS_PAGO = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'datafono', label: 'Datáfono' },
    { value: 'pagado', label: 'Pagado' },
    { value: 'otro', label: 'Otro' },
];

// Transportadores y Vendedores se cargan dinámicamente desde la API
// en el estado `transportadores` y `vendedores` del componente.

function generateId(list) {
    let id;
    const existing = new Set(list.map(r => r.id));
    do { id = Math.floor(1000 + Math.random() * 9000); } while (existing.has(id));
    return id;
}

function formatDate(dtStr) {
    if (!dtStr) return '—';
    const parts = dtStr.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    const d = new Date(dtStr);
    if (isNaN(d)) return dtStr;
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Helper functions will be bound inside the component scope

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
function getCatColor(catId) { return CATEGORY_COLORS[(catId - 1) % CATEGORY_COLORS.length]; }

const emptyForm = () => ({
    fechaEntrega: '',
    horaDesde: '08:00',
    horaHasta: '12:00',
    direccionEntrega: '',
    ciudad: 'Bogotá',
    barrio: '',
    ordenId: '',
    observacion: '',
    sinSaldo: false,
    saldo: '',
    saldoDisplay: '',
    metodoPago: '',
    transportadorUsuario: '', // ForeignKey ID
    transportador: '',        // String fallback
    vendedor: '',
    sharedSellersInfo: '',
    inventarioIds: [],
});

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
            title={text}
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


function NuevaRemisionPage() {
    const { proveedores, usuario, notify } = useContext(AppContext);
    const hasPermission = usePermissions();
    const navigate = useNavigate();
    const role              = usuario?.role;
    const isTransportador   = role === 'transportador';
    const isAuxiliar        = role === 'auxiliar';
    const isAdmin           = role === 'administrador' || role === 'admin';
    const canEditRemision   = isTransportador || isAuxiliar || isAdmin;

    // Edit modal state (for transportador)
    const [editModal, setEditModal] = useState({ open: false, remision: null });
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editForm, setEditForm] = useState({ estado: '', nota_transportador: '', costo_entrega: '', costo_display: '' });
    const [editSaving, setEditSaving] = useState(false);
    
    const [remisiones, setRemisiones] = useState([]);
    const [inventario, setInventario] = useState([]);
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [grupos, setGrupos] = useState([]);
    
    // Adicional: state for dropdowns
    const [ordenesPendientes, setOrdenesPendientes] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [transportadores, setTransportadores] = useState([]);

    const [showModal, setShowModal] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [sugeridoSaldo, setSugeridoSaldo] = useState(null);
    const [loadingSugeridoSaldo, setLoadingSugeridoSaldo] = useState(false);
    const [invSearch, setInvSearch] = useState('');
    const [qrInput, setQrInput] = useState('');
    const [expandedGroups, setExpandedGroups] = useState({});
    const [colCatFilter, setColCatFilter] = useState('');
    const [colSubcatFilter, setColSubcatFilter] = useState('');
    const [colProvFilter, setColProvFilter] = useState('');
    const [colCatOpen, setColCatOpen] = useState(false);
    const [colSubcatOpen, setColSubcatOpen] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    const [previewImg, setPreviewImg] = useState({ open: false, url: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Toast notification
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const toastTimerRef = useRef(null);

    const showToast = useCallback((message, type = 'success') => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ visible: true, message, type });
        toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 4000);
    }, []);

    const [inventarioLoaded, setInventarioLoaded] = useState(false);
    const [inventarioLoading, setInventarioLoading] = useState(false);

    // Efecto Inicial: Validar Permisos y Cargar Datos Base
    useEffect(() => {
        if (!hasPermission('CREAR_REMISION')) {
            notify('No tienes permiso para crear remisiones', 'error');
            navigate('/remisiones');
            return;
        }
        
        // 1. Obtener Sede por defecto
        const defaultSedeStr = localStorage.getItem('defaultSede');

        const fetchAll = async () => {
            setIsLoading(true);
            try {
                const safeGet = (url) => API.get(url).catch(err => {
                    console.warn(`Request failed for ${url}:`, err);
                    return { data: { results: [], data: [] } };
                });

                // Only load what's needed for the table view — inventario is lazy-loaded when modal opens
                const [ordRes, vendRes, transpRes] = await Promise.all([
                    
                    safeGet('/get-pendientes-ids/'),
                    safeGet('/vendedores/'),
                    safeGet('/transportadores/'),
                ]);
                

                setOrdenesPendientes(Array.isArray(ordRes.data) ? ordRes.data : []);
                setVendedores(Array.isArray(vendRes.data) ? vendRes.data : []);
                setTransportadores(Array.isArray(transpRes.data) ? transpRes.data : []);
            } catch (error) {
                console.error("Error fetching remisiones:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, []);

    // Lazy load inventario only when creating a new remision
    const loadInventarioData = async () => {
        if (inventarioLoaded) return;
        setInventarioLoading(true);
        try {
            const safeGet = (url) => API.get(url).catch(err => {
                console.warn(`Request failed for ${url}:`, err);
                return { data: { results: [], data: [] } };
            });
            const [invRes, prodRes, catRes, subRes, grupoRes] = await Promise.all([
                safeGet('/suministros/inventario/'),
                safeGet('/referencias/'),
                safeGet('/suministros/categorias/'),
                safeGet('/suministros/subcategorias/'),
                safeGet('/suministros/grupos/'),
            ]);
            const rawInv = invRes.data?.results || invRes.data || [];
            setInventario(Array.isArray(rawInv) ? rawInv.map(inv => ({
                ...inv,
                id: inv.id_referencia,
                productoId: inv.referencia,
                subcategoriaId: inv.subcategoria,
            })) : []);
            const rawProd = prodRes.data?.results || prodRes.data || [];
            setProductos(Array.isArray(rawProd) ? rawProd.map(p => ({
                ...p,
                categoriaId: p.categoria,
                subcategoriaId: p.subcategoria,
                proveedorId: p.proveedor
            })) : []);
            setCategorias(catRes.data.results || catRes.data || []);
            setSubcategorias(subRes.data.results || subRes.data || []);
            setGrupos(grupoRes.data.results || grupoRes.data || []);
            setInventarioLoaded(true);
        } catch (err) {
            console.error('Error loading inventario:', err);
        } finally {
            setInventarioLoading(false);
        }
    };

    const nextScope = () => {
        if (calendarViewType === 'day') setFocusedDate(prev => addDays(prev, 1));
        else setFocusedDate(prev => addWeeks(prev, 1));
    };
    const prevScope = () => {
        if (calendarViewType === 'day') setFocusedDate(prev => subDays(prev, 1));
        else setFocusedDate(prev => subWeeks(prev, 1));
    };

    const goToday = () => setFocusedDate(new Date());

    const INVENTARIO = inventario;
    const PRODUCTOS = productos;
    const CATEGORIAS = categorias;
    const SUBCATEGORIAS = subcategorias;

    const getProducto = id => PRODUCTOS.find(p => p.id == id);
    const getCategoria = id => CATEGORIAS.find(c => c.id == id);
    const getSubcategoria = id => SUBCATEGORIAS.find(s => s.id == id);


    const handleField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSaldoChange = e => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setForm(prev => ({
            ...prev,
            saldo: raw,
            saldoDisplay: raw ? formatCOP(parseInt(raw, 10)).replace('$', '') : '',
        }));
    };

    const handleSinSaldoToggle = () => {
        setForm(prev => ({
            ...prev,
            sinSaldo: !prev.sinSaldo,
            saldo: prev.sinSaldo ? prev.saldo : '',
            saldoDisplay: prev.sinSaldo ? prev.saldoDisplay : '',
            metodoPago: prev.sinSaldo ? prev.metodoPago : '',
        }));
    };

    const toggleInventarioItem = invId => {
        setForm(prev => {
            const selected = prev.inventarioIds.includes(invId)
                ? prev.inventarioIds.filter(id => id !== invId)
                : [...prev.inventarioIds, invId];
            return { ...prev, inventarioIds: selected };
        });
    };

    const toggleExpandGrupo = (grupoId) => {
        setExpandedGroups(prev => ({ ...prev, [grupoId]: !prev[grupoId] }));
    };

    // Add all available items of a group (those not already in another remision dispatch)
    const selectGrupo = (grupo) => {
        const grupoItemIds = inventario
            .filter(inv => inv.grupo_id === grupo.id && !['por_despachar', 'cliente'].includes(inv.disponibilidad))
            .map(inv => inv.id);

        if (grupoItemIds.length === 0) {
            showToast(`El grupo "${grupo.nombre}" no tiene ítems disponibles en inventario.`, 'error');
            return;
        }

        setForm(prev => {
            // Check if ALL are already selected → deselect all
            const allSelected = grupoItemIds.every(id => prev.inventarioIds.includes(id));
            const newIds = allSelected
                ? prev.inventarioIds.filter(id => !grupoItemIds.includes(id))
                : [...new Set([...prev.inventarioIds, ...grupoItemIds])];
            return { ...prev, inventarioIds: newIds };
        });

        const alreadySelected = grupoItemIds.every(id => form.inventarioIds.includes(id));
        if (!alreadySelected) {
            const partialCount = inventario.filter(inv =>
                inv.grupo_id === grupo.id
            ).length;
            if (grupoItemIds.length < partialCount) {
                showToast(
                    `Grupo "${grupo.nombre}" agregado parcialmente: ${grupoItemIds.length} de ${partialCount} ítems disponibles.`,
                    'warning'
                );
            } else {
                showToast(`Grupo "${grupo.nombre}" agregado: ${grupoItemIds.length} ítem${grupoItemIds.length !== 1 ? 's' : ''}.`, 'success');
            }
        }
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        const payload = {
            fecha_entrega: form.fechaEntrega || null,
            hora_desde: form.horaDesde || null,
            hora_hasta: form.horaHasta || null,
            direccion_entrega: form.direccionEntrega,
            ciudad: form.ciudad,
            barrio: form.barrio,
            orden_asociada: form.ordenId && form.ordenId !== 'sin_orden' ? parseInt(form.ordenId) : null,
            estado: 'creada',
            sin_saldo: form.sinSaldo,
            saldo: form.sinSaldo ? 0 : (parseFloat(form.saldo) || 0),
            metodo_pago: form.sinSaldo ? '' : form.metodoPago,
            transportador_usuario: form.transportadorUsuario && form.transportadorUsuario !== '__otro__' ? parseInt(form.transportadorUsuario) : null,
            transportador: form.transportadorUsuario === '__otro__' ? (form.transportador || '') : '',
            vendedor: form.vendedor ? parseInt(form.vendedor) : null,
            observacion: form.observacion,
            cliente_nombre: 'Cliente Nuevo',
            inventario_items: form.inventarioIds,
        };

        try {
            const createRes = await API.post('/suministros/remisiones/', payload);
            const newRemision = createRes.data;
            const newId = newRemision?.id;

            // Run all fetching operations in parallel to optimize loading time
            const [remRes, invRes, detailRes] = await Promise.all([
                API.get('/suministros/remisiones/'),
                API.get('/suministros/inventario/'),
                newId ? API.get(`/suministros/remisiones/${newId}/`).catch(err => {
                    console.warn('No se pudo obtener detalle completo de la remisión:', err);
                    return null;
                }) : Promise.resolve(null)
            ]);

            // Process Remisiones
            const rawRemisiones = remRes.data.results || remRes.data;
            const formattedRem = rawRemisiones.map(r => ({
                ...r,
                fechaCreacion: r.fecha_creacion,
                fechaEntrega: r.fecha_entrega,
                horaDesde: r.hora_desde,
                horaHasta: r.hora_hasta,
                direccionEntrega: r.direccion_entrega,
                ordenAsociadaId: r.orden_asociada,
                sinSaldo: r.sin_saldo,
                metodoPago: r.metodo_pago,
                clienteNombre: r.cliente_nombre || 'Cliente Nuevo',
                vendedor: r.vendedor_nombre || r.vendedor,
                transportador_display: r.transportador_usuario_nombre || r.transportador,
                inventarioIds: r.inventario_items || [],
                inventarioDetalle: r.inventario_items_detalle || [],
            }));
            setRemisiones(formattedRem);

            // Process Inventario
            const rawInv = invRes.data.results || invRes.data;
            setInventario(rawInv.map(inv => ({
                ...inv,
                id: inv.id_referencia,
                productoId: inv.referencia,
                subcategoriaId: inv.subcategoria,
            })));

            // Prepare Remission Details for PDF
            let createdRemFull = detailRes ? detailRes.data : (formattedRem.find(r => r.id === newId) || newRemision);

            const pdfItems =
                createdRemFull?.inventario_items_detalle?.length
                    ? createdRemFull.inventario_items_detalle
                    : createdRemFull?.inventarioDetalle?.length
                        ? createdRemFull.inventarioDetalle
                        : (createdRemFull?.inventario_items || createdRemFull?.inventarioIds || []).map(id => ({ id_referencia: id }));

            // Generar y descargar PDF asynchronously (non-blocking)
            generateRemisionPDF(createdRemFull, pdfItems).catch(pdfErr => {
                console.warn('PDF generation error:', pdfErr);
            });

            navigate('/suministros/remisiones');
            showToast('¡Remisión creada exitosamente! El PDF se descargará en un momento.', 'success');

        } catch (error) {
            console.error('Error creating remision:', error);
            showToast('Error al crear la remisión. Verifica los datos e intenta de nuevo.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Selected items derived
    const selectedItems = form.inventarioIds.map(invId => {
        const inv = INVENTARIO.find(i => i.id === invId);
        if (!inv) return null;
        const prod = getProducto(inv.productoId);
        const cat = prod ? getCategoria(prod.categoriaId) : null;
        const subcat = inv.subcategoriaId ? getSubcategoria(inv.subcategoriaId) : null;
        return { invId, nombre: prod?.nombre || `Ítem #${invId}`, cat: cat?.nombre, subcat: subcat?.nombre, variacion: inv.variacion };
    }).filter(Boolean);

    // Inventory search filter — searches by id, referencia (product name), venta
    let filteredInventario = useMemo(() => {
        const filtered = inventario.filter(inv => {
            if (inv.disponibilidad === 'por_despachar') return false;
            
            if (!form.ordenId) return false;

            if (form.ordenId === 'sin_orden') {
                if (inv.venta) return false;
            } else {
                if (String(inv.venta) === String(form.ordenId)) {
                    // allowed
                } else if (!inv.venta && (inv.disponibilidad === 'exhibicion' || inv.disponibilidad === 'consignacion')) {
                    // allowed
                } else {
                    return false;
                }
            }

            if (colCatFilter) {
                const prod = productos.find(p => p.id === inv.productoId);
                if (!prod || String(prod.categoria) !== colCatFilter) return false; // assuming getProducto logic was needed
            }
            if (colSubcatFilter && String(inv.subcategoriaId) !== colSubcatFilter) return false;
            if (colProvFilter) {
                const prod = productos.find(p => p.id === inv.productoId);
                if (!prod || String(prod.proveedorId) !== colProvFilter) return false;
            }
            if (!invSearch) return true;
            const q = invSearch.toLowerCase();
            const prod = productos.find(p => p.id === inv.productoId);
            return (
                String(inv.id).toLowerCase().includes(q) ||
                prod?.nombre?.toLowerCase().includes(q) ||
                String(inv.venta || '').toLowerCase().includes(q)
            );
        });

        filtered.sort((a, b) => {
            if (form.ordenId && form.ordenId !== 'sin_orden') {
                const aMatches = String(a.venta) === String(form.ordenId);
                const bMatches = String(b.venta) === String(form.ordenId);
                if (aMatches && !bMatches) return -1;
                if (!aMatches && bMatches) return 1;
            }
            return 0;
        });

        return filtered;
    }, [inventario, form.ordenId, colCatFilter, colSubcatFilter, colProvFilter, invSearch, productos]);

    // Group filtered items
    const groupedInventario = useMemo(() => {
        const groups = {};
        const ungrouped = [];
        
        filteredInventario.forEach(inv => {
            if (inv.grupo_id) {
                if (!groups[inv.grupo_id]) {
                    groups[inv.grupo_id] = {
                        grupo: grupos.find(g => g.id === inv.grupo_id),
                        items: []
                    };
                }
                groups[inv.grupo_id].items.push(inv);
            } else {
                ungrouped.push(inv);
            }
        });
        
        const validGroups = Object.values(groups).filter(g => g.grupo);
        return { groups: validGroups, ungrouped };
    }, [filteredInventario, grupos]);

    const groupedSelectedInventario = useMemo(() => {
        const selectedInv = inventario.filter(inv => form.inventarioIds.includes(inv.id));
        const groups = {};
        const ungrouped = [];
        
        selectedInv.forEach(inv => {
            if (inv.grupo_id) {
                if (!groups[inv.grupo_id]) {
                    groups[inv.grupo_id] = {
                        grupo: grupos.find(g => g.id === inv.grupo_id),
                        items: []
                    };
                }
                groups[inv.grupo_id].items.push(inv);
            } else {
                ungrouped.push(inv);
            }
        });
        
        const validGroups = Object.values(groups).filter(g => g.grupo);
        return { groups: validGroups, ungrouped };
    }, [inventario, form.inventarioIds, grupos]);

    const [expandedSelectedGroups, setExpandedSelectedGroups] = useState({});
    const toggleExpandSelectedGrupo = (groupId) => {
        setExpandedSelectedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const colSubcatOptions = useMemo(() => colCatFilter
        ? subcategorias.filter(s => String(s.categoria) === colCatFilter) // using state 'subcategorias'
        : subcategorias, [colCatFilter, subcategorias]);

    const handleQRScan = async (e) => {

        if (!qrInput.trim()) return;
        try {
            const res = await API.get(`/suministros/inventario/por-qr/?qr=${qrInput.trim()}`);
            const item = res.data;
            if (item && item.id) {
                setForm(prev => {
                    if (!prev.inventarioIds.includes(item.id)) {
                        return { ...prev, inventarioIds: [...prev.inventarioIds, item.id] };
                    }
                    return prev;
                });
                setInventario(prev => {
                    if (!prev.find(i => i.id === item.id)) {
                        return [...prev, item];
                    }
                    return prev;
                });
                setQrInput('');
            }
        } catch (err) {
            showToast('Ítem no encontrado por QR', 'error');
        }
    };

    useEffect(() => {
        loadInventarioData();
    }, []);
    const renderTableBody = (groupedData, expandedState, toggleExpandFn) => {
        return (
            <tbody>
                {groupedData.groups.map(groupData => {
                    const { grupo, items } = groupData;
                    const isExpanded = expandedState[grupo.id];
                    
                    const allSelected = items.length > 0 && items.every(inv => form.inventarioIds.includes(inv.id));
                    const someSelected = items.some(inv => form.inventarioIds.includes(inv.id));
                    
                    const catIds = [...new Set(items.map(inv => {
                        const prod = getProducto(inv.productoId);
                        return inv.categoria || prod?.categoriaId;
                    }).filter(Boolean))];
                    
                    const subcatIds = [...new Set(items.map(inv => inv.subcategoriaId).filter(Boolean))];
                    
                    const provIds = [...new Set(items.map(inv => {
                        const prod = getProducto(inv.productoId);
                        return prod?.proveedorId || prod?.proveedor;
                    }).filter(Boolean))];
                    
                    const firstCatId = catIds[0];
                    const firstCat = firstCatId ? getCategoria(firstCatId) : null;
                    const firstCatColor = firstCatId ? getCatColor(firstCatId) : '#94a3b8';
                    
                    const firstSubcatId = subcatIds[0];
                    const firstSubcat = firstSubcatId ? getSubcategoria(firstSubcatId) : null;
                    
                    const firstProvId = provIds[0];
                    const firstProvNombre = firstProvId ? proveedores?.find(p => p.id == firstProvId)?.nombre_empresa : null;
                    
                    const ventaIds = [...new Set(items.map(inv => inv.venta).filter(Boolean))];
                    const groupVenta = ventaIds.length === 1 ? ventaIds[0] : ventaIds.length > 1 ? 'Varias' : '—';
                    
                    return (
                        <React.Fragment key={`group-${grupo.id}`}>
                            <tr className="rem-inv-group-row" onClick={() => toggleExpandFn(grupo.id)}>
                                <td>
                                    <input 
                                        type="checkbox" 
                                        checked={allSelected} 
                                        ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            selectGrupo(grupo);
                                        }}
                                        onClick={e => e.stopPropagation()}
                                        className="inv-checkbox" 
                                    />
                                </td>
                                <td>
                                    <span className="inv-id-badge" style={{ backgroundColor: '#e2e8f0', color: '#475569' }}>
                                        G-{grupo.id}
                                    </span>
                                </td>
                                <td className="inv-nombre">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <strong style={{ color: '#0f172a' }}>{grupo.nombre}</strong>
                                        <span className="inv-count-badge inv-count--ok">{items.length} ítems disp.</span>
                                    </div>
                                </td>
                                <td>
                                    {catIds.length === 1 && firstCat ? (
                                        <span className="cat-badge" style={{ '--cat-color': firstCatColor }}>{firstCat.nombre}</span>
                                    ) : catIds.length > 1 ? (
                                        <span className="cat-badge" style={{ '--cat-color': '#64748b' }}>Varias</span>
                                    ) : null}
                                </td>
                                <td title={firstSubcat?.nombre || ''}>
                                    {subcatIds.length === 1 && firstSubcat ? firstSubcat.nombre : subcatIds.length > 1 ? 'Varias' : '—'}
                                </td>
                                <td className="inv-nombre">
                                    {provIds.length === 1 && firstProvNombre ? firstProvNombre : provIds.length > 1 ? 'Varios' : '—'}
                                </td>
                                <td className="obs-cell-col" style={{ color: '#94a3b8' }}>—</td>
                                <td>{groupVenta}</td>
                                <td className="obs-cell-col">
                                    <ObsCell text={grupo.descripcion || grupo.observacion || ''} />
                                </td>
                                <td style={{ textAlign: 'center', color: '#64748b' }}>
                                    {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                                </td>
                            </tr>
                            {isExpanded && items.map(inv => {
                                const prod = getProducto(inv.productoId);
                                const catId = inv.categoria || prod?.categoriaId;
                                const cat = getCategoria(catId);
                                const subcat = getSubcategoria(inv.subcategoriaId);
                                const color = catId ? getCatColor(catId) : '#94a3b8';
                                const provNombre = proveedores?.find(p => p.id == (prod?.proveedorId || prod?.proveedor))?.nombre_empresa || '—';
                                const checked = form.inventarioIds.includes(inv.id);
                                return (
                                    <tr key={inv.id}
                                        className={`rem-inv-row rem-inv-child-row${checked ? ' rem-inv-row-selected' : ''}`}
                                        onClick={() => toggleInventarioItem(inv.id)}>
                                        <td>
                                            <input type="checkbox" checked={checked}
                                                onChange={() => toggleInventarioItem(inv.id)}
                                                onClick={e => e.stopPropagation()}
                                                className="inv-checkbox" />
                                        </td>
                                        <td><span className="inv-id-badge">{inv.id_referencia || inv.id}</span></td>
                                        <td className="inv-nombre">{prod?.nombre || '—'}</td>
                                        <td title={cat?.nombre || ''}>
                                            {cat && <span className="cat-badge" style={{ '--cat-color': color }}>{cat.nombre}</span>}
                                        </td>
                                        <td title={subcat?.nombre || ''}>{subcat?.nombre || '—'}</td>
                                        <td className="inv-nombre">{provNombre}</td>
                                        <td className="obs-cell-col">
                                            <ObsCell text={inv.variacion} />
                                        </td>
                                        <td>{inv.venta || '—'}</td>
                                        <td className="obs-cell-col">
                                            <ObsCell text={inv.observacion} />
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {inv.imagen
                                                ? <button type="button" className="btn-view-img" onClick={e => { e.stopPropagation(); setPreviewImg({ open: true, url: inv.imagen }); }} title="Ver imagen"><FaImage /></button>
                                                : <span className="empty-val">—</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </React.Fragment>
                    );
                })}

                {groupedData.ungrouped.map(inv => {
                    const prod = getProducto(inv.productoId);
                    const catId = inv.categoria || prod?.categoriaId;
                    const cat = getCategoria(catId);
                    const subcat = getSubcategoria(inv.subcategoriaId);
                    const color = catId ? getCatColor(catId) : '#94a3b8';
                    const provNombre = proveedores?.find(p => p.id == (prod?.proveedorId || prod?.proveedor))?.nombre_empresa || '—';
                    const checked = form.inventarioIds.includes(inv.id);
                    return (
                        <tr key={inv.id}
                            className={`rem-inv-row${checked ? ' rem-inv-row-selected' : ''}`}
                            onClick={() => toggleInventarioItem(inv.id)}>
                            <td>
                                <input type="checkbox" checked={checked}
                                    onChange={() => toggleInventarioItem(inv.id)}
                                    onClick={e => e.stopPropagation()}
                                    className="inv-checkbox" />
                            </td>
                            <td><span className="inv-id-badge">{inv.id_referencia || inv.id}</span></td>
                            <td className="inv-nombre">{prod?.nombre || '—'}</td>
                            <td title={cat?.nombre || ''}>
                                {cat && <span className="cat-badge" style={{ '--cat-color': color }}>{cat.nombre}</span>}
                            </td>
                            <td title={subcat?.nombre || ''}>{subcat?.nombre || '—'}</td>
                            <td className="inv-nombre">{provNombre}</td>
                            <td className="obs-cell-col">
                                <ObsCell text={inv.variacion} />
                            </td>
                            <td>{inv.venta || '—'}</td>
                            <td className="obs-cell-col">
                                <ObsCell text={inv.observacion} />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                {inv.imagen
                                    ? <button type="button" className="btn-view-img" onClick={e => { e.stopPropagation(); setPreviewImg({ open: true, url: inv.imagen }); }} title="Ver imagen"><FaImage /></button>
                                    : <span className="empty-val">—</span>}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        );
    };

    if (isLoading) {
        return (
            <div className="page-container" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: '#64748b' }}>
                    <FaSpinner className="spin-icon" style={{ fontSize: '2.5rem' }} />
                    <span style={{ fontSize: '1.2rem', fontWeight: '500' }}>Cargando información...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ padding: '2rem' }}>
            <div className={`rem-toast rem-toast--${toast.type}${toast.visible ? ' rem-toast--visible' : ''}`}>
                {toast.type === 'success'
                    ? <FaCheckCircle className="rem-toast-icon" />
                    : <FaTimes className="rem-toast-icon" />
                }
                <span className="rem-toast-msg">{toast.message}</span>
                <button className="rem-toast-close" onClick={() => setToast(t => ({ ...t, visible: false }))}>
                    <FaTimes />
                </button>
            </div>

            <div className="rem-modal rem-modal-visible" style={{ position: 'relative', width: '100%', maxWidth: '1200px', margin: '0 auto', maxHeight: 'none', display: 'flex', flexDirection: 'column', overflow: 'visible', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                        <form onSubmit={handleSubmit} className="rem-form">
                            {/* ── SCROLLABLE BODY ── */}
                            <div className="rem-form-body">

                                {/* Información General */}
                                <div className="rem-section">
                                    <div className="rem-section-title">Información General</div>
                                    <div className="rfg-grid">

                                        <div className="rfg-group">
                                            <label className="rfg-label">Fecha de Entrega</label>
                                            <input required type="date" className="rfg-input" value={form.fechaEntrega}
                                                onChange={e => handleField('fechaEntrega', e.target.value)} />
                                        </div>

                                        <div className="rfg-group">
                                            <label className="rfg-label">Hora Desde</label>
                                            <input type="time" className="rfg-input" value={form.horaDesde} min="08:00" max="18:00"
                                                onChange={e => handleField('horaDesde', e.target.value)} />
                                        </div>

                                        <div className="rfg-group">
                                            <label className="rfg-label">Hora Hasta</label>
                                            <input type="time" className="rfg-input" value={form.horaHasta} min="08:00" max="18:00"
                                                onChange={e => handleField('horaHasta', e.target.value)} />
                                        </div>

                                        <div className="rfg-group">
                                            <label className="rfg-label">Dirección de Entrega</label>
                                            <input type="text" className="rfg-input" placeholder="Calle 123 #45-67"
                                                value={form.direccionEntrega} onChange={e => handleField('direccionEntrega', e.target.value)} />
                                        </div>

                                        <div className="rfg-group">
                                            <label className="rfg-label">Ciudad</label>
                                            <input type="text" className="rfg-input" placeholder="Bogotá"
                                                value={form.ciudad} onChange={e => handleField('ciudad', e.target.value)} />
                                        </div>

                                        <div className="rfg-group">
                                            <label className="rfg-label">Barrio</label>
                                            <input type="text" className="rfg-input" placeholder="Ej: Ciudad Salitre"
                                                value={form.barrio} onChange={e => handleField('barrio', e.target.value)} />
                                        </div>

                                        <div className="rfg-row g-3">
                                            <div className="rfg-col-4">
                                                <div className="rfg-group">
                                                    <label className="rfg-label">O.C. Asociada</label>
                                                    <select className="rfg-input" value={form.ordenId} onChange={async e => {
                                                        const val = e.target.value;
                                                        
                                                        // Limpiar sugeridoSaldo si no hay orden
                                                        if (!val || val === 'sin_orden') {
                                                            setSugeridoSaldo(null);
                                                        }

                                                        // Limpiar productos de la O.C. anterior
                                                        setForm(prev => {
                                                            const newIds = prev.inventarioIds.filter(id => {
                                                                const item = inventario.find(i => i.id === id);
                                                                if (!item || !item.venta) return true; // Mantener los que no tienen O.C.
                                                                if (String(item.venta) !== String(val)) return false; // Deseleccionar los de otra O.C.
                                                                return true;
                                                            });
                                                            return { ...prev, ordenId: val, inventarioIds: newIds, sharedSellersInfo: '' };
                                                        });
                                                        
                                                        if (val && val !== 'sin_orden') {
                                                            setLoadingSugeridoSaldo(true);
                                                            try {
                                                                const res = await API.get(`/ventas/${val}/`);
                                                                if (res.data) {
                                                                    setForm(prev => ({
                                                                        ...prev,
                                                                        vendedor: res.data.vendedor || prev.vendedor,
                                                                        sharedSellersInfo: res.data.vendedores_compartidos_nombres || ''
                                                                    }));
                                                                    if (res.data.saldo !== undefined && res.data.saldo !== null) {
                                                                        setSugeridoSaldo(res.data.saldo);
                                                                    } else {
                                                                        setSugeridoSaldo(null);
                                                                    }
                                                                }
                                                            } catch(err) {
                                                                console.error("Error auto-fetching vendedor:", err);
                                                            } finally {
                                                                setLoadingSugeridoSaldo(false);
                                                            }
                                                        }
                                                    }}>
                                                        <option value="">Seleccione una orden...</option>
                                                        <option value="sin_orden">Sin orden asociada</option>
                                                        {ordenesPendientes.map(id => <option key={id} value={id}>{id}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Saldo — compact widget */}
                                        <div className="rfg-group rfg-saldo-group">
                                            <label className="rfg-label">Saldo</label>
                                            <div className="rfg-saldo-row">
                                                <button
                                                    type="button"
                                                    className={`rfg-saldo-toggle${form.sinSaldo ? ' rfg-saldo-toggle--active' : ''}`}
                                                    onClick={handleSinSaldoToggle}
                                                    title={form.sinSaldo ? 'Tiene saldo' : 'Sin saldo'}
                                                >
                                                    {form.sinSaldo ? '✗ Sin saldo' : '$ Con saldo'}
                                                </button>
                                                {!form.sinSaldo && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                                        <div className="rfg-saldo-input-wrap" style={{ flex: 1 }}>
                                                            <span className="rfg-saldo-prefix">$</span>
                                                            <input
                                                                type="text"
                                                                className="rfg-saldo-input"
                                                                placeholder="0"
                                                                value={form.saldoDisplay}
                                                                onChange={handleSaldoChange}
                                                            />
                                                        </div>
                                                        {loadingSugeridoSaldo ? (
                                                            <div 
                                                                style={{
                                                                    backgroundColor: '#f8fafc',
                                                                    border: '1px dashed #cbd5e1',
                                                                    borderRadius: '4px',
                                                                    padding: '0 0.5rem',
                                                                    height: '38px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    fontSize: '0.85rem',
                                                                    color: '#64748b',
                                                                    whiteSpace: 'nowrap'
                                                                }}
                                                            >
                                                                <FaSpinner className="spin-icon" style={{ marginRight: '6px' }} />
                                                                Cargando...
                                                            </div>
                                                        ) : sugeridoSaldo !== null && (
                                                            <div 
                                                                style={{
                                                                    backgroundColor: '#eff6ff',
                                                                    border: '1px dashed #93c5fd',
                                                                    borderRadius: '4px',
                                                                    padding: '0 0.5rem',
                                                                    height: '38px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    fontSize: '0.85rem',
                                                                    color: '#1e3a8a',
                                                                    whiteSpace: 'nowrap',
                                                                    cursor: 'pointer'
                                                                }}
                                                                onClick={() => {
                                                                    setForm(prev => ({
                                                                        ...prev,
                                                                        saldo: sugeridoSaldo.toString(),
                                                                        saldoDisplay: formatCOP(parseInt(sugeridoSaldo, 10)).replace('$', '')
                                                                    }));
                                                                }}
                                                                title="Click para aplicar saldo sugerido"
                                                            >
                                                                <span style={{ opacity: 0.8, marginRight: '6px' }}>Sugerido:</span> 
                                                                <strong>{formatCOP(parseInt(sugeridoSaldo, 10))}</strong>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rfg-group">
                                            <label className="rfg-label">Método de Pago</label>
                                            <select className={`rfg-input${form.sinSaldo ? ' rfg-input--disabled' : ''}`}
                                                value={form.metodoPago} onChange={e => handleField('metodoPago', e.target.value)}
                                                disabled={form.sinSaldo}>
                                                <option value="">Seleccione...</option>
                                                {METODOS_PAGO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                            </select>
                                        </div>

                                        {(() => {
                                            const isOtro = form.transportadorUsuario === '__otro__';
                                            return (
                                                <div className={`rfg-group${isOtro ? ' rfg-span-2' : ''}`}>
                                                    <label className="rfg-label">Transportador</label>
                                                    <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                                                        <select
                                                            className="rfg-input"
                                                            style={{ flex: isOtro ? '0 0 160px' : '1' }}
                                                            value={form.transportadorUsuario}
                                                            onChange={e => handleField('transportadorUsuario', e.target.value)}
                                                        >
                                                            <option value="">Seleccione...</option>
                                                            {transportadores.map(t => (
                                                                <option key={t.id} value={t.id}>
                                                                    {t.first_name || t.username}
                                                                </option>
                                                            ))}
                                                            <option value="__otro__">Otro (externo)</option>
                                                        </select>
                                                        {isOtro && (
                                                            <input
                                                                type="text"
                                                                className="rfg-input"
                                                                placeholder="Nombre del transportador..."
                                                                value={form.transportador}
                                                                onChange={e => handleField('transportador', e.target.value)}
                                                                style={{ flex: '1', minWidth: 0 }}
                                                                autoFocus
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="rfg-group">
                                            <label className="rfg-label">
                                                Vendedor
                                                {form.sharedSellersInfo && (
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal', marginLeft: '0.5rem', fontStyle: 'italic' }}>
                                                        (Compartida con: {form.sharedSellersInfo})
                                                    </span>
                                                )}
                                            </label>
                                            <select className="rfg-input" value={form.vendedor} onChange={e => handleField('vendedor', e.target.value)}>
                                                <option value="">Seleccione...</option>
                                                {vendedores.map(v => <option key={v.id} value={v.id}>{v.first_name}</option>)}
                                            </select>
                                        </div>

                                        <div className="rfg-group rfg-full">
                                            <label className="rfg-label">Observación</label>
                                            <textarea className="rfg-input rfg-textarea" rows="2" placeholder="Notas sobre la remisión..."
                                                value={form.observacion} onChange={e => handleField('observacion', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                {/* Ítems de Inventario */}
                                <div className="rem-section rem-section-inv">
                                    <div className="rem-inventario-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                                        <div className="rem-section-title">Productos a Entregar</div>
                                        
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <input 
                                                type="text" 
                                                placeholder="Escanear QR..." 
                                                value={qrInput} 
                                                onChange={e => setQrInput(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleQRScan(e);
                                                    }
                                                }}
                                                className="rem-search-input"
                                                style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                            />
                                            <button type="button" onClick={handleQRScan} className="btn-general" style={{ padding: '0.4rem 1rem' }}>Agregar QR</button>
                                        </div>

                                        <div className="rem-search-wrapper">
                                            <FaSearch className="rem-search-icon" />
                                            <input
                                                type="text"
                                                placeholder="Buscar producto..."
                                                value={invSearch}
                                                onChange={e => setInvSearch(e.target.value)}
                                                className="rem-search-input"
                                            />
                                        </div>
                                    </div>

                                    {/* Selected items table */}
                                    {selectedItems.length > 0 && (
                                        <div className="rem-inv-table-wrap" style={{ marginTop: '1rem', borderTop: '2px solid #e2e8f0', paddingTop: '1rem' }}>
                                            <div style={{ marginBottom: '0.75rem', fontWeight: 600, color: '#334155' }}>Resumen de la Selección:</div>
                                            <table className="rem-inv-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: 32 }}></th>
                                                        <th style={{ width: 75 }}>ID</th>
                                                        <th style={{ width: '14%' }}>Referencia</th>
                                                        <th style={{ width: '13%' }}>Categoría</th>
                                                        <th style={{ width: '13%' }}>Subcategoría</th>
                                                        <th style={{ width: '15%' }}>Proveedor</th>
                                                        <th style={{ width: '10%' }}>Variación</th>
                                                        <th style={{ width: '8%' }}>Venta</th>
                                                        <th style={{ width: '12%' }}>Observación</th>
                                                        <th style={{ width: 42, textAlign: 'center' }}></th>
                                                    </tr>
                                                </thead>
                                                {renderTableBody(groupedSelectedInventario, expandedSelectedGroups, toggleExpandSelectedGrupo)}
                                            </table>
                                        </div>
                                    )}

                                {form.ordenId ? (
                                    <>
                                        <div className="rem-inv-table-wrapper">
                                            <table className="rem-inv-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: 32 }}></th>
                                                        <th style={{ width: 75 }}>ID</th>
                                                        <th style={{ width: '14%' }}>Referencia</th>
                                                        <th className="rem-inv-th-filter" style={{ width: '13%' }}>
                                                        <div className={`rem-inv-col-select-wrap${colCatFilter ? ' active-filter' : ''}`}>
                                                            <span className="rem-inv-col-label">
                                                                {colCatFilter
                                                                    ? CATEGORIAS.find(c => String(c.id) === colCatFilter)?.nombre || 'Categoría'
                                                                    : 'Categoría'}
                                                            </span>
                                                            <FaChevronDown className="rem-inv-col-chevron" />
                                                            <select
                                                                className="rem-inv-col-select"
                                                                value={colCatFilter}
                                                                onChange={e => {
                                                                    setColCatFilter(e.target.value);
                                                                    setColSubcatFilter('');
                                                                }}
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <option value="">Todas</option>
                                                                {CATEGORIAS.map(c => (
                                                                    <option key={c.id} value={String(c.id)}>{c.nombre}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </th>
                                                    <th className="rem-inv-th-filter" style={{ width: '13%' }}>
                                                        <div className={`rem-inv-col-select-wrap${colSubcatFilter ? ' active-filter' : ''}`}>
                                                            <span className="rem-inv-col-label">
                                                                {colSubcatFilter
                                                                    ? colSubcatOptions.find(s => String(s.id) === colSubcatFilter)?.nombre || 'Subcategoría'
                                                                    : 'Subcategoría'}
                                                            </span>
                                                            <FaChevronDown className="rem-inv-col-chevron" />
                                                            <select
                                                                className="rem-inv-col-select"
                                                                value={colSubcatFilter}
                                                                onChange={e => setColSubcatFilter(e.target.value)}
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <option value="">Todas</option>
                                                                {colSubcatOptions.map(s => (
                                                                    <option key={s.id} value={String(s.id)}>{s.nombre}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </th>
                                                    <th className="rem-inv-th-filter" style={{ width: '15%' }}>
                                                        <div className={`rem-inv-col-select-wrap${colProvFilter ? ' active-filter' : ''}`}>
                                                            <span className="rem-inv-col-label">
                                                                {colProvFilter
                                                                    ? proveedores?.find(p => String(p.id) === colProvFilter)?.nombre_empresa || 'Proveedor'
                                                                    : 'Proveedor'}
                                                            </span>
                                                            <FaChevronDown className="rem-inv-col-chevron" />
                                                            <select
                                                                className="rem-inv-col-select"
                                                                value={colProvFilter}
                                                                onChange={e => setColProvFilter(e.target.value)}
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <option value="">Todos</option>
                                                                {(proveedores || []).map(p => (
                                                                    <option key={p.id} value={String(p.id)}>{p.nombre_empresa}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </th>
                                                    <th style={{ width: '10%' }}>Variación</th>
                                                    <th style={{ width: '8%' }}>Venta</th>
                                                    <th style={{ width: '12%' }}>Observación</th>
                                                    <th style={{ width: 42, textAlign: 'center' }}></th>
                                                </tr>
                                            </thead>
                                            {renderTableBody(groupedInventario, expandedGroups, toggleExpandGrupo)}
                                        </table>
                                     </div>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.9rem' }}>
                                        Por favor seleccione una O.C. Asociada o "Sin orden asociada" para visualizar el inventario.
                                    </div>
                                )}
                                </div>
                            </div>{/* end rem-form-body */}

                            <div className="rem-modal-footer">
                                <button type="button" className="rem-btn-secondary" onClick={() => navigate('/suministros/remisiones')} disabled={isSubmitting}>Cancelar</button>
                                <button
                                    type="submit"
                                    className={`btn-general${isSubmitting ? ' btn-loading' : ''}`}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? <><FaSpinner className="spin-icon" /> Creando...</>
                                        : <><FaPlus /> Crear Remisión</>
                                    }
                                </button>
                            </div>
                        </form>
            </div>
        </div>
    );
}
export default NuevaRemisionPage;
