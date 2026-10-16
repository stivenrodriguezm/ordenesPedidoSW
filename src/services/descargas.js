import API from './api';

export async function obtenerArchivo(url, { params, metodo = 'post' } = {}) {
  try {
    const config = { params, responseType: 'blob' };
    const respuesta = metodo === 'get' ? await API.get(url, config) : await API.post(url, {}, config);
    return respuesta.data;
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      try { error.response.data = JSON.parse(await error.response.data.text()); } catch { /* Conservar error original. */ }
    }
    throw error;
  }
}

export function guardarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  try { enlace.click(); } finally { enlace.remove(); URL.revokeObjectURL(url); }
}
