import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  FaPlus, FaEdit, FaTrashAlt, FaStar, FaUpload, FaSave, FaTimes, FaGlobe,
  FaBoxes, FaCheckCircle, FaStar as FaStarSolid, FaImage, FaSearch
} from 'react-icons/fa';
import {
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminSettings,
  saveAdminSettings,
  uploadPaginawebImage,
} from '../../services/paginawebService';
import { getMediaUrl } from '../../apiConfig';
import { NotificationContext } from '../../AppContext';
import { PageHeader, Button, Badge, Modal, StatCard, Skeleton, Tabs } from '../../components/ui';
import './Paginaweb.css';

function PaginawebAdminPage() {
  const { showNotification } = useContext(NotificationContext);
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Estado
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'sofas',
    price: 0,
    oldPrice: '',
    badge: '',
    shortDescription: '',
    description: '',
    materials: '',
    dimensions: '',
    featured: false,
    active: true,
    images: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodsData, settingsData] = await Promise.all([
        getAdminProducts(),
        getAdminSettings(),
      ]);
      setProducts(prodsData.results || prodsData || []);
      setSettings(settingsData.settings || settingsData || {});
    } catch (err) {
      console.error('Error cargando gestión web:', err);
      showNotification('Error al cargar los datos de la web', 'error');
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
      price: 0,
      oldPrice: '',
      badge: '',
      shortDescription: '',
      description: '',
      materials: '',
      dimensions: '',
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
      price: p.price || 0,
      oldPrice: p.oldPrice || p.old_price || '',
      badge: p.badge || '',
      shortDescription: p.shortDescription || p.short_description || '',
      description: p.description || '',
      materials: p.materials || '',
      dimensions: p.dimensions || '',
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
        showNotification('Imágenes subidas correctamente', 'success');
      }
    } catch (err) {
      console.error('Error subiendo imagen:', err);
      showNotification('Error al subir la imagen', 'error');
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

  const handleSaveProduct = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      showNotification('El nombre del producto es obligatorio', 'warning');
      return;
    }

    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : null,
      };

      if (editingProduct) {
        await updateAdminProduct(editingProduct.id, payload);
        showNotification('Producto actualizado exitosamente', 'success');
      } else {
        await createAdminProduct(payload);
        showNotification('Producto creado exitosamente', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error('Error guardando producto:', err);
      showNotification('Error al guardar el producto', 'error');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto del catálogo web?')) return;
    try {
      await deleteAdminProduct(id);
      showNotification('Producto eliminado', 'info');
      loadData();
    } catch (err) {
      console.error('Error eliminando producto:', err);
      showNotification('Error al eliminar producto', 'error');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await saveAdminSettings(settings);
      showNotification('Configuración del sitio guardada exitosamente', 'success');
    } catch (err) {
      console.error('Error guardando ajustes:', err);
      showNotification('Error al guardar ajustes', 'error');
    }
  };

  const formatPrice = (val) => {
    if (!val && val !== 0) return '$ 0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="pw-page-container ds-fade-in">
      {/* Header Estándar de la Plataforma */}
      <PageHeader
        icon={FaGlobe}
        title="Gestión de la Página Web"
        subtitle="Administra los productos, imágenes, banners y configuraciones para la tienda pública de LOTTUS"
        actions={
          activeTab === 'products' && (
            <Button variant="primary" icon={FaPlus} onClick={handleOpenCreateModal}>
              Nuevo Producto Web
            </Button>
          )
        }
      />

      {/* Métricas / StatCards */}
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

      {/* Tabs Bar */}
      <div className="pw-tabs-bar">
        <Tabs
          tabs={[
            { id: 'products', label: `Productos Web (${products.length})` },
            { id: 'settings', label: 'Ajustes del Sitio Web' },
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
              <div style={{ marginTop: '1rem' }}>
                <Button variant="primary" icon={FaPlus} onClick={handleOpenCreateModal}>
                  Crear Producto
                </Button>
              </div>
            </div>
          ) : (
            <div className="pw-table-container">
              <table className="pw-native-table">
                <thead>
                  <tr>
                    <th>Imagen</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Precio</th>
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
                          <img src={getMediaUrl(p.images[0])} alt={p.name} className="pw-table-thumb" />
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
                      <td>
                        <div className="pw-price-main">{formatPrice(p.price)}</div>
                        {(p.oldPrice || p.old_price) && (
                          <div className="pw-price-old">{formatPrice(p.oldPrice || p.old_price)}</div>
                        )}
                      </td>
                      <td>{p.badge ? <Badge tone="neutral">{p.badge}</Badge> : '-'}</td>
                      <td>
                        <Badge tone={p.active !== false ? 'success' : 'neutral'}>
                          {p.active !== false ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="pw-table-actions">
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={FaEdit}
                            onClick={() => handleOpenEditModal(p)}
                            title="Editar"
                          />
                          <Button
                            variant="danger-soft"
                            size="sm"
                            icon={FaTrashAlt}
                            onClick={() => handleDeleteProduct(p.id)}
                            title="Eliminar"
                          />
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

      {/* PESTAÑA AJUSTES */}
      {activeTab === 'settings' && (
        <div className="pw-main-card">
          <form onSubmit={handleSaveSettings} className="pw-settings-form-layout">
            <h3 className="pw-form-section-title">Ajustes Globales del Sitio Web</h3>

            <div className="ds-field">
              <label className="ds-label">Anuncio / Banner Superior:</label>
              <input
                type="text"
                className="ds-input"
                value={settings.bannerText || ''}
                onChange={(e) => setSettings({ ...settings, bannerText: e.target.value })}
                placeholder="e.g. Envíos gratis a todo Bogotá en compras superiores a $2,000,000"
              />
            </div>

            <div className="ds-field">
              <label className="ds-label">Teléfono / WhatsApp de Contacto:</label>
              <input
                type="text"
                className="ds-input"
                value={settings.whatsappPhone || ''}
                onChange={(e) => setSettings({ ...settings, whatsappPhone: e.target.value })}
                placeholder="e.g. +57 300 123 4567"
              />
            </div>

            <div className="ds-field">
              <label className="ds-label">Dirección del Showroom:</label>
              <input
                type="text"
                className="ds-input"
                value={settings.showroomAddress || ''}
                onChange={(e) => setSettings({ ...settings, showroomAddress: e.target.value })}
                placeholder="e.g. Calle 109 # 18-20, Bogotá"
              />
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <Button variant="primary" icon={FaSave} type="submit">
                Guardar Ajustes Web
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL NATIVO CREAR / EDITAR PRODUCTO */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingProduct ? 'Editar Producto Web' : 'Nuevo Producto Web'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" icon={FaSave} onClick={handleSaveProduct}>
              {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </>
        }
      >
        <form id="pw-prod-form" onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Sección 1: Información Principal */}
          <div className="pw-modal-section">
            <h4 className="pw-form-sub-header">Información Principal</h4>
            <div className="pw-form-grid-2">
              <div className="ds-field">
                <label className="ds-label">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  className="ds-input"
                  placeholder="e.g. Sofá Cama Chester"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="ds-field">
                <label className="ds-label">Categoría</label>
                <select
                  className="ds-select"
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
          </div>

          {/* Sección 2: Precios y Badges */}
          <div className="pw-modal-section">
            <h4 className="pw-form-sub-header">Precios y Clasificación</h4>
            <div className="pw-form-grid-3">
              <div className="ds-field">
                <label className="ds-label">Precio Actual (COP)</label>
                <input
                  type="number"
                  className="ds-input"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div className="ds-field">
                <label className="ds-label">Precio Anterior (Opcional)</label>
                <input
                  type="number"
                  className="ds-input"
                  value={formData.oldPrice}
                  onChange={(e) => setFormData({ ...formData, oldPrice: e.target.value })}
                />
              </div>
              <div className="ds-field">
                <label className="ds-label">Etiqueta / Badge</label>
                <input
                  type="text"
                  className="ds-input"
                  placeholder="e.g. Nuevo, Oferta, Sora"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Sección 3: Descripciones y Medidas */}
          <div className="pw-modal-section">
            <h4 className="pw-form-sub-header">Descripciones y Medidas</h4>
            <div className="ds-field">
              <label className="ds-label">Descripción Corta</label>
              <input
                type="text"
                className="ds-input"
                placeholder="Resumen ejecutivo para la tarjeta de producto"
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              />
            </div>

            <div className="ds-field">
              <label className="ds-label">Descripción Completa</label>
              <textarea
                className="ds-textarea"
                rows={3}
                placeholder="Detalle completo de fabricación, acabados y confort"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="pw-form-grid-2">
              <div className="ds-field">
                <label className="ds-label">Materiales</label>
                <input
                  type="text"
                  className="ds-input"
                  placeholder="e.g. Estructura en roble, tela Lino beige"
                  value={formData.materials}
                  onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                />
              </div>
              <div className="ds-field">
                <label className="ds-label">Dimensiones</label>
                <input
                  type="text"
                  className="ds-input"
                  placeholder="e.g. Ancho: 220cm x Alto: 85cm x Prof: 95cm"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Sección 4: Galería de Imágenes */}
          <div className="pw-modal-section">
            <h4 className="pw-form-sub-header">Galería de Imágenes Web</h4>
            <div className="ds-field">
              <div className="pw-upload-area">
                <input
                  type="file"
                  id="pw-img-native-file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <label htmlFor="pw-img-native-file" className="ds-btn ds-btn--secondary">
                  <FaUpload /> {uploading ? 'Subiendo...' : 'Subir Imágenes'}
                </label>
              </div>

              {formData.images.length > 0 && (
                <div className="pw-image-previews-grid">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="pw-img-preview-thumb">
                      <img src={getMediaUrl(img)} alt={`Preview ${idx + 1}`} />
                      <button
                        type="button"
                        className="pw-img-remove-badge"
                        onClick={() => handleRemoveImage(idx)}
                        title="Eliminar imagen"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sección 5: Opciones de Publicación */}
          <div className="pw-modal-section">
            <h4 className="pw-form-sub-header">Opciones de Publicación</h4>
            <div className="pw-checkbox-row">
              <label className="pw-checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                />
                Destacado en el Inicio
              </label>

              <label className="pw-checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                Producto Activo (Visible públicamente)
              </label>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default PaginawebAdminPage;
