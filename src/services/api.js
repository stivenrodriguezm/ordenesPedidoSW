// src/services/api.js
import axios from "axios";

const API = axios.create({
  baseURL: "https://api.muebleslottus.com/api/",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const fetchReferencias = (proveedorId) =>
  API.get(`referencias/?proveedor=${proveedorId}`).then((res) => res.data);

export const fetchOrdenes = (filtros = {}, userId) => {
  let endpoint = "listar-pedidos/";
  const params = [];
  if (userId) params.push(`usuario_id=${userId}`);
  if (filtros.proveedor) params.push(`id_proveedor=${filtros.proveedor}`);
  if (filtros.vendedor) params.push(`id_vendedor=${filtros.vendedor}`);
  if (filtros.estado) params.push(`estado=${filtros.estado}`);
  if (params.length) endpoint += `?${params.join("&")}`;
  return API.get(endpoint).then((res) => res.data);
};

export default API;