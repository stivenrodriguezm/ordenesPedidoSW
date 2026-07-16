import sys

with open('src/pages/CrearPedidoPage.jsx', 'r') as f:
    content = f.read()

# Update Imports
content = content.replace(
    'import { FaPlus, FaTrashAlt } from "react-icons/fa";',
    'import { FaPlus, FaTrashAlt, FaFileSignature, FaClipboardList, FaBoxOpen, FaStickyNote } from "react-icons/fa";'
)

# Update Title Header
old_title_header = '''      <div className="form-title-header">
        <h1>Crear Nuevo Pedido</h1>
        <div className="header-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancelar
          </button>
          <button type="submit" form="main-form" className="btn-primary" disabled={createOrderMutation.isLoading}>
            {createOrderMutation.isLoading ? "Creando..." : "Crear Pedido"}
          </button>
        </div>
      </div>'''

new_title_header = '''      <div className="form-title-header premium">
        <div className="title-wrapper">
          <FaFileSignature className="title-icon" />
          <div className="title-text-group">
            <h1>Crear Nuevo Pedido</h1>
            <p className="title-subtitle">Completa los datos para generar la orden de forma rápida y segura.</p>
          </div>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancelar
          </button>
          <button type="submit" form="main-form" className="btn-primary-glow" disabled={createOrderMutation.isLoading}>
            {createOrderMutation.isLoading ? "Creando..." : "Crear Pedido"}
          </button>
        </div>
      </div>'''

content = content.replace(old_title_header, new_title_header)

# Update Section 1: Información Principal
old_section_1 = '<h3 className="form-section-title">Información Principal</h3>'
new_section_1 = '<div className="form-section-title"><FaClipboardList /> <h3>Información Principal</h3></div>'
content = content.replace(old_section_1, new_section_1)

# Update Section 2: Productos Header
old_section_2 = '''            <div className="form-section-header">
              <h3 className="form-section-title">Productos</h3>
              <button type="button" className="btn-secondary" onClick={handleAddProduct}>
                <FaPlus /> Agregar
              </button>
            </div>'''
new_section_2 = '''            <div className="form-section-header premium-products-header">
              <div className="form-section-title"><FaBoxOpen /> <h3>Productos</h3></div>
              <button type="button" className="btn-ghost-primary" onClick={handleAddProduct}>
                <FaPlus /> Agregar Producto
              </button>
            </div>'''
content = content.replace(old_section_2, new_section_2)

# Update Section 3: Observaciones
old_section_3 = '<h3 className="form-section-title">Observaciones</h3>'
new_section_3 = '<div className="form-section-title"><FaStickyNote /> <h3>Observaciones</h3></div>'
content = content.replace(old_section_3, new_section_3)

# Update Producto Item Wrapper
old_producto_item = '<div key={index} className="producto-item">'
new_producto_item = '<div key={index} className="producto-item premium-card">'
content = content.replace(old_producto_item, new_producto_item)

with open('src/pages/CrearPedidoPage.jsx', 'w') as f:
    f.write(content)
