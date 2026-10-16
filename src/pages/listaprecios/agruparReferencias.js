import { normalizarBusqueda } from '../../utils/consultaPrecios';

export function agruparReferencias(referencias, modo) {
  const grupos = new Map();
  for (const ref of referencias) {
    const nombre = modo === 'proveedor' ? ref.proveedor_nombre : ref.nombre;
    const clave = modo === 'proveedor' ? `proveedor-${ref.proveedor ?? ref.proveedor_nombre}` : `referencia-${normalizarBusqueda(nombre).trim().replace(/\s+/g, ' ')}`;
    if (!grupos.has(clave)) grupos.set(clave, { clave, nombre, referencias: [] });
    grupos.get(clave).referencias.push(ref);
  }
  const comparar = (a, b) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
  return [...grupos.values()].sort((a, b) => comparar(a.nombre, b.nombre)).map(g => ({ ...g,
    referencias: g.referencias.sort((a, b) => comparar(modo === 'proveedor' ? a.nombre : a.proveedor_nombre, modo === 'proveedor' ? b.nombre : b.proveedor_nombre) || a.id - b.id),
  }));
}
