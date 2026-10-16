import React,{useEffect,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {FaUserPlus,FaCommentDots,FaTasks,FaUser} from 'react-icons/fa';
import API from '../../services/api';
import Modal from '../ui/Modal';
import {capacidadZona} from './distribucionOficina';
import './EquipoHumano.css';

import {errorOficina,nombreEstado} from './utilidadesPersonas';
import {fechaTarea} from './actividadAgente';
export function ContenidoPersona({persona,onAbrir,zonaNombre,movimiento}) {
    return <div className="oh-ficha"><span className="oh-tipo"><FaUser/> PERSONA · {persona.rol}</span><div className="of-ficha__identidad"><span className="oh-avatar">{persona.nombre.split(' ').slice(0,2).map(n=>n[0]).join('')}</span><div><h3>{persona.nombre}</h3><p>{zonaNombre||'Sin puesto asignado'}{persona.puesto!=null&&` · Puesto ${persona.puesto+1}`}</p></div></div><div className="of-ficha__estado"><i className={`of-punto${persona.en_oficina?'':' oh-offline'}`}/>{movimiento?.texto||nombreEstado(persona)}</div>{persona.nota_estado&&<p className="of-ficha__nota">{persona.nota_estado}</p>}
        {persona.destacado&&<blockquote>“{persona.destacado.texto}”</blockquote>}
        <div className="of-ficha__metricas"><span><b>{persona.pendientes??'—'}</b>Pendientes</span><span><b>{persona.en_oficina?'En línea':'Ausente'}</b>Presencia</span><span><b>{persona.mensajes_para_mi||0}</b>Para ti</span></div>
        {persona.pendientes!=null&&<p className="of-ficha__nota">{persona.pendientes} {persona.pendientes===1?'tarea o solicitud pendiente':'tareas o solicitudes pendientes'}</p>}
        {persona.trabajos?.length>0&&<div className="of-ficha__tareas"><small>TRABAJO Y PRIORIDADES</small>{persona.trabajos.map(t=><button type="button" key={t.id} onClick={()=>onAbrir(persona)}><span><strong>{t.titulo}</strong><span>{t.fecha_limite?`Entrega ${t.fecha_limite}`:'Sin fecha límite'} · Prioridad {t.prioridad}</span></span><em>{t.estado==='en_curso'?'En curso':t.estado==='bloqueada'?'Bloqueada':'Pendiente'}</em></button>)}</div>}
        {persona.ultima_presencia&&<p className="of-ficha__nota">Última presencia: {fechaTarea(persona.ultima_presencia)}</p>}
        <button type="button" className="of-boton of-boton--principal" onClick={()=>onAbrir(persona)}><FaCommentDots/>Abrir conversación y tareas</button>
    </div>;
}
export function EditorEquipo({zonas,onCerrar,onGuardado}) {
    const cache=useQueryClient();
    const q=useQuery({queryKey:['oficina-personas','equipo'],queryFn:()=>API.get('/oficina/equipo/').then(r=>r.data),retry:false});
    const [form,setForm]=useState(null),[error,setError]=useState(''),[guardando,setGuardando]=useState(false),[buscar,setBuscar]=useState('');
    useEffect(()=>{if(q.data)setForm(q.data);},[q.data]);
    const cambiar=(id,c)=>setForm(f=>({...f,personas:f.personas.map(p=>p.id===id?{...p,...c}:p)}));
    const guardar=async e=>{
        e.preventDefault();setGuardando(true);setError('');
        try{await API.put('/oficina/equipo/',{revision:form.revision,personas:form.personas.filter(p=>p.seleccionado).map(p=>({usuario:p.id,zona:p.zona||null,puesto:p.puesto??null}))});
            await cache.invalidateQueries({queryKey:['oficina-personas']});onGuardado?.();onCerrar();}
        catch(err){setError(errorOficina(err));}finally{setGuardando(false);}
    };
    return <Modal open title="Personas en tu oficina" onClose={guardando?()=>{}:onCerrar} size="lg">
        <form className="oh-editor" onSubmit={guardar}><p>Elige quién participa y dónde se sienta. Son cuentas reales de la plataforma; su acceso a IA y ventas conserva los permisos actuales.</p><p className="oh-ayuda">{form?.responsable?`Responsable: ${form.responsable.nombre}. Las solicitudes se dirigen a ti.`:'El primer guardado te establece como responsable: las solicitudes se dirigirán a ti.'} Retirar una persona conserva sus mensajes y tareas.</p>
            <input aria-label="Buscar una persona" placeholder="Buscar por nombre…" value={buscar} onChange={e=>setBuscar(e.target.value)}/>
            {q.isPending&&<p role="status">Consultando usuarios activos…</p>}{q.isError&&<p role="alert">{errorOficina(q.error)} <button type="button" onClick={()=>q.refetch()}>Reintentar</button></p>}
            <div className="oh-editor__lista">{form?.personas.filter(p=>p.nombre.toLocaleLowerCase().includes(buscar.toLocaleLowerCase())).map(p=><div className={`oh-editor__fila${p.seleccionado?' is-elegida':''}`} key={p.id}>
                <label className="oh-elegir"><input type="checkbox" checked={p.seleccionado} onChange={e=>cambiar(p.id,{seleccionado:e.target.checked})}/><span><strong>{p.nombre}</strong><small>{p.rol}</small></span></label>
                {p.seleccionado&&<div className="oh-ubicacion"><select aria-label={`Zona de la persona ${p.nombre}`} value={p.zona||''} onChange={e=>cambiar(p.id,{zona:Number(e.target.value)||null,puesto:null})}><option value="">Sin puesto en el mapa</option>{zonas.map(z=><option key={z.id} value={z.id}>{z.nombre}</option>)}</select>
                    {p.zona&&<select aria-label={`Puesto de ${p.nombre}`} value={p.puesto??''} onChange={e=>cambiar(p.id,{puesto:e.target.value===''?null:Number(e.target.value)})}><option value="">Primer puesto libre</option>{Array.from({length:capacidadZona(zonas.find(z=>z.id===p.zona)?.ambiente)},(_,i)=><option key={i} value={i}>Puesto {i+1}</option>)}</select>}</div>}
            </div>)}</div>
            {error&&<p className="oh-error" role="alert">{error} <button type="button" onClick={()=>{setError('');q.refetch();}}>Recargar selección guardada</button></p>}<div className="of-form-acciones"><span className="oh-ayuda">{form?.personas.filter(p=>p.seleccionado).length||0} {form?.personas.filter(p=>p.seleccionado).length===1?'persona seleccionada':'personas seleccionadas'}</span><button type="button" className="of-boton" onClick={onCerrar} disabled={guardando}>Cancelar</button><button className="of-boton of-boton--principal" disabled={!form||guardando}>{guardando?'Guardando…':'Guardar equipo'}</button></div>
        </form>
    </Modal>;
}
export default function EquipoHumano({estado,personas,zonas,onAbrir,onGestionar}) {
    return <section className="oh-directorio" aria-label="Personas de la oficina"><div className="oh-directorio__titulo"><div><span className="of-eyebrow">PERSONAS · EQUIPO LOTTUS</span><h2>Tu oficina compartida</h2></div><button type="button" className="of-boton" onClick={()=>onAbrir(null)}><FaTasks/>Mi bandeja{estado.mis_pendientes>0&&<b>{estado.mis_pendientes}</b>}</button>{estado.puede_gestionar&&<button className="oh-gestionar" type="button" onClick={onGestionar} title="Elegir personas y puestos" aria-label="Gestionar personas de la oficina"><FaUserPlus/></button>}</div>
        {personas.length?<div className="oh-personas">{personas.map(p=><button type="button" className="oh-persona" key={p.id} onClick={()=>onAbrir(p)} aria-label={`Abrir oficina de ${p.nombre}`}><span className="oh-avatar">{p.nombre.split(' ').slice(0,2).map(n=>n[0]).join('')}</span><span><strong>{p.nombre}</strong><small>{p.rol} · {zonas.find(z=>z.id===p.zona)?.nombre||'Sin puesto asignado'}</small><span className="oh-presencia"><i className={`of-punto${p.en_oficina?'':' oh-offline'}`}/>{nombreEstado(p)}</span></span>{p.destacado&&<blockquote>“{p.destacado.texto}”</blockquote>}{p.pendientes>0&&<b>{p.pendientes} pendientes</b>}</button>)}</div>:<p className="oh-vacio">{estado.puede_gestionar?'Incorpora a las personas de tu equipo desde el botón de personas. Tú eliges quién aparece.':'No hay personas en esta vista.'}</p>}
    </section>;
}
