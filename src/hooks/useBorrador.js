import { useEffect, useRef, useState } from 'react';

// Borradores de formularios largos (P08-06, U02): guardan el estado en
// localStorage por formulario y por usuario, con versión y fecha, para
// recuperarlo tras sesión vencida, red caída o cierre accidental. No se
// guardan tokens ni nada ajeno a lo que el propio usuario escribió.

export const EXPIRACION_POR_DEFECTO_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const DEBOUNCE_MS = 400;

const claveCompleta = (clave, dueno) => `borrador:${clave}:${dueno ?? 'anon'}`;

/**
 * @param {string} clave   Nombre del formulario (p. ej. 'nueva-venta').
 * @param {*}      dueno   Identidad del usuario; hasta conocerla no se lee ni se escribe.
 * @param {number} version Esquema del borrador; al cambiarlo se descartan los anteriores.
 * @param {*}      datos   Estado serializable a guardar.
 * @param {boolean} hayContenido  Si es false no se crea borrador (formulario vacío).
 * @param {Function} restaurar    Se llama una vez con los datos si hay borrador vigente.
 * @returns {{ restaurado: ?{guardadoAt:number}, descartar: Function, limpiarTrasGuardar: Function }}
 *   descartar: borra el borrador y el formulario puede seguir autoguardando;
 *   limpiarTrasGuardar: tras un envío exitoso, borra y no reescribe lo ya
 *   enviado; si los datos cambian, el autoguardado continúa.
 */
export function useBorrador({
  clave,
  dueno,
  version = 1,
  datos,
  hayContenido = true,
  restaurar,
  expiracionMs = EXPIRACION_POR_DEFECTO_MS,
}) {
  const [restaurado, setRestaurado] = useState(null);
  const restauradoRef = useRef(false);
  const consumidoRef = useRef(null);
  const temporizadorRef = useRef(null);
  const restaurarRef = useRef(restaurar);
  restaurarRef.current = restaurar;

  // Restaurar una sola vez, cuando se conoce al dueño.
  useEffect(() => {
    if (restauradoRef.current || dueno == null) return;
    restauradoRef.current = true;
    const k = claveCompleta(clave, dueno);
    let borrador = null;
    try {
      borrador = JSON.parse(localStorage.getItem(k));
    } catch { /* contenido corrupto: se descarta */ }
    if (!borrador) return;
    const vigente = borrador.version === version
      && borrador.dueno === dueno
      && (Date.now() - (borrador.guardadoAt || 0)) < expiracionMs;
    if (!vigente) {
      try { localStorage.removeItem(k); } catch { /* best-effort */ }
      return;
    }
    setRestaurado({ guardadoAt: borrador.guardadoAt });
    restaurarRef.current?.(borrador.datos);
  }, [clave, dueno, version, expiracionMs]);

  // Autoguardar con debounce cuando cambian los datos serializados.
  let serializado = null;
  try {
    serializado = JSON.stringify(datos);
  } catch { /* datos no serializables: no se guarda */ }

  useEffect(() => {
    if (dueno == null || serializado == null || !hayContenido) return undefined;
    // Tras limpiarTrasGuardar no se reescribe lo ya enviado; en cuanto el
    // usuario cambia algo, el autoguardado continúa con normalidad.
    if (serializado === consumidoRef.current) return undefined;
    const k = claveCompleta(clave, dueno);
    temporizadorRef.current = setTimeout(() => {
      try {
        localStorage.setItem(k, JSON.stringify({ version, dueno, guardadoAt: Date.now(), datos }));
      } catch { /* sin espacio: el borrador es best-effort */ }
    }, DEBOUNCE_MS);
    return () => clearTimeout(temporizadorRef.current);
    // datos va dentro de serializado; la clave estable evita reescrituras por render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serializado, hayContenido, clave, dueno, version]);

  const borrar = () => {
    clearTimeout(temporizadorRef.current);
    try { localStorage.removeItem(claveCompleta(clave, dueno)); } catch { /* best-effort */ }
    setRestaurado(null);
  };

  const descartar = () => borrar();

  const limpiarTrasGuardar = () => {
    consumidoRef.current = serializado;
    borrar();
  };

  return { restaurado, descartar, limpiarTrasGuardar };
}
