import React, { useState, useEffect, useContext } from 'react';
import API from '../services/api';
import { AppContext, usePermissions } from '../AppContext';
import { FaPlus, FaTimes, FaEdit, FaTrashAlt, FaBoxOpen, FaSearch, FaChevronDown, FaChevronUp, FaSave, FaLayerGroup } from 'react-icons/fa';
import AppNotification from '../components/AppNotification';
import './GruposInventarioPage.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const emptyComponente = () => ({ referencia: '', categoriaId: '', subcategoriaId: '', variacion: '', cantidad: 1 });

const emptyForm = () => ({ nombre: '', descripcion: '', activo: true, componentes: [emptyComponente()] });

function GruposInventarioPage() {
    const { usuario } = useContext(AppContext);
    const hasPermission = usePermissions();

    const [grupos, setGrupos] = useState([]);
    const [notification, setNotification] = useState({ message: '', type: '' });

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
    };
    const [referencias, setReferencias] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [subcategorias, setSubcategorias] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);

    const [expandedId, setExpandedId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // ─── Load data ────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [grupoRes, refRes, catRes, subRes] = await Promise.all([
                    API.get('/suministros/grupos/'),
                    API.get('/referencias/'),
                    API.get('/suministros/categorias/'),
                    API.get('/suministros/subcategorias/'),
                ]);
                setGrupos(grupoRes.data.results || grupoRes.data || []);
                setReferencias(refRes.data.results || refRes.data || []);
                setCategorias(catRes.data.results || catRes.data || []);
                setSubcategorias(subRes.data.results || subRes.data || []);
            } catch (err) {
                console.error('Error fetching grupos:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // ─── Modal ────────────────────────────────────────────────────────────────
    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm());
        setShowModal(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setModalVisible(true)));
    };

    const openEdit = (grupo) => {
        setEditingId(grupo.id);
        setForm({
            nombre: grupo.nombre,
            descripcion: grupo.descripcion || '',
            activo: grupo.activo,
            componentes: grupo.componentes.length
                ? grupo.componentes.map(c => ({
                    referencia: String(c.referencia),
                    categoriaId: c.categoria ? String(c.categoria) : '',
                    subcategoriaId: c.subcategoria ? String(c.subcategoria) : '',
                    variacion: c.variacion || '',
                    cantidad: c.cantidad,
                }))
                : [emptyComponente()],
        });
        setShowModal(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setModalVisible(true)));
    };

    const closeModal = () => {
        setModalVisible(false);
        setTimeout(() => { setShowModal(false); setEditingId(null); }, 280);
    };

    // ─── Form helpers ──────────────────────────────────────────────────────────
    const handleField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const handleComponente = (idx, field, value) => {
        setForm(prev => {
            const comps = [...prev.componentes];
            if (field === 'categoriaId') {
                comps[idx] = { ...comps[idx], categoriaId: value, subcategoriaId: '' };
            } else {
                comps[idx] = { ...comps[idx], [field]: value };
            }
            return { ...prev, componentes: comps };
        });
    };

    const addComponente = () => setForm(prev => ({ ...prev, componentes: [...prev.componentes, emptyComponente()] }));
    const removeComponente = (idx) => setForm(prev => ({ ...prev, componentes: prev.componentes.filter((_, i) => i !== idx) }));

    // ─── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const payload = {
            nombre: form.nombre,
            descripcion: form.descripcion,
            activo: form.activo,
            componentes: form.componentes
                .filter(c => c.referencia)
                .map(c => ({
                    referencia: parseInt(c.referencia),
                    categoria: c.categoriaId ? parseInt(c.categoriaId) : null,
                    subcategoria: c.subcategoriaId ? parseInt(c.subcategoriaId) : null,
                    variacion: c.variacion,
                    cantidad: parseInt(c.cantidad) || 1,
                })),
        };
        try {
            if (editingId) {
                await API.put(`/suministros/grupos/${editingId}/`, payload);
            } else {
                await API.post('/suministros/grupos/', payload);
            }
            const res = await API.get('/suministros/grupos/');
            setGrupos(res.data.results || res.data || []);
            closeModal();
        } catch (err) {
            console.error('Error saving grupo:', err);
            showNotification('Error al guardar el grupo.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este grupo? Los ítems de inventario no se borrarán, solo se desvinculan.')) return;
        try {
            await API.delete(`/suministros/grupos/${id}/`);
            setGrupos(prev => prev.filter(g => g.id !== id));
        } catch (err) {
            showNotification('Error al eliminar el grupo.', 'error');
        }
    };

    // ─── Filters ──────────────────────────────────────────────────────────────
    const filtered = grupos.filter(g =>
        !searchTerm || g.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container grupos-page">
            {/* ─── Header ──────────────────────────────────────────────────── */}
            <div className="page-header">
                <div className="header-actions-wrapper">
                    <div className="filtros-inline">
                        <div className="filter-item">
                            <div className="grupos-search-wrap">
                                <FaSearch className="grupos-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Buscar grupo..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="filter-inline-input"
                                />
                            </div>
                        </div>
                    </div>
                    {hasPermission('CREAR_ITEM_INVENTARIO') && (
                        <button className="gip-btn-primary" onClick={openCreate}>
                            <FaPlus /> Nuevo Grupo
                        </button>
                    )}
                </div>
            </div>

            {/* ─── Table ───────────────────────────────────────────────────── */}
            <div className="ordenes-container">
                <div className="desktop-view">
                    {isLoading ? (
                        <div className="loading-container"><div className="loader" /></div>
                    ) : filtered.length === 0 ? (
                        <div className="grupos-empty">
                            <FaLayerGroup className="grupos-empty-icon" />
                            <p>{searchTerm ? 'Sin resultados para esa búsqueda.' : 'No hay grupos creados todavía.'}</p>
                            {hasPermission('CREAR_ITEM_INVENTARIO') && (
                                <button className="btn-primary" onClick={openCreate}><FaPlus /> Crear primer grupo</button>
                            )}
                        </div>
                    ) : (
                        <table className="premium-table grupos-table">
                            <thead>
                                <tr>
                                    <th>Nombre del Grupo</th>
                                    <th>Componentes</th>
                                    <th>Ítems en Inventario</th>
                                    <th>Estado</th>
                                    <th style={{ width: 100, textAlign: 'center' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(grupo => (
                                    <React.Fragment key={grupo.id}>
                                        <tr className={expandedId === grupo.id ? 'expanded-row-highlight' : ''}>
                                            <td>
                                                <div className="grupo-name-cell">
                                                    <span className="grupo-icon-wrap"><FaBoxOpen /></span>
                                                    <div>
                                                        <span className="grupo-nombre">{grupo.nombre}</span>
                                                        {grupo.descripcion && <span className="grupo-desc">{grupo.descripcion}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="grupo-comp-chips">
                                                    {grupo.componentes.slice(0, 3).map((c, i) => (
                                                        <span key={i} className="comp-chip">
                                                            {c.cantidad}× {c.referencia_nombre || `Ref #${c.referencia}`}
                                                            {c.variacion ? ` (${c.variacion})` : ''}
                                                        </span>
                                                    ))}
                                                    {grupo.componentes.length > 3 && (
                                                        <span className="comp-chip comp-chip--more">+{grupo.componentes.length - 3} más</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`inv-count-badge ${grupo.items_count > 0 ? 'inv-count--ok' : 'inv-count--empty'}`}>
                                                    {grupo.items_count} disponible{grupo.items_count !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${grupo.activo ? 'status-finalizada' : 'status-anulada'}`}>
                                                    {grupo.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="gip-card-actions">
                                                    {hasPermission('EDITAR_ITEM_INVENTARIO') && (
                                                        <>
                                                            <button className="action-btn" title="Editar" onClick={() => openEdit(grupo)}><FaEdit /></button>
                                                            <button className="action-btn action-btn--danger" title="Eliminar" onClick={() => handleDelete(grupo.id)}><FaTrashAlt /></button>
                                                        </>
                                                    )}
                                                    <button className="action-btn" title="Ver detalle" onClick={() => setExpandedId(expandedId === grupo.id ? null : grupo.id)}>
                                                        {expandedId === grupo.id ? <FaChevronUp /> : <FaChevronDown />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {expandedId === grupo.id && (
                                            <tr className="expanded-row">
                                                <td colSpan="5">
                                                    <div className="grupo-expanded">
                                                        <h4 className="grupo-expanded-title">Componentes del Grupo</h4>
                                                        <table className="items-table">
                                                            <thead>
                                                                <tr>
                                                                    <th>Referencia</th>
                                                                    <th>Categoría</th>
                                                                    <th>Subcategoría</th>
                                                                    <th>Variación</th>
                                                                    <th>Cantidad</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {grupo.componentes.map((c, i) => (
                                                                    <tr key={i}>
                                                                        <td>{c.referencia_nombre || `Ref #${c.referencia}`}</td>
                                                                        <td>{c.categoria_nombre || '—'}</td>
                                                                        <td>{c.subcategoria_nombre || '—'}</td>
                                                                        <td>{c.variacion || '—'}</td>
                                                                        <td><span className="cantidad-badge">{c.cantidad}</span></td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ─── Modal Crear / Editar Grupo ───────────────────────────────── */}
            {showModal && (
                <div
                    className={`grupos-overlay${modalVisible ? ' grupos-overlay-visible' : ''}`}
                    onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div className={`grupos-modal${modalVisible ? ' grupos-modal-visible' : ''}`}>
                        <div className="grupos-modal-header">
                            <div className="grupos-modal-header-left">
                                <FaLayerGroup className="grupos-modal-icon" />
                                <h3>{editingId ? 'Editar Grupo' : 'Nuevo Grupo de Inventario'}</h3>
                            </div>
                            <button className="grupos-modal-close" onClick={closeModal}><FaTimes /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="grupos-form">
                            <div className="grupos-form-body">
                                {/* Datos generales */}
                                <div className="grupos-section">
                                    <div className="grupos-section-title">Información General</div>
                                    <div className="grupos-fields-row">
                                        <div className="gfg-group gfg-grow">
                                            <label className="gfg-label">Nombre del Grupo *</label>
                                            <input
                                                required
                                                type="text"
                                                className="gfg-input"
                                                placeholder="Ej: Comedor 6 puestos"
                                                value={form.nombre}
                                                onChange={e => handleField('nombre', e.target.value)}
                                            />
                                        </div>
                                        <div className="gfg-group">
                                            <label className="gfg-label">Estado</label>
                                            <select
                                                className="gfg-input"
                                                value={form.activo ? 'true' : 'false'}
                                                onChange={e => handleField('activo', e.target.value === 'true')}
                                            >
                                                <option value="true">Activo</option>
                                                <option value="false">Inactivo</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="gfg-group">
                                        <label className="gfg-label">Descripción</label>
                                        <input
                                            type="text"
                                            className="gfg-input"
                                            placeholder="Descripción opcional del grupo..."
                                            value={form.descripcion}
                                            onChange={e => handleField('descripcion', e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Componentes */}
                                <div className="grupos-section">
                                    <div className="grupos-section-title">Componentes del Grupo</div>
                                    <p className="grupos-section-hint">
                                        Define qué referencias forman este conjunto y en qué cantidad. Ejemplo: 1× Mesa + 6× Silla.
                                    </p>

                                    {form.componentes.map((comp, idx) => {
                                        const subcatsFiltered = comp.categoriaId
                                            ? subcategorias.filter(s => String(s.categoria) === String(comp.categoriaId))
                                            : subcategorias;
                                        const refsFiltered = referencias.filter(r => {
                                            if (comp.categoriaId && String(r.categoria) !== String(comp.categoriaId)) return false;
                                            if (comp.subcategoriaId && String(r.subcategoria) !== String(comp.subcategoriaId)) return false;
                                            return true;
                                        });

                                        return (
                                            <div key={idx} className="gfg-comp-row">
                                                <div className="gfg-comp-num">{idx + 1}</div>
                                                <div className="gfg-comp-fields">
                                                    <div className="gfg-group">
                                                        <label className="gfg-label">Categoría</label>
                                                        <select className="gfg-input" value={comp.categoriaId} onChange={e => handleComponente(idx, 'categoriaId', e.target.value)}>
                                                            <option value="">Sin filtro</option>
                                                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="gfg-group">
                                                        <label className="gfg-label">Subcategoría</label>
                                                        <select className="gfg-input" value={comp.subcategoriaId} onChange={e => handleComponente(idx, 'subcategoriaId', e.target.value)} disabled={!comp.categoriaId}>
                                                            <option value="">Sin filtro</option>
                                                            {subcatsFiltered.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="gfg-group gfg-grow">
                                                        <label className="gfg-label">Referencia *</label>
                                                        <select required className="gfg-input" value={comp.referencia} onChange={e => handleComponente(idx, 'referencia', e.target.value)}>
                                                            <option value="">Seleccionar...</option>
                                                            {refsFiltered.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="gfg-group">
                                                        <label className="gfg-label">Variación</label>
                                                        <input type="text" className="gfg-input" placeholder="Color, talla..." value={comp.variacion} onChange={e => handleComponente(idx, 'variacion', e.target.value)} />
                                                    </div>
                                                    <div className="gfg-group gfg-qty">
                                                        <label className="gfg-label">Cant.</label>
                                                        <input type="number" min="1" className="gfg-input" value={comp.cantidad} onChange={e => handleComponente(idx, 'cantidad', e.target.value)} />
                                                    </div>
                                                </div>
                                                {form.componentes.length > 1 && (
                                                    <button type="button" className="gfg-remove-btn" onClick={() => removeComponente(idx)} title="Quitar componente">
                                                        <FaTrashAlt />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <button type="button" className="gfg-add-comp-btn" onClick={addComponente}>
                                        <FaPlus /> Agregar Componente
                                    </button>
                                </div>
                            </div>

                            <div className="grupos-modal-footer">
                                <button type="button" className="btn-secondary" onClick={closeModal} disabled={saving}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    {saving ? <><FaSave className="spin-icon" /> Guardando...</> : <><FaSave /> {editingId ? 'Guardar Cambios' : 'Crear Grupo'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Componente Global de Notificaciones Elegante */}
            <AppNotification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />
        </div>
    );
}

export default GruposInventarioPage;
