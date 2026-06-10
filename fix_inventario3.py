import re

with open('src/pages/InventarioPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Group row rendering
old_row = """                    <td>
                        <div className="prod-name-cell">
                            <FaLayerGroup style={{ color: '#3b82f6', fontSize: '0.75rem', flexShrink: 0 }} />
                            <strong className="inv-group-nombre" style={{ fontSize: '0.85rem' }}>{grupoObj.nombre}</strong>
                        </div>
                    </td>
                    <td>
                        {first.cat?.nombre && (
                            <span className="cat-badge cat-badge--standalone" style={{ '--cat-color': color }}>{first.cat.nombre}</span>
                        )}
                    </td>
                    <td className="empty-val">—</td>"""

new_row = """                    <td>
                        <div className="prod-name-cell">
                            <FaLayerGroup style={{ color: '#3b82f6', fontSize: '0.75rem', flexShrink: 0 }} />
                            <span className="inv-group-nombre-small" title={grupoObj.nombre}>{grupoObj.nombre}</span>
                        </div>
                    </td>
                    <td>
                        {grupoObj.categoria_nombre && (
                            <span className="cat-badge cat-badge--standalone" style={{ '--cat-color': getCatColor(grupoObj.categoria_id) || '#94a3b8' }}>
                                {grupoObj.categoria_nombre}
                            </span>
                        )}
                    </td>
                    <td>{grupoObj.subcategoria_nombre || <span className="empty-val">—</span>}</td>"""
content = content.replace(old_row, new_row)


# 2. Add Categoria and Descripcion to nuevoGrupoModal state
old_new_state = "const [nuevoGrupoModal, setNuevoGrupoModal] = useState({ open: false, nombre: '', subcategoriaId: '', observacion: '', ventaId: '' });"
new_new_state = "const [nuevoGrupoModal, setNuevoGrupoModal] = useState({ open: false, nombre: '', categoriaId: '', subcategoriaId: '', descripcion: '', observacion: '', ventaId: '' });"
content = content.replace(old_new_state, new_new_state)

old_new_set_open = "setNuevoGrupoModal({ open: true, nombre: '', subcategoriaId: '', observacion: '', ventaId: '' })"
new_new_set_open = "setNuevoGrupoModal({ open: true, nombre: '', categoriaId: '', subcategoriaId: '', descripcion: '', observacion: '', ventaId: '' })"
content = content.replace(old_new_set_open, new_new_set_open)

old_new_set_close = "setNuevoGrupoModal({ open: false, nombre: '', subcategoriaId: '', observacion: '', ventaId: '' })"
new_new_set_close = "setNuevoGrupoModal({ open: false, nombre: '', categoriaId: '', subcategoriaId: '', descripcion: '', observacion: '', ventaId: '' })"
content = content.replace(old_new_set_close, new_new_set_close)

# 3. Add Categoria and Descripcion to nuevoGrupoModal payload
old_new_payload = """        try {
            const payload = {
                nombre: nuevoGrupoModal.nombre,
                subcategoria_id: nuevoGrupoModal.subcategoriaId ? parseInt(nuevoGrupoModal.subcategoriaId) : null,"""
new_new_payload = """        try {
            const payload = {
                nombre: nuevoGrupoModal.nombre,
                categoria_id: nuevoGrupoModal.categoriaId ? parseInt(nuevoGrupoModal.categoriaId) : null,
                subcategoria_id: nuevoGrupoModal.subcategoriaId ? parseInt(nuevoGrupoModal.subcategoriaId) : null,
                descripcion: nuevoGrupoModal.descripcion || '',"""
content = content.replace(old_new_payload, new_new_payload)


# 4. Add Categoria and Descripcion to grupoEditModal open
old_open_edit = """            nombre: grupo.nombre, 
            disponibilidad: '', 
            subcategoriaId: grupo.subcategoria_id || '',
            observacion: grupo.observacion || '',"""
new_open_edit = """            nombre: grupo.nombre, 
            disponibilidad: '', 
            categoriaId: grupo.categoria_id || '',
            subcategoriaId: grupo.subcategoria_id || '',
            descripcion: grupo.descripcion || '',
            observacion: grupo.observacion || '',"""
content = content.replace(old_open_edit, new_open_edit)

# 5. Add Categoria and Descripcion to grupoEditModal payload
old_edit_payload = """        const { grupo, nombre, disponibilidad, subcategoriaId, observacion, removedDbIds, addedItems, items: gItems, ventaId } = grupoEditModal;
        try {
            const payload = { 
                nombre,
                subcategoria_id: subcategoriaId ? parseInt(subcategoriaId) : null,
                observacion,"""
new_edit_payload = """        const { grupo, nombre, disponibilidad, categoriaId, subcategoriaId, descripcion, observacion, removedDbIds, addedItems, items: gItems, ventaId } = grupoEditModal;
        try {
            const payload = { 
                nombre,
                categoria_id: categoriaId ? parseInt(categoriaId) : null,
                subcategoria_id: subcategoriaId ? parseInt(subcategoriaId) : null,
                descripcion: descripcion || '',
                observacion,"""
content = content.replace(old_edit_payload, new_edit_payload)

# 6. Add Categoria and Descripcion fields to Nuevo Grupo Modal JSX
old_nuevo_fields = """                            <div className="inv-grupo-field">
                                <label className="ifg-label">Subcategoría</label>
                                <select className="ifg-input" 
                                    value={nuevoGrupoModal.subcategoriaId}
                                    onChange={e => setNuevoGrupoModal(prev => ({ ...prev, subcategoriaId: e.target.value }))}>
                                    <option value="">Ninguna</option>
                                    {SUBCATEGORIAS.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>

                            <div className="inv-grupo-field">
                                <label className="ifg-label">Observación</label>"""

new_nuevo_fields = """                            <div className="inv-grupo-field">
                                <label className="ifg-label">Categoría</label>
                                <select className="ifg-input" 
                                    value={nuevoGrupoModal.categoriaId}
                                    onChange={e => setNuevoGrupoModal(prev => ({ ...prev, categoriaId: e.target.value, subcategoriaId: '' }))}>
                                    <option value="">Ninguna</option>
                                    {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>

                            <div className="inv-grupo-field">
                                <label className="ifg-label">Subcategoría</label>
                                <select className="ifg-input" 
                                    value={nuevoGrupoModal.subcategoriaId}
                                    onChange={e => setNuevoGrupoModal(prev => ({ ...prev, subcategoriaId: e.target.value }))}>
                                    <option value="">Ninguna</option>
                                    {(nuevoGrupoModal.categoriaId ? SUBCATEGORIAS.filter(s => String(s.categoria) === String(nuevoGrupoModal.categoriaId)) : SUBCATEGORIAS).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>
                            
                            <div className="inv-grupo-field">
                                <label className="ifg-label">Descripción</label>
                                <textarea className="ifg-input" rows="2"
                                    value={nuevoGrupoModal.descripcion}
                                    onChange={e => setNuevoGrupoModal(prev => ({ ...prev, descripcion: e.target.value }))}
                                    placeholder="Descripción general..." />
                            </div>

                            <div className="inv-grupo-field">
                                <label className="ifg-label">Observación</label>"""
content = content.replace(old_nuevo_fields, new_nuevo_fields)

# 7. Add Categoria and Descripcion fields to Editar Grupo Modal JSX
old_edit_fields = """                            <div className="inv-grupo-field">
                                <label className="ifg-label">Subcategoría</label>
                                <select className="ifg-input" 
                                    value={grupoEditModal.subcategoriaId}
                                    onChange={e => setGrupoEditModal(prev => ({ ...prev, subcategoriaId: e.target.value }))}>
                                    <option value="">Ninguna</option>
                                    {SUBCATEGORIAS.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>

                            <div className="inv-grupo-field">
                                <label className="ifg-label">Observación</label>"""

new_edit_fields = """                            <div className="inv-grupo-field">
                                <label className="ifg-label">Categoría</label>
                                <select className="ifg-input" 
                                    value={grupoEditModal.categoriaId}
                                    onChange={e => setGrupoEditModal(prev => ({ ...prev, categoriaId: e.target.value, subcategoriaId: '' }))}>
                                    <option value="">Ninguna</option>
                                    {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>

                            <div className="inv-grupo-field">
                                <label className="ifg-label">Subcategoría</label>
                                <select className="ifg-input" 
                                    value={grupoEditModal.subcategoriaId}
                                    onChange={e => setGrupoEditModal(prev => ({ ...prev, subcategoriaId: e.target.value }))}>
                                    <option value="">Ninguna</option>
                                    {(grupoEditModal.categoriaId ? SUBCATEGORIAS.filter(s => String(s.categoria) === String(grupoEditModal.categoriaId)) : SUBCATEGORIAS).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>
                            
                            <div className="inv-grupo-field">
                                <label className="ifg-label">Descripción</label>
                                <textarea className="ifg-input" rows="2"
                                    value={grupoEditModal.descripcion}
                                    onChange={e => setGrupoEditModal(prev => ({ ...prev, descripcion: e.target.value }))}
                                    placeholder="Descripción general..." />
                            </div>

                            <div className="inv-grupo-field">
                                <label className="ifg-label">Observación</label>"""
content = content.replace(old_edit_fields, new_edit_fields)

with open('src/pages/InventarioPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
