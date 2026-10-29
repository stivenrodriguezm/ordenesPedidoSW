import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaBars, FaChartLine, FaEllipsisH, FaExpandAlt, FaGraduationCap, FaLightbulb, FaMinus, FaPaperPlane, FaRobot, FaSearch, FaSlidersH, FaTasks, FaTimes } from 'react-icons/fa';
import API from '../services/api';
import Markdown from '../components/chat/Markdown';
import GraficoDatos from '../components/chat/GraficoDatos';
import AvatarPerfil from '../components/chat/AvatarPerfil';
import Retroalimentacion from '../components/chat/Retroalimentacion';
import AprendizajesIA from '../components/chat/AprendizajesIA';
import ArbolChats from '../components/chat/ArbolChats';
import EjecucionAgente from '../components/oficina/EjecucionAgente';
import { HiloEquipo, Pareja } from '../components/chat/ChatsEquipo';
import useHilosEquipo from '../components/chat/useHilosEquipo';
import { GENERAL, claveAgente, sugerenciasPerfil } from '../components/chat/catalogoIA';
import { DetalleTarea, NuevoPedido } from './DesarrolladorPage';
import './ChatPage.css';

/*
 * Chat de IA: asesor gerencial y agentes (Gemini) que consultan los datos vivos de la plataforma.
 * La respuesta se prepara en el servidor en segundo plano: aquí se consulta el mensaje hasta que
 * queda listo, mostrando qué datos está revisando. Cada respuesta se puede valorar (👍/👎) o usar
 * para enseñarle algo al agente.
 *
 * Rediseño 2026-10-29: ventana compacta (estilo mensajes de Instagram en el navegador) con un menú
 * lateral que se muestra u oculta con un clic: cada agente con sus chats debajo (grupos plegables),
 * el Desarrollador con sus pedidos y «Equipo IA» con lo que se dicen los agentes. Todo queda
 * guardado y cada chat se puede borrar.
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
const LATERAL = 'chat-ia:lateral', GRUPOS = 'chat-ia:grupos';

const mensajeError = (e) => e.response?.data?.error || e.response?.data?.detail || 'No se pudo conectar con el servidor.';
// Preferencias de este navegador (menú abierto, grupos desplegados): si no hay almacenamiento, se usan los valores por defecto.
const leer = (clave, defecto) => { try { const v = window.localStorage.getItem(clave); return v === null ? defecto : JSON.parse(v); } catch { return defecto; } };
const guardar = (clave, valor) => { try { window.localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ } };
const esMovil = () => !!window.matchMedia?.('(max-width: 720px)').matches;

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
            <AvatarPerfil perfil={agente} tamano={26} className="chat-msg__avatar" />
            <div className="chat-msg__cuerpo">
                {m.trabajo_agente && <EjecucionAgente id={m.trabajo_agente.id} inicial={m.trabajo_agente} compacto />}
                {m.informe_areas && <Link className="of-boton" to={`/IA?informe=${m.informe_areas.id}`}><FaChartLine />Abrir informe de áreas · {m.informe_areas.etapa}</Link>}
                {m.curso_academia && <Link className="chat-curso" to={`/IA?curso=${m.curso_academia.id}`}><FaGraduationCap /><span><strong>{m.curso_academia.titulo}</strong><small>{m.curso_academia.detalle}</small><b>Abrir en la Academia →</b></span></Link>}
                {m.trabajo_oficina && <Link className="chat-curso chat-trabajo-accion" to={`/IA?trabajo=${m.trabajo_oficina.id}`}><FaTasks /><span><strong>Tarea asignada a {m.trabajo_oficina.responsable?.nombre || 'equipo'}</strong><small>{m.trabajo_oficina.titulo}</small><b>Ver en la Bandeja de Trabajos →</b></span></Link>}
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

export default function ChatPage({ perfilInicial = null, conversacionInicial = null, hiloInicial = null, integrado = false, borradorInicial = '',
    borradores: borradoresExternos, contextos, onVolver, onMinimizar, onAbrirPantalla, etiquetaCerrar = 'Cerrar chat' }) {
    const [estado, setEstado] = useState(null);
    const [modelo, setModelo] = useState('');
    const [conversaciones, setConversaciones] = useState([]);
    const [hayMas, setHayMas] = useState(false);
    const [masCargando, setMasCargando] = useState(false);
    const cantidadCargada = useRef(0);
    const [perfiles, setPerfiles] = useState([]);
    const [perfilesCargados, setPerfilesCargados] = useState(false);
    const [tareas, setTareas] = useState([]);
    const [actual, setActual] = useState(null);
    const [cargandoConversacion, setCargandoConversacion] = useState(!!conversacionInicial);
    const conversacionAbriendo = useRef(conversacionInicial);
    const [mensajes, setMensajes] = useState([]);
    // Borradores por agente: se conservan al pasar de un agente a otro (y en el panel flotante, al navegar).
    const borradoresPropios = useRef({});
    const borradores = borradoresExternos || borradoresPropios;
    const [texto, setTexto] = useState(() => borradorInicial || borradores.current[String(perfilInicial ?? 'general')] || '');
    const [error, setError] = useState('');
    const [perfilNuevo, setPerfilNuevo] = useState(perfilInicial);
    const [perfilConv, setPerfilConv] = useState(null);
    // Qué muestra el panel: un chat, una conversación del equipo IA o un pedido del Desarrollador.
    const [vista, setVista] = useState(hiloInicial && hiloInicial.includes('~') ? { tipo: 'hilo', clave: hiloInicial } : { tipo: 'chat' });
    const [verAprendido, setVerAprendido] = useState(false);
    const [verOpciones, setVerOpciones] = useState(false);
    const [lateral, setLateral] = useState(() => !esMovil() && leer(LATERAL, true) !== false);
    // Grupos desplegados: los que el usuario dejó así; la primera vez, todos los que tienen chats.
    const gruposGuardados = useRef(leer(GRUPOS, null));
    const [expandidos, setExpandidos] = useState(() => new Set([...(gruposGuardados.current || []), String(perfilInicial ?? 'general'), ...(hiloInicial ? ['equipo'] : [])]));
    const [filtro, setFiltro] = useState('');
    const equipo = useHilosEquipo(true);
    const inicialAbierta = useRef(false);
    const contenedorMensajes = useRef(null);
    const opciones = useRef(null);
    const sondeo = useRef(null);
    const entrada = useRef(null);
    const turno = useRef(0);

    const ocupado = mensajes.some(m => ['procesando', 'sin_conexion'].includes(m.estado));
    const activos = perfiles.filter(p => p.activo);
    // Si el administrador ocultó la IA general para este rol, se empieza con su primer agente.
    const generalVisible = estado?.general?.visible !== false;
    const agente = actual ? (perfilConv ? { ...perfiles.find(p => p.id === perfilConv.id), ...perfilConv } : GENERAL)
        : (perfiles.find(p => p.id === perfilNuevo) || (generalVisible ? GENERAL : activos.find(p => !p.desarrollador) || GENERAL));
    const claveActual = actual ? claveAgente(perfilConv) : String(perfilNuevo ?? 'general');
    const puedeGestionar = !!estado?.puede_gestionar_perfiles;
    const desarrollador = perfiles.find(p => p.desarrollador && p.activo);
    const agentesArbol = useMemo(() => {
        const conChats = new Set(conversaciones.map(c => claveAgente(c.perfil)));
        return [...(generalVisible || conChats.has('general') ? [GENERAL] : []),
            ...perfiles.filter(p => p.activo || conChats.has(claveAgente(p)))];
    }, [conversaciones, perfiles, generalVisible]);

    const cargarConversaciones = useCallback(() => API.get('/asistente/conversaciones/', { params: { sin_ejecuciones: '1' } }).then(r => {
        const datos = Array.isArray(r.data) ? r.data : [];
        setConversaciones(cs => cantidadCargada.current > 100 ? [...datos, ...cs.filter(c => !datos.some(d => d.id === c.id))] : datos);
        if (cantidadCargada.current <= 100) { setHayMas(datos.length === 100); cantidadCargada.current = datos.length; }
    }).catch(e => setError(mensajeError(e))), []);
    const cargarPerfiles = useCallback(() => API.get('/asistente/perfiles/').then(r => { setPerfiles(Array.isArray(r.data) ? r.data : []); setPerfilesCargados(true); }).catch(e => setError(mensajeError(e))), []);
    const cargarTareas = useCallback(() => API.get('/desarrollador/tareas/').then(r => setTareas(Array.isArray(r.data) ? r.data : [])).catch(() => {}), []);
    useEffect(() => {
        API.get('/asistente/estado/').then(r => setEstado(r.data)).catch(e => setEstado({ configurado: false, error: mensajeError(e) }));
        cargarConversaciones();
        cargarPerfiles();
        const actividad = setInterval(cargarConversaciones, 10000);
        return () => { clearInterval(actividad); clearTimeout(sondeo.current); turno.current += 1; };
    }, [cargarConversaciones, cargarPerfiles]);
    useEffect(() => {
        if (!desarrollador) return undefined;
        cargarTareas();
        const t = setInterval(cargarTareas, 15000);
        return () => clearInterval(t);
    }, [desarrollador, cargarTareas]);
    useEffect(() => { const e = contenedorMensajes.current; e?.scrollTo?.({ top: e.scrollHeight, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [mensajes]);
    useEffect(() => { borradores.current[claveActual] = texto; }, [texto, claveActual, borradores]);
    useEffect(() => { if (actual && contextos) contextos.current[claveActual] = actual; }, [actual, claveActual, contextos]);
    useEffect(() => { if (integrado && perfilesCargados) entrada.current?.focus({ preventScroll: true }); }, [integrado, perfilesCargados]);
    useEffect(() => {
        if (gruposGuardados.current || !conversaciones.length) return;
        gruposGuardados.current = [];
        setExpandidos(s => new Set([...s, ...conversaciones.map(c => claveAgente(c.perfil))]));
    }, [conversaciones]);
    const alternarGrupo = (clave) => setExpandidos(s => {
        const n = new Set(s);
        if (n.has(clave)) n.delete(clave); else n.add(clave);
        gruposGuardados.current = [...n]; guardar(GRUPOS, [...n]);
        return n;
    });
    // Si se entra directo al Desarrollador (desde la oficina), se abre su página de pedidos.
    useEffect(() => {
        if (!inicialAbierta.current && perfilesCargados && perfiles.find(p => p.id === perfilInicial)?.desarrollador) setVista({ tipo: 'dev', id: null });
    }, [perfilesCargados, perfiles, perfilInicial]);
    useEffect(() => {
        if (!verOpciones) return undefined;
        const fuera = (e) => { if (!opciones.current?.contains(e.target)) setVerOpciones(false); };
        const tecla = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); setVerOpciones(false); } };
        document.addEventListener('mousedown', fuera);
        document.addEventListener('keydown', tecla, true);
        return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla, true); };
    }, [verOpciones]);

    const alternarLateral = () => setLateral(v => { if (!esMovil()) guardar(LATERAL, !v); return !v; });
    const cerrarEnMovil = () => { if (esMovil()) setLateral(false); };
    const desplegar = (clave) => setExpandidos(s => (s.has(clave) ? s : new Set([...s, clave])));

    // Consulta el mensaje del asistente hasta que deja de estar 'procesando'.
    const seguir = useCallback((id, fallos = 0, version = turno.current) => {
        clearTimeout(sondeo.current);
        sondeo.current = setTimeout(() => {
            API.get(`/asistente/mensajes/${id}/`).then(r => {
                if (turno.current !== version) return;
                setMensajes(ms => ms.map(m => (m.id === id ? r.data : m)));
                if (r.data.estado === 'procesando') seguir(id, 0, version); else cargarConversaciones();
            }).catch(() => {
                if (turno.current !== version) return;
                if (fallos < 2) seguir(id, fallos + 1, version);
                else setMensajes(ms => ms.map(m => m.id === id ? { ...m, estado: 'sin_conexion' } : m));
            });
        }, INTERVALO);
    }, [cargarConversaciones]);

    const abrir = useCallback(async (id) => {
        clearTimeout(sondeo.current);
        const version = ++turno.current;
        inicialAbierta.current = true;
        conversacionAbriendo.current = id;
        setVista({ tipo: 'chat' }); setVerOpciones(false);
        setError(''); setCargandoConversacion(true);
        try {
            const r = await API.get(`/asistente/conversaciones/${id}/`);
            if (version !== turno.current) return;
            const clave = claveAgente(r.data.perfil);
            if (clave !== claveActual) setTexto(borradores.current[clave] || '');
            setActual(id); setMensajes(r.data.mensajes); setPerfilConv(r.data.perfil || null);
            desplegar(clave);
            const pendiente = r.data.mensajes.find(m => m.estado === 'procesando');
            if (pendiente) seguir(pendiente.id);
        } catch (e) { if (version === turno.current) setError(mensajeError(e)); }
        finally { if (version === turno.current) setCargandoConversacion(false); }
    }, [seguir, claveActual, borradores]);
    useEffect(() => {
        if (!inicialAbierta.current && conversacionInicial && perfilesCargados) { inicialAbierta.current = true; abrir(conversacionInicial); }
    }, [conversacionInicial, perfilesCargados, abrir]);

    // Chat nuevo con un agente (o, con el Desarrollador, un pedido nuevo).
    const nueva = (a = null) => {
        clearTimeout(sondeo.current); turno.current += 1;
        const destino = a ?? agente;
        setVerOpciones(false); cerrarEnMovil(); setError('');
        if (destino.desarrollador) { setVista({ tipo: 'dev', id: null }); desplegar(claveAgente(destino)); return; }
        const clave = claveAgente(destino);
        if (clave !== claveActual) setTexto(borradores.current[clave] || '');
        setVista({ tipo: 'chat' }); setActual(null); setPerfilConv(null); setMensajes([]); setCargandoConversacion(false);
        setPerfilNuevo(destino.id ?? null); desplegar(clave);
        setTimeout(() => entrada.current?.focus(), 0);
    };
    const abrirTarea = (id) => { setVista({ tipo: 'dev', id }); cerrarEnMovil(); };
    const abrirHilo = (clave) => { setVista({ tipo: 'hilo', clave }); desplegar('equipo'); cerrarEnMovil(); };
    const actualizarMensaje = (dato) => setMensajes(ms => ms.map(m => (m.id === dato.id ? { ...m, ...dato } : m)));
    const cargarMas = async () => {
        setMasCargando(true);
        try {
            const r = await API.get('/asistente/conversaciones/', { params: { offset: cantidadCargada.current, sin_ejecuciones: '1' } });
            setConversaciones(cs => [...cs, ...r.data.filter(c => !cs.some(x => x.id === c.id))]);
            cantidadCargada.current += r.data.length; setHayMas(r.data.length === 100);
        } catch (e) { setError(mensajeError(e)); } finally { setMasCargando(false); }
    };
    const borrar = async (c) => {
        if (!window.confirm(`¿Borrar el chat «${c.titulo}»?`)) return;
        try { await API.delete(`/asistente/conversaciones/${c.id}/`); if (c.id === actual) nueva(agente); cargarConversaciones(); } catch (e) { setError(mensajeError(e)); }
    };
    const borrarTarea = async (t) => {
        if (!window.confirm(`¿Borrar el pedido #${t.id} del Desarrollador?`)) return;
        try { await API.delete(`/desarrollador/tareas/${t.id}/`); if (vista.tipo === 'dev' && vista.id === t.id) setVista({ tipo: 'dev', id: null }); cargarTareas(); }
        catch (e) { setError(mensajeError(e)); }
    };

    const enviar = async (pregunta) => {
        const t = (pregunta ?? texto).trim();
        if (!t || ocupado || cargandoConversacion || (perfilInicial !== null && !perfilesCargados) || (agente.id && !agente.activo)) return;
        const version = turno.current;
        setError(''); setTexto('');
        const temporal = { id: `t${Date.now()}`, rol: 'usuario', texto: t, estado: 'listo' };
        const espera = { id: `e${Date.now()}`, rol: 'asistente', texto: '', estado: 'procesando', consultas: [] };
        setMensajes(ms => [...ms, temporal, espera]);
        try {
            const r = await API.post('/asistente/preguntar/', { texto: t, conversacion: actual, ...(modelo ? { modelo } : {}),
                ...(!actual && agente.id ? { perfil: agente.id } : {}) });
            if (version !== turno.current) { cargarConversaciones(); return; }
            setActual(r.data.conversacion.id);
            if (!actual) setPerfilConv(r.data.conversacion.perfil || null);
            setMensajes(ms => ms.map(m => (m.id === temporal.id ? r.data.pregunta : m.id === espera.id ? r.data.respuesta : m)));
            if (r.data.respuesta.estado === 'procesando') seguir(r.data.respuesta.id); else cargarConversaciones();
            if (!actual) cargarConversaciones();
        } catch (e) {
            if (version !== turno.current) return;
            setMensajes(ms => ms.filter(m => m.id !== temporal.id && m.id !== espera.id));
            setTexto(t); setError(mensajeError(e));
        }
    };
    const reintentarUltima = () => {
        const ultima = [...mensajes].reverse().find(m => m.rol === 'usuario');
        if (ultima) enviar(ultima.texto);
    };
    const alTeclear = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } };

    // Controles de la ventana flotante (o el regreso a la oficina en la página completa).
    const controles = <div className="cv-controles">
        {onAbrirPantalla && vista.tipo === 'chat' && <button type="button" className="cv-icono" aria-label="Abrir chat a pantalla completa" title="Ampliar"
            onClick={() => onAbrirPantalla({ conversacion: cargandoConversacion ? conversacionAbriendo.current : actual, borrador: texto })}><FaExpandAlt /></button>}
        {onMinimizar && <button type="button" className="cv-icono" aria-label="Minimizar chat (guarda la página actual)" title="Minimizar" onClick={onMinimizar}><FaMinus /></button>}
        {integrado && onVolver && <button type="button" className="cv-icono" aria-label={etiquetaCerrar} title="Cerrar · Esc" onClick={onVolver}><FaTimes /></button>}
    </div>;
    const clase = `cv-chat ${integrado ? 'cv-chat--ventana' : 'cv-chat--pagina'}${lateral ? '' : ' is-lateral-cerrado'}`;
    const aviso = (contenido) => <div className={clase}><section className="cv-panel">
        <header className="cv-cabecera">{!integrado && <a className="cv-icono" href="#/IA" aria-label="Volver a la oficina"><FaArrowLeft /></a>}<div className="cv-cabecera__texto"><h1>Chat de IA</h1></div>{controles}</header>
        <div className="cv-cuerpo cv-cuerpo--centro">{contenido}</div></section></div>;

    if (estado && !estado.configurado) {
        return aviso(<div className="chat-vacio"><FaRobot /><h2>El asistente no está disponible</h2>
            <p>{estado.error || 'Falta configurar la clave de Gemini en el servidor (GEMINI_API_KEY).'}</p></div>);
    }
    if (perfilInicial !== null && !perfilesCargados) {
        return aviso(error ? <p className="chat-error" role="alert">{error}<button type="button" onClick={cargarPerfiles}>Reintentar</button></p> : <p className="chat-abriendo" role="status">Cargando el agente…</p>);
    }
    if (perfilInicial !== null && perfilesCargados && !perfiles.some(p => p.id === perfilInicial)) {
        return aviso(<p className="chat-error" role="alert">Este agente ya no está disponible. Elige otro en la oficina.</p>);
    }

    const sugerencias = agente.id ? sugerenciasPerfil(agente) : SUGERENCIAS;
    const hiloActual = vista.tipo === 'hilo' ? (equipo.hilos || []).find(h => h.clave === vista.clave) : null;
    const tareaActual = vista.tipo === 'dev' && vista.id ? tareas.find(t => t.id === vista.id) : null;
    const cabecera = vista.tipo === 'hilo'
        ? { avatar: hiloActual ? <Pareja participantes={hiloActual.participantes} tamano={30} /> : null, titulo: hiloActual ? `${hiloActual.participantes[0].nombre} y ${hiloActual.participantes[1].nombre}` : 'Equipo IA', detalle: 'Conversación entre agentes · se actualiza sola' }
        : vista.tipo === 'dev'
            ? { avatar: <AvatarPerfil perfil={desarrollador || { icono: 'idea', color: 'morado' }} tamano={32} />, titulo: desarrollador?.nombre || 'Desarrollador', detalle: tareaActual ? `Pedido #${tareaActual.id} · ${tareaActual.estado_nombre}` : 'Mejoras de la plataforma con tu aprobación' }
            : { avatar: <AvatarPerfil perfil={agente} tamano={32} />, titulo: agente.nombre, detalle: agente.id ? agente.rol : 'Analiza los datos de Lottus y te aconseja para decidir' };

    return (
        <div className={clase}>
            <aside className="cv-lateral" id="cv-lateral" aria-label="Chats">
                <div className="cv-lateral__cabecera">
                    <strong>Chats</strong>
                    <label className="cv-buscar"><FaSearch aria-hidden="true" />
                        <input type="search" value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar chats" aria-label="Buscar chats" />
                    </label>
                </div>
                <ArbolChats agentes={agentesArbol} conversaciones={conversaciones} tareas={tareas} hilos={equipo.error ? [] : equipo.hilos}
                    vista={vista} actual={actual} expandidos={expandidos} filtro={filtro} onAlternar={alternarGrupo} onNuevo={nueva}
                    onAbrir={(id) => { abrir(id); cerrarEnMovil(); }} onBorrar={borrar} onAbrirTarea={abrirTarea} onBorrarTarea={borrarTarea} onAbrirHilo={abrirHilo} />
                {hayMas && <button type="button" className="cv-mas" disabled={masCargando} onClick={cargarMas}>{masCargando ? 'Cargando…' : 'Ver más chats'}</button>}
                <div className="cv-lateral__pie">
                    {puedeGestionar && <a href={`#/IA/configuracion${agente.id ? `?perfil=${agente.id}` : ''}`}><FaSlidersH aria-hidden="true" /> Gestionar agentes</a>}
                    {!integrado && <a href="#/IA"><FaArrowLeft aria-hidden="true" /> La oficina</a>}
                </div>
            </aside>
            {/* Menú cerrado en computador: una barra con los agentes para volver a abrirlo en un clic. */}
            {!lateral && <nav className="cv-riel" aria-label="Agentes">
                {agentesArbol.map(a => <button type="button" key={claveAgente(a)} title={a.nombre} aria-label={`Ver chats de ${a.nombre}`}
                    onClick={() => { desplegar(claveAgente(a)); alternarLateral(); }}><AvatarPerfil perfil={a} tamano={28} /></button>)}
            </nav>}
            {/* En celular el menú va encima: tocar fuera lo cierra (con teclado se usa el botón de la cabecera). */}
            {lateral && <button type="button" className="cv-velo" aria-hidden="true" tabIndex={-1} onClick={alternarLateral} />}

            <section className="cv-panel" aria-label={vista.tipo === 'chat' ? `Chat con ${agente.nombre}` : cabecera.titulo}>
                <header className="cv-cabecera">
                    <button type="button" className="cv-icono" aria-label={lateral ? 'Ocultar chats' : 'Mostrar chats'} aria-expanded={lateral} aria-controls="cv-lateral"
                        title={lateral ? 'Ocultar chats' : 'Mostrar chats'} onClick={alternarLateral}><FaBars /></button>
                    {cabecera.avatar}
                    <div className="cv-cabecera__texto"><h1>{cabecera.titulo}</h1><small>{cabecera.detalle}</small></div>
                    {vista.tipo === 'chat' && <div className="cv-opciones" ref={opciones}>
                        <button type="button" className="cv-icono" aria-label="Opciones del chat" aria-expanded={verOpciones} title="Opciones" onClick={() => setVerOpciones(v => !v)}><FaEllipsisH /></button>
                        {verOpciones && <div className="cv-opciones__menu">
                            <button type="button" onClick={() => { setVerOpciones(false); setVerAprendido(true); }}><FaLightbulb aria-hidden="true" /> Lo aprendido</button>
                            <label>Modelo
                                <select aria-label="Modelo de IA" value={modelo} disabled={ocupado} onChange={e => setModelo(e.target.value)}>
                                    <option value="">Automático (con respaldo)</option>
                                    {(estado?.modelos || (estado?.modelo ? [{ id: estado.modelo }] : [])).map(m =>
                                        <option key={m.id} value={m.id}>{m.id}{m.aviso ? ' · límite temporal' : ''}</option>)}
                                </select>
                            </label>
                        </div>}
                    </div>}
                    {controles}
                </header>

                {vista.tipo === 'hilo' ? <HiloEquipo key={vista.clave} clave={vista.clave} sinCabecera onMenu={alternarLateral} />
                    : vista.tipo === 'dev' ? <div className="cv-cuerpo cv-dev">
                        {vista.id ? <DetalleTarea key={vista.id} id={vista.id} onCambio={cargarTareas} />
                            : <><p className="cv-dev__intro">Cuéntale qué mejora quieres en la plataforma. Te propone un plan con sus riesgos y solo lo aplica cuando lo apruebas; si no te gusta, le das «Deshacer».</p>
                                <NuevoPedido onCreado={t => { cargarTareas(); setVista({ tipo: 'dev', id: t.id }); }} /></>}
                    </div> : <>
                        <div className="chat-mensajes" ref={contenedorMensajes}>
                            {cargandoConversacion ? <p className="chat-abriendo" role="status">Abriendo conversación…</p> : !mensajes.length ? (
                                <div className="chat-bienvenida">
                                    <AvatarPerfil perfil={agente} tamano={52} className="chat-bienvenida__avatar" />
                                    <h2>{agente.id ? `Hola, soy ${agente.nombre}` : '¿En qué decisión te ayudo hoy?'}</h2>
                                    <p>{agente.id ? agente.rol : 'Pregunta por ventas, asesores, cobros, pedidos, telas, caja, inventario o nómina. Consulto los datos en vivo y te doy conclusiones y recomendaciones.'}</p>
                                    {!generalVisible && !activos.length && <p className="chat-error" role="note">Aún no tienes agentes de IA habilitados. Pídele al administrador que te asigne uno.</p>}
                                    <div className="chat-sugerencias">
                                        {sugerencias.map(s => <button type="button" key={s} onClick={() => enviar(s)}>{s}</button>)}
                                    </div>
                                </div>
                            ) : mensajes.map((m, i) => <Mensaje key={m.id} m={m} agente={agente} actualizar={actualizarMensaje}
                                consultar={() => { setMensajes(ms => ms.map(x => x.id === m.id ? { ...x, estado: 'procesando' } : x)); seguir(m.id); }}
                                reintentar={i === mensajes.length - 1 ? reintentarUltima : null} />)}
                        </div>
                        {agente.id && perfilesCargados && !agente.activo && <p className="chat-error chat-error--global">Este agente está pausado. Puedes consultar su historial.</p>}
                        {error && <p className="chat-error chat-error--global" role="alert">{error}</p>}
                        <form className="chat-entrada" onSubmit={e => { e.preventDefault(); enviar(); }}>
                            <textarea ref={entrada} rows={1} value={texto} maxLength={4000} placeholder={`Escribe tu pregunta para ${agente.nombre}…`}
                                aria-label="Pregunta para el asesor" onChange={e => setTexto(e.target.value)} onKeyDown={alTeclear} />
                            <button type="submit" disabled={!texto.trim() || ocupado || cargandoConversacion || (perfilInicial !== null && !perfilesCargados) || (agente.id && !agente.activo)} aria-label="Enviar"><FaPaperPlane /></button>
                        </form>
                        <p className="chat-aviso">La IA puede equivocarse: verifica las cifras importantes. Usa 👍 👎 y «Enseñar» para entrenarla.</p>
                    </>}
                {vista.tipo !== 'chat' && error && <p className="chat-error chat-error--global" role="alert">{error}</p>}
            </section>
            {verAprendido && <AprendizajesIA perfil={agente} onCerrar={() => setVerAprendido(false)} />}
        </div>
    );
}
