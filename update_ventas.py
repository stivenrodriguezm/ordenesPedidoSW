import sys

with open('src/pages/Ventas.jsx', 'r') as f:
    content = f.read()

# 1. State variables
content = content.replace(
    'const [isSubmittingObs, setIsSubmittingObs] = useState(false);',
    'const [isSubmittingObs, setIsSubmittingObs] = useState(false);\n    const [isEditingObs, setIsEditingObs] = useState(false);\n    const [selectedObsId, setSelectedObsId] = useState(null);'
)

# 2. Add handleEditObservacionClick and handleDeleteObservacion right before handleAddObservacion
new_funcs = '''
    const handleEditObservacionClick = (tipo, obs) => {
        setIsEditingObs(true);
        setSelectedObsId(obs.id);
        if (tipo === 'cliente') {
            setObservacionClienteText(obs.texto);
            setShowObservacionClienteModal(true);
        } else {
            setObservacionVentaText(obs.texto);
            setShowObservacionVentaModal(true);
        }
    };

    const handleDeleteObservacion = async (tipo) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta observación?')) return;
        setIsSubmittingObs(true);
        try {
            await API.delete(`/observaciones-${tipo}/${selectedObsId}/`);
            setNotification({ message: 'Observación eliminada correctamente.', type: 'success' });
            if (tipo === 'cliente') {
                setShowObservacionClienteModal(false);
                setObservacionClienteText('');
            } else {
                setShowObservacionVentaModal(false);
                setObservacionVentaText('');
            }
            API.get(`/ventas/${expandedVentaId}/`).then(response => {
                setVentaDetails(response.data);
            }).catch(error => console.error(error));
        } catch (error) {
            console.error('Error al eliminar observación:', error);
            setNotification({ message: 'Error al eliminar la observación.', type: 'error' });
        } finally {
            setIsSubmittingObs(false);
        }
    };

    const handleAddObservacion'''

content = content.replace('    const handleAddObservacion', new_funcs, 1)

# 3. Update handleAddObservacion logic
old_add = '''    const handleAddObservacion = async (tipo) => {
        const id = tipo === 'cliente' ? ventaDetails.cliente.id : expandedVentaId;
        const url = `/${tipo === 'cliente' ? 'clientes' : 'ventas'}/${id}/observaciones/${tipo === 'cliente' ? 'anadir/' : ''}`;

        const texto = tipo === 'cliente' ? observacionClienteText : observacionVentaText;

        if (!texto) {
            setNotification({ message: 'La observación no puede estar vacía.', type: 'error' });
            return;
        }

        setIsSubmittingObs(true);
        try {
            await API.post(url, { texto });
            
            if (tipo === 'cliente') {'''

new_add = '''    const handleAddObservacion = async (tipo) => {
        const id = tipo === 'cliente' ? ventaDetails.cliente.id : expandedVentaId;
        
        let url;
        let method = 'POST';
        
        if (isEditingObs) {
            url = `/observaciones-${tipo}/${selectedObsId}/`;
            method = 'PUT';
        } else {
            url = `/${tipo === 'cliente' ? 'clientes' : 'ventas'}/${id}/observaciones/${tipo === 'cliente' ? 'anadir/' : ''}`;
        }

        const texto = tipo === 'cliente' ? observacionClienteText : observacionVentaText;

        if (!texto) {
            setNotification({ message: 'La observación no puede estar vacía.', type: 'error' });
            return;
        }

        setIsSubmittingObs(true);
        try {
            if (method === 'POST') {
                await API.post(url, { texto });
                setNotification({ message: 'Observación añadida correctamente.', type: 'success' });
            } else {
                await API.put(url, { texto });
                setNotification({ message: 'Observación actualizada correctamente.', type: 'success' });
            }
            
            if (tipo === 'cliente') {'''

content = content.replace(old_add, new_add)

# 4. Remove the old setNotification success inside try block (since we added it above)
content = content.replace(
    "            setNotification({ message: 'Observación añadida correctamente.', type: 'success' });\n            \n            // Re-fetch venta details to show new observacion in the background",
    "            // Re-fetch venta details to show new observacion in the background"
)

# 5. Fix Plus buttons
content = content.replace(
    "onClick={() => {\n                                                                            setObservacionClienteText('');\n                                                                            setShowObservacionClienteModal(true);\n                                                                        }}",
    "onClick={() => {\n                                                                            setIsEditingObs(false);\n                                                                            setSelectedObsId(null);\n                                                                            setObservacionClienteText('');\n                                                                            setShowObservacionClienteModal(true);\n                                                                        }}"
)

content = content.replace(
    "onClick={() => {\n                                                                            setObservacionVentaText('');\n                                                                            setShowObservacionVentaModal(true);\n                                                                        }}",
    "onClick={() => {\n                                                                            setIsEditingObs(false);\n                                                                            setSelectedObsId(null);\n                                                                            setObservacionVentaText('');\n                                                                            setShowObservacionVentaModal(true);\n                                                                        }}"
)

# 6. Make observation cards clickable
content = content.replace(
    '<div key={index} className="observacion-card">\n                                                                                    <div className="observacion-icon">💬</div>',
    '<div key={index} className="observacion-card" onClick={() => handleEditObservacionClick(\'cliente\', obs)}>\n                                                                                    <div className="observacion-icon">💬</div>'
)

content = content.replace(
    '<div key={index} className="observacion-card">\n                                                                                    <div className="observacion-icon">📝</div>',
    '<div key={index} className="observacion-card" onClick={() => handleEditObservacionClick(\'venta\', obs)}>\n                                                                                    <div className="observacion-icon">📝</div>'
)

# 7. Update Modals (Titles and Delete Buttons)
content = content.replace(
    'title="Agregar Observación al Cliente"',
    'title={isEditingObs ? "Editar Observación" : "Agregar Observación al Cliente"}'
)
content = content.replace(
    'title="Agregar Observación a la Venta"',
    'title={isEditingObs ? "Editar Observación" : "Agregar Observación a la Venta"}'
)

old_actions_cliente = '''                    <div className="modal-actions">
                        <button className="btn-secondary-modal" onClick={() => setShowObservacionClienteModal(false)}>Cancelar</button>
                        <button className="btn-primary-modal" onClick={() => handleAddObservacion('cliente')} disabled={isSubmittingObs}>{isSubmittingObs ? 'Guardando...' : 'Guardar Observación'}</button>
                    </div>'''

new_actions_cliente = '''                    <div className="modal-actions" style={{ justifyContent: isEditingObs ? 'space-between' : 'flex-end', width: '100%' }}>
                        {isEditingObs && (
                            <button className="btn-danger-modal" onClick={() => handleDeleteObservacion('cliente')} disabled={isSubmittingObs} style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                                Eliminar
                            </button>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-secondary-modal" onClick={() => setShowObservacionClienteModal(false)}>Cancelar</button>
                            <button className="btn-primary-modal" onClick={() => handleAddObservacion('cliente')} disabled={isSubmittingObs}>{isSubmittingObs ? 'Guardando...' : 'Guardar Cambios'}</button>
                        </div>
                    </div>'''

content = content.replace(old_actions_cliente, new_actions_cliente)

old_actions_venta = '''                    <div className="modal-actions">
                        <button className="btn-secondary-modal" onClick={() => setShowObservacionVentaModal(false)}>Cancelar</button>
                        <button className="btn-primary-modal" onClick={() => handleAddObservacion('venta')} disabled={isSubmittingObs}>{isSubmittingObs ? 'Guardando...' : 'Guardar Observación'}</button>
                    </div>'''

new_actions_venta = '''                    <div className="modal-actions" style={{ justifyContent: isEditingObs ? 'space-between' : 'flex-end', width: '100%' }}>
                        {isEditingObs && (
                            <button className="btn-danger-modal" onClick={() => handleDeleteObservacion('venta')} disabled={isSubmittingObs} style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                                Eliminar
                            </button>
                        )}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-secondary-modal" onClick={() => setShowObservacionVentaModal(false)}>Cancelar</button>
                            <button className="btn-primary-modal" onClick={() => handleAddObservacion('venta')} disabled={isSubmittingObs}>{isSubmittingObs ? 'Guardando...' : 'Guardar Cambios'}</button>
                        </div>
                    </div>'''

content = content.replace(old_actions_venta, new_actions_venta)

with open('src/pages/Ventas.jsx', 'w') as f:
    f.write(content)
