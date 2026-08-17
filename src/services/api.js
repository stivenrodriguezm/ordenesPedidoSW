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

// Cierra la sesión y redirige al login
const forceLogout = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  // La app usa HashRouter (ver App.jsx): la ruta real vive en location.hash,
  // no en location.pathname (que siempre es "/"). Por eso el chequeo debe
  // mirar el hash, y el redirect debe apuntar a "/#/login" — "/login" a
  // secas es una navegación real del navegador a una ruta que no existe en
  // el hosting estático (Hostinger la sirve como 404 en vez de la SPA).
  if (!window.location.hash.includes("/login")) {
    window.location.href = "/#/login"; // Forzar recarga para limpiar estado
  }
};

// Cola para no lanzar múltiples refreshes de token en paralelo
let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error, token = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
};

// Interceptor para manejar errores en las respuestas
API.interceptors.response.use(
  (response) => response, // Retorna la respuesta si es exitosa
  async (error) => {
    const originalRequest = error.config || {};

    // En 401 intenta renovar el access token con el refresh token (una sola vez por request)
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/token/")
    ) {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        forceLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Otro refresh en curso: encolar y reintentar cuando termine
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return API(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${API_BASE_URL}/token/refresh/`, {
          refresh: refreshToken,
        });
        localStorage.setItem("accessToken", data.access);
        if (data.refresh) localStorage.setItem("refreshToken", data.refresh);
        processQueue(null, data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return API(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response) {
      // El servidor respondió con un código de estado fuera del rango 2xx
      const { status, data } = error.response;

      if (status === 401) {
        // Sin refresh posible (o ya reintentado): cerrar sesión
        forceLogout();

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

export default API;
