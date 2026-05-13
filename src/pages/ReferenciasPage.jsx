import React, { useState, useContext, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../services/api";
import "./ReferenciasPage.css";
import { FaEdit, FaPlus, FaSort, FaSortUp, FaSortDown, FaFileExport, FaTags, FaTrash, FaSitemap } from "react-icons/fa";
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
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: 480 }}>
        <InlineNotif {...notif} />
        <div className="modal-header">
          <h3><FaTags style={{ marginRight: 8, color: '#475569' }} />Gestionar Categorías</h3>
          <button className="modal-close" onClick={onClose}>×</button>
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
          <button type="submit" className="btn-primary" disabled={createMutation.isLoading} style={{ whiteSpace: 'nowrap' }}>
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

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
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
  const token = localStorage.getItem("accessToken");
  const queryClient = useQueryClient();

  // Auto-dismiss notification
  useEffect(() => {
    if (notif.message) {
      const t = setTimeout(() => setNotif({ message: '', type: '' }), 3500);
      return () => clearTimeout(t);
    }
  }, [notif.message]);

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
      setNombre('');
      setCategoriaId('');
      setNotif({ message: 'Subcategoría creada exitosamente.', type: 'success' });
    },
    onError: (err) => {
      const msg = err.response?.data?.nombre?.[0] || err.response?.data?.detail || 'Error al crear la subcategoría.';
      setNotif({ message: msg, type: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => API.delete(`/suministros/subcategorias/${id}/`, { headers: { Authorization: `Bearer ${token}` } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suministros-subcategorias'] });
      queryClient.invalidateQueries({ queryKey: ['referencias'] });
      setNotif({ message: 'Subcategoría eliminada.', type: 'success' });
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
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
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
          <button className="subcat-modal__close" onClick={onClose} title="Cerrar">×</button>
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
            <p className="subcat-section__label">Nueva subcategoría</p>
            <form
              className="subcat-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!nombre.trim() || !categoriaId) return;
                createMutation.mutate({ nombre: nombre.trim(), categoria: categoriaId });
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
              <button
                type="submit"
                className="subcat-form__submit"
                disabled={createMutation.isLoading}
              >
                <FaPlus style={{ marginRight: 6 }} />
                {createMutation.isLoading ? 'Agregando...' : 'Agregar Subcategoría'}
              </button>
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
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar la subcategoría "${sub.nombre}"?`))
                            deleteMutation.mutate(sub.id);
                        }}
                        className="delete-btn"
                        title="Eliminar subcategoría"
                        disabled={deleteMutation.isLoading}
                      >
                        <FaTrash size={12} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="subcat-modal__footer">
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
};

// ─── Referencia Modal (crear / editar) ───────────────────────────────────────
const ReferenciaModal = ({ isOpen, onClose, onSave, proveedores, referencia, isLoading, categorias, subcategorias }) => {
  const [nombre, setNombre] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [subcategoriaId, setSubcategoriaId] = useState('');

  useEffect(() => {
    if (referencia) {
      setNombre(referencia.nombre || '');
      setProveedorId(referencia.proveedor || '');
      setCategoriaId(referencia.categoria ?? '');
      setSubcategoriaId(referencia.subcategoria ?? '');
    } else {
      setNombre('');
      setProveedorId('');
      setCategoriaId('');
      setSubcategoriaId('');
    }
  }, [referencia, isOpen]);

  // When category changes, reset subcategory if it doesn't belong to the new category
  const handleCategoriaChange = (e) => {
    const newCatId = e.target.value;
    setCategoriaId(newCatId);
    const sub = subcategorias.find(s => String(s.id) === String(subcategoriaId));
    if (!sub || String(sub.categoria) !== String(newCatId)) {
      setSubcategoriaId('');
    }
  };

  // Subcategorias filtered by selected category
  const filteredSubcategorias = subcategorias.filter(
    (s) => categoriaId && String(s.categoria) === String(categoriaId)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: referencia?.id,
      nombre,
      proveedor: proveedorId,
      categoria: categoriaId !== '' ? categoriaId : null,
      subcategoria: subcategoriaId !== '' ? subcategoriaId : null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3>{referencia ? 'Editar Referencia' : 'Nueva Referencia'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
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
            <label>Categoría <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
            <select value={categoriaId} onChange={handleCategoriaChange}>
              <option value="">Sin categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Subcategoría <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
            <select
              value={subcategoriaId}
              onChange={(e) => setSubcategoriaId(e.target.value)}
              disabled={!categoriaId || filteredSubcategorias.length === 0}
            >
              <option value="">
                {!categoriaId
                  ? 'Seleccione primero una categoría'
                  : filteredSubcategorias.length === 0
                  ? 'Sin subcategorías disponibles'
                  : 'Sin subcategoría'}
              </option>
              {filteredSubcategorias.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.nombre}</option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
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

  const sortedReferencias = useMemo(() => {
    let sortableItems = [...referencias];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const valA = (a[sortConfig.key] ?? '').toString().toLowerCase();
        const valB = (b[sortConfig.key] ?? '').toString().toLowerCase();
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [referencias, sortConfig]);

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
      'Categoría': ref.categoria_nombre || '—',
      'Subcategoría': ref.subcategoria_nombre || '—',
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
      <div className="page-header">
        <div className="header-title-group">
          <h2 className="page-title">Catálogo de Referencias</h2>
          <span className="page-subtitle">{sortedReferencias.length} referencias registradas</span>
        </div>
        <div className="actions-group">
          {/* Categorías */}
          <button className="btn-secondary" onClick={() => setIsCategoriasModalOpen(true)} title="Gestionar categorías">
            <FaTags /> Categorías
          </button>

          {/* Subcategorías */}
          <button className="btn-secondary" onClick={() => setIsSubcategoriasModalOpen(true)} title="Gestionar subcategorías">
            <FaSitemap /> Subcategorías
          </button>

          {/* Exportar */}
          {usuario?.role === 'administrador' && (
            <button className="btn-secondary" onClick={exportReferencias}>
              <FaFileExport /> Exportar
            </button>
          )}

          {/* Nueva Referencia */}
          <button className="btn-primary" onClick={() => handleOpenModal()}>
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
                      {ref.categoria_nombre
                        ? <span className="categoria-badge">{ref.categoria_nombre}</span>
                        : <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>
                      }
                    </td>
                    <td>
                      {ref.subcategoria_nombre
                        ? <span className="subcategoria-badge">{ref.subcategoria_nombre}</span>
                        : <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>—</span>
                      }
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