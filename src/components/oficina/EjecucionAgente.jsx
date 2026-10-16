import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FaCheckCircle, FaClock, FaExclamationCircle, FaExternalLinkAlt, FaRobot } from 'react-icons/fa';
import API from '../../services/api';
import Markdown from '../chat/Markdown';
import './EjecucionAgente.css';

const ESTADOS = { pendiente:'En cola', ejecutando:'Ejecutando en la plataforma', listo:'Resultado verificado', necesita_datos:'Necesita datos para continuar', error:'Requiere revisión' };
const activo = t => ['pendiente','ejecutando'].includes(t?.estado);

export default function EjecucionAgente({ id, inicial, compacto=false }) {
  const cache=useQueryClient();
  const [datos,setDatos]=useState(''),[error,setError]=useState(''),[ocupado,setOcupado]=useState(false);
  const q=useQuery({queryKey:['trabajo-agente',id],queryFn:()=>API.get(`/asistente/agente/trabajos/${id}/`).then(r=>r.data),
    initialData:inicial,refetchInterval:query=>activo(query.state.data)?3000:false,retry:false});
  const t=q.data;
  const retomar=async()=>{
    setError('');setOcupado(true);
    try { await API.post(`/asistente/agente/trabajos/${id}/`,{accion:'retomar',datos_adicionales:datos});setDatos('');await cache.invalidateQueries({queryKey:['trabajo-agente',id]}); }
    catch(e){setError(e.response?.data?.error||'No se pudo retomar la ejecución.');}
    finally{setOcupado(false);}
  };
  if(q.isError&&!t)return <div className="ej-agente ej-agente--error" role="alert">No se pudo consultar la ejecución. <button onClick={()=>q.refetch()}>Reintentar</button></div>;
  if(!t)return <div className="ej-agente" role="status">Cargando ejecución…</div>;
  const nombre=t.agente?.nombre||'El agente ejecutor';
  const Icono=activo(t)?FaClock:t.estado==='listo'?FaCheckCircle:FaExclamationCircle;
  const resumen=(t.resultado||'').split(/\n\s*\n/)[0].replace(/[*`#]/g,'');
  const ventas=(t.pasos||[]).flatMap(p=>p.resultado?.ventas||[]);
  const trabajoId=t.id||id;
  return <section className={`ej-agente is-${t.estado}${compacto?' is-compacto':''}`} aria-label={`Ejecución ${trabajoId} de ${nombre}`}>
    <div className="ej-agente__cab"><span className="ej-agente__avatar"><FaRobot/></span><div><strong>{nombre} · Ejecución #{trabajoId}</strong><small><Icono/> {ESTADOS[t.estado]||t.estado}</small></div><span className="ej-agente__contador">{t.pasos_guardados} {t.pasos_guardados===1?'paso guardado':'pasos guardados'}</span></div>
    {q.isError&&<p role="alert">No se pudo actualizar. Se conserva el último resultado. <button onClick={()=>q.refetch()}>Reintentar</button></p>}
    {t.estado==='pendiente'&&(t.motor?.activo===false
      ?<p role="alert">El motor de IA está desconectado. La solicitud está guardada y {nombre} empezará cuando se restablezca.</p>
      :<p>{nombre} recibió la tarea y empieza en un momento.</p>)}
    {t.estado==='ejecutando'&&<><div className="ej-agente__avance" aria-hidden="true"><i/></div><p>{nombre} está ejecutando tu solicitud. El resultado aparecerá aquí cuando termine.</p></>}
    {t.error&&<p className="ej-agente__error" role="alert">{t.error}</p>}
    {!activo(t)&&t.resultado&&(compacto?<p>{resumen.length>700?resumen.slice(0,700)+'…':resumen}</p>:<Markdown texto={t.resultado}/>)}
    {ventas.length>0&&<div className="ej-agente__registros">{ventas.map(v=><Link key={v.venta_id} to={v.url}>Venta #{v.venta_id}<small>{v.productos} productos · {v.fecha_venta}</small><FaExternalLinkAlt/></Link>)}</div>}
    {!compacto&&!!t.pasos?.length&&<ol className="ej-agente__pasos">{t.pasos.map((p,i)=><li key={p.clave}><FaCheckCircle/><span><strong>{i+1}. {p.operacion.replaceAll('_',' ')}</strong><small>{p.resultado?.ventas_registradas?`${p.resultado.ventas_registradas} ventas guardadas con sus productos`:p.resultado?.datos?.venta_id?`Venta #${p.resultado.datos.venta_id} guardada`:'Operación guardada y registrada'}</small></span></li>)}</ol>}
    {compacto?<Link className="ej-agente__enlace" to={`/IA?operacion=${trabajoId}`}>Ver avance y resultado <FaExternalLinkAlt/></Link>:<>
      {t.conversacion&&<Link className="ej-agente__enlace" to={`/IA/general?conversacion=${t.conversacion}`}>Abrir conversación de ejecución <FaExternalLinkAlt/></Link>}
    </>}
    {['error','necesita_datos'].includes(t.estado)&&<div className="ej-agente__retomar"><label htmlFor={`datos-agente-${id}`}>Datos para continuar<textarea id={`datos-agente-${id}`} rows={compacto?2:3} maxLength={4000} value={datos} onChange={e=>setDatos(e.target.value)} placeholder={`Completa los datos que pidió ${nombre} o continúa con los que ya proporcionaste.`}/></label><button disabled={ocupado} onClick={retomar}>{ocupado?'Retomando…':`Continuar con ${nombre}`}</button>{error&&<p role="alert">{error}</p>}</div>}
  </section>;
}

export function EjecucionesAgente({ onAbrir }) {
  const q=useQuery({queryKey:['trabajos-agente'],queryFn:()=>API.get('/asistente/agente/trabajos/').then(r=>r.data),
    refetchInterval:query=>query.state.data?.trabajos?.some(activo)?5000:false,retry:false});
  return <div className="ej-agente__lista">{q.isPending?<p role="status">Cargando ejecuciones…</p>:q.isError?<p role="alert">No se pudo cargar el historial. <button onClick={()=>q.refetch()}>Reintentar</button></p>:q.data.trabajos.length?q.data.trabajos.map(t=><button key={t.id} onClick={()=>onAbrir(t.id)}><FaRobot/><span><strong>Ejecución #{t.id} · {ESTADOS[t.estado]}</strong><small>{t.solicitud}</small></span><b>{t.pasos_guardados} pasos</b></button>):<p>Pide a IA Lottus que ejecute un cambio: se lo encargará al agente ejecutor y aquí verás sus pasos y resultados.</p>}</div>;
}
