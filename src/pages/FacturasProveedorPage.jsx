import React, { useState, useContext, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';
import { AppContext, usePermissions } from '../AppContext';
import { formatCOP, parseCOP } from '../utils/formatCOP';
import { FaPlus, FaTrashAlt, FaChevronDown, FaChevronUp, FaEdit, FaSave, FaTimes, FaBoxOpen, FaImage, FaCamera, FaUpload, FaSearch, FaLayerGroup, FaCheckCircle, FaExclamationCircle, FaShoppingCart, FaExclamationTriangle } from 'react-icons/fa';
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
    estado_fisico: 'nuevo',
    zonaId: '',
    ventaId: '', 
    imagen: null, 
    visible: false,
    lleva_tela: false,
    tela_referencia: '',
    tela_color: '',
    tela_costo_metro: '',
    tela_cantidad_metros: ''
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
    const hasPermission = usePermissions();
    const [facturas, setFacturas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [ordenesPendientes, setOrdenesPendientes] = useState([]);
    const [gruposActivos, setGruposActivos] = useState([]);  // grupos activos del backend
    const [sedes, setSedes] = useState([]);
    const [zonas, setZonas] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm());
    const [newGrupoName, setNewGrupoName] = useState('');   // input para crear grupo en el modal
    const [newGrupoCategoria, setNewGrupoCategoria] = useState('');
    const [newGrupoSubcategoria, setNewGrupoSubcategoria] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [expandedNestedGroups, setExpandedNestedGroups] = useState({});

    const toggleNestedGroup = (facturaId, groupName) => {
        const key = `${facturaId}-${groupName}`;
        setExpandedNestedGroups(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };
    const [isLoadingFacturas, setIsLoadingFacturas] = useState(true);
    const [errorFacturas, setErrorFacturas] = useState(false);
    const [isLoadingMeta, setIsLoadingMeta] = useState(true);
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
        const fetchFacturas = async () => {
            setIsLoadingFacturas(true);
            setErrorFacturas(false);
            try {
                const facRes = await API.get('/suministros/facturas/');
                const fetchFacturasHeavy = async () => {
                    try {
                        const heavyRes = await API.get('/suministros/facturas/?full=true');
                        const heavyData = heavyRes.data.results || heavyRes.data;
                        
                        setFacturas(prev => prev.map(f => {
                            const hf = heavyData.find(x => x.id === f.id);
                            if (hf && !f._detailsLoaded) {
                                const prods = (hf.items_inventario || []).map(p => ({
                                    ...p,
                                    id: p.id_referencia,
                                    referenciaId: p.referencia,
                                    categoriaId: p.categoria,
                                    subcategoriaId: p.subcategoria,
                                    ventaId: p.venta_id,
                                    costo: p.costo_especifico,
                                    grupo_categoria_nombre: p.grupo_categoria_nombre,
                                    grupo_subcategoria_nombre: p.grupo_subcategoria_nombre,
                                }));
                                return { ...f, productos: prods, _detailsLoaded: true };
                            }
                            return f;
                        }));
                    } catch (err) {
                        console.error("Error fetching heavy facturas in background", err);
                    }
                };

                const formattedFacturas = (facRes.data.results || facRes.data).map(f => ({
                    ...f,
                    idManual: f.id_manual,
                    fechaFactura: f.fecha_factura,
                    fechaPago: f.fecha_pago,
                    proveedorNombre: f.proveedor_nombre,
                    productos: [],
                    _detailsLoaded: false
                }));
                setFacturas(formattedFacturas);
                fetchFacturasHeavy(); // Trigger background fetch
            } catch (err) {
                console.error("Error fetching facturas", err);
                setErrorFacturas(true);
            } finally {
                setIsLoadingFacturas(false);
            }
        };

        const fetchMeta = async () => {
            setIsLoadingMeta(true);
            try {
                const [catRes, subRes, ordRes, gruRes, sedesRes, zonasRes] = await Promise.all([
                    API.get('/suministros/categorias/'),
                    API.get('/suministros/subcategorias/'),
                    API.get('/get-pendientes-ids/'),
                    API.get('/suministros/grupos/'),
                    API.get('/suministros/sedes/?page_size=1000'),
                    API.get('/suministros/zonas/?page_size=1000')
                ]);
                const allGrupos = gruRes.data.results || gruRes.data || [];
                setGruposActivos(allGrupos.filter(g => g.activo !== false));
                setSedes(sedesRes.data.results || sedesRes.data || []);
                setZonas(zonasRes.data.results || zonasRes.data || []);
                setCategorias(catRes.data.results || catRes.data);
                setSubcategorias(subRes.data.results || subRes.data);
                setOrdenesPendientes(ordRes.data || []);
            } catch (err) {
                console.error("Error fetching metadata", err);
            } finally {
                setIsLoadingMeta(false);
            }
        };

        fetchFacturas();
        fetchMeta();
    }, []);

    const CATEGORIAS = categorias;
    const SUBCATEGORIAS = subcategorias;

    const resetModal = () => { setForm(emptyForm()); setShowModal(false); };

    const handleField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleValorChange = e => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setForm(prev => ({ ...prev, valor: raw, valorDisplay: raw ? formatCOP(parseInt(raw)) : '' }));
    };

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
                // If product is in a new group, category must match
                if (currentProd.grupoLocalId) {
                    const newGroup = prev.grupoInstances.find(g => String(g.localId) === String(currentProd.grupoLocalId));
                    if (newGroup && String(newGroup.categoriaId) !== String(value)) {
                        showToast(`Este producto pertenece al grupo "${newGroup.nombre}" que exige la categoría seleccionada al crearlo.`, 'error');
                        return prev; // Block change
                    }
                }
                prods[index] = { ...currentProd, categoriaId: value, subcategoriaId: '' };
            } else if (field === 'grupoLocalId') {
                let newVentaId = currentProd.ventaId;
                if (value) {
                    const existGroup = gruposActivos.find(g => String(g.id) === String(value));
                    const newGroup = prev.grupoInstances.find(g => String(g.localId) === String(value));
                    
                    if (existGroup) {
                        newVentaId = String(existGroup.venta || existGroup.venta_id || '');
                        if (currentProd.categoriaId && String(existGroup.categoria || '') !== String(currentProd.categoriaId)) {
                             // Backend groups might not strictly enforce category, but let's warn
                        }
                    } else if (newGroup) {
                        // STRICT VALIDATION FOR NEW GROUPS
                        if (currentProd.categoriaId && String(newGroup.categoriaId) !== String(currentProd.categoriaId)) {
                            showToast(`El grupo "${newGroup.nombre}" es para otra categoría.`, 'error');
                            return prev; // Block assignment
                        }
                        
                        // Venta logic: if group has a ventaId, force it on product
                        if (newGroup.ventaId) {
                            newVentaId = newGroup.ventaId;
                        } else if (currentProd.ventaId) {
                            // If product has a ventaId and group doesn't, assign it to the group
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
                        // Force all products in this new group to share the ventaId
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
        if (!newGrupoCategoria) {
            showToast('Por favor, selecciona una categoría para el nuevo grupo.', 'error');
            return;
        }
        // Verificar que no exista ya un grupo nuevo con ese nombre en esta factura
        const yaExiste = form.grupoInstances.some(g => g.nombre.toLowerCase() === nombre.toLowerCase());
        if (yaExiste) { showToast('Ya existe un grupo con ese nombre en esta factura.', 'error'); return; }
        const localId = newGrupoLocalId();
        setForm(prev => ({
            ...prev,
            grupoInstances: [...prev.grupoInstances, { 
                localId, 
                nombre,
                categoriaId: newGrupoCategoria,
                subcategoriaId: newGrupoSubcategoria || null
            }],
        }));
        setNewGrupoName('');
        setNewGrupoCategoria('');
        setNewGrupoSubcategoria('');
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
    const totalCostos = form.productos.reduce((acc, p) => {
        const prodCosto = parseInt(p.costo) || 0;
        const telaCosto = p.lleva_tela ? (parseFloat(p.tela_costo_metro) || 0) * (parseFloat(p.tela_cantidad_metros) || 0) : 0;
        return acc + ((prodCosto + telaCosto) * (parseInt(p.cantidad) || 1));
    }, 0);
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
                    categoria_id: instance.categoriaId,
                    subcategoria_id: instance.subcategoriaId,
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
                estado_fisico: p.estado_fisico,
                zona: p.zonaId ? parseInt(p.zonaId) : null,
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
                    grupo_categoria_nombre: p.grupo_categoria_nombre,
                    grupo_subcategoria_nombre: p.grupo_subcategoria_nombre,
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

    const [loadingDetailsId, setLoadingDetailsId] = useState(null);

    const toggleExpand = async (id) => {
        if (expandedId === id) {
            setExpandedId(null);
            return;
        }

        // Mostrar fila expandida de inmediato
        setExpandedId(id);

        const factura = facturas.find(f => f.id === id);
        if (factura && !factura._detailsLoaded) {
            setLoadingDetailsId(id);
            try {
                const res = await API.get(`/suministros/facturas/${id}/`);
                const fData = res.data;
                const prods = (fData.items_inventario || []).map(p => ({
                    ...p,
                    id: p.id_referencia,
                    referenciaId: p.referencia,
                    categoriaId: p.categoria,
                    subcategoriaId: p.subcategoria,
                    ventaId: p.venta_id,
                    costo: p.costo_especifico,
                    grupo_categoria_nombre: p.grupo_categoria_nombre,
                    grupo_subcategoria_nombre: p.grupo_subcategoria_nombre,
                }));
                setFacturas(prev => prev.map(f => 
                    f.id === id ? { ...f, productos: prods, _detailsLoaded: true } : f
                ));
            } catch (err) {
                console.error("Error cargando detalles", err);
                showToast("Error al cargar detalles de la factura", "error");
            } finally {
                setLoadingDetailsId(null);
            }
        }
    };

    // Returns the visual estado: if 'pendiente' but fechaPago is in the past, show as 'atrasada'
    const getEfectiveEstado = (f) => {
        const estado = (f.estado || 'pendiente').toLowerCase();
        if (estado === 'pendiente' && f.fechaPago) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const fechaPagoDate = new Date(f.fechaPago + 'T00:00:00');
            if (fechaPagoDate < today) return 'atrasada';
        }
        return estado;
    };

    const filteredFacturas = React.useMemo(() => {
        return facturas.filter(f => {
            if (filterSearch) {
                const q = filterSearch.toLowerCase();
                if (
                    !String(f.id).toLowerCase().includes(q) &&
                    !(f.idManual || '').toLowerCase().includes(q)
                ) return false;
            }
            if (filterEstado && getEfectiveEstado(f) !== filterEstado.toLowerCase()) return false;
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
                    {hasPermission('CREAR_FACTURA') && (
                        <button className="v-btn-primary-glow" onClick={() => setShowModal(true)}>
                            <FaPlus />
                            <span>Nueva Factura</span>
                        </button>
                    )}
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
                            {isLoadingFacturas ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <tr key={index} className="skeleton-row">
                                        <td><div className="skeleton skeleton-text" style={{ width: '40px' }}></div></td>
                                        <td><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                                        <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                                        <td><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                                        <td><div className="skeleton skeleton-badge"></div></td>
                                        <td><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                                        <td><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                                        <td style={{ textAlign: 'center' }}><div className="skeleton skeleton-text" style={{ width: '20px', margin: '0 auto' }}></div></td>
                                    </tr>
                                ))
                            ) : errorFacturas ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', color: '#ef4444', padding: '3rem', fontStyle: 'italic' }}>No se pudieron cargar las facturas.</td></tr>
                            ) : filteredFacturas.length === 0 ? (
                                <tr><td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem', fontStyle: 'italic' }}>No se encontraron facturas.</td></tr>
                            ) : filteredFacturas.map(f => (
                                <React.Fragment key={f.id}>
                                    <tr className={expandedId === f.id ? 'expanded-row-highlight' : ''} onClick={() => toggleExpand(f.id)} style={{ cursor: 'pointer' }}>
                                        <td><span className="id-manual-badge">{f.idManual}</span></td>
                                        <td title={f.proveedorNombre}>{f.proveedorNombre}</td>
                                        <td title={formatDate(f.fechaFactura)}>{formatDate(f.fechaFactura)}</td>
                                        <td title={f.fechaPago ? formatDate(f.fechaPago) : '—'}>{f.fechaPago ? formatDate(f.fechaPago) : <span className="empty-val">—</span>}</td>
                                        <td>
                                            <span className={getEstadoClass(getEfectiveEstado(f))}>
                                                {ESTADOS_FACTURA.find(e => e.value === getEfectiveEstado(f))?.label
                                                    || (getEfectiveEstado(f) ? getEfectiveEstado(f).charAt(0).toUpperCase() + getEfectiveEstado(f).slice(1) : 'Pendiente')}
                                            </span>
                                        </td>
                                        <td title={formatCOP(f.valor)}><span className="valor-cop">{formatCOP(f.valor)}</span></td>
                                        <td className="obs-cell" title={f.observaciones || ''}>{f.observaciones || <span className="empty-val">—</span>}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="action-btn" onClick={(e) => { e.stopPropagation(); toggleExpand(f.id); }}>
                                                {expandedId === f.id ? <FaChevronUp /> : <FaChevronDown />}
                                            </button>
                                        </td>
                                    </tr>

                                    {expandedId === f.id && (
                                        <tr className="expanded-row">
                                            <td colSpan="8">
                                                <div className="factura-expanded-premium">
                                                    {loadingDetailsId === f.id ? (
                                                        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                            <div className="skeleton-badge" style={{ width: 48, height: 48, borderRadius: '50%', marginBottom: '1rem' }}></div>
                                                            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Cargando detalles de la factura...</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="expanded-top-bar">
                                                                <div className="expanded-label">
                                                                    <FaBoxOpen />
                                                                    <span>Referencias Recibidas · {f.productos?.length || 0} ítem{(f.productos?.length || 0) !== 1 ? 's' : ''}</span>
                                                                </div>

                                                                <div className="obs-card">
                                                                    <div className="obs-icon"><FaEdit /></div>
                                                                    <div className="obs-text-area">
                                                                        <div className="obs-meta-label">Observación de Factura</div>
                                                                        <p className={`obs-value${!f.observaciones ? ' empty' : ''}`}>
                                                                            {f.observaciones || 'Sin observaciones'}
                                                                        </p>
                                                                    </div>
                                                                    {hasPermission('EDITAR_FACTURA') && (
                                                                        <button
                                                                            className="btn-edit-obs"
                                                                            onClick={() => setEditModal({ id: f.id, observaciones: f.observaciones || '', estado: f.estado || 'pendiente' })}
                                                                        >
                                                                            <FaEdit /> Editar
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="expanded-items-section">
                                                                {f.productos && f.productos.length > 0 ? (
                                                                    <div className="expanded-items-list">
                                                                        {(() => {
                                                                            const standalones = [];
                                                                            const grouped = {};
                                                                            
                                                                            f.productos.forEach((p, originalIndex) => {
                                                                                const gName = p.grupo_nombre;
                                                                                if (gName) {
                                                                                    if (!grouped[gName]) grouped[gName] = [];
                                                                                    grouped[gName].push({ ...p, originalIndex });
                                                                                } else {
                                                                                    standalones.push({ ...p, originalIndex });
                                                                                }
                                                                            });

                                                                            const renderProductCard = (p, keyIndex) => {
                                                                                const refNombre = p.referencia_nombre || p.producto_nombre || (p.referenciaId ? `Ref. #${p.referenciaId}` : '—');
                                                                                const catNombre = p.categoria_nombre || null;
                                                                                const subNombre = p.subcategoria_nombre || null;
                                                                                const grupoNombre = p.grupo_nombre || null;
                                                                                return (
                                                                                    <div key={keyIndex} className="invoice-item-card compact-card">
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
                                                                                                    {p.disponibilidad === 'no_venta' ? 'No a la venta' : p.disponibilidad === 'exhibicion' ? 'Exhibición' : p.disponibilidad === 'consignacion' ? 'Consignación' : p.disponibilidad === 'cliente' ? 'Cliente' : p.disponibilidad === 'por_despachar' ? 'Por Despachar' : (p.disponibilidad.charAt(0).toUpperCase() + p.disponibilidad.slice(1))}
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
                                                                            };

                                                                            const elements = [];
                                                                            
                                                                            Object.entries(grouped).forEach(([gName, items]) => {
                                                                                const isExpanded = expandedNestedGroups[`${f.id}-${gName}`];
                                                                                
                                                                                const totalCosto = items.reduce((acc, item) => acc + (parseFloat(item.costo) || 0), 0);
                                                                                
                                                                                const catLabel = items[0]?.grupo_categoria_nombre || '';
                                                                                const subcatLabel = items[0]?.grupo_subcategoria_nombre || '';
                                                                                
                                                                                const ventas = [...new Set(items.map(i => i.ventaId).filter(Boolean))];
                                                                                const ventasLabel = ventas.length > 0 ? `Venta: #${ventas.join(', #')}` : null;
                                                                                
                                                                                const dispCounts = {};
                                                                                items.forEach(i => {
                                                                                    const d = i.disponibilidad || 'sin_asignar';
                                                                                    dispCounts[d] = (dispCounts[d] || 0) + 1;
                                                                                });
                                                                                const dispLabels = Object.entries(dispCounts).map(([d, count]) => {
                                                                                    const dLabel = d === 'no_venta' ? 'No a la venta' : d === 'exhibicion' ? 'Exhibición' : d === 'consignacion' ? 'Consignación' : d === 'cliente' ? 'Cliente' : d === 'por_despachar' ? 'Por Despachar' : d === 'sin_asignar' ? 'Sin asignar' : d.charAt(0).toUpperCase() + d.slice(1);
                                                                                    return `${count} ${dLabel}`;
                                                                                }).join(', ');

                                                                                const badStateItems = items.filter(i => i.estado_fisico && i.estado_fisico !== 'buen_estado');
                                                                                const badStateCount = badStateItems.length;

                                                                                const sortedItems = [...items].sort((a, b) => {
                                                                                    const subA = a.subcategoria_nombre || '';
                                                                                    const subB = b.subcategoria_nombre || '';
                                                                                    if (subA !== subB) return subA.localeCompare(subB);
                                                                                    const nameA = a.referencia_nombre || a.producto_nombre || (a.referenciaId ? `Ref. #${a.referenciaId}` : '');
                                                                                    const nameB = b.referencia_nombre || b.producto_nombre || (b.referenciaId ? `Ref. #${b.referenciaId}` : '');
                                                                                    return nameA.localeCompare(nameB);
                                                                                });

                                                                                elements.push(
                                                                                    <div key={`group-${gName}`} className="invoice-group-card" style={{ gridColumn: '1 / -1', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.5rem', background: '#fff', alignSelf: 'start', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                                                                        <div className="group-header" onClick={() => toggleNestedGroup(f.id, gName)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', cursor: 'pointer', borderBottom: isExpanded ? '1px solid #cbd5e1' : 'none', transition: 'background 0.2s', gap: '1rem' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                                                                            <div className="group-info" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1 }}>
                                                                                                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                                                                                                    <FaLayerGroup />
                                                                                                </div>
                                                                                                <div style={{ flex: 1 }}>
                                                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                                                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>{gName}</h4>
                                                                                                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{formatCOP(totalCosto)}</span>
                                                                                                    </div>
                                                                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                                                                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>{items.length} ítem{items.length !== 1 ? 's' : ''}</span>
                                                                                                        {catLabel && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 500 }}>{catLabel}</span>}
                                                                                                        {subcatLabel && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 500 }}>{subcatLabel}</span>}
                                                                                                        {ventasLabel && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 500, display: 'flex', alignItems: 'center' }}><FaShoppingCart style={{marginRight: 4}}/> {ventasLabel}</span>}
                                                                                                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontWeight: 500 }} title="Disponibilidad general">{dispLabels}</span>
                                                                                                        {badStateCount > 0 && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 500, display: 'flex', alignItems: 'center' }}><FaExclamationTriangle style={{marginRight: 4}}/> {badStateCount} en mal estado</span>}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                            <button className="btn-expand-group" style={{ background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0, fontSize: '0.85rem' }} onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}>
                                                                                                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                                                                                            </button>
                                                                                        </div>
                                                                                        {isExpanded && (
                                                                                            <div className="group-items-container" style={{ padding: '1.25rem', background: '#f8fafc', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                                                                                {sortedItems.map((item) => renderProductCard(item, item.originalIndex))}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            });
                                                                            
                                                                            standalones.forEach(item => {
                                                                                elements.push(renderProductCard(item, item.originalIndex));
                                                                            });

                                                                            return elements;
                                                                        })()}
                                                                    </div>
                                                                ) : (
                                                                    <div className="no-items-expanded">No hay referencias registradas en esta factura.</div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
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
                                    <div className="fct-grupo-create-row" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            className="fct-grupo-name-input"
                                            style={{ flex: 1, minWidth: '200px' }}
                                            placeholder="Nombre del nuevo grupo (ej: Comedor Qatar)..."
                                            value={newGrupoName}
                                            onChange={e => setNewGrupoName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGrupoInstance(); } }}
                                        />
                                        <select 
                                            className="fct-grupo-name-input" 
                                            style={{ flex: 1, minWidth: '150px' }}
                                            value={newGrupoCategoria}
                                            onChange={e => {
                                                setNewGrupoCategoria(e.target.value);
                                                setNewGrupoSubcategoria(''); // Reset subcategory when category changes
                                            }}
                                        >
                                            <option value="">Categoría (Obligatorio)...</option>
                                            {CATEGORIAS.map(c => (
                                                <option key={c.id} value={c.id}>{c.nombre}</option>
                                            ))}
                                        </select>
                                        <select 
                                            className="fct-grupo-name-input" 
                                            style={{ flex: 1, minWidth: '150px' }}
                                            value={newGrupoSubcategoria}
                                            onChange={e => setNewGrupoSubcategoria(e.target.value)}
                                            disabled={!newGrupoCategoria}
                                        >
                                            <option value="">Subcategoría (Opcional)...</option>
                                            {SUBCATEGORIAS.filter(s => String(s.categoria) === String(newGrupoCategoria)).map(s => (
                                                <option key={s.id} value={s.id}>{s.nombre}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            className="fct-grupo-create-btn"
                                            onClick={addGrupoInstance}
                                            disabled={!newGrupoName.trim() || !newGrupoCategoria}
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
                                            <div className={`fct-ref-row2${(row.disponibilidad === 'cliente' || row.disponibilidad === 'por_despachar') ? ' fct-ref-row2-venta' : ''}`}>
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
                                                    {((parseInt(row.costo) > 0 || (row.lleva_tela && parseInt(row.tela_costo_metro) > 0)) && parseInt(row.cantidad) > 1) && (
                                                        <span className="fct-subtotal-hint">
                                                            = {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
                                                                ((parseInt(row.costo) || 0) + (row.lleva_tela ? (parseFloat(row.tela_costo_metro) || 0) * (parseFloat(row.tela_cantidad_metros) || 0) : 0)) * (parseInt(row.cantidad) || 1)
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="fct-field">
                                                    <label>Estado Físico</label>
                                                    <select value={row.estado_fisico} onChange={e => handleRefRow(index, 'estado_fisico', e.target.value)}>
                                                        <option value="buen_estado">Buen estado</option>
                                                        <option value="por_reparar">Por reparar</option>
                                                        <option value="por_modificar">Por modificar</option>
                                                    </select>
                                                </div>
                                                <div className="fct-field">
                                                    <label>Zona Inicial</label>
                                                    <select value={row.zonaId} onChange={e => handleRefRow(index, 'zonaId', e.target.value)}>
                                                        <option value="">Seleccione Zona...</option>
                                                        {sedes.map(sede => (
                                                            <optgroup key={sede.id} label={sede.nombre}>
                                                                {zonas.filter(z => z.sede === sede.id).map(z => (
                                                                    <option key={z.id} value={z.id}>{z.nombre}</option>
                                                                ))}
                                                            </optgroup>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="fct-field">
                                                    <label>Disponibilidad</label>
                                                    <select value={row.disponibilidad} onChange={e => handleRefRow(index, 'disponibilidad', e.target.value)}>
                                                        <option value="exhibicion">Exhibición</option>
                                                        <option value="cliente">Cliente</option>
                                                        <option value="por_despachar">Por Despachar</option>
                                                        <option value="por_reparar">Por Reparar</option>
                                                        <option value="consignacion">Consignación</option>
                                                        <option value="no_venta">No a la venta</option>
                                                    </select>
                                                </div>
                                                {(row.disponibilidad === 'cliente' || row.disponibilidad === 'por_despachar') && (
                                                    <div className="fct-field">
                                                        <label>Venta Asociada</label>
                                                        <select 
                                                            value={row.ventaId} 
                                                            disabled={!!row.grupoLocalId}
                                                            onChange={e => handleRefRow(index, 'ventaId', e.target.value)}>
                                                            <option value="">Seleccione...</option>
                                                            {ordenesPendientes.map(id => <option key={id} value={id}>{id}</option>)}
                                                        </select>
                                                        {row.grupoLocalId && (
                                                            <small style={{ color: '#f59e0b', display: 'block', marginTop: '0.2rem', fontSize: '0.7rem', lineHeight: '1.2' }}>
                                                                Hereda la venta del grupo asignado.
                                                            </small>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Fila 3: Grupo | Observación | Imagen | Trash */}
                                            <div className="fct-ref-row3">
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
                                                                <button type="button" className="fct-img-btn" onClick={() => showToast('Simulación: cámara', 'success')}>
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

                                            {/* Fila 3: Tela */}
                                            <div className="fct-ref-row3" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, cursor: 'pointer', margin: 0, color: '#64748b', fontSize: '0.8rem' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={row.lleva_tela} 
                                                        onChange={e => handleTelaChange(index, 'lleva_tela', e.target.checked)}
                                                        style={{ width: '0.9rem', height: '0.9rem', accentColor: 'var(--color-primary)' }}
                                                    />
                                                    ¿Lleva tela?
                                                </label>
                                                
                                                {row.lleva_tela && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Ref. Tela" 
                                                            value={row.tela_referencia || ''} 
                                                            onChange={e => handleTelaChange(index, 'tela_referencia', e.target.value)}
                                                            style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                        />
                                                        <input 
                                                            type="text" 
                                                            placeholder="Color" 
                                                            value={row.tela_color || ''} 
                                                            onChange={e => handleTelaChange(index, 'tela_color', e.target.value)}
                                                            style={{ width: '80px', padding: '0.4rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                        />
                                                        <div style={{ position: 'relative', width: '90px' }}>
                                                            <span style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }}>$</span>
                                                            <input 
                                                                type="text" 
                                                                placeholder="Costo/m"
                                                                value={row.tela_costo_metro ? formatCOP(parseInt(row.tela_costo_metro)) : ''} 
                                                                onChange={e => {
                                                                    const raw = e.target.value.replace(/[^0-9]/g, '');
                                                                    handleTelaChange(index, 'tela_costo_metro', raw);
                                                                }}
                                                                style={{ width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.2rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                            />
                                                        </div>
                                                        <input 
                                                            type="number" 
                                                            step="0.1"
                                                            min="0"
                                                            placeholder="Metros" 
                                                            value={row.tela_cantidad_metros || ''} 
                                                            onChange={e => handleTelaChange(index, 'tela_cantidad_metros', e.target.value)}
                                                            style={{ width: '70px', padding: '0.4rem', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                        />
                                                    </div>
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
