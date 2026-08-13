import API from './api';

// "Paleta de Vendedores" — tarjetas digitales públicas de asesores.
// Contenido independiente (no ligado a usuarios de la plataforma), mismo
// esquema de permisos que productos/ajustes web.

export const getAdminAsesores = async () => {
  const response = await API.get('/paginaweb/admin/asesores/');
  return response.data;
};

export const createAdminAsesor = async (data) => {
  const response = await API.post('/paginaweb/admin/asesores/', data);
  return response.data;
};

export const updateAdminAsesor = async (id, data) => {
  const response = await API.patch(`/paginaweb/admin/asesores/${id}/`, data);
  return response.data;
};

export const deleteAdminAsesor = async (id) => {
  const response = await API.delete(`/paginaweb/admin/asesores/${id}/`);
  return response.data;
};

export const uploadAsesorFoto = async (formData) => {
  // See uploadPaginawebImage in paginawebService.js: no explicit Content-Type
  // here so the browser can set it with the correct multipart boundary.
  const response = await API.post('/paginaweb/admin/asesores/upload-foto/', formData);
  return response.data;
};
