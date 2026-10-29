import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DescargarOrdenPedido from './DescargarOrdenPedido';
import { datosImagenOrden } from './datosImagenOrden';

const descargas = vi.fn();
vi.mock('../../utils/descargarImagen', async (original) => ({
    ...(await original()),
    descargarImagen: async (nodo, nombre) => descargas(nodo?.textContent, nombre),
}));

const orden = {
    id: 512, proveedor_nombre: 'Muebles Sur', vendedor: 'Laura', venta: 9001, es_feria_hogar: false,
    fecha_pedido: '2026-10-05', fecha_esperada: '2026-11-20', observacion: 'Entregar en bodega',
};
const detalles = [
    { cantidad: 6, referencia: 'Silla Roma', subcategoria_nombre: 'Juego de 6', especificaciones: 'Tela gris' },
];

describe('DescargarOrdenPedido', () => {
    it('arma los mismos textos de la imagen que al crear la orden', () => {
        expect(datosImagenOrden(orden, detalles)).toEqual({
            numero: 512, proveedor: 'Muebles Sur', vendedor: 'Laura', ordenCompra: 9001,
            fechaPedido: '05-oct-2026', fechaEntrega: '20-nov-2026',
            productos: [{ cantidad: 6, referencia: 'Silla Roma', subcategoria: 'Juego de 6', descripcion: 'Tela gris' }],
            nota: 'Entregar en bodega',
        });
        expect(datosImagenOrden({ ...orden, venta: null, es_feria_hogar: true }, []).ordenCompra).toBe('Feria del hogar');
        expect(datosImagenOrden({ ...orden, es_feria_hogar: true }, []).ordenCompra).toBe('9001 (Feria del hogar)');
        expect(datosImagenOrden({ ...orden, venta: null }, []).ordenCompra).toBe('No especificado');
    });

    it('descarga la imagen con el nombre de siempre', async () => {
        render(<DescargarOrdenPedido orden={orden} detalles={detalles} />);
        fireEvent.click(screen.getByRole('button', { name: /descargar/i }));
        await waitFor(() => expect(descargas).toHaveBeenCalledTimes(1));
        const [texto, nombre] = descargas.mock.calls[0];
        expect(nombre).toBe('pedido_512.png');
        expect(texto).toContain('No. 512');
        expect(texto).toContain('Silla Roma');
        await waitFor(() => expect(screen.getByRole('button', { name: /descargar/i })).not.toBeDisabled());
    });

    it('espera a que carguen las líneas', () => {
        render(<DescargarOrdenPedido orden={orden} detalles={null} />);
        expect(screen.getByRole('button', { name: /descargar/i })).toBeDisabled();
    });
});
