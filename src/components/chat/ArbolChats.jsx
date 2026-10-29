import React from 'react';
import { FaChevronRight, FaPlus, FaTrashAlt, FaUsers } from 'react-icons/fa';
import AvatarPerfil from './AvatarPerfil';
import { claveAgente } from './catalogoIA';

/*
 * Menú lateral del chat de IA (2026-10-29): cada agente con sus chats debajo, en grupos que se
 * pliegan y despliegan. El Desarrollador muestra sus pedidos (tareas) y «Equipo IA» lo que se
 * dicen los agentes entre sí (solo lectura). Con un texto en `filtro` solo quedan los chats que
 * coinciden, con su grupo desplegado.
 */

// Tareas del Desarrollador que se pueden borrar (las activas siguen trabajando y las aplicadas aún se deshacen).
const TAREAS_BORRABLES = ['plan_listo', 'fallida', 'descartada', 'deshecha'];
const TONO_TAREA = { planificando: 'activa', aprobada: 'activa', implementando: 'activa', deshaciendo: 'activa', plan_listo: 'aviso', aplicada: 'ok', en_pruebas: 'ok', fallida: 'error' };

// Hace cuánto, corto como en los mensajes de Instagram: «5 min», «3 h», «2 d», «27 oct».
const cuando = (iso) => {
    if (!iso) return '';
    const minutos = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
    if (minutos < 1) return 'ahora';
    if (minutos < 60) return `${minutos} min`;
    if (minutos < 24 * 60) return `${Math.floor(minutos / 60)} h`;
    if (minutos < 7 * 24 * 60) return `${Math.floor(minutos / 1440)} d`;
    return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '');
};
const normalizar = (v) => (v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function Fila({ actual, titulo, detalle, activa, tono, onAbrir, onBorrar, etiquetaBorrar }) {
    return (
        <li className={`cv-fila${actual ? ' is-actual' : ''}`}>
            <button type="button" className="cv-fila__abrir" onClick={onAbrir} aria-current={actual ? 'true' : undefined} title={titulo}>
                {activa && <i className="cv-actividad" aria-label="Trabajando" />}
                {tono && !activa && <i className={`cv-estado is-${tono}`} aria-hidden="true" />}
                <span className="cv-fila__titulo">{titulo}</span>
                {detalle && <time aria-hidden="true">{detalle}</time>}
            </button>
            {onBorrar && <button type="button" className="cv-fila__borrar" aria-label={etiquetaBorrar} title="Borrar" onClick={onBorrar}><FaTrashAlt /></button>}
        </li>
    );
}

function Grupo({ clave, nombre, avatar, total, abierto, onAlternar, onNuevo, etiquetaNuevo, children }) {
    return (
        <li className={`cv-grupo${abierto ? ' is-abierto' : ''}`}>
            <div className="cv-grupo__cabecera">
                <button type="button" className="cv-grupo__nombre" aria-expanded={abierto} aria-controls={`cv-grupo-${clave}`} onClick={onAlternar}>
                    <FaChevronRight className="cv-grupo__flecha" aria-hidden="true" />
                    {avatar}
                    <span>{nombre}</span>
                    {total > 0 && <small aria-label={`${total} chats`}>{total}</small>}
                </button>
                {onNuevo && <button type="button" className="cv-grupo__nuevo" aria-label={etiquetaNuevo} title={etiquetaNuevo} onClick={onNuevo}><FaPlus /></button>}
            </div>
            {abierto && <ul className="cv-grupo__chats" id={`cv-grupo-${clave}`}>{children}</ul>}
        </li>
    );
}

export default function ArbolChats({ agentes, conversaciones, tareas, hilos, vista, actual, expandidos, filtro,
    onAlternar, onNuevo, onAbrir, onBorrar, onAbrirTarea, onBorrarTarea, onAbrirHilo }) {
    const buscar = normalizar(filtro.trim());
    const coincide = (texto) => !buscar || normalizar(texto).includes(buscar);
    const grupos = agentes.map(a => {
        const clave = claveAgente(a);
        const filas = a.desarrollador
            ? tareas.filter(t => coincide(t.pedido)).map(t => (
                <Fila key={t.id} titulo={t.pedido} detalle={`#${t.id}`} tono={TONO_TAREA[t.estado]} activa={TONO_TAREA[t.estado] === 'activa'}
                    actual={vista.tipo === 'dev' && vista.id === t.id} onAbrir={() => onAbrirTarea(t.id)}
                    onBorrar={TAREAS_BORRABLES.includes(t.estado) ? () => onBorrarTarea(t) : null} etiquetaBorrar={`Borrar pedido #${t.id}`} />))
            : conversaciones.filter(c => claveAgente(c.perfil) === clave && coincide(c.titulo)).map(c => (
                <Fila key={c.id} titulo={c.titulo} detalle={cuando(c.actualizada)} activa={c.activa}
                    actual={vista.tipo === 'chat' && c.id === actual} onAbrir={() => onAbrir(c.id)}
                    onBorrar={() => onBorrar(c)} etiquetaBorrar={`Borrar ${c.titulo}`} />));
        if (buscar && !filas.length) return null;
        return (
            <Grupo key={clave} clave={clave} nombre={a.nombre} avatar={<AvatarPerfil perfil={a} tamano={22} />} total={filas.length}
                abierto={!!buscar || expandidos.has(clave)} onAlternar={() => onAlternar(clave)}
                onNuevo={() => onNuevo(a)} etiquetaNuevo={a.desarrollador ? 'Nuevo pedido al Desarrollador' : `Nuevo chat con ${a.nombre}`}>
                {filas.length ? filas : <li className="cv-vacio">{a.desarrollador ? 'Aún no hay pedidos.' : 'Aún no hay chats.'}</li>}
            </Grupo>
        );
    });
    const hilosVisibles = (hilos || []).filter(h => coincide(`${h.participantes[0].nombre} y ${h.participantes[1].nombre}`));
    return (
        <nav className="cv-arbol" aria-label="Chats por agente">
            <ul>
                {grupos}
                {hilos !== null && (!buscar || hilosVisibles.length > 0) && (
                    <Grupo clave="equipo" nombre="Equipo IA" avatar={<span className="cv-grupo__icono" aria-hidden="true"><FaUsers /></span>}
                        total={hilosVisibles.length} abierto={!!buscar || expandidos.has('equipo')} onAlternar={() => onAlternar('equipo')}>
                        {hilosVisibles.length ? hilosVisibles.map(h => (
                            <Fila key={h.clave} titulo={`${h.participantes[0].nombre} y ${h.participantes[1].nombre}`} detalle={cuando(h.ultimo?.creado)}
                                activa={h.activo} actual={vista.tipo === 'hilo' && vista.clave === h.clave} onAbrir={() => onAbrirHilo(h.clave)} />
                        )) : <li className="cv-vacio">Aquí verás lo que se dicen los agentes cuando trabajan juntos.</li>}
                    </Grupo>
                )}
            </ul>
        </nav>
    );
}
