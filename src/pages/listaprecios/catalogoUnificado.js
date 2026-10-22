import { normalizarBusqueda } from '../../utils/consultaPrecios';

export const claveSubcategoria = v => v.subcategoria != null ? `sub-${v.subcategoria}` : `ficha-${v.id}`;

export function subcategoriasCatalogo(variantes = []) {
  const filas = new Map();
  for (const v of variantes) {
    const clave = claveSubcategoria(v);
    if (!filas.has(clave)) filas.set(clave, { clave, nombre: v.nombre, variantes: [] });
    filas.get(clave).variantes.push(v);
  }
  return [...filas.values()];
}

export const nombresProveedores = proveedores => (proveedores || []).map(p => p.nombre).filter(Boolean).join(' · ');

// Una referencia comercial reúne todas sus fichas, sin convertir el ID visual
// en un ID del servidor ni mezclar costos, fotos, notas o proveedores.
export function unificarCatalogo(lineas = []) {
  const grupos = new Map();
  for (const linea of lineas) {
    const id = `referencia-${normalizarBusqueda(linea.nombre).replace(/\s+/g, ' ') || linea.id}`;
    if (!grupos.has(id)) grupos.set(id, { ...linea, id, referencia: null, variantes: [], fotos: [] });
    const grupo = grupos.get(id);
    for (const foto of linea.fotos || []) if (!grupo.fotos.includes(foto)) grupo.fotos.push(foto);
    for (const v of linea.variantes || []) {
      grupo.variantes.push({ ...v,
        proveedores: v.proveedores ?? (linea.proveedor_nombre ? [{ id: linea.proveedor, nombre: linea.proveedor_nombre }] : []),
        origen: { lineaId: linea.id, referenciaId: v.referencia ?? linea.referencia,
          proveedorId: linea.proveedor, proveedorNombre: linea.proveedor_nombre,
          esDecorativo: !!linea.es_decorativo || linea.slug === 'decorativos', fotos: linea.fotos || [], notas: linea.notas || '' },
      });
    }
  }
  return [...grupos.values()].map(grupo => {
    const posiciones = new Map((grupo.disposicion?.orden || []).map((id, i) => [id, i]));
    grupo.variantes.sort((a, b) => (posiciones.get(a.subcategoria) ?? posiciones.size) - (posiciones.get(b.subcategoria) ?? posiciones.size));
    const proveedores = [...new Map(grupo.variantes.flatMap(v => v.proveedores).map(p => [p.id ?? p.nombre, p])).values()];
    return { ...grupo, proveedores, proveedor_nombre: proveedores.length === 1 ? proveedores[0].nombre : proveedores.length ? `${proveedores.length} proveedores` : '' };
  });
}
