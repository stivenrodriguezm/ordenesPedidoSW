import React, { useContext, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FaArrowLeft, FaCalendarAlt, FaCheck, FaDownload, FaPlus, FaUniversity } from 'react-icons/fa';
import { AppContext, usePermissions } from '../../AppContext';
import { Badge, Button, Modal, PageHeader } from '../../components/ui';
import { useIdempotencia } from '../../hooks/useIdempotencia';
import { useBorrador } from '../../hooks/useBorrador';
import { mensajeDeError } from '../../services/errores';
import { getTodayStr } from '../../utils/dates';
import * as api from '../../services/pagosBancariosService';
import CuentasBancarias, { SelectorCuenta } from './CuentasBancarias';
import { etiquetaCuenta } from './cuentas';
import { leerPesos, mostrarPesosAPI as cop, validarPesos } from './pesos';
import BeneficiariosBancarios from './BeneficiariosBancarios';
import './PagosBancarios.css';

const estados = { borrador: 'Borrador', exportado: 'Archivo generado', anulado: 'Anulado' };
const Error = ({ error }) => error ? <p role="alert" className="pb-error">{!error.response && !error.isAxiosError ? error.message : mensajeDeError(error)}</p> : null;

function CampoPesos({ value, onChange, label, disabled }) {
    return <label>{label}<input className="ds-input pb-money" inputMode="numeric" value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        onBlur={() => { const n = leerPesos(value); if (n !== null) onChange(cop(n)); }} /></label>;
}

export function PrepararNomina({ abrir, cerrar }) {
    const idempotencia = useIdempotencia();
    const [periodo, setPeriodo] = useState(getTodayStr().slice(0, 7));
    const periodoRef = useRef(null);
    const crear = useMutation({ mutationFn: () => { const d = { tipo: 'nomina', periodo: periodoRef.current?.value ?? periodo }; return api.crearLote(d, idempotencia.cabeceras(d)); }, onSuccess: d => { idempotencia.confirmar(); abrir(d); } });
    return <Modal open title="Preparar nómina del mes" onClose={cerrar} footer={<><Button variant="secondary" onClick={cerrar}>Cancelar</Button><Button onClick={() => crear.mutate()} loading={crear.isPending}>Preparar nómina</Button></>}><div className="pb-form"><label>Mes de pago<input ref={periodoRef} type="month" className="ds-input" value={periodo} onChange={e => setPeriodo(e.target.value)} /></label><p className="pb-note">Revisa las cuentas y ajusta el pago de cada empleado antes de descargar. Si el mes ya existe, se abre su preparación guardada.</p><Error error={crear.error} /></div></Modal>;
}

export function EditorLote({ lote, actualizado, puedeEditar, puedeExportar }) {
    const { usuario } = useContext(AppContext);
    const permisos = usePermissions();
    const qc = useQueryClient();
    const [nombre, setNombre] = useState(lote.nombre);
    const [fecha, setFecha] = useState(lote.fecha_pago);
    const [origen, setOrigen] = useState(String(lote.cuenta_origen || ''));
    const [pagos, setPagos] = useState(lote.pagos.map(p => ({ ...p, valorTexto: cop(p.valor) })));
    const [dirty, setDirty] = useState(false);
    const [revisar, setRevisar] = useState(false);
    const [anular, setAnular] = useState(false);
    const [motivo, setMotivo] = useState('');
    const [noProcesado, setNoProcesado] = useState(false);
    const [confirmando, setConfirmando] = useState(null);
    const [confirmarGrupo, setConfirmarGrupo] = useState(false);
    const [seleccionConfirmar, setSeleccionConfirmar] = useState([]);
    const [referenciaBanco, setReferenciaBanco] = useState('');
    const [esReintento, setEsReintento] = useState(false);
    const [rechazoConfirmado, setRechazoConfirmado] = useState(false);
    const idempotenciaReintento = useIdempotencia();
    const editable = puedeEditar && lote.estado === 'borrador';
    const borrador = useBorrador({ clave: `pago-lote-${lote.id}-revision-${lote.revision}`, dueno: usuario?.id, version: 1,
        datos: { nombre, fecha, origen, pagos: pagos.map(p => ({ id: p.id, cuenta: p.cuenta, incluido: p.incluido, valorTexto: p.valorTexto })) }, hayContenido: dirty && editable,
        restaurar: d => { if (!editable) return; setNombre(d.nombre); setFecha(d.fecha); setOrigen(d.origen); setPagos(ps => ps.map(p => ({ ...p, ...d.pagos.find(x => x.id === p.id) }))); setDirty(true); },
    });
    const cambiar = (id, d) => { setDirty(true); setPagos(ps => ps.map(p => p.id === id ? { ...p, ...d } : p)); };
    const guardar = useMutation({ mutationFn: () => api.guardarLote(lote.id, {
        revision: lote.revision, nombre, fecha_pago: fecha, cuenta_origen: origen || null,
        pagos: pagos.map(p => ({ id: p.id, cuenta: p.cuenta || null, incluido: p.incluido,
            ...(lote.tipo === 'nomina' ? { valor: validarPesos(p.valorTexto) } : {}) })),
    }), onSuccess: d => { borrador.limpiarTrasGuardar(); actualizado(d); } });
    const descargar = useMutation({ mutationFn: () => api.descargarArchivo(lote.id, lote.revision, lote.huella_revision), onSuccess: async () => {
        setRevisar(false); actualizado(await api.lote(lote.id)); qc.invalidateQueries({ queryKey: ['pagos', 'pendientes'] });
    } });
    const cancelacion = useMutation({ mutationFn: () => api.anularLote(lote.id, { revision: lote.revision, motivo, archivo_no_procesado: noProcesado }), onSuccess: actualizado });
    const corregir = useMutation({ mutationFn: () => api.corregirLote(lote.id, lote.revision), onSuccess: actualizado });
    const confirmar = useMutation({ mutationFn: () => api.confirmarCE(confirmando.comprobante), onSuccess: async () => { setConfirmando(null); actualizado(await api.lote(lote.id)); } });
    const confirmarVarios = useMutation({ mutationFn: () => api.confirmarPagos(lote.id, { comprobantes: seleccionConfirmar, referencia: referenciaBanco }), onSuccess: d => { setConfirmarGrupo(false); actualizado(d); } });
    const reintentar = useMutation({ mutationFn: () => { const datos = { revision: lote.revision, comprobantes: seleccionConfirmar, referencia: referenciaBanco, rechazo_confirmado: rechazoConfirmado }; return api.reintentarPagos(lote.id, datos, idempotenciaReintento.cabeceras(datos)); }, onSuccess: d => { idempotenciaReintento.confirmar(); setConfirmarGrupo(false); actualizado(d); } });
    const incluidos = pagos.filter(p => p.incluido);
    const total = incluidos.reduce((s,p) => s + (leerPesos(p.valorTexto) ?? 0), 0);
    return <section className="pb-editor">
        <div className="pb-section-title"><div><span className="pb-eyebrow">AGRUPACIÓN DE CE · {lote.id}</span><h2>{lote.nombre}</h2></div><Badge variant={lote.estado === 'borrador' ? 'warning' : lote.estado === 'anulado' ? 'neutral' : 'success'}>{estados[lote.estado]}</Badge></div>
        <div className="pb-form-grid">
            <label>Nombre del archivo<input className="ds-input" value={nombre} maxLength={120} disabled={!editable} onChange={e => { setNombre(e.target.value); setDirty(true); }} /></label>
            <label>Fecha de pago<input type="date" className="ds-input" value={fecha} min={getTodayStr()} disabled={!editable} onChange={e => { setFecha(e.target.value); setDirty(true); }} /></label>
        </div>
        {lote.estado === 'borrador' ? <SelectorCuenta titular={{ empresa: true }} value={origen} onChange={v => { setOrigen(v); setDirty(true); }} disabled={!editable} label="Cuenta de origen de la empresa" /> : <div className="pb-note"><strong>Origen del archivo</strong><br />{lote.origen_snapshot.numero ? etiquetaCuenta(lote.origen_snapshot) : 'No se generó archivo.'}</div>}
        <p className="pb-muted">{lote.tipo === 'nomina' ? 'Ajusta el pago de cada empleado en este mes. Su pago mensual habitual se conserva.' : 'El importe viene del egreso. Para cambiarlo, edita el CE antes de generar el archivo.'}</p>
        <div className="pb-payments">{pagos.map(p => <article key={p.id} className={`pb-payment ${p.incluido ? '' : 'pb-inactive'}`}>
            <div className="pb-payment-head"><label className="pb-check"><input type="checkbox" checked={p.incluido} disabled={!editable} onChange={e => cambiar(p.id, { incluido: e.target.checked })} /><strong>{p.beneficiario}</strong></label><span>{p.comprobante ? `CE ${p.comprobante}` : 'Nómina'}</span></div>
            <div className="pb-payment-fields">
                {lote.estado === 'borrador' ? <SelectorCuenta titular={p.empleado ? { empleado: p.empleado } : { proveedor: p.proveedor }} value={p.cuenta} onChange={cuenta => cambiar(p.id, { cuenta })} disabled={!editable || !p.incluido} label={`Cuenta de ${p.beneficiario}`} administrar={editable} /> : <div><small>Cuenta del archivo</small><p>{p.cuenta_detalle ? etiquetaCuenta(p.cuenta_detalle) : 'Sin cuenta'}</p><small>{p.cuenta_detalle?.nombres} {p.cuenta_detalle?.apellidos}</small></div>}
                {lote.tipo === 'nomina' && editable ? <CampoPesos label={`Pago de ${p.beneficiario}`} value={p.valorTexto} onChange={valorTexto => cambiar(p.id, { valorTexto })} disabled={!p.incluido} /> : <strong className="pb-payment-amount">{cop(p.valor)}</strong>}
            </div>
            <div className="pb-payment-foot"><small>{p.concepto}</small>{lote.estado === 'exportado' && p.incluido && (p.rechazado ? <span>Rechazado · tiene lote de reintento</span> : p.estado_pago === 'Pagado' ? <span className="pb-paid"><FaCheck /> Pago confirmado</span> : permisos('APROBAR_EGRESO') && <Button variant="ghost" size="sm" onClick={() => setConfirmando(p)}>Confirmar pago</Button>)}</div>
        </article>)}</div>
        {lote.estado === 'borrador' && !dirty && lote.validaciones.length > 0 && <div className="pb-validation" role="status"><strong>Completa antes de descargar</strong><ul>{lote.validaciones.map((e,i) => <li key={i}>{e}</li>)}</ul></div>}
        {dirty && <p className="pb-note" role="status">Tienes cambios sin guardar. Guarda para validar las cuentas y los importes.</p>}
        {borrador.restaurado && <p className="pb-note" role="status">Se recuperaron tus cambios sin guardar. Revísalos antes de continuar.</p>}
        {lote.estado === 'exportado' && <div className="pb-note"><strong>{lote.confirmados} de {lote.cantidad} pagos confirmados.</strong> El archivo está listo para cargar en Davivienda, seleccionando Nómina o Proveedores y Excel estándar. Elige la cuenta de origen indicada arriba.</div>}
        {lote.estado === 'exportado' && (lote.confirmados > 0 || lote.rechazados > 0) && <p className="pb-note">Este archivo original incluye pagos ya procesados. Para repetir pagos rechazados usa «Preparar reintento», que genera un archivo solo con esos pagos.</p>}
        {lote.estado === 'anulado' && <p className="pb-note">Motivo de anulación: {lote.motivo_anulacion}</p>}
        <Error error={guardar.error || descargar.error || corregir.error} />
        <div className="pb-total-bar"><div><small>{incluidos.length} pagos incluidos</small><strong>{cop(total)}</strong></div><div className="pb-actions">
            {lote.estado === 'exportado' && lote.confirmados + (lote.rechazados || 0) < lote.cantidad && permisos('APROBAR_EGRESO') && <Button onClick={() => { setSeleccionConfirmar([]); setEsReintento(false); setConfirmarGrupo(true); }}>Confirmar varios pagos</Button>}
            {editable && <Button onClick={() => guardar.mutate()} loading={guardar.isPending} disabled={!dirty}>Guardar cambios</Button>}
            {lote.estado !== 'anulado' && puedeExportar && <Button icon={FaDownload} variant={editable ? 'secondary' : 'primary'} disabled={dirty || guardar.isPending || (lote.estado === 'borrador' && lote.validaciones.length > 0)} loading={descargar.isPending} onClick={() => lote.estado === 'exportado' ? descargar.mutate() : setRevisar(true)}>{lote.estado === 'exportado' ? 'Descargar de nuevo' : 'Revisar y descargar'}</Button>}
        </div></div>
        {puedeEditar && lote.estado !== 'anulado' && lote.confirmados === 0 && <Button variant="ghost" size="sm" onClick={() => setAnular(true)}>Anular agrupación</Button>}
        {puedeEditar && lote.estado === 'exportado' && lote.confirmados + (lote.rechazados || 0) < lote.cantidad && <Button variant="ghost" size="sm" onClick={() => { setSeleccionConfirmar([]); setEsReintento(true); setRechazoConfirmado(false); setConfirmarGrupo(true); }}>Preparar reintento de pagos rechazados</Button>}
        {puedeEditar && lote.estado === 'anulado' && <Button variant="secondary" onClick={() => corregir.mutate()} loading={corregir.isPending}>Corregir esta agrupación</Button>}
        {revisar && <Modal open title="Revisa antes de generar el archivo" size="lg" onClose={() => setRevisar(false)} footer={<><Button variant="secondary" onClick={() => setRevisar(false)}>Volver</Button><Button icon={FaDownload} loading={descargar.isPending} onClick={() => descargar.mutate()}>Generar y descargar Excel</Button></>}>
            <p><strong>{incluidos.length} pagos por {cop(total)}</strong> · Fecha: {fecha}</p><p>Se fijarán los importes y las cuentas que revisaste. Para corregir un archivo generado tendrás que anular la agrupación. Los pagos quedarán por confirmar.</p><Error error={descargar.error} />
            <div className="pb-review">{incluidos.map(p => <div key={p.id}><strong>{p.beneficiario} · {cop(p.valor)}</strong><p>{p.cuenta_detalle && etiquetaCuenta(p.cuenta_detalle)}</p><small>{p.cuenta_detalle?.nombres} {p.cuenta_detalle?.apellidos} · Identificación: {p.cuenta_detalle?.documento}</small></div>)}</div>
        </Modal>}
        {anular && <Modal open title="Anular agrupación de pagos" onClose={() => setAnular(false)} footer={<><Button variant="secondary" onClick={() => setAnular(false)}>Volver</Button><Button variant="danger" disabled={!motivo.trim() || (lote.estado === 'exportado' && !noProcesado)} loading={cancelacion.isPending} onClick={() => cancelacion.mutate()}>Anular agrupación</Button></>}>
            <label>Motivo<textarea className="ds-input" value={motivo} maxLength={300} onChange={e => setMotivo(e.target.value)} /></label>
            {lote.estado === 'exportado' && <label className="pb-check"><input type="checkbox" checked={noProcesado} onChange={e => setNoProcesado(e.target.checked)} />Confirmo que el archivo no fue procesado ni quedó programado en el banco.</label>}<Error error={cancelacion.error} />
        </Modal>}
        {confirmando && <Modal open title="Confirmar pago realizado" onClose={() => setConfirmando(null)} footer={<><Button variant="secondary" onClick={() => setConfirmando(null)}>Volver</Button><Button loading={confirmar.isPending} onClick={() => confirmar.mutate()}>Confirmar pago</Button></>}><p>Confirma solo después de verificar que el banco pagó {cop(confirmando.valor)} a {confirmando.beneficiario}, CE {confirmando.comprobante}.</p><Error error={confirmar.error} /></Modal>}
        {confirmarGrupo && <Modal open title={esReintento ? 'Pagos rechazados por el banco' : 'Pagos realizados por el banco'} size="lg" onClose={() => setConfirmarGrupo(false)} footer={<><Button variant="secondary" onClick={() => setConfirmarGrupo(false)}>Volver</Button><Button disabled={!seleccionConfirmar.length || !referenciaBanco.trim() || (esReintento && !rechazoConfirmado)} loading={confirmarVarios.isPending || reintentar.isPending} onClick={() => esReintento ? reintentar.mutate() : confirmarVarios.mutate()}>{esReintento ? 'Preparar reintento' : `Confirmar ${seleccionConfirmar.length} pagos`}</Button></>}>
            <div className="pb-form"><p>{esReintento ? 'Selecciona los pagos cuyo rechazo confirmó el banco. Se abrirá otro borrador con los mismos egresos para corregir sus cuentas y volver a descargar.' : 'Selecciona únicamente los pagos exitosos en el resultado del banco. Los demás seguirán pendientes.'}</p>{!esReintento && <label className="pb-check"><input type="checkbox" checked={seleccionConfirmar.length > 0 && seleccionConfirmar.length === incluidos.filter(p => p.estado_pago !== 'Pagado' && !p.rechazado).length} onChange={e => setSeleccionConfirmar(e.target.checked ? incluidos.filter(p => p.estado_pago !== 'Pagado' && !p.rechazado).map(p => p.comprobante) : [])} />Todos los pagos pendientes fueron exitosos</label>}
                {incluidos.filter(p => p.estado_pago !== 'Pagado' && !p.rechazado).map(p => <label className="pb-check" key={p.id}><input type="checkbox" checked={seleccionConfirmar.includes(p.comprobante)} onChange={e => setSeleccionConfirmar(a => e.target.checked ? [...a, p.comprobante] : a.filter(id => id !== p.comprobante))} />{p.beneficiario} · {cop(p.valor)}</label>)}
                <label>Referencia de la operación bancaria<input className="ds-input" maxLength={120} value={referenciaBanco} onChange={e => setReferenciaBanco(e.target.value)} /></label>{esReintento && <label className="pb-check"><input type="checkbox" checked={rechazoConfirmado} onChange={e => setRechazoConfirmado(e.target.checked)} />Verifiqué que fueron rechazados y no están pendientes ni programados en el banco.</label>}<Error error={confirmarVarios.error || reintentar.error} />
            </div>
        </Modal>}
    </section>;
}

function EmpleadoForm({ empleado, usuarios, cerrar }) {
    const idempotencia = useIdempotencia();
    const qc = useQueryClient();
    const [d, setD] = useState({ nombre: '', usuario: '', activo: true, ...empleado, pago: cop(empleado?.pago_mensual || 0) });
    const guardar = useMutation({ mutationFn: () => { const datos = { id: d.id, nombre: d.nombre, usuario: d.usuario || null, activo: d.activo, pago_mensual: validarPesos(d.pago) }; return api.guardarEmpleado(datos, idempotencia.cabeceras(datos)); }, onSuccess: () => { idempotencia.confirmar(); qc.invalidateQueries({ queryKey: ['pagos', 'empleados'] }); qc.invalidateQueries({ queryKey: ['pagos', 'beneficiarios'] }); cerrar(); } });
    return <Modal open title={empleado ? 'Editar empleado' : 'Vincular empleado'} onClose={cerrar} hayCambios footer={<><Button variant="secondary" onClick={cerrar}>Cancelar</Button><Button type="submit" form="pb-empleado" loading={guardar.isPending}>Guardar empleado</Button></>}>
        <form className="pb-form" id="pb-empleado" onSubmit={e => { e.preventDefault(); if (!guardar.isPending) guardar.mutate(); }}>
            <label>Usuario de la plataforma<select required className="ds-input" value={d.usuario || ''} onChange={e => { const u = usuarios.find(u => String(u.id) === e.target.value); setD(x => ({ ...x, usuario: e.target.value, ...(u ? { nombre: u.nombre, pago: cop(u.basico) } : {}) })); }}><option value="">Selecciona el empleado de la plataforma</option>{usuarios.map(u => <option value={u.id} key={u.id}>{u.nombre}</option>)}</select></label>
            <label>Nombre del empleado<input required maxLength={160} className="ds-input" value={d.nombre} onChange={e => setD(x => ({ ...x, nombre: e.target.value }))} /></label>
            <CampoPesos label="Pago mensual habitual" value={d.pago} onChange={pago => setD(x => ({ ...x, pago }))} />
            <p className="pb-muted">Importe que se propondrá cada mes. Incluye el neto que deseas pagar; los ajustes del mes se hacen al preparar los CE.</p>
            <label className="pb-check"><input type="checkbox" checked={d.activo} onChange={e => setD(x => ({ ...x, activo: e.target.checked }))} />Incluir en nuevas nóminas</label><Error error={guardar.error} />
        </form>
    </Modal>;
}

function Empleados({ puede, abrirId }) {
    const q = useQuery({ queryKey: ['pagos', 'empleados'], queryFn: api.empleados });
    const [editar, setEditar] = useState(abrirId ? { abrirId } : undefined);
    const [cuentasDe, setCuentasDe] = useState(null);
    return <section className="pb-card"><div className="pb-section-title"><div><h2>Empleados y sus cuentas</h2><p className="pb-muted">Vincula un usuario de la plataforma, define su pago y agrega sus cuentas.</p></div>{puede && <Button icon={FaPlus} onClick={() => setEditar(null)}>Vincular empleado</Button>}</div>
        <Error error={q.error} />{q.isPending ? <p role="status">Cargando empleados…</p> : <div className="pb-employee-list">{q.data?.empleados.map(e => <article key={e.id} className="pb-employee">
            <div><h3>{e.nombre}</h3><small>{e.activo ? 'Activo' : 'Inactivo'} · {e.cuentas.filter(c => c.activa).length} cuentas activas</small></div><strong>{cop(e.pago_mensual)}<small>Pago mensual</small></strong>
            <div className="pb-actions"><Button variant="secondary" size="sm" onClick={() => setCuentasDe(e)}>Cuentas bancarias</Button>{puede && <Button variant="ghost" size="sm" onClick={() => setEditar(e)}>Editar</Button>}</div>
        </article>)}{!q.data?.empleados.length && <p className="pb-empty">Agrega los empleados y su pago mensual para preparar la primera nómina.</p>}</div>}
        {editar !== undefined && q.data && <EmpleadoForm empleado={editar?.abrirId ? q.data.empleados.find(e => e.id === editar.abrirId) : editar} usuarios={q.data?.usuarios || []} cerrar={() => setEditar(undefined)} />}
        {cuentasDe && <Modal open title={`Cuentas de ${cuentasDe.nombre}`} size="lg" onClose={() => setCuentasDe(null)}><CuentasBancarias titular={{ empleado: cuentasDe.id }} editable={puede} /></Modal>}
    </section>;
}

function ProgramacionForm({ cfg, puede }) {
    const qc = useQueryClient();
    const [d, setD] = useState({ ...cfg, cuenta_origen: String(cfg.cuenta_origen_id || '') });
    const [dirty, setDirty] = useState(false);
    const cambiar = datos => { setDirty(true); setD(x => ({ ...x, ...datos })); };
    const guardar = useMutation({ mutationFn: () => api.guardarProgramacion({ ...d, dia: Number(d.dia), cuenta_origen: d.cuenta_origen || null }), onSuccess: data => { setDirty(false); setD({ ...data, cuenta_origen: String(data.cuenta_origen_id || '') }); qc.setQueryData(['pagos', 'programacion'], data); } });
    return <form className="pb-card pb-form" onSubmit={e => { e.preventDefault(); if (!guardar.isPending) guardar.mutate(); }}>
        <h2><FaCalendarAlt /> Preparación mensual de nómina</h2><p>El día indicado se crea el borrador del mes. Podrás revisar importes y cuentas antes de descargar el archivo y subirlo al banco.</p>
        <div className="pb-form-grid"><label>Día del mes<select className="ds-input" value={d.dia} disabled={!puede} onChange={e => cambiar({ dia: e.target.value })}>{Array.from({ length: 31 }, (_, i) => <option key={i + 1}>{i + 1}</option>)}</select></label><SelectorCuenta titular={{ empresa: true }} value={d.cuenta_origen} onChange={cuenta_origen => cambiar({ cuenta_origen })} disabled={!puede} label="Origen habitual de nómina" /></div>
        <label className="pb-check"><input type="checkbox" checked={d.activa} disabled={!puede} onChange={e => cambiar({ activa: e.target.checked })} />Preparar automáticamente cada mes</label>
        <p className="pb-muted">Si el mes no tiene ese día, se usa su último día. Un mes ya preparado conserva los cambios manuales.</p>
        {cfg.ultimo_intento && <small>Última preparación: {new Date(cfg.ultimo_intento).toLocaleString('es-CO')}</small>}{cfg.ultimo_error && <p role="alert" className="pb-error">{cfg.ultimo_error}</p>}<Error error={guardar.error} />
        <small>{cfg.latido_motor && Date.now() - new Date(cfg.latido_motor).getTime() < 180000 ? 'Motor de preparación activo.' : 'El motor de preparación no ha reportado actividad en los últimos tres minutos.'}</small>
        {guardar.isSuccess && !dirty && <p role="status" className="pb-paid">Programación guardada.</p>}{puede && <Button type="submit" loading={guardar.isPending} disabled={!dirty}>Guardar programación</Button>}
    </form>;
}

export default function PagosBancariosPage() {
    const permisos = usePermissions();
    const nav = useNavigate();
    const [params, setParams] = useSearchParams();
    const tipo = params.get('tipo') === 'nomina' ? 'nomina' : 'proveedores';
    const id = params.get('lote');
    const [empleadoEditar, setEmpleadoEditar] = useState(null);
    const [tab, setTab] = useState(id ? 'archivos' : params.get('tipo') === 'nomina' ? 'nomina' : 'beneficiarios');
    const puedeNomina = permisos('VER_NOMINA');
    const puedeProveedores = permisos('VER_COMPROBANTES_EGRESO') && permisos('VER_TODOS_EGRESOS');
    const autorizado = tipo === 'nomina' ? puedeNomina : puedeProveedores;
    const editar = tipo === 'nomina' ? permisos('GESTIONAR_NOMINA') : permisos('CREAR_COMPROBANTE_EGRESO');
    const qc = useQueryClient();
    const q = useQuery({ queryKey: ['pagos', 'lotes', tipo], queryFn: () => api.lotes(tipo), enabled: autorizado && tab === 'archivos' });
    const detalle = useQuery({ queryKey: ['pagos', 'lote', id], queryFn: () => api.lote(id), enabled: autorizado && Boolean(id) && tab === 'archivos', refetchOnWindowFocus: false });
    const prog = useQuery({ queryKey: ['pagos', 'programacion'], queryFn: api.programacion, enabled: puedeNomina && tab === 'nomina' });
    const abrir = d => { setParams({ tipo: d.tipo, lote: d.id }); qc.setQueryData(['pagos', 'lote', String(d.id)], d); qc.invalidateQueries({ queryKey: ['pagos', 'lotes', d.tipo] }); qc.invalidateQueries({ queryKey: ['egresos'] }); };
    return <div className="ds-page pb-page">
        <PageHeader icon={FaUniversity} title="Pagos bancarios" subtitle="Cuentas asociadas a tus beneficiarios y consulta de archivos de pago." actions={<Button variant="primary" icon={FaArrowLeft} onClick={() => nav('/comprobantes-egreso')}>Preparar pagos desde CE</Button>} />
        {!autorizado ? <p role="alert">No tienes acceso a estos pagos.</p> : <>
            <nav className="pb-tabs" aria-label="Administrar pagos"><button className={tab === 'beneficiarios' ? 'active' : ''} onClick={() => setTab('beneficiarios')}>Beneficiarios y cuentas</button><button className={tab === 'archivos' ? 'active' : ''} onClick={() => setTab('archivos')}>Archivos de pago</button><button className={tab === 'empresa' ? 'active' : ''} onClick={() => setTab('empresa')}>Cuenta de origen</button>{puedeNomina && <button className={tab === 'nomina' ? 'active' : ''} onClick={() => { setEmpleadoEditar(null); setTab('nomina'); }}>Nómina mensual</button>}</nav>
            {tab === 'beneficiarios' && <BeneficiariosBancarios configurarNomina={id => { setEmpleadoEditar(id || null); setTab('nomina'); }} />}
            {tab === 'empresa' && <section className="pb-card"><CuentasBancarias titular={{ empresa: true }} editable={permisos('APROBAR_EGRESO') || permisos('GESTIONAR_NOMINA')} /><p className="pb-note">Selecciona esta cuenta al preparar los pagos desde CE. La descarga está habilitada para Davivienda.</p></section>}
            {tab === 'nomina' && puedeNomina && <div className="pb-config-stack"><Empleados key={empleadoEditar || 'nomina'} abrirId={empleadoEditar} puede={permisos('GESTIONAR_NOMINA')} />{prog.data ? <ProgramacionForm cfg={prog.data} puede={permisos('GESTIONAR_NOMINA')} /> : <><p>Cargando programación…</p><Error error={prog.error} /></>}</div>}
            {tab === 'archivos' && <section className="pb-card"><div className="pb-section-title"><div><h2>Archivos y preparaciones guardadas</h2><p className="pb-muted">Los pagos se seleccionan en Comprobantes de Egreso.</p></div><select className="ds-input pb-history-type" aria-label="Tipo de archivos" value={tipo} onChange={e => setParams({ tipo: e.target.value })}>{puedeProveedores && <option value="proveedores">Proveedores</option>}{puedeNomina && <option value="nomina">Nómina</option>}</select></div><Error error={q.error} />
                {q.isPending ? <p role="status">Cargando archivos…</p> : <div className="pb-history">{q.data?.map(l => <button className="pb-history-row" key={l.id} onClick={() => setParams({ tipo, lote: l.id })}><span><strong>{l.nombre}</strong><small>{l.fecha_pago} · {l.cantidad} CE</small></span><span>{estados[l.estado]}<small>{l.confirmados} pagos confirmados</small></span><b>{cop(l.total)}</b><FaArrowLeft className="pb-history-arrow" /></button>)}{!q.data?.length && <p className="pb-empty">Aquí aparecerán los archivos que prepares desde CE.</p>}</div>}
                {id && <Modal open size="xl" title="Revisar agrupación de comprobantes" onClose={() => setParams({ tipo })}>{detalle.data ? <EditorLote key={`${detalle.data.id}-${detalle.data.revision}-${detalle.data.confirmados}`} lote={detalle.data} actualizado={abrir} puedeEditar={false} puedeExportar={detalle.data.estado === 'exportado' && editar && (tipo === 'nomina' || permisos('EXPORTAR_EGRESOS'))} /> : <p>Cargando archivo…</p>}<Error error={detalle.error} />{detalle.data?.estado === 'borrador' && <Button onClick={() => nav(`/comprobantes-egreso?archivo=${detalle.data.id}`)}>Continuar preparación desde CE</Button>}</Modal>}
            </section>}
        </>}
    </div>;
}
