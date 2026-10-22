import React, { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Button, Modal } from '../../components/ui';
import { getLinea } from '../../services/listaPreciosService';
import AgrupacionVariante from './AgrupacionVariante';

// Una sola entrada por referencia comercial; nunca se elige un proveedor para el conjunto.
export default function NuevaAgrupacionModal({ grupo, grupos, categorias, general, notify, onClose }) {
  const [clave, setClave] = useState(grupo?.clave || '');
  const elegido = grupos.find(g => g.clave === clave);
  const referencias = elegido?.referencias.filter(r => r.linea).sort((a, b) => a.id - b.id) || [];
  const consultas = useQueries({ queries: referencias.map(r => ({
    queryKey: ['lp-linea', r.linea.id], queryFn: ({ signal }) => getLinea(r.linea.id, { signal }), staleTime: 60_000,
  })) });
  const lineas = consultas.map(q => q.data).filter(Boolean);
  const cargando = consultas.some(q => q.isPending), fallos = consultas.filter(q => q.isError);
  const piezas = lineas.flatMap(l => l.variantes).filter(v => !v.componentes?.length);
  return <Modal open title="Nueva agrupación de productos" size="lg" className="lp-admin-page lp-agrupacion-modal" onClose={onClose}>
    {!elegido ? <label className="lp-agrupacion-elegir">Referencia
      <select className="ds-input" value="" onChange={e => setClave(e.target.value)}>
        <option value="">Seleccionar referencia…</option>
        {grupos.filter(g => g.referencias.some(r => r.linea)).map(g => <option key={g.clave} value={g.clave}>{g.nombre}</option>)}
      </select>
    </label> : <>
      <p className="lp-agrupacion-referencia"><strong>{elegido.nombre}</strong><span>Las piezas pueden ser de distintos proveedores.</span></p>
      {cargando ? <p role="status">Cargando piezas…</p> : fallos.length ? <div role="alert">No se pudieron cargar todas las piezas. <Button size="sm" variant="secondary" onClick={() => fallos.forEach(q => q.refetch())}>Reintentar</Button></div>
        : !piezas.length ? <p>Configura primero los costos de las piezas que quieres agrupar.</p>
          : <AgrupacionVariante nuevo linea={lineas[0]} lineasGrupo={lineas} variante={{ componentes: [] }} categorias={categorias} general={general} notify={notify} onCancelar={onClose} onCreado={onClose} />}
    </>}
  </Modal>;
}
