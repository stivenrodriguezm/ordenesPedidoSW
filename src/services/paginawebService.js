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
  const response = await API.post('/paginaweb/upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
