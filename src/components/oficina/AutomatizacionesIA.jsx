import React, {useState} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {FaArrowLeft, FaArrowRight, FaCalendarAlt, FaClock, FaPause, FaPen, FaPlay, FaPlus, FaArchive, FaUndo} from 'react-icons/fa';
import API from '../../services/api';
import Modal from '../ui/Modal';
import {useIdempotencia} from '../../hooks/useIdempotencia';
import {fechaTarea, horarioTarea, ESTADOS_TAREA} from './actividadAgente';
import './AutomatizacionesIA.css';

const errorTexto=e=>{
    const d=e?.response?.data;
    if(d?.error||d?.detail)return d.error||d.detail;
    if(d && typeof d==='object')return Object.values(d).flat().filter(v=>typeof v==='string').join(' ');
    return 'No se pudo completar la acción. Intenta de nuevo.';
};
const PLANTILLAS = [
    {nombre:'Resumen comercial',texto:'Revisa el período comercial actual: ventas, comparación con el anterior, asesores y descuentos. Usa únicamente datos consultados. Presenta primero la conclusión, luego las cifras y tres acciones concretas.'},
    {nombre:'Pedidos y entregas',texto:'Revisa los pedidos a proveedores y las entregas pendientes. Identifica los atrasos y las prioridades de seguimiento usando datos actuales. Termina con una lista de acciones, sin inventar fechas ni promesas.'},
    {nombre:'Caja y cobros',texto:'Revisa el recaudo confirmado y los saldos pendientes del período actual. Explica las variaciones y prioriza acciones de seguimiento. No asumas mora porque las ventas no tienen fecha de vencimiento. No modifiques documentos.'},
    {nombre:'Ideas para LOTTUS',texto:'Propón tres ideas concretas para el contenido y la experiencia comercial de LOTTUS, basadas en el conocimiento de este agente. Distingue propuestas de hechos y no inventes productos, promociones ni cifras.'},
];
const enBogota = iso => {
    if(!iso)return '';
    const partes=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)).map(p=>[p.type,p.value]));
    return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
};
function Editor({actual,agente,agentes,modelos,onGuardar,onCancelar,instruccionesIniciales='',nombreInicial=''}) {
    const [form,setForm]=useState(()=>actual?{...actual,perfil:actual.es_general?'general':String(actual.perfil||''),hora:String(actual.hora).slice(0,5),fecha_unica:enBogota(actual.fecha_unica),fecha_fin:actual.fecha_fin||''}:
        {perfil:agente?.id?String(agente.id):'general',nombre:nombreInicial,instrucciones:instruccionesIniciales,frecuencia:instruccionesIniciales?'una_vez':'semanal',hora:'09:00',dias_semana:[0,1,2,3,4],dia_mes:1,fecha_unica:'',fecha_fin:'',modelo:'',activa:true});
    const [ocupado,setOcupado]=useState(false),[error,setError]=useState('');
    const idem=useIdempotencia();
    const cambiar=(campo,valor)=>setForm(f=>({...f,[campo]:valor}));
    const guardar=async e=>{
        e.preventDefault();setError('');setOcupado(true);
        try{
            const datos={perfil:form.perfil==='general'?null:Number(form.perfil),nombre:form.nombre,instrucciones:form.instrucciones,
                frecuencia:form.frecuencia,hora:form.hora,dias_semana:form.dias_semana,dia_mes:Number(form.dia_mes),
                fecha_unica:form.frecuencia==='una_vez'&&form.fecha_unica?`${form.fecha_unica}:00-05:00`:null,
                fecha_fin:form.fecha_fin||null,modelo:form.modelo,activa:form.activa};
            if(actual)await API.patch(`/asistente/automatizaciones/${actual.id}/`,datos);
            else await API.post('/asistente/automatizaciones/',datos,{headers:idem.cabeceras(datos)});
            idem.confirmar();await onGuardar();
        }catch(err){setError(errorTexto(err));}finally{setOcupado(false);}
    };
    return <form className="ai-auto__editor" onSubmit={guardar}>
        {!actual && <div className="ai-auto__plantillas"><span>Empieza con una tarea:</span>{PLANTILLAS.map(p=><button type="button" key={p.nombre} onClick={()=>setForm(f=>({...f,nombre:p.nombre,instrucciones:p.texto}))}>{p.nombre}</button>)}</div>}
        <div className="ai-auto__fila"><label>Agente<select required value={form.perfil} onChange={e=>cambiar('perfil',e.target.value)}><option value="general">IA Lottus · General</option>{agentes.filter(a=>a.id).map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}{form.perfil!== 'general'&&!agentes.some(a=>String(a.id)===form.perfil)&&<option value={form.perfil}>Agente no disponible · elige otro</option>}</select></label><label>Nombre de la tarea<input required minLength={3} maxLength={80} value={form.nombre} onChange={e=>cambiar('nombre',e.target.value)} placeholder="Ej.: Revisión comercial de la mañana"/></label></div>
        <label>Qué debe hacer el agente<textarea required minLength={20} maxLength={4000} rows={5} value={form.instrucciones} onChange={e=>cambiar('instrucciones',e.target.value)} placeholder="Qué debe revisar, cómo debe presentarlo y qué información necesitas para decidir."/><small>{form.instrucciones.length} / 4000 · Usa las áreas y el conocimiento configurados en este agente.</small></label>
        <div className="ai-auto__fila"><label>Repetición<select value={form.frecuencia} onChange={e=>cambiar('frecuencia',e.target.value)}><option value="una_vez">Una sola vez</option><option value="diaria">Todos los días</option><option value="semanal">Días de la semana</option><option value="mensual">Cada mes</option></select></label>{form.frecuencia==='una_vez'?<label>Fecha y hora · Bogotá<input type="datetime-local" required value={form.fecha_unica} onChange={e=>cambiar('fecha_unica',e.target.value)}/></label>:<label>Hora · Bogotá<input type="time" required value={form.hora} onChange={e=>cambiar('hora',e.target.value)}/></label>}</div>
        {form.frecuencia==='semanal' && <fieldset className="ai-auto__dias"><legend>Días de ejecución</legend>{['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((n,d)=><label key={n}><input type="checkbox" aria-label={n} checked={form.dias_semana.includes(d)} onChange={()=>cambiar('dias_semana',form.dias_semana.includes(d)?form.dias_semana.filter(v=>v!==d):[...form.dias_semana,d].sort())}/><span>{n.slice(0,3)}</span></label>)}</fieldset>}
        {form.frecuencia==='mensual' && <label>Día del mes<input type="number" required min={1} max={31} value={form.dia_mes} onChange={e=>cambiar('dia_mes',e.target.value)}/><small>Si el mes tiene menos días, se ejecuta el último día de ese mes.</small></label>}
        <div className="ai-auto__fila"><label>Modelo<select value={form.modelo} onChange={e=>cambiar('modelo',e.target.value)}><option value="">Automático · con respaldo</option>{modelos.map(m=><option key={m} value={m}>{m}</option>)}</select></label><label>Hasta qué fecha · opcional<input type="date" value={form.fecha_fin} onChange={e=>cambiar('fecha_fin',e.target.value)}/></label></div>
        <label className="ai-auto__check"><input type="checkbox" checked={form.activa} onChange={e=>cambiar('activa',e.target.checked)}/><span>Activar al guardar</span></label>
        <p className="ai-auto__ayuda">Los resultados se guardan en tu historial personal. Cada ejecución consume una consulta de IA; usa el horario y modelo que necesites. Pausar detiene las próximas tareas; una ejecución ya en cola o trabajando puede terminar.</p>
        {error&&<p className="ai-auto__error" role="alert">{error}</p>}
        <div className="ai-auto__acciones"><button type="button" className="of-boton" onClick={onCancelar} disabled={ocupado}>Cancelar</button><button className="of-boton of-boton--principal" disabled={ocupado}>{ocupado?'Guardando…':actual?'Guardar cambios':'Crear automatización'}</button></div>
    </form>;
}

export default function AutomatizacionesIA({agentes,modelos,agente=null,crear=false,resultadoInicial=null,puedeProgramar,onCerrar,onResultado,instruccionesIniciales='',nombreInicial=''}) {
    const cache=useQueryClient();
    const [editor,setEditor]=useState(crear?{}:null),[filtro,setFiltro]=useState(agente?agente.id??'general':'todas');
    const [archivadas,setArchivadas]=useState(false),[historial,setHistorial]=useState(null),[offset,setOffset]=useState(0);
    const [resultado,setResultado]=useState(resultadoInicial),[error,setError]=useState(''),[ocupado,setOcupado]=useState(null);
    const idem=useIdempotencia();
    const lista=useQuery({queryKey:['automatizaciones-ia',filtro,archivadas],queryFn:()=>API.get('/asistente/automatizaciones/',{params:{...(filtro==='todas'?{}:{perfil:filtro}),...(archivadas?{archivadas:1}:{})}}).then(r=>r.data),refetchInterval:8000});
    const ejecuciones=useQuery({queryKey:['ejecuciones-ia',historial?.id,offset],queryFn:()=>API.get(`/asistente/automatizaciones/${historial.id}/ejecuciones/`,{params:{offset}}).then(r=>r.data),enabled:!!historial,refetchInterval:8000});
    const detalle=useQuery({queryKey:['ejecucion-ia',resultado],queryFn:()=>API.get(`/asistente/ejecuciones/${resultado}/`).then(r=>r.data),enabled:!!resultado});
    const recargar=()=>Promise.all([cache.invalidateQueries({queryKey:['automatizaciones-ia']}),cache.invalidateQueries({queryKey:['ejecuciones-ia']}),cache.invalidateQueries({queryKey:['oficina-ia','actividad']})]);
    const modificar=async(a,campos)=>{
        setOcupado(a.id);setError('');try{await API.patch(`/asistente/automatizaciones/${a.id}/`,campos);await recargar();}catch(e){setError(errorTexto(e));}finally{setOcupado(null);}
    };
    const ejecutar=async a=>{
        setOcupado(a.id);setError('');try{await API.post(`/asistente/automatizaciones/${a.id}/ejecutar/`,{},{headers:idem.cabeceras({ejecutar:a.id})});idem.confirmar();await recargar();}catch(e){setError(errorTexto(e));}finally{setOcupado(null);}
    };
    const abrirResultado=async e=>{
        setError('');try{await API.patch(`/asistente/ejecuciones/${e.id}/`,{leida:true});await recargar();if(e.conversacion)onResultado(e);else setResultado(e.id);}catch(err){setError(errorTexto(err));}
    };
    const titulo=editor?(editor.id?'Editar automatización':'Crear automatización'):resultado?'Resultado de la tarea':historial?`Ejecuciones · ${historial.nombre}`:agente?`Automatizaciones · ${agente.nombre}`:'Automatizaciones de tus agentes';
    return <Modal open title={titulo} onClose={onCerrar} size="lg" className="ai-auto">
        {editor ? <Editor instruccionesIniciales={instruccionesIniciales} nombreInicial={nombreInicial} key={editor.id||'nuevo'} actual={editor.id?editor:null} agente={agentes.find(a=>String(a.id??'general')===String(filtro))||agente} agentes={agentes} modelos={modelos} onCancelar={()=>setEditor(null)} onGuardar={async()=>{await recargar();setEditor(null);}}/> : resultado ? <div className="ai-auto__resultado"><button className="ai-auto__volver" onClick={()=>setResultado(null)}><FaArrowLeft/>Volver</button>{detalle.isPending?<p role="status">Cargando resultado…</p>:detalle.isError?<p className="ai-auto__error" role="alert">No se pudo consultar el resultado.</p>:<><h3>{detalle.data.nombre}</h3><small>{fechaTarea(detalle.data.finalizada)} · {detalle.data.modelo||'Sin modelo'}</small><pre>{detalle.data.error||detalle.data.resultado||ESTADOS_TAREA[detalle.data.estado]}</pre></>}</div> : <>
            <div className="ai-auto__motor"><i className={`of-punto${lista.data?.motor?.activo?'':' is-inactivo'}`}/><span>{lista.data?.motor?.activo?'Motor activo · funciona con la página cerrada':'Sin actividad reciente del motor · las tareas permanecen guardadas'}</span><small>Hora de Bogotá</small></div>
            {error && <p className="ai-auto__error" role="alert">{error}</p>}
            {historial ? <><button className="ai-auto__volver" onClick={()=>{setHistorial(null);setOffset(0);}}><FaArrowLeft/>Volver a las tareas</button>{ejecuciones.isPending?<p role="status">Cargando ejecuciones…</p>:ejecuciones.isError?<p className="ai-auto__error" role="alert">No se pudo cargar el historial. <button onClick={()=>ejecuciones.refetch()}>Reintentar</button></p>:<><div className="ai-auto__historial">{ejecuciones.data.resultados.map(e=><article key={e.id}><div><span className={`ai-auto__estado is-${e.estado}`}>{ESTADOS_TAREA[e.estado]}</span><small>{fechaTarea(e.creada)} · {e.origen==='manual'?'Manual':'Programada'}</small></div><p>{e.error||e.resultado||'El agente está preparando la tarea.'}</p>{(e.estado==='listo'||e.estado==='error')&&<button onClick={()=>abrirResultado(e)}>{e.conversacion?'Abrir en el chat':'Ver detalle'}<FaArrowRight/></button>}</article>)}{!ejecuciones.data.resultados.length&&<p className="ai-auto__vacio">Esta tarea aún no tiene ejecuciones.</p>}</div><div className="ai-auto__acciones"><button className="of-boton" disabled={!offset} onClick={()=>setOffset(o=>Math.max(0,o-30))}>Más recientes</button><button className="of-boton" disabled={ejecuciones.data.siguiente==null} onClick={()=>setOffset(ejecuciones.data.siguiente)}>Más antiguas</button></div></>}</> : <>
                <div className="ai-auto__toolbar"><label>Agente<select value={filtro} onChange={e=>setFiltro(e.target.value)}><option value="todas">Todos los agentes</option><option value="general">IA Lottus · General</option>{agentes.filter(a=>a.id).map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}</select></label><label className="ai-auto__check"><input type="checkbox" checked={archivadas} onChange={e=>setArchivadas(e.target.checked)}/>Ver archivadas</label>{puedeProgramar&&<button className="of-boton of-boton--principal" onClick={()=>setEditor({})}><FaPlus/>Nueva tarea</button>}</div>
                {lista.isPending?<p role="status">Cargando tus tareas…</p>:lista.isError?<p role="alert" className="ai-auto__error">No se pudo consultar la programación. <button onClick={()=>lista.refetch()}>Reintentar</button></p>:<div className="ai-auto__lista">{lista.data.automatizaciones.map(a=><article key={a.id} className={a.archivada?'is-archivada':''}>
                    <div className="ai-auto__tarea-cab"><span className={`ai-auto__estado${a.en_curso?' is-ejecutando':''}`}>{a.en_curso?'En curso':a.archivada?'Archivada':a.activa?'Programada':a.frecuencia==='una_vez'&&a.ultima?.estado==='listo'?'Completada':'Pausada'}</span><small>{a.perfil_nombre}</small>{puedeProgramar&&!a.archivada&&<button aria-label={`Editar ${a.nombre}`} onClick={()=>setEditor(a)}><FaPen/></button>}</div>
                    <h3>{a.nombre}</h3><p className="ai-auto__instrucciones">{a.instrucciones}</p><div className="ai-auto__horario"><FaCalendarAlt/>{horarioTarea(a)}<span>{a.modelo||'Modelo automático'}</span></div>
                    <p className="ai-auto__proxima"><FaClock/>{a.activa?`Próxima: ${fechaTarea(a.proxima_ejecucion)}`:'Sin próxima ejecución'}{a.fecha_fin&&` · Hasta ${a.fecha_fin}`}</p>
                    {!a.agente_disponible&&<p className="ai-auto__error">El agente está pausado o fue eliminado. Edita la tarea para elegir uno disponible.</p>}
                    {a.ultima&&<div className={`ai-auto__ultima${a.ultima.estado==='error'?' is-error':''}`}><span>{ESTADOS_TAREA[a.ultima.estado]} · {fechaTarea(a.ultima.creada)}</span><p>{a.ultima.error||a.ultima.resultado||'La ejecución está en cola o trabajando.'}</p>{a.ultima.estado==='listo'&&<button onClick={()=>abrirResultado(a.ultima)}>Abrir resultado<FaArrowRight/></button>}</div>}
                    <div className="ai-auto__tarea-acciones"><button onClick={()=>{setHistorial(a);setOffset(0);}}>Historial{a.sin_leer>0&&<b>{a.sin_leer}</b>}</button>{puedeProgramar&&(a.archivada?<button disabled={ocupado===a.id} onClick={()=>modificar(a,{archivada:false})}><FaUndo/>Restaurar pausada</button>:<><button disabled={ocupado===a.id||(!a.agente_disponible&&!a.activa)} onClick={()=>modificar(a,{activa:!a.activa})}>{a.activa?<FaPause/>:<FaPlay/>}{a.activa?'Pausar':'Activar'}</button><button disabled={ocupado===a.id||a.en_curso>0||!a.agente_disponible||!lista.data.motor?.activo} title={!lista.data.motor?.activo?'El motor debe estar activo para iniciar la tarea':'No altera la próxima ejecución programada'} onClick={()=>ejecutar(a)}><FaPlay/>{ocupado===a.id?'Encolando…':'Ejecutar ahora'}</button><button aria-label={`Archivar ${a.nombre}`} disabled={ocupado===a.id} onClick={()=>modificar(a,{archivada:true})}><FaArchive/></button></>)}</div>
                </article>)}{!lista.data.automatizaciones.length&&<div className="ai-auto__vacio"><FaCalendarAlt/><h3>Una tarea menos para ti.</h3><p>Programa qué debe revisar un agente y recibe sus resultados en tu historial.</p>{puedeProgramar&&<button className="of-boton" onClick={()=>setEditor({})}><FaPlus/>Crear la primera tarea</button>}</div>}</div>}
            </>}
        </>}
    </Modal>;
}
