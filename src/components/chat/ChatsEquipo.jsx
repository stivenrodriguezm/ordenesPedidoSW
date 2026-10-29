import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaBars, FaChevronDown, FaComments, FaLightbulb, FaRobot } from 'react-icons/fa';
import API from '../../services/api';
import AvatarPerfil from './AvatarPerfil';
import Markdown from './Markdown';
import EjecucionAgente from '../oficina/EjecucionAgente';
import { GENERAL } from './catalogoIA';
import './ChatsEquipo.css';

/*
 * Chats del equipo IA (2026-10-14): lo que se dicen los agentes entre sí. IA Lottus le
 * encarga los cambios a Alan, Alan le responde al terminar, los colegas se consultan y
 * los líderes entregan su informe de área. Un hilo por pareja de agentes, solo lectura:
 * para pedir algo se habla con IA Lottus (o con el agente) en «Mis chats».
 */

const ETIQUETAS = { solicitud: 'Encargo', avance: 'Avance', resultado: 'Resultado', respuesta: 'Respuesta', consulta: 'Consulta', aprendizaje: 'Aprendizaje' };
const ESTADOS = { pendiente: 'En cola', ejecutando: 'Trabajando', listo: 'Terminado', necesita_datos: 'Necesita datos', error: 'Requiere revisión' };
const ACTIVOS = ['pendiente', 'ejecutando'];

const perfilDe = (p) => p?.perfil || { ...GENERAL, nombre: p?.nombre || GENERAL.nombre };
const hora = (iso) => new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
const dia = (iso) => {
    const d = new Date(iso), hoy = new Date(), ayer = new Date(Date.now() - 864e5);
    if (d.toDateString() === hoy.toDateString()) return 'Hoy';
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
};
const cuando = (iso) => new Date(iso).toDateString() === new Date().toDateString()
    ? hora(iso) : new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
const mensajeError = (e) => e.response?.data?.error || e.response?.data?.detail || 'No se pudo cargar la conversación.';

export function Pareja({ participantes, tamano = 22 }) {
    return <span className="eq-pareja" aria-hidden="true">
        <AvatarPerfil perfil={perfilDe(participantes[0])} tamano={tamano} />
        <AvatarPerfil perfil={perfilDe(participantes[1])} tamano={tamano} className="eq-pareja__segundo" />
    </span>;
}

export function ListaHilos({ hilos, error, actual, onAbrir }) {
    if (error) return <p className="eq-lista__vacia" role="alert">{error}</p>;
    if (hilos === null) return <p className="eq-lista__vacia" role="status">Cargando conversaciones del equipo…</p>;
    if (!hilos.length) return <p className="eq-lista__vacia">Aún no hay conversaciones entre agentes. Cuando le pidas un cambio a IA Lottus, se lo encargará al agente ejecutor y aquí verás lo que se dicen.</p>;
    return <ul className="eq-lista">
        {hilos.map(h => (
            <li key={h.clave}>
                <button type="button" className={`eq-lista__item${h.clave === actual ? ' is-actual' : ''}`} onClick={() => onAbrir(h.clave)}
                    aria-current={h.clave === actual ? 'true' : undefined}>
                    <Pareja participantes={h.participantes} />
                    <span className="eq-lista__texto">
                        <span className="eq-lista__nombres"><strong>{h.participantes[0].nombre} y {h.participantes[1].nombre}</strong><time>{cuando(h.ultimo.creado)}</time></span>
                        <small>{h.activo && <i className="eq-activo" aria-label="Trabajando" />}{h.ultimo.nombre}: {h.ultimo.texto}</small>
                    </span>
                </button>
            </li>
        ))}
    </ul>;
}

function Trabajo({ t }) {
    const [abierto, setAbierto] = useState(false);
    return <div className={`eq-trabajo is-${t.estado}`}>
        <button type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto}>
            <FaRobot aria-hidden="true" /><span>Ejecución #{t.id} · {ESTADOS[t.estado] || t.estado}{t.pasos_guardados ? ` · ${t.pasos_guardados} ${t.pasos_guardados === 1 ? 'paso guardado' : 'pasos guardados'}` : ''}</span>
            <FaChevronDown aria-hidden="true" className="eq-trabajo__flecha" />
        </button>
        {abierto && <EjecucionAgente id={t.id} inicial={t} compacto />}
    </div>;
}

// sinCabecera: dentro del chat de IA el encabezado lo pone la ventana.
export function HiloEquipo({ clave, onMenu, sinCabecera = false }) {
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const lista = useRef(null);
    const vista = useRef(0);
    const trabajando = !!datos?.mensajes?.length && ACTIVOS.includes([...datos.mensajes].reverse().find(m => m.trabajo)?.trabajo?.estado);
    const cargar = useCallback(() => {
        const version = vista.current;
        return API.get(`/asistente/equipo/hilos/${encodeURIComponent(clave)}/`).then(r => { if (version === vista.current) { setDatos(r.data); setError(''); } })
            .catch(e => { if (version === vista.current) setError(mensajeError(e)); });
    }, [clave]);
    useEffect(() => { vista.current += 1; setDatos(null); setError(''); cargar(); }, [cargar]);
    useEffect(() => {
        const t = setInterval(cargar, trabajando ? 3000 : 12000);
        return () => clearInterval(t);
    }, [cargar, trabajando]);
    const total = datos?.mensajes?.length || 0;
    useEffect(() => { const e = lista.current; e?.scrollTo?.({ top: e.scrollHeight }); }, [total, trabajando]);

    const [a, b] = datos?.participantes || [];
    const ejecutor = a && b ? (trabajando ? [a, b].find(p => p.perfil?.ejecutor) || b : null) : null;
    let diaPrevio = '';
    return <section className="chat-panel eq-hilo" aria-label={a && b ? `Conversación entre ${a.nombre} y ${b.nombre}` : 'Conversación del equipo'}>
        {!sinCabecera && <header className="chat-cabecera eq-hilo__cabecera">
            <button type="button" className="chat-menu" aria-label="Ver conversaciones" onClick={onMenu}><FaBars /></button>
            {a && b && <Pareja participantes={[a, b]} tamano={34} />}
            <div className="chat-cabecera__texto">
                <h1>{a && b ? `${a.nombre} y ${b.nombre}` : 'Equipo IA'}</h1>
                <small>Conversación entre agentes · se actualiza sola</small>
            </div>
        </header>}
        <div className="chat-mensajes eq-mensajes" ref={lista}>
            {error ? <p className="chat-error" role="alert">{error}<button type="button" onClick={cargar}>Reintentar</button></p>
                : !datos ? <p className="chat-abriendo" role="status">Abriendo conversación…</p>
                    : datos.mensajes.map(m => {
                        const lado = m.de === a.clave ? 'izq' : 'der';
                        const quien = m.de === a.clave ? a : b;
                        const d = dia(m.creado);
                        const separador = d !== diaPrevio ? (diaPrevio = d) : null;
                        return <React.Fragment key={m.id}>
                            {separador && <div className="eq-dia"><span>{separador}</span></div>}
                            <article className={`eq-msg eq-msg--${lado} is-${m.tipo}`}>
                                <AvatarPerfil perfil={perfilDe(quien)} tamano={30} />
                                <div className="eq-msg__globo">
                                    <header><strong>{m.nombre}</strong><span className="eq-etiqueta">{m.tipo === 'aprendizaje' && <FaLightbulb aria-hidden="true" />}{ETIQUETAS[m.tipo] || m.tipo}</span><time dateTime={m.creado}>{hora(m.creado)}</time></header>
                                    <Markdown texto={m.texto} />
                                    {m.trabajo && ['solicitud', 'resultado'].includes(m.tipo) && <Trabajo t={m.trabajo} />}
                                </div>
                            </article>
                        </React.Fragment>;
                    })}
            {ejecutor && <div className="eq-escribiendo" role="status"><span className="chat-puntos" aria-hidden="true"><i /><i /><i /></span>{ejecutor.nombre} está trabajando en la tarea…</div>}
        </div>
        <p className="chat-aviso eq-aviso"><FaComments aria-hidden="true" /> Solo lectura. Para pedir un cambio, escríbele a IA Lottus: se lo encargará al agente ejecutor y su conversación aparecerá aquí.</p>
    </section>;
}

export function SinHilo({ onMenu, hay }) {
    return <section className="chat-panel eq-hilo" aria-label="Equipo IA">
        <header className="chat-cabecera eq-hilo__cabecera">
            <button type="button" className="chat-menu" aria-label="Ver conversaciones" onClick={onMenu}><FaBars /></button>
            <div className="chat-cabecera__texto"><h1>Equipo IA</h1><small>Conversaciones entre agentes</small></div>
        </header>
        <div className="chat-mensajes"><div className="chat-bienvenida">
            <span className="eq-bienvenida__icono"><FaComments aria-hidden="true" /></span>
            <h2>Así trabaja tu equipo de IA</h2>
            <p>{hay ? 'Elige una conversación para ver lo que se dicen los agentes.' : 'Pídele un cambio a IA Lottus: se lo encargará al agente ejecutor, que empieza de inmediato y vuelve a contarle el resultado. Aquí verás cada conversación y lo que aprenden de cada tarea.'}</p>
        </div></div>
    </section>;
}
