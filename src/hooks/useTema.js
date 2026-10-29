import { useCallback, useEffect, useSyncExternalStore } from 'react';

// Modo de color (2026-10-21): «diurno» o «nocturno». Es una preferencia de cada equipo:
// se guarda en este navegador y se aplica con data-tema en <html> (ver styles/tokens.css).
// index.html lo aplica antes de pintar para que no parpadee al cargar. Un solo estado
// compartido: al cambiarlo, todo lo que dependa del modo (p. ej. gráficos) se vuelve a pintar.
export const CLAVES_TEMA = { sidebar: 'lottus-tema-sidebar', contenido: 'lottus-tema-contenido' };
export const TEMAS = ['diurno', 'nocturno'];
const COLOR_BARRA = { diurno: '#f4f5f7', nocturno: '#070b10' };
const oyentes = new Set();

export function temaGuardado(seccion) {
  try {
    const tema = localStorage.getItem(CLAVES_TEMA[seccion]);
    if (TEMAS.includes(tema)) return tema;
    const antiguo = localStorage.getItem('lottus-tema');
    if (TEMAS.includes(antiguo)) return antiguo;
    return 'diurno';
  } catch {
    return 'diurno';
  }
}

export function aplicarTema(seccion, tema) {
  if (seccion === 'sidebar') {
    document.documentElement.dataset.temaSidebar = tema;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', COLOR_BARRA[tema]);
  } else {
    document.documentElement.dataset.temaContenido = tema;
  }
}

const temaActualSidebar = () => TEMAS.includes(document.documentElement.dataset.temaSidebar) ? document.documentElement.dataset.temaSidebar : temaGuardado('sidebar');
const temaActualContenido = () => TEMAS.includes(document.documentElement.dataset.temaContenido) ? document.documentElement.dataset.temaContenido : temaGuardado('contenido');

function suscribir(oyente) {
  oyentes.add(oyente);
  // Otra pestaña cambió el modo: seguirla.
  const alCambiar = (e) => {
    if (e.key === CLAVES_TEMA.sidebar) { aplicarTema('sidebar', temaGuardado('sidebar')); oyente(); }
    if (e.key === CLAVES_TEMA.contenido) { aplicarTema('contenido', temaGuardado('contenido')); oyente(); }
  };
  window.addEventListener('storage', alCambiar);
  return () => { oyentes.delete(oyente); window.removeEventListener('storage', alCambiar); };
}

/** Lee un color del modo activo (para gráficos que no usan CSS). */
export function colorTema(variable) {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

export default function useTema(seccion = 'contenido') {
  const getSnapshot = seccion === 'sidebar' ? temaActualSidebar : temaActualContenido;
  const tema = useSyncExternalStore(suscribir, getSnapshot, () => 'diurno');

  useEffect(() => {
    const dataSetKey = seccion === 'sidebar' ? 'temaSidebar' : 'temaContenido';
    if (document.documentElement.dataset[dataSetKey] !== tema) aplicarTema(seccion, tema);
  }, [tema, seccion]);

  const cambiarTema = useCallback((nuevo) => {
    try { localStorage.setItem(CLAVES_TEMA[seccion], nuevo); } catch { /* sin almacenamiento: dura esta visita */ }
    aplicarTema(seccion, nuevo);
    oyentes.forEach((oyente) => oyente());
  }, [seccion]);

  return [tema, cambiarTema];
}
