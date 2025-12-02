// src/services/api.js
import axios from "axios";
import API_BASE_URL from '../apiConfig'; // Importar desde apiConfig.js

// Crear instancia de Axios para las solicitudes
const API = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para agregar el token de autorización en cada solicitud
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores en las respuestas
API.interceptors.response.use(
  (response) => response, // Retorna la respuesta si es exitosa
  (error) => {
    if (error.response) {
      // El servidor respondió con un código de estado fuera del rango 2xx
      const { status, data } = error.response;

      if (status === 401) {
        // Error de autenticación: token inválido o expirado
        console.error("Error 401: No autorizado. Redirigiendo al login.");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/#/login"; // Forzar recarga para limpiar estado

      } else if (status === 400) {
        // Error de validación (Bad Request)
        console.error("Error 400: Datos inválidos enviados.", data);

      } else if (status === 500) {
        // Error interno del servidor
        console.error("Error 500: Ocurrió un error en el servidor.", data);
      }

    } else if (error.request) {
      // La solicitud se hizo pero no se recibió respuesta (ej. problema de red)
      console.error("Error de red: No se pudo conectar con el servidor.", error.request);

    } else {
      // Error en la configuración de la solicitud
      console.error("Error de configuración de Axios:", error.message);
    }

    // Rechaza la promesa para que el error pueda ser manejado por el componente que hizo la llamada
    return Promise.reject(error);
  }
);

// Funciones de API existentes (pueden ser eliminadas o refactorizadas más adelante)
export const fetchReferencias = (proveedorId) =>
  API.get(`/referencias/?proveedor=${proveedorId}`).then((res) => res.data);

export const fetchOrdenes = (filtros = {}, userId) => {
  let endpoint = "/listar-pedidos/";
  const params = new URLSearchParams();
  if (userId) params.append('usuario_id', userId);
  if (filtros.proveedor) params.append('id_proveedor', filtros.proveedor);
  if (filtros.vendedor) params.append('id_vendedor', filtros.vendedor);
  if (filtros.estado) params.append('estado', filtros.estado);

  const queryString = params.toString();
  if (queryString) {
    endpoint += `?${queryString}`;
  }

  return API.get(endpoint).then((res) => res.data);
};

export default API;
