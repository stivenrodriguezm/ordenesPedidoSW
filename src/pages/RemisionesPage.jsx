import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import { ORDENES_MOCK } from '../data/suministrosMock';
import { startOfWeek, addDays, addWeeks, subDays, subWeeks, format, isSameDay, startOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import API from '../services/api';
import { formatCOP } from '../utils/formatCOP';
import { generateRemisionPDF } from '../utils/generateRemisionPDF';
import { FaPlus, FaSearch, FaChevronDown, FaChevronUp, FaTimes, FaClock, FaImage, FaEdit, FaList, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import { AppContext } from '../AppContext';
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

const TRANSPORTADORES = [
    { value: 'Camilo', label: 'Camilo' },
    { value: 'Pedro', label: 'Pedro' },
    { value: 'Cliente recoge', label: 'Cliente recoge' },
    { value: 'Otro', label: 'Otro' },
];

const VENDEDORES = [
    { value: 'Stiven', label: 'Stiven' },
    { value: 'Laura', label: 'Laura' },
    { value: 'María', label: 'María' },
    { value: 'Jorge', label: 'Jorge' },
];

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

function RemisionesPage() {
    const { proveedores, usuario } = useContext(AppContext);
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
    const [invSearch, setInvSearch] = useState('');
    const [invMode, setInvMode] = useState('items'); // 'items' | 'grupos'
    const [colCatFilter, setColCatFilter] = useState('');
    const [colSubcatFilter, setColSubcatFilter] = useState('');
    const [colProvFilter, setColProvFilter] = useState('');
    const [colCatOpen, setColCatOpen] = useState(false);
    const [colSubcatOpen, setColSubcatOpen] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    // View mode: 'table' or 'calendar'
    const [viewMode, setViewMode] = useState(isTransportador ? 'calendar' : 'table');
    const [calendarViewType, setCalendarViewType] = useState('week'); // 'week' or 'day'
    const [focusedDate, setFocusedDate] = useState(new Date());
    const currentWeekStart = startOfWeek(focusedDate, { weekStartsOn: 1 }); // Monday

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

    // ... filters ...
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [estadoFilter, setEstadoFilter] = useState('');
    const [transFilter, setTransFilter] = useState('');
    const [vendedorFilter, setVendedorFilter] = useState('');

    useEffect(() => {
        const fetchAll = async () => {
            setIsLoading(true);
            try {
                // Safety wrapper for optional requests to avoid crashing the whole page if one fails (e.g. for carriers)
                const safeGet = (url) => API.get(url).catch(err => {
                    console.warn(`Request failed for ${url}:`, err);
                    return { data: { results: [], data: [] } };
                });

                const [remRes, invRes, prodRes, catRes, subRes, ordRes, vendRes, transpRes, grupoRes] = await Promise.all([
                    API.get('/suministros/remisiones/'), // Remisiones is required
                    safeGet('/suministros/inventario/'),
                    safeGet('/referencias/'),
                    safeGet('/suministros/categorias/'),
                    safeGet('/suministros/subcategorias/'),
                    safeGet('/get-pendientes-ids/'),
                    safeGet('/vendedores/'),
                    safeGet('/transportadores/'),
                    safeGet('/suministros/grupos/')
                ]);
                
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
                    inventarioDetalle: r.inventario_items_detalle || []
                }));
                
                const rawInv = invRes.data?.results || invRes.data || [];
                const formattedInv = Array.isArray(rawInv) ? rawInv.map(inv => ({
                    ...inv,
                    id: inv.id_referencia,
                    productoId: inv.referencia,
                    subcategoriaId: inv.subcategoria,
                })) : [];

                const rawProd = prodRes.data?.results || prodRes.data || [];
                const formattedProd = Array.isArray(rawProd) ? rawProd.map(p => ({
                    ...p,
                    categoriaId: p.categoria,
                    subcategoriaId: p.subcategoria,
                    proveedorId: p.proveedor
                })) : [];

                setRemisiones(formattedRem);
                setInventario(formattedInv);
                setProductos(formattedProd);
                setCategorias(catRes.data.results || catRes.data || []);
                setSubcategorias(subRes.data.results || subRes.data || []);
                setOrdenesPendientes(Array.isArray(ordRes.data) ? ordRes.data : []);
                setVendedores(Array.isArray(vendRes.data) ? vendRes.data : []);
                setTransportadores(Array.isArray(transpRes.data) ? transpRes.data : []);
                setGrupos(grupoRes.data.results || grupoRes.data || []);
            } catch (error) {
                console.error("Error fetching remisiones:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, []);

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

    // ─── Edit modal helpers (for transportador) ───────────────────────────────
    const openEditModal = (rem) => {
        setEditForm({
            estado: rem.estado || 'creada',
            nota_transportador: rem.nota_transportador || '',
            costo_entrega: rem.costo_entrega ? String(rem.costo_entrega) : '',
            costo_display: rem.costo_entrega ? formatCOP(parseFloat(rem.costo_entrega)) : '',
        });
        setEditModal({ open: true, remision: rem });
        requestAnimationFrame(() => requestAnimationFrame(() => setEditModalVisible(true)));
    };

    const closeEditModal = () => {
        setEditModalVisible(false);
        setTimeout(() => setEditModal({ open: false, remision: null }), 280);
    };

    const handleEditCostoChange = e => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setEditForm(prev => ({ ...prev, costo_entrega: raw, costo_display: raw ? formatCOP(parseInt(raw, 10)) : '' }));
    };

    const isFinished = (est) => est === 'finalizada' || est === 'devuelta';

    const handleEditSubmit = async e => {
        e.preventDefault();
        if (!editModal.remision) return;
        setEditSaving(true);
        try {
            const payload = {
                estado: editForm.estado,
            };
            // Auxiliar → solo estado. Transportador → estado + nota + costo. Admin → todo.
            if (isTransportador || isAdmin) {
                payload.nota_transportador = editForm.nota_transportador;
                payload.costo_entrega = editForm.costo_entrega ? parseFloat(editForm.costo_entrega) : 0;
            }
            await API.patch(`/suministros/remisiones/${editModal.remision.id}/`, payload);
            // Refresh remisiones
            const remRes = await API.get('/suministros/remisiones/');
            const rawRemisiones = remRes.data.results || remRes.data;
                setRemisiones(rawRemisiones.map(r => ({
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
                    inventarioIds: r.inventario_items || []
                })));
            closeEditModal();
        } catch (err) {
            console.error('Error updating remision:', err);
            alert('Error al actualizar la remisión.');
        } finally {
            setEditSaving(false);
        }
    };

    const openModal = () => {
        setForm(emptyForm());
        setInvSearch('');
        setColCatFilter('');
        setColSubcatFilter('');
        setColCatOpen(false);
        setColSubcatOpen(false);
        setShowModal(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setModalVisible(true)));
    };

    const closeModal = () => {
        setModalVisible(false);
        setTimeout(() => setShowModal(false), 280);
    };

    const handleField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSaldoChange = e => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setForm(prev => ({
            ...prev,
            saldo: raw,
            saldoDisplay: raw ? formatCOP(parseInt(raw, 10)) : '',
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

            // Recargar lista
            const remRes = await API.get('/suministros/remisiones/');
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

            // Recargar inventario
            const invRes = await API.get('/suministros/inventario/');
            const rawInv = invRes.data.results || invRes.data;
            setInventario(rawInv.map(inv => ({
                ...inv,
                id: inv.id_referencia,
                productoId: inv.referencia,
                subcategoriaId: inv.subcategoria,
            })));

            // Buscar la remi sión recién creada y obtener detalle completo (con inventario_items_detalle)
            const newId = newRemision?.id || [...formattedRem].sort((a, b) => b.id - a.id)[0]?.id;
            let createdRemFull = newRemision;
            if (newId) {
                try {
                    const detailRes = await API.get(`/suministros/remisiones/${newId}/`);
                    createdRemFull = detailRes.data;
                } catch (detailErr) {
                    console.warn('No se pudo obtener detalle completo de la remisión:', detailErr);
                    // Fallback: usar el objeto de la lista refrescada
                    createdRemFull = formattedRem.find(r => r.id === newId) || newRemision;
                }
            }

            // Items para el PDF — prioridad: detalle enriquecido del backend
            const pdfItems =
                createdRemFull?.inventario_items_detalle?.length
                    ? createdRemFull.inventario_items_detalle
                    : createdRemFull?.inventarioDetalle?.length
                        ? createdRemFull.inventarioDetalle
                        : (createdRemFull?.inventario_items || createdRemFull?.inventarioIds || []).map(id => ({ id_referencia: id }));

            // Generar y descargar PDF (async — espera a que cargue Audiowide)
            try {
                await generateRemisionPDF(createdRemFull, pdfItems);
            } catch (pdfErr) {
                console.warn('PDF generation error (non-blocking):', pdfErr);
            }

            closeModal();
            showToast('¡Remisión creada exitosamente! El PDF se descargó automáticamente.', 'success');

        } catch (error) {
            console.error('Error creating remision:', error);
            showToast('Error al crear la remisión. Verifica los datos e intenta de nuevo.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleExpand = id => setExpandedId(expandedId === id ? null : id);

    const getEstadoClass = est => {
        const map = { creada: 'status-creada', despachada: 'status-despachada', finalizada: 'status-finalizada', anulada: 'status-anulada', devuelta: 'status-devuelta' };
        return map[est] || '';
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

    // Filtered main table
    const filteredRemisiones = remisiones.filter(r => {
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            if (!String(r.id).includes(q) && !(r.ordenAsociadaId && String(r.ordenAsociadaId).includes(q))) return false;
        }
        if (dateFrom && r.fechaCreacion < dateFrom) return false;
        if (dateTo && r.fechaCreacion.split('T')[0] > dateTo) return false;
        if (estadoFilter && r.estado !== estadoFilter) return false;
        if (transFilter && !(r.transportador_display || '').toLowerCase().includes(transFilter.toLowerCase())) return false;
        if (vendedorFilter && r.vendedor !== vendedorFilter) return false;
        return true;
    });

    const hasFilters = searchTerm || dateFrom || dateTo || estadoFilter || transFilter || vendedorFilter;
    const clearFilters = () => { setSearchTerm(''); setDateFrom(''); setDateTo(''); setEstadoFilter(''); setTransFilter(''); setVendedorFilter(''); };
    const uniqueTransportadores = [...new Set(remisiones.map(r => r.transportador).filter(Boolean))];
    const uniqueVendedores = [...new Set(remisiones.map(r => r.vendedor).filter(Boolean))];

    // Inventory search filter — searches by id, referencia (product name), venta
    let filteredInventario = INVENTARIO.filter(inv => {
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
            const prod = getProducto(inv.productoId);
            if (!prod || String(prod.categoriaId) !== colCatFilter) return false;
        }
        if (colSubcatFilter && String(inv.subcategoriaId) !== colSubcatFilter) return false;
        if (colProvFilter) {
            const prod = getProducto(inv.productoId);
            if (!prod || String(prod.proveedorId) !== colProvFilter) return false;
        }
        if (!invSearch) return true;
        const q = invSearch.toLowerCase();
        const prod = getProducto(inv.productoId);
        return (
            String(inv.id).toLowerCase().includes(q) ||
            prod?.nombre?.toLowerCase().includes(q) ||
            String(inv.venta || '').toLowerCase().includes(q)
        );
    });

    filteredInventario.sort((a, b) => {
        if (form.ordenId && form.ordenId !== 'sin_orden') {
            const aMatches = String(a.venta) === String(form.ordenId);
            const bMatches = String(b.venta) === String(form.ordenId);
            if (aMatches && !bMatches) return -1;
            if (!aMatches && bMatches) return 1;
        }
        return 0;
    });

    const colSubcatOptions = useMemo(() => colCatFilter
        ? SUBCATEGORIAS.filter(s => String(s.categoriaId) === colCatFilter)
        : SUBCATEGORIAS, [colCatFilter, SUBCATEGORIAS]);

    return (
        <div className="page-container remisiones-page-container">

            {/* ===== TOAST NOTIFICATION ===== */}
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

            {/* ===== HEADER: fused filters + button ===== */}
            <div className="page-header">
                <div className="header-actions-wrapper">
                    <div className="filtros-inline">
                        <div className="filter-item">
                            <div className="rem-filter-search-wrap">
                                <FaSearch className="rem-filter-icon" />
                                <input
                                    type="text"
                                    placeholder="ID Remisión u Orden..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="filter-inline-input"
                                />
                            </div>
                        </div>
                        <div className="filter-item filter-fecha-item">
                            <label className="filter-fecha-label">Desde</label>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        </div>
                        <div className="filter-item filter-fecha-item">
                            <label className="filter-fecha-label">Hasta</label>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        </div>
                        <div className="filter-item">
                            <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)}>
                                <option value="">Estado: Todos</option>
                                {Object.entries(ESTADO_LABELS).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-item">
                            <select value={transFilter} onChange={e => setTransFilter(e.target.value)}>
                                <option value="">Transportador: Todos</option>
                                {uniqueTransportadores.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="filter-item">
                            <select value={vendedorFilter} onChange={e => setVendedorFilter(e.target.value)}>
                                <option value="">Vendedor: Todos</option>
                                {uniqueVendedores.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        {hasFilters && (
                            <button className="clear-filters-btn" onClick={clearFilters} title="Limpiar filtros">
                                <FaTimes />
                            </button>
                        )}
                    </div>

                    <div className="view-mode-toggle">
                        <button 
                            className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                            title="Vista de Tabla"
                        >
                            <FaList />
                        </button>
                        <button 
                            className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                            onClick={() => setViewMode('calendar')}
                            title="Vista de Calendario"
                        >
                            <FaCalendarAlt />
                        </button>
                    </div>
                    {!isTransportador && (
                        <button className="btn-primary" onClick={openModal}>
                            <FaPlus /> Nueva Remisión
                        </button>
                    )}
                </div>
            </div>

            {/* ===== MAIN CONTENT ===== */}
            <div className="ordenes-container">
                {viewMode === 'table' ? (
                    <div className="desktop-view">
                    <table className="rem-tabla-ppal">
                        <thead>
                            <tr>
                                <th><span className="rem-th-truncate" title="ID">ID</span></th>
                                <th><span className="rem-th-truncate" title="Fecha Creación">
                                    <span className="rem-text-full">Fecha Creación</span>
                                    <span className="rem-text-short">F. Creación</span>
                                </span></th>
                                <th><span className="rem-th-truncate" title="Fecha Entrega">
                                    <span className="rem-text-full">Fecha Entrega</span>
                                    <span className="rem-text-short">F. Entrega</span>
                                </span></th>
                                <th><span className="rem-th-truncate" title="Rango Hora">Rango Hora</span></th>
                                <th><span className="rem-th-truncate" title="O.C.">O.C.</span></th>
                                <th><span className="rem-th-truncate" title="Saldo">Saldo</span></th>
                                <th><span className="rem-th-truncate" title="Método de Pago">Método de Pago</span></th>
                                <th><span className="rem-th-truncate" title="Transportador">Transportador</span></th>
                                <th><span className="rem-th-truncate" title="Vendedor">Vendedor</span></th>
                                <th><span className="rem-th-truncate" title="Costo Envío">Costo Envío</span></th>
                                <th><span className="rem-th-truncate" title="Estado">Estado</span></th>
                                <th><span className="rem-th-truncate" title="Observación">Observación</span></th>
                                <th style={{ width: 60, textAlign: 'center' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="12"><div className="loading-container"><div className="loader"></div></div></td></tr>
                            ) : filteredRemisiones.length === 0 ? (
                                <tr><td colSpan="12" className="rem-empty-row">No hay remisiones para estos filtros.</td></tr>
                            ) : filteredRemisiones.map(rem => {
                                const metodoPagoLabel = METODOS_PAGO.find(m => m.value === rem.metodoPago)?.label;
                                return (
                                    <React.Fragment key={rem.id}>
                                        <tr className={expandedId === rem.id ? 'expanded-row-highlight' : ''}>
                                            <td><span className="remision-id-num">{rem.id}</span></td>
                                            <td>{formatDate(rem.fechaCreacion)}</td>
                                            <td>{rem.fechaEntrega ? formatDate(rem.fechaEntrega) : <span className="empty-val">—</span>}</td>
                                            <td>
                                                {rem.horaDesde && rem.horaHasta ? (
                                                    <span className="hora-rango-badge">
                                                        <FaClock style={{ fontSize: '0.65rem', opacity: 0.6 }} />
                                                        {rem.horaDesde} – {rem.horaHasta}
                                                    </span>
                                                ) : <span className="empty-val">—</span>}
                                            </td>
                                            <td>{rem.ordenAsociadaId ? <span className="text-plain">{rem.ordenAsociadaId}</span> : <span className="empty-val">—</span>}</td>
                                            <td>
                                                {rem.sinSaldo
                                                    ? <span className="sin-saldo-badge">Sin saldo</span>
                                                    : <span className="valor-cop">{formatCOP(rem.saldo)}</span>}
                                            </td>
                                            <td>{metodoPagoLabel ? <span className="text-plain">{metodoPagoLabel}</span> : <span className="empty-val">—</span>}</td>
                                            <td>{rem.transportador_display ? <span className="text-plain">{rem.transportador_display}</span> : <span className="empty-val">—</span>}</td>
                                            <td>{rem.vendedor ? <span className="rem-vendedor-badge">{rem.vendedor}</span> : <span className="empty-val">—</span>}</td>
                                            <td>
                                                {rem.costo_entrega && parseFloat(rem.costo_entrega) > 0
                                                    ? <span className="valor-cop">{formatCOP(parseFloat(rem.costo_entrega))}</span>
                                                    : <span className="empty-val">—</span>}
                                            </td>
                                            <td>
                                                <span className={`status-badge ${getEstadoClass(rem.estado)}`}>
                                                    {ESTADO_LABELS[rem.estado] || rem.estado}
                                                </span>
                                            </td>
                                            <td className="obs-cell-col">
                                                <ObsCell text={rem.observacion} />
                                            </td>
                                            <td style={{ textAlign: 'center', display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'center' }}>
                                                {canEditRemision && (
                                                    <button
                                                        className="action-btn"
                                                        title="Actualizar remisión"
                                                        onClick={() => openEditModal(rem)}
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                )}
                                                <button className="action-btn" onClick={() => toggleExpand(rem.id)}>
                                                    {expandedId === rem.id ? <FaChevronUp /> : <FaChevronDown />}
                                                </button>
                                            </td>
                                        </tr>

                                        {expandedId === rem.id && (
                                            <tr className="expanded-row">
                                                <td colSpan="12">
                                                    <div className="rem-expanded-wrapper">
                                                        {/* Left panel: client info */}
                                                        <div className="rem-det-panel">
                                                            <h4 className="rem-det-titulo">Datos del Cliente</h4>
                                                            <div className="rem-det-grid">
                                                                <div className="rem-det-item">
                                                                    <span className="rem-det-label">Cliente</span>
                                                                    <span className="rem-det-valor">{rem.clienteNombre || 'Cliente Estándar'}</span>
                                                                </div>
                                                                <div className="rem-det-item">
                                                                    <span className="rem-det-label">Documento</span>
                                                                    <span className="rem-det-valor">CC 1020304050</span>
                                                                </div>
                                                                <div className="rem-det-item">
                                                                    <span className="rem-det-label">Teléfono 1</span>
                                                                    <span className="rem-det-valor">+57 300 000 0000</span>
                                                                </div>
                                                                <div className="rem-det-item">
                                                                    <span className="rem-det-label">Teléfono 2</span>
                                                                    <span className="rem-det-valor">+57 300 111 1111</span>
                                                                </div>
                                                                {rem.direccionEntrega && (
                                                                    <div className="rem-det-item rem-det-item-full">
                                                                        <span className="rem-det-label">Dirección</span>
                                                                        <span className="rem-det-valor">{rem.direccionEntrega}{rem.ciudad ? `, ${rem.ciudad}` : ''}</span>
                                                                    </div>
                                                                )}
                                                                <div className="rem-det-item">
                                                                    <span className="rem-det-label">Vendedor</span>
                                                                    <span className="rem-det-valor">{rem.vendedor || '—'}</span>
                                                                </div>
                                                                {rem.observacion && (
                                                                    <div className="rem-det-item rem-det-item-full">
                                                                        <span className="rem-det-label">Observación</span>
                                                                        <span className="rem-det-valor rem-det-obs">{rem.observacion}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="rem-det-panel rem-det-panel-wide">
                                                            <h4 className="rem-det-titulo">Productos Entregados</h4>
                                                            <p className="rem-det-subtitle" style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem', lineHeight: '1.4' }}>
                                                                A continuación se listan los productos despachados en esta remisión, incluyendo su variación y observación particular.
                                                            </p>
                                                            {rem.inventarioIds.length === 0 ? (
                                                                <p className="rem-det-empty">Sin ítems registrados.</p>
                                                            ) : (
                                                                <table className="rem-det-table">
                                                                    <thead>
                                                                        <tr>
                                                                            <th className="rem-det-th">Id</th>
                                                                            <th className="rem-det-th">Producto</th>
                                                                            <th className="rem-det-th">Proveedor</th>
                                                                            <th className="rem-det-th">Categoría</th>
                                                                            <th className="rem-det-th">Subcategoría</th>
                                                                            <th className="rem-det-th">Variación</th>
                                                                            <th className="rem-det-th">Observación</th>
                                                                            <th className="rem-det-th" style={{ width: '40px' }}></th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {(rem.inventarioDetalle && rem.inventarioDetalle.length > 0 ? rem.inventarioDetalle : rem.inventarioIds).map(itemRef => {
                                                                            // itemRef can be an ID or a detail object
                                                                            const invId = typeof itemRef === 'object' ? itemRef.id_referencia : itemRef;
                                                                            const detail = typeof itemRef === 'object' ? itemRef : null;
                                                                            
                                                                            // Try global state first, then fallback to embedded detail
                                                                            const inv = INVENTARIO.find(i => i.id === invId);
                                                                            const prod = PRODUCTOS.find(p => p.id === (inv?.productoId));
                                                                            
                                                                            const prodNombre = prod?.nombre || detail?.producto_nombre || '—';
                                                                            const catObj = prod ? CATEGORIAS.find(c => c.id === prod.categoriaId) : null;
                                                                            const catNombre = catObj?.nombre || detail?.categoria_nombre;
                                                                            const subcatObj = (inv?.subcategoriaId) ? SUBCATEGORIAS.find(s => s.id === inv.subcategoriaId) : null;
                                                                            const subcatNombre = subcatObj?.nombre || detail?.subcategoria_nombre || '—';
                                                                            
                                                                            const color = prod ? getCatColor(prod.categoriaId) : (detail ? '#3b82f6' : '#94a3b8');
                                                                            const proveedorObj = prod?.proveedorId ? (proveedores || []).find(p => p.id === prod.proveedorId) : null;
                                                                            const proveedorNombre = proveedorObj ? proveedorObj.nombre_empresa : (detail?.proveedor_nombre || '—');
                                                                            
                                                                            const variacion = inv?.variacion || detail?.variacion || '—';
                                                                            const observacion = inv?.observacion || detail?.observacion;
                                                                            const hasImagen = inv?.imagen || detail?.imagen;

                                                                            return (
                                                                                <tr key={invId} className="rem-det-tr">
                                                                                    <td className="rem-det-td"><span className="remision-id-num">{invId}</span></td>
                                                                                    <td className="rem-det-td rem-det-td-prod">
                                                                                        <span className="rem-det-prod-name">{prodNombre}</span>
                                                                                    </td>
                                                                                    <td className="rem-det-td"><span className="text-plain">{proveedorNombre}</span></td>
                                                                                    <td className="rem-det-td">
                                                                                        {catNombre && (
                                                                                            <span className="rem-det-cat-badge" style={{ '--cat-color': color }}>
                                                                                                {catNombre}
                                                                                            </span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="rem-det-td">{subcatNombre}</td>
                                                                                    <td className="rem-det-td">{variacion}</td>
                                                                                    <td className="rem-det-td rem-det-td-obs">
                                                                                        {observacion
                                                                                            ? <span className="rem-det-obs-text" title={observacion}>{observacion}</span>
                                                                                            : <span className="rem-det-empty-val">—</span>}
                                                                                    </td>
                                                                                    <td className="rem-det-td" style={{ textAlign: 'center' }}>
                                                                                        {hasImagen && (
                                                                                            <button className="action-btn" title="Ver imagen" style={{ padding: '0.35rem', margin: '0 auto', fontSize: '0.9rem' }}>
                                                                                                <FaImage />
                                                                                            </button>
                                                                                        )}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                ) : (
                    <CalendarView 
                        remisiones={remisiones}
                        currentWeekStart={currentWeekStart}
                        focusedDate={focusedDate}
                        viewType={calendarViewType}
                        setViewType={setCalendarViewType}
                        nextScope={nextScope}
                        prevScope={prevScope}
                        goToday={goToday}
                        openEditModal={openEditModal}
                        ESTADO_LABELS={ESTADO_LABELS}
                    />
                )}
            </div>

            {/* ===== MODAL NUEVA REMISIÓN ===== */}
            {showModal && (
                <div
                    className={`rem-overlay${modalVisible ? ' rem-overlay-visible' : ''}`}
                    onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div className={`rem-modal${modalVisible ? ' rem-modal-visible' : ''}`}>

                        <div className="rem-modal-header">
                            <div className="rem-modal-header-left">
                                <span className="rem-modal-icon">📦</span>
                                <h3>Nueva Remisión</h3>
                            </div>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>

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
                                                    <select className="rfg-input" value={form.ordenId} onChange={e => handleField('ordenId', e.target.value)}>
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
                                                    <div className="rfg-saldo-input-wrap">
                                                        <span className="rfg-saldo-prefix">$</span>
                                                        <input
                                                            type="text"
                                                            className="rfg-saldo-input"
                                                            placeholder="0"
                                                            value={form.saldoDisplay}
                                                            onChange={handleSaldoChange}
                                                        />
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
                                            <label className="rfg-label">Vendedor</label>
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
                                    <div className="rem-inventario-header">
                                        <div className="rem-section-title">Productos a Entregar</div>
                                        <div className="rem-inv-mode-tabs">
                                            <button
                                                type="button"
                                                className={`rem-inv-tab${invMode === 'items' ? ' active' : ''}`}
                                                onClick={() => setInvMode('items')}
                                            >Por Ítem</button>
                                            <button
                                                type="button"
                                                className={`rem-inv-tab${invMode === 'grupos' ? ' active' : ''}`}
                                                onClick={() => setInvMode('grupos')}
                                            >Por Grupo</button>
                                        </div>
                                        {invMode === 'items' && (
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
                                        )}
                                    </div>

                                    {/* Selected items chips — max 3 rows then scroll */}
                                    {selectedItems.length > 0 && (
                                        <div className="rem-selected-list-wrap">
                                            {selectedItems.map(item => (
                                                <div key={item.invId} className="rem-selected-row">
                                                    <div className="rem-selected-row-info">
                                                        <span className="rem-selected-id">#{item.invId}</span>
                                                        <span className="rem-selected-prod">{item.nombre}</span>
                                                        {item.cat && <span className="cat-badge" style={{ '--cat-color': '#3b82f6', fontSize: '0.65rem' }}>{item.cat}</span>}
                                                        {item.variacion && <span className="rem-selected-text" style={{ fontStyle: 'italic' }}>{item.variacion}</span>}
                                                    </div>
                                                    <button type="button" className="rem-chip-remove" onClick={() => toggleInventarioItem(item.invId)} title="Quitar">
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                {form.ordenId ? (
                                    <>
                                        {/* ═══ POR GRUPO panel ═══ */}
                                        {invMode === 'grupos' && (
                                            <div className="rem-grupos-panel">
                                                {grupos.filter(g => g.activo).length === 0 ? (
                                                    <div className="rem-grupos-empty">No hay grupos activos. Créalos en <strong>Suministros › Grupos</strong>.</div>
                                                ) : grupos.filter(g => g.activo).map(grupo => {
                                                    const grupoItemIds = inventario
                                                        .filter(inv => inv.grupo_id === grupo.id && !['por_despachar', 'cliente'].includes(inv.disponibilidad))
                                                        .map(inv => inv.id);
                                                    const totalItems = inventario.filter(inv => inv.grupo_id === grupo.id).length;
                                                    const allSelected = grupoItemIds.length > 0 && grupoItemIds.every(id => form.inventarioIds.includes(id));
                                                    const someSelected = grupoItemIds.some(id => form.inventarioIds.includes(id));
                                                    const isPartial = totalItems > 0 && grupoItemIds.length < totalItems;

                                                    return (
                                                        <div
                                                            key={grupo.id}
                                                            className={`rem-grupo-card${allSelected ? ' rem-grupo-card--selected' : someSelected ? ' rem-grupo-card--partial' : ''}`}
                                                            onClick={() => selectGrupo(grupo)}
                                                        >
                                                            <div className="rem-grupo-card-check">
                                                                <div className={`rem-grupo-checkbox${allSelected ? ' checked' : someSelected ? ' partial' : ''}`}>
                                                                    {allSelected ? '✓' : someSelected ? '—' : ''}
                                                                </div>
                                                            </div>
                                                            <div className="rem-grupo-card-body">
                                                                <div className="rem-grupo-card-name">{grupo.nombre}</div>
                                                                {grupo.descripcion && <div className="rem-grupo-card-desc">{grupo.descripcion}</div>}
                                                                <div className="rem-grupo-card-comps">
                                                                    {grupo.componentes.map((c, i) => (
                                                                        <span key={i} className="comp-chip">{c.cantidad}× {c.referencia_nombre || `Ref #${c.referencia}`}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="rem-grupo-card-stock">
                                                                <span className={`inv-count-badge ${grupoItemIds.length > 0 ? 'inv-count--ok' : 'inv-count--empty'}`}>
                                                                    {grupoItemIds.length} disp.
                                                                </span>
                                                                {isPartial && (
                                                                    <span className="rem-grupo-partial-warn" title="No hay inventario completo para este grupo">⚠ Parcial</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* ═══ POR ÍTEM table ═══ */}
                                        {invMode === 'items' && (
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
                                            <tbody>
                                                {filteredInventario.map(inv => {
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
                                        </table>
                                     </div>
                                        )}
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.9rem' }}>
                                        Por favor seleccione una O.C. Asociada o "Sin orden asociada" para visualizar el inventario.
                                    </div>
                                )}
                                </div>
                            </div>{/* end rem-form-body */}

                            <div className="rem-modal-footer">
                                <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSubmitting}>Cancelar</button>
                                <button
                                    type="submit"
                                    className={`btn-primary${isSubmitting ? ' btn-loading' : ''}`}
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
            )}

            {/* ===== MODAL ACTUALIZAR REMI SIÓN ===== */}
            {editModal.open && (() => {
                const rem    = editModal.remision;
                const locked = isFinished(rem?.estado);
                const onlyEstado = isAuxiliar && !isAdmin;

                return (
                    <div
                        className={`rem-overlay${editModalVisible ? ' rem-overlay-visible' : ''}`}
                        onClick={e => { if (e.target === e.currentTarget) closeEditModal(); }}
                    >
                        <div
                            className={`rem-modal rem-edit-modal${editModalVisible ? ' rem-modal-visible' : ''}`}
                        >
                            {/* ── Header ── */}
                            <div className="rem-edit-header">
                                <div className="rem-edit-header-left">
                                    <div className="rem-edit-icon-wrap">
                                        <FaEdit />
                                    </div>
                                    <div>
                                        <h3 className="rem-edit-title">Actualizar Remisión</h3>
                                        <span className="rem-edit-subtitle">N° <strong>{String(rem?.id).padStart(5,'0')}</strong></span>
                                    </div>
                                </div>
                                <button className="rem-edit-close" onClick={closeEditModal} aria-label="Cerrar">
                                    <FaTimes />
                                </button>
                            </div>

                            {/* ── Info Card ── */}
                            <div className="rem-edit-infocard">
                                <div className="rem-edit-infocard-grid">
                                    <div className="ric-item">
                                        <span className="ric-label">Cliente</span>
                                        <span className="ric-value">{rem?.clienteNombre || '—'}</span>
                                    </div>
                                    <div className="ric-item">
                                        <span className="ric-label">Orden de Compra</span>
                                        <span className="ric-value">{rem?.ordenAsociadaId || '—'}</span>
                                    </div>
                                    <div className="ric-item">
                                        <span className="ric-label">Fecha de Entrega</span>
                                        <span className="ric-value">{rem?.fechaEntrega ? formatDate(rem.fechaEntrega) : '—'}</span>
                                    </div>
                                    <div className="ric-item">
                                        <span className="ric-label">Horario</span>
                                        <span className="ric-value">
                                            {rem?.horaDesde && rem?.horaHasta
                                                ? <><FaClock style={{ fontSize: '0.65rem', opacity: 0.7, marginRight: 3 }} />{rem.horaDesde} – {rem.horaHasta}</>
                                                : '—'}
                                        </span>
                                    </div>
                                    <div className="ric-item ric-item-wide">
                                        <span className="ric-label">Dirección</span>
                                        <span className="ric-value">{rem?.direccionEntrega || '—'}{rem?.ciudad ? `, ${rem.ciudad}` : ''}</span>
                                    </div>
                                    <div className="ric-item">
                                        <span className="ric-label">Transportador</span>
                                        <span className="ric-value">{rem?.transportador_display || '—'}</span>
                                    </div>
                                </div>
                                {/* Estado badge actual */}
                                <div className="ric-estado-row">
                                    <span className="ric-label">Estado actual</span>
                                    <span className={`status-badge ${getEstadoClass(rem?.estado)} ric-estado-badge`}>
                                        {ESTADO_LABELS[rem?.estado] || rem?.estado}
                                    </span>
                                </div>
                            </div>

                            {/* ── Form ── */}
                            <form onSubmit={handleEditSubmit} className="rem-edit-form">

                                {locked && (
                                    <div className="rem-edit-alert rem-edit-alert--warn">
                                        ⚠️ Esta remisión está <strong>{ESTADO_LABELS[rem?.estado]}</strong> y no puede modificarse.
                                    </div>
                                )}

                                {/* Estado */}
                                <div className="rem-edit-field-group">
                                    <label className="rem-edit-label">Nuevo Estado</label>
                                    <div className="rem-edit-estado-grid">
                                        {['creada','despachada','finalizada','devuelta'].map(est => (
                                            <button
                                                key={est}
                                                type="button"
                                                disabled={locked}
                                                className={`rem-edit-estado-btn est-${est}${editForm.estado === est ? ' selected' : ''}`}
                                                onClick={() => !locked && setEditForm(prev => ({ ...prev, estado: est }))}
                                            >
                                                {ESTADO_LABELS[est]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Costo + Nota → solo si no es auxiliar puro */}
                                {!onlyEstado && (
                                    <>
                                        <div className="rem-edit-row">
                                            <div className="rem-edit-field-group">
                                                <label className="rem-edit-label">Costo del Flete</label>
                                                <div className="rem-edit-prefix-wrap">
                                                    <span className="rem-edit-prefix">$</span>
                                                    <input
                                                        type="text"
                                                        className="rem-edit-input"
                                                        placeholder="0"
                                                        value={editForm.costo_display}
                                                        onChange={handleEditCostoChange}
                                                        disabled={locked}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rem-edit-field-group">
                                            <label className="rem-edit-label">Nota del Transportador</label>
                                            <textarea
                                                className="rem-edit-textarea"
                                                rows={3}
                                                placeholder="Ej: El cliente no estaba, se dejó en recepción..."
                                                value={editForm.nota_transportador}
                                                onChange={e => setEditForm(prev => ({ ...prev, nota_transportador: e.target.value }))}
                                                disabled={locked}
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Footer */}
                                <div className="rem-edit-footer">
                                    <button type="button" className="rem-edit-btn-cancel" onClick={closeEditModal}>
                                        Cancelar
                                    </button>
                                    {!locked && (
                                        <button
                                            type="submit"
                                            className={`rem-edit-btn-save${editSaving ? ' loading' : ''}`}
                                            disabled={editSaving}
                                        >
                                            {editSaving
                                                ? <><FaSpinner className="spin-icon" /> Guardando...</>
                                                : <><FaCheckCircle /> Guardar Cambios</>
                                            }
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

// =============================================================================
// SUB-COMPONENT: CalendarView
// =============================================================================
function CalendarView({ 
    remisiones, currentWeekStart, focusedDate, viewType, setViewType,
    nextScope, prevScope, goToday, openEditModal, ESTADO_LABELS 
}) {
    const CAL_START_H = 8;
    const CAL_END_H = 19;
    const HOUR_HEIGHT = 42; 

    const TIME_SLOTS = Array.from({ length: CAL_END_H - CAL_START_H + 1 }, (_, i) => {
        const h = i + CAL_START_H;
        return `${String(h).padStart(2, '0')}:00`;
    });

    const WEEK_DAYS = useMemo(() => {
        if (viewType === 'day') return [focusedDate];
        return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
    }, [viewType, focusedDate, currentWeekStart]);

    // Helper to parse "YYYY-MM-DD" or ISO as local date (avoiding UTC shift)
    const parseLocalDate = (dateStr) => {
        if (!dateStr) return null;
        // Strip time if present: "2026-04-09T08:00:00" -> "2026-04-09"
        const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const [y, m, d] = cleanDate.split('-').map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    };

    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + (m || 0);
    };

    const CAL_START_MIN = CAL_START_H * 60;

    // Filter remisiones for this week
    const weekRemisiones = useMemo(() => {
        const weekEnd = addDays(currentWeekStart, 7);
        const filtered = remisiones.filter(r => {
            if (!r.fechaEntrega) return false;
            const d = parseLocalDate(r.fechaEntrega);
            return d >= currentWeekStart && d < weekEnd;
        });
        return filtered;
    }, [remisiones, currentWeekStart]);

    // Overlap Detection & Positioning Algorithm
    const getPositionedEvents = (day) => {
        const dayEvents = weekRemisiones.filter(r => isSameDay(day, parseLocalDate(r.fechaEntrega)))
            .map(r => ({
                ...r,
                startMin: timeToMinutes(r.horaDesde),
                endMin: timeToMinutes(r.horaHasta) || (timeToMinutes(r.horaDesde) + 60)
            }))
            .sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

        if (dayEvents.length === 0) return [];

        const groups = [];
        dayEvents.forEach(event => {
            let placed = false;
            for (const group of groups) {
                const lastInGroup = group[group.length - 1];
                // Check if this event overlaps with ANY event in the group
                const overlaps = group.some(e => event.startMin < e.endMin && event.endMin > e.startMin);
                if (overlaps) {
                    group.push(event);
                    placed = true;
                    break;
                }
            }
            if (!placed) groups.push([event]);
        });

        const positioned = [];
        groups.forEach(group => {
            const columns = [];
            group.forEach(event => {
                let colIdx = 0;
                while (columns[colIdx] && columns[colIdx].some(e => event.startMin < e.endMin && event.endMin > e.startMin)) {
                    colIdx++;
                }
                if (!columns[colIdx]) columns[colIdx] = [];
                columns[colIdx].push(event);
                event.colIdx = colIdx;
            });
            const maxCols = columns.length;
            group.forEach(event => {
                event.totalCols = maxCols;
                positioned.push(event);
            });
        });

        return positioned;
    };

    const getEstadoClass = est => {
        const map = { creada: 'status-creada', despachada: 'status-despachada', finalizada: 'status-finalizada', anulada: 'status-anulada', devuelta: 'status-devuelta' };
        return map[est] || '';
    };

    return (
        <div className="calendar-container">
            {/* Nav Header */}
            <div className="calendar-nav">
                <div className="calendar-nav-left">
                    <h3 className="calendar-current-month">
                        {format(viewType === 'day' ? focusedDate : currentWeekStart, 'MMMM yyyy', { locale: es }).toUpperCase()}
                    </h3>
                    <span className="calendar-week-range">
                        {viewType === 'day' 
                            ? format(focusedDate, "EEEE d 'de' MMMM", { locale: es })
                            : `Semana del ${format(currentWeekStart, 'd', { locale: es })} al ${format(WEEK_DAYS[6], 'd', { locale: es })}`
                        }
                    </span>
                </div>

                <div className="calendar-nav-center">
                    <div className="cal-view-switcher">
                        <button 
                            className={`switcher-btn ${viewType === 'week' ? 'active' : ''}`}
                            onClick={() => setViewType('week')}
                        >
                            Semana
                        </button>
                        <button 
                            className={`switcher-btn ${viewType === 'day' ? 'active' : ''}`}
                            onClick={() => setViewType('day')}
                        >
                            Día
                        </button>
                    </div>
                </div>

                <div className="calendar-nav-actions">
                    <button className="cal-nav-btn" onClick={goToday}>Hoy</button>
                    <div className="cal-nav-arrows">
                        <button className="cal-arrow-btn" onClick={prevScope}><FaChevronLeft /></button>
                        <button className="cal-arrow-btn" onClick={nextScope}><FaChevronRight /></button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="calendar-grid-wrapper">
                {(weekRemisiones.length === 0) && (
                    <div className="calendar-empty-state">
                        <span className="empty-icon">📅</span>
                        <p>No hay remisiones programadas para esta semana</p>
                    </div>
                )}
                <div className={`calendar-grid view-${viewType}`}>
                    {/* Header: Days */}
                    <div className="calendar-header-row"
                        style={{ gridTemplateColumns: `55px repeat(${WEEK_DAYS.length}, 1fr)` }}
                    >
                        <div className="time-gutter-header"></div>
                        {WEEK_DAYS.map((day, idx) => (
                            <div key={idx} className={`calendar-day-header ${isSameDay(day, new Date()) ? 'is-today' : ''} ${idx === 6 && viewType === 'week' ? 'is-sunday' : ''}`}>
                                <span className="day-name">{format(day, 'eee', { locale: es })}</span>
                                <span className="day-number">{format(day, 'd')}</span>
                            </div>
                        ))}
                    </div>

                    <div className="calendar-body-scrollable">
                        {/* body-grid: gutter (left) + columns-container (right) as flex row */}
                        <div className="calendar-body-grid">
                            {/* Time Gutter */}
                            <div className="calendar-time-gutter">
                                {TIME_SLOTS.map((time, idx) => (
                                    <div key={idx} className="time-slot-label">
                                        {time}
                                    </div>
                                ))}
                            </div>

                            {/* Columns container: position:relative parent for events */}
                            <div className="calendar-columns-container">
                                {/* Background Grid Lines (absolute, z=0) */}
                                <div className="calendar-bg-lines">
                                    {TIME_SLOTS.map((_, idx) => (
                                        <div key={idx} className="calendar-bg-line"></div>
                                    ))}
                                </div>

                                {/* Day columns grid (relative, z=1) */}
                                <div
                                    className="calendar-days-columns"
                                    style={{ gridTemplateColumns: `repeat(${WEEK_DAYS.length}, 1fr)` }}
                                >
                                    {WEEK_DAYS.map((day, dayIdx) => {
                                        const positionedEvents = getPositionedEvents(day);
                                        return (
                                            <div
                                                key={dayIdx}
                                                className={`calendar-day-column ${dayIdx === 6 && viewType === 'week' ? 'is-sunday' : ''} ${isSameDay(day, new Date()) ? 'is-today-col' : ''}`}
                                            >
                                                {positionedEvents.map(rem => {
                                                    const top = ((rem.startMin - CAL_START_MIN) / 60) * HOUR_HEIGHT;
                                                    const duration = Math.max(rem.endMin - rem.startMin, 45);
                                                    const height = (duration / 60) * HOUR_HEIGHT;
                                                    const width = 100 / rem.totalCols;
                                                    const left = rem.colIdx * width;

                                                    return (
                                                        <div
                                                            key={rem.id}
                                                            className={`calendar-event ${getEstadoClass(rem.estado)}`}
                                                            style={{
                                                                top: `${top}px`,
                                                                height: `${height}px`,
                                                                width: `calc(${width}% - 3px)`,
                                                                left: `calc(${left}% + 1px)`,
                                                                minHeight: '38px',
                                                            }}
                                                            onClick={() => openEditModal(rem)}
                                                        >
                                                            <div className="event-content-wrapper">
                                                                <div className="event-time-range">{rem.horaDesde} - {rem.horaHasta}</div>
                                                                <div className="event-title">{rem.clienteNombre}</div>
                                                                <div className="event-subtitle">OC: {rem.ordenAsociadaId || '—'}</div>
                                                                {height > 60 && (
                                                                    <div className="event-footer">
                                                                        <span className="event-id">#{rem.id}</span>
                                                                        <span className="event-status-dot"></span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default RemisionesPage;
