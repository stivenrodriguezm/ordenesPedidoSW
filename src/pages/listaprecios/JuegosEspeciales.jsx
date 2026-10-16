import React, { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FaArrowDown, FaArrowUp, FaBookOpen, FaChevronDown, FaPlus, FaSearch, FaStar, FaTrash } from 'react-icons/fa';
import { createEspecial, updateEspecial, deleteEspecial, getBibliotecaEspeciales } from '../../services/listaPreciosService';
import { mensajeDeError } from '../../services/errores';
import { mostrarPesos } from '../../utils/capturaPrecios';
import { Button, Modal } from '../../components/ui';
import CampoEspecial from './CampoEspecial';
import { borradorEspecial, diferenciaEspecial, validarBorradorEspecial } from './configuracionEspecial';
import invalidarListaPrecios, { actualizarLineaEnCache } from './invalidarListaPrecios';
import './EspecialesLinea.css';

const normalizar = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const firmado = n => n == null ? 'Por confirmar' : `${n < 0 ? '−' : '+'}${mostrarPesos(Math.abs(n))}`;

export function CamposConfiguracion({ form, onChange, errores = {}, general }) {
  const cambio = patch => onChange({ ...form, ...patch });
  return <div className="lp-especial-configuracion">
    <div className="lp-especial-economia">
      <CampoEspecial label="Costo del especial" moneda valor={form.costo} onChange={costo => cambio({ costo })} error={errores.costo} />
      <div className="lp-especial-margen"><label><input type="checkbox" checked={form.general} onChange={e => cambio({ general: e.target.checked })} /> Usar multiplicador general{general != null ? ` (×${Number(general).toLocaleString('es-CO')})` : ''}</label>
        {!form.general && <CampoEspecial label="Multiplicador del especial" valor={form.multiplo} onChange={multiplo => cambio({ multiplo })} sufijo="×" error={errores.multiplo} />}</div>
      <div className="lp-especial-sentido"><span>Al precio del producto</span><div role="group" aria-label="Efecto del especial">
        <button type="button" aria-pressed={form.sentido === 'sube'} onClick={() => cambio({ sentido: 'sube' })}><FaArrowUp /> Sube</button>
        <button type="button" aria-pressed={form.sentido === 'baja'} onClick={() => cambio({ sentido: 'baja' })}><FaArrowDown /> Baja</button></div></div>
    </div>
    <div className="lp-especial-materiales"><div><label><input type="checkbox" checked={form.tela} onChange={e => cambio({ tela: e.target.checked })} /> Lleva tela</label>
      {form.tela ? <CampoEspecial label="Metraje de tela del especial" valor={form.metraje} onChange={metraje => cambio({ metraje })} sufijo="m" error={errores.metraje} /> : <small>Sin consumo de tela</small>}</div>
      <div><label><input type="checkbox" checked={form.cuero} onChange={e => cambio({ cuero: e.target.checked })} /> Lleva cuero</label>
        {form.cuero ? <CampoEspecial label="Decimetraje de cuero del especial" valor={form.decimetraje} onChange={decimetraje => cambio({ decimetraje })} sufijo="dm" error={errores.decimetraje} /> : <small>Sin consumo de cuero</small>}</div></div>
    <p className="lp-especial-formula">Diferencia de venta = (costo del especial + consumo × precio del grupo) × multiplicador del especial.</p>
  </div>;
}

export function BibliotecaEspeciales({ onClose, onElegir }) {
  const [busqueda, setBusqueda] = useState('');
  const consulta = useQuery({ queryKey: ['lp-especiales-biblioteca'], queryFn: getBibliotecaEspeciales, staleTime: 30000 });
  const filas = (consulta.data || []).filter(e => normalizar(`${e.nombre} ${e.origen}`).includes(normalizar(busqueda)));
  return <Modal open title="Biblioteca de especiales" size="lg" onClose={onClose} className="lp-especial-biblioteca">
    <p className="lp-especial-biblioteca-ayuda">Todos los especiales juntos, sin importar la colección. Al usar uno se copian sus datos; los cambios en la copia no afectan al original.</p>
    <div className="lp-search"><FaSearch /><input type="search" aria-label="Buscar un especial guardado" placeholder="Nombre del especial o referencia de origen…" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div>
    {consulta.isLoading ? <p role="status">Cargando especiales guardados…</p> : consulta.isError ? <p role="alert">No se pudo cargar la biblioteca. <button type="button" onClick={() => consulta.refetch()}>Reintentar</button></p>
      : !filas.length ? <p className="lp-especial-biblioteca-ayuda">{busqueda ? 'No encontramos coincidencias.' : 'Los especiales que guardes aparecerán aquí para reutilizarlos.'}</p>
        : <div className="lp-especial-biblioteca-lista">{filas.map(e => <div key={e.id} className="lp-especial-biblioteca-item"><div><strong>{e.nombre}</strong><span>{e.origen || 'Biblioteca común'}</span><p>Costo <b>{mostrarPesos(e.configuracion.costo_base)}</b> · {e.configuracion.multiplicador == null ? 'Multiplicador general' : `×${Number(e.configuracion.multiplicador).toLocaleString('es-CO')}`} · {e.configuracion.sentido === 'baja' ? 'Baja' : 'Sube'}</p>
          {(e.configuracion.metraje_tela || e.configuracion.decimetraje_cuero) && <small>{e.configuracion.metraje_tela ? `Tela: ${Number(e.configuracion.metraje_tela).toLocaleString('es-CO')} m` : ''}{e.configuracion.metraje_tela && e.configuracion.decimetraje_cuero ? ' · ' : ''}{e.configuracion.decimetraje_cuero ? `Cuero: ${Number(e.configuracion.decimetraje_cuero).toLocaleString('es-CO')} dm` : ''}</small>}</div>
          <Button size="sm" variant="secondary" aria-label={`Usar ${e.nombre} de ${e.origen || 'biblioteca'}`} onClick={() => onElegir(e)}>Usar especial</Button></div>)}</div>}
  </Modal>;
}

function EditorEspecial({ especial, linea, grupos, general, notify, onCreado, onCancelar }) {
  const nuevo = !especial.id, variantes = linea.variantes;
  const baseConfig = especial.configuracion_efectiva || especial.configuracion || {};
  const configInicial = borradorEspecial(baseConfig);
  const excepciones = Object.fromEntries((especial.aplicaciones || []).filter(a => {
    const c = especial.formato_anterior ? a.configuracion_efectiva : a.configuracion;
    return c && Object.keys(c).length && JSON.stringify(borradorEspecial({ ...baseConfig, ...c })) !== JSON.stringify(configInicial);
  }).map(a => [a.variante, borradorEspecial({ ...baseConfig, ...(especial.formato_anterior ? a.configuracion_efectiva : a.configuracion) })]));
  const inicial = { nombre: especial.nombre || '', config: configInicial, aplica: nuevo ? variantes.map(v => v.id) : (especial.aplicaciones || []).map(a => a.variante), excepciones };
  const [form, setForm] = useState(inicial), [guardado, setGuardado] = useState(inicial);
  const [expandido, setExpandido] = useState(nuevo);
  const [ajustando, setAjustando] = useState([]), [errores, setErrores] = useState({}), [error, setError] = useState('');
  const nombreId = useId(), contenidoId = useId(), queryClient = useQueryClient();
  const cambiado = nuevo || JSON.stringify(form) !== JSON.stringify(guardado);
  const cambiar = patch => { setForm(f => ({ ...f, ...patch })); setError(''); setErrores({}); };
  const configuracion = id => form.excepciones[id] || form.config;
  const guardar = useMutation({ mutationFn: data => nuevo ? createEspecial({ ...data, linea: linea.id }) : updateEspecial(especial.id, data),
    onSuccess: async data => { setGuardado(form);
      if (data?.id) actualizarLineaEnCache(queryClient, linea.id, l => ({ ...l, especiales: [...(l.especiales || []).filter(e => e.id !== data.id), data] }));
      await invalidarListaPrecios(queryClient, linea.id); setExpandido(false); notify('Especial guardado y disponible en la biblioteca.', 'success'); onCreado?.(); },
    onError: e => setError(mensajeDeError(e, 'No se pudo guardar. Conservamos todos tus datos.')) });
  const borrar = useMutation({ mutationFn: () => deleteEspecial(especial.id), onSuccess: () => { invalidarListaPrecios(queryClient, linea.id); notify('Especial quitado de esta colección. Su configuración sigue en la biblioteca.', 'success'); }, onError: e => setError(mensajeDeError(e)) });
  const ocupado = guardar.isPending || borrar.isPending;
  const enviar = e => {
    e.preventDefault(); setError('');
    if (!form.nombre.trim()) { setError('Escribe el nombre del especial.'); return; }
    if (!form.aplica.length) { setError('Selecciona al menos un producto.'); return; }
    const soloNombre = !nuevo && JSON.stringify({ ...form, nombre: guardado.nombre }) === JSON.stringify(guardado);
    if (soloNombre) { guardar.mutate({ nombre: form.nombre.trim() }); return; }
    const base = validarBorradorEspecial(form.config), fallos = { general: base.errores };
    const aplicaciones = form.aplica.map(id => {
      if (!(id in form.excepciones)) return { variante: id };
      const individual = validarBorradorEspecial(form.excepciones[id]); fallos[id] = individual.errores;
      return { variante: id, configuracion: individual.config };
    });
    if (Object.values(fallos).some(f => Object.keys(f).length)) { setErrores(fallos); setError('Revisa los campos marcados. Los datos siguen aquí.'); return; }
    guardar.mutate({ nombre: form.nombre.trim(), configuracion: base.config, aplicaciones });
  };
  const resumen = validarBorradorEspecial(form.config);
  const costoResumen = form.config.costo === configInicial.costo ? baseConfig.costo_base : resumen.config.costo_base;
  const numero = n => n == null || n === '' ? 'Por definir' : Number(n).toLocaleString('es-CO');
  const ajustes = form.aplica.filter(id => id in form.excepciones).length;
  return <form className={`lp-ajuste lp-especial-producto ${expandido ? 'is-expandido' : ''}`} aria-label={nuevo ? 'Nuevo especial' : especial.nombre} data-estado={ocupado ? 'guardando' : cambiado ? 'pendiente' : ''} onSubmit={enviar} noValidate>
    {!nuevo && <button type="button" className="lp-especial-ficha" aria-label={`${expandido ? 'Contraer' : 'Editar'} especial ${form.nombre || especial.nombre}`} aria-expanded={expandido} aria-controls={contenidoId} disabled={ocupado} onClick={() => setExpandido(!expandido)}>
      <span className="lp-especial-ficha-titulo"><FaStar aria-hidden="true" /><strong>{form.nombre || 'Especial sin nombre'}</strong><span>{expandido ? 'Cerrar' : 'Editar'} <FaChevronDown aria-hidden="true" /></span></span>
      <span className="lp-especial-ficha-costo"><span>Costo <b>{costoResumen == null || costoResumen === '' ? 'Por definir' : mostrarPesos(costoResumen)}</b></span><span>×{numero(form.config.general ? general : resumen.config.multiplicador)}{form.config.general ? ' general' : ''}</span></span>
      <span className="lp-especial-ficha-datos"><span className="lp-especial-ficha-sentido">{form.config.sentido === 'baja' ? <FaArrowDown aria-hidden="true" /> : <FaArrowUp aria-hidden="true" />}{form.config.sentido === 'baja' ? 'Baja' : 'Sube'}</span><span>{form.aplica.length}/{variantes.length} productos</span>{ajustes > 0 && <span>{ajustes} {ajustes === 1 ? 'ajuste individual' : 'ajustes individuales'}</span>}</span>
      {(form.config.tela || form.config.cuero || especial.formato_anterior || cambiado) && <span className="lp-especial-ficha-detalles">{form.config.tela && <span>Tela {numero(resumen.config.metraje_tela)} m</span>}{form.config.cuero && <span>Cuero {numero(resumen.config.decimetraje_cuero)} dm</span>}{especial.formato_anterior && <span>Cálculo anterior</span>}{cambiado && <span className="lp-especial-ficha-pendiente">Sin guardar</span>}</span>}
    </button>}
    <div id={contenidoId} hidden={!expandido} className="lp-especial-editor">
    {expandido && <>
    <div className="lp-ajuste-cabecera"><span className="lp-ajuste-insignia"><FaStar /> {nuevo ? 'Nuevo especial' : 'Especial por costo'}</span>
      {!nuevo && <button type="button" className="lp-ajuste-eliminar" aria-label={`Quitar ${especial.nombre} de esta colección`} disabled={ocupado} onClick={() => window.confirm(`¿Quitar «${especial.nombre}» de esta colección? La biblioteca se conserva.`) && borrar.mutate()}><FaTrash /></button>}</div>
    <fieldset disabled={ocupado}><div className="lp-especial-nombre"><label htmlFor={nombreId}>Nombre que verá el vendedor</label><input id={nombreId} value={form.nombre} maxLength={120} placeholder="Ej.: Reclinable eléctrico" onChange={e => cambiar({ nombre: e.target.value })} /></div>
      <CamposConfiguracion form={form.config} general={general} errores={errores.general} onChange={config => cambiar({ config })} />
      {especial.formato_anterior && <p className="lp-especial-anterior">Este especial conserva su cálculo anterior. Al guardar cambios de costo o consumos se aplicará el multiplicador del especial que ves aquí.</p>}
      <div className="lp-ajuste-productos-cabecera"><strong>Productos a los que aplica <span>{form.aplica.length}/{variantes.length}</span></strong><div>
        <button type="button" onClick={() => cambiar({ aplica: variantes.map(v => v.id) })}>Todos</button><button type="button" onClick={() => cambiar({ aplica: [] })}>Ninguno</button></div></div>
      {variantes.map(v => {
        const activa = form.aplica.includes(v.id), distinta = v.id in form.excepciones, editar = ajustando.includes(v.id);
        const filas = (v.precios_venta || []).map(p => ({ ...p, diferencia: diferenciaEspecial(configuracion(v.id), grupos.find(g => g.id === p.grupo), general) }));
        const primera = filas.find(p => p.diferencia != null);
        return <div className={`lp-ajuste-producto ${activa ? 'is-activo' : ''}`} key={v.id}><div className="lp-ajuste-producto-fila">
          <label><input type="checkbox" checked={activa} onChange={() => cambiar({ aplica: activa ? form.aplica.filter(id => id !== v.id) : [...form.aplica, v.id] })} /><span>{v.nombre}</span></label>
          {activa && <><span className={`lp-ajuste-valor ${distinta ? 'is-excepcion' : ''}`}>{primera ? firmado(primera.diferencia) : 'Por configurar'}<small>{distinta ? 'Personalizado' : 'General'}{primera?.grupo_nombre ? ` · ${primera.grupo_nombre}` : ''}</small></span>
            <button type="button" className="lp-ajuste-enlace" aria-label={`${editar ? 'Cerrar ajuste' : 'Ajustar'} ${v.nombre}`} onClick={() => setAjustando(ids => editar ? ids.filter(id => id !== v.id) : [...ids, v.id])}>{editar ? 'Cerrar ajuste' : 'Ajustar'}</button></>}
        </div>{activa && primera && <p className="lp-ajuste-vista">{mostrarPesos(primera.precio)} <span>→</span><strong>{mostrarPesos(Number(primera.precio) + primera.diferencia)}</strong><small>con este especial</small></p>}
          {activa && filas.length > 1 && <details className="lp-especial-precios"><summary>Ver precios por grupo</summary><div>{filas.map(p => <p key={p.grupo ?? 'unico'}><span>{p.grupo_nombre || 'Sin tela'}</span><span>{p.diferencia == null ? 'Material no habilitado' : `${firmado(p.diferencia)} → ${mostrarPesos(Number(p.precio) + p.diferencia)}`}</span></p>)}</div></details>}
          {activa && editar && <div className="lp-especial-excepcion"><p>Configuración para <strong>{v.nombre}</strong></p><CamposConfiguracion form={configuracion(v.id)} general={general} errores={errores[v.id]} onChange={config => cambiar({ excepciones: { ...form.excepciones, [v.id]: config } })} />
            {distinta && <button type="button" className="lp-ajuste-enlace" onClick={() => { const copia = { ...form.excepciones }; delete copia[v.id]; cambiar({ excepciones: copia }); }}>Usar configuración general</button>}</div>}
        </div>;
      })}
    </fieldset>
    {error && <p className="lp-ajuste-error" role="alert">{error}</p>}
    <div className="lp-ajuste-pie"><span role="status">{guardar.isPending ? 'Guardando…' : cambiado ? 'Cambios sin guardar' : 'Guardado en el servidor'}</span><div>
      {nuevo && <Button variant="ghost" size="sm" disabled={ocupado} onClick={onCancelar}>Cancelar</Button>}
      <Button type="submit" size="sm" loading={guardar.isPending} disabled={ocupado || !cambiado}>{nuevo ? 'Crear especial' : 'Guardar cambios'}</Button></div></div>
    </>}
    </div>
  </form>;
}

export function EspecialesLinea({ linea, grupos = [], multiplicadores = [], notify }) {
  const [nuevo, setNuevo] = useState(null), [biblioteca, setBiblioteca] = useState(false);
  const general = multiplicadores.find(m => m.es_general)?.valor;
  return <section className="lp-ajustes" aria-label={`Especiales de ${linea.nombre || 'esta colección'}`}><div className="lp-ajustes-cabecera"><div><h3><FaStar /> Especiales <span className="lp-especiales-cantidad">{linea.especiales?.length || 0}</span></h3><p>Abre una ficha para editarla o reutiliza un especial guardado.</p></div><div className="lp-especial-acciones">
    <Button size="sm" variant="secondary" icon={FaBookOpen} disabled={!!nuevo || !linea.variantes.length} onClick={() => setBiblioteca(true)}>Usar uno existente</Button>
    <Button size="sm" variant="ghost" icon={FaPlus} disabled={!!nuevo || !linea.variantes.length} onClick={() => setNuevo({ nombre: '', configuracion: {} })}>Nuevo especial</Button></div></div>
    <div className="lp-especiales-fichas">
    {nuevo && <EditorEspecial key={nuevo.origenId || 'nuevo'} especial={nuevo} linea={linea} grupos={grupos} general={general} notify={notify} onCreado={() => setNuevo(null)} onCancelar={() => setNuevo(null)} />}
    {(linea.especiales || []).map(e => <EditorEspecial key={`${e.id}-${JSON.stringify(e)}`} especial={e} linea={linea} grupos={grupos} general={general} notify={notify} />)}
    </div>
    {!nuevo && !linea.especiales?.length && <p className="lp-ajustes-vacio">Sin especiales. Crea uno o reutiliza un especial guardado de otra referencia.</p>}
    {biblioteca && <BibliotecaEspeciales onClose={() => setBiblioteca(false)} onElegir={e => { setNuevo({ nombre: e.nombre, configuracion: e.configuracion, origenId: e.id }); setBiblioteca(false); }} />}
  </section>;
}
