import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cambiarCategoriaSubcategoria } from '../../services/listaPreciosService';
import { mensajeDeError } from '../../services/errores';
import { useCategorias } from './maestroSubcategorias';

/** Categoría de la subcategoría en esta referencia (2026-10-29): cambiarla no afecta a las demás
 *  referencias que usan la misma subcategoría. */
export default function CategoriaSubcategoria({ subcategoria, nombre, categoria, categoriaNombre, referencia }) {
  const client = useQueryClient();
  const categorias = useCategorias();
  const [error, setError] = useState('');
  const cambiar = useMutation({
    scope: { id: `lp-subcategoria-${subcategoria}` },
    mutationFn: (nueva) => cambiarCategoriaSubcategoria(subcategoria, nueva, referencia),
    onMutate: () => setError(''),
    onSuccess: () => Promise.all(['lp-referencias', 'lp-linea', 'lp-lineas', 'listaprecios-catalogo', 'listaprecios-categorias-publicas', 'productos-venta-catalogo',
      'lp-precio-variante', 'referencias', 'suministros-subcategorias'].map((k) => client.invalidateQueries({ queryKey: [k] }))),
    onError: (e) => setError(mensajeDeError(e, 'No se pudo cambiar la categoría.')),
  });
  const opciones = categorias.data?.length ? categorias.data : categoria ? [{ id: categoria, nombre: categoriaNombre }] : [];
  return <label className="lp-categoria-subcategoria" title="Categoría en esta referencia: las demás referencias que usan esta subcategoría no cambian.">
    <span>Categoría</span>
    <select aria-label={`Categoría de ${nombre}`} value={categoria ?? ''} disabled={cambiar.isPending}
      data-estado={cambiar.isPending ? 'guardando' : undefined} onChange={(e) => e.target.value && cambiar.mutate(Number(e.target.value))}>
      {!categoria && <option value="">Sin clasificar</option>}
      {opciones.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
    </select>
    {error && <small role="alert">{error}</small>}
  </label>;
}
