import React, { useCallback, useEffect, useRef, useState } from 'react';
import {Link} from 'react-router-dom';
import { FaArrowLeft, FaBars, FaComments, FaExpandAlt, FaChartLine, FaGraduationCap, FaPaperPlane, FaPlus, FaRobot, FaSlidersH, FaTasks, FaTrashAlt, FaUsers } from 'react-icons/fa';
import API from '../services/api';
import Markdown from '../components/chat/Markdown';
import GraficoDatos from '../components/chat/GraficoDatos';
import AvatarPerfil from '../components/chat/AvatarPerfil';
import Retroalimentacion from '../components/chat/Retroalimentacion';
import AprendizajesIA from '../components/chat/AprendizajesIA';
import PerfilesIA from '../components/chat/PerfilesIA';
import EjecucionAgente from '../components/oficina/EjecucionAgente';
import { HiloEquipo, ListaHilos, SinHilo } from '../components/chat/ChatsEquipo';
import useHilosEquipo from '../components/chat/useHilosEquipo';
import { GENERAL, sugerenciasPerfil } from '../components/chat/catalogoIA';
import './ChatPage.css';

/*
 * Chat: asesor gerencial con IA (Gemini) que consulta los datos vivos de la plataforma.
 * La respuesta se prepara en el servidor en segundo plano: aquí se consulta el mensaje
 * hasta que queda listo, mostrando qué datos está revisando.
 * Perfiles de IA: agentes especializados (rol, instrucciones, áreas de datos, documentos).
 * Cada respuesta se puede valorar (👍/👎) o usar para enseñarle algo: la IA lo aplica en
 * las siguientes respuestas de ese perfil.
 */

const SUGERENCIAS = [
    '¿Cómo vamos este período comercial frente al anterior?',
    'Muéstrame un gráfico de ventas por asesor y dime quién necesita apoyo.',
    '¿Qué pedidos a proveedores están más atrasados y a quién llamo primero?',
    '¿Cuánto tenemos por cobrar y dónde está el mayor riesgo?',
    'Grafica la tendencia de ventas y recomienda 3 acciones para crecer.',
    '¿Cómo está el flujo de caja y qué pagos a proveedores vienen?',
];
const INTERVALO = 1500;

const mensajeError = (e) => e.response?.data?.error || e.response?.data?.detail || 'No se pudo conectar con el servidor.';

function Pensando({ consultas }) {
    return (
        <div className="chat-pensando" role="status">
            <span className="chat-puntos" aria-hidden="true"><i /><i /><i /></span>
            <span>{consultas?.length ? `Revisando: ${consultas[consultas.length - 1]}` : 'Analizando tu pregunta…'}</span>
            {consultas?.length > 1 && <small>{consultas.length} consultas a los datos</small>}
        </div>
    );
}

function Mensaje({ m, reintentar, consultar, agente, actualizar }) {
    const [copiado, setCopiado] = useState(false);
    if (m.rol === 'usuario') return <div className="chat-msg chat-msg--usuario"><p>{m.texto}</p></div>;
    const copiar = () => { navigator.clipboard?.writeText(m.texto).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); }).catch(() => {}); };
    return (
        <div className="chat-msg chat-msg--asistente">
            <AvatarPerfil perfil={agente} tamano={30} />
            <div className="chat-msg__cuerpo">
                {m.trabajo_agente&&<EjecucionAgente id={m.trabajo_agente.id} inicial={m.trabajo_agente} compacto/>}
                {m.informe_areas&&<Link className="of-boton" to={`/IA?informe=${m.informe_areas.id}`}><FaChartLine/>Abrir informe de áreas · {m.informe_areas.etapa}</Link>}
                {m.curso_academia&&<Link className="chat-curso" to={`/IA?curso=${m.curso_academia.id}`}><FaGraduationCap/><span><strong>{m.curso_academia.titulo}</strong><small>{m.curso_academia.detalle}</small><b>Abrir en la Academia →</b></span></Link>}
                {m.trabajo_oficina&&<Link className="chat-curso chat-trabajo-accion" to={`/IA?trabajo=${m.trabajo_oficina.id}`}><FaTasks/><span><strong>Tarea asignada a {m.trabajo_oficina.responsable?.nombre || 'equipo'}</strong><small>{m.trabajo_oficina.titulo}</small><b>Ver en la Bandeja de Trabajos →</b></span></Link>}
                {m.estado === 'procesando' && !m.trabajo_agente && <Pensando consultas={m.consultas} />}
                {m.estado === 'sin_conexion' && <div className="chat-error" role="alert">
                    No se pudo consultar la respuesta. El servidor puede seguir trabajando.
                    <button type="button" onClick={consultar}>Consultar respuesta</button>
                </div>}
                {m.estado === 'error' && !m.trabajo_agente && (
                    <div className="chat-error" role="alert">{m.error || 'No se pudo responder.'}
                        {reintentar && <button type="button" onClick={reintentar}>Volver a preguntar</button>}
                    </div>
                )}
                {m.estado === 'listo' && <>
                    <Markdown texto={m.texto} />
                    {(m.graficos || []).map((g, i) => <GraficoDatos key={`${g.consulta_id}-${i}`} grafico={g} />)}
                    {(m.modelo || !!m.consultas?.length) && <div className="chat-msg__pie">
                        {!!m.consultas?.length && <span className="chat-consultas" title="Datos consultados para esta respuesta"><FaChartLine aria-hidden="true" /> {[...new Set(m.consultas)].join(' · ')}</span>}
                        {m.modelo && <span className="chat-modelo-usado">{m.modelo}</span>}
                    </div>}
                    {typeof m.id === 'number'
                        ? <Retroalimentacion m={m} agente={agente.nombre} onActualizado={actualizar} onCopiar={copiar} copiado={copiado} />
                        : <button type="button" className="chat-copiar" onClick={copiar}>{copiado ? 'Copiado' : 'Copiar'}</button>}
                </>}
            </div>
        </div>
    );
}

export default function ChatPage({ perfilInicial = null, conversacionInicial = null, hiloInicial = null, integrado = false, borradorInicial = '', onBorrador, onConversacion, onVolver, onAbrirPantalla, volverTexto = 'La oficina' }) {
    const [estado, setEstado] = useState(null);
    const [modelo, setModelo] = useState('');
    const [conversaciones, setConversaciones] = useState([]);
    const [actual, setActual] = useState(null);
    const [cargandoConversacion,setCargandoConversacion]=useState(!!conversacionInicial);
    const conversacionAbriendo=useRef(conversacionInicial);
    const [hayMas, setHayMas] = useState(false);
    const [masCargando, setMasCargando] = useState(false);
    const cantidadCargada = useRef(0);
    const [mensajes, setMensajes] = useState([]);
    const [texto, setTexto] = useState(borradorInicial);
    const [error, setError] = useState('');
    const [verLista, setVerLista] = useState(false);
    const [perfiles, setPerfiles] = useState([]);
    const [perfilNuevo, setPerfilNuevo] = useState(perfilInicial);
    const [perfilesCargados, setPerfilesCargados] = useState(false);
    const inicialAbierta = useRef(false);
    const [perfilConv, setPerfilConv] = useState(null);
    const [vistaPerfiles, setVistaPerfiles] = useState(null); // null = chat; id o 'nuevo' = administrador
    const [verAprendido, setVerAprendido] = useState(false);
    // «Mis chats» (conversaciones del usuario) o «Equipo IA» (lo que se dicen los agentes).
    const [pestana, setPestana] = useState(hiloInicial ? 'equipo' : 'chats');
    const [hilo, setHilo] = useState(hiloInicial && hiloInicial.includes('~') ? hiloInicial : null);
    const equipo = useHilosEquipo(true, perfilInicial);
    const hilosActivos = (equipo.hilos || []).filter(h => h.activo).length;
    const final = useRef(null);
    const contenedorMensajes = useRef(null);
    const sondeo = useRef(null);
    const entrada = useRef(null);
    const vista = useRef(0);
    const ocupado = mensajes.some(m => ['procesando', 'sin_conexion'].includes(m.estado));
    const activos = perfiles.filter(p => p.activo);
    // Si el administrador ocultó la IA general para este rol, se empieza con su primer agente.
    const generalVisible = estado?.general?.visible !== false;
    const agente = actual ? (perfilConv ? { ...perfiles.find(p => p.id === perfilConv.id), ...perfilConv } : GENERAL) : (perfiles.find(p => p.id === perfilNuevo) || (generalVisible ? GENERAL : activos[0] || GENERAL));
    const puedeGestionar = !!estado?.puede_gestionar_perfiles;

    // Los chats de trabajo del ejecutor se ven en «Equipo IA», en el hilo con quien le encargó la tarea.
    const cargarConversaciones = useCallback(() => API.get('/asistente/conversaciones/', { params: { sin_ejecuciones: '1', ...(perfilInicial !== null ? { perfil: perfilInicial } : {}) } }).then(r => { const datos = Array.isArray(r.data) ? r.data : []; setConversaciones(cs => cantidadCargada.current > 100 ? [...datos, ...cs.filter(c => !datos.some(d => d.id === c.id))] : datos); if (cantidadCargada.current <= 100) { setHayMas(datos.length === 100); cantidadCargada.current = datos.length; } }).catch(e => setError(mensajeError(e))), [perfilInicial]);
    const cargarPerfiles = useCallback(() => API.get('/asistente/perfiles/').then(r => { setPerfiles(Array.isArray(r.data) ? r.data : []); setPerfilesCargados(true); }).catch(e => setError(mensajeError(e))), []);
    useEffect(() => {
        API.get('/asistente/estado/').then(r => setEstado(r.data)).catch(e => setEstado({ configurado: false, error: mensajeError(e) }));
        cargarConversaciones();
        cargarPerfiles();
        const actividad = setInterval(cargarConversaciones, 10000);
        return () => { clearInterval(actividad); clearTimeout(sondeo.current); vista.current += 1; };
    }, [cargarConversaciones, cargarPerfiles]);
    useEffect(() => { const elemento=contenedorMensajes.current; elemento?.scrollTo?.({top:elemento.scrollHeight,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); }, [mensajes]);
    useEffect(()=>{onBorrador?.(texto);},[texto,onBorrador]);
    useEffect(()=>{if(actual)onConversacion?.(actual);},[actual,onConversacion]);
    useEffect(()=>{if(integrado&&perfilesCargados)entrada.current?.focus({preventScroll:true});},[integrado,perfilesCargados]);
    useEffect(()=>{
        if(!verLista)return;
        const cerrar=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();setVerLista(false);}};
        document.addEventListener('keydown',cerrar,true);
        return ()=>document.removeEventListener('keydown',cerrar,true);
    },[verLista]);

    // Consulta el mensaje del asistente hasta que deja de estar 'procesando'.
    const seguir = useCallback((id, fallos = 0, version = vista.current) => {
        clearTimeout(sondeo.current);
        sondeo.current = setTimeout(() => {
            API.get(`/asistente/mensajes/${id}/`).then(r => {
                if (vista.current !== version) return;
                setMensajes(ms => ms.map(m => (m.id === id ? r.data : m)));
                if (r.data.estado === 'procesando') seguir(id, 0, version); else cargarConversaciones();
            }).catch(() => {
                if (vista.current !== version) return;
                if (fallos < 2) seguir(id, fallos + 1, version);
                else setMensajes(ms => ms.map(m => m.id === id ? { ...m, estado: 'sin_conexion' } : m));
            });
        }, INTERVALO);
    }, [cargarConversaciones]);

    const abrir = useCallback(async (id,cerrarLista=true) => {
        clearTimeout(sondeo.current);
        const version = ++vista.current;
        inicialAbierta.current=true;
        conversacionAbriendo.current=id;
        if(cerrarLista)setVerLista(false);
        setPestana('chats');
        setError(''); setCargandoConversacion(true);
        try {
            const r = await API.get(`/asistente/conversaciones/${id}/`);
            if (version !== vista.current) return;
            if (perfilInicial !== null && r.data.perfil?.id !== perfilInicial) { setError('Esta conversación pertenece a otro agente. Ábrela desde el chat general.'); return; }
            setActual(id); setMensajes(r.data.mensajes); setPerfilConv(r.data.perfil || null);
            const pendiente = r.data.mensajes.find(m => m.estado === 'procesando');
            if (pendiente) seguir(pendiente.id);
        } catch (e) { if(version===vista.current)setError(mensajeError(e)); }
        finally { if(version===vista.current)setCargandoConversacion(false); }
    }, [perfilInicial, seguir]);
    useEffect(() => {
        if (!inicialAbierta.current && conversacionInicial && perfilesCargados) {
            inicialAbierta.current = true; abrir(conversacionInicial,false);
        }
    }, [conversacionInicial, perfilesCargados, abrir]);
    const nueva = () => { clearTimeout(sondeo.current); vista.current += 1; setPestana('chats'); setActual(null); onConversacion?.(null); setCargandoConversacion(false); setPerfilConv(null); setMensajes([]); setError(''); setVerLista(false); entrada.current?.focus(); };
    const abrirPerfiles = (inicial) => { setVerLista(false); setVistaPerfiles(inicial ?? (agente.id || perfiles[0]?.id || 'nuevo')); };
    const conversarCon = (perfil) => { setVistaPerfiles(null); nueva(); setPerfilNuevo(perfil.id); };
    const abrirHilo = (clave) => { setVistaPerfiles(null); setPestana('equipo'); setHilo(clave); setVerLista(false); };
    // Al entrar a «Equipo IA» sin hilo elegido, se abre el más reciente.
    useEffect(() => { if (pestana === 'equipo' && !hilo && equipo.hilos?.length) setHilo(equipo.hilos[0].clave); }, [pestana, hilo, equipo.hilos]);
    const actualizarMensaje = (dato) => setMensajes(ms => ms.map(m => (m.id === dato.id ? { ...m, ...dato } : m)));
    const cargarMas = async () => {
        setMasCargando(true);
        try {
            const r = await API.get('/asistente/conversaciones/', { params: { offset: cantidadCargada.current, sin_ejecuciones: '1', ...(perfilInicial !== null ? { perfil: perfilInicial } : {}) } });
            setConversaciones(cs => [...cs, ...r.data.filter(c => !cs.some(x => x.id === c.id))]);
            cantidadCargada.current += r.data.length; setHayMas(r.data.length === 100);
        } catch (e) { setError(mensajeError(e)); } finally { setMasCargando(false); }
    };
    const borrar = async (id) => {
        if (!window.confirm('¿Borrar esta conversación?')) return;
        try { await API.delete(`/asistente/conversaciones/${id}/`); if (id === actual) nueva(); cargarConversaciones(); } catch (e) { setError(mensajeError(e)); }
    };

    const enviar = async (pregunta) => {
        const t = (pregunta ?? texto).trim();
        if (!t || ocupado || cargandoConversacion || (perfilInicial !== null && (!perfilesCargados || !agente.id || !agente.activo))) return;
        const version = vista.current;
        setError(''); setTexto('');
        const temporal = { id: `t${Date.now()}`, rol: 'usuario', texto: t, estado: 'listo' };
        const espera = { id: `e${Date.now()}`, rol: 'asistente', texto: '', estado: 'procesando', consultas: [] };
        setMensajes(ms => [...ms, temporal, espera]);
        try {
            const r = await API.post('/asistente/preguntar/', { texto: t, conversacion: actual, ...(modelo ? { modelo } : {}),
                ...(!actual && agente.id ? { perfil: agente.id } : {}) });
            if (version !== vista.current) { cargarConversaciones(); return; }
            setActual(r.data.conversacion.id);
            if (!actual) setPerfilConv(r.data.conversacion.perfil || null);
            setMensajes(ms => ms.map(m => (m.id === temporal.id ? r.data.pregunta : m.id === espera.id ? r.data.respuesta : m)));
            if (r.data.respuesta.estado === 'procesando') seguir(r.data.respuesta.id); else cargarConversaciones();
            if (!actual) cargarConversaciones();
        } catch (e) {
            if (version !== vista.current) return;
            setMensajes(ms => ms.filter(m => m.id !== temporal.id && m.id !== espera.id));
            setTexto(t); setError(mensajeError(e));
        }
    };
    const reintentarUltima = () => {
        const ultima = [...mensajes].reverse().find(m => m.rol === 'usuario');
        if (ultima) enviar(ultima.texto);
    };
    const alTeclear = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } };

    const volver=integrado?<button type="button" className="chat-oficina-volver" onClick={onVolver}><FaArrowLeft/> {volverTexto}</button>:<a className="chat-oficina-volver" href="#/IA"><FaArrowLeft/> La oficina</a>;
    const clase=`chat-page${integrado?' chat-page--integrado':''}`;
    if (estado && !estado.configurado) {
        return (
            <div className={`ds-page ${clase}`}>
                {volver}
                <div className="chat-vacio"><FaRobot /><h2>El asistente no está disponible</h2>
                    <p>{estado.error || 'Falta configurar la clave de Gemini en el servidor (GEMINI_API_KEY).'}</p></div>
            </div>
        );
    }

    if (perfilInicial !== null && !perfilesCargados) {
        return <div className={`ds-page ${integrado?'chat-page--integrado':''}`}>{volver}
            {error ? <p className="chat-error" role="alert">{error}<button type="button" onClick={cargarPerfiles}>Reintentar</button></p> : <p role="status">Cargando el agente…</p>}</div>;
    }
    if (perfilInicial !== null && perfilesCargados && !perfiles.some(p => p.id === perfilInicial)) {
        return <div className={`ds-page ${integrado?'chat-page--integrado':''}`}>{volver}<p role="alert">Este agente ya no está disponible. Elige otro en la oficina.</p></div>;
    }
    const sugerencias = agente.id ? sugerenciasPerfil(agente) : SUGERENCIAS;
    return (
        <div className={clase}>
            <aside className={`chat-lista${verLista ? ' is-abierta' : ''}`} aria-label="Conversaciones" {...(integrado&&!verLista?{inert:'','aria-hidden':true}:{})}>
                {volver}
                <h2 className="chat-historial-titulo">{perfilInicial !== null ? `Historial de ${agente.nombre}` : 'Historial general'}</h2>
                {perfilInicial === null && <p className="chat-historial-ayuda">Todas tus conversaciones y agentes.</p>}
                <div className="chat-pestanas" role="tablist" aria-label="Tipo de conversación">
                    <button type="button" role="tab" aria-selected={pestana === 'chats'} onClick={() => { setVistaPerfiles(null); setPestana('chats'); }}><FaComments aria-hidden="true" /> Mis chats</button>
                    <button type="button" role="tab" aria-selected={pestana === 'equipo'} onClick={() => { setVistaPerfiles(null); setPestana('equipo'); }}><FaUsers aria-hidden="true" /> Equipo IA{hilosActivos > 0 && <b aria-label={`${hilosActivos} trabajando`}>{hilosActivos}</b>}</button>
                </div>
                {pestana === 'equipo' ? <ListaHilos hilos={equipo.hilos} error={equipo.error} actual={hilo} onAbrir={abrirHilo} /> : <>
                <button type="button" className="chat-nueva" onClick={() => { setVistaPerfiles(null); nueva(); }}><FaPlus aria-hidden="true" /> Nueva conversación</button>
                <ul>
                    {conversaciones.map(c => (
                        <li key={c.id} className={c.id === actual && !vistaPerfiles ? 'is-actual' : ''}>
                            <AvatarPerfil perfil={c.perfil || GENERAL} tamano={20} className="chat-lista__avatar" />
                            <button type="button" className="chat-lista__item" onClick={() => { setVistaPerfiles(null); abrir(c.id); }}
                                title={c.perfil ? `${c.titulo} · ${c.perfil.nombre}` : c.titulo}>{c.activa && <i className="chat-actividad" aria-label="Respuesta en curso" />}{c.titulo}</button>
                            <button type="button" className="chat-lista__borrar" aria-label={`Borrar ${c.titulo}`} onClick={() => borrar(c.id)}><FaTrashAlt /></button>
                        </li>
                    ))}
                    {!conversaciones.length && <li className="chat-lista__vacia">Aún no hay conversaciones.</li>}
                </ul>
                {hayMas && <button type="button" className="chat-accion" disabled={masCargando} onClick={cargarMas}>{masCargando ? 'Cargando…' : 'Más conversaciones'}</button>}
                </>}
                {puedeGestionar && perfilInicial !== null && <a className="chat-oficina-volver" href={`#/IA/configuracion?perfil=${perfilInicial}`}><FaSlidersH /> Gestionar este agente</a>}
                {puedeGestionar && perfilInicial === null && (
                    <button type="button" className={`chat-lista__perfiles${vistaPerfiles ? ' is-actual' : ''}`} onClick={() => abrirPerfiles()}>
                        <FaSlidersH aria-hidden="true" /> Perfiles de IA
                        {perfiles.length > 0 && <span>{perfiles.length}</span>}
                    </button>
                )}
            </aside>
            {verLista && <button type="button" className="chat-velo" onClick={() => setVerLista(false)} aria-label="Cerrar historial" />}

            {vistaPerfiles ? (
                <PerfilesIA estado={estado} perfiles={perfiles} inicial={vistaPerfiles} onRecargar={cargarPerfiles}
                    zonaInicial={estado?.zonas?.find(z => z.ambiente === 'estudio')?.id || estado?.zonas?.[0]?.id || null}
                    onVolver={() => setVistaPerfiles(null)} onProbar={conversarCon} />
            ) : pestana === 'equipo' ? (
                hilo ? <HiloEquipo key={hilo} clave={hilo} onMenu={() => setVerLista(v => !v)} />
                    : <SinHilo hay={!!equipo.hilos?.length} onMenu={() => setVerLista(v => !v)} />
            ) : (
            <section className="chat-panel" aria-label={`Chat con ${agente.nombre}`}>
                <header className="chat-cabecera">
                    <button type="button" className="chat-menu" aria-label="Ver conversaciones" onClick={() => setVerLista(v => !v)}><FaBars /></button>
                    {!integrado&&<a className="chat-oficina-movil" href="#/IA" title="Volver a la oficina"><FaArrowLeft /></a>}
                    <AvatarPerfil perfil={agente} tamano={36} />
                    <div className="chat-cabecera__texto">
                        <h1>{agente.nombre}</h1>
                        <small>{agente.id ? agente.rol : 'Analiza los datos actualizados de Lottus y te aconseja para decidir'}</small>
                    </div>
                    <div className="chat-cabecera__acciones">
                        {onAbrirPantalla&&<button type="button" className="chat-accion chat-ampliar" aria-label="Abrir chat a pantalla completa" title="Ampliar conversación" onClick={()=>onAbrirPantalla({conversacion:cargandoConversacion?conversacionAbriendo.current:actual,borrador:texto})}><FaExpandAlt/></button>}
                        <button type="button" className="chat-accion" onClick={() => setVerAprendido(true)} title={`Lo que ${agente.nombre} aprendió de ti`}>
                            <FaGraduationCap aria-hidden="true" /> <span>Lo aprendido</span>
                        </button>
                        <label className="chat-modelo-selector">
                            Modelo
                            <select aria-label="Modelo de IA" value={modelo} disabled={ocupado} onChange={e => setModelo(e.target.value)}>
                                <option value="">Automático (con respaldo)</option>
                                {(estado?.modelos || (estado?.modelo ? [{ id: estado.modelo }] : [])).map(m =>
                                    <option key={m.id} value={m.id}>{m.id}{m.aviso ? ' · límite temporal' : ''}</option>)}
                            </select>
                        </label>
                    </div>
                </header>

                <div className="chat-mensajes" ref={contenedorMensajes}>
                    {cargandoConversacion ? <p className="chat-abriendo" role="status">Abriendo conversación…</p> : !mensajes.length ? (
                        <div className="chat-bienvenida">
                            <AvatarPerfil perfil={agente} tamano={52} className="chat-bienvenida__avatar" />
                            <h2>{agente.id ? `Hola, soy ${agente.nombre}` : '¿En qué decisión te ayudo hoy?'}</h2>
                            <p>{agente.id ? agente.rol : 'Pregunta por ventas, asesores, cobros, pedidos, telas, caja, inventario o nómina. Consulto los datos en vivo y te doy conclusiones y recomendaciones.'}</p>
                            {perfilInicial === null && !generalVisible && !activos.length && <p className="chat-error" role="note">Aún no tienes agentes de IA habilitados. Pídele al administrador que te asigne uno.</p>}
                            {perfilInicial === null && (activos.length > 0 || puedeGestionar) && (
                                <div className="chat-agentes">
                                    <span className="chat-agentes__titulo" id="chat-agentes">Habla con</span>
                                    <div role="radiogroup" aria-labelledby="chat-agentes">
                                        {[...(generalVisible ? [GENERAL] : []), ...activos].map(p => (
                                            <button type="button" role="radio" key={p.id ?? 'general'} aria-checked={agente.id === p.id}
                                                className={`chat-agente${agente.id === p.id ? ' is-actual' : ''}`} onClick={() => setPerfilNuevo(p.id)}>
                                                <AvatarPerfil perfil={p} tamano={30} />
                                                <span><strong>{p.nombre}</strong><small>{p.id ? p.rol : 'Todos los datos'}</small></span>
                                            </button>
                                        ))}
                                        {puedeGestionar && (
                                            <button type="button" className="chat-agente chat-agente--crear" onClick={() => abrirPerfiles('nuevo')}>
                                                <span className="chat-agente__mas" aria-hidden="true"><FaPlus /></span>
                                                <span><strong>Crear perfil</strong><small>Un agente a tu medida</small></span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="chat-sugerencias">
                                {sugerencias.map(s => <button type="button" key={s} onClick={() => enviar(s)}>{s}</button>)}
                            </div>
                        </div>
                    ) : mensajes.map((m, i) => <Mensaje key={m.id} m={m} agente={agente} actualizar={actualizarMensaje}
                        consultar={() => { setMensajes(ms => ms.map(x => x.id === m.id ? { ...x, estado: 'procesando' } : x)); seguir(m.id); }}
                        reintentar={i === mensajes.length - 1 ? reintentarUltima : null} />)}
                    <div ref={final} />
                </div>

                {perfilInicial !== null && perfilesCargados && !agente.activo && <p className="chat-error chat-error--global">Este agente está pausado. Puedes consultar su historial.</p>}
                {error && <p className="chat-error chat-error--global" role="alert">{error}</p>}
                <form className="chat-entrada" onSubmit={e => { e.preventDefault(); enviar(); }}>
                    <textarea ref={entrada} rows={1} value={texto} maxLength={4000} placeholder={`Escribe tu pregunta para ${agente.nombre}… (Enter para enviar, Shift+Enter para otra línea)`}
                        aria-label="Pregunta para el asesor" onChange={e => setTexto(e.target.value)} onKeyDown={alTeclear} />
                    <button type="submit" disabled={!texto.trim() || ocupado || cargandoConversacion || (perfilInicial !== null && (!perfilesCargados || !agente.activo))} aria-label="Enviar"><FaPaperPlane /></button>
                </form>
                <p className="chat-aviso">Las respuestas se generan con IA a partir de los datos de la plataforma. Verifica las cifras críticas antes de decidir. Usa 👍 👎 y «Enseñar» para entrenarla a tu gusto.</p>
            </section>
            )}
            {verAprendido && <AprendizajesIA perfil={agente} onCerrar={() => setVerAprendido(false)} />}
        </div>
    );
}
