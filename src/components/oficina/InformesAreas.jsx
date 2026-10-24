import React,{useMemo,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {FaChartBar,FaCog,FaSyncAlt} from 'react-icons/fa';
import API from '../../services/api';
import Modal from '../ui/Modal';
import Markdown from '../chat/Markdown';
import GraficoDatos from '../chat/GraficoDatos';
import './InformesAreas.css';

const error=e=>e?.response?.data?.detail||e?.response?.data?.error||'No se pudo completar esta operación.';
const fecha=v=>v?new Date(v).toLocaleString('es-CO',{timeZone:'America/Bogota',dateStyle:'short',timeStyle:'short'}):'—';
const estados={pendiente:'En cola',ejecutando:'En recorrido',listo:'Entregado',parcial:'Entregado con análisis pendientes',error:'Interrumpido'};
const hora=v=>v?.slice(0,5)||'';
const tareas=p=>p.pendientes+p.en_curso+p.bloqueadas;

function Programacion({datos,zonas,perfiles,modelos,onCerrar}){
    const cache=useQueryClient();
    const [f,setF]=useState({...datos.programa,hora_inicio:hora(datos.programa.hora_inicio),hora_fin:hora(datos.programa.hora_fin),autorizar_envio:false});
    const [ocupado,setOcupado]=useState(false),[fallo,setFallo]=useState('');
    const guardar=async e=>{e.preventDefault();setOcupado(true);setFallo('');try{
        const {proxima_ejecucion:omitida,...campos}=f;void omitida;
        await API.put('/oficina/coordinacion/',campos);
        await cache.invalidateQueries({queryKey:['oficina-coordinacion']});onCerrar();
    }catch(e){setFallo(error(e));}finally{setOcupado(false);}};
    return <form className="oi-programa" onSubmit={guardar}>
        <p>IA Lottus recorre todas las áreas al iniciar el día y actualiza al Coach y al analista cada hora. Los informes se comparten con {datos.destinatarios.map(u=>u.nombre).join(' y ')}.</p>
        <label className="oi-check"><input type="checkbox" checked={f.activa} onChange={e=>setF({...f,activa:e.target.checked})}/>Informe automático activo</label>
        <div className="oi-horario"><label>Inicio · Bogotá<input type="time" value={f.hora_inicio} required onChange={e=>setF({...f,hora_inicio:e.target.value})}/></label><span>Cada hora a :50</span><label>Último informe<input type="time" value={f.hora_fin} required onChange={e=>setF({...f,hora_fin:e.target.value})}/></label></div>
        <fieldset><legend>Días de actualización</legend><div className="oi-dias">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((dia,i)=><label key={dia}><input type="checkbox" checked={f.dias.includes(i)} onChange={e=>setF({...f,dias:e.target.checked?[...f.dias,i]:f.dias.filter(n=>n!==i)})}/>{dia}</label>)}</div></fieldset>
        <label>Análisis de los líderes<select value={f.modelo} onChange={e=>setF({...f,modelo:e.target.value})}><option value="">Solo datos ERP · sin envío a Gemini</option><option value="automatico">Gemini automático · cambia de modelo si está saturado</option>{modelos.map(m=><option key={m.id} value={m.id}>{m.id}</option>)}</select></label>
        {f.modelo&&<p className="oi-alerta">Al guardar con Gemini autorizas enviar a ese servicio los nombres y el avance de trabajo de las personas invitadas, los conteos de ventas por asesor y hasta 20 pendientes de proveedores. El informe se comparte con los gerentes indicados arriba. No se envían chats privados, clientes, importes ni nómina.</p>}
        {f.modelo&&!datos.programa.modelo&&<label className="oi-check"><input type="checkbox" checked={f.autorizar_envio} onChange={e=>setF({...f,autorizar_envio:e.target.checked})}/>Autorizo enviar esta evidencia a Gemini para el análisis de los agentes</label>}
        <fieldset><legend>Líder por área</legend><div className="oi-lideres">{zonas.filter(z=>z.ambiente!=='gerencia').map(z=><label key={z.id}>{z.nombre}<select value={f.lideres[String(z.id)]||''} onChange={e=>{const lideres={...f.lideres};if(e.target.value)lideres[String(z.id)]=Number(e.target.value);else delete lideres[String(z.id)];setF({...f,lideres});}}><option value="">Sin líder asignado</option>{perfiles.filter(p=>p.activo&&p.zona===z.id).map(p=><option value={p.id} key={p.id}>{p.nombre}</option>)}</select></label>)}</div></fieldset>
        <p className="oi-fuente">Las áreas sin líder se indican como pendientes de configuración. El avance del Coach usa las tareas registradas; no se crean resultados de clases o exámenes.</p>
        {fallo&&<p role="alert" className="of-error">{fallo}</p>}<div className="of-form-acciones"><button type="button" className="of-boton" onClick={onCerrar} disabled={ocupado}>Volver al informe</button><button className="of-boton of-boton--principal" disabled={ocupado||!f.dias.length||!!(f.modelo&&!datos.programa.modelo&&!f.autorizar_envio)}>{ocupado?'Guardando…':'Guardar programa'}</button></div>
    </form>;
}

export default function InformesAreas({coordinacion,zonas,perfiles,modelos=[],informeInicial,onCerrar,onInforme}){
    const cache=useQueryClient();
    const [id,setId]=useState(informeInicial||coordinacion.informes?.[0]?.id||null);
    const [tab,setTab]=useState('panorama'),[configurar,setConfigurar]=useState(false),[ocupado,setOcupado]=useState(false),[fallo,setFallo]=useState('');
    const [filtro,setFiltro]=useState(''),[pagina,setPagina]=useState(0);
    const q=useQuery({queryKey:['oficina-informe',id],enabled:!!id,queryFn:()=>API.get(`/oficina/informes/${id}/`).then(r=>r.data),refetchInterval:query=>['pendiente','ejecutando'].includes(query.state.data?.estado)?2500:false,retry:false});
    const i=q.data,d=i?.datos,ventas=d?.ventas,coach=d?.coach||[];
    const planes=useMemo(()=>(d?.ventas?.plan||[]).filter(p=>!filtro||String(p.venta).includes(filtro)||p.vendedores.some(u=>u.nombre.toLowerCase().includes(filtro.toLowerCase()))),[d,filtro]);
    const solicitar=async()=>{setOcupado(true);setFallo('');try{
        const r=await API.post('/oficina/informes/',{clave:crypto.randomUUID()});
        setId(r.data.id);setTab('panorama');onInforme?.(r.data.id);
        await cache.invalidateQueries({queryKey:['oficina-coordinacion']});
    }catch(e){setFallo(error(e));}finally{setOcupado(false);}};
    const grafico=(titulo,etiquetas,valores,fuente)=>({tipo:'barras',titulo,etiquetas,valores,unidad:'registros',fuente,color:'#8a7045'});
    return <Modal open size="xl" title={configurar?'Programa de coordinación':'Informe de áreas · IA Lottus'} onClose={onCerrar}>
        <div className="oi-informe">
        {configurar?<Programacion datos={coordinacion} zonas={zonas} perfiles={perfiles} modelos={modelos} onCerrar={()=>setConfigurar(false)}/>:<>
            <div className="oi-portada" tabIndex={-1} data-autofocus><div><span className="of-eyebrow">GERENCIA · OFICINA LOTTUS</span><h2>El pulso de tus áreas</h2><p>Para {coordinacion.destinatarios?.map(u=>u.nombre).join(' y ')} · Actualizaciones desde {hora(coordinacion.programa?.hora_inicio)}, Bogotá.</p></div><FaChartBar aria-hidden="true"/></div>
            <div className="oi-controles"><select aria-label="Informe a consultar" value={id||''} onChange={e=>{setId(Number(e.target.value));setPagina(0);}}><option value="" disabled>Seleccionar informe</option>{[...(id&&!coordinacion.informes?.some(r=>r.id===id)?[{id,estado:i?.estado||'pendiente',creado:i?.creado}]:[]),...(coordinacion.informes||[])].map(r=><option value={r.id} key={r.id}>#{r.id} · {fecha(r.creado)} · {estados[r.estado]}</option>)}</select><button className="of-boton of-boton--principal" onClick={solicitar} disabled={ocupado||['pendiente','ejecutando'].includes(i?.estado)}><FaSyncAlt/>{ocupado?'Solicitando…':'Pedir informe ahora'}</button>{coordinacion.puede_configurar&&<button className="of-boton" onClick={()=>setConfigurar(true)} title="Programar informes"><FaCog/>Programa</button>}</div>
            {coordinacion.motor?.activo===false&&<p role="status" className="oi-alerta">El motor de automatizaciones está detenido. Los informes quedarán en cola hasta que se inicie.</p>}
            {fallo&&<p role="alert" className="of-error">{fallo}</p>}
            {q.isError?<p role="alert" className="of-error">{error(q.error)} <button onClick={()=>q.refetch()}>Reintentar</button></p>:q.isPending&&id?<p role="status">Consultando informe…</p>:!id?<p className="oi-vacio">Pide el primer informe o dile a IA Lottus: «dame un informe de las áreas».</p>:<>
                <div className={`oi-estado is-${i.estado}`} role="status"><i className="of-punto"/><strong>{estados[i.estado]}</strong><span>{i.etapa}</span><small>{fecha(i.finalizado||i.creado)}</small></div>
                {i.error&&<p role="alert" className="of-error">{i.error}</p>}
                {ventas&&<><div className="oi-indicadores"><article><small>Personas activas en oficina</small><strong>{coach.length}</strong><span>Avance individual revisado</span></article><article><small>Ventas por entregar</small><strong>{ventas.total_pendientes}</strong><span>Cada venta contada una vez</span></article><article className="is-alerta"><small>Gestiones atrasadas</small><strong>{ventas.gestion_atrasada}</strong><span>Según la regla vigente del ERP</span></article><article className="is-alerta"><small>Entregas atrasadas</small><strong>{ventas.entrega_atrasada}</strong><span>Fecha comprometida superada</span></article></div>
                <div className="oi-captura"><span>Datos consultados: {fecha(d.capturado)}</span><span>{d.cambios?.primera_lectura?'Primera lectura':d.cambios?.detectados?'Cambios detectados desde el informe anterior':'Sin cambios en los indicadores consultados'}</span></div>
                <nav className="oi-tabs" aria-label="Secciones del informe">{[['panorama','Panorama'],['coach','Coach y personas'],['ventas','Plan comercial'],['areas','Líderes de áreas']].map(([k,n])=><button key={k} aria-pressed={tab===k} onClick={()=>setTab(k)}>{n}</button>)}</nav>
                {tab==='panorama'&&<><Markdown texto={i.resumen}/><div className="oi-graficos"><GraficoDatos claro grafico={grafico('Trabajo abierto por persona',coach.map(p=>p.usuario.nombre),coach.map(tareas),'Trabajos de oficina')}/><GraficoDatos claro grafico={grafico('Pendientes comerciales por asesor',ventas.vendedores.map(p=>p.usuario.nombre),ventas.vendedores.map(p=>p.pendientes),'Ventas pendientes')}/></div><p className="oi-fuente">{ventas.nota}</p></>}
                {tab==='coach'&&<><p className="oi-alerta">Aún no hay evidencia de clases ni exámenes. Estos datos reflejan el trabajo registrado en oficina; no representan una nota de aprendizaje.</p><div className="oi-personas">{coach.map(p=><article key={p.usuario.id}><div><strong>{p.usuario.nombre}</strong><small>{p.usuario.rol} · {p.estado}</small></div><dl><div><dt>Pendientes</dt><dd>{p.pendientes}</dd></div><div><dt>En curso</dt><dd>{p.en_curso}</dd></div><div><dt>Bloqueadas</dt><dd>{p.bloqueadas}</dd></div><div><dt>Entregadas hoy</dt><dd>{p.entregadas_hoy}</dd></div><div><dt>Atrasadas</dt><dd>{p.atrasadas}</dd></div></dl><small className="oi-fuente">Última presencia: {fecha(p.ultima_presencia)}</small></article>)}</div></>}
                {tab==='ventas'&&<><div className="oi-plan-filtro"><label>Buscar venta o vendedor<input value={filtro} onChange={e=>{setFiltro(e.target.value);setPagina(0);}} placeholder="Número de venta o nombre"/></label><span>{planes.length} ventas en el plan</span></div><div className="oi-planes">{planes.slice(pagina*20,(pagina+1)*20).map(p=><details key={p.venta}><summary><strong>Venta #{p.venta}</strong><span>{p.vendedores.map(u=>u.nombre).join(' · ')}</span><small>{p.entrega_atrasada?`${p.dias_atraso_entrega} días de atraso en entrega`:p.gestion_atrasada?'Gestión atrasada':'Pendiente'} · Compromiso {p.fecha_entrega||'sin fecha'}</small></summary><ol>{p.acciones.map((a,n)=><li key={n}><b>{a.responsable==='analista'?'Analista de ventas':'Vendedor'}:</b> {a.accion}{a.pedidos&&` Pedidos: ${a.pedidos.join(', ')}.`}</li>)}</ol><p className="oi-fuente">Plan propuesto; no crea tareas ni cambia esta venta automáticamente.</p></details>)}</div>{!planes.length&&<p>No hay ventas que coincidan.</p>}<div className="oi-paginas"><button className="of-boton" disabled={!pagina} onClick={()=>setPagina(p=>p-1)}>Anterior</button><span>{pagina+1} / {Math.max(1,Math.ceil(planes.length/20))}</span><button className="of-boton" disabled={(pagina+1)*20>=planes.length} onClick={()=>setPagina(p=>p+1)}>Siguiente</button></div><h3>Seguimiento del analista</h3><p>{ventas.plan_analista.length} ventas requieren confirmar pedidos atrasados con proveedores. Las acciones están identificadas en cada venta.</p></>}
                {tab==='areas'&&<div className="oi-areas">{d.areas?.map(a=><article key={a.zona}><header><span className="of-eyebrow">{a.nombre}</span><strong>{a.lider||'Sin líder asignado'}</strong><small>{a.estado==='listo'?'Resultados recibidos':a.estado==='datos_erp'?'Indicadores ERP · análisis IA desactivado':a.estado==='sin_analisis'?'Análisis pendiente':'Pendiente de configuración'}</small></header><Markdown texto={a.texto}/>{a.error&&<p className="oi-alerta">{a.error}</p>}{a.modelo&&<small className="oi-fuente">Modelo: {a.modelo}</small>}</article>)}</div>}
                </>}
            </>}
        </>}
        </div>
    </Modal>;
}
