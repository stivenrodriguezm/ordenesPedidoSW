with open('src/pages/Ventas.jsx', 'r') as f:
    content = f.read()

# Fix the escaped unicode entities that were incorrectly inserted
old_block = r"""                                                                \u003cdiv className="pedidos-header"\u003e
                                                                    \u003ch4\u003eÓrdenes de Pedido\u003c/h4\u003e
                                                                    \u003cdiv style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}\u003e
                                                                        \u003cbutton className="v-btn-primary-glow" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }} onClick={() =\u003e navigate('/ordenes/nuevo', { state: { ventaId: venta.id } })}\u003e
                                                                            \u003cFaPlus /\u003e Agregar Pedido
                                                                        \u003c/button\u003e
                                                                        {usuario?.role === 'administrador' && (
                                                                            \u003cbutton className="v-btn-primary-glow" onClick={() =\u003e {
                                                                                setEditSaleData(ventaDetails);
                                                                                setShowEditSaleModal(true);
                                                                            }}\u003e
                                                                                \u003cFaEdit /\u003e Editar Venta
                                                                            \u003c/button\u003e
                                                                        )}
                                                                    \u003c/div\u003e
                                                                \u003c/div\u003e"""

new_block = """                                                                <div className="pedidos-header">
                                                                    <h4>Órdenes de Pedido</h4>
                                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                        <button className="v-btn-primary-glow" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }} onClick={() => navigate('/ordenes/nuevo', { state: { ventaId: venta.id } })}>
                                                                            <FaPlus /> Agregar Pedido
                                                                        </button>
                                                                        {usuario?.role === 'administrador' && (
                                                                            <button className="v-btn-primary-glow" onClick={() => {
                                                                                setEditSaleData(ventaDetails);
                                                                                setShowEditSaleModal(true);
                                                                            }}>
                                                                                <FaEdit /> Editar Venta
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print("Fixed escaped entities in Ventas.jsx")
else:
    # Fallback: decode unicode escapes and try again
    import re
    # Use regex to find and replace the malformed block
    def decode_unicode(m):
        return m.group(0).encode().decode('unicode_escape')
    
    content = content.replace('\\u003c', '<').replace('\\u003e', '>')
    print("Applied unicode decode fallback in Ventas.jsx")

with open('src/pages/Ventas.jsx', 'w') as f:
    f.write(content)
