import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DescargarPedidoTela from './DescargarPedidoTela';
import { datosImagenTela, lineaDeTela } from './datosImagenTela';

const descargas = vi.fn();
vi.mock('../../utils/descargarImagen', async (original) => ({
    ...(await original()),
    descargarImagen: async (nodo, nombre) => descargas(nodo?.textContent, nombre),
}));

const pedido = {
    id: 77, proveedor_nombre: 'Textiles Andes', usuario_nombre: 'Laura', usuario_nombre_completo: 'Laura Gómez',
    fecha_creacion: '2026-10-05', orden_id: 512, venta_id: 9001, direccion_entrega: 'Bodega norte', observacion: 'Urgente',
    detalles: [{ tela: 'Afrodita - Color: Plata', cantidad: '12.50' }, { tela: 'Lino crudo', cantidad: '3.00' }],
};

describe('imagen del pedido de tela', () => {
    it('separa referencia, color y material de cada línea guardada', () => {
        expect(lineaDeTela('[CUERO] Napa - Color: Café')).toEqual({ cuero: true, referencia: 'Napa', color: 'Café' });
        expect(lineaDeTela('Afrodita - Color: Plata')).toEqual({ cuero: false, referencia: 'Afrodita', color: 'Plata' });
        expect(lineaDeTela('Lino crudo')).toEqual({ cuero: false, referencia: 'Lino crudo', color: '' });
    });

    it('arma los mismos textos que al crear el pedido', () => {
        expect(datosImagenTela(pedido)).toEqual({
            numero: 77, proveedor: 'Textiles Andes', solicitante: 'Laura Gómez', material: 'Tela', fecha: '5-oct-2026',
            orden: 512, venta: 9001, direccion: 'Bodega norte', observacion: 'Urgente',
            detalles: [
                { referencia: 'Afrodita', color: 'Plata', cantidad: 12.5, unidad: 'mts' },
                { referencia: 'Lino crudo', color: 'Standard', cantidad: 3, unidad: 'mts' },
            ],
        });
        const cuero = datosImagenTela({ ...pedido, usuario_nombre_completo: undefined, detalles: [{ tela: '[CUERO] Napa', cantidad: '40.00' }] });
        expect(cuero.material).toBe('Cuero');
        expect(cuero.solicitante).toBe('Laura');
        expect(cuero.detalles[0]).toEqual({ referencia: 'Napa', color: 'Standard', cantidad: 40, unidad: 'dm' });
    });

    it('descarga la imagen con el nombre de siempre', async () => {
        render(<DescargarPedidoTela pedido={pedido} />);
        fireEvent.click(screen.getByRole('button', { name: /descargar/i }));
        await waitFor(() => expect(descargas).toHaveBeenCalledTimes(1));
        const [texto, nombre] = descargas.mock.calls[0];
        expect(nombre).toBe('pedido_material_77.png');
        expect(texto).toContain('PEDIDO DE TELAS');
        expect(texto).toContain('Afrodita');
    });
});
