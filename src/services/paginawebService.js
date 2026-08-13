import API from './api';

export const getPublicProducts = async (params = {}) => {
  const response = await API.get('/paginaweb/products/', { params });
  return response.data;
};

export const getPublicProductDetail = async (slugOrId) => {
  const response = await API.get(`/paginaweb/products/${slugOrId}/`);
  return response.data;
};

export const getPublicSettings = async () => {
  const response = await API.get('/paginaweb/settings/');
  return response.data;
};

export const getAdminProducts = async () => {
  const response = await API.get('/paginaweb/admin/products/');
  return response.data;
};

export const createAdminProduct = async (productData) => {
  const response = await API.post('/paginaweb/admin/products/', productData);
  return response.data;
};

export const updateAdminProduct = async (id, productData) => {
  const response = await API.put(`/paginaweb/admin/products/${id}/`, productData);
  return response.data;
};

export const deleteAdminProduct = async (id) => {
  const response = await API.delete(`/paginaweb/admin/products/${id}/`);
  return response.data;
};

export const getAdminSettings = async () => {
  const response = await API.get('/paginaweb/admin/settings/');
  return response.data;
};

export const saveAdminSettings = async (settingsData) => {
  const response = await API.post('/paginaweb/admin/settings/', settingsData);
  return response.data;
};

export const uploadPaginawebImage = async (formData) => {
  // No Content-Type header here: setting 'multipart/form-data' explicitly omits
  // the boundary parameter the browser generates for FormData, which breaks
  // multipart parsing server-side. Let axios/the browser set it automatically.
  const response = await API.post('/paginaweb/upload/', formData);
  return response.data;
};
