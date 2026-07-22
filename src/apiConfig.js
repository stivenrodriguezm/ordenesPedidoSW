// Configuración dinámica de la URL base del API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.MODE === 'production' 
    ? 'https://api.muebleslottus.com/api' 
    : 'http://localhost:8000/api');

export default API_BASE_URL;