export const normalizarBusqueda = (valor = '') => String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Índice de búsqueda (2026-10-15): el texto normalizado de cada producto se arma una sola vez
// por catálogo, no en cada tecla.
export function indexarCatalogo(lineas = []) {
  return lineas.map((linea) => ({
    linea,
    nombre: normalizarBusqueda(linea.nombre),
    variantes: (linea.variantes || []).map((v) => ({
      v, texto: normalizarBusqueda([linea.nombre, linea.notas, v.nombre, v.categoria_nombre, v.componentes, ...(v.notas || [])].join(' ')),
    })),
  }));
}

// Filtra por categoría y palabras; primero las referencias cuyo nombre empieza por lo escrito.
export function buscarCatalogo(indice, categoria = '', busqueda = '') {
  const consulta = normalizarBusqueda(busqueda);
  const palabras = consulta.split(/\s+/).filter(Boolean);
  const resultado = [];
  indice.forEach((item, orden) => {
    const variantes = item.variantes.filter(({ v, texto }) => (!categoria || String(v.categoria) === String(categoria)) && palabras.every((p) => texto.includes(p)));
    if (!variantes.length) return;
    const puntaje = !palabras.length ? 0 : item.nombre.startsWith(consulta) ? 3 : item.nombre.split(' ').some((w) => w.startsWith(palabras[0])) ? 2 : 1;
    resultado.push({ puntaje, orden, linea: { ...item.linea, variantes: variantes.map((x) => x.v) } });
  });
  return resultado.sort((a, b) => b.puntaje - a.puntaje || a.orden - b.orden).map((r) => r.linea);
}

// Nunca sustituir una tela sin avisar. Un precio único no depende de tela.
export function filaDeGrupo(variante, grupoId) {
  const filas = variante?.precios || [];
  return filas.find((p) => p.grupo === grupoId) || (filas.length === 1 && filas[0].grupo == null ? filas[0] : null);
}

export const precioValido = (valor) => valor != null && valor !== '' && Number.isFinite(Number(valor)) && Number(valor) >= 0;


export const notasCotizacion = (item) => [item.conjuntoNombre ? `Conjunto: ${item.conjuntoNombre}` : '', item.componentes ? `Incluye: ${item.componentes}` : '', item.notas].filter(Boolean).join(' · ');

// «Cojines incluidos» (2026-10-15), misma regla que el servidor (listaprecios/decorativos.py):
// cada unidad de un producto con «Decorativos x2» cubre 2 decorativos; cada decorativo se cubre
// hasta su precio en grupo 2 (topeIncluido). Si hay más que el cupo, quedan incluidos los de
// mayor valor cubierto. Devuelve {id del ítem: {unidades, valor}}.
export function decorativosIncluidos(items = []) {
  const cupo = items.reduce((s, i) => s + (Number(i.decorativosIncluidos) || 0) * (Number(i.cantidad) || 0), 0);
  const unidades = [];
  items.forEach((i) => {
    if (!i.esDecorativo) return;
    const tope = Math.max(0, Math.min(Number(i.topeIncluido) || 0, Number(i.precioUnitario) || 0));
    for (let k = 0; k < (Number(i.cantidad) || 0); k += 1) unidades.push({ id: i.id, tope, orden: unidades.length });
  });
  const resultado = {};
  unidades.sort((a, b) => b.tope - a.tope || a.orden - b.orden).slice(0, cupo).filter((u) => u.tope > 0).forEach((u) => {
    resultado[u.id] = resultado[u.id] || { unidades: 0, valor: 0 };
    resultado[u.id].unidades += 1;
    resultado[u.id].valor += u.tope;
  });
  return resultado;
}
