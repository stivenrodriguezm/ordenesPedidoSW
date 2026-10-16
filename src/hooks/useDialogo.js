import { useEffect, useRef } from 'react';

// Comportamiento común de los diálogos modales (P08-07, U06): foco inicial,
// foco confinado con Tab, Escape, foco devuelto al cerrar y bloqueo del scroll.
// Con diálogos anidados solo el de arriba responde al teclado, y el scroll se
// libera cuando se cierra el último (antes cerrar uno interno lo liberaba).

const ENFOCABLES = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

const pila = [];
let overflowPrevio = '';

const enfocables = (nodo) => Array.from(nodo.querySelectorAll(ENFOCABLES));

// Marca para excluir un control del foco inicial (p. ej. la X de cerrar).
export const NO_FOCO_INICIAL = 'data-dialogo-cerrar';

// Cierres accidentales (Escape, clic fuera) de un formulario con datos piden
// confirmación; los botones explícitos de cerrar/cancelar no (U02).
export const confirmarDescarte = (hayCambios) =>
  !hayCambios || window.confirm('Hay cambios sin guardar. ¿Cerrar y descartarlos?');

// onCerrar opcional: sin él, Escape no cierra (solo foco y scroll).
export function useDialogo(abierto, onCerrar, { hayCambios = false } = {}) {
  const ref = useRef(null);
  const onCerrarRef = useRef(onCerrar);
  const hayCambiosRef = useRef(hayCambios);
  onCerrarRef.current = onCerrar;
  hayCambiosRef.current = hayCambios;

  useEffect(() => {
    if (!abierto) return undefined;
    const nodo = ref.current;
    const previo = document.activeElement;
    const id = {};
    pila.push(id);
    if (pila.length === 1) {
      overflowPrevio = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    // Foco inicial: respeta un autoFocus del contenido; si no, el primer
    // control que no sea la X de cerrar; si no hay, el propio diálogo.
    if (nodo && !nodo.contains(document.activeElement)) {
      const lista = enfocables(nodo);
      const destino = nodo.querySelector('[data-autofocus]')
        || lista.find((el) => !el.hasAttribute(NO_FOCO_INICIAL))
        || lista[0]
        || nodo;
      destino.focus();
    }

    const alTeclear = (e) => {
      if (pila[pila.length - 1] !== id || !nodo) return;
      if (e.key === 'Escape') {
        if (!onCerrarRef.current) return;
        e.stopPropagation();
        if (confirmarDescarte(hayCambiosRef.current)) onCerrarRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const lista = enfocables(nodo);
      if (lista.length === 0) {
        e.preventDefault();
        nodo.focus();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const actual = document.activeElement;
      if (!nodo.contains(actual)) {
        e.preventDefault();
        primero.focus();
      } else if (e.shiftKey && (actual === primero || actual === nodo)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && actual === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', alTeclear);

    return () => {
      document.removeEventListener('keydown', alTeclear);
      const i = pila.indexOf(id);
      if (i >= 0) pila.splice(i, 1);
      if (pila.length === 0) document.body.style.overflow = overflowPrevio;
      if (previo && typeof previo.focus === 'function' && document.contains(previo)) previo.focus();
    };
  }, [abierto]);

  return ref;
}
