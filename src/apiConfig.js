// Configuración de la URL base del API - ENTORNO DE DESARROLLO Y PRODUCCION
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

const API_BASE_URL = isLocalhost ? 'http://localhost:8000/api' : 'https://api.muebleslottus.com/api';

export default API_BASE_URL;