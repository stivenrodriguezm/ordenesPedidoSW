import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaCheck, FaCode, FaExternalLinkAlt, FaLightbulb, FaRedo, FaTimes, FaUndo } from 'react-icons/fa';
import { Badge, Button, PageHeader } from '../components/ui';
import { mensajeDeError } from '../services/errores';
import { accionTareaDesarrollo, estadoDesarrollador, listarTareasDesarrollo, obtenerTareaDesarrollo, pedirMejora } from '../services/desarrolladorService';
import './DesarrolladorPage.css';

/*
 * Agente Desarrollador (2026-10-28): pides una mejora, propone un plan con sus riesgos, lo
 * apruebas, lo implementa con pruebas y (2026-10-29, sin vista previa) lo aplica de una vez;
 * «Deshacer» lo revierte. Solo lo usa el administrador principal.
 */

const TONO_ESTADO = { planificando: 'info', plan_listo: 'warning', aprobada: 'info', implementando: 'info', en_pruebas: 'success', aplicada: 'success', deshaciendo: 'info', deshecha: 'neutral', fallida: 'danger', descartada: 'neutral' };
const TONO_RIESGO = { bajo: 'success', medio: 'warning', alto: 'danger' };
const ACTIVOS = ['planificando', 'aprobada', 'implementando', 'deshaciendo'];
const TITULO_RESULTADO = { aplicada: 'Aplicado en tu plataforma', deshaciendo: 'Deshaciendo el cambio', deshecha: 'Cambio deshecho', en_pruebas: 'Listo en la versión de pruebas' };
const hora = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

function Lista({ titulo, items }) {
    if (!items?.length) return null;
    return <div className="dv-bloque"><h4>{titulo}</h4><ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>;
}

function Plan({ plan }) {
    if (!plan?.pasos) return null;
    return (
        <section className="dv-card" aria-label="Plan propuesto">
            <div className="dv-card__cabeza">
                <h3>Plan propuesto</h3>
                <Badge tone={TONO_RIESGO[plan.riesgo] || 'neutral'}>Riesgo {plan.riesgo}</Badge>
            </div>
            <p className="dv-entendido">{plan.entendido}</p>
            {plan.cambios_pantalla && <p className="dv-pantalla"><strong>Qué verás:</strong> {plan.cambios_pantalla}</p>}
            {plan.cambia_base_datos && <p className="dv-alerta" role="note">Cambia la base de datos: antes de migrar se respalda la base de pruebas.</p>}
            <Lista titulo="Riesgos" items={plan.riesgos} />
            <Lista titulo="Antes de aprobar, resuelve" items={plan.preguntas} />
            <details className="dv-detalle"><summary>Pasos y archivos ({plan.pasos.length} pasos)</summary>
                <ol>{plan.pasos.map((p, i) => <li key={i}>{p}</li>)}</ol>
                <ul className="dv-archivos">{(plan.archivos || []).map(a => <li key={a}><code>{a}</code></li>)}</ul>
            </details>
        </section>
    );
}

function Resultado({ tarea }) {
    const r = tarea.resultado || {};
    if (!TITULO_RESULTADO[tarea.estado] && !r.resumen) return null;
    return (
        <section className={`dv-card ${tarea.estado === 'deshecha' ? '' : 'dv-card--ok'}`} aria-label="Resultado">
            <div className="dv-card__cabeza"><h3>{TITULO_RESULTADO[tarea.estado] || 'Resultado'}</h3><Badge tone="success"><FaCheck /> {r.verificaciones || 'Verificado'}</Badge></div>
            {r.resumen && <p>{r.resumen}</p>}
            {r.cambios_pantalla && <p className="dv-pantalla"><strong>Dónde verlo:</strong> {r.cambios_pantalla}</p>}
            {r.migraciones?.archivos?.length > 0 && <p className="dv-alerta" role="note">
                Migración de base de datos: {r.migraciones.archivos.map(a => a.split('/').pop()).join(', ')}
                {r.migraciones.operaciones_riesgosas?.length > 0 && <> · <strong>Revisa:</strong> {r.migraciones.operaciones_riesgosas.join(', ')}</>}
            </p>}
            <Lista titulo="Pruebas agregadas" items={r.pruebas_agregadas} />
            {tarea.estado === 'en_pruebas' && tarea.vista_previa && <a className="dv-vista-previa" href={tarea.vista_previa} target="_blank" rel="noreferrer"><FaExternalLinkAlt aria-hidden="true" /> Ver vista previa</a>}
            {tarea.estado === 'aplicada' && <p className="dv-nota">Ya está en la plataforma: recarga la página para verlo. Si no te gusta, dale «Deshacer».</p>}
        </section>
    );
}

// También se usa dentro del chat de IA (grupo «Desarrollador» del menú lateral).
export function DetalleTarea({ id, onCambio }) {
    const cliente = useQueryClient();
    const [ajuste, setAjuste] = useState('');
    const [verAjuste, setVerAjuste] = useState(false);
    const q = useQuery({ queryKey: ['desarrollador', 'tarea', id], queryFn: () => obtenerTareaDesarrollo(id),
        refetchInterval: (consulta) => (ACTIVOS.includes(consulta.state.data?.estado) ? 5000 : false) });
    const accion = useMutation({
        mutationFn: ({ nombre, datos }) => accionTareaDesarrollo(id, nombre, datos),
        onSuccess: (datos) => { cliente.setQueryData(['desarrollador', 'tarea', id], datos); setAjuste(''); setVerAjuste(false); onCambio(); },
    });
    const servicio = useQuery({ queryKey: ['desarrollador', 'estado'], queryFn: estadoDesarrollador, refetchInterval: 60000, retry: false });
    useEffect(() => { setVerAjuste(false); setAjuste(''); }, [id]);
    if (q.isPending) return <div className="dv-vacio" role="status">Cargando la tarea…</div>;
    if (q.isError) return <div className="dv-vacio" role="alert">{mensajeDeError(q.error, 'No se pudo cargar la tarea.')}</div>;
    const t = q.data;
    const aprobar = () => {
        if (t.plan?.riesgo === 'alto' && !window.confirm('Este plan es de riesgo alto. ¿Apruebas que lo implemente y lo aplique en la plataforma?')) return;
        accion.mutate({ nombre: 'aprobar' });
    };
    return (
        <div className="dv-detalle-tarea">
            <div className="dv-card">
                <div className="dv-card__cabeza"><h3>Tarea #{t.id}</h3><Badge tone={TONO_ESTADO[t.estado]}>{t.estado_nombre}</Badge></div>
                <p className="dv-pedido">{t.pedido}</p>
                {t.ajustes?.length > 0 && <Lista titulo="Tus ajustes" items={t.ajustes} />}
                {ACTIVOS.includes(t.estado) && <p className="dv-trabajando" role="status"><span className="dv-giro" aria-hidden="true" /> {t.eventos?.[t.eventos.length - 1]?.texto || 'Trabajando…'}</p>}
                {ACTIVOS.includes(t.estado) && (servicio.data?.servicio_activo === false
                    ? <p className="dv-alerta" role="note">El agente no está en línea: la tarea queda en cola y empieza cuando se conecte.</p>
                    : <p className="dv-nota">Cada paso puede tardar unos minutos; esta página se actualiza sola.</p>)}
            </div>
            <Plan plan={t.plan} />
            <Resultado tarea={t} />
            {t.estado === 'fallida' && <section className="dv-card dv-card--error" role="alert"><h3>No se pudo completar</h3><pre className="dv-error">{t.error}</pre></section>}
            {t.estado === 'aplicada' && t.error && <p className="dv-error-accion" role="alert">{t.error}</p>}
            {accion.isError && <p className="dv-error-accion" role="alert">{mensajeDeError(accion.error, 'No se pudo completar la acción.')}</p>}
            <div className="dv-acciones">
                {t.estado === 'plan_listo' && <>
                    <Button icon={FaCheck} onClick={aprobar} loading={accion.isPending && accion.variables?.nombre === 'aprobar'} disabled={accion.isPending}>Aprobar y aplicar</Button>
                    <Button variant="secondary" onClick={() => setVerAjuste(v => !v)} disabled={accion.isPending}>Pedir ajustes</Button>
                </>}
                {t.estado === 'aplicada' && <Button variant="secondary" icon={FaUndo} disabled={accion.isPending}
                    loading={accion.isPending && accion.variables?.nombre === 'deshacer'}
                    onClick={() => { if (window.confirm('¿Deshacer este cambio en la plataforma?')) accion.mutate({ nombre: 'deshacer' }); }}>Deshacer</Button>}
                {t.estado === 'fallida' && <Button icon={FaRedo} onClick={() => accion.mutate({ nombre: 'reintentar' })} disabled={accion.isPending}>Reintentar</Button>}
                {['plan_listo', 'en_pruebas', 'fallida'].includes(t.estado) && <Button variant="ghost" icon={FaTimes} disabled={accion.isPending}
                    onClick={() => { if (window.confirm(t.estado === 'en_pruebas' ? '¿Descartar? La versión de pruebas volverá a la de producción.' : '¿Descartar esta tarea?')) accion.mutate({ nombre: 'descartar' }); }}>Descartar</Button>}
            </div>
            {verAjuste && <form className="dv-ajuste" onSubmit={e => { e.preventDefault(); if (ajuste.trim()) accion.mutate({ nombre: 'ajustar', datos: { texto: ajuste.trim() } }); }}>
                <label htmlFor="dv-ajuste">¿Qué cambiarías del plan?</label>
                <textarea id="dv-ajuste" rows={3} maxLength={2000} value={ajuste} onChange={e => setAjuste(e.target.value)} placeholder="Ej.: que la columna salga también en el Excel" />
                <Button type="submit" size="sm" disabled={!ajuste.trim() || accion.isPending}>Enviar ajustes</Button>
            </form>}
            {t.diff && <details className="dv-detalle"><summary><FaCode aria-hidden="true" /> Ver cambios técnicos</summary><pre className="dv-diff">{t.diff}</pre></details>}
            {t.eventos?.length > 0 && <details className="dv-detalle"><summary>Historial ({t.eventos.length})</summary>
                <ol className="dv-eventos">{[...t.eventos].reverse().map((e, i) => <li key={i}><time>{hora(e.t)}</time> {e.texto}</li>)}</ol></details>}
        </div>
    );
}

export function NuevoPedido({ onCreado }) {
    const cliente = useQueryClient();
    const [pedido, setPedido] = useState('');
    const crear = useMutation({
        mutationFn: pedirMejora,
        onSuccess: (t) => { setPedido(''); cliente.invalidateQueries({ queryKey: ['desarrollador', 'tareas'] }); onCreado?.(t); },
    });
    return (
        <form className="dv-nuevo" onSubmit={e => { e.preventDefault(); if (pedido.trim().length >= 10) crear.mutate(pedido.trim()); }}>
            <label htmlFor="dv-pedido">¿Qué quieres mejorar?</label>
            <textarea id="dv-pedido" rows={4} maxLength={4000} value={pedido} onChange={e => setPedido(e.target.value)}
                placeholder="Ej.: en Ventas agrega una columna con la ciudad del cliente" />
            {crear.isError && <p className="dv-error-accion" role="alert">{mensajeDeError(crear.error, 'No se pudo enviar el pedido.')}</p>}
            <Button type="submit" loading={crear.isPending} disabled={pedido.trim().length < 10}>Pedir mejora</Button>
            <small>Primero te propone un plan con sus riesgos; no cambia nada hasta que lo apruebes.</small>
        </form>
    );
}

export default function DesarrolladorPage() {
    const cliente = useQueryClient();
    const [elegida, setElegida] = useState(null);
    const estado = useQuery({ queryKey: ['desarrollador', 'estado'], queryFn: estadoDesarrollador, refetchInterval: 60000, retry: false });
    const tareas = useQuery({ queryKey: ['desarrollador', 'tareas'], queryFn: listarTareasDesarrollo, refetchInterval: 15000, enabled: estado.isSuccess });
    const lista = tareas.data || [];
    const actual = elegida ?? lista[0]?.id ?? null;
    const recargar = () => { cliente.invalidateQueries({ queryKey: ['desarrollador', 'tareas'] }); cliente.invalidateQueries({ queryKey: ['desarrollador', 'estado'] }); };

    if (estado.isError) {
        return <div className="ds-page dv-page"><PageHeader icon={FaLightbulb} title="Desarrollador" />
            <p className="dv-vacio" role="alert">{mensajeDeError(estado.error, 'No se pudo abrir el Desarrollador.')}</p></div>;
    }
    return (
        <div className="ds-page dv-page">
            <PageHeader icon={FaLightbulb} title="Desarrollador"
                subtitle="Mejoras de la plataforma con tu aprobación. Se prueban, se aplican de una vez y puedes deshacerlas."
                actions={<>
                    {estado.data && <Badge tone={estado.data.servicio_activo ? 'success' : 'warning'}>{estado.data.servicio_activo ? 'Agente en línea' : 'Agente sin conexión'}</Badge>}
                    <Link to="/IA" className="dv-volver"><FaArrowLeft aria-hidden="true" /> Oficina</Link>
                </>} />
            <div className="dv-layout">
                <aside className="dv-lateral">
                    <NuevoPedido onCreado={t => setElegida(t.id)} />
                    <ul className="dv-tareas" aria-label="Tus pedidos">
                        {lista.map(t => (
                            <li key={t.id}>
                                <button type="button" className={t.id === actual ? 'is-activa' : ''} aria-current={t.id === actual} onClick={() => setElegida(t.id)}>
                                    <span className="dv-tareas__pedido">#{t.id} · {t.pedido}</span>
                                    <Badge tone={TONO_ESTADO[t.estado]}>{t.estado_nombre}</Badge>
                                </button>
                            </li>
                        ))}
                        {tareas.isSuccess && !lista.length && <li className="dv-vacio">Aún no hay pedidos.</li>}
                    </ul>
                </aside>
                <main className="dv-principal">
                    {actual ? <DetalleTarea id={actual} onCambio={recargar} /> : <div className="dv-vacio">Escribe tu primer pedido a la izquierda.</div>}
                </main>
            </div>
        </div>
    );
}
