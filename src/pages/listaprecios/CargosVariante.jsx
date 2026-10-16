import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaCouch, FaPlus, FaStar, FaTrash } from 'react-icons/fa';
import { Button } from '../../components/ui';
import { createCargo, updateCargo, deleteCargo } from '../../services/listaPreciosService';
import { mensajeDeError } from '../../services/errores';
import CampoPrecio from './CampoPrecio';
import invalidarListaPrecios from './invalidarListaPrecios';
import './CargosVariante.css';

// Estado del cargo en la lista (2026-10-15): habilitado = opcional ya seleccionado al
// cotizar; deshabilitado = opcional sin seleccionar; obligatorio = siempre en el precio.
export const ESTADOS_CARGO = [
  { valor: 'habilitado', texto: 'Opcional habilitado', datos: { opcional: true, preseleccionado: true } },
  { valor: 'deshabilitado', texto: 'Opcional deshabilitado', datos: { opcional: true, preseleccionado: false } },
  { valor: 'obligatorio', texto: 'Obligatorio', datos: { opcional: false, preseleccionado: false } },
];
export const estadoCargo = (c) => (!c.opcional ? 'obligatorio' : c.preseleccionado ? 'habilitado' : 'deshabilitado');

/** Cargos de un producto. Son uno solo: los mismos se ven y se editan desde el producto y
 *  desde cada agrupación donde es pieza; todo cambio se guarda en el producto. */
export default function CargosVariante({ variante, notify, lineaId = variante.linea }) {
  const client = useQueryClient();
  const avisar = (texto) => (e) => notify?.(mensajeDeError(e, texto), 'error');
  const invalidar = () => invalidarListaPrecios(client, lineaId);
  const crear = useMutation({ mutationFn: createCargo, onSuccess: invalidar, onError: avisar('Error al agregar el cargo.') });
  const actualizar = useMutation({ mutationFn: ({ id, ...data }) => updateCargo(id, data), onSuccess: invalidar, onError: avisar('Error al actualizar el cargo.') });
  const quitar = useMutation({ mutationFn: deleteCargo, onSuccess: invalidar, onError: avisar('Error al eliminar el cargo.') });
  const cargos = variante.cargos || [];
  const especiales = cargos.filter((c) => c.especial);
  const decorativos = cargos.filter((c) => c.tipo === 'decorativos');
  const editables = cargos.filter((c) => !c.especial && c.tipo !== 'decorativos');

  return (
    <div className="lpc">
      {especiales.length > 0 && <p className="lpc-nota"><FaStar size={9} aria-hidden="true" /> Especiales (se editan en la línea): {especiales.map((c) => c.descripcion).join(', ')}</p>}
      {decorativos.map((c) => (
        <div key={c.id} className="lpc-fila lpc-fila--fijo">
          <span className="lpc-fijo"><FaCouch size={11} aria-hidden="true" /> {c.descripcion}</span>
          <span className="lpc-fijo__detalle" title="2 productos de la línea Decorativos por unidad: sin cobro en grupo 1 o 2; desde grupo 3 se cobra la diferencia">Incluido · fijo</span>
          <button type="button" className="action-btn" aria-label="Quitar cojines incluidos" onClick={() => quitar.mutate(c.id)}><FaTrash size={11} /></button>
        </div>
      ))}
      {editables.map((c) => (
        <div key={c.id} className="lpc-fila" data-estado-cargo={estadoCargo(c)}>
          <input className="lpc-nombre" aria-label="Descripción del cargo" defaultValue={c.descripcion} maxLength={200}
            /* Enter confirma el nombre sin enviar el formulario de la agrupación que lo contenga. */
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
            onBlur={(e) => { const v = e.target.value.trim(); if (!v) e.target.value = c.descripcion; else if (v !== c.descripcion) actualizar.mutate({ id: c.id, descripcion: v }); }} />
          <CampoPrecio label={`Valor de ${c.descripcion}`} valor={c.valor} permiteNegativo onCommit={(valor) => actualizar.mutateAsync({ id: c.id, valor })} />
          <select className="lpc-estado" aria-label={`Estado de ${c.descripcion}`} value={estadoCargo(c)} disabled={actualizar.isPending}
            onChange={(e) => actualizar.mutate({ id: c.id, ...ESTADOS_CARGO.find((o) => o.valor === e.target.value).datos })}>
            {ESTADOS_CARGO.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
          </select>
          <button type="button" className="action-btn" aria-label={`Quitar ${c.descripcion}`} onClick={() => quitar.mutate(c.id)}><FaTrash size={11} /></button>
        </div>
      ))}
      <div className="lpc-acciones">
        <Button size="sm" variant="ghost" icon={FaPlus} loading={crear.isPending && !crear.variables?.tipo}
          onClick={() => crear.mutate({ variante: variante.id, descripcion: 'Nuevo cargo', valor: 0 })}>
          Agregar cargo
        </Button>
        {!decorativos.length && (
          <Button size="sm" variant="ghost" icon={FaCouch} loading={crear.isPending && crear.variables?.tipo === 'decorativos'}
            onClick={() => crear.mutate({ variante: variante.id, tipo: 'decorativos' })}
            title="Agrega «Decorativos x2»: 2 decorativos por unidad sin cobro (grupo 1 o 2)">
            Cojines incluidos
          </Button>
        )}
      </div>
    </div>
  );
}
