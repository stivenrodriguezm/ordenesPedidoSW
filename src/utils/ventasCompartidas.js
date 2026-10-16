// Reparto de ventas compartidas para métricas personales (misma regla que el
// backend, ordenes/estadisticas.py): Total / N participantes ÚNICOS. Listados y
// totales de empresa conservan el 100 %.

/** Ids únicos de quienes participan en la venta (principal + compartidos). */
export const participantesVenta = (venta) => {
  const ids = new Set()
  if (venta?.vendedor != null) ids.add(String(venta.vendedor))
  for (const id of venta?.vendedores_compartidos || []) ids.add(String(id))
  return ids
}

/** Cantidad de participantes únicos (mínimo 1 para no dividir por cero). */
export const numeroParticipantes = (venta) => Math.max(participantesVenta(venta).size, 1)

/**
 * Parte de la venta que corresponde a quienes se están contando (1 = la venta completa).
 * `cuenta(id)` dice si un participante entra en el filtro; sin `cuenta` (empresa
 * completa) la venta vale el 100 %. Ej.: venta de 1.000.000 entre dos, filtrando a
 * uno solo → 0,5.
 */
export const fraccionVenta = (venta, cuenta) => {
  if (!cuenta) return 1
  const ids = participantesVenta(venta)
  if (!ids.size) return 0
  let incluidos = 0
  for (const id of ids) if (cuenta(id)) incluidos += 1
  return incluidos / ids.size
}
