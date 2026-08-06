import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import API from '../services/api';
import { usePendientesIds } from '../hooks/useSharedData';
import { AppContext, usePermissions } from '../AppContext';
import { formatCOP, parseCOP } from '../utils/formatCOP';
import { getTodayStr } from '../utils/dates';
import { 
    FaPlus, FaTrashAlt, FaTimes, FaBoxOpen, FaImage, FaCamera, FaUpload, 
    FaLayerGroup, FaCheckCircle, FaExclamationCircle, FaFileInvoiceDollar, 
    FaClipboardList, FaBuilding, FaCalendarAlt, FaArrowLeft, FaDollarSign, 
    FaStickyNote, FaTag, FaBoxes, FaMapMarkerAlt, FaShoppingCart, FaUserCheck,
    FaChevronDown, FaSearch
} from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import { PageHeader, Button } from '../components/ui';
import './NuevaFacturaPage.css';

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
    estado_fisico: 'buen_estado',
    zonaId: '',
    ventaId: '', 
    opId: '',
    imagen: null, 
    visible: true,
    telas_cueros: [], 
});

const emptyForm = () => ({
    idManual: '',
    valor: '',
    valorDisplay: '',
    fechaFactura: getTodayStr(),
    fechaPago: '',
    proveedorId: '',
    observaciones: '',
    productos: [{ ...emptyRef() }],
    grupoInstances: [], 
});

let _grupoCounter = 0;
const newGrupoLocalId = () => `g_${++_grupoCounter}_${Date.now()}`;
const isExistingGrupoId = (localId) => localId && !String(localId).startsWith('g_') && !isNaN(parseInt(localId));

const formatCOPInt = (value) => formatCOP(parseInt(value) || 0);

export default function NuevaFacturaPage() {
    const { proveedores, usuario, notify } = useContext(AppContext);
    const hasPermission = usePermissions();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isCreating, setIsCreating] = useState(false);

    // Use global notification
    const showToast = (message, type = 'success') => {
        notify(message, type);
    };

    // Queries
    const { data: categorias = [] } = useQuery({
        queryKey: ['suministros-categorias'],
        queryFn: async () => {
            const res = await API.get('/suministros/categorias/');
            return res.data.results || res.data || [];
        }
    });

    const { data: subcategorias = [] } = useQuery({
        queryKey: ['suministros-subcategorias'],
        queryFn: async () => {
            const res = await API.get('/suministros/subcategorias/');
            return res.data.results || res.data || [];
        }
    });

    const { data: ordenesPendientes = [] } = usePendientesIds();

    const { data: gruposActivosRaw = [] } = useQuery({
        queryKey: ['suministros-grupos'],
        queryFn: async () => {
            const res = await API.get('/suministros/grupos/');
            return res.data.results || res.data || [];
        }
    });
    const gruposActivos = gruposActivosRaw.filter(g => g.activo !== false);

    const { data: sedes = [] } = useQuery({
        queryKey: ['suministros-sedes'],
        queryFn: async () => {
            const res = await API.get('/suministros/sedes/?page_size=1000');
            return res.data.results || res.data || [];
        }
    });

    const { data: zonas = [] } = useQuery({
        queryKey: ['suministros-zonas'],
        queryFn: async () => {
            const res = await API.get('/suministros/zonas/?page_size=1000');
            return res.data.results || res.data || [];
        }
    });

    const { data: referencias = [] } = useQuery({
        queryKey: ['productos-all'],
        queryFn: async () => {
            const res = await API.get('/referencias/');
            return res.data.results || res.data || [];
        }
    });

    // Form state
    const [form, setForm] = useState(emptyForm());
    const [newGrupoName, setNewGrupoName] = useState('');
    const [newGrupoCategoria, setNewGrupoCategoria] = useState('');
    const [newGrupoSubcategoria, setNewGrupoSubcategoria] = useState('');

    const { data: ordenesProveedor = [], refetch: refetchOrdenesProveedor } = useQuery({
        queryKey: ['ordenes-proveedor', form.proveedorId],
        queryFn: async () => {
            if (!form.proveedorId) return [];
            // Usar listar-pedidos con filtro de proveedor Y estado (solo pendientes/en proceso)
            const res = await API.get(`/listar-pedidos/`, {
                params: {
                    id_proveedor: form.proveedorId,
                    estado: 'en_proceso,pendiente',
                    ordering: '-id',
                    page_size: 500,
                }
            });
            return res.data.results || res.data || [];
        },
        enabled: !!form.proveedorId,
    });

    // Mapa mutable de OP completas (detalles cargados lazy) — no viene de useQuery
    const [ordenesCompletasMap, setOrdenesCompletasMap] = useState({});

    // Estado de buscador de OP por fila
    const [opSearchState, setOpSearchState] = useState({});

    const getOpSearch = (index) => opSearchState[index] || { query: '', open: false };
    const setOpSearch = (index, patch) => setOpSearchState(prev => ({ 
        ...prev, 
        [index]: { ...getOpSearch(index), ...patch } 
    }));

    const parseTelasFromOrden = (orden) => {
        if (!orden.telas_asociadas || orden.telas_asociadas.length === 0) return [];
        return orden.telas_asociadas.map(t => {
            let raw = t.tela || '';
            let tipo = 'tela';
            if (raw.includes('[CUERO]')) {
                tipo = 'cuero';
                raw = raw.replace('[CUERO]', '');
            }
            let referencia = raw.trim();
            let color = '';
            if (raw.includes(' - Color: ')) {
                const parts = raw.split(' - Color: ');
                referencia = parts[0].trim();
                color = parts[1].trim();
            } else if (raw.toLowerCase().includes('color:')) {
                const parts = raw.split(/color:/i);
                referencia = parts[0].replace(/-\s*$/, '').trim();
                color = parts[1].trim();
            }
            return {
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
                tipo,
                referencia,
                color,
                cantidad: t.cantidad || 1,
                costo_unidad: ''
            };
        });
    };

    const handleSelectOp = async (index, ordenBase) => {
        // Cerrar dropdown inmediatamente
        setOpSearch(index, { query: '', open: false });

        // Aplicar datos básicos de la OP (lo que tenemos del listado)
        setForm(prev => {
            const prods = [...prev.productos];
            const ventaId = ordenBase.venta ? String(ordenBase.venta) : '';
            prods[index] = {
                ...prods[index],
                opId: String(ordenBase.id),
                ventaId: ventaId,
                disponibilidad: ventaId ? 'cliente' : prods[index].disponibilidad,
                _opLoading: true,  // indicador de carga
            };
            return { ...prev, productos: prods };
        });

        // Cargar detalles completos de la OP de forma lazy
        try {
            const res = await API.get(`/ordenes-pedido/${ordenBase.id}/completo/`);
            const ordenCompleta = res.data;
            const nuevasTelas = parseTelasFromOrden(ordenCompleta);

            setForm(prev => {
                const prods = [...prev.productos];
                const ventaId = ordenCompleta.venta ? String(ordenCompleta.venta) : '';
                // Guardar la orden completa en el mapa local para la tarjeta informativa
                setOrdenesCompletasMap(prev => ({ ...prev, [String(ordenCompleta.id)]: ordenCompleta }));
                prods[index] = {
                    ...prods[index],
                    opId: String(ordenCompleta.id),
                    ventaId: ventaId,
                    disponibilidad: ventaId ? 'cliente' : prods[index].disponibilidad,
                    telas_cueros: nuevasTelas.length > 0 ? nuevasTelas : prods[index].telas_cueros,
                    _opLoading: false,
                };
                return { ...prev, productos: prods };
            });
        } catch (err) {
            console.error('Error cargando detalles de OP:', err);
            setForm(prev => {
                const prods = [...prev.productos];
                prods[index] = { ...prods[index], _opLoading: false };
                return { ...prev, productos: prods };
            });
        }
    };

    const CATEGORIAS = categorias;
    const SUBCATEGORIAS = subcategorias;

    const handleField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleValorChange = e => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setForm(prev => ({ ...prev, valor: raw, valorDisplay: raw ? formatCOP(parseInt(raw)) : '' }));
    };

    // Telas y Cueros
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
                if (currentProd.grupoLocalId) {
                    const newGroup = prev.grupoInstances.find(g => String(g.localId) === String(currentProd.grupoLocalId));
                    if (newGroup && String(newGroup.categoriaId) !== String(value)) {
                        showToast(`Este producto pertenece al grupo "${newGroup.nombre}" que exige la categoría seleccionada al crearlo.`, 'error');
                        return prev;
                    }
                }
                prods[index] = { ...currentProd, categoriaId: value, subcategoriaId: '' };
            } else if (field === 'disponibilidad') {
                if (currentProd.grupoLocalId) {
                    prods.forEach((p, i) => {
                        if (p.grupoLocalId === currentProd.grupoLocalId) {
                            prods[i] = { ...p, disponibilidad: value };
                        }
                    });
                }
                prods[index] = { ...prods[index], disponibilidad: value };
            } else if (field === 'grupoLocalId') {
                let newVentaId = currentProd.ventaId;
                let newDisp = currentProd.disponibilidad;
                if (value) {
                    const sameGroupProd = prods.find(p => p.grupoLocalId === value && p !== currentProd);
                    if (sameGroupProd && sameGroupProd.disponibilidad) {
                        newDisp = sameGroupProd.disponibilidad;
                    }
                    const existGroup = gruposActivos.find(g => String(g.id) === String(value));
                    const newGroup = prev.grupoInstances.find(g => String(g.localId) === String(value));
                    
                    if (existGroup) {
                        const existVenta = existGroup.venta || existGroup.venta_id;
                        newVentaId = existVenta ? String(existVenta) : currentProd.ventaId;
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
                if (newVentaId) {
                    newDisp = 'cliente';
                }
                prods[index] = { ...currentProd, grupoLocalId: value, ventaId: newVentaId, disponibilidad: newDisp };
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

    const addRefRow = () => {
        const newRow = emptyRef();
        setForm(prev => ({ ...prev, productos: [...prev.productos, newRow] }));
    };

    const removeRefRow = index => setForm(prev => ({
        ...prev,
        productos: prev.productos.filter((_, i) => i !== index),
    }));

    const addGrupoInstance = () => {
        const nombre = newGrupoName.trim();
        if (!nombre) return;
        if (!newGrupoCategoria) {
            showToast('Por favor, selecciona una categoría para el nuevo grupo.', 'error');
            return;
        }
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

    const totalCostos = form.productos.reduce((acc, p) => {
        const prodCosto = parseInt(p.costo) || 0;
        return acc + (prodCosto * (parseInt(p.cantidad) || 1));
    }, 0);
    const valorFactura = parseInt(form.valor) || 0;
    const isTotalMatching = valorFactura > 0 && totalCostos === valorFactura;

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

        const grupoIdMap = {};
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
            } catch (err) {
                console.error('Error creando grupo', instance.nombre, err);
                showToast(`Error al crear el grupo "${instance.nombre}". Intenta de nuevo.`, 'error');
                setIsCreating(false);
                return;
            }
        }

        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0];
        const fechaConHora = form.fechaFactura.includes('T') ? form.fechaFactura : `${form.fechaFactura}T${timeString}`;

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
            queryClient.invalidateQueries({ queryKey: ['suministros-facturas'] });
            navigate('/suministros/facturas', { state: { toastMessage: 'Factura creada exitosamente.', toastType: 'success' } });
        } catch (error) {
            console.error("Error creating factura:", error);
            showToast("Hubo un error al guardar la factura. Verifica los datos.", "error");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="ds-page nueva-factura-page ds-fade-in">
            <PageHeader
                icon={FaFileInvoiceDollar}
                title="Registrar Factura de Proveedor"
                subtitle="Ingresa los datos generales, grupos y referencias de mercancía recibida."
                actions={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="nf-footer-summary" style={{ background: 'transparent', padding: 0, border: 'none', boxShadow: 'none' }}>
                            <span className="nf-summary-label">Suma Productos:</span>
                            <span className={`nf-summary-total ${isTotalMatching ? 'total-match' : valorFactura > 0 ? 'total-mismatch' : ''}`}>
                                {formatCOPInt(totalCostos)}
                            </span>
                            <span className="nf-summary-sep">/</span>
                            <span className="nf-summary-label">Valor Factura:</span>
                            <span className="nf-summary-factura">{formatCOPInt(valorFactura)}</span>
                        </div>
                        <Button variant="secondary" onClick={() => navigate('/suministros/facturas')} disabled={isCreating}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit" form="nueva-factura-form" loading={isCreating} disabled={!isTotalMatching || isCreating}>
                            {isCreating ? 'Registrando...' : 'Registrar Factura'}
                        </Button>
                    </div>
                }
            />

            <form id="nueva-factura-form" onSubmit={handleSubmit} className="nf-form-layout">
                {/* COLUMNA IZQUIERDA: Info General y Grupos */}
                <div className="nf-left-column">
                    {/* Card 1: Información de la Factura */}
                    <div className="nf-card">
                        <div className="nf-card-header">
                            <div className="nf-card-icon-badge badge-blue">
                                <FaClipboardList />
                            </div>
                            <div>
                                <h3 className="nf-card-title">Información Principal</h3>
                                <p className="nf-card-desc">Datos fiscales y generales del proveedor.</p>
                            </div>
                        </div>

                        <div className="nf-card-body">
                            <div className="nf-form-group">
                                <label><FaFileInvoiceDollar /> ID Factura <span className="nf-req">*</span></label>
                                <input 
                                    required 
                                    type="text" 
                                    placeholder="Ej: FAC-2026-001"
                                    value={form.idManual} 
                                    onChange={e => handleField('idManual', e.target.value)} 
                                />
                            </div>

                            <div className="nf-form-group">
                                <label><FaDollarSign /> Valor Total Factura <span className="nf-req">*</span></label>
                                <div className="nf-prefix-wrap">
                                    <span className="nf-prefix">$</span>
                                    <input 
                                        required 
                                        type="text" 
                                        placeholder="0"
                                        className="nf-prefix-input"
                                        value={form.valorDisplay} 
                                        onChange={handleValorChange} 
                                    />
                                </div>
                            </div>

                            <div className="nf-form-group">
                                <label><FaBuilding /> Proveedor <span className="nf-req">*</span></label>
                                <select 
                                    required 
                                    value={form.proveedorId}
                                    onChange={e => handleField('proveedorId', e.target.value)}
                                >
                                    <option value="">Seleccione proveedor...</option>
                                    {proveedores.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre_empresa}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="nf-grid-2">
                                <div className="nf-form-group">
                                    <label><FaCalendarAlt /> Fecha Factura <span className="nf-req">*</span></label>
                                    <input 
                                        required 
                                        type="date" 
                                        onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }} 
                                        value={form.fechaFactura}
                                        onChange={e => handleField('fechaFactura', e.target.value)} 
                                    />
                                </div>
                                <div className="nf-form-group">
                                    <label><FaCalendarAlt /> Fecha de Pago</label>
                                    <input 
                                        type="date" 
                                        onClick={(e) => { try { e.target.showPicker(); } catch(err) {} }} 
                                        value={form.fechaPago}
                                        onChange={e => handleField('fechaPago', e.target.value)} 
                                    />
                                </div>
                            </div>

                            <div className="nf-form-group">
                                <label><FaStickyNote /> Observaciones</label>
                                <textarea 
                                    rows="3" 
                                    placeholder="Notas u observaciones opcionales..."
                                    value={form.observaciones} 
                                    onChange={e => handleField('observaciones', e.target.value)} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Grupos de la Factura */}
                    <div className="nf-card">
                        <div className="nf-card-header">
                            <div className="nf-card-icon-badge badge-purple">
                                <FaLayerGroup />
                            </div>
                            <div>
                                <h3 className="nf-card-title">Grupos de esta Factura</h3>
                                <p className="nf-card-desc">Crea conjuntos/grupos (ej. Comedor Qatar) para agrupar ítems.</p>
                            </div>
                        </div>

                        <div className="nf-card-body">
                            <div className="nf-grupos-instancias">
                                {form.grupoInstances.length === 0 ? (
                                    <div className="nf-grupos-empty">
                                        Sin grupos nuevos creados. Puedes crear uno abajo o seleccionar grupos existentes por referencia.
                                    </div>
                                ) : form.grupoInstances.map(gi => (
                                    <div key={gi.localId} className="nf-grupo-chip">
                                        <FaLayerGroup className="nf-chip-icon" />
                                        <input
                                            type="text"
                                            className="nf-grupo-chip-name"
                                            value={gi.nombre}
                                            onChange={e => renameGrupoInstance(gi.localId, e.target.value)}
                                            placeholder="Nombre del grupo..."
                                        />
                                        <span className="nf-grupo-chip-count">
                                            {form.productos.filter(p => p.grupoLocalId === gi.localId && p.referenciaId).length} ref.
                                        </span>
                                        <button
                                            type="button"
                                            className="nf-grupo-chip-remove"
                                            onClick={() => removeGrupoInstance(gi.localId)}
                                            title="Quitar grupo"
                                        >&times;</button>
                                    </div>
                                ))}
                            </div>

                            <div className="nf-grupo-create-box">
                                <label className="nf-sublabel">Crear Nuevo Grupo</label>
                                <div className="nf-grupo-fields">
                                    <input
                                        type="text"
                                        className="nf-input"
                                        placeholder="Nombre del nuevo grupo (ej: Sala Milan)..."
                                        value={newGrupoName}
                                        onChange={e => setNewGrupoName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGrupoInstance(); } }}
                                    />
                                    <div className="nf-grid-2">
                                        <select 
                                            className="nf-select" 
                                            value={newGrupoCategoria}
                                            onChange={e => {
                                                setNewGrupoCategoria(e.target.value);
                                                setNewGrupoSubcategoria('');
                                            }}
                                        >
                                            <option value="">Categoría (Obligatorio)...</option>
                                            {CATEGORIAS.map(c => (
                                                <option key={c.id} value={c.id}>{c.nombre}</option>
                                            ))}
                                        </select>
                                        <select 
                                            className="nf-select" 
                                            value={newGrupoSubcategoria}
                                            onChange={e => setNewGrupoSubcategoria(e.target.value)}
                                            disabled={!newGrupoCategoria}
                                        >
                                            <option value="">Subcategoría (Opcional)...</option>
                                            {SUBCATEGORIAS.filter(s => String(s.categoria) === String(newGrupoCategoria)).map(s => (
                                                <option key={s.id} value={s.id}>{s.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        className="nf-btn-add-grupo"
                                        onClick={addGrupoInstance}
                                        disabled={!newGrupoName.trim() || !newGrupoCategoria}
                                    >
                                        <FaPlus /> Añadir Grupo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: Referencias e Ítems */}
                <div className="nf-right-column">
                    <div className="nf-card">
                        <div className="nf-card-header">
                            <div className="nf-header-title-flex">
                                <div className="nf-card-icon-badge badge-indigo">
                                    <FaBoxes />
                                </div>
                                <div>
                                    <h3 className="nf-card-title">Referencias que Ingresan</h3>
                                    <p className="nf-card-desc">Especifica cantidades, costos unitarios, sedes y telas/cueros.</p>
                                </div>
                            </div>
                        </div>

                        <div className="nf-card-body">
                            {form.productos.map((row, index) => {
                                const providerRefs = referencias.filter(r => String(r.proveedor) === String(form.proveedorId));
                                const subcatsFiltered = row.categoriaId
                                    ? SUBCATEGORIAS.filter(s => String(s.categoria) === String(row.categoriaId))
                                    : [];
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
                                    ? 'Sin resultados para filtros'
                                    : 'Seleccionar referencia...';

                                const prodCostoNum = parseInt(row.costo) || 0;
                                const prodCantNum = parseInt(row.cantidad) || 1;
                                const prodSubtotal = prodCostoNum * prodCantNum;

                                return (
                                    <div key={index} className="nf-ref-card">
                                        <div className="nf-ref-header">
                                            <span className="nf-ref-badge">Item #{index + 1}</span>
                                            {form.productos.length > 1 && (
                                                <button 
                                                    type="button" 
                                                    className="nf-ref-remove-btn"
                                                    onClick={() => removeRefRow(index)}
                                                    title="Eliminar este producto"
                                                >
                                                    <FaTrashAlt />
                                                </button>
                                            )}
                                        </div>

                                        {/* Fila 1: Categoría | Subcategoría | Referencia | Variación */}
                                        <div className="nf-ref-grid-4">
                                            <div className="nf-form-group">
                                                <label>Categoría</label>
                                                <select
                                                    value={row.categoriaId}
                                                    onChange={e => {
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

                                            <div className="nf-form-group">
                                                <label>Subcategoría</label>
                                                <select
                                                    value={row.subcategoriaId}
                                                    disabled={!row.categoriaId}
                                                    onChange={e => {
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

                                            <div className="nf-form-group">
                                                <label>Referencia <span className="nf-req">*</span></label>
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

                                            <div className="nf-form-group">
                                                <label>Variación</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Ej: Color, tamaño"
                                                    value={row.variacion} 
                                                    onChange={e => handleRefRow(index, 'variacion', e.target.value)} 
                                                />
                                            </div>
                                        </div>

                                        {/* Fila 2: Costo Unitario | Cantidad | Estado Físico | Zona Inicial */}
                                        <div className="nf-ref-grid-4">
                                            <div className="nf-form-group">
                                                <label>Costo Unitario <span className="nf-req">*</span></label>
                                                <div className="nf-prefix-wrap">
                                                    <span className="nf-prefix">$</span>
                                                    <input 
                                                        required 
                                                        type="text" 
                                                        placeholder="0"
                                                        className="nf-prefix-input"
                                                        value={row.costoDisplay} 
                                                        onChange={e => handleRefRow(index, 'costoDisplay', e.target.value)} 
                                                    />
                                                </div>
                                            </div>

                                            <div className="nf-form-group">
                                                <label>Cantidad <span className="nf-req">*</span></label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="200"
                                                    className="nf-input-cant"
                                                    value={row.cantidad}
                                                    onChange={e => handleRefRow(index, 'cantidad', Math.max(1, parseInt(e.target.value) || 1))}
                                                />
                                                {prodSubtotal > 0 && (
                                                    <span className="nf-subtotal-hint">
                                                        Subtotal: {formatCOPInt(prodSubtotal)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="nf-form-group">
                                                <label>Estado Físico</label>
                                                <select value={row.estado_fisico} onChange={e => handleRefRow(index, 'estado_fisico', e.target.value)}>
                                                    <option value="buen_estado">Buen estado</option>
                                                    <option value="por_reparar">Por reparar</option>
                                                    <option value="por_modificar">Por modificar</option>
                                                </select>
                                            </div>

                                            <div className="nf-form-group">
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

                                        </div>

                                        {/* Fila 3: OP Asociada | Grupo | Observación */}
                                        <div className="nf-ref-grid-3">
                                            {/* OP Asociada */}
                                            {(() => {
                                                const { query: opQ, open: opOpen } = getOpSearch(index);
                                                const filteredOPs = ordenesProveedor.filter(o => {
                                                    const isPending = o.estado === 'pendiente' || o.estado === 'en_proceso';
                                                    if (!isPending) return false;
                                                    return String(o.id).includes(opQ) ||
                                                        (o.proveedor_nombre || '').toLowerCase().includes(opQ.toLowerCase());
                                                });
                                                const selectedOp = ordenesCompletasMap[String(row.opId)] || ordenesProveedor.find(o => String(o.id) === String(row.opId));
                                                return (
                                                    <div className="nf-form-group" style={{ position: 'relative' }}>
                                                        <label>OP Asociada <span className="nf-optional">(opcional)</span></label>
                                                        <div 
                                                            onClick={() => setOpSearch(index, { open: !opOpen })}
                                                            className="nf-select"
                                                            style={{ 
                                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                                cursor: 'pointer', color: selectedOp ? '#1e293b' : '#94a3b8', userSelect: 'none',
                                                                padding: '0.45rem 0.65rem'
                                                            }}
                                                        >
                                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                                                {selectedOp ? `OP #${selectedOp.id}` : (form.proveedorId ? 'Seleccionar...' : 'Falta proveedor')}
                                                            </span>
                                                            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                                                {row.opId && (
                                                                    <span
                                                                        onClick={e => { e.stopPropagation(); handleRefRow(index, 'opId', ''); }}
                                                                        style={{ marginRight: '6px', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}
                                                                        title="Quitar OP"
                                                                    >×</span>
                                                                )}
                                                                <FaChevronDown size={10} style={{ color: '#94a3b8' }} />
                                                            </div>
                                                        </div>
                                                        {opOpen && (
                                                            <div style={{
                                                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                                                                background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                                                                marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                                                display: 'flex', flexDirection: 'column'
                                                            }}>
                                                                <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px 8px 0 0' }}>
                                                                    <div style={{ position: 'relative' }}>
                                                                        <FaSearch size={11} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Buscar OP por número..."
                                                                            value={opQ}
                                                                            onChange={e => setOpSearch(index, { query: e.target.value })}
                                                                            onClick={e => e.stopPropagation()}
                                                                            style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 1.75rem', border: '1px solid #e2e8f0', borderRadius: '5px', background: '#f8fafc', color: '#1e293b', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                                                                            autoFocus
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div style={{ overflowY: 'auto', maxHeight: '200px' }}>
                                                                    {!form.proveedorId ? (
                                                                        <div style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>Selecciona un proveedor primero</div>
                                                                    ) : filteredOPs.length === 0 ? (
                                                                        <div style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>Sin órdenes pendientes para este proveedor</div>
                                                                    ) : filteredOPs.map(orden => (
                                                                        <div
                                                                            key={orden.id}
                                                                            onClick={() => handleSelectOp(index, orden)}
                                                                            style={{
                                                                                padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                                                                background: String(row.opId) === String(orden.id) ? '#eff6ff' : 'transparent',
                                                                                transition: 'background 0.15s'
                                                                            }}
                                                                            onMouseEnter={e => { if (String(row.opId) !== String(orden.id)) e.currentTarget.style.background = '#f8fafc'; }}
                                                                            onMouseLeave={e => { if (String(row.opId) !== String(orden.id)) e.currentTarget.style.background = 'transparent'; }}
                                                                        >
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                <span style={{ fontWeight: 600, color: '#1e40af', fontSize: '0.85rem' }}>OP #{orden.id}</span>
                                                                                {orden.venta && <span style={{ fontSize: '0.75rem', color: '#059669', background: '#d1fae5', padding: '1px 6px', borderRadius: '4px' }}>Venta #{orden.venta}</span>}
                                                                            </div>
                                                                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                                                                                {orden.estado} {orden.fecha_esperada ? `• Esperada: ${orden.fecha_esperada}` : ''}
                                                                            </div>
                                                                            {orden.observacion && (
                                                                                <div style={{ fontSize: '0.75rem', color: '#0f766e', marginTop: '2px', fontStyle: 'italic' }}>
                                                                                    📝 Obs: {orden.observacion}
                                                                                </div>
                                                                            )}
                                                                            {orden.detalles && orden.detalles.length > 0 && (
                                                                                <div style={{ fontSize: '0.75rem', color: '#334155', marginTop: '2px' }}>
                                                                                    📦 {orden.detalles.map(d => `${d.cantidad}x ${d.referencia_nombre || ''}`).join(', ')}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Tarjeta Informativa de la OP Asociada - colapsable */}
                                            {(() => {
                                                const selectedOp = ordenesCompletasMap[String(row.opId)] || ordenesProveedor.find(o => String(o.id) === String(row.opId));
                                                if (!selectedOp) return null;
                                                const opDetailOpen = getOpSearch(index).detailOpen || false;
                                                return (
                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                        <div
                                                            onClick={() => setOpSearch(index, { detailOpen: !opDetailOpen })}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                                padding: '0.4rem 0.75rem',
                                                                background: '#e0f2fe', border: '1px solid #bae6fd',
                                                                borderRadius: opDetailOpen ? '7px 7px 0 0' : '7px',
                                                                fontSize: '0.8rem', fontWeight: 600, color: '#0369a1',
                                                                cursor: 'pointer', userSelect: 'none', marginTop: '6px'
                                                            }}
                                                        >
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                📦 Contenido OP #{selectedOp.id}
                                                                {selectedOp.vendedor && <span style={{ fontWeight: 400, fontSize: '0.75rem' }}>• {selectedOp.vendedor}</span>}
                                                                {selectedOp.venta && <span style={{ background: '#bae6fd', color: '#0c4a6e', padding: '1px 7px', borderRadius: '4px', fontSize: '0.72rem' }}>Venta #{selectedOp.venta}</span>}
                                                            </span>
                                                            <span style={{ fontSize: '0.75rem' }}>{opDetailOpen ? 'Ocultar ▲' : 'Ver detalle ▼'}</span>
                                                        </div>

                                                        {opDetailOpen && (
                                                            <div style={{
                                                                padding: '0.65rem 0.85rem',
                                                                background: '#f0f9ff', border: '1px solid #bae6fd',
                                                                borderTop: 'none', borderRadius: '0 0 7px 7px',
                                                                fontSize: '0.82rem', color: '#0369a1'
                                                            }}>
                                                                {selectedOp.observacion && (
                                                                    <div style={{ marginBottom: '6px', color: '#0f766e', background: '#f0fdf4', padding: '4px 8px', borderRadius: '4px', border: '1px solid #bbf7d0', fontSize: '0.8rem' }}>
                                                                        📝 <strong>Observación del Pedido:</strong> {selectedOp.observacion}
                                                                    </div>
                                                                )}
                                                                {selectedOp.detalles && selectedOp.detalles.length > 0 ? (
                                                                    <div>
                                                                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0284c7', marginBottom: '3px' }}>Productos del Pedido:</div>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                            {selectedOp.detalles.map((d, dIdx) => (
                                                                                <div key={dIdx} style={{ background: '#fff', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e0f2fe', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                                                                                    <span style={{ fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>{d.cantidad}x</span>
                                                                                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{d.referencia_nombre || 'Referencia'}</span>
                                                                                    {d.especificaciones && <span style={{ color: '#64748b', fontSize: '0.78rem' }}>({d.especificaciones})</span>}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ color: '#64748b', fontSize: '0.78rem', fontStyle: 'italic' }}>(Sin detalles de productos en esta OP)</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            <div className="nf-form-group">
                                                <label>Grupo <span className="nf-optional">(opcional)</span></label>
                                                <select
                                                    value={row.grupoLocalId}
                                                    onChange={e => handleRefRow(index, 'grupoLocalId', e.target.value)}
                                                    className={`nf-select-grupo ${row.grupoLocalId ? 'nf-select-grupo--active' : ''}`}
                                                >
                                                    <option value="">Individual (Sin Grupo)</option>
                                                    {form.grupoInstances.length > 0 && (
                                                        <optgroup label="── Nuevos en esta factura ──">
                                                            {form.grupoInstances.map(gi => (
                                                                <option key={gi.localId} value={gi.localId}>{gi.nombre}</option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                    {gruposActivos.length > 0 && (
                                                        <optgroup label="── Grupos existentes ──">
                                                            {gruposActivos.map(g => (
                                                                <option key={`existing-${g.id}`} value={String(g.id)}>
                                                                    G{String(g.id).padStart(3, '0')} — {g.nombre}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                </select>
                                            </div>

                                            <div className="nf-form-group">
                                                <label>Observación del Ítem</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Detalles opcionales del ítem..."
                                                    value={row.observacion} 
                                                    onChange={e => handleRefRow(index, 'observacion', e.target.value)} 
                                                />
                                            </div>

                                        </div>

                                        {/* Sub-sección Telas y Cueros */}
                                        <div className="nf-tc-section">
                                            <div className="nf-tc-header">
                                                <span className="nf-tc-title">
                                                    🧵 Telas y Cueros Adicionales
                                                    <span className="nf-tc-hint"> (usar punto decimal, ej: 2.5)</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    className="nf-tc-add-btn"
                                                    onClick={() => addTelaCueroToRow(index)}
                                                >
                                                    <FaPlus /> Agregar Tela/Cuero
                                                </button>
                                            </div>

                                            {(!row.telas_cueros || row.telas_cueros.length === 0) ? (
                                                <div className="nf-tc-empty">Sin telas o cueros asignados a esta referencia.</div>
                                            ) : (
                                                <div className="nf-tc-list">
                                                    {row.telas_cueros.map((tc, tcIdx) => {
                                                        const isCuero = tc.tipo === 'cuero';
                                                        const unitLabel = isCuero ? 'dm' : 'm';
                                                        const tcSubtotal = (parseFloat(tc.costo_unidad) || 0) * (parseFloat(tc.cantidad) || 0);

                                                        return (
                                                            <div key={tcIdx} className="nf-tc-row">
                                                                <select
                                                                    value={tc.tipo || 'tela'}
                                                                    onChange={e => updateTelaCueroInRow(index, tcIdx, 'tipo', e.target.value)}
                                                                    className={`nf-tc-select ${isCuero ? 'nf-tc-cuero' : 'nf-tc-tela'}`}
                                                                >
                                                                    <option value="tela">Tela (m)</option>
                                                                    <option value="cuero">Cuero (dm)</option>
                                                                </select>

                                                                <input
                                                                    type="text"
                                                                    placeholder={isCuero ? "Ref. Cuero" : "Ref. Tela"}
                                                                    value={tc.referencia || ''}
                                                                    onChange={e => updateTelaCueroInRow(index, tcIdx, 'referencia', e.target.value)}
                                                                    className="nf-tc-input"
                                                                />

                                                                <input
                                                                    type="text"
                                                                    placeholder="Color"
                                                                    value={tc.color || ''}
                                                                    onChange={e => updateTelaCueroInRow(index, tcIdx, 'color', e.target.value)}
                                                                    className="nf-tc-input"
                                                                />

                                                                <div className="nf-tc-price-wrap">
                                                                    <span className="nf-tc-currency">$</span>
                                                                    <input
                                                                        type="text"
                                                                        placeholder={isCuero ? "Costo/dm" : "Costo/m"}
                                                                        value={tc.costo_unidad ? formatCOP(parseInt(tc.costo_unidad)) : ''}
                                                                        onChange={e => {
                                                                            const raw = e.target.value.replace(/[^0-9]/g, '');
                                                                            updateTelaCueroInRow(index, tcIdx, 'costo_unidad', raw);
                                                                        }}
                                                                        className="nf-tc-price-input"
                                                                    />
                                                                </div>

                                                                <div className="nf-tc-unit-wrap">
                                                                    <input
                                                                        type="text"
                                                                        inputMode="decimal"
                                                                        placeholder="Cant."
                                                                        value={tc.cantidad || ''}
                                                                        onChange={e => {
                                                                            const val = e.target.value.replace(',', '.');
                                                                            updateTelaCueroInRow(index, tcIdx, 'cantidad', val);
                                                                        }}
                                                                        className="nf-tc-qty-input"
                                                                    />
                                                                    <span className="nf-tc-unit-tag">{unitLabel}</span>
                                                                </div>

                                                                <div className="nf-tc-subtotal-box">
                                                                    {tcSubtotal > 0 ? `= ${formatCOP(tcSubtotal)}` : ''}
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    className="nf-tc-remove"
                                                                    onClick={() => removeTelaCueroFromRow(index, tcIdx)}
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

                            <button type="button" className="nf-btn-add-ref-large" onClick={addRefRow}>
                                <FaPlus /> Agregar otra Referencia
                            </button>
                        </div>
                    </div>
                </div>


            </form>
        </div>
    );
}
