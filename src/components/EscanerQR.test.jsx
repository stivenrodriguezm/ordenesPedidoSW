import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EscanerQR from './EscanerQR';
import VerificarRemisionQR from './VerificarRemisionQR';
import { unidadDeCodigo } from '../utils/remisiones';

vi.mock('jsqr', () => ({ default: vi.fn(() => ({ data: '3f2b8c1e-0000-4000-8000-000000000001' })) }));

const remision = {
    inventario_items_detalle: [
        { id_referencia: 'ME-1', producto_nombre: 'Mesa', qr_uuid: '3f2b8c1e-0000-4000-8000-000000000001' },
        { id_referencia: 'SI-1', producto_nombre: 'Silla', qr_uuid: null },
    ],
    items_manuales: [{ id: 1, cantidad: 2, referencia: 'Silla de pedido' }],
};

const original = {};
beforeEach(() => {
    original.mediaDevices = navigator.mediaDevices;
    original.getContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', { get: () => 4, configurable: true });
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue();
    HTMLCanvasElement.prototype.getContext = () => ({
        drawImage: () => {}, getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    });
});
afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: original.mediaDevices, configurable: true });
    HTMLCanvasElement.prototype.getContext = original.getContext;
});

const conCamara = (getUserMedia) => Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });

describe('Lector QR (P11-05)', () => {
    it('sin permiso explica cómo activarlo en iPhone', async () => {
        conCamara(vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' })));
        render(<EscanerQR alLeer={vi.fn()} cerrar={vi.fn()} />);
        expect(await screen.findByRole('alert')).toHaveTextContent('Ajustes → Safari → Cámara');
    });

    it('sin BarcodeDetector (Safari) lee con jsQR, una vez por etiqueta, y apaga la cámara al cerrar', async () => {
        const stop = vi.fn();
        conCamara(vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }));
        const alLeer = vi.fn();
        const { unmount } = render(<EscanerQR alLeer={alLeer} cerrar={vi.fn()} />);
        await waitFor(() => expect(alLeer).toHaveBeenCalledWith('3f2b8c1e-0000-4000-8000-000000000001'));
        await new Promise(r => setTimeout(r, 600));
        expect(alLeer).toHaveBeenCalledTimes(1);
        unmount();
        expect(stop).toHaveBeenCalled();
    });

    it('relaciona el código con la unidad de la remisión', () => {
        expect(unidadDeCodigo('3F2B8C1E-0000-4000-8000-000000000001', remision).id_referencia).toBe('ME-1');
        expect(unidadDeCodigo('item-si-1', remision).id_referencia).toBe('SI-1');
        expect(unidadDeCodigo('OTRO', remision)).toBeNull();
    });

    it('verificar: marca lo de la remisión y avisa lo que no va', async () => {
        const user = userEvent.setup();
        function Envoltura() {
            const [v, setV] = React.useState([]);
            return <VerificarRemisionQR remision={remision} verificados={v} setVerificados={setV} />;
        }
        render(<Envoltura />);
        await user.click(screen.getByRole('button', { name: /Verificar productos con QR/ }));
        await user.type(screen.getByLabelText('Código del producto'), 'SI-1{Enter}');
        expect(screen.getByText(/Verificados 1 de 2/)).toBeInTheDocument();
        await user.type(screen.getByLabelText('Código del producto'), 'XX-9{Enter}');
        expect(screen.getByRole('status')).toHaveTextContent('no va en esta remisión');
        expect(screen.getByText(/no tienen QR/)).toBeInTheDocument();
    });
});
