import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VentaComision from './VentaComision';
import { TelaProducto } from '../RemisionProductos';

vi.mock('../../services/nominaService', () => ({
    ventaDeLinea: vi.fn().mockResolvedValue({
        venta: { id: 7, cliente: 'Ana', direccion: 'Calle 10 # 5-20', barrio: 'El Prado', ciudad: 'Barranquilla', vendedor: 'Luis', compartida_con: [], sede: 'Lottus 1', estado: 'pendiente', valor_total: '414.00',
            valor_lista: '460.00', abono: '200.00', saldo: '214.00', productos_confirmados: true },
        productos: [{ id: 1, tipo: 'producto', nombre: 'Sofá · Tres puestos', categoria: 'Sala', referencia: 'Alaska', proveedor: 'Fábrica', cantidad: 2,
            grupo_tela: 'Grupo 1', tela: 'Tela Lino · color Arena', precio_lista_unitario: '230.00', precio_lista_total: '460.00', precio_venta: '414.00', descuento: '46.00' }],
        totales: { precio_lista: '460.00', precio_venta: '414.00', productos_sin_precio_lista: 0, lista_cuadra: true, venta_cuadra: true },
        pagos: [{ recibo: 12, fecha: '2026-10-01', metodo: 'Efectivo', valor: '200.00', estado: 'Confirmado' },
            { recibo: 13, fecha: '2026-10-02', metodo: 'Davivienda', valor: '100.00', estado: 'Pendiente' }],
        pedidos: [{ id: 301, proveedor: 'Fábrica', estado: 'pendiente', estado_nombre: 'Pendiente', fecha_creacion: '2026-10-02', fecha_esperada: '2026-10-20', tela: '',
            detalles: [{ referencia: 'Alaska', subcategoria: 'Sofá 3 puestos', cantidad: 2, especificaciones: 'Medidas especiales' }] }],
        pedidos_tela: [{ id: 88, proveedor: 'Telas ficticias', estado: 'Anulado', fecha_creacion: '2026-10-03', orden: 301, direccion: 'Fábrica',
            detalles: [{ tela: 'Lino Arena', cantidad: '8.00', unidad: 'm' }] }],
    }),
}));

describe('Validar una comisión contra la venta', () => {
    it('muestra productos con precio de lista, cuadres y pagos', async () => {
        render(<QueryClientProvider client={new QueryClient()}><VentaComision lineaId={5} /></QueryClientProvider>);
        expect(await screen.findByText('Sofá · Tres puestos')).toBeInTheDocument();
        expect(screen.getByText('Tela Lino · color Arena')).toBeInTheDocument();
        expect(screen.getByText('Precio de lista cuadra con la venta')).toBeInTheDocument();
        expect(screen.getByText('RC 12')).toBeInTheDocument();
        // (2026-10-28) Dirección del cliente, todo lo pedido y los abonos con su estado; sin columna Desc.
        expect(screen.getByText('Calle 10 # 5-20 · El Prado · Barranquilla')).toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: 'Desc.' })).not.toBeInTheDocument();
        const pedido = screen.getByText('OP 301').closest('tr');
        expect(pedido).toHaveTextContent('2 × Alaska · Sofá 3 puestos');
        expect(pedido).toHaveTextContent('Pendiente');
        const tela = screen.getByText('PT 88').closest('tr');
        expect(tela).toHaveTextContent('Lino Arena · 8 m');
        expect(tela).toHaveClass('is-anulado');
        expect(screen.getByText('RC 13').closest('tr')).toHaveTextContent('Pendiente');
        expect(screen.getByText(/\+ \$\s?100 pendiente/)).toBeInTheDocument();
    });
});

describe('Tela opcional en la remisión', () => {
    it('se confirma con el interruptor y al apagarlo queda vacía', () => {
        const cambios = vi.fn();
        function Prueba() {
            const [tela, setTela] = useState('');
            return <TelaProducto value={tela} onChange={t => { cambios(t); setTela(t); }} />;
        }
        render(<Prueba />);
        const interruptor = screen.getByRole('switch', { name: '¿Lleva tela o cuero?' });
        expect(screen.queryByLabelText('Tapizado (tela o cuero)')).not.toBeInTheDocument();
        fireEvent.click(interruptor);
        fireEvent.change(screen.getByLabelText('Tapizado (tela o cuero)'), { target: { value: 'Cuero Napoli' } });
        fireEvent.click(screen.getByRole('switch', { name: 'Lleva tela o cuero' }));
        expect(cambios).toHaveBeenLastCalledWith('');
        expect(screen.queryByLabelText('Tapizado (tela o cuero)')).not.toBeInTheDocument();
    });
});
