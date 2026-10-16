import API from './api';

export async function exportarClientes(params) {
  try {
    return (await API.post('/clientes/exportar/', {}, { params, responseType: 'blob' })).data;
  } catch (error) {
    if (error.response?.data instanceof Blob) {
      try { error.response.data = JSON.parse(await error.response.data.text()); } catch { /* Mantener el error original. */ }
    }
    throw error;
  }
}
