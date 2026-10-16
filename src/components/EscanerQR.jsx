import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui';
import { camaraDisponible, mensajeCamara } from '../utils/camara';
import './EscanerQR.css';

async function crearLector() {
    // BarcodeDetector nativo donde existe (Chrome en Android); en Safari de iPhone, jsQR.
    if ('BarcodeDetector' in window) {
        try {
            const formatos = await window.BarcodeDetector.getSupportedFormats();
            if (formatos.includes('qr_code')) {
                const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
                return async (video) => (await detector.detect(video))[0]?.rawValue || null;
            }
        } catch { /* se usa jsQR */ }
    }
    const { default: jsQR } = await import('jsqr');
    const lienzo = document.createElement('canvas');
    const ctx = lienzo.getContext('2d', { willReadFrequently: true });
    return async (video) => {
        const escala = Math.min(1, 640 / (video.videoWidth || 640));
        lienzo.width = Math.round((video.videoWidth || 640) * escala);
        lienzo.height = Math.round((video.videoHeight || 480) * escala);
        ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);
        const img = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
        return jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data || null;
    };
}

/**
 * Lector QR con la cámara trasera (P11-05). Llama a `alLeer(texto)` por cada
 * código; la misma etiqueta frente a la cámara no se repite antes de 3 s (el
 * servidor tampoco duplica). Al cerrar se apaga la cámara.
 */
export default function EscanerQR({ alLeer, cerrar }) {
    const video = useRef(null);
    const alLeerRef = useRef(alLeer);
    alLeerRef.current = alLeer;
    const [estado, setEstado] = useState('abriendo');
    const [error, setError] = useState('');
    const [destello, setDestello] = useState(false);

    useEffect(() => {
        let stream, timer, activo = true;
        const ultimo = { codigo: '', t: 0 };
        (async () => {
            try {
                if (!camaraDisponible()) throw Object.assign(new Error('sin cámara'), { name: 'NotFoundError' });
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
                if (!activo) return;
                video.current.srcObject = stream;
                await video.current.play();
                const leer = await crearLector();
                if (!activo) return;
                setEstado('leyendo');
                timer = setInterval(async () => {
                    if (!video.current || video.current.readyState < 2) return;
                    try {
                        const texto = await leer(video.current);
                        const ahora = Date.now();
                        if (texto && (texto !== ultimo.codigo || ahora - ultimo.t > 3000)) {
                            ultimo.codigo = texto;
                            ultimo.t = ahora;
                            setDestello(true);
                            setTimeout(() => setDestello(false), 250);
                            navigator.vibrate?.(60);
                            alLeerRef.current(texto);
                        }
                    } catch { /* cuadro sin código */ }
                }, 250);
            } catch (err) {
                if (activo) { setError(mensajeCamara(err)); setEstado('error'); }
            }
        })();
        return () => { activo = false; clearInterval(timer); stream?.getTracks().forEach(t => t.stop()); };
    }, []);

    return (
        <div className="escaner-qr">
            {error ? <p role="alert" className="escaner-qr__error">{error}</p> : (
                <div className={`escaner-qr__marco${destello ? ' is-leido' : ''}`}>
                    <video ref={video} muted playsInline autoPlay aria-label="Vista de la cámara" />
                    <span className="escaner-qr__guia" aria-hidden="true" />
                    {estado === 'abriendo' && <span className="escaner-qr__estado" role="status">Abriendo la cámara…</span>}
                </div>
            )}
            <Button variant="secondary" onClick={cerrar}>Cerrar cámara</Button>
        </div>
    );
}
