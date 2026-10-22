const comparar = (a, b) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });

// Agrupar visualmente nunca mezcla costos: cada opción conserva la Referencia exacta.
export function subcategoriasReferencia(referencias, incluirRetiradas = false) {
  const filas = new Map();
  for (const ref of referencias) {
    for (const sub of ref.subcategorias || []) {
      if (!filas.has(sub.id)) filas.set(sub.id, { ...sub, referencias: [] });
      filas.get(sub.id).referencias.push(ref);
    }
  }
  const config = referencias[0]?.disposicion || {};
  const posiciones = new Map((config.orden || []).map((id, i) => [id, i]));
  return [...filas.values()].filter(s => incluirRetiradas || !(config.retiradas || []).includes(s.id)).sort((a, b) => (posiciones.get(a.id) ?? posiciones.size) - (posiciones.get(b.id) ?? posiciones.size) || comparar(a.categoria_nombre || '', b.categoria_nombre || '') || comparar(a.nombre, b.nombre));
}

export function proveedorInicial(fila, recordado) {
  if (recordado === '') return '';
  if (fila.referencias.some(r => r.id === Number(recordado))) return Number(recordado);
  const configuradas = fila.referencias.filter(r => r.linea?.variantes.some(v => v.subcategoria === fila.id && v.costo_confirmado));
  if (configuradas.length === 1) return configuradas[0].id;
  return fila.referencias.length === 1 ? fila.referencias[0].id : '';
}

export function etiquetaProveedor(ref, opciones) {
  const repetido = opciones.filter(r => r.proveedor === ref.proveedor && r.proveedor_nombre === ref.proveedor_nombre).length > 1;
  return `${ref.proveedor_nombre}${repetido ? ` · Ref. #${ref.id}` : ''}`;
}
