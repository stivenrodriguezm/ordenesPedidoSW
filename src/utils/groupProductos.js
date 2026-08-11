/**
 * Agrupa una lista plana de productos (items_inventario) que sean idénticos
 * (misma referencia, variación, categoría, subcategoría y costo) en una sola
 * entrada con `cantidad`, para mostrar "x2", "x6" en vez de filas repetidas.
 */
export function groupProductos(productos = []) {
  const map = new Map();
  const order = [];
  productos.forEach((p) => {
    const key = [
      p.referencia_nombre || '',
      p.variacion || '',
      p.categoria_nombre || '',
      p.subcategoria_nombre || '',
      p.costo,
    ].join('|');
    if (map.has(key)) {
      map.get(key).cantidad += 1;
    } else {
      const entry = { ...p, cantidad: 1 };
      map.set(key, entry);
      order.push(key);
    }
  });
  return order.map((key) => map.get(key));
}
