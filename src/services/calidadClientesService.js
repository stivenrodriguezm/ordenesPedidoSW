import API from './api';

export const listarCalidad = params => API.get('/calidad-clientes/', { params }).then(r => r.data);
export const listarCandidatos = params => API.get('/calidad-clientes/candidatos/', { params }).then(r => r.data);
export const consultarCalidad = id => API.get(`/calidad-clientes/${id}/`).then(r => r.data);
export const historialCalidad = (id, page) => API.get(`/calidad-clientes/${id}/historial/`, { params: { page } }).then(r => r.data);
export const compararClientes = params => API.get('/calidad-clientes/comparar/', { params }).then(r => r.data);
export const normalizarCliente = (id, datos, headers) => API.post(`/calidad-clientes/${id}/normalizar/`, datos, { headers }).then(r => r.data);
