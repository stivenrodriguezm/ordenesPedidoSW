import re

with open('src/pages/InventarioPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix saveNuevoGrupo payload
old_save_nuevo = """        try {
            const payload = {
                nombre: nuevoGrupoModal.nombre,
                subcategoria_id: nuevoGrupoModal.subcategoriaId ? parseInt(nuevoGrupoModal.subcategoriaId) : null,
                observacion: nuevoGrupoModal.observacion,
            };"""
new_save_nuevo = """        try {
            const payload = {
                nombre: nuevoGrupoModal.nombre,
                subcategoria_id: nuevoGrupoModal.subcategoriaId ? parseInt(nuevoGrupoModal.subcategoriaId) : null,
                observacion: nuevoGrupoModal.observacion,
                venta_id: nuevoGrupoModal.ventaId || null,
            };"""
content = content.replace(old_save_nuevo, new_save_nuevo)


# Fix saveGrupoEdit payload
old_save_edit = """        const { grupo, nombre, disponibilidad, subcategoriaId, observacion, removedDbIds, addedItems, items: gItems } = grupoEditModal;
        try {
            const payload = { 
                nombre,
                subcategoria_id: subcategoriaId ? parseInt(subcategoriaId) : null,
                observacion
            };"""
new_save_edit = """        const { grupo, nombre, disponibilidad, subcategoriaId, observacion, removedDbIds, addedItems, items: gItems, ventaId } = grupoEditModal;
        try {
            const payload = { 
                nombre,
                subcategoria_id: subcategoriaId ? parseInt(subcategoriaId) : null,
                observacion,
                venta_id: ventaId || null,
            };"""
content = content.replace(old_save_edit, new_save_edit)


# Fix openGrupoEdit
old_open_edit = """        setGrupoEditModal({ 
            grupo, 
            nombre: grupo.nombre, 
            disponibilidad: '', 
            subcategoriaId: grupo.subcategoria_id || '',
            observacion: grupo.observacion || '',
            items: [...gItems], 
            removedDbIds: [], 
            addedItems: [] 
        });"""
new_open_edit = """        setGrupoEditModal({ 
            grupo, 
            nombre: grupo.nombre, 
            disponibilidad: '', 
            subcategoriaId: grupo.subcategoria_id || '',
            observacion: grupo.observacion || '',
            ventaId: grupo.venta_id || '',
            items: [...gItems], 
            removedDbIds: [], 
            addedItems: [] 
        });"""
content = content.replace(old_open_edit, new_open_edit)


# Fix grupoEditModal jsx (since I used grupoEditData previously)
old_edit_jsx = """                                <div className="inv-grupo-field">
                                    <label className="ifg-label">Observación</label>
                                    <textarea className="ifg-input" rows="2"
                                        value={grupoEditModal.observacion}
                                        onChange={e => setGrupoEditModal(prev => ({ ...prev, observacion: e.target.value }))}
                                        placeholder="Notas del grupo..." style={{ minHeight: '60px' }} />
                                </div>

                                <div className="inv-grupo-field">"""

new_edit_jsx = """                                <div className="inv-grupo-field">
                                    <label className="ifg-label">Observación</label>
                                    <textarea className="ifg-input" rows="2"
                                        value={grupoEditModal.observacion}
                                        onChange={e => setGrupoEditModal(prev => ({ ...prev, observacion: e.target.value }))}
                                        placeholder="Notas del grupo..." style={{ minHeight: '60px' }} />
                                </div>
                                
                                <div className="inv-grupo-field">
                                    <label className="ifg-label">ID de Venta (Opcional)</label>
                                    <select className="ifg-input" value={grupoEditModal.ventaId || ''} onChange={e => setGrupoEditModal(prev => ({ ...prev, ventaId: e.target.value }))}>
                                        <option value="">Ninguna Venta Asociada</option>
                                        {ordenesPendientes.map(id => <option key={id} value={id}>{id}</option>)}
                                    </select>
                                </div>

                                <div className="inv-grupo-field">"""
content = content.replace(old_edit_jsx, new_edit_jsx)


with open('src/pages/InventarioPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("FIXED EDIT PAYLOADS")
