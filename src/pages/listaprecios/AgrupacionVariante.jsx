import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FaChevronDown, FaChevronUp, FaLayerGroup, FaTrash } from 'react-icons/fa';
import { Button } from '../../components/ui';
import { crearAgrupacion, guardarComponentes, simularComponentes, simularNuevaAgrupacion } from '../../services/listaPreciosService';
import { mensajeDeError } from '../../services/errores';
import { leerPesos, mostrarPesos } from '../../utils/capturaPrecios';
import useDebounce from '../../hooks/useDebounce';
import CampoEspecial from './CampoEspecial';
import AdicionalesComponente from './AdicionalesComponente';
import CargosVariante from './CargosVariante';
import { borradorAdicionales, validarAdicionales } from './capturaAdicionalesComponente';
import invalidarListaPrecios, { actualizarLineaEnCache } from './invalidarListaPrecios';
import './AgrupacionVariante.css';

const borrador = piezas => piezas.map(c => ({ variante: c.variante, cantidad: String(c.cantidad), costo: c.costo_unitario == null ? '' : String(c.costo_unitario), multiplo: c.multiplicador == null ? '' : Number(c.multiplicador).toLocaleString('es-CO', { maximumFractionDigits: 3, useGrouping: false }), adicionales: borradorAdicionales(c.adicionales || []) }));

function validar(form) {
  const errores = {};
  if (form.activa && !form.filas.length) errores.general = 'Agrega al menos una pieza.';
  const vistos = new Set();
  const componentes = form.activa ? form.filas.map((fila, i) => {
    const fallos = {};
    if (!fila.variante || vistos.has(fila.variante)) fallos.variante = 'Selecciona una pieza sin repetir; ajusta su cantidad.';
    vistos.add(fila.variante);
    if (!/^\d+$/.test(fila.cantidad) || Number(fila.cantidad) < 1 || Number(fila.cantidad) > 99) fallos.cantidad = 'Usa una cantidad entera de 1 a 99.';
    let costo = null, mult = null;
    if (fila.costo.trim()) { try { costo = String(leerPesos(fila.costo)); } catch (e) { fallos.costo = e.message; } }
    if (fila.multiplo.trim()) {
      if (!/^\d+(?:[.,]\d{1,3})?$/.test(fila.multiplo) || Number(fila.multiplo.replace(',', '.')) <= 0 || Number(fila.multiplo.replace(',', '.')) >= 1000) fallos.multiplo = 'Usa un múltiplo mayor a cero, menor a 1.000 y con máximo tres decimales.';
      else mult = String(Number(fila.multiplo.replace(',', '.')));
    }
    const extras = validarAdicionales(fila.adicionales || []);
    if (!extras.valido) fallos.adicionales = extras.errores;
    if (Object.keys(fallos).length) errores[i] = fallos;
    return { variante: fila.variante, cantidad: Number(fila.cantidad), costo_unitario: costo, multiplicador: mult,
      ...(extras.datos.length || fila.adicionalesEditados ? { adicionales: extras.datos } : {}) };
  }) : [];
  return { componentes, errores, valido: !Object.keys(errores).length };
}

export default function AgrupacionVariante({ variante, linea, categorias = [], notify, nuevo = false, onCreado, onCancelar, general }) {
  const client = useQueryClient();
  const [form, setForm] = useState(() => ({ activa: nuevo || !!variante.componentes?.length, filas: borrador(variante.componentes || []) }));
  const [guardado, setGuardado] = useState(form), [montado, setMontado] = useState(nuevo);
  const [abierto, setAbierto] = useState(nuevo), [errores, setErrores] = useState({}), [error, setError] = useState('');
  const [extras, setExtras] = useState(() => new Set());
  const [nombre, setNombre] = useState(''), [categoria, setCategoria] = useState(categorias[0]?.id || '');
  const cambiado = nuevo || JSON.stringify(form) !== JSON.stringify(guardado);
  const revision = useMemo(() => validar(form), [form]), consulta = JSON.stringify(revision.componentes);
  const consultaDemorada = useDebounce(consulta, 350);
  const usados = linea.variantes.some(v => v.id !== variante.id && v.componentes?.some(c => c.variante === variante.id));
  const disponibles = linea.variantes.filter(v => v.id !== variante.id && !v.componentes?.length);
  const cambiar = patch => { setForm(f => ({ ...f, ...patch })); setErrores({}); setError(''); };
  const cambiarFila = (i, patch) => cambiar({ filas: form.filas.map((f, j) => j === i ? { ...f, ...patch } : f) });
  const simulacion = useQuery({
    queryKey: ['lp-simulacion-componentes', nuevo ? `linea-${linea.id}` : variante.id, consultaDemorada],
    queryFn: () => nuevo ? simularNuevaAgrupacion(linea.id, JSON.parse(consultaDemorada)) : simularComponentes(variante.id, JSON.parse(consultaDemorada)),
    enabled: abierto && form.activa && revision.valido && consulta === consultaDemorada,
    retry: false, staleTime: 0,
  });
  const guardar = useMutation({
    mutationFn: componentes => nuevo ? crearAgrupacion(linea.id, { nombre: nombre.trim(), categoria: categoria ? Number(categoria) : null, componentes }) : guardarComponentes(variante.id, componentes),
    onSuccess: async data => {
      actualizarLineaEnCache(client, linea.id, l => ({
        ...l, variantes: nuevo ? [...l.variantes, data] : l.variantes.map(v => v.id === data.id ? data : v),
      }));
      setGuardado(form); await invalidarListaPrecios(client, linea.id);
      notify(form.activa ? 'Agrupación guardada. Los productos originales conservan sus costos.' : 'Guardado como producto individual.', 'success');
      onCreado?.(data);
    },
    onError: e => setError(mensajeDeError(e, 'No se pudo guardar la agrupación. Conservamos todos tus datos.')),
  });
  const enviar = e => {
    e.preventDefault(); setError(''); setErrores(revision.errores);
    if (nuevo && !nombre.trim()) { setError('Escribe el nombre de la agrupación.'); return; }
    if (!revision.valido) return;
    guardar.mutate(revision.componentes);
  };
  const abrirExtras = i => setExtras(a => { const n = new Set(a); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const quitarPieza = i => { cambiar({ filas: form.filas.filter((_, j) => j !== i) }); setExtras(new Set()); };
  const libres = disponibles.filter(v => !form.filas.some(f => f.variante === v.id));
  const multiplo = v => Number(v).toLocaleString('es-CO', { maximumFractionDigits: 3 });
  const contenido = () => <form className="lp-agrupacion-editor" aria-label={nuevo ? 'Nueva agrupación' : `Agrupación de ${variante.nombre}`} onSubmit={enviar} noValidate data-estado={guardar.isPending ? 'guardando' : cambiado ? 'pendiente' : ''}>
    <fieldset disabled={guardar.isPending}>
      {nuevo ? <div className="lp-agrupacion-identidad"><label>Nombre del conjunto<input className="ds-input" value={nombre} maxLength={150} placeholder="Ej.: Comedor de 6 puestos" onChange={e => setNombre(e.target.value)} /></label><label>Categoría<select className="ds-input" value={categoria} onChange={e => setCategoria(e.target.value)}>{categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label></div>
        : <label className="lp-agrupacion-toggle"><input type="checkbox" checked={form.activa} disabled={usados} onChange={e => cambiar({ activa: e.target.checked })} /> Combinar otras variantes de esta colección</label>}
      {usados && <p className="lp-agrupacion-ayuda">Esta pieza ya pertenece a otro conjunto. Los conjuntos se forman con productos individuales.</p>}
      {form.activa && <>
        <div className="lp-agr-piezas" role="list" aria-label="Piezas del conjunto">
          {form.filas.length > 0 && <div className="lp-agr-cabecera" aria-hidden="true"><span>Pieza</span><span>Cant.</span><span>Costo c/u</span><span>Múltiplo</span><span>Extras</span><span /></div>}
          {form.filas.map((fila, i) => {
            const origen = linea.variantes.find(v => v.id === fila.variante), fallos = errores[i] || {}, nombreP = origen?.nombre || `pieza ${i + 1}`;
            const nCargos = origen?.cargos?.length || 0, nEspeciales = fila.adicionales?.length || 0, abierto = extras.has(i);
            return <div className="lp-agr-pieza" role="listitem" key={fila.variante || `p${i}`} data-abierta={abierto || undefined}>
              <div className="lp-agr-fila">
                <div className="lp-agr-nombre"><strong>{origen?.nombre || 'Producto no disponible'}</strong>{origen && <small>{mostrarPesos(origen.costo_base)} · ×{multiplo(origen.multiplicador_efectivo)}</small>}</div>
                <CampoEspecial label="Cant." ariaLabel={`Cantidad de ${nombreP}`} valor={fila.cantidad} onChange={cantidad => cambiarFila(i, { cantidad })} error={fallos.cantidad} />
                <CampoEspecial label="Costo c/u" ariaLabel={`Costo unitario de ${nombreP}`} moneda valor={fila.costo} placeholder={origen ? mostrarPesos(origen.costo_base) : 'Del producto'} onChange={costo => cambiarFila(i, { costo })} error={fallos.costo} />
                <CampoEspecial label="Múltiplo" ariaLabel={`Multiplicador de ${nombreP}`} valor={fila.multiplo} sufijo="×" placeholder={origen ? multiplo(origen.multiplicador_efectivo) : 'Del producto'} onChange={multiplo => cambiarFila(i, { multiplo })} error={fallos.multiplo} />
                <button type="button" className="lp-agr-extras-btn" aria-expanded={abierto} aria-label={`Cargos y especiales de ${nombreP}`} onClick={() => abrirExtras(i)} data-error={fallos.adicionales ? true : undefined}>
                  <span>Cargos {nCargos}</span><span>Especiales {nEspeciales}</span>{abierto ? <FaChevronUp aria-hidden="true" /> : <FaChevronDown aria-hidden="true" />}
                </button>
                <button type="button" className="lp-agrupacion-quitar" aria-label={`Quitar pieza ${nombreP}`} onClick={() => quitarPieza(i)}><FaTrash aria-hidden="true" /></button>
              </div>
              {fallos.variante && <small className="lp-agrupacion-error" role="alert">{fallos.variante}</small>}
              {abierto && <div className="lp-agr-extras">
                {origen && <section aria-label={`Cargos de ${origen.nombre}`}><h5>Cargos de {origen.nombre} <small>Son los del producto: se guardan al instante y aplican también en su referencia</small></h5>
                  <CargosVariante variante={origen} lineaId={linea.id} notify={notify} /></section>}
                <section aria-label={`Especiales de ${nombreP} en este conjunto`}><h5>Especiales solo en este conjunto <small>Por cada unidad de la pieza</small></h5>
                  <AdicionalesComponente valor={fila.adicionales || []} general={general} errores={fallos.adicionales} onChange={adicionales => cambiarFila(i, { adicionales, adicionalesEditados: true })} /></section>
              </div>}
            </div>;
          })}
        </div>
        <div className="lp-agr-agregar">
          <select aria-label="Agregar pieza" value="" disabled={!libres.length} onChange={e => e.target.value && cambiar({ filas: [...form.filas, { variante: Number(e.target.value), cantidad: '1', costo: '', multiplo: '', adicionales: [] }] })}>
            <option value="">{libres.length ? '+ Agregar pieza…' : 'No quedan productos para agregar'}</option>
            {libres.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </select>
          <p className="lp-agrupacion-ayuda">{form.filas.length ? 'Costo y múltiplo vacíos = los del producto; lo que escribas aplica solo a este conjunto.' : 'Elige los productos de la colección que forman el conjunto.'}</p>
        </div>
        {errores.general && <p role="alert" className="lp-agrupacion-error">{errores.general}</p>}
        {!nuevo && variante.precios?.some(p => p.precio_manual != null) && <p className="lp-agrupacion-aviso">Este conjunto tiene precios manuales que siguen vigentes. Usa «Volver al calculado» en los grupos que deban tomar la suma de piezas.</p>}
        {form.filas.length > 0 && <div className="lp-agrupacion-calculo" aria-live="polite">
          {!revision.valido ? <p>Completa las piezas para calcular.</p> : consulta !== consultaDemorada || simulacion.isFetching ? <p>Calculando…</p> : simulacion.isError ? <p role="alert">{mensajeDeError(simulacion.error, 'No se pudo confirmar el cálculo.')} <button type="button" onClick={() => simulacion.refetch()}>Reintentar</button></p>
            : <>
              <div className="lp-agr-total"><small>Costo total</small><b>{mostrarPesos(simulacion.data?.costo_total_producto)}</b><small>sin tela/cuero</small></div>
              <ul className="lp-agr-grupos">{simulacion.data?.precios_venta?.map(p => {
                const costo = simulacion.data?.costos_por_grupo?.find(c => c.grupo === p.grupo)?.costo;
                return <li key={p.grupo ?? 'unico'}><small>{p.grupo_nombre || 'Sin tela'}</small><b>{mostrarPesos(p.precio)}</b>{costo != null && <span>Costo {mostrarPesos(costo)}</span>}</li>;
              })}</ul>
              {simulacion.data?.precios_venta?.length === 0 && <p>Las piezas no comparten un grupo habilitado. Revisa sus consumos y grupos.</p>}
            </>}
        </div>}
      </>}
      {!form.activa && guardado.activa && <p className="lp-agrupacion-aviso">Al guardar dejará de sumar piezas y usará su costo propio de {mostrarPesos(variante.costo_base)} con el multiplicador del producto.</p>}
    </fieldset>
    {error && <p className="lp-agrupacion-error" role="alert">{error}</p>}
    {(nuevo || cambiado) && <div className="lp-agrupacion-pie"><span role="status">{guardar.isPending ? 'Guardando…' : 'Cambios sin guardar'}</span><div>
      <Button size="sm" variant="ghost" disabled={guardar.isPending} onClick={() => { if (nuevo) onCancelar?.(); else { setForm(guardado); setError(''); setErrores({}); } }}>Cancelar</Button>
      <Button type="submit" size="sm" loading={guardar.isPending} disabled={!cambiado}>{nuevo ? 'Crear agrupación' : 'Guardar agrupación'}</Button>
    </div></div>}
  </form>;
  return nuevo ? contenido() : <details className="lp-agrupacion" open={abierto} onToggle={e => { setAbierto(e.currentTarget.open); if (e.currentTarget.open) setMontado(true); }} data-estado={guardar.isPending ? 'guardando' : cambiado ? 'pendiente' : ''}>
    <summary onClick={e => { e.preventDefault(); setAbierto(!abierto); setMontado(true); }}><FaLayerGroup aria-hidden="true" />{variante.componentes?.length ? `Agrupación · ${variante.componentes.map(c => `${c.cantidad} ${c.variante_nombre}`).join(' + ')}` : 'Formar un conjunto con otras variantes'}{cambiado && <span>Sin guardar</span>}</summary>{(abierto || montado) && contenido()}
  </details>;
}
