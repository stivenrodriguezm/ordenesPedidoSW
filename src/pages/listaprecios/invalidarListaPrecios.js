// Una edición local refresca su colección, incluidos los conjuntos que heredan
// sus piezas. Los cambios globales (telas/múltiplos) sí refrescan toda la lista.
export function actualizarLineaEnCache(queryClient, lineaId, actualizar) {
  queryClient.setQueryData(['lp-linea', lineaId], anterior => anterior && actualizar(anterior));
  queryClient.setQueriesData({ queryKey: ['lp-lineas'] }, anterior => Array.isArray(anterior)
    ? anterior.map(l => l.id === lineaId ? actualizar(l) : l) : anterior);
  queryClient.setQueriesData({ queryKey: ['lp-referencias'] }, anterior => Array.isArray(anterior)
    ? anterior.map(r => r.linea?.id === lineaId ? { ...r, linea: actualizar(r.linea) } : r) : anterior);
}

// Conjuntos de otras fichas (otro proveedor de la misma referencia) que usan piezas de esta.
function conjuntosQueUsan(queryClient, lineaId) {
  const ids = new Set((queryClient.getQueryData(['lp-linea', lineaId])?.variantes || []).map(v => v.id));
  return queryClient.getQueriesData({ queryKey: ['lp-linea'] })
    .filter(([clave, datos]) => clave[1] !== lineaId && datos?.variantes?.some(v => v.componentes?.some(c => ids.has(c.variante))))
    .map(([clave]) => clave[1]);
}

export default function invalidarListaPrecios(queryClient, lineaId, variante) {
  if (lineaId != null && variante?.id) {
    actualizarLineaEnCache(queryClient, lineaId, anterior => ({
      ...anterior, variantes: anterior.variantes.map(v => v.id === variante.id ? { ...v, ...variante } : v),
    }));
  }
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['lp-especiales-biblioteca'] }),
    queryClient.invalidateQueries({ queryKey: ['lp-lineas'], ...(lineaId == null ? {} : { refetchType: 'none' }) }),
    queryClient.invalidateQueries({ queryKey: ['lp-referencias'], ...(lineaId == null ? {} : { refetchType: 'none' }) }),
    queryClient.invalidateQueries({ queryKey: lineaId == null ? ['lp-linea'] : ['lp-linea', lineaId] }),
    ...(lineaId == null ? [] : conjuntosQueUsan(queryClient, lineaId).map(id => queryClient.invalidateQueries({ queryKey: ['lp-linea', id] }))),
    queryClient.invalidateQueries({ queryKey: ['listaprecios-catalogo'] }),
    queryClient.invalidateQueries({ queryKey: ['productos-venta-catalogo'] }),
    queryClient.invalidateQueries({ queryKey: ['lp-precio-variante'] }),
    queryClient.invalidateQueries({ queryKey: ['lp-simulacion-componentes'] }),
  ]);
}
