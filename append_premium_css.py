import sys

css_content = '''
/* ==========================================================================
   Premium Order Details Redesign (Expanded View)
   ========================================================================== */
.details-view-wrapper {
  display: flex;
  flex-direction: row;
  gap: 2rem;
  padding: 2rem;
  background-color: #fafbfc;
  border-radius: 0 0 12px 12px;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
}

.order-preview {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.telas-preview {
  flex: 1;
  /* El estilo actual ya lo cubre, pero le podemos añadir sombras */
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

/* Header */
.preview-header.premium {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 1rem;
}

.preview-header-brand {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.logoPedido.premium-logo {
  max-height: 48px;
  width: auto;
  object-fit: contain;
}

.numPedido.premium-title h2 {
  margin: 0 0 0.2rem 0;
  font-size: 1.25rem;
  color: #1e293b;
  font-weight: 700;
}

.numPedido.premium-title p {
  margin: 0;
  font-size: 0.95rem;
  color: #64748b;
  font-weight: 500;
}

.btn-editar-pedido.premium-edit {
  background: #f8fafc;
  color: #3b82f6;
  border: 1px solid #cbd5e1;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  cursor: pointer;
}

.btn-editar-pedido.premium-edit:hover {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #2563eb;
  transform: translateY(-1px);
}

/* Grid de Información */
.preview-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #f8fafc;
  padding: 1rem;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
  transition: background 0.2s;
}

.info-card:hover {
  background: #f1f5f9;
}

.info-card-icon {
  background: white;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  font-size: 1.1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.info-card-content {
  display: flex;
  flex-direction: column;
}

.info-label {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  margin-bottom: 0.2rem;
}

.info-value {
  font-size: 0.9rem;
  color: #0f172a;
  font-weight: 500;
}

/* Tabla Premium de Productos */
.preview-section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  color: #1e293b;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 0.5rem;
}

.preview-section-title h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.preview-section-title svg {
  color: #64748b;
}

.table-responsive-wrapper {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.preview-productos-table.premium {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.preview-productos-table.premium th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.preview-productos-table.premium td {
  padding: 0.85rem 1rem;
  font-size: 0.9rem;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
}

.preview-productos-table.premium tr:last-child td {
  border-bottom: none;
}

.preview-productos-table.premium tr:hover {
  background: #f8fafc;
}

.center-col {
  text-align: center !important;
}

.ref-col {
  font-weight: 500;
  color: #0f172a;
}

/* Alerta de Notas */
.preview-nota.premium-alert {
  display: flex;
  gap: 1rem;
  background: #fffbeb;
  border-left: 4px solid #f59e0b;
  padding: 1rem;
  border-radius: 0 8px 8px 0;
  margin-top: 0.5rem;
}

.preview-nota.premium-alert .alert-icon {
  color: #f59e0b;
  font-size: 1.25rem;
  margin-top: 0.1rem;
}

.preview-nota.premium-alert .alert-content h4 {
  margin: 0 0 0.25rem 0;
  color: #92400e;
  font-size: 0.9rem;
  font-weight: 600;
}

.preview-nota.premium-alert .alert-content p {
  margin: 0;
  color: #b45309;
  font-size: 0.85rem;
  line-height: 1.5;
}

/* Responsividad extra */
@media (max-width: 1024px) {
  .details-view-wrapper {
    flex-direction: column;
  }
  
  .preview-info-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .preview-header.premium {
    flex-direction: column;
    gap: 1rem;
  }
  
  .preview-info-grid {
    grid-template-columns: 1fr;
  }
}
'''

with open('src/pages/OrdenesPage.css', 'a') as f:
    f.write('\n\n' + css_content)
