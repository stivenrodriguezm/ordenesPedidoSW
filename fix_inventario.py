import re

with open('src/pages/InventarioPage.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "if (viewMode === 'groups_only') {" in line:
        start_idx = i - 1 # Include the comment
    if "ungrouped.forEach(inv => rows.push(renderItemRow(inv, inv.dbId)));" in line:
        end_idx = i + 3 # Include return rows;

if start_idx != -1 and end_idx != -1:
    print(f"Replacing lines {start_idx} to {end_idx}")
    
    merged_logic = """        // ── GROUPS + DEFAULT ── groups collapsed/expanded + optional ungrouped
        const groupedById = {};
        const ungrouped   = [];
        filtered.forEach(inv => {
            if (inv.grupoId) {
                if (!groupedById[inv.grupoId]) groupedById[inv.grupoId] = [];
                groupedById[inv.grupoId].push(inv);
            } else {
                ungrouped.push(inv);
            }
        });

        const rows = [];

        Object.entries(groupedById).forEach(([gIdStr, gItems]) => {
            const grupoId   = parseInt(gIdStr);
            const grupoObj  = grupos.find(g => g.id === grupoId) || { id: grupoId, nombre: `Grupo ${gIdStr}` };
            const isExpanded = expandedGroups[grupoId];
            const first     = gItems[0];
            const color     = first.prod ? getCatColor(first.prod.categoriaId) : '#94a3b8';
            const dispSet   = new Set(gItems.map(i => i.disponibilidad));
            const dispUni   = dispSet.size === 1 ? [...dispSet][0] : null;

            rows.push(
                <tr key={`grupo-${grupoId}`} className="inv-group-header-row" onClick={() => toggleGroup(grupoId)}>
                    <td><span className="inv-group-id-badge">G{String(grupoId).padStart(3, '0')}</span></td>
                    <td className="empty-val">—</td><td className="empty-val">—</td><td className="empty-val">—</td>
                    <td>
                        {dispUni
                            ? <span className={`disp-badge disp-${dispUni}`}>{DISPONIBILIDAD_LABELS[dispUni]}</span>
                            : <span className="disp-badge inv-disp-mixto">Mixto</span>}
                    </td>
                    <td className="empty-val">—</td>
                    <td>
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
                    <td className="empty-val">—</td>
                    <td>
                        <span className="inv-group-count-pill" style={{ marginLeft: 0 }}>{gItems.length} ítem{gItems.length !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="empty-val">—</td>
                    {showCostoCol && <td className="empty-val">—</td>}
                    <td style={{ textAlign: 'center' }}>
                        <div className="inv-group-actions">
                            <button className="inv-group-edit-btn" title="Editar grupo"
                                onClick={e => { e.stopPropagation(); openGrupoEdit(grupoObj, gItems); }}>
                                <FaEdit />
                            </button>
                            <button className={`inv-group-toggle ${isExpanded ? 'active' : ''}`}
                                onClick={e => { e.stopPropagation(); toggleGroup(grupoId); }}>
                                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                            </button>
                        </div>
                    </td>
                </tr>
            );

            if (isExpanded) {
                gItems.forEach((inv, i) =>
                    rows.push(renderItemRow(inv, `g${grupoId}-item-${i}`, 'inv-group-child-row'))
                );
            }
        });

        if (viewMode === 'default') {
            ungrouped.forEach(inv => rows.push(renderItemRow(inv, inv.dbId)));
        }

        if (viewMode === 'groups_only' && rows.length === 0) {
            return <tr><td colSpan={colSpan} style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', padding: '2rem' }}>No hay grupos con los filtros actuales.</td></tr>;
        }

        return rows;
"""
    new_lines = lines[:start_idx] + [merged_logic] + lines[end_idx:]
    with open('src/pages/InventarioPage.jsx', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("REPLACED")
else:
    print("COULD NOT FIND INDICES")

# Also add Venta ID fields to the modals
import re

with open('src/pages/InventarioPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Nuevo Grupo Modal: add ID de Venta
old_nuevo_obs = """                                <label className="ifg-label">Observación</label>
                                <textarea className="ifg-input" rows="2"
                                    value={nuevoGrupoModal.observacion}
                                    onChange={e => setNuevoGrupoModal(prev => ({ ...prev, observacion: e.target.value }))}
                                    placeholder="Detalles adicionales..." />
                            </div>
                        </div>"""

new_nuevo_obs = """                                <label className="ifg-label">Observación</label>
                                <textarea className="ifg-input" rows="2"
                                    value={nuevoGrupoModal.observacion}
                                    onChange={e => setNuevoGrupoModal(prev => ({ ...prev, observacion: e.target.value }))}
                                    placeholder="Detalles adicionales..." />
                            </div>
                            <div className="inv-grupo-field">
                                <label className="ifg-label">ID de Venta (Opcional)</label>
                                <select className="ifg-input" value={nuevoGrupoModal.ventaId} onChange={e => setNuevoGrupoModal(prev => ({ ...prev, ventaId: e.target.value }))}>
                                    <option value="">Seleccionar Venta...</option>
                                    {ordenesPendientes.map(id => <option key={id} value={id}>{id}</option>)}
                                </select>
                            </div>
                        </div>"""
content = content.replace(old_nuevo_obs, new_nuevo_obs)

# Editar Grupo Modal: add ID de Venta
old_edit_obs = """                                    <label className="ifg-label">Observación</label>
                                    <textarea className="ifg-input" rows="2"
                                        value={grupoEditData.observacion}
                                        onChange={e => setGrupoEditData(prev => ({ ...prev, observacion: e.target.value }))}
                                        placeholder="Detalles del grupo..." />
                                </div>
                            </div>"""
new_edit_obs = """                                    <label className="ifg-label">Observación</label>
                                    <textarea className="ifg-input" rows="2"
                                        value={grupoEditData.observacion}
                                        onChange={e => setGrupoEditData(prev => ({ ...prev, observacion: e.target.value }))}
                                        placeholder="Detalles del grupo..." />
                                </div>
                                <div className="inv-grupo-field">
                                    <label className="ifg-label">ID de Venta (Opcional)</label>
                                    <select className="ifg-input" value={grupoEditData.ventaId || ''} onChange={e => setGrupoEditData(prev => ({ ...prev, ventaId: e.target.value }))}>
                                        <option value="">Ninguna Venta Asociada</option>
                                        {ordenesPendientes.map(id => <option key={id} value={id}>{id}</option>)}
                                    </select>
                                </div>
                            </div>"""
content = content.replace(old_edit_obs, new_edit_obs)

with open('src/pages/InventarioPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("ADDED VENTA FIELDS TO MODALS")

