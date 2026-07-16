import sys

with open('src/pages/OrdenesPage.jsx', 'r') as f:
    content = f.read()

# Replace the imports
content = content.replace(
    "import { FaChevronDown, FaFileExport, FaPlus, FaEdit } from 'react-icons/fa';",
    "import { FaChevronDown, FaFileExport, FaPlus, FaEdit, FaBuilding, FaUser, FaCalendarAlt, FaFileInvoice, FaStickyNote, FaBoxOpen } from 'react-icons/fa';"
)

old_details_block = '''                                  {/* Columna izquierda: resumen de la orden */}
                                  <div className="order-preview">
                                    <div className="preview-header">
                                      <img src={logoFinal} className="logoPedido" alt="Logo Lottus" />
                                      <div className="numPedido">
                                        <h2>Orden de Pedido</h2>
                                        <p className="numeroOP">No. {orden.id}</p>
                                      </div>
                                    </div>
                                    <div className="preview-info">
                                      <div className="info-column">
                                        <p><strong>Proveedor:</strong> {orden.proveedor_nombre}</p>
                                        <p><strong>Vendedor:</strong> {orden.vendedor}</p>
                                        <p><strong>Orden de compra:</strong> {orden.venta || orden.orden_venta}</p>
                                      </div>
                                      <div className="info-column">
                                        <p><strong>Fecha pedido:</strong> {formatDate(orden.fecha_pedido)}</p>
                                        <p><strong>Fecha entrega:</strong> {formatDate(orden.fecha_esperada)}</p>
                                      </div>
                                      {/* Cambio 2: Solo admin puede editar si la orden está anulada */}
                                      {orden.estado === 'anulado' && user?.role?.toLowerCase() !== 'administrador' ? (
                                        <button
                                          className="btn-editar-pedido btn-editar-pedido--disabled"
                                          disabled
                                          title="Solo el administrador puede editar órdenes anuladas"
                                        >
                                          <FaEdit /> Editar
                                        </button>
                                      ) : (
                                        <button className="btn-editar-pedido" onClick={() => handleOpenEditModal(orden)} title="Editar pedido">
                                          <FaEdit /> Editar
                                        </button>
                                      )}
                                    </div>
                                    <h3 className="preview-productos-title">Productos:</h3>
                                    <table className="preview-productos-table">
                                      <thead>
                                        <tr>
                                          <th>Cantidad</th>
                                          <th>Referencia</th>
                                          <th>Descripción</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Array.isArray(orderDetails) && orderDetails.map((p, i) => (
                                          <tr key={i}>
                                            <td>{p.cantidad}</td>
                                            <td>{p.referencia}</td>
                                            <td className="desc-preview">{p.especificaciones}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    <div className="preview-nota">
                                      <h3>Observación:</h3>
                                      <p>{orden.observacion || 'Sin observaciones'}</p>
                                    </div>
                                  </div>'''


new_details_block = '''                                  {/* Columna izquierda: resumen de la orden */}
                                  <div className="order-preview">
                                    <div className="preview-header premium">
                                      <div className="preview-header-brand">
                                        <img src={logoFinal} className="logoPedido premium-logo" alt="Logo Lottus" />
                                        <div className="numPedido premium-title">
                                          <h2>Orden de Pedido</h2>
                                          <p className="numeroOP">#{orden.id}</p>
                                        </div>
                                      </div>
                                      
                                      {/* Action Button moved to top right */}
                                      <div className="preview-header-actions">
                                        {orden.estado === 'anulado' && user?.role?.toLowerCase() !== 'administrador' ? (
                                          <button className="btn-editar-pedido btn-editar-pedido--disabled" disabled title="Solo el administrador puede editar órdenes anuladas">
                                            <FaEdit /> Editar
                                          </button>
                                        ) : (
                                          <button className="btn-editar-pedido premium-edit" onClick={() => handleOpenEditModal(orden)} title="Editar pedido">
                                            <FaEdit /> Editar
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="preview-info-grid">
                                      <div className="info-card">
                                        <div className="info-card-icon"><FaBuilding /></div>
                                        <div className="info-card-content">
                                          <span className="info-label">Proveedor</span>
                                          <span className="info-value">{orden.proveedor_nombre}</span>
                                        </div>
                                      </div>
                                      <div className="info-card">
                                        <div className="info-card-icon"><FaUser /></div>
                                        <div className="info-card-content">
                                          <span className="info-label">Vendedor</span>
                                          <span className="info-value">{orden.vendedor}</span>
                                        </div>
                                      </div>
                                      <div className="info-card">
                                        <div className="info-card-icon"><FaFileInvoice /></div>
                                        <div className="info-card-content">
                                          <span className="info-label">Orden de Compra</span>
                                          <span className="info-value">{orden.venta || orden.orden_venta}</span>
                                        </div>
                                      </div>
                                      <div className="info-card">
                                        <div className="info-card-icon"><FaCalendarAlt /></div>
                                        <div className="info-card-content">
                                          <span className="info-label">Fechas (Ped. - Ent.)</span>
                                          <span className="info-value">{formatDate(orden.fecha_pedido)} a {formatDate(orden.fecha_esperada)}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="preview-section-title">
                                      <FaBoxOpen /> <h3>Productos Solicitados</h3>
                                    </div>
                                    <div className="table-responsive-wrapper">
                                      <table className="preview-productos-table premium">
                                        <thead>
                                          <tr>
                                            <th>Cantidad</th>
                                            <th>Referencia</th>
                                            <th>Descripción</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {Array.isArray(orderDetails) && orderDetails.map((p, i) => (
                                            <tr key={i}>
                                              <td className="center-col font-mono"><strong>{p.cantidad}</strong></td>
                                              <td className="ref-col">{p.referencia}</td>
                                              <td className="desc-preview">{p.especificaciones}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>

                                    {orden.observacion && (
                                      <div className="preview-nota premium-alert">
                                        <div className="alert-icon"><FaStickyNote /></div>
                                        <div className="alert-content">
                                          <h4>Observación</h4>
                                          <p>{orden.observacion}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>'''

content = content.replace(old_details_block, new_details_block)

with open('src/pages/OrdenesPage.jsx', 'w') as f:
    f.write(content)
