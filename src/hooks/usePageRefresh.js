/**
 * usePageRefresh — Hook que ejecuta un callback cada vez que:
 * - El componente se monta (carga inicial)
 * - La pestaña/ventana vuelve a ser visible (el usuario regresa)
 *
 * Uso:
 *   usePageRefresh(fetchData);
 *
 * Esto garantiza que los datos nunca queden vacíos después de navegar entre páginas.
 */
import { useEffect, useRef } from "react";

export const usePageRefresh = (callback, deps = []) => {
    const callbackRef = useRef(callback);

    // Mantener la referencia actualizada sin re-registrar el listener
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        // Carga inicial
        callbackRef.current();

        // Refrescar cuando la pestaña vuelve a ser visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                callbackRef.current();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
};

export default usePageRefresh;
