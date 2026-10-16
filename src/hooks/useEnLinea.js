import { useEffect, useState } from 'react';

// Estado de la conexión del dispositivo (P11-05). Sin red no se envía nada:
// no hay cola local, así que nunca se muestra como hecho algo no confirmado.
export function useEnLinea() {
    const [enLinea, setEnLinea] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
    useEffect(() => {
        const on = () => setEnLinea(true);
        const off = () => setEnLinea(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, []);
    return enLinea;
}
