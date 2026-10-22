import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaCheck } from 'react-icons/fa';
import { updateVariante } from '../../services/listaPreciosService';
import { mensajeDeError } from '../../services/errores';
import invalidarListaPrecios from './invalidarListaPrecios';

export default function PublicacionSubcategoria({ variante, lineaId, notify }) {
  const client = useQueryClient();
  const guardar = useMutation({
    scope: { id: `lp-variante-${variante.id}` },
    mutationFn: publicado => updateVariante(variante.id, { publicado }),
    onSuccess: data => {
      invalidarListaPrecios(client, lineaId, data);
      notify(data.publicado ? 'Subcategoría publicada.' : 'Subcategoría en borrador.', 'success');
    },
  });
  const publicado = !!variante.publicado;
  return <div className="lp-publicar-subcategoria" data-estado={guardar.isPending ? 'guardando' : undefined}>
    <button type="button" className={`lp-publicar-boton${publicado ? ' lp-publicar-boton--publicado' : ''}`}
      aria-label={`${publicado ? 'Quitar publicación de' : 'Publicar'} ${variante.nombre}`} aria-pressed={publicado}
      title={publicado ? 'Quitar publicación de Consulta y Ventas' : variante.costo_confirmado !== true ? 'Guarda el costo antes de publicar' : 'Publicar en Consulta y Ventas'}
      disabled={guardar.isPending || (!publicado && variante.costo_confirmado !== true)}
      onMouseDown={e => e.preventDefault()}
      onClick={e => {
        if (e.currentTarget.closest('.lp-variante-card')?.querySelector('[data-estado="error"], [data-estado="pendiente"], [data-estado="guardando"]')) {
          notify('Guarda o corrige los cambios de esta subcategoría antes de publicar.', 'warning'); return;
        }
        guardar.mutate(!publicado);
      }}>
      {guardar.isPending ? 'Guardando…' : publicado ? <><FaCheck aria-hidden="true" /> Publicada</> : 'Publicar'}
    </button>
    {guardar.isError && <small role="alert">{mensajeDeError(guardar.error, 'No se pudo guardar. Intenta de nuevo.')}</small>}
  </div>;
}
