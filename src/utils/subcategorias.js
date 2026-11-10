// Subcategorías propias de cada referencia (2026-11-10): dos referencias pueden tener cada una su
// «Sofá 3 puestos» (registros distintos). En listas y filtros del catálogo se muestran una sola vez
// por nombre y categoría; filtrar por una incluye todas las del mismo nombre.
const normalizar = (texto) => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

export const claveSubcategoria = (s) => `${s.categoria}|${normalizar(s.nombre)}`;

/** Una opción por nombre y categoría, con todos sus ids. `preferidos`: ids que deben quedar como
 *  valor de su opción (p. ej. el que ya tiene elegido un formulario). */
export function agruparSubcategorias(lista = [], preferidos = []) {
    const elegidos = new Set([].concat(preferidos).filter((v) => v !== '' && v != null).map(String));
    const grupos = new Map();
    for (const s of lista) {
        const clave = claveSubcategoria(s);
        const g = grupos.get(clave);
        if (!g) grupos.set(clave, { ...s, ids: [s.id] });
        else {
            g.ids.push(s.id);
            if (elegidos.has(String(s.id))) Object.assign(g, { ...s, ids: g.ids });
        }
    }
    return [...grupos.values()];
}

/** Ids con el mismo nombre y categoría que `id` (incluido). */
export function idsMismoNombre(lista = [], id) {
    const base = lista.find((s) => String(s.id) === String(id));
    if (!base) return new Set(id === '' || id == null ? [] : [String(id)]);
    const clave = claveSubcategoria(base);
    return new Set(lista.filter((s) => claveSubcategoria(s) === clave).map((s) => String(s.id)));
}
