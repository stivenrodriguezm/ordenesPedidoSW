import React, { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaGripVertical } from 'react-icons/fa';
import { ordenarVariantes } from '../../services/listaPreciosService';
import { mensajeDeError } from '../../services/errores';
import invalidarListaPrecios, { actualizarLineaEnCache } from './invalidarListaPrecios';
import './VariantesOrdenables.css';
import { aplicarDisposicionSubcategorias } from './disposicionSubcategorias';

export default function VariantesOrdenables({ linea, children, notify, onGuardar, puedeOrdenar, etiquetaLista, acciones }) {
  const client = useQueryClient(), ayudaId = useId();
  const elementos = useRef(new Map()), gesto = useRef(null), animacion = useRef(null);
  const [arrastre, setArrastre] = useState(null), [propuesta, setPropuesta] = useState(null);
  const [estado, setEstado] = useState(''), [error, setError] = useState('');
  const originales = linea.variantes.map(v => v.id);
  const visibles = propuesta ? [...linea.variantes].sort((a, b) => propuesta.indexOf(a.id) - propuesta.indexOf(b.id)) : linea.variantes;
  const guardar = useMutation({
    mutationFn: ids => onGuardar ? onGuardar(ids) : ordenarVariantes(linea.id, ids, originales),
    onSuccess: async data => {
      if (onGuardar) { setPropuesta(null); setEstado('Orden guardado'); return; }
      if (data.disposicion) aplicarDisposicionSubcategorias(client, data.disposicion);
      const posiciones = new Map(data.variantes.map((id, i) => [id, i]));
      actualizarLineaEnCache(client, linea.id, l => ({
        ...l, variantes: l.variantes.map(v => ({ ...v, orden: posiciones.get(v.id) ?? v.orden })).sort((a, b) => a.orden - b.orden),
      }));
      await invalidarListaPrecios(client, linea.id);
      setPropuesta(null); setEstado('Orden guardado');
    },
    onError: async e => {
      setPropuesta(null); setEstado(''); setError(mensajeDeError(e, 'No se pudo guardar el orden. Se restauró el anterior; vuelve a arrastrar para reintentar.'));
      notify('No se pudo guardar el orden de las variantes.', 'error');
      if (!onGuardar) await invalidarListaPrecios(client, linea.id);
    },
  });
  const cancelar = () => {
    cancelAnimationFrame(animacion.current); gesto.current = null; setArrastre(null);
  };
  useEffect(() => {
    const alSalir = () => { cancelAnimationFrame(animacion.current); gesto.current = null; setArrastre(null); };
    window.addEventListener('blur', alSalir);
    return () => { window.removeEventListener('blur', alSalir); cancelAnimationFrame(animacion.current); };
  }, []);
  const guardarOrden = ids => {
    if (ids.every((id, i) => id === originales[i])) return;
    if (puedeOrdenar && !puedeOrdenar()) return;
    setError(''); setEstado(''); setPropuesta(ids); guardar.mutate(ids);
  };
  const medir = () => {
    const g = gesto.current;
    if (!g?.activo) return;
    const otros = originales.filter(id => id !== g.id);
    const destino = otros.filter(id => {
      const rect = elementos.current.get(id)?.getBoundingClientRect();
      return rect && g.y > rect.top + rect.height / 2;
    }).length;
    const ids = [...otros]; ids.splice(destino, 0, g.id);
    g.ids = ids;
    setArrastre({ id: g.id, desplazamiento: g.y - g.inicioY + window.scrollY - g.inicioScroll,
      antes: otros[destino], despues: destino === otros.length ? otros.at(-1) : null });
  };
  const desplazar = () => {
    const g = gesto.current;
    if (!g?.activo) return;
    const borde = Math.min(80, window.innerHeight / 5);
    const paso = g.y < borde ? -12 : g.y > window.innerHeight - borde ? 12 : 0;
    if (paso) { window.scrollBy(0, paso); medir(); }
    animacion.current = requestAnimationFrame(desplazar);
  };
  const comenzar = (e, id) => {
    if (guardar.isPending || originales.length < 2 || e.button !== 0 || e.isPrimary === false) return;
    const control = e.target.closest('input, select, textarea, button, a, label, summary');
    if (control && !control.classList.contains('lp-variante-asa')) return;
    if (e.pointerType === 'touch' && !control?.classList.contains('lp-variante-asa')) return;
    if (puedeOrdenar && !puedeOrdenar()) return;
    e.preventDefault(); control?.focus({ preventScroll: true });
    gesto.current = { id, inicioY: e.clientY, y: e.clientY, inicioScroll: window.scrollY, activo: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const mover = e => {
    const g = gesto.current;
    if (!g) return;
    g.y = e.clientY;
    if (!g.activo && Math.abs(g.y - g.inicioY) < 6) return;
    if (!g.activo) { g.activo = true; animacion.current = requestAnimationFrame(desplazar); }
    e.preventDefault(); medir();
  };
  const soltar = e => {
    const g = gesto.current;
    if (!g) return;
    if (g.activo) { e.preventDefault(); guardarOrden(g.ids || originales); }
    cancelar();
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  return <div className="lp-variantes-orden" data-estado={guardar.isPending ? 'guardando' : undefined}>
    <span id={ayudaId} className="sr-only">Mover con arrastre o con las flechas arriba y abajo.</span>
    {originales.length > 1 && (guardar.isPending || estado) && <div className="lp-variantes-orden-ayuda"><span role="status">{guardar.isPending ? 'Guardando orden…' : estado}</span></div>}
    {error && <p className="lp-variantes-orden-error" role="alert">{error}</p>}
    <div role="list" aria-label={etiquetaLista || `Variantes de ${linea.nombre}`} className={`lp-variantes-orden-lista ${arrastre ? 'is-arrastrando' : ''}`}>
      {visibles.map((v, i) => <div key={v.id} role="listitem" aria-label={v.nombre} ref={el => el ? elementos.current.set(v.id, el) : elementos.current.delete(v.id)}
        className={`lp-variante-ordenable ${arrastre?.antes === v.id ? 'is-destino-antes' : ''} ${arrastre?.despues === v.id ? 'is-destino-despues' : ''}`}
        onPointerDown={e => comenzar(e, v.id)} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={cancelar}>
        <div className={arrastre?.id === v.id ? 'lp-variante-moviendo' : ''} style={arrastre?.id === v.id ? { transform: `translateY(${arrastre.desplazamiento}px)` } : undefined}>
          <button type="button" className="lp-variante-asa" aria-label={`Mover ${v.nombre}`} aria-describedby={ayudaId} disabled={guardar.isPending || originales.length < 2}
            title="Arrastra para mover. Con teclado, usa las flechas arriba o abajo." onKeyDown={e => {
              const paso = { ArrowUp: -1, ArrowDown: 1 }[e.key];
              if (e.key === 'Escape') { cancelar(); return; }
              if (!paso) return;
              e.preventDefault(); const siguiente = i + paso;
              if (siguiente < 0 || siguiente >= originales.length || guardar.isPending) return;
              const ids = [...originales]; [ids[i], ids[siguiente]] = [ids[siguiente], ids[i]]; guardarOrden(ids);
            }}><FaGripVertical aria-hidden="true" /></button>
          {acciones?.(v)}
          {children(v)}
        </div>
      </div>)}
    </div>
  </div>;
}
