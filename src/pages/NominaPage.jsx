import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FaCog, FaFileExcel, FaMoneyCheckAlt, FaPlus } from 'react-icons/fa';
import { usePermissions } from '../AppContext';
import { Badge, Button, PageHeader } from '../components/ui';
import { ErrorState } from '../components/ui/States';
import CierreGeneral from '../components/nomina/CierreGeneral';
import ConfigNomina from '../components/nomina/ConfigNomina';
import DetalleAsesor from '../components/nomina/DetalleAsesor';
import { mensajeDeError } from '../services/errores';
import * as servicio from '../services/nominaService';
import { exportarCierre, fecha } from '../utils/nomina';
import './NominaPage.css';

function NuevoCierre({ sugerido, cancelar, creado }) {
    const [datos, setDatos] = useState({ fecha_inicio: sugerido?.fecha_inicio || '', fecha_fin: sugerido?.fecha_fin || '', nombre: '' });
    const crear = useMutation({ mutationFn: () => servicio.crearCierre(datos), onSuccess: creado });
    return (
        <form className="nom-nuevo" onSubmit={e => { e.preventDefault(); if (!crear.isPending) crear.mutate(); }}>
            <label>Desde<input className="nom-input" type="date" required value={datos.fecha_inicio} onChange={e => setDatos(d => ({ ...d, fecha_inicio: e.target.value }))} /></label>
            <label>Hasta<input className="nom-input" type="date" required value={datos.fecha_fin} onChange={e => setDatos(d => ({ ...d, fecha_fin: e.target.value }))} /></label>
            <label>Nombre <small>(opcional)</small><input className="nom-input" value={datos.nombre} placeholder="Nómina de octubre" onChange={e => setDatos(d => ({ ...d, nombre: e.target.value }))} /></label>
            <div className="nom-nuevo__acciones">
                <Button type="submit" loading={crear.isPending}>Crear cierre</Button>
                <Button variant="secondary" onClick={cancelar}>Cancelar</Button>
            </div>
            {crear.isError && <p role="alert">{mensajeDeError(crear.error)}</p>}
        </form>
    );
}

// La nómina se cierra por asesor (en su pestaña); el estado general se deriva de ellos.
function AccionesCierre({ cierre, puede, ejecutar, pendiente }) {
    if (!puede) return <Button variant="secondary" icon={FaFileExcel} onClick={() => exportarCierre(cierre)}>Exportar a Excel</Button>;
    return (
        <div className="nom-acciones">
            <Button variant="secondary" icon={FaFileExcel} onClick={() => exportarCierre(cierre)}>Exportar a Excel</Button>
            {cierre.estado === 'borrador' && (
                <Button variant="secondary" onClick={() => ejecutar('regenerar')} loading={pendiente === 'regenerar'}>Recalcular abiertos</Button>
            )}
            {!cierre.asesores_cerrados && (
                <Button variant="danger" onClick={() => { if (window.confirm('¿Borrar este cierre? Ningún asesor está cerrado.')) ejecutar('borrar'); }}>Borrar</Button>
            )}
        </div>
    );
}

const estadoGeneral = (c) => (c.estado === 'cerrado' ? ['Cerrado', 'success'] : ['Abierto', 'warning']);

// Nómina de asesores (D12a): reemplaza a Comisiones.
export default function NominaPage() {
    const navigate = useNavigate();
    const hasPermission = usePermissions();
    const puede = hasPermission('GESTIONAR_NOMINA');
    const qc = useQueryClient();
    const [params, setParams] = useSearchParams();
    const [nuevo, setNuevo] = useState(false);
    const [config, setConfig] = useState(false);
    const lista = useQuery({ queryKey: ['nomina', 'cierres'], queryFn: servicio.listarCierres });
    const cierres = lista.data?.cierres || [];
    const id = params.get('cierre') || (cierres[0] && String(cierres[0].id)) || null;
    const vista = params.get('vista') || 'general';
    const detalle = useQuery({ queryKey: ['nomina', 'cierre', id], queryFn: () => servicio.obtenerCierre(id), enabled: Boolean(id) });
    const ir = (cambios) => setParams(p => {
        const n = new URLSearchParams(p);
        Object.entries(cambios).forEach(([k, v]) => (v == null ? n.delete(k) : n.set(k, v)));
        return n;
    });
    useEffect(() => { if (id && !params.get('cierre')) ir({ cierre: id }); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const alActualizar = (data) => {
        qc.setQueryData(['nomina', 'cierre', String(data.id)], data);
        qc.invalidateQueries({ queryKey: ['nomina', 'cierres'] });
    };
    const operacion = useMutation({
        mutationFn: ({ tipo, objetivo, datos }) => ({
            linea: () => servicio.editarLinea(objetivo, datos),
            asesor: () => servicio.editarAsesorCierre(objetivo, datos),
            ajuste: () => servicio.agregarAjuste(objetivo, datos),
            borrar: () => servicio.borrarLinea(objetivo),
            cerrarAsesor: () => servicio.accionAsesor(objetivo, 'cerrar'),
            reabrirAsesor: () => servicio.accionAsesor(objetivo, 'reabrir'),
        }[tipo])(),
        onSuccess: alActualizar,
    });
    const accion = useMutation({
        mutationFn: async ({ nombre, datos }) => {
            if (nombre === 'borrar') { await servicio.borrarCierre(id); return null; }
            return servicio.accionCierre(id, nombre, datos);
        },
        onSuccess: (data) => {
            if (data) alActualizar(data);
            else { qc.invalidateQueries({ queryKey: ['nomina', 'cierres'] }); ir({ cierre: null, vista: null }); }
        },
    });
    const cierre = detalle.data;
    const asesorActivo = cierre?.asesores.find(a => String(a.id) === vista);
    const editable = puede && asesorActivo?.estado !== 'cerrado';
    const error = operacion.error || accion.error;

    return (
        <div className="nom-page">
            <PageHeader icon={FaMoneyCheckAlt} title="Nómina" subtitle="Comisiones, bonificaciones, ajustes y básico de los asesores"
                actions={<>
                    <Button variant="secondary" icon={FaMoneyCheckAlt} onClick={() => navigate('/comprobantes-egreso?nomina=1')}>Pagar nómina</Button>
                    <Button variant="secondary" icon={FaCog} onClick={() => setConfig(true)}>Configuración</Button>
                    {puede && <Button icon={FaPlus} onClick={() => setNuevo(true)}>Nuevo cierre</Button>}
                </>} />
            {nuevo && <NuevoCierre sugerido={lista.data?.periodo_sugerido} cancelar={() => setNuevo(false)}
                creado={(data) => { alActualizar(data); setNuevo(false); ir({ cierre: String(data.id), vista: null }); }} />}

            {lista.isError ? <ErrorState message={mensajeDeError(lista.error)} onRetry={lista.refetch} />
                : lista.isPending ? <p role="status">Cargando…</p>
                    : !cierres.length ? <p className="nom-vacio">Aún no hay cierres. Crea el primero con «Nuevo cierre»: se calcula con las ventas del período.</p> : (
                        <>
                            <div className="nom-selector">
                                <label className="nom-selector__campo">
                                    <span>Cierre de nómina</span>
                                    <select value={id || ''} onChange={e => ir({ cierre: e.target.value, vista: null })} aria-label="Cierre de nómina">
                                        {cierres.map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre} · {fecha(c.fecha_inicio)} al {fecha(c.fecha_fin)} · {estadoGeneral(c)[0]}</option>
                                        ))}
                                    </select>
                                </label>
                                <span className="nom-selector__total">{cierres.length} {cierres.length === 1 ? 'cierre' : 'cierres'}</span>
                            </div>
                            {detalle.isError ? <ErrorState message={mensajeDeError(detalle.error)} onRetry={detalle.refetch} />
                                : !cierre ? <p role="status">Cargando cierre…</p> : (
                                    <section className="nom-cierre">
                                        <header className="nom-cierre__cabecera">
                                            <div>
                                                <h2>{cierre.nombre}</h2>
                                                <p>Ventas del {fecha(cierre.fecha_inicio)} al {fecha(cierre.fecha_fin)}
                                                    {' · '}<Badge tone={estadoGeneral(cierre)[1]}>{estadoGeneral(cierre)[0]}</Badge>
                                                    {' '}<span className="nom-muted">{cierre.asesores_cerrados ?? 0} de {cierre.asesores_total ?? cierre.asesores.length} asesores cerrados</span></p>
                                            </div>
                                            <AccionesCierre cierre={cierre} puede={puede} pendiente={accion.isPending ? accion.variables?.nombre : null}
                                                ejecutar={(nombre, datos) => accion.mutate({ nombre, datos })} />
                                        </header>
                                        {error && <p role="alert" className="nom-error">{mensajeDeError(error)}</p>}
                                        <nav className="nom-vistas" aria-label="Vistas del cierre">
                                            <button type="button" className={vista === 'general' ? 'is-activo' : ''} onClick={() => ir({ vista: null })}>Cierre general</button>
                                            {cierre.asesores.map(a => (
                                                <button key={a.id} type="button" className={String(a.id) === vista ? 'is-activo' : ''} onClick={() => ir({ vista: String(a.id) })}>
                                                    {a.nombre}{a.estado === 'cerrado' && <span className="nom-candado" title="Nómina cerrada"> ✓</span>}
                                                </button>
                                            ))}
                                        </nav>
                                        {asesorActivo ? (
                                            <DetalleAsesor cierre={cierre} asesor={asesorActivo} editable={editable} puede={puede}
                                                ocupado={operacion.isPending}
                                                operar={(tipo, objetivo, datos) => operacion.mutate({ tipo, objetivo, datos })} />
                                        ) : <CierreGeneral cierre={cierre} abrirAsesor={(fid) => ir({ vista: String(fid) })} />}
                                    </section>
                                )}
                        </>
                    )}
            {config && <ConfigNomina cerrar={() => setConfig(false)} editable={puede} />}
        </div>
    );
}
