// Recorre un listado paginado de DRF pidiendo page=1..n (H25). Solo para
// catálogos pequeños que de verdad se necesitan completos (p. ej. proveedores
// en selectores) y para exportaciones; para listas grandes usar búsqueda en
// servidor. No sigue el `next` absoluto: detrás del proxy podría venir con
// otro esquema u host.
const MAX_PAGINAS = 50;
const TAMANO_PAGINA = 100; // max_page_size del API: pedir más se recorta a 100

export class ListadoDemasiadoGrande extends Error {
  constructor(filas) {
    super(`El listado supera ${filas} filas. Acota los filtros (por ejemplo, el rango de fechas) e intenta de nuevo.`);
    this.name = 'ListadoDemasiadoGrande';
  }
}

// `extraer` adapta respuestas que anidan la página (p. ej. caja → movimientos).
// Con `estricto`, superar `maxPaginas` lanza ListadoDemasiadoGrande en vez de
// devolver un listado incompleto (una exportación no debe recortarse sin aviso).
export const obtenerTodasLasPaginas = async (api, url, params = {}, opciones = {}) => {
  const { extraer = (datos) => datos, maxPaginas = MAX_PAGINAS, estricto = false } = opciones;
  const resultados = [];
  for (let pagina = 1; ; pagina += 1) {
    const respuesta = await api.get(url, { params: { ...params, page_size: TAMANO_PAGINA, page: pagina } });
    const datos = extraer(respuesta.data);
    if (Array.isArray(datos)) return datos; // endpoint sin paginación
    resultados.push(...(datos.results || []));
    if (!datos.next) break;
    if (pagina >= maxPaginas) {
      if (estricto) throw new ListadoDemasiadoGrande(maxPaginas * TAMANO_PAGINA);
      break;
    }
  }
  return resultados;
};
