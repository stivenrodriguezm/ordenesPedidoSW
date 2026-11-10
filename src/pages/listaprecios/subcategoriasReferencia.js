import { claveSubcategoria } from '../../utils/subcategorias';

const comparar = (a, b) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });

// Agrupar visualmente nunca mezcla costos: cada opción conserva la Referencia exacta.
// (2026-11-10) Cada referencia (proveedor) tiene sus propias subcategorías: una fila reúne las del
// mismo nombre y categoría de los proveedores de la referencia. `subDe` dice cuál es la de cada
// proveedor (id de su subcategoría) e `ids` son todas las de la fila.
export function subcategoriasReferencia(referencias, incluirRetiradas = false) {
  const filas = new Map();
  for (const ref of referencias) {
    for (const sub of ref.subcategorias || []) {
      const clave = claveSubcategoria(sub);
      if (!filas.has(clave)) filas.set(clave, { ...sub, clave, ids: [], subDe: new Map(), referencias: [] });
      const fila = filas.get(clave);
      if (!fila.ids.includes(sub.id)) fila.ids.push(sub.id);
      fila.subDe.set(ref.id, sub.id);
      fila.referencias.push(ref);
    }
  }
  const config = referencias[0]?.disposicion || {};
  const posiciones = new Map((config.orden || []).map((id, i) => [id, i]));
  const posicion = (f) => Math.min(...f.ids.map((id) => posiciones.get(id) ?? posiciones.size));
  const retirada = (f) => f.ids.every((id) => (config.retiradas || []).includes(id));
  return [...filas.values()].filter(s => incluirRetiradas || !retirada(s)).sort((a, b) => posicion(a) - posicion(b) || comparar(a.categoria_nombre || '', b.categoria_nombre || '') || comparar(a.nombre, b.nombre));
}

export function proveedorInicial(fila, recordado) {
  if (recordado === '') return '';
  if (fila.referencias.some(r => r.id === Number(recordado))) return Number(recordado);
  const configuradas = fila.referencias.filter(r => r.linea?.variantes.some(v => v.subcategoria === fila.subDe.get(r.id) && v.costo_confirmado));
  if (configuradas.length === 1) return configuradas[0].id;
  return fila.referencias.length === 1 ? fila.referencias[0].id : '';
}

/** El orden de la lista guarda ids de subcategoría: una fila ocupa el lugar de todas las suyas. */
export const idsEnOrden = (filas) => filas.flatMap((f) => f.ids);

export function etiquetaProveedor(ref, opciones) {
  const repetido = opciones.filter(r => r.proveedor === ref.proveedor && r.proveedor_nombre === ref.proveedor_nombre).length > 1;
  return `${ref.proveedor_nombre}${repetido ? ` · Ref. #${ref.id}` : ''}`;
}
