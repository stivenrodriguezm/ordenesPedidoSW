import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExpedienteVenta from './ExpedienteVenta';

vi.mock('./ProductosVenta', () => ({ default: ({ ventaId }) => <div>Panel de productos de la venta {ventaId}</div> }));

const venta = {
    id: 2533, valor_total: '6300000', saldo: '0', abono: '6300000', fecha_entrega: '2026-10-02',
    cotizaciones: [], ordenes_pedido: [], remisiones: [],
    lineas: [{ id: 1, cantidad: 2, producto_nombre: 'Moon', variante_nombre: 'Sala L', texto_cliente: 'Sala en L gris', precio_lista_unitario: '100' }],
};

describe('ExpedienteVenta (rediseño 2026-10-07)', () => {
    it('muestra la cotización de origen cuando existe', () => {
        render(<ExpedienteVenta venta={{ ...venta, cotizaciones: [{ id: 9, numero: 'COT-0009', fecha_creacion: '2026-09-01', total: '100', estado: 'convertida' }] }} />);
        expect(screen.getByTestId('expediente-cotizacion-banner')).toHaveTextContent('COT-0009');
    });

    it('ya no muestra la línea de tiempo ni la alerta de siguiente acción', () => {
        render(<ExpedienteVenta venta={venta} hasPermission={() => true} />);
        expect(screen.queryByText(/Línea de Tiempo/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Generar órdenes de pedido/)).not.toBeInTheDocument();
    });

    it('con permiso de precios usa el panel de productos en la misma vista', () => {
        render(<ExpedienteVenta venta={venta} hasPermission={(p) => p === 'VER_PRECIOS_VENTA'} />);
        expect(screen.getByText('Panel de productos de la venta 2533')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('sin permiso de precios lista los productos sin valores', () => {
        render(<ExpedienteVenta venta={venta} hasPermission={() => false} />);
        expect(screen.getByText('Moon · Sala L')).toBeInTheDocument();
        expect(screen.getByText('Sala en L gris')).toBeInTheDocument();
        expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Panel de productos/)).not.toBeInTheDocument();
    });
});
