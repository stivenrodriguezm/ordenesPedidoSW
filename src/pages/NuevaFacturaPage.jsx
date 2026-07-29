import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import API from '../services/api';
import { AppContext, usePermissions } from '../AppContext';
import { formatCOP, parseCOP } from '../utils/formatCOP';
import { 
    FaPlus, FaTrashAlt, FaTimes, FaBoxOpen, FaImage, FaCamera, FaUpload, 
    FaLayerGroup, FaCheckCircle, FaExclamationCircle, FaFileInvoiceDollar, 
    FaClipboardList, FaBuilding, FaCalendarAlt, FaArrowLeft, FaDollarSign, 
    FaStickyNote, FaTag, FaBoxes, FaMapMarkerAlt, FaShoppingCart, FaUserCheck
} from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import './NuevaFacturaPage.css';

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
    estado_fisico: 'buen_estado',
    zonaId: '',
    ventaId: '', 
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

const formatCOPInt = (value) => {
    const n = parseInt(value) || 0;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
};

export default function NuevaFacturaPage() {
    const { proveedores, usuario } = useContext(AppContext);
    const hasPermission = usePermissions();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isCreating, setIsCreating] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' });

    const showToast = (message, type = 'success') => {
        setNotification({ message, type });
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

    const { data: ordenesPendientes = [] } = useQuery({
        queryKey: ['ordenes-pendientes-ids'],
        queryFn: async () => {
            const res = await API.get('/get-pendientes-ids/');
            return res.data || [];
        }
    });

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
        <div className="nf-page-container">
            {/* Header / Top Navigation */}
            <div className="nf-page-header">
                <div className="nf-header-left">
                    <div className="nf-header-titles">
                        <div className="nf-header-badge">
                            <FaFileInvoiceDollar /> Nueva Factura
                        </div>
                        <h1 className="nf-page-title">Registrar Factura de Proveedor</h1>
                        <p className="nf-page-subtitle">Ingresa los datos generales, grupos y referencias de mercancía recibida.</p>
                    </div>
                </div>
                <div className="nf-header-actions">
                    <button type="button" className="nf-btn-secondary" onClick={() => navigate('/suministros/facturas')} disabled={isCreating}>
                        Cancelar
                    </button>
                    <button type="submit" form="nueva-factura-form" className="nf-btn-primary" disabled={isCreating}>
                        {isCreating ? 'Registrando...' : 'Registrar Factura'}
                    </button>
                </div>
            </div>

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

                                        {/* Fila 2: Costo Unitario | Cantidad | Estado Físico | Zona Inicial | Disponibilidad | Venta */}
                                        <div className="nf-ref-grid-dynamic">
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

                                            <div className="nf-form-group">
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
                                                <div className="nf-form-group">
                                                    <label>Venta Asociada</label>
                                                    <select 
                                                        value={row.ventaId} 
                                                        disabled={!!row.grupoLocalId}
                                                        onChange={e => handleRefRow(index, 'ventaId', e.target.value)}>
                                                        <option value="">Seleccione Venta...</option>
                                                        {ordenesPendientes.map(id => <option key={id} value={id}>{id}</option>)}
                                                    </select>
                                                    {row.grupoLocalId && (
                                                        <small className="nf-inherited-hint">
                                                            Hereda venta del grupo.
                                                        </small>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Fila 3: Grupo | Observación | Imagen */}
                                        <div className="nf-ref-grid-3">
                                            <div className="nf-form-group">
                                                <label>Grupo <span className="nf-optional">(opcional)</span></label>
                                                <select
                                                    value={row.grupoLocalId}
                                                    onChange={e => handleRefRow(index, 'grupoLocalId', e.target.value)}
                                                    className={`nf-select-grupo ${row.grupoLocalId ? 'nf-select-grupo--active' : ''}`}
                                                >
                                                    <option value="">Individual (Sin Grupo)</option>
                                                    {gruposActivos.length > 0 && (
                                                        <optgroup label="── Grupos existentes ──">
                                                            {gruposActivos.map(g => (
                                                                <option key={`existing-${g.id}`} value={String(g.id)}>
                                                                    G{String(g.id).padStart(3, '0')} — {g.nombre}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                    {form.grupoInstances.length > 0 && (
                                                        <optgroup label="── Nuevos en esta factura ──">
                                                            {form.grupoInstances.map(gi => (
                                                                <option key={gi.localId} value={gi.localId}>{gi.nombre}</option>
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

                                            <div className="nf-form-group">
                                                <label>Imagen</label>
                                                <div className="nf-img-zone">
                                                    {row.imagen ? (
                                                        <div className="nf-img-preview">
                                                            <FaImage className="nf-img-icon" />
                                                            <span className="nf-img-name">{row.imagen.name}</span>
                                                            <button 
                                                                type="button" 
                                                                className="nf-img-remove" 
                                                                onClick={() => handleRefRow(index, 'imagen', null)}
                                                            >&times;</button>
                                                        </div>
                                                    ) : (
                                                        <div className="nf-img-actions">
                                                            <label className="nf-img-btn">
                                                                <FaUpload /> Adjuntar
                                                                <input 
                                                                    type="file" 
                                                                    hidden 
                                                                    accept="image/*" 
                                                                    onChange={e => handleRefRow(index, 'imagen', e.target.files[0])} 
                                                                />
                                                            </label>
                                                            <button 
                                                                type="button" 
                                                                className="nf-img-btn" 
                                                                onClick={() => showToast('Simulación: foto con cámara', 'success')}
                                                            >
                                                                <FaCamera /> Foto
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
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

                {/* Footer Bar Sticky */}
                <div className="nf-footer-sticky">
                    <div className="nf-footer-summary">
                        <span className="nf-summary-label">Suma Productos:</span>
                        <span className={`nf-summary-total ${isTotalMatching ? 'total-match' : valorFactura > 0 ? 'total-mismatch' : ''}`}>
                            {formatCOPInt(totalCostos)}
                        </span>
                        <span className="nf-summary-sep">/</span>
                        <span className="nf-summary-label">Valor Factura:</span>
                        <span className="nf-summary-factura">{formatCOPInt(valorFactura)}</span>
                    </div>

                    <div className="nf-footer-actions">
                        <button type="button" className="nf-btn-secondary" onClick={() => navigate('/suministros/facturas')} disabled={isCreating}>
                            Cancelar
                        </button>
                        <button type="submit" className="nf-btn-primary" disabled={isCreating}>
                            {isCreating ? 'Registrando...' : 'Registrar Factura'}
                        </button>
                    </div>
                </div>
            </form>

            <AppNotification 
                message={notification.message} 
                type={notification.type} 
                onClose={() => setNotification({ message: '', type: '' })} 
            />
        </div>
    );
}
