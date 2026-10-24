// Impresoras remotas (2026-10-24): la de la oficina principal recibe documentos desde
// cualquier lugar a través del servidor; el agente de esa computadora los imprime.
import API from '../../services/api';

const VIGENCIA_MS = 30000;
let cache = { lista: null, hora: 0, promesa: null };

/** Lista de impresoras activas (con su estado de conexión), con caché corta. */
export function cargarImpresoras({ forzar = false } = {}) {
  if (!forzar && cache.lista && Date.now() - cache.hora < VIGENCIA_MS) return Promise.resolve(cache.lista);
  if (cache.promesa) return cache.promesa;
  cache.promesa = API.get('/impresion/impresoras/')
    .then(({ data }) => {
      cache = { lista: Array.isArray(data) ? data : [], hora: Date.now(), promesa: null };
      return cache.lista;
    })
    .catch(() => {
      cache = { ...cache, promesa: null };
      return cache.lista || [];
    });
  return cache.promesa;
}

export const impresorasEnCache = () => cache.lista;

export function _reiniciarCacheImpresoras() {
  cache = { lista: null, hora: 0, promesa: null };
}

/** El documento tal cual se imprime aquí, con la dirección de la app para lo relativo. */
export function documentoParaEnviar(html) {
  const base = `<base href="${window.location.href.split('#')[0]}">`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + base) : base + html;
}

export const enviarTrabajo = ({ impresora, titulo, html, copias }) =>
  API.post('/impresion/trabajos/', { impresora, titulo, html: documentoParaEnviar(html), copias }).then(r => r.data);

export const consultarTrabajo = id => API.get(`/impresion/trabajos/${id}/`).then(r => r.data);

const CLAVE = 'lottus.impresora';
export const destinoGuardado = () => {
  try { return localStorage.getItem(CLAVE) || 'local'; } catch { return 'local'; }
};
export const guardarDestino = valor => {
  try { localStorage.setItem(CLAVE, String(valor)); } catch { /* sin almacenamiento: no pasa nada */ }
};
