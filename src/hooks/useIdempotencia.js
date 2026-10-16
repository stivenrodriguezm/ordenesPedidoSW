import { useCallback, useRef } from 'react'

const nuevaClave = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`)

/**
 * Clave Idempotency-Key estable por intento de envío (P03-06): reintentar el
 * MISMO contenido (p. ej. tras un timeout cuyo resultado es incierto) reusa la
 * clave y el servidor devuelve el resultado original sin duplicar el efecto.
 * Cambiar el contenido genera una clave nueva; tras un éxito se descarta.
 */
export const useIdempotencia = () => {
  const ultimo = useRef({ huella: null, clave: null })

  const cabeceras = useCallback((payload) => {
    const huella = JSON.stringify(payload)
    if (ultimo.current.huella !== huella) ultimo.current = { huella, clave: nuevaClave() }
    return { 'Idempotency-Key': ultimo.current.clave }
  }, [])

  const confirmar = useCallback(() => { ultimo.current = { huella: null, clave: null } }, [])

  return { cabeceras, confirmar }
}

// Interpretación de errores compartida (antes vivía aquí).
export { mensajeDeError } from '../services/errores'
