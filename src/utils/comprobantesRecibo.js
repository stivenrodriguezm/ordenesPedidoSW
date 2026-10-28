import API from '../services/api';
import { comprimirImagen } from './comprimirImagen';

// Fotos de comprobantes de pago de los Recibos de Caja (2026-10-28).
export const MAX_FOTOS = 10;

// Miniatura liviana de una foto de Cloudinary (las URLs ya traen f_auto,q_auto).
export const miniatura = (url) => url.replace('/f_auto,q_auto/', '/f_auto,q_auto,c_limit,w_320/');

export async function subirComprobante(archivo) {
  const comprimido = await comprimirImagen(archivo);
  const datos = new FormData();
  datos.append('imagen', comprimido);
  const { data } = await API.post('/recibos-caja/comprobantes/subir/', datos, { timeout: 120000 });
  return data.url;
}
