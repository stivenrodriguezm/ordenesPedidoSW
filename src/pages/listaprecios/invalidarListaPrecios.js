// Una edición local refresca su colección, incluidos los conjuntos que heredan
// sus piezas. Los cambios globales (telas/múltiplos) sí refrescan toda la lista.
export function actualizarLineaEnCache(queryClient, lineaId, actualizar) {
  queryClient.setQueryData(['lp-linea', lineaId], anterior => anterior && actualizar(anterior));
  queryClient.setQueriesData({ queryKey: ['lp-lineas'] }, anterior => Array.isArray(anterior)
    ? anterior.map(l => l.id === lineaId ? actualizar(l) : l) : anterior);
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
    queryClient.invalidateQueries({ queryKey: lineaId == null ? ['lp-linea'] : ['lp-linea', lineaId] }),
    queryClient.invalidateQueries({ queryKey: ['listaprecios-catalogo'] }),
    queryClient.invalidateQueries({ queryKey: ['lp-precio-variante'] }),
    queryClient.invalidateQueries({ queryKey: ['lp-simulacion-componentes'] }),
  ]);
}
