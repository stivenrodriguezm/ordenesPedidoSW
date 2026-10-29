import API from './api';

// Agente Desarrollador (2026-10-28): mejoras de la plataforma con plan, aprobación y vista previa en pruebas.
export const estadoDesarrollador = () => API.get('/desarrollador/estado/').then(r => r.data);
export const listarTareasDesarrollo = () => API.get('/desarrollador/tareas/').then(r => r.data);
export const obtenerTareaDesarrollo = (id) => API.get(`/desarrollador/tareas/${id}/`).then(r => r.data);
export const pedirMejora = (pedido) => API.post('/desarrollador/tareas/', { pedido }).then(r => r.data);
export const accionTareaDesarrollo = (id, accion, datos = {}) => API.post(`/desarrollador/tareas/${id}/${accion}/`, datos).then(r => r.data);
export const borrarTareaDesarrollo = (id) => API.delete(`/desarrollador/tareas/${id}/`);
