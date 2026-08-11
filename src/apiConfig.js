// URL base del API: se toma de VITE_API_BASE_URL (.env.development / .env.production)
// con fallback al entorno local de pruebas.
const API_BASE_URL = 'https://api.muebleslottus.com/api';

export const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  // Remove '/api' from the base URL to get the host
  const host = API_BASE_URL.replace('/api', '');
  return `${host}${path}`;
};

export default API_BASE_URL;
