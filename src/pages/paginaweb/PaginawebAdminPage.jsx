import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  FaPlus, FaEdit, FaTrashAlt, FaUpload, FaSave, FaTimes, FaGlobe,
  FaBoxes, FaCheckCircle, FaStar as FaStarSolid, FaImage, FaSearch,
  FaUserTie, FaWhatsapp, FaExclamationTriangle, FaExternalLinkAlt,
  FaArrowUp, FaArrowDown, FaGripVertical, FaSpinner, FaPlay,
} from 'react-icons/fa';
import {
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  uploadPaginawebImage,
} from '../../services/paginawebService';
import {
  getAdminAsesores,
  createAdminAsesor,
  updateAdminAsesor,
  deleteAdminAsesor,
  uploadAsesorFoto,
} from '../../services/asesoresService';
import { getAdminPqrs } from '../../services/pqrsService';
import PqrsPanel from './PqrsPanel';
import { getMediaUrl } from '../../apiConfig';
import { AppContext, usePermissions } from '../../AppContext';
import { PageHeader, Button, Badge, Modal, StatCard, Skeleton, Tabs } from '../../components/ui';
import EditorTextoFormato from '../../components/EditorTextoFormato';
import './Paginaweb.css';
import './Asesores.css';

const ASESOR_EMPTY_FORM = { nombre: '', cargo: 'Asesor Comercial', whatsapp: '', bioCorta: '', foto: '', orden: 0 };
const WHATSAPP_RE = /^\d{10,15}$/;

function asesorInitials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm)$/i;
function isVideoUrl(url) {
  return VIDEO_EXTENSIONS.test((url || '').split('?')[0]);
}

function getErrorMessage(err, fallback) {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;
  const firstKey = Object.keys(data)[0];
  if (firstKey && Array.isArray(data[firstKey]) && data[firstKey][0]) return data[firstKey][0];
  return fallback;
}

function PaginawebAdminPage() {
  const { notify } = useContext(AppContext);
  const hasPermission = usePermissions();
  const canCrearProducto = hasPermission('CREAR_PRODUCTO_WEB');
  const canEditarProducto = hasPermission('EDITAR_PRODUCTO_WEB');
  const canEliminarProducto = hasPermission('ELIMINAR_PRODUCTO_WEB');
  const canAdministrarAsesores = hasPermission('ADMINISTRAR_ASESORES_WEB');
  const canVerPqrs = hasPermission('RESPONDER_PQRS');
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [asesores, setAsesores] = useState([]);
  const [pqrs, setPqrs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Estado (Productos)
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'sofas',
    badge: '',
    shortDescription: '',
    description: '',
    characteristics: '',
    materials: '',
    featured: false,
    active: true,
    images: [],
  });

  // Modal Estado (Paleta de Vendedores)
  const [showAsesorModal, setShowAsesorModal] = useState(false);
  const [editingAsesor, setEditingAsesor] = useState(null);
  const [asesorFormData, setAsesorFormData] = useState(ASESOR_EMPTY_FORM);
  const [uploadingAsesorFoto, setUploadingAsesorFoto] = useState(false);
  const [savingAsesor, setSavingAsesor] = useState(false);
  const [pendingToggleIds, setPendingToggleIds] = useState(() => new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Promise.allSettled en vez de Promise.all: si el backend de PQRS
      // todavía no está desplegado (endpoint nuevo), esa sección debe
      // quedar vacía sin tumbar Productos ni Asesores, que sí funcionan.
      // Asesores y PQRS solo se piden si el rol tiene el permiso — si no,
      // el backend los rechaza con 403 y ni siquiera deberían llegar a
      // pedirse (esas pestañas ya están ocultas para este rol).
      const [prodsResult, asesoresResult, pqrsResult] = await Promise.allSettled([
        getAdminProducts(),
        canAdministrarAsesores ? getAdminAsesores() : Promise.resolve({ results: [] }),
        canVerPqrs ? getAdminPqrs() : Promise.resolve({ results: [] }),
      ]);

      if (prodsResult.status === 'fulfilled') {
        setProducts(prodsResult.value.results || prodsResult.value || []);
      } else {
        console.error('Error cargando productos web:', prodsResult.reason);
      }

      if (asesoresResult.status === 'fulfilled') {
        setAsesores(asesoresResult.value.results || asesoresResult.value || []);
      } else {
        console.error('Error cargando asesores:', asesoresResult.reason);
      }

      if (pqrsResult.status === 'fulfilled') {
        setPqrs(pqrsResult.value.results || pqrsResult.value || []);
      } else {
        console.error('Error cargando PQRS:', pqrsResult.reason);
      }

      const failedCount = [prodsResult, asesoresResult, pqrsResult].filter((r) => r.status === 'rejected').length;
      if (failedCount > 0) {
        notify('Algunas secciones de la página web no se pudieron cargar', 'error');
      }
    } catch (err) {
      console.error('Error cargando gestión web:', err);
      notify('Error al cargar los datos de la web', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term) ||
        p.badge?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.active !== false).length;
    const featured = products.filter((p) => p.featured).length;
    return { total, active, featured };
  }, [products]);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'sofas',
      badge: '',
      shortDescription: '',
      description: '',
      characteristics: '',
      materials: '',
      featured: false,
      active: true,
      images: [],
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name || '',
      category: p.category || 'sofas',
      badge: p.badge || '',
      shortDescription: p.shortDescription || p.short_description || '',
      description: p.description || '',
      characteristics: p.characteristics || '',
      materials: p.materials || '',
      featured: Boolean(p.featured),
      active: p.active !== false,
      images: p.images || [],
    });
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadData = new FormData();
      for (let i = 0; i < files.length; i++) {
        uploadData.append('images', files[i]);
      }
      const res = await uploadPaginawebImage(uploadData);
      if (res.urls) {
        setFormData((prev) => ({ ...prev, images: [...prev.images, ...res.urls] }));
        notify('Imágenes subidas correctamente', 'success');
      }
    } catch (err) {
      console.error('Error subiendo imagen:', err);
      notify(err.response?.data?.error || 'Error al subir la imagen', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleMoveImage = (index, direction) => {
    setFormData((prev) => {
      const imgs = [...prev.images];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= imgs.length) return prev;
      [imgs[index], imgs[targetIndex]] = [imgs[targetIndex], imgs[index]];
      return { ...prev, images: imgs };
    });
  };

  const handleDragStart = (index) => setDragIndex(index);
  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setFormData((prev) => {
      const imgs = [...prev.images];
      const [moved] = imgs.splice(dragIndex, 1);
      imgs.splice(dropIndex, 0, moved);
      return { ...prev, images: imgs };
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleSaveProduct = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      notify('El nombre del producto es obligatorio', 'warning');
      return;
    }

    try {
      // Sin precio por ahora (2026-10-08): ni se envía ni se muestra.
      const payload = { ...formData };

      if (editingProduct) {
        await updateAdminProduct(editingProduct.id, payload);
        notify('Producto actualizado exitosamente', 'success');
      } else {
        await createAdminProduct(payload);
        notify('Producto creado exitosamente', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error('Error guardando producto:', err);
      notify('Error al guardar el producto', 'error');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto del catálogo web?')) return;
    try {
      await deleteAdminProduct(id);
      notify('Producto eliminado', 'info');
      loadData();
    } catch (err) {
      console.error('Error eliminando producto:', err);
      notify('Error al eliminar producto', 'error');
    }
  };

  // ---------- Paleta de Vendedores ----------
  const filteredAsesores = useMemo(() => {
    if (!searchTerm.trim() || activeTab !== 'asesores') return asesores;
    const term = searchTerm.toLowerCase();
    return asesores.filter(
      (a) =>
        a.nombre?.toLowerCase().includes(term) ||
        a.cargo?.toLowerCase().includes(term)
    );
  }, [asesores, searchTerm, activeTab]);

  const asesorStats = useMemo(() => {
    const total = asesores.length;
    const visibles = asesores.filter((a) => a.activo).length;
    const sinWhatsapp = asesores.filter((a) => !a.whatsapp).length;
    return { total, visibles, sinWhatsapp };
  }, [asesores]);

  const setAsesorTogglePending = (id, isPending) => {
    setPendingToggleIds((prev) => {
      const next = new Set(prev);
      if (isPending) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleAsesorActivo = async (a) => {
    const nextActivo = !a.activo;
    if (nextActivo && !a.whatsapp) {
      notify('Agrega un número de WhatsApp antes de publicar esta tarjeta', 'warning');
      handleOpenEditAsesorModal(a);
      return;
    }
    setAsesorTogglePending(a.id, true);
    try {
      const updated = await updateAdminAsesor(a.id, { activo: nextActivo });
      setAsesores((prev) => prev.map((x) => (x.id === a.id ? { ...x, ...updated } : x)));
      setEditingAsesor((prev) => (prev && prev.id === a.id ? { ...prev, ...updated } : prev));
      notify(nextActivo ? 'Tarjeta publicada en la página web' : 'Tarjeta ocultada de la página web', 'success');
    } catch (err) {
      console.error('Error actualizando visibilidad del asesor:', err);
      notify(getErrorMessage(err, 'Error al actualizar la visibilidad'), 'error');
    } finally {
      setAsesorTogglePending(a.id, false);
    }
  };

  const handleOpenCreateAsesorModal = () => {
    setEditingAsesor(null);
    setAsesorFormData(ASESOR_EMPTY_FORM);
    setShowAsesorModal(true);
  };

  const handleOpenEditAsesorModal = (a) => {
    setEditingAsesor(a);
    setAsesorFormData({
      nombre: a.nombre || '',
      cargo: a.cargo || 'Asesor Comercial',
      whatsapp: a.whatsapp || '',
      bioCorta: a.bioCorta || a.bio_corta || '',
      foto: a.foto || '',
      orden: a.orden ?? 0,
    });
    setShowAsesorModal(true);
  };

  const handleCloseAsesorModal = () => {
    setShowAsesorModal(false);
    setEditingAsesor(null);
    setAsesorFormData(ASESOR_EMPTY_FORM);
  };

  const handleAsesorFotoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      notify('Solo se permiten imágenes JPG, PNG o WebP', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('La imagen supera el máximo de 5 MB', 'warning');
      return;
    }
    setUploadingAsesorFoto(true);
    try {
      const fd = new FormData();
      fd.append('foto', file);
      const res = await uploadAsesorFoto(fd);
      if (res.ok) {
        setAsesorFormData((prev) => ({ ...prev, foto: res.url }));
        notify('Foto subida correctamente', 'success');
      }
    } catch (err) {
      console.error('Error subiendo foto de asesor:', err);
      notify(getErrorMessage(err, 'Error al subir la foto'), 'error');
    } finally {
      setUploadingAsesorFoto(false);
    }
  };

  const handleSaveAsesor = async (e) => {
    if (e) e.preventDefault();
    if (!asesorFormData.nombre.trim()) {
      notify('El nombre del asesor es obligatorio', 'warning');
      return;
    }
    const whatsapp = asesorFormData.whatsapp.trim();
    if (whatsapp && !WHATSAPP_RE.test(whatsapp)) {
      notify('El WhatsApp debe contener solo dígitos con indicativo de país (10 a 15 dígitos), ej: 573001234567', 'warning');
      return;
    }

    setSavingAsesor(true);
    try {
      const payload = {
        nombre: asesorFormData.nombre.trim(),
        cargo: asesorFormData.cargo.trim() || 'Asesor Comercial',
        whatsapp,
        bioCorta: asesorFormData.bioCorta.trim(),
        foto: asesorFormData.foto,
        orden: Number(asesorFormData.orden) || 0,
      };

      if (editingAsesor) {
        await updateAdminAsesor(editingAsesor.id, payload);
        notify('Tarjeta de asesor actualizada exitosamente', 'success');
      } else {
        await createAdminAsesor(payload);
        notify('Asesor creado exitosamente', 'success');
      }
      handleCloseAsesorModal();
      loadData();
    } catch (err) {
      console.error('Error guardando asesor:', err);
      notify(getErrorMessage(err, 'Error al guardar la tarjeta'), 'error');
    } finally {
      setSavingAsesor(false);
    }
  };

  const handleDeleteAsesor = async (a) => {
    if (!window.confirm(`¿Eliminar la tarjeta de "${a.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteAdminAsesor(a.id);
      notify('Asesor eliminado', 'info');
      setAsesores((prev) => prev.filter((x) => x.id !== a.id));
    } catch (err) {
      console.error('Error eliminando asesor:', err);
      notify(getErrorMessage(err, 'Error al eliminar el asesor'), 'error');
    }
  };

  return (
    <div className="pw-page-container ds-fade-in">
      {/* Header Estándar de la Plataforma */}
      <PageHeader
        icon={FaGlobe}
        title="Gestión de la Página Web"
        subtitle="Administra los productos, imágenes, banners y configuraciones para la tienda pública de LOTTUS"
        actions={
          <>
            {activeTab === 'products' && canCrearProducto && (
              <Button variant="primary" icon={FaPlus} onClick={handleOpenCreateModal}>
                Nuevo Producto Web
              </Button>
            )}
            {activeTab === 'asesores' && canAdministrarAsesores && (
              <Button variant="primary" icon={FaPlus} onClick={handleOpenCreateAsesorModal}>
                Nuevo Asesor
              </Button>
            )}
          </>
        }
      />

      {/* Métricas / StatCards */}
      {activeTab === 'products' && (
        <div className="pw-stats-row">
          <StatCard
            icon={FaBoxes}
            label="TOTAL PRODUCTOS WEB"
            value={stats.total}
            hint="En catálogo público"
          />
          <StatCard
            icon={FaCheckCircle}
            tone="success"
            label="PRODUCTOS ACTIVOS"
            value={stats.active}
            hint="Visibles en la web"
          />
          <StatCard
            icon={FaStarSolid}
            tone="accent"
            label="DESTACADOS"
            value={stats.featured}
            hint="Sección principal"
          />
        </div>
      )}

      {activeTab === 'asesores' && (
        <div className="pw-stats-row">
          <StatCard
            icon={FaUserTie}
            label="TOTAL ASESORES"
            value={asesorStats.total}
            hint="En la paleta de vendedores"
          />
          <StatCard
            icon={FaCheckCircle}
            tone="success"
            label="TARJETAS PUBLICADAS"
            value={asesorStats.visibles}
            hint="Visibles en la web"
          />
          <StatCard
            icon={FaExclamationTriangle}
            tone="warning"
            label="SIN WHATSAPP"
            value={asesorStats.sinWhatsapp}
            hint="No se pueden publicar aún"
          />
        </div>
      )}

      {/* Tabs Bar */}
      <div className="pw-tabs-bar">
        <Tabs
          tabs={[
            { id: 'products', label: `Productos Web (${products.length})` },
            ...(canAdministrarAsesores ? [{ id: 'asesores', label: `Paleta de Vendedores (${asesores.length})` }] : []),
            ...(canVerPqrs ? [{ id: 'pqrs', label: `PQRS (${pqrs.length})` }] : []),
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* PESTAÑA PRODUCTOS */}
      {activeTab === 'products' && (
        <div className="pw-main-card">
          <div className="pw-tools-bar">
            <div className="pw-search-input-wrapper">
              <FaSearch className="pw-search-icon" />
              <input
                type="text"
                placeholder="Buscar producto por nombre, categoría o etiqueta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pw-search-input-field"
              />
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Skeleton height="45px" />
              <Skeleton height="45px" />
              <Skeleton height="45px" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="pw-empty-state-panel">
              <p>No se encontraron productos registrados en el catálogo web.</p>
              {canCrearProducto && (
                <div style={{ marginTop: '1rem' }}>
                  <Button variant="primary" icon={FaPlus} onClick={handleOpenCreateModal}>
                    Crear Producto
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="pw-table-container">
              <table className="pw-native-table">
                <thead>
                  <tr>
                    <th>Imagen</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Etiqueta</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.images && p.images.length > 0 ? (
                          isVideoUrl(p.images[0]) ? (
                            <video src={getMediaUrl(p.images[0])} muted playsInline preload="metadata" className="pw-table-thumb" />
                          ) : (
                            <img src={getMediaUrl(p.images[0])} alt={p.name} className="pw-table-thumb" />
                          )
                        ) : (
                          <div className="pw-table-noimage"><FaImage /></div>
                        )}
                      </td>
                      <td>
                        <div className="pw-product-title-row">
                          <span className="pw-product-name">{p.name}</span>
                          {p.featured && <Badge tone="accent">Destacado</Badge>}
                        </div>
                      </td>
                      <td>
                        <Badge tone="info">{p.category?.toUpperCase()}</Badge>
                      </td>
                      <td>{p.badge ? <Badge tone="neutral">{p.badge}</Badge> : '-'}</td>
                      <td>
                        <Badge tone={p.active !== false ? 'success' : 'neutral'}>
                          {p.active !== false ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="pw-table-actions">
                          {canEditarProducto && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={FaEdit}
                              onClick={() => handleOpenEditModal(p)}
                              title="Editar"
                            />
                          )}
                          {canEliminarProducto && (
                            <Button
                              variant="danger-soft"
                              size="sm"
                              icon={FaTrashAlt}
                              onClick={() => handleDeleteProduct(p.id)}
                              title="Eliminar"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA PALETA DE VENDEDORES */}
      {activeTab === 'asesores' && canAdministrarAsesores && (
        <div className="pw-main-card">
          <div className="pw-tools-bar">
            <div className="pw-search-input-wrapper">
              <FaSearch className="pw-search-icon" />
              <input
                type="text"
                placeholder="Buscar asesor por nombre o cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pw-search-input-field"
              />
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Skeleton height="45px" />
              <Skeleton height="45px" />
              <Skeleton height="45px" />
            </div>
          ) : filteredAsesores.length === 0 ? (
            <div className="pw-empty-state-panel">
              <p>No hay asesores registrados en la paleta de vendedores.</p>
              {canAdministrarAsesores && (
                <div style={{ marginTop: '1rem' }}>
                  <Button variant="primary" icon={FaPlus} onClick={handleOpenCreateAsesorModal}>
                    Crear Asesor
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="pw-table-container">
              <table className="pw-native-table">
                <thead>
                  <tr>
                    <th>Asesor</th>
                    <th>Cargo</th>
                    <th>WhatsApp</th>
                    <th>Visible en la web</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAsesores.map((a) => {
                    const isPending = pendingToggleIds.has(a.id);
                    return (
                      <tr key={a.id}>
                        <td>
                          <div className="pw-product-title-row">
                            {a.foto ? (
                              <img src={getMediaUrl(a.foto)} alt={a.nombre} className="pw-avatar-thumb" />
                            ) : (
                              <div className="pw-avatar-noimage">{asesorInitials(a.nombre)}</div>
                            )}
                            <span className="pw-product-name">{a.nombre}</span>
                          </div>
                        </td>
                        <td>{a.cargo || '-'}</td>
                        <td>
                          {a.whatsapp ? (
                            <span className="pw-whatsapp-cell">
                              <FaWhatsapp color="var(--success, #4c7a4f)" /> {a.whatsapp}
                            </span>
                          ) : (
                            <span className="pw-whatsapp-missing">Sin configurar</span>
                          )}
                        </td>
                        <td>
                          <label className="pw-switch" title={a.activo ? 'Ocultar de la web' : 'Publicar en la web'}>
                            <input
                              type="checkbox"
                              checked={!!a.activo}
                              disabled={isPending || !canAdministrarAsesores}
                              onChange={() => handleToggleAsesorActivo(a)}
                            />
                            <span className="pw-slider" />
                          </label>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="pw-table-actions" style={{ alignItems: 'center' }}>
                            {a.activo && a.slug && (
                              <a
                                href={a.profileUrl || `/asesor/${a.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pw-profile-link"
                                title="Ver tarjeta pública"
                              >
                                <FaExternalLinkAlt />
                              </a>
                            )}
                            {canAdministrarAsesores && (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon={FaEdit}
                                  onClick={() => handleOpenEditAsesorModal(a)}
                                  title="Editar"
                                />
                                <Button
                                  variant="danger-soft"
                                  size="sm"
                                  icon={FaTrashAlt}
                                  onClick={() => handleDeleteAsesor(a)}
                                  title="Eliminar"
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA PQRS */}
      {activeTab === 'pqrs' && canVerPqrs && (
        <PqrsPanel pqrs={pqrs} loading={loading} notify={notify} onRefresh={loadData} canResponder={canVerPqrs} />
      )}

      {/* MODAL CREAR / EDITAR ASESOR */}
      <Modal
        open={showAsesorModal}
        onClose={handleCloseAsesorModal}
        title={editingAsesor ? `Editar Asesor · ${editingAsesor.nombre}` : 'Nuevo Asesor'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseAsesorModal}>
              Cancelar
            </Button>
            <Button variant="primary" icon={FaSave} onClick={handleSaveAsesor} loading={savingAsesor}>
              {editingAsesor ? 'Guardar Cambios' : 'Crear Asesor'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveAsesor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {editingAsesor && (
            <div className="pw-modal-toggle-row">
              <label className="pw-switch">
                <input
                  type="checkbox"
                  checked={!!editingAsesor.activo}
                  disabled={pendingToggleIds.has(editingAsesor.id) || !canAdministrarAsesores}
                  onChange={() => handleToggleAsesorActivo(editingAsesor)}
                />
                <span className="pw-slider" />
              </label>
              <div className="pw-modal-toggle-text">
                <span className="pw-modal-toggle-title">
                  {editingAsesor.activo ? 'Tarjeta publicada' : 'Tarjeta oculta'}
                </span>
                <span className="pw-modal-toggle-sub">
                  {editingAsesor.activo
                    ? 'Visible ahora mismo en la página web de LOTTUS'
                    : 'No aparece en la página web todavía'}
                </span>
              </div>
            </div>
          )}

          <div className="pw-modal-section">
            <h4 className="pw-form-sub-header">Foto de perfil</h4>
            <div className="pw-photo-upload-row">
              <div className="pw-photo-preview">
                {asesorFormData.foto ? (
                  <img src={getMediaUrl(asesorFormData.foto)} alt="" />
                ) : (
                  asesorInitials(asesorFormData.nombre)
                )}
              </div>
              <div className="pw-photo-upload-actions">
                <input
                  type="file"
                  id="asesor-foto-file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAsesorFotoUpload}
                  style={{ display: 'none' }}
                />
                <label htmlFor="asesor-foto-file" className="ds-btn ds-btn--secondary">
                  <FaUpload /> {uploadingAsesorFoto ? 'Subiendo...' : 'Subir foto'}
                </label>
                <span className="pw-field-hint">JPG, PNG o WebP · máx. 5 MB</span>
              </div>
            </div>
          </div>

          <div className="pw-modal-section">
            <h4 className="pw-form-sub-header">Datos de la tarjeta</h4>
            <div className="ds-field">
              <label className="ds-label">Nombre completo *</label>
              <input
                type="text"
                required
                className="ds-input"
                placeholder="e.g. María Fernanda Ríos"
                value={asesorFormData.nombre}
                onChange={(e) => setAsesorFormData({ ...asesorFormData, nombre: e.target.value })}
              />
            </div>
            <div className="pw-form-grid-2">
              <div className="ds-field">
                <label className="ds-label">Cargo</label>
                <input
                  type="text"
                  className="ds-input"
                  placeholder="Asesor Comercial"
                  value={asesorFormData.cargo}
                  onChange={(e) => setAsesorFormData({ ...asesorFormData, cargo: e.target.value })}
                />
              </div>
              <div className="ds-field">
                <label className="ds-label">WhatsApp</label>
                <input
                  type="text"
                  className="ds-input"
                  placeholder="573001234567"
                  inputMode="numeric"
                  value={asesorFormData.whatsapp}
                  onChange={(e) => setAsesorFormData({ ...asesorFormData, whatsapp: e.target.value.replace(/[^\d]/g, '') })}
                />
                <span className="pw-field-hint">Solo números con indicativo de país, ej: 573001234567</span>
              </div>
            </div>

            <div className="ds-field">
              <label className="ds-label">Bio corta</label>
              <textarea
                className="ds-textarea"
                rows={3}
                maxLength={280}
                placeholder="Te ayudo a encontrar el mueble perfecto para tu hogar."
                value={asesorFormData.bioCorta}
                onChange={(e) => setAsesorFormData({ ...asesorFormData, bioCorta: e.target.value })}
              />
              <span className="pw-char-counter">{asesorFormData.bioCorta.length}/280</span>
            </div>

            <div className="ds-field" style={{ maxWidth: '160px' }}>
              <label className="ds-label">Orden de aparición</label>
              <input
                type="number"
                className="ds-input"
                min="0"
                value={asesorFormData.orden}
                onChange={(e) => setAsesorFormData({ ...asesorFormData, orden: e.target.value })}
              />
              <span className="pw-field-hint">Menor número aparece primero</span>
            </div>
          </div>
        </form>
      </Modal>

      {/* MODAL NATIVO CREAR / EDITAR PRODUCTO */}
      <Modal
        open={showModal}
        onClose={() => !uploading && setShowModal(false)}
        title={editingProduct ? 'Editar Producto Web' : 'Nuevo Producto Web'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              icon={uploading ? FaSpinner : FaSave}
              onClick={handleSaveProduct}
              disabled={uploading}
              loading={uploading}
            >
              {uploading ? 'Subiendo imágenes…' : editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </>
        }
      >
        <form id="pw-prod-form" onSubmit={handleSaveProduct} className="pw-prod-form-layout">

          {/* COLUMNA IZQUIERDA */}
          <div className="pw-prod-col">

            {/* Información Principal */}
            <div className="pw-modal-section pw-modal-section--compact">
              <h4 className="pw-form-sub-header">Información Principal</h4>
              <div className="ds-field">
                <label className="ds-label">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  className="ds-input ds-input--sm"
                  placeholder="e.g. Sofá Cama Chester"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="ds-field">
                <label className="ds-label">Categoría</label>
                <select
                  className="ds-select ds-input--sm"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="sofas">Sofás & Módulos</option>
                  <option value="mesas">Mesas & Comedores</option>
                  <option value="camas">Camas & Cabeceros</option>
                  <option value="poltronas">Poltronas & Sillas</option>
                  <option value="accesorios">Complementos</option>
                  <option value="sora">Colección Sora</option>
                </select>
              </div>
            </div>

            {/* Clasificación */}
            <div className="pw-modal-section pw-modal-section--compact">
              <h4 className="pw-form-sub-header">Clasificación</h4>
              <div className="ds-field">
                <label className="ds-label">Etiqueta / Badge</label>
                <input
                  type="text"
                  className="ds-input ds-input--sm"
                  placeholder="e.g. Nuevo, Oferta, Sora"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                />
              </div>
            </div>


          </div>{/* fin columna izquierda */}

          {/* COLUMNA DERECHA */}
          <div className="pw-prod-col">

            {/* Galería de Imágenes */}
            <div className="pw-modal-section pw-modal-section--compact pw-gallery-section">
              <div className="pw-gallery-header">
                <h4 className="pw-form-sub-header">Galería de Imágenes Web</h4>
                <span className="pw-gallery-hint">Arrastra para reordenar · 1ª = Portada</span>
              </div>

              {/* Zona de carga */}
              <div className="pw-upload-dropzone">
                <input
                  type="file"
                  id="pw-img-native-file"
                  multiple
                  accept="image/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.cr2,.cr3,.nef,.nrw,.arw,.srf,.sr2,.raf,.rw2,.orf,.dng,.pef,.srw,.raw,.kdc,.mrw,.x3f,.3fr,.erf,.mef,.mos,.ptx,.rwl,.iiq"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
                <label
                  htmlFor="pw-img-native-file"
                  className={`pw-upload-dropzone-label${uploading ? ' pw-upload-dropzone-label--loading' : ''}`}
                >
                  {uploading ? (
                    <><FaSpinner className="pw-spin" /> Subiendo…</>
                  ) : (
                    <><FaUpload /> Subir fotos o videos<span className="pw-dropzone-sub">o arrastra aquí · JPG, PNG, WEBP, MP4, MOV, WEBM (video hasta 100 MB)</span></>
                  )}
                </label>
              </div>

              {/* Grid de thumbnails */}
              {formData.images.length > 0 ? (
                <div className="pw-img-gallery-grid">
                  {formData.images.map((img, idx) => (
                    <div
                      key={img + idx}
                      className={[
                        'pw-img-thumb-item',
                        dragIndex === idx ? 'pw-img-thumb-item--dragging' : '',
                        dragOverIndex === idx && dragIndex !== idx ? 'pw-img-thumb-item--dragover' : '',
                        idx === 0 ? 'pw-img-thumb-item--cover' : '',
                      ].join(' ')}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="pw-img-thumb-handle" title="Arrastra para mover">
                        <FaGripVertical />
                      </div>
                      {isVideoUrl(img) ? (
                        <video src={getMediaUrl(img)} muted playsInline preload="metadata" />
                      ) : (
                        <img src={getMediaUrl(img)} alt={`Imagen ${idx + 1}`} />
                      )}
                      {isVideoUrl(img) && (
                        <span className="pw-img-video-badge" title="Video"><FaPlay /></span>
                      )}
                      {idx === 0 && (
                        <span className="pw-img-cover-badge">Portada</span>
                      )}
                      <span className="pw-img-order-badge">{idx + 1}</span>
                      <div className="pw-img-thumb-controls">
                        <button
                          type="button"
                          className="pw-img-ctrl-btn"
                          onClick={() => handleMoveImage(idx, -1)}
                          disabled={idx === 0}
                          title="Mover arriba"
                        >
                          <FaArrowUp />
                        </button>
                        <button
                          type="button"
                          className="pw-img-ctrl-btn pw-img-ctrl-btn--remove"
                          onClick={() => handleRemoveImage(idx)}
                          title="Eliminar imagen"
                        >
                          <FaTimes />
                        </button>
                        <button
                          type="button"
                          className="pw-img-ctrl-btn"
                          onClick={() => handleMoveImage(idx, 1)}
                          disabled={idx === formData.images.length - 1}
                          title="Mover abajo"
                        >
                          <FaArrowDown />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pw-img-gallery-empty">
                  <FaImage />
                  <span>Sin imágenes aún</span>
                </div>
              )}
            </div>

            {/* Opciones de Publicación */}
            <div className="pw-modal-section pw-modal-section--compact">
              <h4 className="pw-form-sub-header">Publicación</h4>
              <div className="pw-toggle-list">
                <label className="pw-toggle-item">
                  <div className="pw-toggle-item-text">
                    <span className="pw-toggle-item-title">Destacado en el inicio</span>
                    <span className="pw-toggle-item-sub">Aparece en la sección principal de la web</span>
                  </div>
                  <label className="pw-switch">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    />
                    <span className="pw-slider" />
                  </label>
                </label>
                <label className="pw-toggle-item">
                  <div className="pw-toggle-item-text">
                    <span className="pw-toggle-item-title">Producto activo</span>
                    <span className="pw-toggle-item-sub">Visible públicamente en el catálogo</span>
                  </div>
                  <label className="pw-switch">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    />
                    <span className="pw-slider" />
                  </label>
                </label>
              </div>
            </div>

          </div>{/* fin columna derecha */}

          {/* FICHA DEL PRODUCTO (todo el ancho): las 4 secciones que se ven en la web */}
          <div className="pw-modal-section pw-ficha">
            <div className="pw-ficha__cabeza">
              <h4 className="pw-form-sub-header">Ficha del producto en la web</h4>
              <span className="pw-field-hint">Usa la barra para negrillas, viñetas, numeración, subtítulos y separadores. Así se verá en la página del producto.</span>
            </div>
            <EditorTextoFormato id="pw-corta" etiqueta="1. Descripción corta" filas={3}
              ayuda="Aparece debajo del nombre y como resumen en el catálogo."
              placeholder="Ej.: Sofá de 3 puestos con líneas suaves y espaldar alto, ideal para salas amplias."
              valor={formData.shortDescription} alCambiar={(v) => setFormData(f => ({ ...f, shortDescription: v }))} />
            <EditorTextoFormato id="pw-larga" etiqueta="2. Descripción larga" filas={8}
              placeholder={'Historia, diseño y confort de la pieza.\n\n**Ideal para:** salas familiares…'}
              valor={formData.description} alCambiar={(v) => setFormData(f => ({ ...f, description: v }))} />
            <div className="pw-ficha__par">
              <EditorTextoFormato id="pw-caracteristicas" etiqueta="3. Características" filas={8}
                placeholder={'- Espaldar reclinable\n- Cojines removibles\n- **Medidas:** 235 × 95 × 90 cm'}
                valor={formData.characteristics} alCambiar={(v) => setFormData(f => ({ ...f, characteristics: v }))} />
              <EditorTextoFormato id="pw-materiales" etiqueta="4. Materiales" filas={8}
                placeholder={'- **Estructura:** madera inmunizada\n- **Tapizado:** lino de alta resistencia\n- **Patas:** roble macizo'}
                valor={formData.materials} alCambiar={(v) => setFormData(f => ({ ...f, materials: v }))} />
            </div>
          </div>

        </form>
      </Modal>
    </div>
  );
}

export default PaginawebAdminPage;
