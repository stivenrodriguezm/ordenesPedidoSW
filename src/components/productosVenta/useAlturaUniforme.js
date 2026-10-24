import { useLayoutEffect } from 'react';

// Las fichas abiertas comparten el alto que necesita la más completa. Se mide su
// contenido real: no se fijan alturas que recorten campos, notas o validaciones.
export default function useAlturaUniforme(ref, activo) {
  useLayoutEffect(() => {
    const nodo = ref.current;
    if (!activo || !nodo) return undefined;
    let frame;
    const medir = () => {
      nodo.style.removeProperty('--pv-alto-editor');
      const abiertas = [...nodo.querySelectorAll('.pv-card.is-abierto')];
      const alto = Math.ceil(Math.max(0, ...abiertas.map(n => n.getBoundingClientRect().height)));
      if (alto) nodo.style.setProperty('--pv-alto-editor', `${alto}px`);
    };
    const programar = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(medir);
    };
    const tamanos = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(programar) : null;
    tamanos?.observe(nodo);
    const cambios = new MutationObserver(programar);
    cambios.observe(nodo, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', programar);
    medir();
    return () => {
      cancelAnimationFrame(frame);
      tamanos?.disconnect(); cambios.disconnect();
      window.removeEventListener('resize', programar);
      nodo.style.removeProperty('--pv-alto-editor');
    };
  }, [ref, activo]);
}
