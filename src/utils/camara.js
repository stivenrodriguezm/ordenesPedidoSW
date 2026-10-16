// Cámara del navegador para leer QR (P11-05).
export const camaraDisponible = () => typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

// Mensaje entendible para cada falla de la cámara (la mayoría de usuarios usa iPhone: D04d).
export function mensajeCamara(err) {
    if (typeof window !== 'undefined' && window.isSecureContext === false) return 'La cámara solo funciona con la dirección segura (https).';
    switch (err?.name) {
        case 'NotAllowedError':
        case 'SecurityError':
            return 'No hay permiso para usar la cámara. En iPhone: Ajustes → Safari → Cámara → Permitir, y vuelve a intentarlo.';
        case 'NotFoundError':
        case 'OverconstrainedError':
            return 'No se encontró una cámara en este dispositivo.';
        case 'NotReadableError':
            return 'Otra aplicación está usando la cámara. Ciérrala y vuelve a intentarlo.';
        default:
            return 'No se pudo abrir la cámara. Escribe el código o vuelve a intentarlo.';
    }
}
