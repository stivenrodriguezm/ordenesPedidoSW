import API from './api';

// Nómina de asesores (D12a). Cada operación de cambio devuelve el cierre completo.
export const obtenerConfig = () => API.get('/nomina/config/').then(r => r.data);
export const guardarConfig = (datos) => API.put('/nomina/config/', datos).then(r => r.data);
export const listarAsesores = () => API.get('/nomina/asesores/').then(r => r.data);
export const guardarAsesor = (id, datos) => API.patch(`/nomina/asesores/${id}/`, datos).then(r => r.data);
export const listarCierres = () => API.get('/nomina/cierres/').then(r => r.data);
export const crearCierre = (datos) => API.post('/nomina/cierres/', datos).then(r => r.data);
export const obtenerCierre = (id) => API.get(`/nomina/cierres/${id}/`).then(r => r.data);
export const borrarCierre = (id) => API.delete(`/nomina/cierres/${id}/`);
export const accionCierre = (id, accion, datos = {}) => API.post(`/nomina/cierres/${id}/${accion}/`, datos).then(r => r.data);
export const editarAsesorCierre = (id, datos) => API.patch(`/nomina/asesores-cierre/${id}/`, datos).then(r => r.data);
export const agregarAjuste = (id, datos) => API.post(`/nomina/asesores-cierre/${id}/ajustes/`, datos).then(r => r.data);
export const editarLinea = (id, datos) => API.patch(`/nomina/lineas/${id}/`, datos).then(r => r.data);
export const borrarLinea = (id) => API.delete(`/nomina/lineas/${id}/`).then(r => r.data);
export const ventaDeLinea = (id) => API.get(`/nomina/lineas/${id}/venta/`).then(r => r.data);
export const accionAsesor = (id, accion) => API.post(`/nomina/asesores-cierre/${id}/${accion}/`).then(r => r.data);
