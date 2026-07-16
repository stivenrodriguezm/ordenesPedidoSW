import sys

css_content = '''
/* ==========================================================================
   Premium Creation Form Redesign
   ========================================================================== */

/* Title Header */
.form-title-header.premium {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 1.5rem;
}

.title-wrapper {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.title-icon {
  font-size: 2.2rem;
  color: #3b82f6;
  background: #eff6ff;
  padding: 0.75rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1);
}

.title-text-group {
  display: flex;
  flex-direction: column;
}

.title-subtitle {
  margin: 0.25rem 0 0 0;
  color: #64748b;
  font-size: 0.95rem;
  font-weight: 500;
}

/* Sections */
.form-section-container {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
  transition: box-shadow 0.3s ease;
}

.form-section-container:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
}

.form-section-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.15rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.form-section-title svg {
  color: #3b82f6;
  font-size: 1.25rem;
}

/* Inputs & Form Groups */
.form-group label {
  color: #475569;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem !important;
}

.form-group input,
.form-group select,
.form-group textarea,
.producto-item input,
.producto-item select,
.producto-item textarea {
  background-color: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #0f172a;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
}

.form-group input:hover,
.form-group select:hover,
.form-group textarea:hover,
.producto-item input:hover,
.producto-item select:hover,
.producto-item textarea:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus,
.producto-item input:focus,
.producto-item select:focus,
.producto-item textarea:focus {
  background-color: white;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
}

/* Producto Items Premium */
.productos-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.producto-item.premium-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1rem;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.producto-item.premium-card:hover {
  background: #ffffff;
  border-color: #cbd5e1;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
}

.producto-item.premium-card input,
.producto-item.premium-card select,
.producto-item.premium-card textarea {
  background: white;
}

.premium-products-header {
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 1rem;
}

/* Premium Buttons */
.btn-primary-glow {
  background: linear-gradient(135deg, #1657b8 0%, #104ca7 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(22, 87, 184, 0.3);
  transition: all 0.2s;
}

.btn-primary-glow:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(22, 87, 184, 0.4);
}

.btn-ghost-primary {
  background: transparent;
  color: #3b82f6;
  border: 1px dashed #93c5fd;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ghost-primary:hover {
  background: #eff6ff;
  border-color: #3b82f6;
}

/* Checkbox Style Improvement */
.checkbox-group input {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 4px;
  cursor: pointer;
}
.checkbox-group label {
  font-weight: 600;
  font-size: 0.9rem;
}
'''

with open('src/pages/CrearPedidoPage.css', 'a') as f:
    f.write('\n\n' + css_content)
