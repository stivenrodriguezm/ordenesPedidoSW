import API from './api';

export const buscarProductosVenta = async (params, { signal } = {}) => {
  const { data } = await API.get('/productos-venta/catalogo/', { params, signal });
  return data;
};
