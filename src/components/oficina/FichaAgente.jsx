import React, {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {FaArrowRight, FaCalendarAlt, FaClock, FaTimes, FaBullseye, FaMapMarkerAlt, FaCommentDots} from 'react-icons/fa';
import AvatarPerfil from '../chat/AvatarPerfil';
import {fechaTarea, ESTADOS_TAREA, horarioTarea, objetivoAgente, NOMBRES_AREAS} from './actividadAgente';

export function ContenidoFicha({agente, info, trabajando, puedeProgramar, onConversar, onProgramar, onResultado, movimiento, zonaNombre}) {
    const pendiente = info.pendientes[0];
    const curso = info.enCurso[0];
    const iniciativa=info.iniciativas?.[0];
    const cursoAcademia=info.cursos?.[0];
    const ocupacion=(movimiento?.tipo!=='trabajo'&&movimiento?.texto)|| (curso?`${ESTADOS_TAREA[curso.estado]} · ${curso.nombre}`:cursoAcademia?cursoAcademia.detalle:info.compartido?'Trabajando en una tarea de la oficina':trabajando?'Preparando una respuesta para ti':movimiento?.texto||'Disponible en su puesto');
    const ultima=info.tareas.map(t=>t.ultima).filter(Boolean).sort((a,b)=>new Date(b.creada)-new Date(a.creada))[0];
    return <>
        <span className="of-ficha__tipo">{agente.id==null?'DIRECCIÓN · IA LOTTUS':'ESPECIALISTA · INTELIGENCIA ARTIFICIAL'}</span>
        <div className="of-ficha__identidad"><AvatarPerfil perfil={agente} tamano={44}/><div><strong>{agente.nombre}</strong><p>{agente.rol}</p></div></div>
        <div className="of-ficha__ubicacion"><FaMapMarkerAlt/>{zonaNombre||'Oficina Lottus'}<span>Movimiento libre</span></div>
        <div className="of-ficha__objetivo"><FaBullseye/><div><small>MI OBJETIVO</small><p>{objetivoAgente(agente)}</p></div></div>
        <div className={`of-ficha__estado${trabajando||curso||movimiento?' is-trabajando':''}`}><i className={`of-punto${trabajando||curso?' is-activa':''}`}/><div><small>AHORA</small>{ocupacion}{curso?.iniciada&&<span>Desde {fechaTarea(curso.iniciada)}</span>}{cursoAcademia&&<span>{cursoAcademia.titulo} · {cursoAcademia.avance}%</span>}</div></div>
        <div className="of-ficha__areas">{(agente.areas||[]).map(a=><span key={a}>{NOMBRES_AREAS[a]||a}</span>)}</div>
        <div className="of-ficha__metricas"><span><b>{info.tareas.filter(t=>t.activa).length}</b>Activas</span><span><b>{info.enCurso.length}</b>En curso / cola</span><span><b>{info.pendientes.length}</b>Para revisar</span></div>
        {!info.disponible ? <p className="of-ficha__nota">No se pudo consultar la programación. El chat sigue disponible.</p> : <>
            <div className="of-ficha__dato"><FaCalendarAlt/><div><small>PRÓXIMA TAREA · BOGOTÁ</small><strong>{info.proxima?.nombre || 'Sin tareas programadas'}</strong>{info.proxima && <span>{fechaTarea(info.proxima.proxima_ejecucion)}</span>}</div></div>
            {info.proxima && !info.motor?.activo && <p className="of-ficha__nota">El motor no ha confirmado actividad reciente. La tarea permanece guardada.</p>}
            {info.tareas.length>0&&<div className="of-ficha__tareas"><small>MIS AUTOMATIZACIONES · {info.tareas.length}</small>{info.tareas.slice(0,3).map(t=><button type="button" key={t.id} onClick={()=>onProgramar(agente,false)}><span><strong>{t.nombre}</strong><span>{horarioTarea(t)}</span></span><em>{t.en_curso?'En curso':t.activa?'Activa':'Pausada'}</em></button>)}{info.tareas.length>3&&<button type="button" onClick={()=>onProgramar(agente,false)}>Ver las {info.tareas.length} automatizaciones<FaArrowRight/></button>}</div>}
            {pendiente && <div className={`of-ficha__resultado${pendiente.estado==='error'?' is-error':''}`}><small>{info.pendientes.length} {info.pendientes.length===1?'NOVEDAD PARA TI':'NOVEDADES PARA TI'}</small><strong>{pendiente.nombre}</strong><p>{pendiente.estado==='error'?pendiente.error:pendiente.resultado}</p><button type="button" onClick={()=>onResultado(pendiente)}>{pendiente.estado==='error'?'Revisar ejecución':'Abrir resultado'}<FaArrowRight/></button></div>}
            {!pendiente && <p className="of-ficha__nota">{info.tareas.length?`${info.tareas.length} tareas configuradas · Sin resultados pendientes de leer.`:'Programa el primer análisis de este agente.'}</p>}
            {ultima&&!pendiente&&<p className="of-ficha__nota">Última ejecución: {ESTADOS_TAREA[ultima.estado]} · {fechaTarea(ultima.finalizada||ultima.creada)}</p>}
        </>}
        {iniciativa&&<div className="of-ficha__iniciativa"><small><FaCommentDots/> ORIENTACIÓN PENDIENTE</small><p>{iniciativa.texto}</p><button type="button" onClick={()=>onResultado({...iniciativa,iniciativa:true})}>Responder al agente<FaArrowRight/></button></div>}
        <div className="of-ficha__acciones"><button type="button" onClick={()=>onConversar(agente)}>Abrir chat<FaArrowRight/></button>{puedeProgramar && <button type="button" onClick={()=>onProgramar(agente,true)}><FaClock/>Programar tarea</button>}</div>
    </>;
}

/** El cuadro vive fuera del plano para que el desplazamiento no lo recorte. */
export default function FichaAgente({agente,info,trabajando,puedeProgramar,onConversar,onProgramar,onResultado,children,style,contenidoFicha,className='',movimiento,zonaNombre}) {
    const [abierta,setAbierta] = useState(false);
    const [posicion,setPosicion] = useState({left:0,top:0});
    const ancla = useRef(null), ficha=useRef(null), espera=useRef(null);
    const id = useId();
    const mantener = () => clearTimeout(espera.current);
    const abrir = () => {
        mantener();
        const r=ancla.current?.getBoundingClientRect();
        if(!r)return;
        const ancho=Math.min(380,window.innerWidth-24);
        const derecha=r.right+10, izquierda=r.left-ancho-10;
        const alLado=derecha+ancho<=window.innerWidth-12 || izquierda>=12;
        const left=derecha+ancho<=window.innerWidth-12?derecha:izquierda>=12?izquierda:
            Math.min(Math.max(12,r.left+r.width/2-ancho/2),window.innerWidth-ancho-12);
        // Dejar libre el puesto para que el clic siga abriendo su conversación.
        const alto=Math.min(620,window.innerHeight-24);
        const top=alLado?Math.max(12,Math.min(r.top-20,window.innerHeight-alto-12)):
            r.bottom+alto<window.innerHeight-12?r.bottom+10:Math.max(12,r.top-alto-10);
        setPosicion({left,
            top,width:ancho,maxHeight:Math.max(0,window.innerHeight-top-12)});
        setAbierta(true);
    };
    const salir = () => { mantener(); espera.current=setTimeout(()=>setAbierta(false),220); };
    useLayoutEffect(()=>{
        if(!abierta||!ficha.current)return;
        const alto=ficha.current.scrollHeight;
        setPosicion(p=>{
            const top=Math.max(12,Math.min(p.top,window.innerHeight-alto-12));
            return top===p.top?p:{...p,top,maxHeight:window.innerHeight-top-12};
        });
    },[abierta,posicion.top]);
    useEffect(()=>()=>clearTimeout(espera.current),[]);
    useEffect(()=>{
        if(!abierta)return;
        const cerrar=e=>{if(!(e.target instanceof Node) || !ficha.current?.contains(e.target))setAbierta(false);};
        window.addEventListener('scroll',cerrar,true); window.addEventListener('resize',cerrar);
        return()=>{window.removeEventListener('scroll',cerrar,true);window.removeEventListener('resize',cerrar);};
    },[abierta]);
    const teclado=e=>{
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();ancla.current?.querySelector('button')?.focus();setAbierta(false);}
        if(e.key==='ArrowDown'){e.preventDefault();abrir();requestAnimationFrame(()=>ficha.current?.querySelector('button')?.focus());}
    };
    const actuar=accion=>(...args)=>{ancla.current?.querySelector('button')?.focus();setAbierta(false);accion?.(...args);};
    return <div ref={ancla} style={style} className={className} onMouseEnter={abrir} onMouseLeave={salir}
        onFocus={abrir} onClick={()=>setAbierta(false)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)&&!ficha.current?.contains(e.relatedTarget))salir();}} onKeyDown={teclado}>
        {children(id,abierta)}
        {abierta && createPortal(<aside ref={ficha} id={id} className="of-ficha" style={{...posicion,'--ficha-color':style?.['--agente-color']||'#657656'}} role="region" aria-label={`Actividad de ${agente.nombre}`}
            onMouseEnter={mantener} onMouseLeave={salir} onFocus={mantener}
            onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget)&&!ancla.current?.contains(e.relatedTarget))salir();}} onKeyDown={teclado}>
            <button type="button" className="of-ficha__cerrar" aria-label="Cerrar ficha" onClick={()=>{ancla.current?.querySelector('button')?.focus();setAbierta(false);}}><FaTimes/></button>
            {contenidoFicha || <ContenidoFicha agente={agente} info={info} trabajando={trabajando} movimiento={movimiento} zonaNombre={zonaNombre} puedeProgramar={puedeProgramar} onConversar={actuar(onConversar)} onProgramar={actuar(onProgramar)} onResultado={actuar(onResultado)}/>}
        </aside>,document.body)}
    </div>;
}
