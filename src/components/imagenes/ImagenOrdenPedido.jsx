import React, { forwardRef } from 'react';
import logoFinal from '../../assets/logoFinal.png';
import './ImagenOrdenPedido.css';

/**
 * Imagen de la orden de pedido que se descarga y se envía al proveedor. La misma
 * plantilla en Crear pedido (/ordenes/nuevo) y en Ventas (una por orden generada).
 * productos: [{ cantidad, referencia, subcategoria?, descripcion }]
 */
const ImagenOrdenPedido = forwardRef(function ImagenOrdenPedido(
    { numero, proveedor, vendedor, ordenCompra, fechaPedido, fechaEntrega, productos = [], nota }, ref
) {
    // Subcategoría (2026-10-27): columna propia cuando algún producto la trae.
    const conSubcategoria = productos.some(p => p.subcategoria);
    return (
        <div className="preview-container" ref={ref}>
            <div className="preview-header">
                <img src={logoFinal} className="logoPedido" alt="Logo Lottus" />
                <div className="numPedido">
                    <h2>Orden de Pedido</h2>
                    <p className="numeroOP" style={{ color: '#dc2626', fontWeight: 700 }}>No. {numero || '...'}</p>
                </div>
            </div>

            <div className="preview-info">
                <div className="info-column">
                    <p><strong>Proveedor:</strong> {proveedor}</p>
                    <p><strong>Vendedor:</strong> {vendedor}</p>
                    <p><strong>Orden de compra:</strong> {ordenCompra}</p>
                </div>
                <div className="info-column">
                    <p><strong>Fecha pedido:</strong> {fechaPedido}</p>
                    <p><strong>Fecha entrega:</strong> {fechaEntrega}</p>
                </div>
            </div>

            <h3 className="preview-productos-title">Productos:</h3>
            <table className="preview-productos-table">
                <thead>
                    <tr>
                        <th>Cantidad</th>
                        <th>Referencia</th>
                        {conSubcategoria && <th>Subcategoría</th>}
                        <th>Descripción</th>
                    </tr>
                </thead>
                <tbody>
                    {productos.map((p, i) => (
                        <tr key={i}>
                            <td>{p.cantidad}</td>
                            <td>{p.referencia}</td>
                            {conSubcategoria && <td>{p.subcategoria || '—'}</td>}
                            <td className="desc-preview">{p.descripcion || 'Sin descripción'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="preview-nota">
                <h3>Observación:</h3>
                <div className="preview-nota-box">
                    <p style={{ whiteSpace: 'pre-line' }}>{nota || 'Sin observaciones'}</p>
                </div>
            </div>
        </div>
    );
});

export default ImagenOrdenPedido;
