import React, { useState, useContext, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../services/api";
import "./ReferenciasPage.css";
import { FaEdit, FaPlus, FaSort, FaSortUp, FaSortDown, FaFileExport, FaTags, FaTrash, FaSearch, FaTimes, FaSitemap, FaSave } from "react-icons/fa";
import * as XLSX from 'xlsx';
import { AppContext } from "../AppContext";
import AppNotification from '../components/AppNotification';

// ─── Inline notification helper ───────────────────────────────────────────────
const InlineNotif = ({ message, type }) => {
  if (!message) return null;
  return (
    <div style={{
      padding: '0.6rem 1rem',
      borderRadius: 8,
      marginBottom: '1rem',
      fontSize: '0.85rem',
      background: type === 'success' ? '#dcfce7' : '#fee2e2',
      color: type === 'success' ? '#166534' : '#991b1b',
    }}>
      {message}
    </div>
  );
};

// ─── Categorías Modal ─────────────────────────────────────────────────────────
const CategoriasModal = ({ isOpen, onClose }) => {
  const [nombre, setNombre] = useState('');
  const [notif, setNotif] = useState({ message: '', type: '' });
  const token = localStorage.getItem("accessToken");
  const queryClient = useQueryClient();

  // Auto-dismiss notification
  useEffect(() => {
    if (notif.message) {
      const t = setTimeout(() => setNotif({ message: '', type: '' }), 3500);
      return () => clearTimeout(t);
    }
  }, [notif.message]);

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['suministros-categorias'],
    queryFn: async () => {
      const res = await API.get('/suministros/categorias/');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: (data) => API.post('/suministros/categorias/', data, { headers: { Authorization: `Bearer ${token}` } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suministros-categorias'] });
      setNombre('');
      setNotif({ message: 'Categoría creada exitosamente.', type: 'success' });
    },
    onError: (err) => {
      const msg = err.response?.data?.nombre?.[0] || err.response?.data?.detail || 'Error al crear la categoría.';
      setNotif({ message: msg, type: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => API.delete(`/suministros/categorias/${id}/`, { headers: { Authorization: `Bearer ${token}` } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suministros-categorias'] });
      queryClient.invalidateQueries({ queryKey: ['suministros-subcategorias'] });
      queryClient.invalidateQueries({ queryKey: ['referencias'] });
      setNotif({ message: 'Categoría eliminada.', type: 'success' });
    },
    onError: (err) => {
      setNotif({ message: err.response?.data?.detail || 'Error al eliminar la categoría.', type: 'error' });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="ref-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="ref-modal-content" style={{ maxWidth: 480 }}>
        <InlineNotif {...notif} />
        <div className="ref-modal-header">
          <h3><FaTags style={{ marginRight: 8, color: '#475569' }} />Gestionar Categorías</h3>
          <button className="ref-modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); if (nombre.trim()) createMutation.mutate({ nombre: nombre.trim() }); }}
          style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="Nombre de la nueva categoría..."
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mgmt-input"
            required
          />
          <button type="submit" className="ref-btn-primary" disabled={createMutation.isLoading} style={{ whiteSpace: 'nowrap' }}>
            <FaPlus /> Agregar
          </button>
        </form>

        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {isLoading ? (
            <div className="loading-container"><div className="loader" /></div>
          ) : categorias.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>No hay categorías registradas.</p>
          ) : (
            <ul className="mgmt-list">
              {categorias.map((cat) => (
                <li key={cat.id} className="mgmt-list-item">
                  <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.9rem' }}>{cat.nombre}</span>
                  <button
                    onClick={() => { if (window.confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) deleteMutation.mutate(cat.id); }}
                    className="delete-btn"
                    title="Eliminar categoría"
                    disabled={deleteMutation.isLoading}
                  >
                    <FaTrash size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ref-modal-actions">
          <button className="ref-btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

// ─── Subcategorías Modal ───────────────────────────────────────────────────────
const SubcategoriasModal = ({ isOpen, onClose, categorias }) => {
  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [filterCatId, setFilterCatId] = useState(''); // for list filtering
  const [notif, setNotif] = useState({ message: '', type: '' });
  const [editingSubcat, setEditingSubcat] = useState(null);
  const token = localStorage.getItem("accessToken");
  const queryClient = useQueryClient();

  // Auto-dismiss notification
  useEffect(() => {
    if (notif.message) {
      const t = setTimeout(() => setNotif({ message: '', type: '' }), 3500);
      return () => clearTimeout(t);
    }
  }, [notif.message]);

  // Set form fields when editing changes
  useEffect(() => {
    if (editingSubcat) {
      setNombre(editingSubcat.nombre || '');
      setCategoriaId(editingSubcat.categoria || '');
    } else {
      setNombre('');
      setCategoriaId('');
    }
  }, [editingSubcat]);

  const handleClose = () => {
    setEditingSubcat(null);
    setNombre('');
    setCategoriaId('');
    onClose();
  };

  const { data: subcategorias = [], isLoading } = useQuery({
    queryKey: ['suministros-subcategorias'],
    queryFn: async () => {
      const res = await API.get('/suministros/subcategorias/');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: (data) => API.post('/suministros/subcategorias/', data, { headers: { Authorization: `Bearer ${token}` } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suministros-subcategorias'] });
      queryClient.invalidateQueries({ queryKey: ['productos-all'] });
      queryClient.invalidateQueries({ queryKey: ['referencias'] });
      setNombre('');
      setCategoriaId('');
      setNotif({ message: 'Subcategoría creada exitosamente.', type: 'success' });
    },
    onError: (err) => {
      const msg = err.response?.data?.nombre?.[0] || err.response?.data?.detail || 'Error al crear la subcategoría.';
      setNotif({ message: msg, type: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => API.put(`/suministros/subcategorias/${id}/`, data, { headers: { Authorization: `Bearer ${token}` } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suministros-subcategorias'] });
      queryClient.invalidateQueries({ queryKey: ['productos-all'] });
      queryClient.invalidateQueries({ queryKey: ['referencias'] });
      setNombre('');
      setCategoriaId('');
      setEditingSubcat(null);
      setNotif({ message: 'Subcategoría actualizada exitosamente.', type: 'success' });
    },
    onError: (err) => {
      const msg = err.response?.data?.nombre?.[0] || err.response?.data?.detail || 'Error al actualizar la subcategoría.';
      setNotif({ message: msg, type: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => API.delete(`/suministros/subcategorias/${id}/`, { headers: { Authorization: `Bearer ${token}` } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suministros-subcategorias'] });
      queryClient.invalidateQueries({ queryKey: ['referencias'] });
      setNotif({ message: 'Subcategoría eliminada.', type: 'success' });
      if (editingSubcat && String(editingSubcat.id) === String(id)) {
        setEditingSubcat(null);
      }
    },
    onError: (err) => {
      setNotif({ message: err.response?.data?.detail || 'Error al eliminar la subcategoría.', type: 'error' });
    },
  });

  const filtered = filterCatId
    ? subcategorias.filter(s => String(s.categoria) === String(filterCatId))
    : subcategorias;

  if (!isOpen) return null;

  return (
    <div className="ref-modal-overlay" style={{ zIndex: 1100 }}>
      <div className="subcat-modal">

        {/* ── Header ── */}
        <div className="subcat-modal__header">
          <div className="subcat-modal__header-left">
            <span className="subcat-modal__header-icon"><FaSitemap /></span>
            <div>
              <h3 className="subcat-modal__title">Gestionar Subcategorías</h3>
              <p className="subcat-modal__subtitle">{subcategorias.length} subcategorías registradas</p>
            </div>
          </div>
          <button className="subcat-modal__close" onClick={handleClose} title="Cerrar">×</button>
        </div>

        <div className="subcat-modal__body">

          {/* ── Notification ── */}
          {notif.message && (
            <div className={`subcat-notif subcat-notif--${notif.type}`}>
              {notif.type === 'success' ? '✓' : '✕'} {notif.message}
            </div>
          )}

          {/* ── Nueva Subcategoría form ── */}
          <div className="subcat-section">
            <p className="subcat-section__label">{editingSubcat ? 'Editar subcategoría' : 'Nueva subcategoría'}</p>
            <form
              className="subcat-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!nombre.trim() || !categoriaId) return;
                const data = { nombre: nombre.trim(), categoria: categoriaId };
                if (editingSubcat) {
                  updateMutation.mutate({ id: editingSubcat.id, data });
                } else {
                  createMutation.mutate(data);
                }
              }}
            >
              <div className="subcat-form__row">
                <div className="subcat-form__field">
                  <label className="subcat-form__field-label">Categoría</label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="subcat-form__select"
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="subcat-form__field subcat-form__field--grow">
                  <label className="subcat-form__field-label">Nombre</label>
                  <input
                    type="text"
                    placeholder="Ej. Sala de comedor..."
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="subcat-form__input"
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="submit"
                  className="subcat-form__submit"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  style={{ flex: 1, margin: 0, height: '36px' }}
                >
                  {editingSubcat ? <FaSave style={{ marginRight: 6 }} /> : <FaPlus style={{ marginRight: 6 }} />}
                  {createMutation.isLoading || updateMutation.isLoading ? 'Guardando...' : (editingSubcat ? 'Guardar Cambios' : 'Agregar Subcategoría')}
                </button>
                {editingSubcat && (
                  <button
                    type="button"
                    className="ref-btn-secondary"
                    onClick={() => setEditingSubcat(null)}
                    style={{ padding: '0 1rem', height: '36px', borderRadius: '8px' }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* ── Filter chips ── */}
          <div className="subcat-section">
            <p className="subcat-section__label">Filtrar por categoría</p>
            <div className="subcat-chips">
              <button
                className={`subcat-chip${filterCatId === '' ? ' subcat-chip--active' : ''}`}
                onClick={() => setFilterCatId('')}
              >
                Todas
              </button>
              {categorias.map((c) => (
                <button
                  key={c.id}
                  className={`subcat-chip${String(filterCatId) === String(c.id) ? ' subcat-chip--active' : ''}`}
                  onClick={() => setFilterCatId(String(c.id))}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* ── List ── */}
          <div className="subcat-list-wrap">
            {isLoading ? (
              <div className="loading-container"><div className="loader" /></div>
            ) : filtered.length === 0 ? (
              <div className="subcat-empty">
                <FaSitemap size={28} style={{ opacity: 0.2, marginBottom: 8 }} />
                <p>{subcategorias.length === 0 ? 'No hay subcategorías registradas.' : 'Ninguna coincide con el filtro.'}</p>
              </div>
            ) : (
              <ul className="subcat-list">
                {filtered.map((sub) => {
                  const catName = categorias.find(c => String(c.id) === String(sub.categoria))?.nombre || `Cat. #${sub.categoria}`;
                  return (
                    <li key={sub.id} className="subcat-list__item">
                      <div className="subcat-list__info">
                        <span className="subcat-list__name">{sub.nombre}</span>
                        <span className="subcat-list__cat">{catName}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setEditingSubcat(sub)}
                          className="action-btn"
                          title="Editar subcategoría"
                          style={{ padding: '0.35rem', color: '#1e3a8a' }}
                        >
                          <FaEdit size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Eliminar la subcategoría "${sub.nombre}"?`))
                              deleteMutation.mutate(sub.id);
                          }}
                          className="delete-btn"
                          title="Eliminar subcategoría"
                          disabled={deleteMutation.isLoading}
                          style={{ padding: '0.35rem' }}
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="subcat-modal__footer">
          <button className="ref-btn-secondary" onClick={handleClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

// ─── Referencia Modal (crear / editar) ───────────────────────────────────────
const ReferenciaModal = ({ isOpen, onClose, onSave, proveedores, referencia, isLoading, categorias, subcategorias }) => {
  const [nombre, setNombre] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [categoriasSelected, setCategoriasSelected] = useState([]);
  const [subcategoriasSelected, setSubcategoriasSelected] = useState([]);

  useEffect(() => {
    if (referencia) {
      setNombre(referencia.nombre || '');
      setProveedorId(referencia.proveedor || '');
      setCategoriasSelected(referencia.categorias || []);
      setSubcategoriasSelected(referencia.subcategorias || []);
    } else {
      setNombre('');
      setProveedorId('');
      setCategoriasSelected([]);
      setSubcategoriasSelected([]);
    }
  }, [referencia, isOpen]);

  const handleToggleCategory = (catId) => {
    let updated;
    if (categoriasSelected.includes(catId)) {
      updated = categoriasSelected.filter(id => id !== catId);
      // Also filter out any subcategories that belong to the deselected category
      const subsToRemove = subcategorias.filter(sub => sub.categoria === catId).map(sub => sub.id);
      setSubcategoriasSelected(prev => prev.filter(id => !subsToRemove.includes(id)));
    } else {
      updated = [...categoriasSelected, catId];
    }
    setCategoriasSelected(updated);
  };

  const handleToggleSubcategory = (subId) => {
    if (subcategoriasSelected.includes(subId)) {
      setSubcategoriasSelected(subcategoriasSelected.filter(id => id !== subId));
    } else {
      setSubcategoriasSelected([...subcategoriasSelected, subId]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: referencia?.id,
      nombre,
      proveedor: proveedorId,
      categorias: categoriasSelected,
      subcategorias: subcategoriasSelected,
    });
  };

  if (!isOpen) return null;

  const availableSubcategories = subcategorias.filter(sub =>
    categoriasSelected.includes(sub.categoria)
  );

  return (
    <div className="ref-modal-overlay">
      <div className="ref-modal-content" style={{ maxWidth: 520 }}>
        <div className="ref-modal-header">
          <h3>{referencia ? 'Editar Referencia' : 'Nueva Referencia'}</h3>
          <button className="ref-modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre de la Referencia</label>
            <input
              type="text"
              placeholder="Ej. Sofá Madrid"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Proveedor</label>
            <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} required>
              <option value="">Seleccione un proveedor...</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre_empresa}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Categorías</label>
            <div className="multi-chips-selector">
              {categorias.map((cat) => {
                const isSelected = categoriasSelected.includes(cat.id);
                return (
                  <button
                    type="button"
                    key={cat.id}
                    className={`interactive-chip ${isSelected ? 'interactive-chip--selected' : ''}`}
                    onClick={() => handleToggleCategory(cat.id)}
                  >
                    {cat.nombre}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label>Subcategorías</label>
            {categoriasSelected.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                Seleccione al menos una categoría para ver subcategorías.
              </p>
            ) : availableSubcategories.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                No hay subcategorías registradas para las categorías seleccionadas.
              </p>
            ) : (
              <div className="multi-chips-selector">
                {availableSubcategories.map((sub) => {
                  const isSelected = subcategoriasSelected.includes(sub.id);
                  return (
                    <button
                      type="button"
                      key={sub.id}
                      className={`interactive-chip ${isSelected ? 'interactive-chip--selected' : ''}`}
                      onClick={() => handleToggleSubcategory(sub.id)}
                    >
                      {sub.nombre}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="ref-modal-actions">
            <button type="button" className="ref-btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="ref-btn-primary" disabled={isLoading}>
              {isLoading ? 'Guardando...' : (referencia ? 'Guardar Cambios' : 'Crear Referencia')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// ─── Page ─────────────────────────────────────────────────────────────────────
function ReferenciasPage() {
  const { proveedores, isLoading: contextLoading, isLoadingProveedores, fetchProveedores, usuario } = useContext(AppContext);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoriasModalOpen, setIsCategoriasModalOpen] = useState(false);
  const [isSubcategoriasModalOpen, setIsSubcategoriasModalOpen] = useState(false);
  const [editingReferencia, setEditingReferencia] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'ascending' });
  const [notification, setNotification] = useState({ message: '', type: '' });
  const token = localStorage.getItem("accessToken");
  const queryClient = useQueryClient();

  // Filtros
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterProveedor, setFilterProveedor] = useState('');

  // ── Categorías ──
  const { data: categorias = [] } = useQuery({
    queryKey: ['suministros-categorias'],
    queryFn: async () => {
      const res = await API.get('/suministros/categorias/');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!token,
  });

  // ── Subcategorías ──
  const { data: subcategorias = [] } = useQuery({
    queryKey: ['suministros-subcategorias'],
    queryFn: async () => {
      const res = await API.get('/suministros/subcategorias/');
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!token,
  });

  // ── Referencias ──
  const { data: referencias = [], isLoading, isError } = useQuery({
    queryKey: ["referencias"],
    queryFn: async () => {
      const response = await API.get("/referencias/");
      return (Array.isArray(response.data) ? response.data : []).map((ref) => {
        const proveedor = proveedores.find((prov) => prov.id === ref.proveedor);
        return {
          ...ref,
          proveedor_name: proveedor ? proveedor.nombre_empresa : "Desconocido",
        };
      });
    },
    enabled: !!token && !contextLoading && !isLoadingProveedores,
    onError: (error) => {
      setNotification({ message: error.response?.data?.detail || error.message || 'Error al cargar las referencias.', type: 'error' });
    },
  });

  const filteredReferencias = useMemo(() => {
    return referencias.filter(ref => {
      if (filterProveedor && String(ref.proveedor) !== filterProveedor) return false;
      if (filterCategoria && !ref.categorias?.map(String).includes(filterCategoria)) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        return (
          (ref.nombre || '').toLowerCase().includes(q) ||
          (ref.proveedor_name || '').toLowerCase().includes(q) ||
          (ref.categorias_nombres || []).some(name => name.toLowerCase().includes(q)) ||
          (ref.subcategorias_nombres || []).some(name => name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [referencias, filterSearch, filterCategoria, filterProveedor]);

  const sortedReferencias = useMemo(() => {
    let sortableItems = [...filteredReferencias];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let valA = '';
        let valB = '';
        if (sortConfig.key === 'categoria_nombre') {
          valA = (a.categorias_nombres || []).join(', ').toLowerCase();
          valB = (b.categorias_nombres || []).join(', ').toLowerCase();
        } else if (sortConfig.key === 'subcategoria_nombre') {
          valA = (a.subcategorias_nombres || []).join(', ').toLowerCase();
          valB = (b.subcategorias_nombres || []).join(', ').toLowerCase();
        } else {
          valA = (a[sortConfig.key] ?? '').toString().toLowerCase();
          valB = (b[sortConfig.key] ?? '').toString().toLowerCase();
        }
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredReferencias, sortConfig]);

  const hasFilters = filterSearch || filterCategoria || filterProveedor;
  const clearFilters = () => {
    setFilterSearch('');
    setFilterCategoria('');
    setFilterProveedor('');
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name) => {
    if (!sortConfig || sortConfig.key !== name) return <FaSort className="sort-icon" />;
    return sortConfig.direction === 'ascending'
      ? <FaSortUp className="sort-icon active" />
      : <FaSortDown className="sort-icon active" />;
  };

  const mutation = useMutation({
    mutationFn: (referenciaData) => {
      const { id, ...data } = referenciaData;
      return id
        ? API.put(`referencias/${id}/`, data, { headers: { Authorization: `Bearer ${token}` } })
        : API.post("referencias/", data, { headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["referencias"] });
      queryClient.invalidateQueries({ queryKey: ["productos-all"] });
      await fetchProveedores();
      handleCloseModal();
      setNotification({ message: `Referencia ${variables.id ? 'actualizada' : 'creada'} exitosamente.`, type: 'success' });
    },
    onError: (error) => {
      setNotification({ message: error.response?.data?.detail || error.message || 'Error al guardar la referencia.', type: 'error' });
    },
  });

  const handleOpenModal = (referencia = null) => { setEditingReferencia(referencia); setIsModalOpen(true); };
  const handleCloseModal = () => setIsModalOpen(false);
  const handleSave = (data) => mutation.mutate(data);

  const exportReferencias = () => {
    const dataToExport = sortedReferencias.map(ref => ({
      'Referencia': ref.nombre,
      'Proveedor': ref.proveedor_name,
      'Categorías': (ref.categorias_nombres || []).join(', ') || '—',
      'Subcategorías': (ref.subcategorias_nombres || []).join(', ') || '—',
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Referencias');
    XLSX.writeFile(wb, 'Referencias.xlsx');
  };

  return (
    <div className="page-container">
      <AppNotification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: '', type: '' })}
      />
      <div className="v-glass-header" style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', overflowX: 'auto' }}>
        <div className="v-filters-bar" style={{ margin: 0, flex: 1 }}>
          <div className="v-search-pill">
            <FaSearch />
            <input
              type="text"
              placeholder="Buscar referencia..."
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
            />
          </div>
          <div className="v-select-pill">
            <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)}>
              <option value="">Categoría: Todas</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="v-select-pill">
            <select value={filterProveedor} onChange={e => setFilterProveedor(e.target.value)}>
              <option value="">Proveedor: Todos</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.nombre_empresa}</option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <button className="inv-clear-pill" onClick={clearFilters} title="Limpiar filtros">
              <FaTimes />
            </button>
          )}
        </div>

        <div className="header-actions" style={{ flexShrink: 0, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Categorías */}
          <button className="v-btn-ghost" onClick={() => setIsCategoriasModalOpen(true)} title="Gestionar categorías">
            <FaTags /> Categorías
          </button>

          {/* Subcategorías */}
          <button className="v-btn-ghost" onClick={() => setIsSubcategoriasModalOpen(true)} title="Gestionar subcategorías">
            <FaSitemap /> Subcategorías
          </button>

          {/* Exportar */}
          {usuario?.role === 'administrador' && (
            <button className="v-btn-ghost" onClick={exportReferencias} title="Exportar a Excel">
              <FaFileExport /> Exportar
            </button>
          )}

          {/* Nueva Referencia */}
          <button className="v-btn-primary-glow" onClick={() => handleOpenModal()}>
            <FaPlus /> Nueva Referencia
          </button>
        </div>
      </div>

      <div className="ordenes-container">
        <div className="desktop-view">
          <table className="premium-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => requestSort('nombre')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>Nombre {getSortIcon('nombre')}</div>
                </th>
                <th className="sortable" onClick={() => requestSort('proveedor_name')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>Proveedor {getSortIcon('proveedor_name')}</div>
                </th>
                <th className="sortable" onClick={() => requestSort('categoria_nombre')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>Categoría {getSortIcon('categoria_nombre')}</div>
                </th>
                <th className="sortable" onClick={() => requestSort('subcategoria_nombre')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>Subcategoría {getSortIcon('subcategoria_nombre')}</div>
                </th>
                <th style={{ width: 80, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading || contextLoading || isLoadingProveedores ? (
                <tr><td colSpan="5"><div className="loading-container"><div className="loader" /></div></td></tr>
              ) : isError ? (
                <tr><td colSpan="5" className="error-cell">Error al cargar datos.</td></tr>
              ) : sortedReferencias.length > 0 ? (
                sortedReferencias.map((ref) => (
                  <tr key={ref.id}>
                    <td><span className="product-name">{ref.nombre}</span></td>
                    <td><span>{ref.proveedor_name}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {ref.categorias_nombres && ref.categorias_nombres.length > 0 ? (
                          ref.categorias_nombres.map((cName, idx) => (
                            <span key={idx} className="categoria-badge">{cName}</span>
                          ))
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {ref.subcategorias_nombres && ref.subcategorias_nombres.length > 0 ? (
                          ref.subcategorias_nombres.map((sName, idx) => (
                            <span key={idx} className="subcategoria-badge">{sName}</span>
                          ))
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenModal(ref)}
                        className="action-btn"
                        title="Editar referencia"
                        disabled={mutation.isLoading}
                        style={{ margin: '0 auto', color: '#1e3a8a', padding: '0.45rem' }}
                      >
                        <FaEdit size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="empty-cell">No hay referencias disponibles.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReferenciaModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        proveedores={proveedores}
        referencia={editingReferencia}
        isLoading={mutation.isLoading}
        categorias={categorias}
        subcategorias={subcategorias}
      />

      <CategoriasModal
        isOpen={isCategoriasModalOpen}
        onClose={() => setIsCategoriasModalOpen(false)}
      />

      <SubcategoriasModal
        isOpen={isSubcategoriasModalOpen}
        onClose={() => setIsSubcategoriasModalOpen(false)}
        categorias={categorias}
      />
    </div>
  );
}

export default ReferenciasPage;