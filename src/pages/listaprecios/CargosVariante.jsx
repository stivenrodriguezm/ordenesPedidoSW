import React, { useId } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FaCouch, FaPlus, FaStar, FaTrash, FaTruck } from 'react-icons/fa';
import { Button } from '../../components/ui';
import { createCargo, updateCargo, deleteCargo, getNombresCargos, ordenarCargos } from '../../services/listaPreciosService';
import { mensajeDeError } from '../../services/errores';
import CampoPrecio from './CampoPrecio';
import invalidarListaPrecios from './invalidarListaPrecios';
import VariantesOrdenables from './VariantesOrdenables';
import './CargosVariante.css';

// Estado del cargo en la lista (2026-10-15): habilitado = opcional ya seleccionado al
// cotizar; deshabilitado = opcional sin seleccionar; obligatorio = siempre en el precio.
export const ESTADOS_CARGO = [
  { valor: 'habilitado', texto: 'Opcional habilitado', datos: { opcional: true, preseleccionado: true } },
  { valor: 'deshabilitado', texto: 'Opcional deshabilitado', datos: { opcional: true, preseleccionado: false } },
  { valor: 'obligatorio', texto: 'Obligatorio', datos: { opcional: false, preseleccionado: false } },
];
// «Transporte» (2026-10-21): uno por envío. El servidor lo crea con $120.000; cada transporte
// lleva hasta «unidades por transporte» del producto y en un conjunto se cobra uno solo.
const esTransporte = (c) => c.tipo === 'transporte';
export const estadoCargo = (c) => (!c.opcional ? 'obligatorio' : c.preseleccionado ? 'habilitado' : 'deshabilitado');

/** Cargos de un producto. Son uno solo: los mismos se ven y se editan desde el producto y
 *  desde cada agrupación donde es pieza; todo cambio se guarda en el producto. */
export default function CargosVariante({ variante, notify, lineaId = variante.linea }) {
  const client = useQueryClient();
  const avisar = (texto) => (e) => notify?.(mensajeDeError(e, texto), 'error');
  const invalidar = () => invalidarListaPrecios(client, lineaId);
  const listaNombres = useId();
  // Nombres de cargos ya usados en otros productos: se sugieren al escribir.
  const nombres = useQuery({ queryKey: ['lp-cargos-nombres'], queryFn: getNombresCargos, staleTime: 5 * 60_000 });
  const crear = useMutation({ mutationFn: createCargo, onSuccess: invalidar, onError: avisar('Error al agregar el cargo.') });
  const actualizar = useMutation({ mutationFn: ({ id, ...data }) => updateCargo(id, data),
    onSuccess: (_, datos) => { invalidar(); if ('descripcion' in datos) client.invalidateQueries({ queryKey: ['lp-cargos-nombres'] }); },
    onError: avisar('Error al actualizar el cargo.') });
  const quitar = useMutation({ mutationFn: deleteCargo, onSuccess: invalidar, onError: avisar('Error al eliminar el cargo.') });
  const cargos = variante.cargos || [];
  const especiales = cargos.filter((c) => c.especial);
  const decorativos = cargos.filter((c) => c.tipo === 'decorativos');
  // «Cojines incluidos» tiene valor y estado como los demás; solo su tipo es fijo.
  const editables = cargos.filter((c) => !c.especial);

  return (
    <div className="lpc">
      {especiales.length > 0 && <p className="lpc-nota"><FaStar size={9} aria-hidden="true" /> Especiales (se editan en la línea): {especiales.map((c) => c.descripcion).join(', ')}</p>}
      <datalist id={listaNombres}>{(nombres.data || []).map((n) => <option key={n} value={n} />)}</datalist>
      {/* Se ordenan arrastrando el asa, igual que las subcategorías (2026-10-21). */}
      <VariantesOrdenables linea={{ nombre: 'Cargos', variantes: editables.map((c) => ({ ...c, nombre: c.descripcion })) }} notify={notify}
        etiquetaLista={`Cargos de ${variante.nombre}`}
        onGuardar={async (ids) => { await ordenarCargos(variante.id, ids); await invalidar(); }}>
      {(c) => (
        <div className={`lpc-fila${c.tipo === 'decorativos' ? ' lpc-fila--decorativos' : ''}`} data-estado-cargo={estadoCargo(c)}
          title={c.tipo === 'decorativos' ? 'Cojines incluidos: 2 productos de la línea Decorativos por unidad, sin cobro en grupo 1 o 2; desde grupo 3 se cobra la diferencia' : undefined}>
          <input className="lpc-nombre" aria-label="Descripción del cargo" defaultValue={c.descripcion === 'Nuevo cargo' ? '' : c.descripcion} maxLength={200}
            placeholder="Nombre del cargo" list={listaNombres} autoFocus={c.id === crear.data?.id}
            /* Enter confirma el nombre sin enviar el formulario de la agrupación que lo contenga. */
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
            onBlur={(e) => { const v = e.target.value.trim(); if (!v) e.target.value = c.descripcion === 'Nuevo cargo' ? '' : c.descripcion; else if (v !== c.descripcion) actualizar.mutate({ id: c.id, descripcion: v }); }} />
          <CampoPrecio label={`Valor de ${c.descripcion}`} valor={c.valor} permiteNegativo onCommit={(valor) => actualizar.mutateAsync({ id: c.id, valor })} />
          <select className="lpc-estado" aria-label={`Estado de ${c.descripcion}`} value={estadoCargo(c)} disabled={actualizar.isPending}
            onChange={(e) => actualizar.mutate({ id: c.id, ...ESTADOS_CARGO.find((o) => o.valor === e.target.value).datos })}>
            {ESTADOS_CARGO.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
          </select>
          <button type="button" className="action-btn" aria-label={`Quitar ${c.descripcion}`} onClick={() => quitar.mutate(c.id)}><FaTrash size={11} /></button>
        </div>
      )}
      </VariantesOrdenables>
      {decorativos.length > 0 && <p className="lpc-nota"><FaCouch size={9} aria-hidden="true" /> {decorativos[0].descripcion}: 2 decorativos por unidad sin cobro (grupo 1 o 2). Si es opcional, solo aplica cuando se elige.</p>}
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
        {!cargos.some(esTransporte) && (
          <Button size="sm" variant="ghost" icon={FaTruck} loading={crear.isPending && crear.variables?.tipo === 'transporte'}
            onClick={() => crear.mutate({ variante: variante.id, tipo: 'transporte' })} title="Agrega «Transporte» con costo de $120.000 por envío">
            Transporte
          </Button>
        )}
      </div>
    </div>
  );
}
