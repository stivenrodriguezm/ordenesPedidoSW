import API from './api';

// ---- Catálogo (vista vendedor) ----

export const getCatalogo = async (params = {}) => {
  const response = await API.get('/listaprecios/catalogo/', { params });
  return response.data;
};

export const getCategoriasPublicas = async () => {
  const response = await API.get('/listaprecios/categorias-publicas/');
  return response.data;
};

// Recalcula el precio de una variante en vivo con los cargos opcionales
// activados (transporte, tomacorriente, etc.) — nunca expone costo/margen.
export const getPrecioVariante = async (varianteId, { grupo, opcionales } = {}) => {
  const params = {};
  if (grupo != null) params.grupo = grupo;
  if (opcionales && opcionales.length) params.opcionales = opcionales.join(',');
  const response = await API.get(`/listaprecios/variantes/${varianteId}/precio/`, { params });
  return response.data;
};

// ---- Categorías (admin — solo agrupan/etiquetan, no definen precio) ----

export const getCategorias = async () => {
  const response = await API.get('/listaprecios/categorias/');
  return response.data;
};

export const createCategoria = async (data) => {
  const response = await API.post('/listaprecios/categorias/', data);
  return response.data;
};

export const updateCategoria = async (id, data) => {
  const response = await API.patch(`/listaprecios/categorias/${id}/`, data);
  return response.data;
};

export const deleteCategoria = async (id) => {
  const response = await API.delete(`/listaprecios/categorias/${id}/`);
  return response.data;
};

export const getImpactoCategoria = async (id) => {
  const response = await API.get(`/listaprecios/categorias/${id}/impacto/`);
  return response.data;
};

// ---- Multiplicadores (catálogo con nombre libre, independiente de la categoría) ----

export const getMultiplicadores = async () => {
  const response = await API.get('/listaprecios/multiplicadores/');
  return response.data;
};

export const createMultiplicador = async (data) => {
  const response = await API.post('/listaprecios/multiplicadores/', data);
  return response.data;
};

export const updateMultiplicador = async (id, data) => {
  const response = await API.patch(`/listaprecios/multiplicadores/${id}/`, data);
  return response.data;
};

export const deleteMultiplicador = async (id) => {
  const response = await API.delete(`/listaprecios/multiplicadores/${id}/`);
  return response.data;
};

export const getImpactoMultiplicador = async (id) => {
  const response = await API.get(`/listaprecios/multiplicadores/${id}/impacto/`);
  return response.data;
};

export const simularMultiplicador = async (id, nuevoValor) => {
  const response = await API.post(`/listaprecios/multiplicadores/${id}/simular/`, { nuevo_valor: nuevoValor });
  return response.data;
};

// Asigna (o quita, con multiplicador: null) un multiplicador a muchas
// variantes de una vez — por categoría, por línea, o por una lista de ids.
export const asignarMultiplicadorMasivo = async (data) => {
  const response = await API.post('/listaprecios/variantes/asignar-multiplicador/', data);
  return response.data;
};

// ---- Grupos de tela (cada uno trae su propio precio_por_metro — es el
// mismo para cualquier categoría/tipo de producto) ----

export const getGruposTela = async () => {
  const response = await API.get('/listaprecios/grupos-tela/');
  return response.data;
};

export const createGrupoTela = async (data) => {
  const response = await API.post('/listaprecios/grupos-tela/', data);
  return response.data;
};

export const updateGrupoTela = async (id, data) => {
  const response = await API.patch(`/listaprecios/grupos-tela/${id}/`, data);
  return response.data;
};

export const deleteGrupoTela = async (id) => {
  const response = await API.delete(`/listaprecios/grupos-tela/${id}/`);
  return response.data;
};

export const getImpactoGrupoTela = async (id) => {
  const response = await API.get(`/listaprecios/grupos-tela/${id}/impacto/`);
  return response.data;
};

// ---- Líneas de producto ----

export const getLineas = async (params = {}) => {
  const response = await API.get('/listaprecios/lineas/', { params });
  return response.data;
};

export const getLinea = async (id, opciones) => {
  const response = await API.get(`/listaprecios/lineas/${id}/`, opciones);
  return response.data;
};

export const ordenarVariantes = async (lineaId, variantes, ordenAnterior) => {
  const response = await API.post(`/listaprecios/lineas/${lineaId}/orden-variantes/`, { variantes, orden_anterior: ordenAnterior });
  return response.data;
};

export const guardarComponentes = async (id, componentes) => {
  const response = await API.put(`/listaprecios/variantes/${id}/componentes/`, { componentes });
  return response.data;
};

export const crearAgrupacion = async (lineaId, data) => {
  const response = await API.post(`/listaprecios/lineas/${lineaId}/agrupaciones/`, data);
  return response.data;
};

export const simularComponentes = async (id, componentes) => {
  const response = await API.post(`/listaprecios/variantes/${id}/simular-componentes/`, { componentes });
  return response.data;
};

export const simularNuevaAgrupacion = async (lineaId, componentes) => {
  const response = await API.post(`/listaprecios/lineas/${lineaId}/simular-agrupacion/`, { componentes });
  return response.data;
};

export const createLinea = async (data) => {
  const response = await API.post('/listaprecios/lineas/', data);
  return response.data;
};

export const updateLinea = async (id, data) => {
  const response = await API.patch(`/listaprecios/lineas/${id}/`, data);
  return response.data;
};

export const deleteLinea = async (id) => {
  const response = await API.delete(`/listaprecios/lineas/${id}/`);
  return response.data;
};

// ---- Variantes ----

export const createVariante = async (data) => {
  const response = await API.post('/listaprecios/variantes/', data);
  return response.data;
};

export const updateVariante = async (id, data) => {
  const response = await API.patch(`/listaprecios/variantes/${id}/`, data);
  return response.data;
};

export const deleteVariante = async (id) => {
  const response = await API.delete(`/listaprecios/variantes/${id}/`);
  return response.data;
};

// ---- Cargos (transporte, instalación, modificadores...) ----

export const createCargo = async (data) => {
  const response = await API.post('/listaprecios/cargos/', data);
  return response.data;
};

export const updateCargo = async (id, data) => {
  const response = await API.patch(`/listaprecios/cargos/${id}/`, data);
  return response.data;
};

export const deleteCargo = async (id) => {
  const response = await API.delete(`/listaprecios/cargos/${id}/`);
  return response.data;
};

// ---- Precios por variante (overrides manuales) ----

export const createPrecioVariante = async (data) => {
  const response = await API.post('/listaprecios/precios/', data);
  return response.data;
};

export const updatePrecioVariante = async (id, data) => {
  const response = await API.patch(`/listaprecios/precios/${id}/`, data);
  return response.data;
};

export const deletePrecioVariante = async (id) => {
  const response = await API.delete(`/listaprecios/precios/${id}/`);
  return response.data;
};

// ---- Fotos ----

export const uploadListaPreciosFoto = async (formData) => {
  const response = await API.post('/listaprecios/upload-foto/', formData);
  return response.data;
};

// ---- Cotizaciones del servidor (P09-01, P09-04 / F01) ----

export const getCotizaciones = async (params = {}) => {
  const response = await API.get('/listaprecios/cotizaciones/', { params });
  return response.data;
};

export const getCotizacion = async (id) => {
  const response = await API.get(`/listaprecios/cotizaciones/${id}/`);
  return response.data;
};

export const createCotizacion = async (data) => {
  const response = await API.post('/listaprecios/cotizaciones/', data);
  return response.data;
};

export const updateCotizacion = async (id, data) => {
  const response = await API.patch(`/listaprecios/cotizaciones/${id}/`, data);
  return response.data;
};

export const cambiarEstadoCotizacion = async (id, estado) => {
  const response = await API.post(`/listaprecios/cotizaciones/${id}/cambiar-estado/`, { estado });
  return response.data;
};

export const convertirCotizacionAVenta = async (id, data = {}) => {
  const response = await API.post(`/listaprecios/cotizaciones/${id}/convertir-a-venta/`, data);
  return response.data;
};


// ---- Juegos compuestos y variantes especiales del juego (2026-10-09) ----

export const createEspecial = async (data) => {
  const response = await API.post('/listaprecios/especiales/', data);
  return response.data;
};

export const updateEspecial = async (id, data) => {
  const response = await API.patch(`/listaprecios/especiales/${id}/`, data);
  return response.data;
};

export const deleteEspecial = async (id) => {
  const response = await API.delete(`/listaprecios/especiales/${id}/`);
  return response.data;
};

export const getBibliotecaEspeciales = async () => {
  const response = await API.get('/listaprecios/especiales/biblioteca/');
  return response.data;
};
