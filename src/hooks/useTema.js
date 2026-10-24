import { useCallback, useEffect, useSyncExternalStore } from 'react';

// Modo de color (2026-10-21): «diurno» o «nocturno». Es una preferencia de cada equipo:
// se guarda en este navegador y se aplica con data-tema en <html> (ver styles/tokens.css).
// index.html lo aplica antes de pintar para que no parpadee al cargar. Un solo estado
// compartido: al cambiarlo, todo lo que dependa del modo (p. ej. gráficos) se vuelve a pintar.
export const CLAVE_TEMA = 'lottus-tema';
export const TEMAS = ['diurno', 'nocturno'];
const COLOR_BARRA = { diurno: '#f4f5f7', nocturno: '#070b10' };
const oyentes = new Set();

export function temaGuardado() {
  try {
    const tema = localStorage.getItem(CLAVE_TEMA);
    return TEMAS.includes(tema) ? tema : 'diurno';
  } catch {
    return 'diurno';
  }
}

export function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', COLOR_BARRA[tema]);
}

const temaActual = () => (TEMAS.includes(document.documentElement.dataset.tema) ? document.documentElement.dataset.tema : temaGuardado());

function suscribir(oyente) {
  oyentes.add(oyente);
  // Otra pestaña cambió el modo: seguirla.
  const alCambiar = (e) => { if (e.key === CLAVE_TEMA) { aplicarTema(temaGuardado()); oyente(); } };
  window.addEventListener('storage', alCambiar);
  return () => { oyentes.delete(oyente); window.removeEventListener('storage', alCambiar); };
}

/** Lee un color del modo activo (para gráficos que no usan CSS). */
export function colorTema(variable) {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

export default function useTema() {
  const tema = useSyncExternalStore(suscribir, temaActual, () => 'diurno');
  useEffect(() => { if (document.documentElement.dataset.tema !== tema) aplicarTema(tema); }, [tema]);
  const cambiarTema = useCallback((nuevo) => {
    try { localStorage.setItem(CLAVE_TEMA, nuevo); } catch { /* sin almacenamiento: dura esta visita */ }
    aplicarTema(nuevo);
    oyentes.forEach((oyente) => oyente());
  }, []);
  return [tema, cambiarTema];
}
