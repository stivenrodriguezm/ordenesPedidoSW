import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../services/api';
import { mensajeDeError } from '../../services/errores';
import { guardarDisposicionSubcategorias } from '../../services/listaPreciosService';
import { Button, Modal } from '../../components/ui';
import SelectorSubcategorias from './SelectorSubcategorias';
import { useSubcategorias } from './maestroSubcategorias';
import { etiquetaProveedor } from './subcategoriasReferencia';
import './NuevaReferencia.css';

const TODOS = 'todos';

/** Agrega subcategorías a una referencia desde Administrar lista (2026-10-21). Se guardan en
 *  el maestro de Referencias del proveedor elegido (o de todos); si estaba eliminada de la
 *  lista, vuelve a mostrarse. Después se le agregan los costos como a cualquier otra. */
export default function AgregarSubcategoria({ grupo, visibles = [], onClose, notify }) {
  const client = useQueryClient();
  const referencias = grupo.referencias;
  const [destino, setDestino] = useState(referencias.length === 1 ? String(referencias[0].id) : '');
  const [elegidas, setElegidas] = useState([]);
  const [error, setError] = useState('');
  const subcategorias = useSubcategorias();
  const disposicion = referencias[0]?.disposicion || { retiradas: [], revision: 0 };
  const guardar = useMutation({
    mutationFn: async () => {
      const subs = (subcategorias.data || []).filter((s) => elegidas.includes(s.id));
      const destinos = destino === TODOS ? referencias : referencias.filter((r) => String(r.id) === destino);
      for (const ref of destinos) {
        const actuales = (ref.subcategorias || []).map((s) => s.id);
        const faltan = elegidas.filter((id) => !actuales.includes(id));
        if (!faltan.length) continue;
        await API.patch(`referencias/${ref.id}/`, {
          subcategorias: [...actuales, ...faltan],
          categorias: [...new Set([...(ref.categorias || []).map((c) => c.id), ...subs.map((s) => s.categoria)])],
        });
      }
      // Una subcategoría que se había eliminado de la lista vuelve a mostrarse.
      if (elegidas.some((id) => disposicion.retiradas.includes(id))) {
        await guardarDisposicionSubcategorias(referencias[0].id, { revision: disposicion.revision, retiradas: disposicion.retiradas.filter((id) => !elegidas.includes(id)) });
      }
    },
    onSuccess: async () => {
      await Promise.all([client.invalidateQueries({ queryKey: ['lp-referencias'] }), client.invalidateQueries({ queryKey: ['referencias'] })]);
      notify?.(`${elegidas.length === 1 ? 'Subcategoría agregada' : 'Subcategorías agregadas'} a ${grupo.nombre}. Ahora agrega sus costos.`, 'success');
      onClose();
    },
    onError: (e) => setError(mensajeDeError(e, 'No se pudo agregar. Revisa los datos e intenta de nuevo.')),
  });
  const enviar = (e) => {
    e.preventDefault(); setError('');
    if (!destino) { setError('Elige el proveedor al que se agrega.'); return; }
    if (!elegidas.length) { setError('Elige o crea al menos una subcategoría.'); return; }
    guardar.mutate();
  };
  const categoriaInicial = referencias.flatMap((r) => r.categorias || [])[0]?.id;

  return (
    <Modal open title={`Agregar subcategoría a ${grupo.nombre}`} size="md" className="lp-admin-page lp-nueva-ref" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose} disabled={guardar.isPending}>Cancelar</Button>
        <Button type="submit" form="lp-agregar-sub" loading={guardar.isPending}>Agregar</Button></>}>
      <form id="lp-agregar-sub" onSubmit={enviar} noValidate>
        {referencias.length > 1 && <div className="lp-nueva-ref__fila"><label>Proveedor<select className="ds-input" value={destino} onChange={(e) => setDestino(e.target.value)}>
          <option value="">Seleccionar…</option>
          {referencias.map((r) => <option key={r.id} value={r.id}>{etiquetaProveedor(r, referencias)}</option>)}
          <option value={TODOS}>Todos los proveedores</option>
        </select></label></div>}
        <SelectorSubcategorias elegidas={elegidas} onCambiar={setElegidas} excluir={visibles} categoriaInicial={categoriaInicial} ayuda="Ya asignadas no se muestran" />
        {error && <p className="ds-error-box" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
