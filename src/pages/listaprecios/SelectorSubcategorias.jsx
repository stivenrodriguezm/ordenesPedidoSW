import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaCheck, FaPlus, FaSearch } from 'react-icons/fa';
import API from '../../services/api';
import { mensajeDeError } from '../../services/errores';
import { normalizarBusqueda } from '../../utils/consultaPrecios';
import { Button } from '../../components/ui';
import { useCategorias, useSubcategorias } from './maestroSubcategorias';
import './NuevaReferencia.css';


/** Elegir subcategorías del maestro de Referencias (chips por categoría, buscador sin tildes) y,
 *  si no existe, crearla ahí mismo con su categoría. `excluir`: ids que no se ofrecen. */
export default function SelectorSubcategorias({ elegidas, onCambiar, excluir = [], categoriaInicial, ayuda = 'Los productos que tendrá en la lista' }) {
  const client = useQueryClient();
  const subcategorias = useSubcategorias(), categorias = useCategorias();
  const [filtro, setFiltro] = useState('');
  const [categoria, setCategoria] = useState('');
  const [error, setError] = useState('');
  const nombreCategoria = useMemo(() => new Map((categorias.data || []).map((c) => [c.id, c.nombre])), [categorias.data]);
  const q = normalizarBusqueda(filtro).trim();
  const grupos = useMemo(() => {
    const porCategoria = new Map();
    for (const s of subcategorias.data || []) {
      if (excluir.includes(s.id)) continue;
      const cat = nombreCategoria.get(s.categoria) || 'Sin categoría';
      if (q && !normalizarBusqueda(`${cat} ${s.nombre}`).includes(q) && !elegidas.includes(s.id)) continue;
      if (!porCategoria.has(cat)) porCategoria.set(cat, []);
      porCategoria.get(cat).push(s);
    }
    return [...porCategoria.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'));
  }, [subcategorias.data, nombreCategoria, q, elegidas, excluir]);
  const existe = (subcategorias.data || []).some((s) => normalizarBusqueda(s.nombre) === q);
  const categoriaElegida = categoria || categoriaInicial || categorias.data?.[0]?.id || '';
  const crear = useMutation({
    mutationFn: () => API.post('/suministros/subcategorias/', { nombre: filtro.trim(), categoria: Number(categoriaElegida) }).then((r) => r.data),
    onSuccess: async (nueva) => {
      client.setQueryData(['suministros-subcategorias'], (prev) => (Array.isArray(prev) ? [...prev, nueva] : prev));
      await client.invalidateQueries({ queryKey: ['suministros-subcategorias'] });
      onCambiar([...elegidas, nueva.id]);
      setFiltro(''); setError('');
    },
    onError: (e) => setError(mensajeDeError(e, 'No se pudo crear la subcategoría.')),
  });
  const alternar = (id) => onCambiar(elegidas.includes(id) ? elegidas.filter((x) => x !== id) : [...elegidas, id]);

  return <div className="lp-nueva-ref__subs">
    <div className="lp-nueva-ref__cabeza"><strong>Subcategorías</strong><span>{elegidas.length ? `${elegidas.length} elegida${elegidas.length > 1 ? 's' : ''}` : ayuda}</span></div>
    <div className="lp-nueva-ref__buscar"><FaSearch aria-hidden="true" /><input type="search" aria-label="Buscar subcategoría" placeholder="Buscar o escribir una nueva…" value={filtro} onChange={(e) => setFiltro(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (q && !existe && categoriaElegida && !crear.isPending) crear.mutate(); } }} /></div>
    {q && !existe && !subcategorias.isLoading && <div className="lp-nueva-ref__crear">
      <span>Crear «{filtro.trim()}» en</span>
      <select aria-label="Categoría de la nueva subcategoría" value={categoriaElegida} onChange={(e) => setCategoria(e.target.value)}>
        {(categorias.data || []).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
      <Button size="sm" icon={FaPlus} loading={crear.isPending} disabled={!categoriaElegida} onClick={() => crear.mutate()}>Crear</Button>
    </div>}
    {error && <p className="ds-error-box" role="alert">{error}</p>}
    <div className="lp-nueva-ref__lista">
      {subcategorias.isLoading ? <p className="lp-section-hint">Cargando subcategorías…</p>
        : !grupos.length ? <p className="lp-section-hint">{q ? 'Sin coincidencias: créala arriba con su categoría.' : 'No hay más subcategorías para agregar.'}</p>
          : grupos.map(([cat, subs]) => <div key={cat} className="lp-nueva-ref__grupo"><small>{cat}</small><div>
            {subs.map((s) => <button type="button" key={s.id} aria-pressed={elegidas.includes(s.id)} onClick={() => alternar(s.id)}>
              {elegidas.includes(s.id) && <FaCheck aria-hidden="true" />}{s.nombre}</button>)}</div></div>)}
    </div>
  </div>;
}
