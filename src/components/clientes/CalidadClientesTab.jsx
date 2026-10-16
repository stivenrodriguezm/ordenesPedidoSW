import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaCheckCircle, FaSearch, FaUserCheck } from 'react-icons/fa';
import { Badge, Button, Modal, PageHeader, Tabs } from '../ui';
import { ErrorState } from '../ui/States';
import Paginacion from '../tesoreria/Paginacion';
import { usePermissions } from '../../AppContext';
import { useCalidadClientes } from '../../hooks/useCalidadClientes';
import { useIdempotencia } from '../../hooks/useIdempotencia';
import { mensajeDeError } from '../../services/errores';
import * as servicio from '../../services/calidadClientesService';
import { fechaHora } from '../../utils/tesoreria';
import './CalidadClientesTab.css';

const ETIQUETAS = { nombre: 'Nombre', cedula: 'Documento', correo: 'Correo', telefono1: 'Teléfono 1', telefono2: 'Teléfono 2', direccion: 'Dirección', barrio: 'Barrio', ciudad: 'Ciudad' };

// Motivo corto para la tarjeta; el texto completo queda en el título.
const motivoCorto = (razon) => (razon.startsWith('Documento') ? 'Mismo documento'
    : razon.includes('teléfono') ? 'Mismo nombre y teléfono'
        : razon.includes('correo') ? 'Mismo nombre y correo' : 'Coincidencia');

function Historial({ id }) {
    const [page, setPage] = useState(1);
    const consulta = useCalidadClientes(['historial', id, page], () => servicio.historialCalidad(id, page));
    return (
        <section className="cq-seccion">
            <h4>Correcciones anteriores</h4>
            {consulta.isPending ? <p role="status" className="cq-muted">Cargando historial…</p>
                : consulta.isError ? <ErrorState message={mensajeDeError(consulta.error)} onRetry={consulta.refetch} />
                    : !consulta.data.count ? <p className="cq-muted">Esta ficha no tiene correcciones registradas.</p> : <>
                        {consulta.data.results.map(h => (
                            <article className="cq-historial" key={h.id}>
                                <span className="cq-muted">{fechaHora(h.fecha)} · {h.responsable}</span>
                                <ul>{Object.entries(h.cambios).map(([campo, v]) => (
                                    <li key={campo}><strong>{ETIQUETAS[campo]}:</strong> <span className="cq-antes">{v.antes}</span> → <span className="cq-despues">{v.despues}</span></li>
                                ))}</ul>
                            </article>
                        ))}
                        <Paginacion pagina={page} datos={consulta.data} cambiar={setPage} nombre="correcciones" />
                    </>}
        </section>
    );
}

function FormularioFicha({ id, vista, alGuardar, recargar, recargando }) {
    const hasPermission = usePermissions();
    const permitido = hasPermission('EDITAR_CLIENTE') && hasPermission('NORMALIZAR_CLIENTES');
    const [seleccion, setSeleccion] = useState([]);
    const { cabeceras, confirmar } = useIdempotencia();
    const qc = useQueryClient();
    const cambios = Object.entries(vista.cambios);
    const guardar = useMutation({
        mutationFn: () => servicio.normalizarCliente(id, { version: vista.version, campos: seleccion }, cabeceras({ id, version: vista.version, campos: seleccion })),
        retry: false,
        onSuccess: async (r) => { confirmar(); await qc.invalidateQueries({ queryKey: ['calidad-clientes'] }); alGuardar(r.revision); },
    });
    return <>
        <p className="cq-muted">Documento {vista.cliente.cedula || '—'}. Marca lo que quieras corregir. Se guardan los valores anteriores; el documento, los saldos y las ventas no cambian.</p>
        {cambios.length ? (
            <form onSubmit={e => { e.preventDefault(); if (seleccion.length && !guardar.isPending) guardar.mutate(); }}>
                <div className="ds-table-wrap"><div className="ds-table-scroll">
                    <table className="ds-table cq-tabla">
                        <thead><tr><th className="cq-col-check">Aplicar</th><th>Campo</th><th>Ahora</th><th>Quedaría</th></tr></thead>
                        <tbody>{cambios.map(([campo, v]) => (
                            <tr key={campo}>
                                <td className="cq-col-check"><input type="checkbox" aria-label={`Corregir ${ETIQUETAS[campo]}`} disabled={!permitido || guardar.isPending}
                                    checked={seleccion.includes(campo)} onChange={e => setSeleccion(prev => (e.target.checked ? [...prev, campo] : prev.filter(c => c !== campo)))} /></td>
                                <td><strong>{ETIQUETAS[campo]}</strong></td>
                                <td className="cq-antes">{v.antes || '—'}</td>
                                <td className="cq-despues">{v.despues || '—'}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div></div>
                {guardar.isError && <div className="cq-alerta">
                    <p role="alert" className="cq-error">{mensajeDeError(guardar.error)}</p>
                    {guardar.error?.response?.status === 409 && <Button variant="secondary" size="sm" loading={recargando} onClick={recargar}>Volver a cargar ficha</Button>}
                </div>}
                {permitido ? (
                    <div className="cq-form-acciones">
                        <Button type="submit" disabled={!seleccion.length || guardar.isPending} loading={guardar.isPending}>Guardar correcciones seleccionadas</Button>
                    </div>
                ) : <p className="cq-muted">Para aplicar se necesitan los permisos de editar y normalizar clientes.</p>}
            </form>
        ) : <p className="cq-ok"><FaCheckCircle /> Esta ficha no tiene nada por corregir.</p>}
    </>;
}

function RevisionFicha({ id, cerrar, alGuardar }) {
    const consulta = useCalidadClientes(['ficha', id], () => servicio.consultarCalidad(id));
    const vista = consulta.data;
    return (
        <Modal open onClose={cerrar} title={vista ? `Corregir ficha · ${vista.cliente.nombre.trim()}` : 'Corregir ficha'} size="lg">
            {consulta.isPending ? <p role="status" className="cq-muted">Cargando ficha…</p>
                : consulta.isError ? <ErrorState message={mensajeDeError(consulta.error)} onRetry={consulta.refetch} />
                    : <FormularioFicha key={vista.version} id={id} vista={vista} alGuardar={alGuardar} recargar={consulta.refetch} recargando={consulta.isFetching} />}
            <Historial id={id} />
        </Modal>
    );
}

function Comparacion({ ids, cerrar }) {
    const consulta = useCalidadClientes(['comparar', ids], () => servicio.compararClientes(ids));
    const d = consulta.data;
    return (
        <Modal open onClose={cerrar} title="Comparar fichas" size="lg">
            {consulta.isPending ? <p role="status" className="cq-muted">Comparando…</p>
                : consulta.isError ? <ErrorState message={mensajeDeError(consulta.error)} onRetry={consulta.refetch} /> : <>
                    <div className="ds-table-wrap"><div className="ds-table-scroll">
                        <table className="ds-table cq-tabla">
                            <thead><tr><th>Campo</th><th>Ficha #{d.origen.id}</th><th>Ficha #{d.destino.id}</th></tr></thead>
                            <tbody>{Object.entries(ETIQUETAS).map(([campo, etiqueta]) => {
                                const distinto = d.conflictos.includes(campo);
                                return (
                                    <tr key={campo} className={distinto ? 'cq-fila-distinta' : ''}>
                                        <td><strong>{etiqueta}</strong>{distinto && <span className="cq-chip cq-chip--aviso">Diferente</span>}</td>
                                        <td>{d.origen[campo] || <span className="cq-muted">—</span>}</td>
                                        <td>{d.destino[campo] || <span className="cq-muted">—</span>}</td>
                                    </tr>
                                );
                            })}</tbody>
                        </table>
                    </div></div>
                    <p className="cq-muted">Ventas en tu alcance: {d.ventas_visibles.origen} en la ficha #{d.origen.id} y {d.ventas_visibles.destino} en la #{d.destino.id}. Esta vista no une fichas ni mueve documentos.</p>
                </>}
        </Modal>
    );
}

function GrupoDuplicados({ grupo, comparar }) {
    const [elegidos, setElegidos] = useState(grupo.clientes.slice(0, 2).map(c => c.id));
    const alternar = (id) => setElegidos(e => (e.includes(id) ? e.filter(x => x !== id) : [...e, id].slice(-2)));
    return (
        <article className="cq-grupo">
            <header className="cq-grupo__cabecera">
                <strong>{grupo.clientes.length} fichas</strong>
                <div className="cq-grupo__motivos">{grupo.razones.map(r => <span key={r} className="cq-chip" title={r}>{motivoCorto(r)}</span>)}</div>
            </header>
            <ul className="cq-grupo__fichas">
                {grupo.clientes.map(c => (
                    <li key={c.id} className={elegidos.includes(c.id) ? 'is-elegida' : ''}>
                        <label>
                            <input type="checkbox" checked={elegidos.includes(c.id)} onChange={() => alternar(c.id)} aria-label={`Elegir ficha ${c.id}`} />
                            <span className="cq-ficha__nombre">{c.nombre}<small>#{c.id}</small></span>
                            <span className="cq-ficha__dato">{c.cedula || '—'}</span>
                            <span className="cq-ficha__dato">{c.telefono1 || c.correo || '—'}</span>
                            <span className="cq-ficha__dato cq-ficha__ciudad">{c.ciudad || ''}</span>
                        </label>
                    </li>
                ))}
            </ul>
            <footer>
                <Button variant="secondary" size="sm" disabled={elegidos.length !== 2} onClick={() => comparar({ origen: elegidos[0], destino: elegidos[1] })}>Comparar las 2 elegidas</Button>
            </footer>
        </article>
    );
}

// Calidad de clientes como pestaña de Bases de datos (2026-10-07).
export default function CalidadClientesTab() {
    const [vista, setVista] = useState('duplicados');
    const [texto, setTexto] = useState('');
    const [buscar, setBuscar] = useState('');
    const [page, setPage] = useState(1);
    const [ficha, setFicha] = useState(null);
    const [comparacion, setComparacion] = useState(null);
    const [mensaje, setMensaje] = useState('');
    const duplicados = vista === 'duplicados';
    const params = duplicados ? { buscar, page } : { buscar, page, con_correcciones: 1 };
    const consulta = useCalidadClientes([vista, params], () => (duplicados ? servicio.listarCandidatos(params) : servicio.listarCalidad(params)));
    const cambiarVista = (v) => { setVista(v); setPage(1); };
    return (
        <div className="ds-page cq">
            <PageHeader icon={FaUserCheck} title="Calidad de clientes" subtitle="Posibles duplicados y fichas con datos mal escritos"
                actions={(
                    <form className="cq-buscar" onSubmit={e => { e.preventDefault(); setBuscar(texto.trim()); setPage(1); }}>
                        <FaSearch aria-hidden="true" />
                        <input aria-label="Buscar cliente, documento o contacto" placeholder="Buscar cliente, documento o teléfono" value={texto} maxLength={100}
                            onChange={e => setTexto(e.target.value)} onBlur={() => { if (texto.trim() !== buscar) { setBuscar(texto.trim()); setPage(1); } }} />
                    </form>
                )} />
            <div className="cq-barra">
                <Tabs tabs={[{ id: 'duplicados', label: 'Posibles duplicados' }, { id: 'formato', label: 'Fichas por corregir' }]} active={vista} onChange={cambiarVista} />
                <span className="cq-muted">Son sugerencias para revisar: no se une ni se cambia nada automáticamente.</span>
            </div>
            {mensaje && <p role="status" className="cq-ok"><FaCheckCircle /> {mensaje}</p>}
            {consulta.isPending ? <p role="status" className="cq-muted">Revisando clientes…</p>
                : consulta.isError ? <ErrorState message={mensajeDeError(consulta.error)} onRetry={consulta.refetch} />
                    : !consulta.data.count ? (
                        <p className="cq-vacio"><FaCheckCircle /> {duplicados ? 'No se encontraron posibles duplicados.' : 'No hay fichas con datos por corregir.'}</p>
                    ) : duplicados ? <>
                        <p className="cq-muted">{consulta.data.count} grupo{consulta.data.count === 1 ? '' : 's'} entre {consulta.data.clientes_revisados} clientes. Elige dos fichas de un grupo para compararlas.</p>
                        <div className="cq-grupos">{consulta.data.results.map(g => <GrupoDuplicados key={g.id} grupo={g} comparar={setComparacion} />)}</div>
                    </> : (
                        <div className="ds-table-wrap"><div className="ds-table-scroll">
                            <table className="ds-table ds-table--clickable cq-tabla">
                                <thead><tr><th>Cliente</th><th>Documento</th><th>Qué se corregiría</th><th /></tr></thead>
                                <tbody>{consulta.data.results.map(v => (
                                    <tr key={v.cliente.id} onClick={() => { setMensaje(''); setFicha(v.cliente.id); }}>
                                        <td><strong>{v.cliente.nombre}</strong><small className="cq-sub">#{v.cliente.id}</small></td>
                                        <td>{v.cliente.cedula || '—'}</td>
                                        <td><div className="cq-chips">{Object.keys(v.cambios).map(c => <Badge key={c} tone="warning">{ETIQUETAS[c]}</Badge>)}</div></td>
                                        <td className="cq-accion"><Button size="sm" variant="secondary" aria-label={`Revisar cliente ${v.cliente.id}`}
                                            onClick={e => { e.stopPropagation(); setMensaje(''); setFicha(v.cliente.id); }}>Revisar</Button></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div></div>
                    )}
            {consulta.data?.count > 0 && <Paginacion pagina={page} datos={consulta.data} cambiar={setPage} nombre={duplicados ? 'grupos' : 'fichas'} />}
            {ficha && <RevisionFicha id={ficha} cerrar={() => setFicha(null)} alGuardar={() => { setFicha(null); setMensaje('Correcciones guardadas. Los valores anteriores quedaron en el historial.'); }} />}
            {comparacion && <Comparacion ids={comparacion} cerrar={() => setComparacion(null)} />}
        </div>
    );
}
