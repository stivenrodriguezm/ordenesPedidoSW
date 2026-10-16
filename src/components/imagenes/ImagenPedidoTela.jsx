import React, { forwardRef } from 'react';

/**
 * Imagen del pedido de tela o cuero que se descarga y se envía al proveedor. La misma
 * plantilla en /telas (Nuevo pedido de materiales) y en Ventas (una por pedido).
 * detalles: [{ referencia, color, cantidad, unidad }]; material: 'Tela' | 'Cuero'.
 */
const ImagenPedidoTela = forwardRef(function ImagenPedidoTela(
    { numero, proveedor, solicitante, material, fecha, orden, venta, detalles = [], direccion, observacion, style }, ref
) {
    return (
        <div ref={ref} style={{
            width: '800px', backgroundColor: '#ffffff', padding: '40px', boxSizing: 'border-box', color: '#0f172a',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', ...style,
        }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000000', paddingBottom: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    {/* REDISEÑO COMPLETO DEL LOGO LOTTUS */}
                    <div style={{ 
                        backgroundColor: '#000000', 
                        width: '260px',
                        height: '66px',
                        position: 'relative',
                        overflow: 'hidden',
                        boxSizing: 'border-box' 
                    }}>
                        <span style={{ 
                            position: 'absolute',
                            left: '0',
                            right: '0',
                            textAlign: 'center',
                            top: '2px',
                            fontFamily: '"Audiowide", sans-serif', 
                            fontSize: '34px', 
                            color: '#ffffff', 
                            letterSpacing: '6px', 
                            lineHeight: '1', 
                            margin: '0',
                            padding: '0',
                            display: 'block'
                        }}>
                            LOTTUS
                        </span>
                    </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>ORDEN DE MATERIAL</span>
                    <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '1' }}>
                        {material === 'Cuero' ? 'PEDIDO DE CUEROS' : 'PEDIDO DE TELAS'}
                    </h2>
                    {/* NÚMERO DE ORDEN EN ROJO */}
                    <span style={{ 
                        color: '#dc2626', 
                        fontSize: '16px', 
                        fontWeight: '900', 
                        letterSpacing: '1px', 
                        lineHeight: '1', 
                        marginTop: '2px'
                    }}>
                        Nº {numero}
                    </span>
                </div>
            </div>

            {/* Metadata Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', fontSize: '13px', color: '#334155', backgroundColor: '#f8fafc', padding: '16px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                    <p style={{ margin: '0 0 8px 0' }}>
                        <strong style={{ color: '#0f172a', fontWeight: '700', display: 'inline-block', width: '110px' }}>Proveedor:</strong>{' '}
                        <span style={{ color: '#0f172a', fontWeight: '700' }}>{proveedor || 'N/A'}</span>
                    </p>
                    <p style={{ margin: '0 0 8px 0' }}>
                        <strong style={{ color: '#0f172a', fontWeight: '700', display: 'inline-block', width: '110px' }}>Solicitante:</strong>{' '}
                        <span style={{ color: '#334155', fontWeight: '600' }}>{solicitante || 'N/A'}</span>
                    </p>
                    <p style={{ margin: '0' }}>
                        <strong style={{ color: '#0f172a', fontWeight: '700', display: 'inline-block', width: '110px' }}>Material:</strong>{' '}
                        <span style={{ color: '#0f172a', fontWeight: '800' }}>{material || 'Tela'}</span>
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 8px 0' }}>
                        <strong style={{ color: '#0f172a', fontWeight: '700' }}>Fecha:</strong>{' '}
                        <span style={{ color: '#334155', fontWeight: '600' }}>{fecha}</span>
                    </p>
                    <p style={{ margin: '0 0 8px 0' }}>
                        <strong style={{ color: '#0f172a', fontWeight: '700' }}>Orden de pedido:</strong>{' '}
                        <span style={{ color: '#0f172a', fontWeight: '700' }}>{orden ? `#${orden}` : 'N/A'}</span>
                    </p>
                    <p style={{ margin: '0' }}>
                        <strong style={{ color: '#0f172a', fontWeight: '700' }}>Orden de compra (Venta):</strong>{' '}
                        <span style={{ color: '#0f172a', fontWeight: '700' }}>{venta ? `#${venta}` : 'N/A'}</span>
                    </p>
                </div>
            </div>

            {/* Details Section */}
            <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                ESPECIFICACIÓN DE MATERIALES
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                <thead style={{ backgroundColor: '#e2e8f0', color: '#000000' }}>
                    <tr>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '12px', width: '5%', letterSpacing: '0.5px', color: '#000000' }}>#</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '12px', width: '45%', letterSpacing: '0.5px', color: '#000000' }}>Referencia</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '12px', width: '25%', letterSpacing: '0.5px', color: '#000000' }}>Color</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '800', fontSize: '12px', width: '25%', letterSpacing: '0.5px', color: '#000000' }}>Cantidad</th>
                    </tr>
                </thead>
                <tbody>
                    {detalles.length > 0 ? (
                        detalles.map((detalle, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                <td style={{ padding: '12px 14px', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{index + 1}</td>
                                <td style={{ padding: '12px 14px', fontSize: '14px', color: '#0f172a', fontWeight: '700' }}>{detalle.referencia}</td>
                                <td style={{ padding: '12px 14px', fontSize: '13px', color: '#334155', fontWeight: '500' }}>{detalle.color || 'Standard'}</td>
                                <td style={{ padding: '12px 14px', fontSize: '14px', color: '#000000', textAlign: 'right', fontWeight: '800' }}>
                                    {detalle.cantidad} {detalle.unidad}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="4" style={{ padding: '14px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>Sin detalles registrados</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Delivery Address Section */}
            <div style={{ 
                backgroundColor: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px', 
                padding: '14px 18px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px' 
            }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.8px', whiteSpace: 'nowrap' }}>
                    Dirección de entrega:
                </span>
                <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '600' }}>
                    {direccion || 'No especificada'}
                </span>
            </div>

            {/* Observación General Section */}
            {observacion && (
                <div style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    marginTop: '12px',
                }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '4px' }}>
                        Observación:
                    </span>
                    <span style={{ fontSize: '13px', color: '#334155', fontWeight: '500', whiteSpace: 'pre-line' }}>
                        {observacion}
                    </span>
                </div>
            )}
        </div>
    );
});

export default ImagenPedidoTela;
