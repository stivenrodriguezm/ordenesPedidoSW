import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { FaArrowRight, FaCalendarAlt, FaComments, FaEnvelope, FaGraduationCap, FaInfoCircle, FaTimes, FaList, FaMap, FaMinus, FaPen, FaPlus, FaSearch, FaSlidersH, FaTasks, FaUser, FaUserPlus, FaUsers } from 'react-icons/fa';
import API from '../services/api';
import AvatarPerfil from '../components/chat/AvatarPerfil';
import { GENERAL } from '../components/chat/catalogoIA';
import EscenaOficina, { Personaje } from '../components/oficina/EscenaOficina';
import Modal from '../components/ui/Modal';
import AutomatizacionesIA from '../components/oficina/AutomatizacionesIA';
import AcademiaIA from '../components/oficina/AcademiaIA';
import {ContenidoFicha} from '../components/oficina/FichaAgente';
import {actividadAgente} from '../components/oficina/actividadAgente';
import {capacidadZona} from '../components/oficina/distribucionOficina';
import { ChatLateralContext } from '../components/chat/ChatLateralContext';
import EquipoHumano,{EditorEquipo} from '../components/oficina/EquipoHumano';
import PanelColaboracion from '../components/oficina/PanelColaboracion';
import InformesAreas from '../components/oficina/InformesAreas';
import EjecucionAgente, { EjecucionesAgente } from '../components/oficina/EjecucionAgente';
import './OficinaIAPage.css';

const fallo = e => e?.response?.data?.error || e?.response?.data?.detail || 'No se pudo cargar la oficina. Intenta de nuevo.';
const AMBIENTES = {gerencia:'Gerencia',oficina:'Oficina',showroom:'Área comercial',entrenamiento:'Entrenamiento',creativo:'Desarrollo creativo',social:'Zona social',estudio:'Estudio y diseño',operaciones:'Compras y entregas',finanzas:'Finanzas y equipo'};
const desplazamiento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
const fecha = iso => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
function EditorZona({ zona, onCerrar, onGuardar }) {
    const [form, setForm] = useState(zona || { nombre: '', descripcion: '', ambiente: 'estudio' });
    const [error, setError] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const guardar = async e => {
        e.preventDefault(); setOcupado(true); setError('');
        try {
            if (form.id) await API.patch(`/asistente/zonas/${form.id}/`, form);
            else await API.post('/asistente/zonas/', form);
            await onGuardar(); onCerrar();
        } catch (err) { setError(err.response?.data?.nombre?.[0] || fallo(err)); } finally { setOcupado(false); }
    };
    return <Modal open title={form.id ? 'Editar zona' : 'Una nueva zona para tu equipo'} onClose={ocupado ? () => {} : onCerrar} size="sm">
        <form onSubmit={guardar} className="of-zona-form">
            <label>Nombre<input required autoFocus maxLength={60} value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Ej.: Estudio de diseño" /></label>
            <label>¿Qué se hace aquí?<input maxLength={160} value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} placeholder="Una descripción breve del área" /></label>
            <label>Ambiente<select value={form.ambiente} onChange={e=>setForm({...form,ambiente:e.target.value})}>{Object.entries(AMBIENTES).map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></label>
            <p className="of-ayuda">El ambiente elige los muebles de esta zona. Puedes ubicar a cada agente desde su tarjeta o su perfil.</p>
            {error && <p role="alert" className="of-error">{error}</p>}
            <div className="of-form-acciones"><button type="button" className="of-boton" onClick={onCerrar} disabled={ocupado}>Cancelar</button><button className="of-boton of-boton--principal" disabled={ocupado || !form.nombre.trim()}>{ocupado ? 'Guardando…' : 'Guardar zona'}</button></div>
        </form>
    </Modal>;
}
export default function OficinaIAPage() {
    const navegar = useNavigate();
    const [parametros,setParametros]=useSearchParams();
    const [informe,setInforme]=useState(()=>Number(parametros.get('informe'))||null);
    const [verInformes,setVerInformes]=useState(()=>parametros.has('informe'));
    const [verAcademia,setVerAcademia]=useState(()=>parametros.has('curso'));
    const [verEjecuciones,setVerEjecuciones]=useState(()=>parametros.has('operacion'));
    const [operacion,setOperacion]=useState(()=>Number(parametros.get('operacion'))||null);
    useEffect(()=>{const id=Number(parametros.get('operacion'));if(id>0){setOperacion(id);setVerEjecuciones(true);}},[parametros]);
    useEffect(()=>{const id=Number(parametros.get('informe'));if(id>0){setInforme(id);setVerInformes(true);}},[parametros]);
    const cache = useQueryClient();
    const [modo, setModo] = useState(() => window.matchMedia?.('(max-width: 680px)').matches ? 'equipo' : 'mapa');
    const [busqueda, setBusqueda] = useState('');
    const [zona, setZona] = useState('');
    const [pagina, setPagina] = useState(0);
    const [puestos, setPuestos] = useState(0);
    const [editZona, setEditZona] = useState(null);
    const [error, setError] = useState('');
    const [ubicando, setUbicando] = useState(null);
    const [panel,setPanel] = useState(null),[inspector,setInspector] = useState(null),[zoom,setZoom] = useState(()=>window.matchMedia?.('(max-width: 680px)').matches ? .6 : 1);
    const plano = useRef(null),arrastre=useRef(null);
    const {chat,setChat,contextos,setMinimizado}=useContext(ChatLateralContext);
    useEffect(()=>{if(parametros.has('curso')){setVerAcademia(true);setChat(null);}},[parametros,setChat]);
    useEffect(()=>{if(parametros.has('operacion'))setChat(null);},[parametros,setChat]);
    useEffect(()=>{
        const tId=Number(parametros.get('trabajo'));
        if(tId>0){
            setColaboracion({ trabajoId: tId });
            setChat(null);
        }
    },[parametros,setChat]);
    const borradoresHumanos=useRef({});
    const [editarEquipo,setEditarEquipo]=useState(false),[colaboracion,setColaboracion]=useState(null);
    useEffect(()=>{if(chat)setColaboracion(null);},[chat]);
    const equipoQ=useQuery({queryKey:['oficina-personas','estado'],queryFn:()=>API.get('/oficina/estado/').then(r=>r.data),refetchInterval:10000,retry:false});
    const equipo=equipoQ.data,usaIA=equipo?.puede_usar_ia===true;
    const coordinacionQ=useQuery({queryKey:['oficina-coordinacion'],enabled:!!equipo?.participa,queryFn:()=>API.get('/oficina/coordinacion/').then(r=>r.data),refetchInterval:10000,retry:false});
    const cursorEventos=useRef(0);
    const eventosQ=useQuery({queryKey:['oficina-interacciones'],enabled:!!equipo?.participa,queryFn:async()=>{const r=await API.get('/oficina/interacciones/',{params:{desde:cursorEventos.current}});cursorEventos.current=r.data.cursor;return r.data;},refetchInterval:3000,retry:false});
    const [eventos,setEventos]=useState([]);
    useEffect(()=>{if(eventosQ.data?.eventos?.length)setEventos(p=>[...p,...eventosQ.data.eventos].slice(-100));},[eventosQ.data]);
    const personas=useMemo(()=>equipo?.personas||[],[equipo]);
    // Mensajes nuevos: aviso y un sobre que vuela de quien escribe hasta ti en el plano.
    const [vuelos,setVuelos]=useState([]),[aviso,setAviso]=useState(null);
    const conteoPrevio=useRef(null);
    const informePrevio=useRef(null);
    useEffect(()=>{
        const ultimo=coordinacionQ.data?.informes?.[0];if(!ultimo)return;
        const previo=informePrevio.current;
        if(previo&&(previo.id!==ultimo.id||previo.estado!==ultimo.estado)&&['listo','parcial'].includes(ultimo.estado)){
            setAviso({informe:ultimo.id,titulo:'IA Lottus entregó el informe de áreas',detalle:'Avance del equipo, ventas pendientes y resultados por área.'});
        }
        informePrevio.current={id:ultimo.id,estado:ultimo.estado};
    },[coordinacionQ.data]);
    const volar=useCallback((de,a)=>{
        const clave=`${de}-${a}-${Date.now()}`;
        setVuelos(v=>[...v,{clave,de,a}]);
        setTimeout(()=>setVuelos(v=>v.filter(x=>x.clave!==clave)),1900);
    },[]);
    useEffect(()=>{
        if(!equipo)return;
        const actual=Object.fromEntries((equipo.mensajes_de||[]).map(m=>[m.id,m.cantidad]));
        const nombre=id=>[...personas,equipo.responsable].find(p=>p?.id===id)?.nombre||'Alguien de tu equipo';
        if(conteoPrevio.current===null){
            if(equipo.mensajes_sin_leer>0)setAviso({persona:null,titulo:`Tienes ${equipo.mensajes_sin_leer} ${equipo.mensajes_sin_leer===1?'mensaje':'mensajes'} sin leer`,detalle:'Ábrelos desde la bandeja.'});
        } else {
            const nuevos=Object.entries(actual).filter(([id,n])=>n>(conteoPrevio.current[id]||0)).map(([id])=>Number(id));
            if(nuevos.length){
                nuevos.forEach(id=>volar(id,equipo.yo.id));
                const quien=[...personas,equipo.responsable].find(p=>p?.id===nuevos[0])||null;
                setAviso({persona:nuevos.length===1?quien:null,titulo:nuevos.length===1?`${nombre(nuevos[0])} te escribió`:`${nuevos.length} personas te escribieron`,detalle:'Nuevo mensaje en tu bandeja.'});
            }
        }
        conteoPrevio.current=actual;
    },[equipo,personas,volar]);
    useEffect(()=>{if(!aviso)return undefined;const t=setTimeout(()=>setAviso(null),9000);return()=>clearTimeout(t);},[aviso]);
    const abrirPersona=useCallback(persona=>{setChat(null);setColaboracion({persona});},[setChat]);
    const cerrarBandeja=useCallback(()=>setColaboracion(null),[]);
    const soyMiembro=personas.some(p=>p.id===equipo?.yo.id);
    useEffect(()=>{
        if(!soyMiembro)return;
        const latido=()=>{if(document.visibilityState==='visible')API.post('/oficina/presencia/',{}).catch(()=>{});};
        latido();const t=setInterval(latido,45000);document.addEventListener('visibilitychange',latido);
        return()=>{clearInterval(t);document.removeEventListener('visibilitychange',latido);};
    },[soyMiembro]);
    useEffect(()=>{if(equipo&&!equipo.participa&&!equipo.puede_gestionar)setColaboracion(null);},[equipo]);
    const [estadoQ, perfilesQ, zonasQ, convQ, programaQ] = useQueries({ queries: [
        { queryKey: ['oficina-ia', 'estado'], enabled:usaIA, queryFn: ()=>API.get('/asistente/estado/').then(r=>r.data) },
        { queryKey: ['oficina-ia', 'perfiles'], enabled:usaIA, queryFn: ()=>API.get('/asistente/perfiles/').then(r=>r.data) },
        { queryKey: ['oficina-ia', 'zonas'], enabled:usaIA, queryFn: ()=>API.get('/asistente/zonas/').then(r=>r.data) },
        { queryKey: ['oficina-ia', 'conversaciones'], enabled:usaIA, queryFn: ()=>API.get('/asistente/conversaciones/').then(r=>r.data), refetchInterval: 10000 },
        { queryKey: ['oficina-ia', 'actividad'], enabled:usaIA, queryFn: ()=>API.get('/asistente/oficina-actividad/').then(r=>r.data), refetchInterval:10000 },
    ] });
    const estado = estadoQ.data;
    const perfiles = useMemo(()=>perfilesQ.data || [],[perfilesQ.data]);
    const ejecutor = perfiles.find(p=>p.ejecutor)?.nombre || 'Alan';
    const zonas = zonasQ.data || equipo?.zonas || [];
    const conversaciones = useMemo(()=>convQ.data || [],[convQ.data]);
    const gestionar = !!estado?.puede_gestionar_perfiles;
    const informeActivo=coordinacionQ.data?.informes?.find(i=>['pendiente','ejecutando'].includes(i.estado));
    const actividad = useMemo(()=>new Set([...conversaciones.filter(c=>c.activa).map(c=>c.perfil?.id??null),...(programaQ.data?.en_curso||[]).map(e=>e.es_general?null:e.perfil),...(informeActivo?[null,...perfiles.filter(p=>informeActivo.etapa===`Consultando a ${p.nombre}`).map(p=>p.id)]:[])]),[conversaciones,programaQ.data,informeActivo,perfiles]);
    // La IA Lottus general solo aparece si está habilitada para el rol (Gestionar agentes).
    const generalVisible=estado?.general?.visible!==false;
    const agentes = usaIA?[...(generalVisible?[{...GENERAL, nombre:'IA Lottus', zona:zonas.find(z=>z.ambiente==='gerencia')?.id || zonas.find(z=>z.ambiente==='estudio')?.id || zonas[0]?.id}]:[]), ...perfiles.filter(p=>p.activo)]:[];
    const ocupantes=[...agentes,...personas.map(p=>({...p,esPersona:true,color:'gris'}))];
    const puedeProgramar=gestionar && programaQ.data?.puede_programar!==false;
    const normalizar = v => (v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const visibles = agentes.filter(a=>(!zona || String(a.zona)===zona) && normalizar(`${a.nombre} ${a.rol}`).includes(normalizar(busqueda)));
    const personasVisibles=personas.filter(p=>(!zona||String(p.zona)===zona)&&normalizar(`${p.nombre} ${p.rol}`).includes(normalizar(busqueda)));
    const ocupantesVisibles=ocupantes.filter(a=>normalizar(`${a.nombre} ${a.rol}`).includes(normalizar(busqueda)));
    const paginas = Math.max(1,Math.ceil(zonas.length/6));
    const zonasMapa = zonas.slice(Math.min(pagina,paginas-1)*6,Math.min(pagina,paginas-1)*6+6);
    const gruposPuestos = Math.max(1,...zonasMapa.map(z=>Math.ceil(agentes.filter(a=>a.zona===z.id).length/Math.max(1,capacidadZona(z.ambiente)-personas.filter(p=>p.zona===z.id&&p.puesto!==null).length))));
    const elegirZona = id => { setPuestos(0); setZona(zona===id?'':id); const indice=zonas.findIndex(z=>String(z.id)===id); if(indice>=0)setPagina(Math.floor(indice/6)); };
    const crear = id => navegar(`/IA/configuracion?nuevo=1${id?`&zona=${id}`:''}`);
    const conversar = a => {
        if(!a)return;
        setColaboracion(null);
        setMinimizado?.(false);
        const clave=String(a.id??'general');
        setChat({agente:a,agentes,zonas,conversaciones,conversacion:Object.hasOwn(contextos.current,clave)?contextos.current[clave]:null});
    };
    const general=e=>{if(e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();conversar(agentes[0]);}};
    const abrirResultado=e=>{setPanel(null);setInspector(null);setChat({agente:agentes.find(a=>a.id===(e.es_general?null:e.perfil))||agentes[0],agentes,zonas,conversaciones,conversacion:e.conversacion});};
    const recargar = () => Promise.all([cache.invalidateQueries({queryKey:['oficina-ia']}),cache.invalidateQueries({queryKey:['oficina-personas']})]);
    const programar=(agente,crear=false)=>{setInspector(null);setPanel({agente,crear});};
    const abrirAcademia=()=>{setChat(null);setVerAcademia(true);};
    const cerrarAcademia=()=>{setVerAcademia(false);if(parametros.has('curso')){const p=new URLSearchParams(parametros);p.delete('curso');setParametros(p,{replace:true});}};
    const verResultado=async e=>{
        if(e.iniciativa){abrirResultado(e);return;}
        try{await API.patch(`/asistente/ejecuciones/${e.id}/`,{leida:true});await cache.invalidateQueries({queryKey:['oficina-ia','actividad']});
            setInspector(null);if(e.conversacion)abrirResultado(e);else setPanel({resultadoInicial:e.id});}
        catch(err){setError(fallo(err));}
    };
    useEffect(()=>{
        const destino=plano.current?.querySelector(`[data-zona="${zona}"]`);
        if(destino)plano.current?.scrollTo?.({left:Math.max(0,destino.offsetLeft-plano.current.clientWidth/2),behavior:desplazamiento()});
    },[zona,pagina,modo]);
    const iniciarArrastre=e=>{
        if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('button,a,input,select,[role="button"]'))return;
        arrastre.current={x:e.clientX,left:e.currentTarget.scrollLeft};e.currentTarget.setPointerCapture?.(e.pointerId);e.preventDefault();
    };
    const ubicar = async (p,valor) => {
        setUbicando(p.id); setError('');
        try { await API.patch(`/asistente/perfiles/${p.id}/`,{zona:valor?Number(valor):null}); await recargar(); }
        catch(e){setError(fallo(e));} finally{setUbicando(null);}
    };
    const cargar = equipoQ.isPending || (usaIA && (estadoQ.isPending || perfilesQ.isPending || zonasQ.isPending));
    const errorCarga = equipoQ.error || (usaIA && (estadoQ.error || perfilesQ.error || zonasQ.error));
    return <div className="of-page">
        <header className="of-cabecera">
            <div className="of-marca" aria-label="LOTTUS, oficina virtual"><span className="of-marca__nombre">LOTTUS</span><span className="of-marca__division">OFICINA VIRTUAL</span></div>
            <div className="of-cabecera__titulo"><span className="of-eyebrow">UN ESPACIO PARA CADA ÁREA</span><h1>Oficina LOTTUS</h1><p>Personas e inteligencia, en un mismo lugar.</p></div>
            <div className="of-cabecera__acciones">
                {usaIA&&<button type="button" className="of-boton of-boton--academia" onClick={abrirAcademia}><FaGraduationCap/>Academia</button>}
                {usaIA&&<button type="button" className="of-boton" onClick={()=>setPanel({})}><FaCalendarAlt/>Automatizaciones{programaQ.data?.pendientes?.length>0&&<b className="of-novedades">{programaQ.data.pendientes.length}</b>}</button>}
                {usaIA&&<button type="button" className="of-boton" onClick={()=>{setOperacion(null);setVerEjecuciones(true);}}><FaTasks/>Ejecuciones de {ejecutor}</button>}
                {usaIA&&<Link className="of-boton" to="/IA/general?equipo=1" title="Lo que se dicen IA Lottus y los agentes"><FaUsers/>Chats del equipo</Link>}
                {coordinacionQ.data?.puede_informar&&<button className="of-boton" onClick={()=>setVerInformes(true)}><FaTasks/>Informe de áreas{coordinacionQ.data.informes?.[0]?.estado==='ejecutando'&&<i className="of-punto is-activa"/>}</button>}
                {gestionar && <Link className="of-boton" to="/IA/configuracion"><FaSlidersH />Gestionar agentes</Link>}
                {usaIA&&<Link className="of-boton of-boton--principal" to="/IA/general" onClick={general}><FaComments />Chat general<FaArrowRight /></Link>}
                {(equipo?.participa||equipo?.puede_gestionar)&&<button className="of-boton" onClick={()=>abrirPersona(null)} title="Mensajes y trabajos del equipo"><FaTasks/>Bandeja{(equipo.mis_pendientes+equipo.mensajes_sin_leer)>0&&<b className="of-novedades">{equipo.mis_pendientes+equipo.mensajes_sin_leer}</b>}</button>}
                {equipo?.puede_gestionar&&<button className="of-boton of-gestion-personas" onClick={()=>setEditarEquipo(true)} aria-label="Elegir personas de la oficina" title="Elegir personas"><FaUserPlus/></button>}
                <Link className="of-boton" to="/perfil" aria-label="Mi perfil" title="Mi perfil"><FaUser/></Link>
            </div>
        </header>
        {errorCarga ? <div role="alert" className="of-error">{fallo(errorCarga)} <button type="button" onClick={recargar}>Reintentar</button></div> : cargar ? <div className="of-cargando" role="status">Preparando tu oficina…</div> : <>
            {estado && !estado.configurado && <p className="of-error" role="status">La oficina está lista. Configura la conexión de IA en el servidor para que los agentes puedan responder.</p>}
            <div className="of-toolbar">
                <div className="of-zonas" aria-label="Zonas de la oficina"><button aria-pressed={!zona} className={!zona?'is-elegida':''} onClick={()=>setZona('')} type="button">Toda la oficina</button>{zonas.map(z=><button key={z.id} aria-pressed={zona===String(z.id)} className={zona===String(z.id)?'is-elegida':''} onClick={()=>elegirZona(String(z.id))} type="button">{z.nombre}<span>{ocupantes.filter(a=>a.zona===z.id).length}</span></button>)}</div>
                <div className="of-vistas" aria-label="Vista de la oficina"><button type="button" aria-pressed={modo==='mapa'} onClick={()=>setModo('mapa')} title="Ver oficina"><FaMap />Oficina</button><button type="button" aria-pressed={modo==='equipo'} onClick={()=>setModo('equipo')} title="Ver equipo"><FaList />Equipo</button></div>
            </div>
            {modo==='mapa' && <section className="of-lienzo">
                <div className="of-lienzo__cabecera"><span><i className="of-punto" />{agentes.length} {agentes.length===1?'agente':'agentes'} {personas.length>0&&` · ${personas.length} ${personas.length===1?'persona':'personas'}`} · {zonas.length} áreas</span><span className="of-lienzo__ayuda">Acércate a un puesto para ver su actividad · Clic para conversar</span><div className="of-zoom"><button type="button" aria-label="Alejar mapa" disabled={zoom<=.6} onClick={()=>setZoom(z=>Math.max(.6,+(z-.1).toFixed(2)))}><FaMinus/></button><span>{Math.round(zoom*100)} %</span><button type="button" aria-label="Acercar mapa" disabled={zoom>=1.4} onClick={()=>setZoom(z=>Math.min(1.4,+(z+.1).toFixed(2)))}><FaPlus/></button><button type="button" onClick={()=>setZoom(Math.max(.6,Math.min(1,(plano.current?.clientWidth||1500)/1500)))}>Vista general</button></div></div>
                <div className="of-pan" ref={plano} style={{'--of-zoom':zoom}} onPointerDown={iniciarArrastre} onPointerMove={e=>{if(arrastre.current)e.currentTarget.scrollLeft=arrastre.current.left+arrastre.current.x-e.clientX;}} onPointerUp={()=>{arrastre.current=null;}} onPointerCancel={()=>{arrastre.current=null;}} onLostPointerCapture={()=>{arrastre.current=null;}}>
                    <EscenaOficina zonas={zonasMapa} agentes={busqueda?ocupantesVisibles:ocupantes} onPersona={abrirPersona} yo={equipo?.yo.id} mensajesSinLeer={equipo?.mensajes_sin_leer||0} vuelos={vuelos} eventos={eventos} zoom={zoom} actividad={actividad} seleccion={zona} paginaPuestos={Math.min(puestos, gruposPuestos - 1)} onAgente={conversar} onZona={elegirZona} onCrear={crear} puedeGestionar={gestionar} programacion={programaQ.data} puedeProgramar={puedeProgramar} onProgramar={programar} onResultado={verResultado} onAcademia={usaIA?abrirAcademia:undefined}/>
                </div>
                <div className="of-explorar"><span>Arrastra el plano o desliza para recorrer la oficina</span><div><button type="button" aria-label="Explorar hacia la izquierda" onClick={()=>plano.current?.scrollBy?.({left:-380,behavior:desplazamiento()})}>←</button><button type="button" aria-label="Explorar hacia la derecha" onClick={()=>plano.current?.scrollBy?.({left:380,behavior:desplazamiento()})}>→</button></div></div>
                <div className="of-lienzo__pie"><span>LOTTUS · Estudio virtual</span>{gruposPuestos>1 && <div><button type="button" disabled={puestos===0} onClick={()=>setPuestos(p=>p-1)} aria-label="Puestos anteriores">←</button><span>Puestos {Math.min(puestos+1,gruposPuestos)} de {gruposPuestos}</span><button type="button" disabled={puestos>=gruposPuestos-1} onClick={()=>setPuestos(p=>p+1)} aria-label="Más puestos">→</button></div>}{paginas>1 && <div><button type="button" disabled={pagina===0} aria-label="Zonas anteriores" onClick={()=>setPagina(p=>p-1)}>←</button><span>Espacio {pagina+1} de {paginas}</span><button type="button" disabled={pagina>=paginas-1} aria-label="Más zonas" onClick={()=>setPagina(p=>p+1)}>→</button></div>}<span><i className="of-punto" /> Listo <i className="of-punto is-activa" /> Respondiendo</span></div>
            </section>}
            <div className="of-busqueda-equipo"><label className="of-buscar"><FaSearch/><input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar personas o agentes…" aria-label="Buscar en la oficina"/></label></div>
            {(equipo?.participa||equipo?.puede_gestionar)&&<EquipoHumano estado={equipo} personas={personasVisibles} zonas={zonas} onAbrir={abrirPersona} onGestionar={()=>setEditarEquipo(true)}/>}
            {usaIA&&<section className="of-equipo" aria-labelledby="of-equipo-titulo">
                <div className="of-equipo__cabecera"><div><span className="of-eyebrow">DIRECTORIO DE AGENTES</span><h2 id="of-equipo-titulo">{zona?zonas.find(z=>String(z.id)===zona)?.nombre:'Tu equipo de IA'}</h2></div>{gestionar && <button className="of-boton" type="button" onClick={()=>crear(zona)}><FaPlus />Crear agente</button>}</div>
                {error && <p className="of-error" role="alert">{error}</p>}
                <div className="of-tarjetas">
                    {visibles.map(a=>{
                        const propias=conversaciones.filter(c=>(c.perfil?.id??null)===a.id);
                        const ultima=propias[0];
                        return <article key={a.id??'general'} className={`of-agente-tarjeta${actividad.has(a.id)?' is-activa':''}`}>
                            <button className="of-agente-abrir" type="button" onClick={()=>conversar(a)}>
                                <div className="of-agente-identidad"><AvatarPerfil perfil={a} tamano={40} /><span className="of-etiqueta"><i className={`of-punto${actividad.has(a.id)?' is-activa':''}`} />{actividad.has(a.id)?'Respondiendo':!a.id?'Asistente general':'Listo para conversar'}</span><FaArrowRight className="of-ir" /></div>
                                <h3>{a.nombre}</h3><p>{a.id?a.rol:'Una visión completa de LOTTUS para conectar las ideas de todas las áreas.'}</p>
                                <span className="of-ultima">{ultima?`${propias.length} ${propias.length===1?'conversación':'conversaciones'} · ${fecha(ultima.actualizada)}`:'Tu primera conversación empieza aquí'}</span>
                            </button>
                            <div className="of-agente-ubicacion">{gestionar && a.id?<label><span className="sr-only">Zona de {a.nombre}</span><select value={a.zona||''} disabled={ubicando===a.id} onChange={e=>ubicar(a,e.target.value)}><option value="">Sin zona asignada</option>{zonas.map(z=><option key={z.id} value={z.id}>{z.nombre}</option>)}</select></label>:<span>{zonas.find(z=>z.id===a.zona)?.nombre||'Sin zona asignada'}</span>}{gestionar && a.id && <Link to={`/IA/configuracion?perfil=${a.id}`} aria-label={`Editar ${a.nombre}`} title="Editar agente"><FaPen /></Link>}</div>
                            <div className="of-agente-herramientas"><button type="button" onClick={()=>setInspector(a)} aria-label={`Actividad de ${a.nombre}`}><FaInfoCircle/>Actividad{actividadAgente(programaQ.data,a).pendientes.length>0&&<b className="of-novedades">{actividadAgente(programaQ.data,a).pendientes.length}</b>}</button><button type="button" onClick={()=>programar(a)} aria-label={`Automatizaciones de ${a.nombre}`}><FaCalendarAlt/>Tareas<span>{actividadAgente(programaQ.data,a).tareas.length}</span></button></div>
                        </article>;
                    })}
                    {gestionar && !busqueda && <button type="button" className="of-crear-tarjeta" onClick={()=>crear(zona)}><Personaje color="#a48d66" /><span><FaPlus />Incorporar un agente</span><small>Define su especialidad, sus instrucciones y su lugar en la oficina.</small></button>}
                </div>
                {!visibles.length && <p className="of-sin-resultados">{busqueda?'No hay agentes que coincidan con tu búsqueda.':'Esta zona aún no tiene agentes. Puedes crear uno o ubicar un perfil existente.'}</p>}
                {convQ.isError && <p role="alert" className="of-error">No se pudo consultar la actividad ni el historial. <button type="button" onClick={()=>convQ.refetch()}>Reintentar</button></p>}
                {programaQ.isError && <p role="alert" className="of-error">No se pudo consultar la programación de agentes. <button type="button" onClick={()=>programaQ.refetch()}>Reintentar</button></p>}
            </section>}
            {usaIA&&<section className="of-abajo"><Link to="/IA/general" className="of-general" onClick={general}><span className="of-general__icono"><FaComments /></span><div><strong>Todas tus conversaciones</strong><p>Consulta el historial general y las respuestas en curso de todos tus agentes.</p></div><span>Abrir historial<FaArrowRight /></span></Link><Link to="/IA/general?equipo=1" className="of-general of-general--equipo"><span className="of-general__icono"><FaUsers /></span><div><strong>Chats del equipo IA</strong><p>Mira cómo IA Lottus le encarga los cambios a {ejecutor}, lo que se responden y lo que aprenden de cada tarea.</p></div><span>Ver chats<FaArrowRight /></span></Link>{gestionar && <div className="of-config-zonas"><strong>Organizar la oficina</strong><p>Edita las zonas y asigna un espacio a cada especialidad.</p><div>{zonas.map(z=><button key={z.id} type="button" onClick={()=>setEditZona(z)} title={`Editar zona ${z.nombre}`}>{z.nombre}<FaPen /></button>)}{zonas.length<12 && <button type="button" onClick={()=>setEditZona({})}><FaPlus />Nueva zona</button>}</div></div>}</section>}
        </>}
        {verInformes&&coordinacionQ.data?.puede_informar&&<InformesAreas coordinacion={coordinacionQ.data} zonas={zonas} perfiles={perfiles} modelos={estado?.modelos||[]} informeInicial={informe} onInforme={id=>setInforme(id)} onCerrar={()=>{setVerInformes(false);setInforme(null);if(parametros.has('informe')){const p=new URLSearchParams(parametros);p.delete('informe');setParametros(p,{replace:true});}}}/>}
        {coordinacionQ.isError&&<p role="alert" className="of-error">No se pudo consultar la coordinación de áreas. <button onClick={()=>coordinacionQ.refetch()}>Reintentar</button></p>}
        {eventosQ.isError&&<p role="status" className="of-error">No se pudo actualizar la actividad de los recorridos. <button onClick={()=>eventosQ.refetch()}>Reintentar</button></p>}
        {editarEquipo&&<EditorEquipo zonas={zonas} onCerrar={()=>setEditarEquipo(false)} onGuardado={recargar}/>}
        {colaboracion&&equipo&&<PanelColaboracion estado={equipo} persona={colaboracion.persona} trabajoInicial={colaboracion.trabajoId} onCambiar={abrirPersona} onCerrar={cerrarBandeja} borradores={borradoresHumanos} onEnviado={destino=>destino&&volar(equipo.yo.id,destino)}/>}
        {aviso&&!colaboracion&&<div className="of-aviso-mensaje" role="status"><span className="of-aviso-mensaje__icono"><FaEnvelope/></span><div><strong>{aviso.titulo}</strong><small>{aviso.detalle}</small></div>
            <button type="button" className="of-aviso-mensaje__abrir" onClick={()=>{if(aviso.informe){setInforme(aviso.informe);setVerInformes(true);}else abrirPersona(aviso.persona);setAviso(null);}}>Abrir</button>
            <button type="button" className="of-aviso-mensaje__cerrar" aria-label="Cerrar aviso" onClick={()=>setAviso(null)}><FaTimes/></button></div>}
        {editZona && <EditorZona key={editZona.id||'nueva'} zona={editZona.id?editZona:null} onCerrar={()=>setEditZona(null)} onGuardar={recargar} />}
        {inspector&&<Modal open title={`Actividad de ${inspector.nombre}`} onClose={()=>setInspector(null)} size="sm"><div className="of-ficha of-ficha--modal"><ContenidoFicha agente={inspector} zonaNombre={zonas.find(z=>z.id===inspector.zona)?.nombre} info={actividadAgente(programaQ.data,inspector)} trabajando={actividad.has(inspector.id)} puedeProgramar={puedeProgramar} onConversar={a=>{setInspector(null);conversar(a);}} onProgramar={programar} onResultado={verResultado}/></div></Modal>}
        {panel!==null&&<AutomatizacionesIA {...panel} agentes={agentes} modelos={estado?.modelos?.map(m=>typeof m==='string'?m:m.id)||[]} puedeProgramar={puedeProgramar} onCerrar={()=>setPanel(null)} onResultado={abrirResultado}/>}
        {usaIA&&<AcademiaIA open={verAcademia} agentes={agentes} cursoInicial={Number(parametros.get('curso'))||null} puedeProgramar={puedeProgramar} onConversar={conversar} onCerrar={cerrarAcademia} onProgramar={datos=>{cerrarAcademia();setPanel(datos);}}/>}
        {verEjecuciones&&usaIA&&<Modal open title={operacion?`Ejecución de ${ejecutor}`:`Ejecuciones de ${ejecutor}`} size="lg" onClose={()=>{setVerEjecuciones(false);setOperacion(null);const p=new URLSearchParams(parametros);p.delete('operacion');setParametros(p,{replace:true});}}>
            {operacion?<><button className="of-boton" onClick={()=>setOperacion(null)}>Ver todas las ejecuciones</button><EjecucionAgente id={operacion}/></>:<EjecucionesAgente onAbrir={setOperacion}/>}
        </Modal>}
    </div>;
}
