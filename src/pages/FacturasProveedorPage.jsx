import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';
import { AppContext, usePermissions } from '../AppContext';
import { formatCOP, parseCOP } from '../utils/formatCOP';
import { FaPlus, FaTrashAlt, FaChevronDown, FaChevronUp, FaEdit, FaSave, FaTimes, FaBoxOpen, FaImage, FaCamera, FaUpload, FaSearch, FaLayerGroup, FaCheckCircle, FaExclamationCircle, FaShoppingCart, FaExclamationTriangle, FaSort, FaSortUp, FaSortDown, FaSpinner } from 'react-icons/fa';
import './FacturasProveedorPage.css';
import './VentasImprovements.css';

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
    telas_cueros: [],  // [{ tipo, referencia, color, unidad_medida, costo_unidad, cantidad }]
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

// Estados disponibles para facturas en frontend
const ESTADOS_FACTURA = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'por_pagar', label: 'Por pagar' },
    { value: 'atrasado', label: 'Atrasado' },
    { value: 'pagado', label: 'Pagado' },
];

function FacturasProveedorPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { proveedores, usuario } = useContext(AppContext);
    const hasPermission = usePermissions();
    const canEditFechas = hasPermission('EDITAR_FECHAS_FACTURA');
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

    useEffect(() => {
        if (location.state?.toastMessage) {
            showToast(location.state.toastMessage, location.state.toastType || 'success');
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state]);

    // Filtros & Ordenamiento
    const [selectedEstados, setSelectedEstados] = useState(['pendiente', 'por_pagar', 'atrasado']);
    const [selectedProveedores, setSelectedProveedores] = useState([]);
    const [filterFechaDesde, setFilterFechaDesde] = useState('');
    const [filterFechaHasta, setFilterFechaHasta] = useState('');
    const [filterSearch, setFilterSearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'fechaPago', direction: 'asc' });

    // Modal editar factura (obs + estado + fechas + productos)
    const [editModal, setEditModal] = useState(null);

    // Popovers de filtro
    const [isEstadosOpen, setIsEstadosOpen] = useState(false);
    const [isProveedoresOpen, setIsProveedoresOpen] = useState(false);
    const estadosRef = useRef(null);
    const proveedoresRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (estadosRef.current && !estadosRef.current.contains(event.target)) {
                setIsEstadosOpen(false);
            }
            if (proveedoresRef.current && !proveedoresRef.current.contains(event.target)) {
                setIsProveedoresOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { data: referencias = [] } = useQuery({
        queryKey: ['productos-all'],
        queryFn: async () => {
            const res = await API.get('/referencias/');
            return res.data.results || res.data || [];
        },
    });

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
                            const rawItems = (hf.items_inventario && hf.items_inventario.length > 0)
                                ? hf.items_inventario
                                : (hf.detalles || hf.productos || []);
                            const prods = rawItems.map(p => ({
                                ...p,
                                id: p.id_referencia || p.id,
                                referenciaId: p.referencia,
                                referencia_nombre: p.referencia_nombre || p.producto_nombre || (p.referencia ? `Ref. #${p.referencia}` : '—'),
                                categoriaId: p.categoria,
                                subcategoriaId: p.subcategoria,
                                ventaId: p.venta_id || p.venta,
                                costo: p.costo_especifico !== undefined ? p.costo_especifico : p.costo,
                                grupo_nombre: p.grupo_nombre || (p.grupo ? p.grupo.nombre : null),
                                grupo_id: p.grupo_id || (p.grupo ? (typeof p.grupo === 'object' ? p.grupo.id : p.grupo) : null),
                                grupo_categoria_nombre: p.grupo_categoria_nombre,
                                grupo_subcategoria_nombre: p.grupo_subcategoria_nombre,
                            }));
                            return { ...f, ...hf, productos: prods, _detailsLoaded: true };
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

    // Carga inicial: fetchMeta y fetchFacturas en paralelo — una sola vez
    useEffect(() => {
        fetchMeta();
        fetchFacturas();
    }, []);

    const CATEGORIAS = categorias;
    const SUBCATEGORIAS = subcategorias;

    const resetModal = () => { setForm(emptyForm()); setShowModal(false); };

    const handleField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleValorChange = e => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setForm(prev => ({ ...prev, valor: raw, valorDisplay: raw ? formatCOP(parseInt(raw)) : '' }));
    };

    // ─── Telas y Cueros handlers ────────────────────────────────────────────
    const addTelaCueroToRow = (rowIndex) => {
        setForm(prev => {
            const prods = [...prev.productos];
            const tc = prods[rowIndex].telas_cueros || [];
            prods[rowIndex] = { ...prods[rowIndex], telas_cueros: [...tc, { tipo: 'tela', referencia: '', color: '', costo_unidad: '', cantidad: '' }] };
            return { ...prev, productos: prods };
        });
    };

    const updateTelaCueroInRow = (rowIndex, tcIndex, field, value) => {
        setForm(prev => {
            const prods = [...prev.productos];
            const tc = [...(prods[rowIndex].telas_cueros || [])];
            tc[tcIndex] = { ...tc[tcIndex], [field]: value };
            prods[rowIndex] = { ...prods[rowIndex], telas_cueros: tc };
            return { ...prev, productos: prods };
        });
    };

    const removeTelaCueroFromRow = (rowIndex, tcIndex) => {
        setForm(prev => {
            const prods = [...prev.productos];
            const tc = (prods[rowIndex].telas_cueros || []).filter((_, i) => i !== tcIndex);
            prods[rowIndex] = { ...prods[rowIndex], telas_cueros: tc };
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

    // Total = sum of (cost * quantity) per row (fabric cost is saved separately as extra product cost)
    const totalCostos = form.productos.reduce((acc, p) => {
        const prodCosto = parseInt(p.costo) || 0;
        return acc + (prodCosto * (parseInt(p.cantidad) || 1));
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
                telas_cueros: (p.telas_cueros || []).map(tc => ({
                    tipo: tc.tipo || 'tela',
                    referencia: (tc.referencia || '').trim(),
                    color: (tc.color || '').trim(),
                    unidad_medida: tc.tipo === 'cuero' ? 'decimetro' : 'metro',
                    costo_unidad: parseCOP(tc.costo_unidad),
                    cantidad: parseFloat(tc.cantidad) || 0
                }))
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
        if (!factura || !factura._detailsLoaded || !factura.productos || factura.productos.length === 0) {
            setLoadingDetailsId(id);
            try {
                const res = await API.get(`/suministros/facturas/${id}/`);
                const fData = res.data;
                const rawItems = (fData.items_inventario && fData.items_inventario.length > 0) 
                    ? fData.items_inventario 
                    : (fData.detalles || fData.productos || []);
                const prods = rawItems.map(p => ({
                    ...p,
                    id: p.id_referencia || p.id,
                    referenciaId: p.referencia,
                    referencia_nombre: p.referencia_nombre || p.producto_nombre || (p.referencia ? `Ref. #${p.referencia}` : '—'),
                    categoriaId: p.categoria,
                    subcategoriaId: p.subcategoria,
                    ventaId: p.venta_id || p.venta,
                    costo: p.costo_especifico !== undefined ? p.costo_especifico : p.costo,
                    grupo_nombre: p.grupo_nombre || (p.grupo ? p.grupo.nombre : null),
                    grupo_categoria_nombre: p.grupo_categoria_nombre,
                    grupo_subcategoria_nombre: p.grupo_subcategoria_nombre,
                    vendedor_nombre: p.vendedor_nombre,
                }));
                setFacturas(prev => prev.map(f => 
                    f.id === id ? { ...f, ...fData, productos: prods, _detailsLoaded: true } : f
                ));
            } catch (err) {
                console.error("Error cargando detalles", err);
                showToast("Error al cargar detalles de la factura", "error");
            } finally {
                setLoadingDetailsId(null);
            }
        }
    };

    // Returns the visual estado based on fechaPago and pagado flag
    const getEfectiveEstado = (f) => {
        const estado = (f.estado || 'pendiente').toLowerCase();
        if (estado === 'pagada' || estado === 'pagado') return 'pagado';
        if (estado === 'anulada') return 'anulada';

        const todayStr = getTodayStr();
        const fechaPagoStr = f.fechaPago ? String(f.fechaPago).split('T')[0] : '';
        if (!fechaPagoStr) return 'pendiente';

        if (fechaPagoStr > todayStr) return 'pendiente';
        if (fechaPagoStr === todayStr) return 'por_pagar';
        return 'atrasado';
    };

    const getEstadoClass = (effectiveEstado) => {
        const e = (effectiveEstado || '').toLowerCase();
        if (e === 'pagado' || e === 'pagada') return 'status-badge status-pagado';
        if (e === 'por_pagar') return 'status-badge status-por-pagar';
        if (e === 'atrasado' || e === 'atrasada') return 'status-badge status-atrasado';
        if (e === 'anulada') return 'status-badge status-anulada';
        return 'status-badge status-pendiente';
    };

    const getEstadoLabel = (effectiveEstado) => {
        const e = (effectiveEstado || '').toLowerCase();
        if (e === 'pagado' || e === 'pagada') return 'Pagado';
        if (e === 'por_pagar') return 'Por pagar';
        if (e === 'atrasado' || e === 'atrasada') return 'Atrasado';
        if (e === 'anulada') return 'Anulada';
        return 'Pendiente';
    };

    const allProveedorOptions = React.useMemo(() => {
        return [...new Set(facturas.map(f => f.proveedorNombre))].filter(Boolean);
    }, [facturas]);

    const toggleEstado = (estadoVal) => {
        setSelectedEstados(prev => {
            if (prev.includes(estadoVal)) {
                return prev.filter(e => e !== estadoVal);
            } else {
                return [...prev, estadoVal];
            }
        });
    };

    const selectAllEstados = () => {
        if (selectedEstados.length === ESTADOS_FACTURA.length) {
            setSelectedEstados([]);
        } else {
            setSelectedEstados(ESTADOS_FACTURA.map(e => e.value));
        }
    };

    const toggleProveedor = (provName) => {
        setSelectedProveedores(prev => {
            if (prev.includes(provName)) {
                return prev.filter(p => p !== provName);
            } else {
                return [...prev, provName];
            }
        });
    };

    const selectAllProveedores = (allNames) => {
        if (selectedProveedores.length === allNames.length) {
            setSelectedProveedores([]);
        } else {
            setSelectedProveedores(allNames);
        }
    };

    const handleSort = (key) => {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const renderSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <FaSort style={{ opacity: 0.35, fontSize: '0.75rem', flexShrink: 0 }} />;
        }
        return sortConfig.direction === 'asc' 
            ? <FaSortUp style={{ color: '#274385', fontSize: '0.8rem', flexShrink: 0, marginBottom: '-2px' }} />
            : <FaSortDown style={{ color: '#274385', fontSize: '0.8rem', flexShrink: 0, marginTop: '-2px' }} />;
    };

    const filteredFacturas = React.useMemo(() => {
        let result = facturas.filter(f => {
            if (filterSearch) {
                const q = filterSearch.toLowerCase();
                if (
                    !String(f.id).toLowerCase().includes(q) &&
                    !(f.idManual || '').toLowerCase().includes(q) &&
                    !(f.proveedorNombre || '').toLowerCase().includes(q)
                ) return false;
            }

            const effEst = getEfectiveEstado(f);
            if (selectedEstados.length > 0 && !selectedEstados.includes(effEst)) {
                return false;
            }

            if (selectedProveedores.length > 0 && !selectedProveedores.includes(f.proveedorNombre)) {
                return false;
            }

            if (filterFechaDesde && f.fechaFactura < filterFechaDesde) return false;
            if (filterFechaHasta && f.fechaFactura > filterFechaHasta) return false;

            return true;
        });

        if (sortConfig.key) {
            result.sort((a, b) => {
                if (sortConfig.key === 'id' || sortConfig.key === 'idManual') {
                    const numA = parseInt(String(a.idManual || a.id).replace(/[^0-9]/g, '')) || 0;
                    const numB = parseInt(String(b.idManual || b.id).replace(/[^0-9]/g, '')) || 0;
                    return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
                }
                if (sortConfig.key === 'valor') {
                    const numA = parseFloat(a.valor) || 0;
                    const numB = parseFloat(b.valor) || 0;
                    return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
                }

                let valA = '';
                let valB = '';
                if (sortConfig.key === 'proveedor') {
                    valA = (a.proveedorNombre || '').toLowerCase();
                    valB = (b.proveedorNombre || '').toLowerCase();
                } else if (sortConfig.key === 'fechaFactura') {
                    valA = a.fechaFactura || '';
                    valB = b.fechaFactura || '';
                } else if (sortConfig.key === 'fechaPago') {
                    valA = a.fechaPago || '';
                    valB = b.fechaPago || '';
                } else if (sortConfig.key === 'estado') {
                    valA = getEfectiveEstado(a);
                    valB = getEfectiveEstado(b);
                } else {
                    valA = a[sortConfig.key] || '';
                    valB = b[sortConfig.key] || '';
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [facturas, filterSearch, selectedEstados, selectedProveedores, filterFechaDesde, filterFechaHasta, sortConfig]);

    const defaultEstados = ['pendiente', 'por_pagar', 'atrasado'];
    const estadosModified = selectedEstados.length !== defaultEstados.length || !selectedEstados.every(e => defaultEstados.includes(e));
    const hasFilters = estadosModified || selectedProveedores.length > 0 || filterFechaDesde || filterFechaHasta || filterSearch;
    const handleClearFilters = () => {
        setSelectedEstados(['pendiente', 'por_pagar', 'atrasado']);
        setSelectedProveedores([]);
        setFilterFechaDesde('');
        setFilterFechaHasta('');
        setFilterSearch('');
    };

    // Abrir modal de edición de factura cargando referencias y telas
    const openEditModal = async (f) => {
        setLoadingDetailsId(f.id);
        try {
            const res = await API.get(`/suministros/facturas/${f.id}/`);
            const fData = res.data;
            const rawItems = (fData.items_inventario && fData.items_inventario.length > 0)
                ? fData.items_inventario
                : (fData.detalles || fData.productos || f.productos || []);
            
            const prods = rawItems.map(p => ({
                id: p.id_referencia || p.id,
                referenciaId: p.referencia,
                referencia_nombre: p.referencia_nombre || p.producto_nombre || (p.referencia ? `Ref. #${p.referencia}` : '—'),
                categoria: p.categoria,
                subcategoria: p.subcategoria,
                variacion: p.variacion || '',
                costo: p.costo_especifico !== undefined ? p.costo_especifico : (p.costo || 0),
                observacion: p.observacion || '',
                disponibilidad: p.disponibilidad || 'exhibicion',
                estado_fisico: p.estado_fisico || 'buen_estado',
                zona: p.zona,
                venta: p.venta_id || p.venta,
                grupo: p.grupo_id || p.grupo,
                lleva_tela: Boolean(p.telas_cueros && p.telas_cueros.length > 0),
                tela_referencia: p.telas_cueros && p.telas_cueros.length > 0 ? p.telas_cueros[0].referencia : '',
                tela_color: p.telas_cueros && p.telas_cueros.length > 0 ? p.telas_cueros[0].color : '',
                tela_costo_metro: p.telas_cueros && p.telas_cueros.length > 0 ? p.telas_cueros[0].costo_unidad : '',
                tela_cantidad_metros: p.telas_cueros && p.telas_cueros.length > 0 ? p.telas_cueros[0].cantidad : '',
                telas_cueros: p.telas_cueros || (p.tela_referencia
                    ? [{
                        tipo: 'tela',
                        referencia: p.tela_referencia || '',
                        color: p.tela_color || '',
                        unidad_medida: 'metro',
                        costo_unidad: p.tela_costo_metro || '',
                        cantidad: p.tela_cantidad_metros || ''
                    }]
                    : [])
            }));

            const cleanDate = (dStr) => {
                if (!dStr) return '';
                const s = String(dStr).trim();
                if (s.includes('T')) return s.split('T')[0];
                if (s.includes(' ')) return s.split(' ')[0];
                return s;
            };

            setEditModal({
                id: f.id,
                id_manual: fData.id_manual || f.id_manual || f.idManual || '',
                estado: fData.estado || f.estado || 'pendiente',
                fecha_factura: cleanDate(fData.fecha_factura || f.fecha_factura || f.fechaFactura),
                fecha_pago: cleanDate(fData.fecha_pago || f.fecha_pago || f.fechaPago),
                observaciones: fData.observaciones || f.observaciones || '',
                productos: prods,
            });
        } catch (err) {
            console.error("Error al cargar datos para edición", err);
            showToast("Error al abrir edición de factura", "error");
        } finally {
            setLoadingDetailsId(null);
        }
    };

    // Guardar desde el modal de edición
    const saveEditModal = async () => {
        if (!editModal) return;
        setIsSavingEdit(true);
        try {
            const validProductos = (editModal.productos || [])
                .map(p => {
                    const refNum = parseInt(p.referenciaId || p.referencia);
                    if (isNaN(refNum)) return null;
                    return {
                        referencia: refNum,
                        categoria: p.categoria ? parseInt(p.categoria) : null,
                        subcategoria: p.subcategoria ? parseInt(p.subcategoria) : null,
                        variacion: p.variacion || '',
                        costo: parseFloat(p.costo) || 0,
                        cantidad: parseInt(p.cantidad) || 1,
                        grupo_id: p.grupo ? parseInt(p.grupo) : null,
                        observacion: p.observacion || '',
                        disponibilidad: p.disponibilidad || 'exhibicion',
                        estado_fisico: p.estado_fisico || 'buen_estado',
                        zona: p.zona ? parseInt(p.zona) : null,
                        venta_id: p.venta ? parseInt(p.venta) : null,
                        telas_cueros: (p.telas_cueros || []).map(tc => ({
                            tipo: tc.tipo || 'tela',
                            referencia: (tc.referencia || '').trim(),
                            color: (tc.color || '').trim(),
                            unidad_medida: tc.tipo === 'cuero' ? 'decimetro' : 'metro',
                            costo_unidad: parseFloat(tc.costo_unidad) || 0,
                            cantidad: parseFloat(tc.cantidad) || 0
                        }))
                    };
                })
                .filter(Boolean);

            const payload = {
                id_manual: editModal.id_manual,
                estado: editModal.estado,
                observaciones: editModal.observaciones,
                fecha_factura: editModal.fecha_factura || null,
                fecha_pago: editModal.fecha_pago || null,
                productos: validProductos
            };

            await API.patch(`/suministros/facturas/${editModal.id}/`, payload);
            showToast("Factura y parámetros actualizados correctamente.", "success");
            setEditModal(null);
            fetchFacturas();
        } catch (err) {
            console.error("Error al guardar edición de factura:", err);
            const serverMsg = err.response?.data?.detail || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : '');
            showToast(serverMsg ? `Error: ${serverMsg}` : "Error al actualizar la factura.", "error");
        } finally {
            setIsSavingEdit(false);
        }
    };

    return (
        <div className="page-container">
            <div className="v-glass-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', overflow: 'visible' }}>
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
                    {/* Estado Multi-Select Checklist */}
                    <div className="v-multi-select-container" ref={estadosRef}>
                        <button
                            type="button"
                            className={`v-multi-select-btn ${selectedEstados.length > 0 ? 'active-filter' : ''} ${isEstadosOpen ? 'open' : ''}`}
                            onClick={() => setIsEstadosOpen(prev => !prev)}
                        >
                            <span>
                                {selectedEstados.length === 0
                                    ? 'Estado: Ninguno'
                                    : selectedEstados.length === ESTADOS_FACTURA.length
                                        ? 'Estado: Todos'
                                        : `Estado: ${selectedEstados.map(e => ESTADOS_FACTURA.find(opt => opt.value === e)?.label || e).join(', ')}`}
                            </span>
                            <FaChevronDown style={{ fontSize: '0.65rem', opacity: 0.7 }} />
                        </button>

                        {isEstadosOpen && (
                            <div className="v-multi-select-popover">
                                <div className="v-popover-header">
                                    <span className="v-popover-title">Filtrar Estado</span>
                                    <button
                                        type="button"
                                        className="v-popover-action-btn"
                                        onClick={selectAllEstados}
                                    >
                                        {selectedEstados.length === ESTADOS_FACTURA.length ? 'Ninguno' : 'Todos'}
                                    </button>
                                </div>
                                {ESTADOS_FACTURA.map(e => (
                                    <label key={e.value} className="v-popover-item">
                                        <input
                                            type="checkbox"
                                            checked={selectedEstados.includes(e.value)}
                                            onChange={() => toggleEstado(e.value)}
                                        />
                                        <span>{e.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Proveedor Multi-Select Checklist */}
                    <div className="v-multi-select-container" ref={proveedoresRef}>
                        <button
                            type="button"
                            className={`v-multi-select-btn ${selectedProveedores.length > 0 ? 'active-filter' : ''} ${isProveedoresOpen ? 'open' : ''}`}
                            onClick={() => setIsProveedoresOpen(prev => !prev)}
                        >
                            <span>
                                {selectedProveedores.length === 0
                                    ? 'Proveedor: Todos'
                                    : selectedProveedores.length === allProveedorOptions.length
                                        ? 'Proveedor: Todos'
                                        : `Proveedor: ${selectedProveedores.length} seleccionados`}
                            </span>
                            <FaChevronDown style={{ fontSize: '0.65rem', opacity: 0.7 }} />
                        </button>

                        {isProveedoresOpen && (
                            <div className="v-multi-select-popover">
                                <div className="v-popover-header">
                                    <span className="v-popover-title">Filtrar Proveedor</span>
                                    <button
                                        type="button"
                                        className="v-popover-action-btn"
                                        onClick={() => selectAllProveedores(allProveedorOptions)}
                                    >
                                        {selectedProveedores.length === allProveedorOptions.length ? 'Ninguno' : 'Todos'}
                                    </button>
                                </div>
                                {allProveedorOptions.map(n => (
                                    <label key={n} className="v-popover-item">
                                        <input
                                            type="checkbox"
                                            checked={selectedProveedores.length === 0 || selectedProveedores.includes(n)}
                                            onChange={() => toggleProveedor(n)}
                                        />
                                        <span>{n}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="v-select-pill" style={{ height: 34, display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, padding: '0 0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Desde</label>
                        <input type="date" onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }} value={filterFechaDesde} onChange={e => setFilterFechaDesde(e.target.value)}
                            style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', color: '#334155', fontWeight: 600, cursor: 'pointer', outline: 'none', width: 'auto' }} />
                    </div>
                    <div className="v-select-pill" style={{ height: 34, display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, padding: '0 0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Hasta</label>
                        <input type="date" onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }} value={filterFechaHasta} onChange={e => setFilterFechaHasta(e.target.value)}
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
                        <button className="v-btn-primary-glow" onClick={() => navigate('/suministros/facturas/nueva')}>
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
                                <th className={`sortable-th ${sortConfig.key === 'idManual' ? 'active-sort-th' : ''}`} onClick={() => handleSort('idManual')}>
                                    <span className="th-sort-wrapper">
                                        <span>ID Factura</span>
                                        {renderSortIcon('idManual')}
                                    </span>
                                </th>
                                <th className={`sortable-th ${sortConfig.key === 'proveedor' ? 'active-sort-th' : ''}`} onClick={() => handleSort('proveedor')}>
                                    <span className="th-sort-wrapper">
                                        <span>Proveedor</span>
                                        {renderSortIcon('proveedor')}
                                    </span>
                                </th>
                                <th className={`sortable-th ${sortConfig.key === 'fechaFactura' ? 'active-sort-th' : ''}`} onClick={() => handleSort('fechaFactura')}>
                                    <span className="th-sort-wrapper">
                                        <span>Fecha Factura</span>
                                        {renderSortIcon('fechaFactura')}
                                    </span>
                                </th>
                                <th className={`sortable-th ${sortConfig.key === 'fechaPago' ? 'active-sort-th' : ''}`} onClick={() => handleSort('fechaPago')}>
                                    <span className="th-sort-wrapper">
                                        <span>Fecha Pago</span>
                                        {renderSortIcon('fechaPago')}
                                    </span>
                                </th>
                                <th className={`sortable-th ${sortConfig.key === 'estado' ? 'active-sort-th' : ''}`} onClick={() => handleSort('estado')}>
                                    <span className="th-sort-wrapper">
                                        <span>Estado</span>
                                        {renderSortIcon('estado')}
                                    </span>
                                </th>
                                <th className={`sortable-th ${sortConfig.key === 'valor' ? 'active-sort-th' : ''}`} onClick={() => handleSort('valor')}>
                                    <span className="th-sort-wrapper">
                                        <span>Valor</span>
                                        {renderSortIcon('valor')}
                                    </span>
                                </th>
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
                                                {getEstadoLabel(getEfectiveEstado(f))}
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
                                                         <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                             <FaSpinner style={{ fontSize: '2.2rem', color: '#274385', animation: 'spin 0.8s linear infinite', marginBottom: '0.8rem' }} />
                                                             <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Cargando detalles de la factura...</span>
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
                                                                            onClick={() => openEditModal(f)}
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

                                                                            const renderProductCard = (p, keyIndex, isNested = false) => {
                                                                                const refNombre = p.referencia_nombre || p.producto_nombre || (p.referenciaId ? `Ref. #${p.referenciaId}` : '—');
                                                                                const catNombre = p.categoria_nombre || null;
                                                                                const subNombre = p.subcategoria_nombre || null;
                                                                                const grupoNombre = p.grupo_nombre || null;

                                                                                const tcList = Array.isArray(p.telas_cueros) && p.telas_cueros.length > 0
                                                                                    ? p.telas_cueros
                                                                                    : (p.lleva_tela || p.tela_referencia || p.tela_color
                                                                                        ? [{ tipo: 'tela', referencia: p.tela_referencia || 'Sí', color: p.tela_color || '', unidad_medida: 'metro', costo_unidad: p.tela_costo_metro || 0, cantidad: p.tela_cantidad_metros || 0 }]
                                                                                        : []);

                                                                                const baseCosto = parseFloat(p.costo) || 0;
                                                                                const totalTCCosto = tcList.reduce((sum, tc) => sum + ((parseFloat(tc.costo_unidad) || 0) * (parseFloat(tc.cantidad) || 0)), 0);
                                                                                const hasTC = tcList.length > 0;

                                                                                return (
                                                                                    <div 
                                                                                        key={keyIndex} 
                                                                                        className={`invoice-item-card compact-card ${isNested ? 'nested-item-card' : ''}`}
                                                                                        style={isNested ? { borderLeft: '3px solid #0284c7', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' } : {}}
                                                                                    >
                                                                                        <div className="compact-col compact-col-main">
                                                                                            <div className="compact-title-group">
                                                                                                <span className="item-id-badge">#{p.id || '—'}</span>
                                                                                                <h4 className="item-title" title={refNombre}>{refNombre}</h4>
                                                                                            </div>
                                                                                            <div className="item-tags">
                                                                                                {!isNested && grupoNombre && <span className="item-tag" style={{ background: '#e0f2fe', color: '#0284c7', borderColor: '#bae6fd' }}><FaLayerGroup style={{marginRight: 4}}/>{grupoNombre}</span>}
                                                                                                {catNombre && <span className="item-tag">{catNombre}</span>}
                                                                                                {subNombre && <span className="item-tag">{subNombre}</span>}
                                                                                            </div>
                                                                                        </div>
                                                                                        
                                                                                        <div className="compact-col compact-col-desc">
                                                                                            <div className="item-desc truncate-text" title={p.variacion || '—'}>
                                                                                                <span className="desc-label">Var:</span> <span className="desc-val">{p.variacion || '—'}</span>
                                                                                            </div>

                                                                                            {hasTC && (
                                                                                                <div className="item-tc-section" style={{ marginTop: '0.25rem' }}>
                                                                                                    {tcList.map((tc, idx) => {
                                                                                                        const isCuero = tc.tipo === 'cuero';
                                                                                                        const unitLabel = isCuero ? 'dm' : 'm';
                                                                                                        const tcTotal = (parseFloat(tc.costo_unidad) || 0) * (parseFloat(tc.cantidad) || 0);
                                                                                                        return (
                                                                                                            <div key={idx} style={{ fontSize: '0.75rem', background: isCuero ? '#fff7ed' : '#f0f9ff', color: isCuero ? '#c2410c' : '#0369a1', border: `1px solid ${isCuero ? '#ffedd5' : '#e0f2fe'}`, padding: '0.2rem 0.5rem', borderRadius: '6px', marginBottom: '0.2rem' }}>
                                                                                                                <strong>[{isCuero ? 'Cuero' : 'Tela'}]</strong> {tc.referencia || 'Sin Ref'} {tc.color ? `(${tc.color})` : ''} 
                                                                                                                {tc.costo_unidad > 0 && ` — ${formatCOP(tc.costo_unidad)}/${unitLabel} × ${tc.cantidad}${unitLabel}`}
                                                                                                                {tcTotal > 0 && <span style={{ fontWeight: 700, marginLeft: '0.4rem' }}>= {formatCOP(tcTotal)}</span>}
                                                                                                            </div>
                                                                                                        );
                                                                                                    })}
                                                                                                </div>
                                                                                            )}

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
                                                                                            <span className="item-venta-link" title={p.vendedor_nombre ? `Vendedor: ${p.vendedor_nombre}` : ''}>
                                                                                                {p.ventaId ? `Venta #${p.ventaId}${p.vendedor_nombre ? ` (${p.vendedor_nombre})` : ''}` : 'Sin asignar'}
                                                                                            </span>
                                                                                        </div>

                                                                                        <div className="compact-col compact-col-price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                                                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                                                                <span className="item-costo" style={{ fontSize: '0.95rem', fontWeight: 800 }}>{formatCOP(baseCosto)}</span>
                                                                                                <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Costo Proveedor</span>
                                                                                            </div>
                                                                                            {hasTC && totalTCCosto > 0 && (
                                                                                                <div style={{ fontSize: '0.72rem', background: '#f8fafc', padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                                                                                    <span style={{ color: '#475569' }}>Total c/Telas/Cueros: </span>
                                                                                                    <strong style={{ color: '#0f172a' }}>{formatCOP(baseCosto + totalTCCosto)}</strong>
                                                                                                </div>
                                                                                            )}
                                                                                            {p.imagen && (
                                                                                                <div className="compact-col compact-col-action">
                                                                                                    <button type="button" className="btn-view-img" title="Ver imagen">
                                                                                                        <FaImage />
                                                                                                    </button>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            };

                                                                            const elements = [];
                                                                            
                                                                            Object.entries(grouped).forEach(([gName, items]) => {
                                                                                const isExpanded = expandedNestedGroups[`${f.id}-${gName}`];
                                                                                
                                                                                const totalCosto = items.reduce((acc, item) => acc + (parseFloat(item.costo) || 0), 0);
                                                                                
                                                                                const catLabel = items[0]?.grupo_categoria_nombre || '';
                                                                                const subcatLabel = items[0]?.grupo_subcategoria_nombre || '';
                                                                                
                                                                                const uniqueRefs = [...new Set(items.map(i => i.referencia_nombre || (i.referenciaId ? `Ref. #${i.referenciaId}` : null)).filter(Boolean))];
                                                                                const refsLabel = uniqueRefs.length > 0 ? uniqueRefs.join(', ') : '—';
                                                                                const grupoIdVal = items[0]?.grupo_id || items[0]?.grupo;
                                                                                const grupoBadgeStr = grupoIdVal ? `#G-${grupoIdVal}` : 'GRUPO';

                                                                                const ventasWithSellers = [...new Set(items.filter(i => i.ventaId).map(i => i.vendedor_nombre ? `Venta #${i.ventaId} (${i.vendedor_nombre})` : `Venta #${i.ventaId}`))];
                                                                                const ventasLabel = ventasWithSellers.length > 0 ? ventasWithSellers.join(', ') : null;
                                                                                
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
                                                                                    <div 
                                                                                        key={`group-${gName}`} 
                                                                                        className={`invoice-item-card compact-card group-card-compact ${isExpanded ? 'is-expanded-group' : ''}`}
                                                                                        onClick={() => toggleNestedGroup(f.id, gName)}
                                                                                        style={{
                                                                                            cursor: 'pointer',
                                                                                            gridColumn: isExpanded ? '1 / -1' : 'auto',
                                                                                            borderColor: isExpanded ? '#0284c7' : 'var(--color-border)',
                                                                                            background: isExpanded ? '#f0f9ff' : '#ffffff',
                                                                                            transition: 'all 0.25s ease'
                                                                                        }}
                                                                                    >
                                                                                        <div className="compact-col compact-col-main">
                                                                                            <div className="compact-title-group">
                                                                                                <span className="item-id-badge" style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                                                                                                    <FaLayerGroup style={{ fontSize: '0.65rem' }} /> {grupoBadgeStr}
                                                                                                </span>
                                                                                                <h4 className="item-title" title={gName}>{gName}</h4>
                                                                                            </div>
                                                                                            <div className="group-ref-subtitle" style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                                <span style={{ color: '#64748b', fontWeight: 500 }}>Ref:</span> <span title={refsLabel}>{refsLabel}</span>
                                                                                            </div>
                                                                                            <div className="item-tags" style={{ marginTop: '0.2rem' }}>
                                                                                                <span className="item-tag" style={{ background: '#0284c7', color: '#ffffff', fontWeight: 700 }}>{items.length} ítem{items.length !== 1 ? 's' : ''}</span>
                                                                                                {catLabel && <span className="item-tag">{catLabel}</span>}
                                                                                                {subcatLabel && <span className="item-tag">{subcatLabel}</span>}
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="compact-col compact-col-desc">
                                                                                            <div className="item-desc truncate-text" title={dispLabels}>
                                                                                                <span className="desc-label">Disp:</span> <span className="desc-val">{dispLabels}</span>
                                                                                            </div>
                                                                                            {ventasLabel && (
                                                                                                <div className="item-desc" style={{ marginTop: '0.2rem' }}>
                                                                                                    <span className="item-venta-link" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                                                                        <FaShoppingCart style={{ fontSize: '0.65rem' }} /> {ventasLabel}
                                                                                                    </span>
                                                                                                </div>
                                                                                            )}
                                                                                            {badStateCount > 0 && (
                                                                                                <div className="item-desc" style={{ marginTop: '0.2rem', color: '#b91c1c', fontWeight: 600, fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                                                    <FaExclamationTriangle style={{ fontSize: '0.65rem' }} /> {badStateCount} en mal estado
                                                                                                </div>
                                                                                            )}
                                                                                        </div>

                                                                                        <div className="compact-col compact-col-status">
                                                                                            <button 
                                                                                                type="button" 
                                                                                                className="btn-expand-group-pill"
                                                                                                onClick={(e) => { e.stopPropagation(); toggleNestedGroup(f.id, gName); }}
                                                                                                style={{
                                                                                                    display: 'inline-flex',
                                                                                                    alignItems: 'center',
                                                                                                    gap: '0.4rem',
                                                                                                    padding: '0.35rem 0.75rem',
                                                                                                    borderRadius: '20px',
                                                                                                    fontSize: '0.75rem',
                                                                                                    fontWeight: 700,
                                                                                                    border: '1.5px solid #0284c7',
                                                                                                    background: isExpanded ? '#0284c7' : '#e0f2fe',
                                                                                                    color: isExpanded ? '#ffffff' : '#0369a1',
                                                                                                    cursor: 'pointer',
                                                                                                    transition: 'all 0.2s ease'
                                                                                                }}
                                                                                            >
                                                                                                <span>{isExpanded ? 'Plegar' : `Ver Ítems (${items.length})`}</span>
                                                                                                {isExpanded ? <FaChevronUp style={{ fontSize: '0.65rem' }} /> : <FaChevronDown style={{ fontSize: '0.65rem' }} />}
                                                                                            </button>
                                                                                        </div>

                                                                                        <div className="compact-col compact-col-price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                                                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                                                                <span className="item-costo" style={{ color: '#0284c7', fontSize: '1.05rem', fontWeight: 800 }}>{formatCOP(totalCosto)}</span>
                                                                                                <span style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Costo Total Grupo</span>
                                                                                            </div>
                                                                                        </div>

                                                                                        {isExpanded && (
                                                                                            <div 
                                                                                                className="group-nested-panel" 
                                                                                                onClick={(e) => e.stopPropagation()} 
                                                                                                style={{
                                                                                                    gridColumn: '1 / -1',
                                                                                                    width: '100%',
                                                                                                    marginTop: '0.75rem',
                                                                                                    paddingTop: '0.85rem',
                                                                                                    borderTop: '1.5px solid #bae6fd'
                                                                                                }}
                                                                                            >
                                                                                                <div 
                                                                                                    className="group-nested-header" 
                                                                                                    style={{
                                                                                                        display: 'flex',
                                                                                                        alignItems: 'center',
                                                                                                        justifyContent: 'space-between',
                                                                                                        marginBottom: '0.75rem',
                                                                                                        padding: '0.5rem 0.75rem',
                                                                                                        background: '#ffffff',
                                                                                                        borderRadius: '8px',
                                                                                                        border: '1px solid #bae6fd'
                                                                                                    }}
                                                                                                >
                                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                                        <FaLayerGroup style={{ color: '#0284c7', fontSize: '0.9rem' }} />
                                                                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                                                                                                            Componentes de {gName} <span style={{ color: '#0369a1', fontWeight: 600 }}>(Ref: {refsLabel})</span>
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369a1' }}>
                                                                                                        Subtotal: {formatCOP(totalCosto)}
                                                                                                    </div>
                                                                                                </div>

                                                                                                <div 
                                                                                                    className="group-nested-grid" 
                                                                                                    style={{
                                                                                                        display: 'grid',
                                                                                                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                                                                                        gap: '0.85rem'
                                                                                                    }}
                                                                                                >
                                                                                                    {sortedItems.map((item) => renderProductCard(item, item.originalIndex, true))}
                                                                                                </div>
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

            {/* ===== MODAL EDITAR FACTURA Y COSTOS DE TELA ===== */}
            {editModal && (
                <div className="fact-modal-overlay edit-factura-overlay" onClick={e => { if (e.target === e.currentTarget) setEditModal(null); }}>
                    <div className="edit-factura-modal" style={{ maxWidth: '850px', width: '90%' }}>
                        <div className="edit-factura-header">
                            <h3>Editar Factura #{editModal.id_manual || editModal.id}</h3>
                            <button className="fact-modal-close" onClick={() => setEditModal(null)}>×</button>
                        </div>
                        <div className="edit-factura-body" style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="edit-factura-field">
                                    <label>No. Factura Manual</label>
                                    <input 
                                        type="text" 
                                        className="ifg-input"
                                        value={editModal.id_manual || ''} 
                                        onChange={e => setEditModal(prev => ({ ...prev, id_manual: e.target.value }))}
                                        placeholder="Ej: FCT-999"
                                    />
                                </div>
                                <div className="edit-factura-field">
                                    <label>Estado de la Factura</label>
                                    <div className="edit-estado-options" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                                        {(() => {
                                            const todayStr = getTodayStr();
                                            const fechaPagoStr = editModal.fecha_pago || '';
                                            let dynamicOption = { value: 'pendiente', label: 'Pendiente', badgeClass: 'status-pendiente' };
                                            
                                            if (fechaPagoStr) {
                                                if (fechaPagoStr > todayStr) {
                                                    dynamicOption = { value: 'pendiente', label: 'Pendiente', badgeClass: 'status-pendiente' };
                                                } else if (fechaPagoStr === todayStr) {
                                                    dynamicOption = { value: 'por_pagar', label: 'Por pagar', badgeClass: 'status-por-pagar' };
                                                } else {
                                                    dynamicOption = { value: 'atrasado', label: 'Atrasado', badgeClass: 'status-atrasado' };
                                                }
                                            }
                                            const isPagado = editModal.estado === 'pagada' || editModal.estado === 'pagado';

                                            return (
                                                <>
                                                    <button
                                                        type="button"
                                                        className={`estado-option-btn ${dynamicOption.badgeClass} ${!isPagado ? 'selected' : ''}`}
                                                        onClick={() => setEditModal(prev => ({ ...prev, estado: 'pendiente' }))}
                                                        style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', textAlign: 'center' }}
                                                    >
                                                        {dynamicOption.label}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`estado-option-btn status-pagado ${isPagado ? 'selected' : ''}`}
                                                        onClick={() => setEditModal(prev => ({ ...prev, estado: 'pagada' }))}
                                                        style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', textAlign: 'center' }}
                                                    >
                                                        Pagada
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div className="edit-factura-field">
                                    <label>Fecha Factura {!canEditFechas && <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>(Lectura)</span>}</label>
                                    <input 
                                        type="date" onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }} 
                                        className="ifg-input"
                                        value={editModal.fecha_factura || ''} 
                                        onChange={e => setEditModal(prev => ({ ...prev, fecha_factura: e.target.value }))}
                                        disabled={!canEditFechas}
                                        style={{ cursor: canEditFechas ? 'pointer' : 'default' }}
                                    />
                                </div>
                                <div className="edit-factura-field">
                                    <label>Fecha Pago {!canEditFechas && <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>(Lectura)</span>}</label>
                                    <input 
                                        type="date" onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }} 
                                        className="ifg-input"
                                        value={editModal.fecha_pago || ''} 
                                        onChange={e => setEditModal(prev => ({ ...prev, fecha_pago: e.target.value }))}
                                        disabled={!canEditFechas}
                                        style={{ cursor: canEditFechas ? 'pointer' : 'default' }}
                                    />
                                </div>
                            </div>

                            <div className="edit-factura-field" style={{ marginBottom: '1.25rem' }}>
                                <label>Observaciones Generales</label>
                                <textarea
                                    rows="2"
                                    placeholder="Escribe la observación de la factura..."
                                    value={editModal.observaciones || ''}
                                    onChange={e => setEditModal(prev => ({ ...prev, observaciones: e.target.value }))}
                                />
                            </div>

                            {/* SECCIÓN DE PRODUCTOS Y TELAS / COSTOS ADICIONALES */}
                            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FaBoxOpen style={{ color: '#0284c7' }} />
                                    Referencias y Parámetros de Tela ({editModal.productos?.length || 0})
                                </h4>

                                {(editModal.productos || []).map((p, idx) => (
                                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                                                #{p.id || `Ref ${idx+1}`} — {p.referencia_nombre}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                Costo base: {formatCOP(p.costo)}
                                            </span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569' }}>Variación</label>
                                                <input 
                                                    type="text" 
                                                    className="ifg-input"
                                                    value={p.variacion || ''} 
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setEditModal(prev => {
                                                            const prods = [...prev.productos];
                                                            prods[idx] = { ...prods[idx], variacion: val };
                                                            return { ...prev, productos: prods };
                                                        });
                                                    }}
                                                    placeholder="Variación / Especificaciones"
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569' }}>Observación del Ítem</label>
                                                <input 
                                                    type="text" 
                                                    className="ifg-input"
                                                    value={p.observacion || ''} 
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setEditModal(prev => {
                                                            const prods = [...prev.productos];
                                                            prods[idx] = { ...prods[idx], observacion: val };
                                                            return { ...prev, productos: prods };
                                                        });
                                                    }}
                                                    placeholder="Nota opcional..."
                                                />
                                            </div>
                                        </div>

                                        {/* SECCIÓN COSTO ADICIONAL / TELA */}
                                        <div style={{ background: p.lleva_tela ? '#f0f9ff' : '#ffffff', border: `1px solid ${p.lleva_tela ? '#bae6fd' : '#cbd5e1'}`, borderRadius: '6px', padding: '0.5rem 0.75rem', marginTop: '0.5rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, cursor: 'pointer', margin: 0, color: p.lleva_tela ? '#0369a1' : '#475569', fontSize: '0.75rem' }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={p.lleva_tela || false} 
                                                    onChange={e => {
                                                        const checked = e.target.checked;
                                                        setEditModal(prev => {
                                                            const prods = [...prev.productos];
                                                            prods[idx] = { ...prods[idx], lleva_tela: checked };
                                                            return { ...prev, productos: prods };
                                                        });
                                                    }}
                                                    style={{ accentColor: '#0284c7' }}
                                                />
                                                ¿Lleva Tela / Costo Adicional de Tela?
                                            </label>

                                            {p.lleva_tela && (
                                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.6rem', color: '#0369a1', fontWeight: 600 }}>Referencia de Tela</label>
                                                        <input 
                                                            type="text" 
                                                            className="ifg-input"
                                                            placeholder="Ej: Jacquard, Lino..." 
                                                            value={p.tela_referencia || ''} 
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setEditModal(prev => {
                                                                    const prods = [...prev.productos];
                                                                    prods[idx] = { ...prods[idx], tela_referencia: val };
                                                                    return { ...prev, productos: prods };
                                                                });
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.6rem', color: '#0369a1', fontWeight: 600 }}>Color de Tela</label>
                                                        <input 
                                                            type="text" 
                                                            className="ifg-input"
                                                            placeholder="Ej: Verde, Azul..." 
                                                            value={p.tela_color || ''} 
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setEditModal(prev => {
                                                                    const prods = [...prev.productos];
                                                                    prods[idx] = { ...prods[idx], tela_color: val };
                                                                    return { ...prev, productos: prods };
                                                                });
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.6rem', color: '#0369a1', fontWeight: 600 }}>Costo/m</label>
                                                        <input 
                                                            type="text" 
                                                            className="ifg-input"
                                                            placeholder="$0" 
                                                            value={p.tela_costo_metro ? formatCOP(parseInt(p.tela_costo_metro)) : ''} 
                                                            onChange={e => {
                                                                const raw = e.target.value.replace(/[^0-9]/g, '');
                                                                setEditModal(prev => {
                                                                    const prods = [...prev.productos];
                                                                    prods[idx] = { ...prods[idx], tela_costo_metro: raw };
                                                                    return { ...prev, productos: prods };
                                                                });
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.6rem', color: '#0369a1', fontWeight: 600 }}>Metros</label>
                                                        <input 
                                                            type="number" 
                                                            step="0.1"
                                                            min="0"
                                                            className="ifg-input"
                                                            placeholder="0" 
                                                            value={p.tela_cantidad_metros || ''} 
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setEditModal(prev => {
                                                                    const prods = [...prev.productos];
                                                                    prods[idx] = { ...prods[idx], tela_cantidad_metros: val };
                                                                    return { ...prev, productos: prods };
                                                                });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
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
                                        <input required type="date" onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }} value={form.fechaFactura}
                                            onChange={e => handleField('fechaFactura', e.target.value)} />
                                    </div>
                                    <div className="fct-field">
                                        <label>Fecha de Pago</label>
                                        <input type="date" onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }} value={form.fechaPago}
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
                                                    {(parseInt(row.costo) > 0 && parseInt(row.cantidad) > 1) && (
                                                        <span className="fct-subtotal-hint">
                                                            = {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
                                                                (parseInt(row.costo) || 0) * (parseInt(row.cantidad) || 1)
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

                                            {/* Sub-sección Dinámica: Telas y Cueros */}
                                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.75rem', marginTop: '0.5rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                        🧵 Telas y Cueros (Costos Adicionales)
                                                        <span style={{ fontSize: '0.68rem', fontWeight: 400, color: '#64748b', fontStyle: 'italic', marginLeft: '0.2rem' }}>
                                                            — Usar punto (.) para decimales, ej: 2.5
                                                        </span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => addTelaCueroToRow(index)}
                                                        style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                                    >
                                                        <FaPlus style={{ fontSize: '0.65rem' }} /> Agregar Tela/Cuero
                                                    </button>
                                                </div>

                                                {(!row.telas_cueros || row.telas_cueros.length === 0) ? (
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>Sin telas o cueros asignados a este producto.</div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                        {row.telas_cueros.map((tc, tcIdx) => {
                                                            const isCuero = tc.tipo === 'cuero';
                                                            const unitLabel = isCuero ? 'dm' : 'm';
                                                            const tcSubtotal = (parseFloat(tc.costo_unidad) || 0) * (parseFloat(tc.cantidad) || 0);
                                                            return (
                                                                <div key={tc.id || tcIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#ffffff', padding: '0.35rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                                                    <select
                                                                        value={tc.tipo || 'tela'}
                                                                        onChange={e => updateTelaCueroInRow(index, tcIdx, 'tipo', e.target.value)}
                                                                        style={{ padding: '0.3rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 700, color: isCuero ? '#c2410c' : '#0369a1', background: isCuero ? '#fff7ed' : '#f0f9ff', flexShrink: 0 }}
                                                                    >
                                                                        <option value="tela">Tela (m)</option>
                                                                        <option value="cuero">Cuero (dm)</option>
                                                                    </select>

                                                                    <input
                                                                        type="text"
                                                                        placeholder={isCuero ? "Ref. Cuero" : "Ref. Tela"}
                                                                        value={tc.referencia || ''}
                                                                        onChange={e => updateTelaCueroInRow(index, tcIdx, 'referencia', e.target.value)}
                                                                        style={{ flex: '1 1 0%', minWidth: 0, padding: '0.3rem 0.4rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                                    />

                                                                    <input
                                                                        type="text"
                                                                        placeholder="Color"
                                                                        value={tc.color || ''}
                                                                        onChange={e => updateTelaCueroInRow(index, tcIdx, 'color', e.target.value)}
                                                                        style={{ flex: '1 1 0%', minWidth: 0, padding: '0.3rem 0.4rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                                    />

                                                                    <div style={{ position: 'relative', flex: '1 1 0%', minWidth: 0 }}>
                                                                        <span style={{ position: 'absolute', left: '5px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.7rem' }}>$</span>
                                                                        <input
                                                                            type="text"
                                                                            placeholder={isCuero ? "$/dm" : "$/m"}
                                                                            value={tc.costo_unidad ? formatCOP(parseInt(tc.costo_unidad)) : ''}
                                                                            onChange={e => {
                                                                                const raw = e.target.value.replace(/[^0-9]/g, '');
                                                                                updateTelaCueroInRow(index, tcIdx, 'costo_unidad', raw);
                                                                            }}
                                                                            style={{ width: '100%', boxSizing: 'border-box', padding: '0.3rem 0.3rem 0.3rem 1.1rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                                        />
                                                                    </div>

                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', width: '70px', flexShrink: 0 }}>
                                                                        <input
                                                                            type="text"
                                                                            inputMode="decimal"
                                                                            placeholder={isCuero ? "dm" : "m"}
                                                                            title="Usar punto (.) para decimales, ej: 2.5"
                                                                            value={tc.cantidad || ''}
                                                                            onChange={e => {
                                                                                const val = e.target.value.replace(',', '.');
                                                                                updateTelaCueroInRow(index, tcIdx, 'cantidad', val);
                                                                            }}
                                                                            style={{ width: '100%', boxSizing: 'border-box', padding: '0.3rem 0.3rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                                        />
                                                                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{unitLabel}</span>
                                                                    </div>

                                                                    {tcSubtotal > 0 && (
                                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', padding: '0 0.3rem', flexShrink: 0 }}>
                                                                            = {formatCOP(tcSubtotal)}
                                                                        </span>
                                                                    )}

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeTelaCueroFromRow(index, tcIdx)}
                                                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem 0.3rem', fontSize: '0.8rem', flexShrink: 0 }}
                                                                        title="Quitar esta tela/cuero"
                                                                    >
                                                                        <FaTrashAlt />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
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
