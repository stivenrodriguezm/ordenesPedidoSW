import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { FaChevronDown, FaChevronUp, FaEdit, FaLayerGroup, FaPlus, FaTrash } from 'react-icons/fa';
import { Button, Modal } from '../../components/ui';
import { createLinea, getLinea, guardarDisposicionSubcategorias, sincronizarSubcategorias } from '../../services/listaPreciosService';
import { mensajeDeError } from '../../services/errores';
import { actualizarLineaEnCache } from './invalidarListaPrecios';
import NombreSubcategoria from './NombreSubcategoria';
import AgregarSubcategoria from './AgregarSubcategoria';
import { usePermissions } from '../../AppContext';
import VariantesOrdenables from './VariantesOrdenables';
import { aplicarDisposicionSubcategorias } from './disposicionSubcategorias';
import { etiquetaProveedor, proveedorInicial, subcategoriasReferencia } from './subcategoriasReferencia';
import ProveedoresAgrupacion from './ProveedoresAgrupacion';

const pendientes = elemento => elemento?.querySelector('[data-estado="error"], [data-estado="pendiente"], [data-estado="guardando"]');

export default function ReferenciaUnificada({ grupo, renderVariante, renderOpciones, notify, onConfigurar, onEdit, onAgrupar }) {
  const client = useQueryClient(), contenedor = useRef(null);
  const filas = useMemo(() => subcategoriasReferencia(grupo.referencias), [grupo.referencias]);
  const todas = useMemo(() => subcategoriasReferencia(grupo.referencias, true), [grupo.referencias]);
  const disposicion = grupo.referencias[0]?.disposicion || { orden: [], retiradas: [], revision: 0 };
  const [eliminando, setEliminando] = useState(null);
  const [agregando, setAgregando] = useState(false);
  const hasPermission = usePermissions();
  const guardarDisposicion = useMutation({
    mutationFn: cambios => guardarDisposicionSubcategorias(grupo.referencias[0].id, { revision: disposicion.revision, ...cambios }),
    onSuccess: async (datos, cambios) => {
      aplicarDisposicionSubcategorias(client, datos);
      setEliminando(null);
      if ('retiradas' in cambios) {
        await Promise.all(grupo.referencias.filter(r => r.linea).map(async r => {
          await client.invalidateQueries({ queryKey: ['lp-linea', r.linea.id] });
          const actual = client.getQueryData(['lp-linea', r.linea.id]);
          if (actual) actualizarLineaEnCache(client, r.linea.id, () => actual);
        }));
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: ['listaprecios-catalogo'] }),
        client.invalidateQueries({ queryKey: ['lp-precio-variante'] }),
      ]);
    },
    onError: async error => {
      notify(mensajeDeError(error, 'No se pudo guardar el cambio. Se conserva la lista anterior.'), 'error');
      if (error.response?.status === 409) await client.invalidateQueries({ queryKey: ['lp-referencias'] });
    },
  });
  const puedeCambiar = () => {
    if (guardarDisposicion.isPending || pendientes(contenedor.current)) {
      notify('Confirma o corrige los campos pendientes antes de cambiar las subcategorías.', 'warning'); return false;
    }
    return true;
  };
  const clave = `lp-proveedores-subcategoria:${grupo.clave}`;
  const [elegidos, setElegidos] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(clave)) || {}; } catch { return {}; }
  });
  const [opciones, setOpciones] = useState(false);
  // Un conjunto no tiene proveedor: su ficha está en un proveedor, pero cada pieza conserva el suyo.
  const conjuntoDe = fila => fila.referencias.find(r => r.linea?.variantes?.some(v => v.subcategoria === fila.id && (v.es_conjunto || v.componentes?.length)));
  const seleccion = new Map(filas.map(f => [f.id, conjuntoDe(f)?.id ?? proveedorInicial(f, elegidos[f.id])]));
  const refs = grupo.referencias.filter(r => [...seleccion.values()].includes(r.id));
  // Las piezas de un conjunto pueden ser de cualquier proveedor: con un conjunto (o al formar
  // uno) se cargan todas las fichas de la referencia; si no, solo las de los proveedores elegidos.
  const todasLasFichas = opciones || filas.some(conjuntoDe);
  const conLinea = grupo.referencias.filter(r => r.linea && (todasLasFichas || refs.includes(r)));
  const consultas = useQueries({ queries: conLinea.map(r => ({
    queryKey: ['lp-linea', r.linea.id], queryFn: ({ signal }) => getLinea(r.linea.id, { signal }), staleTime: 60_000,
  })) });
  const detalles = new Map(consultas.filter(q => q.data).map(q => [q.data.referencia, q.data]));
  const consultasPorRef = new Map(conLinea.map((r, i) => [r.id, consultas[i]]));
  const lineasGrupo = conLinea.map(r => detalles.get(r.id)).filter(Boolean);
  // «Agregar costos» crea solo la ficha de la subcategoría pulsada (varias comparten proveedor).
  const configurar = useMutation({
    mutationFn: ({ ref, subcategoria }) => ref.linea ? sincronizarSubcategorias(ref.linea.id, subcategoria)
      : createLinea({ referencia: ref.id, subcategoria, activo: false }),
    onSuccess: (data, { ref }) => {
      client.setQueryData(['lp-linea', data.id], data);
      client.setQueriesData({ queryKey: ['lp-referencias'] }, prev => prev?.map(r => r.id === ref.id ? { ...r, linea: data } : r));
      actualizarLineaEnCache(client, data.id, () => data);
      onConfigurar(ref.id);
    },
  });
  const configurandoFila = fila => configurar.isPending && configurar.variables?.subcategoria === fila.id;
  const cambiarProveedor = (fila, valor, nodo) => {
    if (pendientes(nodo.closest('.lp-subcategoria-proveedor'))) {
      notify('Confirma o corrige los campos pendientes antes de cambiar el proveedor.', 'warning'); return;
    }
    const nuevos = { ...elegidos, [fila.id]: valor ? Number(valor) : '' };
    setElegidos(nuevos);
    try { sessionStorage.setItem(clave, JSON.stringify(nuevos)); } catch { /* preferencia de esta vista */ }
  };
  return <div className="lp-referencia-unificada" ref={contenedor}>
    {!filas.length && <p className="lp-section-hint">{todas.length ? "Todas las subcategorías están retiradas de la lista." : "Esta referencia todavía no tiene subcategorías asignadas en Referencias."}</p>}
    <div className="lp-subcategorias-unificadas">
      <VariantesOrdenables linea={{ nombre: grupo.nombre, variantes: filas }} notify={notify} etiquetaLista={`Subcategorías de ${grupo.nombre}`}
        onGuardar={orden => guardarDisposicion.mutateAsync({ orden })} puedeOrdenar={puedeCambiar}
        acciones={fila => <button type="button" className="lp-quitar-subcategoria" aria-label={`Eliminar ${fila.nombre} de la lista`} title="Eliminar subcategoría de la lista" disabled={guardarDisposicion.isPending} onClick={() => { if (puedeCambiar()) setEliminando(fila); }}><FaTrash aria-hidden="true" /></button>}>
      {fila => {
        const ref = fila.referencias.find(r => r.id === seleccion.get(fila.id));
        const consulta = ref && consultasPorRef.get(ref.id), linea = ref && detalles.get(ref.id);
        const variante = linea?.variantes.find(v => v.subcategoria === fila.id);
        const control = conjuntoDe(fila) ? <ProveedoresAgrupacion componentes={variante?.componentes} />
          : <label className="lp-proveedor-subcategoria"><span>Proveedor</span>
          <select aria-label={`Proveedor de ${fila.nombre}`} value={seleccion.get(fila.id)} onChange={e => cambiarProveedor(fila, e.target.value, e.currentTarget)} disabled={configurar.isPending}>
            <option value="">Seleccionar proveedor…</option>{fila.referencias.map(r => <option key={r.id} value={r.id}>{etiquetaProveedor(r, fila.referencias)}</option>)}
          </select>
        </label>;
        return <div className="lp-subcategoria-proveedor" key={fila.id}>
          {variante ? renderVariante({ variante, linea, proveedorControl: control, lineasGrupo }) : <div className="lp-subcategoria-sin-costo">
            <div className="lp-subcategoria-identidad"><NombreSubcategoria subcategoria={fila.id} nombre={fila.nombre} referencia={fila.referencias[0]?.id} /><span>{fila.categoria_nombre}</span></div>{control}
            {!ref ? <span className="lp-section-hint">Elige el proveedor para ver y editar sus costos.</span>
              : consulta?.isPending ? <span role="status">Cargando costos…</span>
                : consulta?.isError ? <div role="alert">No se pudieron cargar los costos. <button type="button" onClick={() => consulta.refetch()}>Reintentar</button></div>
                  : <Button size="sm" variant="secondary" loading={configurandoFila(fila)} disabled={configurar.isPending && !configurandoFila(fila)}
                    onClick={() => configurar.mutate({ ref, subcategoria: fila.id })}>Agregar costos</Button>}
          </div>}
          {configurar.isError && configurar.variables?.subcategoria === fila.id && <p role="alert" className="ds-error-box">{mensajeDeError(configurar.error, 'No se pudo configurar. Conservamos tu selección.')}</p>}
        </div>;
      }}
      </VariantesOrdenables>
      {(hasPermission('EDITAR_LISTA_PRECIOS') || hasPermission('ADMINISTRAR_REFERENCIAS')) && <button type="button" className="lp-agregar-subcategoria" onClick={() => setAgregando(true)}>
        <FaPlus aria-hidden="true" /> Agregar subcategoría</button>}
    </div>
    {agregando && <AgregarSubcategoria grupo={grupo} visibles={filas.map(f => f.id)} notify={notify} onClose={() => setAgregando(false)} />}
    {grupo.referencias.some(r => r.linea?.variantes.some(v => !v.es_conjunto && !v.componentes?.length)) && <div className="lp-crear-agrupacion">
      <Button size="sm" variant="secondary" icon={FaLayerGroup} onClick={() => { if (puedeCambiar()) onAgrupar(grupo); }}>Crear agrupación</Button>
      <span className="lp-section-hint">Una nueva subcategoría con piezas de cualquier proveedor de {grupo.nombre}.</span>
    </div>}
    <Modal open={!!eliminando} title="Eliminar subcategoría de la lista" onClose={() => !guardarDisposicion.isPending && setEliminando(null)} size="sm" className="lp-admin-page"
      footer={<><Button variant="secondary" disabled={guardarDisposicion.isPending} onClick={() => setEliminando(null)}>Cancelar</Button><Button loading={guardarDisposicion.isPending} onClick={() => guardarDisposicion.mutate({ retiradas: [...disposicion.retiradas, eliminando.id] })}>Eliminar de la lista</Button></>}>
      <p>¿Eliminar <strong>{eliminando?.nombre}</strong> de <strong>{grupo.nombre}</strong>?</p><p>Se retirará de la consulta de precios en todos sus proveedores. Los costos y los datos de Referencias se conservan.</p>
      {guardarDisposicion.isError && <p role="alert" className="ds-error-box">{mensajeDeError(guardarDisposicion.error, 'No se pudo eliminar. Intenta de nuevo.')}</p>}
    </Modal>
    {!!refs.length && <div className="lp-unificada-opciones">
      <button type="button" className="lp-unificada-opciones-toggle" aria-expanded={opciones} onClick={() => {
        if (opciones && pendientes(contenedor.current)) { notify('Confirma los cambios pendientes antes de cerrar las opciones.', 'warning'); return; }
        setOpciones(!opciones);
      }}><FaLayerGroup aria-hidden="true" /> Especiales y configuración {opciones ? <FaChevronUp /> : <FaChevronDown />}</button>
      {opciones && refs.map(ref => {
        const linea = detalles.get(ref.id);
        return linea && <section className="lp-unificada-proveedor-opciones" key={ref.id}>
          <div className="lp-unificada-proveedor-titulo"><strong>{etiquetaProveedor(ref, refs)}</strong>
            <Button size="sm" variant="ghost" icon={FaEdit} onClick={() => {
              if (pendientes(contenedor.current)) { notify('Confirma los campos pendientes antes de configurar los precios.', 'warning'); return; }
              onEdit(linea);
            }} aria-label={`Configurar precios de ${grupo.nombre} de ${ref.proveedor_nombre}`}>Configurar precios</Button></div>
          {renderOpciones(linea, lineasGrupo)}
        </section>;
      })}
    </div>}
  </div>;
}
