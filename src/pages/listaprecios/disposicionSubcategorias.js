export function aplicarDisposicionSubcategorias(client, datos) {
  const refs = new Set(datos.referencias);
  const actualizar = l => l && refs.has(l.referencia) ? { ...l, disposicion: datos } : l;
  client.setQueriesData({ queryKey: ['lp-referencias'] }, prev => prev?.map(r => refs.has(r.id) ? { ...r, disposicion: datos, linea: actualizar(r.linea) } : r));
  client.setQueriesData({ queryKey: ['lp-linea'] }, actualizar);
  client.setQueriesData({ queryKey: ['lp-lineas'] }, prev => prev?.map(actualizar));
}

export function ordenarSubcategorias(items, disposicion = {}) {
  const posiciones = new Map((disposicion.orden || []).map((id, i) => [id, i]));
  return items.filter(v => !(disposicion.retiradas || []).includes(v.subcategoria)).sort((a, b) =>
    (posiciones.get(a.subcategoria) ?? posiciones.size) - (posiciones.get(b.subcategoria) ?? posiciones.size) || a.orden - b.orden || a.id - b.id);
}
