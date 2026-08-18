import API from './api';

// PQRS ("Peticiones, Quejas, Reclamos y Sugerencias") — gestionado desde
// "Gestión Web" → pestaña PQRS. El contenido del cliente es de solo
// lectura; solo se puede cambiar el estado y agregar respuestas.

export const getAdminPqrs = async () => {
  const response = await API.get('/paginaweb/admin/pqrs/');
  return response.data;
};

export const updatePqrsEstado = async (id, estado) => {
  const response = await API.patch(`/paginaweb/admin/pqrs/${id}/`, { estado });
  return response.data;
};

export const responderPqrs = async (id, mensaje) => {
  const response = await API.post(`/paginaweb/admin/pqrs/${id}/responder/`, { mensaje });
  return response.data;
};
