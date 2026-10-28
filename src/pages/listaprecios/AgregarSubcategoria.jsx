import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../services/api';
import { mensajeDeError } from '../../services/errores';
import { agregarSubcategoriaNueva, guardarDisposicionSubcategorias } from '../../services/listaPreciosService';
import { Button, Modal } from '../../components/ui';
import { usePermissions } from '../../AppContext';
import SelectorSubcategorias from './SelectorSubcategorias';
import { useCategorias, useSubcategorias } from './maestroSubcategorias';
import { etiquetaProveedor } from './subcategoriasReferencia';
import './NuevaReferencia.css';

const TODOS = 'todos';

/** Agrega subcategorías a una referencia desde Administrar lista (2026-10-21).
 *  (2026-10-28) Primero «Nueva»: nombre y categoría, solo para esta referencia (o todos sus
 *  proveedores); si ya existe en el catálogo se usa esa. Con permiso de Referencias también se
 *  pueden elegir del catálogo. Si estaba eliminada de la lista, vuelve a mostrarse. */
export default function AgregarSubcategoria({ grupo, visibles = [], onClose, notify }) {
  const client = useQueryClient();
  const hasPermission = usePermissions();
  const puedeCatalogo = hasPermission('ADMINISTRAR_REFERENCIAS');
  const referencias = grupo.referencias;
  const [modo, setModo] = useState('nueva');
  const [destino, setDestino] = useState(referencias.length === 1 ? String(referencias[0].id) : '');
  const [elegidas, setElegidas] = useState([]);
  const [nombre, setNombre] = useState('');
  const categoriasRef = [...new Map(referencias.flatMap((r) => r.categorias || []).map((c) => [c.id, c])).values()];
  const [categoria, setCategoria] = useState(categoriasRef[0]?.id ? String(categoriasRef[0].id) : '');
  const [error, setError] = useState('');
  const subcategorias = useSubcategorias();
  const categorias = useCategorias();
  const disposicion = referencias[0]?.disposicion || { retiradas: [], revision: 0 };
  const refrescar = () => Promise.all(['lp-referencias', 'referencias', 'suministros-subcategorias', 'listaprecios-catalogo']
    .map((k) => client.invalidateQueries({ queryKey: [k] })));

  const crearNueva = useMutation({
    mutationFn: () => agregarSubcategoriaNueva(destino === TODOS ? referencias[0].id : Number(destino),
      { nombre: nombre.trim(), categoria: Number(categoria), todas: destino === TODOS }),
    onSuccess: async (datos) => {
      await refrescar();
      notify?.(`«${datos.nombre}» agregada a ${grupo.nombre}. Ahora agrega sus costos.`, 'success');
      onClose();
    },
    onError: (e) => setError(mensajeDeError(e, 'No se pudo agregar. Revisa los datos e intenta de nuevo.')),
  });
  const delCatalogo = useMutation({
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
      if (elegidas.some((id) => disposicion.retiradas.includes(id))) {
        await guardarDisposicionSubcategorias(referencias[0].id, { revision: disposicion.revision, retiradas: disposicion.retiradas.filter((id) => !elegidas.includes(id)) });
      }
    },
    onSuccess: async () => {
      await refrescar();
      notify?.(`${elegidas.length === 1 ? 'Subcategoría agregada' : 'Subcategorías agregadas'} a ${grupo.nombre}. Ahora agrega sus costos.`, 'success');
      onClose();
    },
    onError: (e) => setError(mensajeDeError(e, 'No se pudo agregar. Revisa los datos e intenta de nuevo.')),
  });
  const pendiente = crearNueva.isPending || delCatalogo.isPending;
  const enviar = (e) => {
    e.preventDefault(); setError('');
    if (!destino) { setError('Elige el proveedor al que se agrega.'); return; }
    if (modo === 'nueva') {
      if (!nombre.trim()) { setError('Escribe el nombre de la subcategoría.'); return; }
      if (!categoria) { setError('Elige la categoría.'); return; }
      crearNueva.mutate();
    } else {
      if (!elegidas.length) { setError('Elige al menos una subcategoría.'); return; }
      delCatalogo.mutate();
    }
  };
  const opcionesCategoria = categorias.data?.length ? categorias.data : categoriasRef;

  return (
    <Modal open title={`Nueva subcategoría en ${grupo.nombre}`} size="md" className="lp-admin-page lp-nueva-ref" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose} disabled={pendiente}>Cancelar</Button>
        <Button type="submit" form="lp-agregar-sub" loading={pendiente}>Agregar</Button></>}>
      <form id="lp-agregar-sub" onSubmit={enviar} noValidate>
        {puedeCatalogo && <div className="lp-agregar-sub__modo" role="group" aria-label="Cómo agregar">
          <button type="button" aria-pressed={modo === 'nueva'} onClick={() => { setModo('nueva'); setError(''); }}>Nueva</button>
          <button type="button" aria-pressed={modo === 'catalogo'} onClick={() => { setModo('catalogo'); setError(''); }}>Elegir del catálogo</button>
        </div>}
        {referencias.length > 1 && <div className="lp-nueva-ref__fila"><label>Proveedor<select className="ds-input" aria-label="Proveedor" value={destino} onChange={(e) => setDestino(e.target.value)}>
          <option value="">Seleccionar…</option>
          {referencias.map((r) => <option key={r.id} value={r.id}>{etiquetaProveedor(r, referencias)}</option>)}
          <option value={TODOS}>Todos los proveedores</option>
        </select></label></div>}
        {modo === 'nueva' ? <>
          <div className="lp-nueva-ref__fila">
            <label>Nombre<input className="ds-input" aria-label="Nombre de la subcategoría" autoFocus maxLength={100} placeholder="Ej.: Silla de comedor"
              value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
            <label>Categoría<select className="ds-input" aria-label="Categoría de la subcategoría" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">Elige…</option>
              {opcionesCategoria.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select></label>
          </div>
          <p className="lp-section-hint">Queda solo en esta referencia: cambiarle el nombre después no afecta a las demás.</p>
        </> : <SelectorSubcategorias elegidas={elegidas} onCambiar={setElegidas} excluir={visibles} categoriaInicial={categoriasRef[0]?.id} ayuda="Ya asignadas no se muestran" />}
        {error && <p className="ds-error-box" role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
