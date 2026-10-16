import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {FaTimes,FaCommentDots,FaTasks,FaUser,FaStar,FaArrowLeft,FaUsers,FaPen} from 'react-icons/fa';
import API from '../../services/api';
import Modal from '../ui/Modal';
import {errorOficina,nombreEstado} from './utilidadesPersonas';
import './PanelColaboracion.css';

const estados={pendiente:'Pendiente',en_curso:'En curso',bloqueada:'Bloqueada',hecha:'Entregada',cancelada:'Cancelada'};
const cerrados=['hecha','cancelada'];
const fecha=iso=>iso?new Date(iso).toLocaleString('es-CO',{timeZone:'America/Bogota',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
const dia=iso=>iso?new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO'):'';
const obtener=url=>API.get(url).then(r=>r.data);
const opciones=estado=>[...new Map([...(estado.personas||[]),...(estado.responsable?[estado.responsable]:[])].map(p=>[p.id,p])).values()];

const iniciales=n=>(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase();
const cuando=iso=>{if(!iso)return '';const d=new Date(iso),hoy=new Date();return d.toDateString()===hoy.toDateString()?d.toLocaleTimeString('es-CO',{timeZone:'America/Bogota',hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('es-CO',{timeZone:'America/Bogota',day:'numeric',month:'short'});};

/** Bandeja: cada chat que ha tenido el usuario (privados y el tablón del equipo). */
function ListaChats({estado,onAbrir}) {
    const q=useQuery({queryKey:['oficina-personas','conversaciones'],queryFn:()=>obtener('/oficina/conversaciones/'),refetchInterval:8000,retry:false});
    const [nuevo,setNuevo]=useState(false);
    const contactos=opciones(estado).filter(p=>p.id!==estado.yo.id);
    const recibidos=q.data?.resultados||[];
    // El tablón del equipo siempre está disponible, aunque aún no tenga mensajes.
    const chats=q.data&&!recibidos.some(c=>c.para==='equipo')?[...recibidos,{para:'equipo',persona:null,ultimo:null,sin_leer:0}]:recibidos;
    return <div className="oh-chats">
        <div className="oh-chats__cabeza"><p className="oh-aviso">Tus conversaciones. Elige una para ver su historial y seguir escribiendo ahí mismo.</p>
            {nuevo?<select autoFocus aria-label="Escribir a" defaultValue="" onChange={e=>{const p=contactos.find(c=>c.id===Number(e.target.value));if(p)onAbrir(String(p.id),p);}} onBlur={()=>setNuevo(false)}>
                <option value="" disabled>Escribir a…</option>{contactos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
            :<button type="button" className="of-boton of-boton--principal" onClick={()=>setNuevo(true)} disabled={!contactos.length}><FaPen/>Nuevo mensaje</button>}
        </div>
        {q.isPending&&<p role="status">Consultando conversaciones…</p>}{q.isError&&<p role="alert">{errorOficina(q.error)} <button onClick={()=>q.refetch()}>Reintentar</button></p>}
        <ul className="oh-chats__lista" aria-label="Conversaciones">
            {chats.map(c=>{const equipo=c.para==='equipo',propio=c.ultimo?.autor.id===estado.yo.id,nombre=equipo?'Todo el equipo':c.persona.nombre;
                return <li key={c.para}><button type="button" className={`oh-chat${c.sin_leer?' is-nuevo':''}`} onClick={()=>onAbrir(c.para,equipo?null:c.persona)}>
                    <span className={`oh-chat__avatar${equipo?' is-equipo':''}`} aria-hidden="true">{equipo?<FaUsers/>:iniciales(nombre)}</span>
                    <span className="oh-chat__texto"><span className="oh-chat__fila"><strong>{nombre}</strong><time>{cuando(c.ultimo?.creado)}</time></span>
                        <span className="oh-chat__fila"><small>{c.ultimo?`${propio?'Tú: ':equipo?`${c.ultimo.autor.nombre.split(' ')[0]}: `:''}${c.ultimo.texto}`:equipo?'Tablón compartido del equipo':''}</small>{c.sin_leer>0&&<b aria-label={`${c.sin_leer} sin leer`}>{c.sin_leer}</b>}</span></span>
                </button></li>;})}
        </ul>
        {q.data&&chats.length<=1&&<p className="oh-vacio">Aún no tienes conversaciones privadas. Usa «Nuevo mensaje» o haz clic en una persona de la oficina.</p>}
    </div>;
}

function Mensajes({estado,canal,contacto,borradores,onVolver,onEnviado}) {
    const cache=useQueryClient(),privado=canal!=='equipo',persona=contacto;
    const q=useQuery({queryKey:['oficina-personas','mensajes',canal],queryFn:()=>obtener(`/oficina/mensajes/?para=${canal}`),refetchInterval:8000,retry:false});
    const [texto,setTexto]=useState(()=>borradores.current[canal]||''),[destacar,setDestacar]=useState(false),[horas,setHoras]=useState(4);
    const [error,setError]=useState(''),[ocupado,setOcupado]=useState(false),[anteriores,setAnteriores]=useState([]),[mas,setMas]=useState(null),[cargandoMas,setCargandoMas]=useState(false);
    const lectura=useRef(new Set()),lista=useRef(null),ultimo=useRef(null);
    const mensajes=[...new Map([...anteriores,...(q.data?.resultados||[])].map(m=>[m.id,m])).values()].sort((a,b)=>a.id-b.id);
    useEffect(()=>{borradores.current[canal]=texto;},[texto,canal,borradores]);
    useEffect(()=>{
        const ids=(q.data?.resultados||[]).filter(m=>m.destinatario===estado.yo.id&&!m.leido_en&&!lectura.current.has(m.id)).map(m=>m.id);
        if(!ids.length)return;
        ids.forEach(id=>lectura.current.add(id));
        API.post('/oficina/mensajes/leer/',{ids}).then(()=>cache.invalidateQueries({queryKey:['oficina-personas']})).catch(()=>ids.forEach(id=>lectura.current.delete(id)));
    },[q.data,estado.yo.id,cache]);
    useEffect(()=>{
        const id=q.data?.resultados?.[0]?.id;
        if(id&&id!==ultimo.current){const l=lista.current;if(l&&(!ultimo.current||l.scrollHeight-l.scrollTop-l.clientHeight<180))l.scrollTop=l.scrollHeight;ultimo.current=id;}
    },[q.data]);
    const enviar=async e=>{
        e.preventDefault();if(!texto.trim()||ocupado)return;setOcupado(true);setError('');
        try{await API.post('/oficina/mensajes/',{texto:texto.trim(),destinatario:privado?Number(canal):null,destacar:!privado&&destacar,horas});setTexto('');onEnviado?.(privado?Number(canal):null);setDestacar(false);await cache.invalidateQueries({queryKey:['oficina-personas']});}
        catch(err){setError(errorOficina(err));}finally{setOcupado(false);}
    };
    const cambiar=async(m,datos)=>{setError('');try{await API.patch(`/oficina/mensajes/${m.id}/`,datos);setAnteriores(a=>a.filter(x=>x.id!==m.id));await cache.invalidateQueries({queryKey:['oficina-personas']});}catch(err){setError(errorOficina(err));}};
    const anterioresMas=async()=>{
        setCargandoMas(true);setError('');
        try{const d=await obtener(`/oficina/mensajes/?para=${canal}&offset=${mensajes.length}`);setAnteriores(a=>[...a,...d.resultados]);setMas(d.hay_mas);}catch(err){setError(errorOficina(err));}finally{setCargandoMas(false);}
    };
    return <div className="oh-mensajes">{onVolver&&<div className="oh-hilo__cabeza"><button type="button" className="oh-volver" onClick={onVolver}><FaArrowLeft/>Todos los chats</button><strong>{privado?persona?.nombre:'Todo el equipo'}</strong></div>}<p className="oh-aviso">{privado?'Conversación privada. Solo ustedes dos pueden leerla.':'Tablón compartido con las personas seleccionadas de la oficina.'}</p>
        <div className="oh-hilo" ref={lista} aria-label={privado?`Mensajes con ${persona?.nombre||'esta persona'}`:'Mensajes del equipo'}>
            {q.isPending&&<p role="status">Consultando mensajes…</p>}{q.isError&&<p role="alert">{errorOficina(q.error)} <button onClick={()=>q.refetch()}>Reintentar</button></p>}
            {(mas??q.data?.hay_mas)&&<button className="of-boton" disabled={cargandoMas} onClick={anterioresMas}>{cargandoMas?'Cargando…':'Ver mensajes anteriores'}</button>}
            {mensajes.map(m=>{const propio=m.autor.id===estado.yo.id,marcado=m.destacado_hasta&&new Date(m.destacado_hasta)>new Date();return <article key={m.id} className={`oh-mensaje${propio?' is-propio':''}`}>
                <div><strong>{m.autor.nombre}</strong><time>{fecha(m.creado)}</time></div><p>{m.texto}</p><footer>{marcado&&<span><FaStar/>Visible en la oficina hasta {fecha(m.destacado_hasta)}</span>}{privado&&propio&&<small>{m.leido_en?'Leído':'Enviado'}</small>}
                    {!privado&&propio&&<button onClick={()=>cambiar(m,{destacar:!marcado,horas})}>{marcado?'Quitar destacado':'Destacar'}</button>}{(propio||(!privado&&estado.puede_gestionar))&&<button onClick={()=>cambiar(m,{archivado:true})}>Archivar</button>}</footer>
            </article>;})}
            {q.data&&!mensajes.length&&<p className="oh-vacio">{privado?'Inicia la conversación con esta persona.':'Comparte una novedad importante con el equipo.'}</p>}
        </div>
        <form onSubmit={enviar} className="oh-componer"><label><span className="sr-only">Mensaje para {privado?persona?.nombre:'el equipo'}</span><textarea maxLength={2000} rows={3} value={texto} onChange={e=>setTexto(e.target.value)} placeholder={privado?'Escribe a esta persona…':'¿Qué necesita saber tu equipo?'} disabled={ocupado}/></label>
            <div>{!privado&&<label className="oh-check"><input type="checkbox" checked={destacar} onChange={e=>setDestacar(e.target.checked)}/><FaStar/>Destacar en la oficina</label>}{!privado&&<select aria-label="Duración del destacado" value={horas} onChange={e=>setHoras(Number(e.target.value))}><option value={1}>1 hora</option><option value={4}>4 horas</option><option value={24}>24 horas</option></select>}<button className="of-boton of-boton--principal" disabled={!texto.trim()||ocupado||q.isError}>{ocupado?'Enviando…':'Enviar'}</button></div>
            {error&&<p role="alert" className="oh-error">{error}</p>}
        </form>
    </div>;
}

function NuevoTrabajo({estado,tipo,persona,onCerrar,onCreado}) {
    const gerentes=estado.gerentes?.length?estado.gerentes:(estado.responsable?[estado.responsable]:[]);
    const [f,setF]=useState({titulo:'',descripcion:'',prioridad:'normal',fecha_limite:'',venta:'',responsable:tipo==='solicitud'?(gerentes.some(p=>p.id===persona?.id)?persona.id:gerentes[0]?.id):(estado.puede_gestionar?(persona?.id||estado.yo.id):estado.yo.id)});
    const [ocupado,setOcupado]=useState(false),[error,setError]=useState('');
    const set=(k,v)=>setF(f=>({...f,[k]:v}));
    const guardar=async e=>{e.preventDefault();setOcupado(true);setError('');try{const r=await API.post('/oficina/trabajos/',{...f,tipo,responsable:Number(f.responsable),venta:f.venta?Number(f.venta):null,fecha_limite:f.fecha_limite||null});await onCreado(r.data);onCerrar();}catch(err){setError(errorOficina(err));}finally{setOcupado(false);}};
    return <Modal open title={tipo==='solicitud'?'Pedir una actualización':'Nueva tarea'} onClose={ocupado?()=>{}:onCerrar} size="md"><form className="oh-form" onSubmit={guardar}>
        {tipo==='solicitud'?<><label>Gerente que atiende tu solicitud<select value={f.responsable||''} required onChange={e=>set('responsable',e.target.value)}>{gerentes.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label><p>Describe qué necesitas. Tu personaje irá a gerencia y, al entregarse el trabajo, recibirás la visita de quien lo atendió.</p></>:<label>Responsable{estado.puede_gestionar?<select value={f.responsable} onChange={e=>set('responsable',e.target.value)}>{opciones(estado).map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select>:<input value={estado.yo.nombre} readOnly/>}</label>}
        <label>Título<input required autoFocus maxLength={140} value={f.titulo} onChange={e=>set('titulo',e.target.value)}/></label><label>Detalle<textarea maxLength={3000} rows={4} value={f.descripcion} onChange={e=>set('descripcion',e.target.value)}/></label>
        <div className="oh-form__dos"><label>Prioridad<select value={f.prioridad} onChange={e=>set('prioridad',e.target.value)}><option value="normal">Normal</option><option value="alta">Alta</option></select></label><label>Fecha objetivo<input type="date" value={f.fecha_limite} onChange={e=>set('fecha_limite',e.target.value)}/></label></div>
        <label>Venta relacionada (opcional)<input type="number" min="1" step="1" value={f.venta} onChange={e=>set('venta',e.target.value)} placeholder="Número de venta"/></label><small className="oh-ayuda">Solo se vincula una venta si ambas personas pueden consultarla. Esta tarea no modifica la venta.</small>
        {error&&<p role="alert" className="oh-error">{error}</p>}<div className="of-form-acciones"><button type="button" className="of-boton" disabled={ocupado} onClick={onCerrar}>Cancelar</button><button className="of-boton of-boton--principal" disabled={ocupado||!f.titulo.trim()}>{ocupado?'Guardando…':tipo==='solicitud'?'Enviar solicitud':'Crear tarea'}</button></div>
    </form></Modal>;
}

function DetalleTrabajo({id,estado,onVolver}) {
    const cache=useQueryClient(),q=useQuery({queryKey:['oficina-personas','trabajo',id],queryFn:()=>obtener(`/oficina/trabajos/${id}/`),refetchInterval:8000,retry:false});
    const [texto,setTexto]=useState(''),[error,setError]=useState(''),[ocupado,setOcupado]=useState(false),t=q.data;
    const actualizar=async datos=>{setOcupado(true);setError('');try{await API.patch(`/oficina/trabajos/${id}/`,{revision:t.revision,...datos});await cache.invalidateQueries({queryKey:['oficina-personas']});}catch(err){setError(errorOficina(err));if(err.response?.status===409)await q.refetch();}finally{setOcupado(false);}};
    const comentar=async e=>{e.preventDefault();setOcupado(true);setError('');try{await API.post(`/oficina/trabajos/${id}/comentarios/`,{texto});setTexto('');await cache.invalidateQueries({queryKey:['oficina-personas']});}catch(err){setError(errorOficina(err));}finally{setOcupado(false);}};
    const ejecutor=t&&(estado.puede_gestionar||t.responsable.id===estado.yo.id),creador=t?.creador.id===estado.yo.id;
    const permitidos=t?Object.keys(estados).filter(s=>s===t.estado||(cerrados.includes(t.estado)?s==='pendiente'&&(estado.puede_gestionar||creador):ejecutor||s==='cancelada'&&creador)):[];
    return <div className="oh-detalle"><button className="oh-volver" onClick={onVolver}><FaArrowLeft/>Volver a trabajos</button>{q.isPending&&<p role="status">Consultando trabajo…</p>}{q.isError&&<p role="alert">{errorOficina(q.error)} <button onClick={()=>q.refetch()}>Reintentar</button></p>}
        {t&&<><small className="oh-tipo">{t.tipo==='solicitud'?'SOLICITUD':'TAREA'} · {t.prioridad==='alta'?'PRIORIDAD ALTA':'PRIORIDAD NORMAL'}</small><h3>{t.titulo}</h3><p className="oh-texto">{t.descripcion}</p><p className="oh-ayuda">Creó: {t.creador.nombre} · Atiende: {t.responsable.nombre}{t.fecha_limite&&` · Fecha objetivo: ${dia(t.fecha_limite)}`}{t.venta&&` · Venta #${t.venta}`}</p>
            <label className="oh-estado">Estado<select aria-label="Estado del trabajo" value={t.estado} disabled={ocupado||permitidos.length<2} onChange={e=>actualizar({estado:e.target.value})}>{permitidos.map(s=><option key={s} value={s}>{estados[s]}</option>)}</select></label>
            {estado.puede_gestionar&&t.tipo==='tarea'&&<label className="oh-estado">Asignado a<select aria-label="Reasignar tarea" value={t.responsable.id} disabled={ocupado} onChange={e=>actualizar({responsable:Number(e.target.value)})}>{!opciones(estado).some(p=>p.id===t.responsable.id)&&<option value={t.responsable.id}>{t.responsable.nombre} (fuera del equipo)</option>}{opciones(estado).map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>}
            <h4>Seguimiento</h4>{t.hay_mas_comentarios&&<p className="oh-ayuda">Se muestran los 100 comentarios más recientes.</p>}<div className="oh-seguimiento">{t.comentarios.map(c=><article key={c.id} className={c.es_cambio_estado?'oh-cambio':''}><small>{c.autor.nombre} · {fecha(c.creado)}</small><p>{c.es_cambio_estado?c.texto.split(' → ').map(s=>estados[s]||s).join(' → '):c.texto}</p></article>)}{!t.comentarios.length&&<p className="oh-vacio">Añade contexto o comunica un avance.</p>}</div>
            <form onSubmit={comentar} className="oh-componer"><textarea aria-label="Comentario del trabajo" rows={3} maxLength={2000} value={texto} onChange={e=>setTexto(e.target.value)} disabled={ocupado}/><button className="of-boton of-boton--principal" disabled={!texto.trim()||ocupado}>{ocupado?'Guardando…':'Comentar'}</button></form>
        </>}{error&&<p role="alert" className="oh-error">{error}</p>}
    </div>;
}

function Trabajos({estado,persona,trabajoInicial=null}) {
    const cache=useQueryClient(),[offset,setOffset]=useState(0),[nuevo,setNuevo]=useState(null),[detalle,setDetalle]=useState(()=>trabajoInicial||null),[filtro,setFiltro]=useState('abiertos');
    useEffect(()=>{if(trabajoInicial){setDetalle(trabajoInicial);}},[trabajoInicial]);
    const q=useQuery({queryKey:['oficina-personas','trabajos',persona?.id||null,offset],queryFn:()=>obtener(`/oficina/trabajos/?offset=${offset}${persona?`&persona=${persona.id}`:''}`),refetchInterval:8000,retry:false});
    const items=q.data?.resultados||[],visibles=items.filter(t=>filtro==='todos'||(filtro==='cerrados')===cerrados.includes(t.estado));
    return detalle?<DetalleTrabajo id={detalle} estado={estado} onVolver={()=>setDetalle(null)}/>:<div className="oh-trabajos">
        <div className="oh-trabajos__acciones"><button className="of-boton of-boton--principal" disabled={!estado.responsable} onClick={()=>setNuevo('tarea')}>{estado.puede_gestionar?'Asignar tarea':'Nueva tarea propia'}</button><button className="of-boton" disabled={!estado.responsable} onClick={()=>setNuevo('solicitud')}>Pedir actualización</button></div>
        <p className="oh-aviso">{estado.responsable?(estado.puede_gestionar?'Puedes coordinar el trabajo del equipo y atender las solicitudes dirigidas a ti.':'Ves los trabajos que creaste o te asignaron. Puedes pedir una actualización a los gerentes disponibles.'):'Primero guarda la selección de personas para habilitar la bandeja.'}</p>
        <label className="oh-estado">Mostrar<select value={filtro} onChange={e=>setFiltro(e.target.value)}><option value="abiertos">Pendientes</option><option value="cerrados">Terminados</option><option value="todos">Todos</option></select></label>
        {q.isPending&&<p role="status">Consultando trabajos…</p>}{q.isError&&<p role="alert">{errorOficina(q.error)} <button onClick={()=>q.refetch()}>Reintentar</button></p>}
        <div className="oh-lista-trabajos">{visibles.map(t=><button key={t.id} type="button" className={`oh-trabajo${t.prioridad==='alta'?' is-urgente':''}`} onClick={()=>setDetalle(t.id)}><span><small>{t.tipo==='solicitud'?'SOLICITUD':'TAREA'} · {estados[t.estado]}</small><strong>{t.titulo}</strong><span>{t.responsable.nombre}{t.fecha_limite&&` · ${dia(t.fecha_limite)}`}</span></span>{t.prioridad==='alta'&&<b>Alta</b>}</button>)}</div>
        {q.data&&!visibles.length&&<p className="oh-vacio">No hay trabajos en esta página con ese estado.</p>}
        <div className="oh-paginacion"><button disabled={!offset} onClick={()=>setOffset(n=>Math.max(0,n-50))}>Anteriores</button><small>Página {offset/50+1} · hasta 50 trabajos</small><button disabled={!q.data?.hay_mas} onClick={()=>setOffset(n=>n+50)}>Siguientes</button></div>
        {nuevo&&<NuevoTrabajo estado={estado} tipo={nuevo} persona={persona} onCerrar={()=>setNuevo(null)} onCreado={async t=>{setDetalle(t.id);await cache.invalidateQueries({queryKey:['oficina-personas']});}}/>}
    </div>;
}

function ResumenVentas({persona,estado}) {
    const id=persona?.id||estado.yo.id,permitido=estado.puede_gestionar||id===estado.yo.id;
    const q=useQuery({queryKey:['oficina-personas','ventas',id],queryFn:()=>obtener(`/oficina/personas/${id}/ventas/`),enabled:permitido,retry:false});
    if(!permitido)return <p className="oh-aviso">El resumen de ventas de otra persona solo está disponible para el responsable de la oficina.</p>;
    return <div className="oh-resumen">{q.isPending&&<p role="status">Consultando ventas…</p>}{q.isError&&<p role="alert">{errorOficina(q.error)} <button onClick={()=>q.refetch()}>Reintentar</button></p>}
        {q.data&&!q.data.disponible&&<p className="oh-aviso">Tu rol no tiene permiso para consultar ventas.</p>}
        {q.data?.disponible&&<><p>Gestión comercial de {q.data.persona.nombre}</p><div className="oh-indicadores">{[['pendientes_entrega','Por entregar'],['pendientes_gestion','Pedidos por gestionar'],['sin_desglose_confirmado','Productos por confirmar'],['compromiso_proximo','Entrega en próximos 7 días']].map(([k,n])=><div key={k}><strong>{q.data[k]}</strong><span>{n}</span></div>)}</div><p className="oh-ayuda">Se muestran ventas a las que ya tienes acceso en el ERP.</p>{q.data.ventas.map(v=><div className="oh-venta" key={v.id}><strong>Venta #{v.id}</strong><span>{v.fecha_entrega?`Entrega: ${dia(v.fecha_entrega)}`:'Sin fecha de entrega'} · {v.estado_pedidos?'Pedido gestionado':'Por gestionar'} · {v.productos_confirmados?'Productos confirmados':'Revisar productos'}</span></div>)}<Link className="of-boton" to="/ventas">Ir a ventas</Link></>}
    </div>;
}

function MiEstado({persona}) {
    const cache=useQueryClient(),[nota,setNota]=useState(persona.nota_estado||''),[estado,setEstado]=useState(persona.estado),[error,setError]=useState(''),[ocupado,setOcupado]=useState(false);
    const guardar=async e=>{e.preventDefault();setOcupado(true);setError('');try{await API.post('/oficina/presencia/',{estado,nota_estado:nota});await cache.invalidateQueries({queryKey:['oficina-personas','estado']});}catch(err){setError(errorOficina(err));}finally{setOcupado(false);}};
    return <details className="oh-mi-estado"><summary>Mi estado · {nombreEstado(persona)}</summary><form onSubmit={guardar}><select aria-label="Mi disponibilidad" value={estado} onChange={e=>setEstado(e.target.value)}><option value="disponible">Disponible</option><option value="ocupado">Ocupado</option><option value="ausente">Ausente</option></select><input aria-label="Nota de mi estado" placeholder="Ej.: atendiendo un cliente" maxLength={100} value={nota} onChange={e=>setNota(e.target.value)}/><button className="of-boton" disabled={ocupado}>{ocupado?'Guardando…':'Guardar'}</button></form>{error&&<p role="alert">{error}</p>}</details>;
}

export default function PanelColaboracion({estado,persona,onCambiar,onCerrar,borradores,onEnviado,trabajoInicial=null}) {
    const privadoDe=p=>p&&p.id!==estado.yo.id?String(p.id):null;
    const [tab,setTab]=useState(()=>trabajoInicial?'trabajos':'mensajes'),panel=useRef(null);
    useEffect(()=>{if(trabajoInicial){setTab('trabajos');}},[trabajoInicial]);
    // Chat abierto: null = lista de chats; 'equipo' = tablón; id = conversación privada.
    const [hilo,setHilo]=useState(()=>privadoDe(persona)),[contacto,setContacto]=useState(persona);
    useEffect(()=>{const id=privadoDe(persona);if(id){setHilo(id);setContacto(persona);setTab('mensajes');}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[persona?.id]);
    const abrirChat=(canal,p)=>{setHilo(canal);setContacto(p);onCambiar(p||null);};
    const [saliendo,setSaliendo]=useState(false);
    const cerrar=useCallback(()=>setSaliendo(true),[]);
    useEffect(()=>{if(!saliendo)return;const t=setTimeout(onCerrar,window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:180);return()=>clearTimeout(t);},[saliendo,onCerrar]);
    useEffect(()=>{const origen=document.activeElement;panel.current?.focus();const cerrar=e=>{if(e.key==='Escape'&&!document.querySelector('[aria-modal="true"]')){e.preventDefault();setSaliendo(true);}};window.addEventListener('keydown',cerrar);return()=>{window.removeEventListener('keydown',cerrar);if(origen instanceof HTMLElement)origen.focus({preventScroll:true});};},[onCerrar]);
    const yo=estado.personas.find(p=>p.id===estado.yo.id);
    return <aside className={`of-chat-dock oh-panel${saliendo?' is-saliendo':''}`} ref={panel} tabIndex={-1} aria-label="Bandeja de la oficina">
        <header className="oh-panel__cabecera"><span><FaUser/><small>PERSONAS · LOTTUS</small><strong>{persona?.nombre||'Bandeja compartida'}</strong></span><button className="of-boton" onClick={cerrar} aria-label="Cerrar bandeja"><FaTimes/></button></header>
        <div className="oh-panel__contacto"><label>Conversar con<select aria-label="Persona o equipo" value={persona?.id||''} onChange={e=>{const p=opciones(estado).find(x=>x.id===Number(e.target.value))||null;onCambiar(p);if(tab==='mensajes')abrirChat(privadoDe(p)||'equipo',privadoDe(p)?p:null);}}><option value="">Todo el equipo</option>{opciones(estado).map(p=><option key={p.id} value={p.id}>{p.nombre}{p.id===estado.yo.id?' (yo)':''}</option>)}</select></label></div>
        {yo&&<MiEstado persona={yo}/>}
        <nav className="oh-tabs" aria-label="Bandeja"><button aria-pressed={tab==='mensajes'} onClick={()=>setTab('mensajes')}><FaCommentDots/>Mensajes</button><button aria-pressed={tab==='trabajos'} onClick={()=>setTab('trabajos')}><FaTasks/>Trabajos</button><button aria-pressed={tab==='ventas'} onClick={()=>setTab('ventas')}>Ventas</button></nav>
        <div className="oh-panel__contenido">{tab==='mensajes'?(hilo?<Mensajes key={hilo} estado={estado} canal={hilo} contacto={contacto} borradores={borradores} onVolver={()=>setHilo(null)} onEnviado={onEnviado}/>:<ListaChats estado={estado} onAbrir={abrirChat}/>):tab==='trabajos'?<Trabajos key={persona?.id||'equipo'} estado={estado} persona={persona} trabajoInicial={trabajoInicial}/>:<ResumenVentas estado={estado} persona={persona}/>}</div>
    </aside>;
}
