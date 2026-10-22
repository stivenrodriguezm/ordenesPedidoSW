import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { renombrarSubcategoria } from '../../services/listaPreciosService';
import CampoPrecio from './CampoPrecio';

export default function NombreSubcategoria({ subcategoria, nombre }) {
  const client = useQueryClient();
  const renombrar = useMutation({
    scope: { id: `lp-subcategoria-${subcategoria}` },
    mutationFn: nombre => renombrarSubcategoria(subcategoria, nombre),
    onSuccess: async data => {
      const cambiarSub = s => s.id === data.id ? { ...s, nombre: data.nombre } : s;
      const cambiarLinea = l => l && ({ ...l,
        subcategorias: l.subcategorias?.map(cambiarSub),
        variantes: l.variantes.map(v => v.subcategoria === data.id ? { ...v, nombre: data.nombre } : v),
      });
      client.setQueriesData({ queryKey: ['lp-referencias'] }, prev => prev?.map(r => ({ ...r, subcategorias: r.subcategorias.map(cambiarSub), linea: cambiarLinea(r.linea) })));
      client.setQueriesData({ queryKey: ['lp-linea'] }, cambiarLinea);
      client.setQueriesData({ queryKey: ['lp-lineas'] }, prev => prev?.map(cambiarLinea));
      await Promise.all([
        client.invalidateQueries({ queryKey: ['lp-linea'] }),
        client.invalidateQueries({ queryKey: ['listaprecios-catalogo'] }),
        client.invalidateQueries({ queryKey: ['productos-venta-catalogo'] }),
        client.invalidateQueries({ queryKey: ['lp-precio-variante'] }),
        client.invalidateQueries({ queryKey: ['referencias'] }),
        client.invalidateQueries({ queryKey: ['suministros-subcategorias'] }),
      ]);
    },
  });
  return <div className="lp-nombre-subcategoria" title="Nombre del catálogo: se actualiza en todas las referencias que usan esta subcategoría.">
    <CampoPrecio tipo="texto" label="Subcategoría" valor={nombre} max={100} onCommit={nuevo => renombrar.mutateAsync(nuevo)} />
  </div>;
}
