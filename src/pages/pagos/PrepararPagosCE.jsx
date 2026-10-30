import React, { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FaDownload } from 'react-icons/fa';
import { Button, Modal } from '../../components/ui';
import { mensajeDeError } from '../../services/errores';
import { getTodayStr } from '../../utils/dates';
import { useIdempotencia } from '../../hooks/useIdempotencia';
import * as api from '../../services/pagosBancariosService';
import CuentasBancarias, { SelectorCuenta } from './CuentasBancarias';
import { etiquetaCuenta } from './cuentas';
import { mostrarPesosAPI as cop } from './pesos';
import './PagosBancarios.css';
import { esResta } from '../../utils/otrosConceptos';

const ErrorPago = ({ error }) => error ? <p className="pb-error" role="alert">{mensajeDeError(error)}</p> : null;

export function ProductosCE({ ce }) {
    return <div className="pb-ce-products">{(ce.facturas_detalle || []).map(f => <div key={f.id}><div className="pb-ce-invoice"><strong>Factura #{f.id_manual || f.id}</strong><span>{cop(f.valor)}</span></div>{f.productos?.map((p, i) => <div className="pb-ce-product" key={`${p.id}-${i}`}><span>{[p.referencia_nombre, p.categoria_nombre, p.subcategoria_nombre, p.variacion].filter(Boolean).join(' · ')}</span><b>{cop(p.costo)}</b></div>)}</div>)}{ce.otros_conceptos?.map((c, i) => <div className="pb-ce-product" key={`otro-${i}`}><span>{c.descripcion || c.concepto || 'Otro concepto'}</span><b>{esResta(c) ? '−' : ''}{cop(c.valor)}</b></div>)}{!ce.facturas_detalle?.length && !ce.otros_conceptos?.length && <p className="pb-muted">{ce.concepto || 'Sin productos o facturas asociados a este CE.'}</p>}</div>;
}

export function CuentaFilaCE({ ce, value, cambiar, administrar, asociar, abrirArchivo, editable }) {
    const info = ce.pago_bancario;
    if (ce.medio_pago !== 'Transferencia') return <span className="pb-muted">{ce.medio_pago}</span>;
    if (info?.archivo) return <button type="button" className="ce-bank-link" onClick={() => abrirArchivo(info.archivo)}>Ver agrupación #{info.archivo}</button>;
    if (!info?.titular) return editable && ce.estado === 'Por Confirmar Pago' ? <button type="button" className="ce-bank-link" onClick={() => asociar(ce)}>Asociar beneficiario</button> : <span className="pb-muted">{ce.cuenta_destino_snapshot?.banco || 'Sin cuenta asociada'}</span>;
    const actual = value === undefined ? info.cuenta : value;
    const cuenta = info.cuentas.find(c => String(c.id) === String(actual));
    if (!info.disponible || !editable) return <span className="ce-bank-summary">{cuenta ? `${cuenta.banco_nombre} · ${cuenta.numero}` : 'Sin cuenta asociada'}</span>;
    return <div className="ce-bank-choice"><select aria-label={`Cuenta destino CE ${ce.id}`} value={actual || ''} onChange={e => cambiar(ce, e.target.value)}><option value="">Seleccionar cuenta</option>{info.cuentas.filter(c => c.activa).map(c => <option key={c.id} value={c.id}>{`${c.banco_nombre} · ${c.tipo} · ${c.numero}`}</option>)}</select>{value !== undefined && String(value) !== String(info.cuenta || '') && <small className="pb-muted">Se guardará al preparar el archivo</small>}<div className="ce-bank-account-foot">{cuenta && <strong>{cuenta.numero}</strong>}<button type="button" className="ce-bank-link" onClick={() => administrar({ titular: info.titular, nombre: ce.proveedor_nombre })}>{cuenta ? 'Editar cuentas' : '+ Agregar cuenta'}</button></div></div>;
}

export function AsociarBeneficiarioCE({ ce, cerrar, guardado }) {
    const qc = useQueryClient();
    const q = useQuery({ queryKey: ['pagos', 'beneficiarios'], queryFn: api.beneficiarios });
    const [clave, setClave] = useState('');
    const [cuenta, setCuenta] = useState('');
    const [buscar, setBuscar] = useState(ce.proveedor_otro_nombre || '');
    const beneficiario = q.data?.find(b => b.clave === clave);
    const guardar = useMutation({ mutationFn: () => api.asociarCE(ce.id, { ...beneficiario.titular, cuenta: cuenta || null, huella: ce.pago_bancario.huella }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['egresos'] }); guardado(); cerrar(); } });
    const opciones = (q.data || []).filter(b => b.tipo !== 'Nómina' && b.nombre.toLocaleLowerCase('es').includes(buscar.toLocaleLowerCase('es')));
    return <Modal open title={`Asociar beneficiario al CE ${ce.id}`} onClose={cerrar} footer={<><Button variant="secondary" onClick={cerrar}>Cancelar</Button><Button disabled={!beneficiario} loading={guardar.isPending} onClick={() => guardar.mutate()}>Guardar asociación</Button></>}><div className="pb-form"><p>Nombre anterior: <strong>{ce.proveedor_otro_nombre || 'Sin nombre'}</strong>. Selecciona su registro para usar las cuentas correctas.</p><label>Buscar proveedor<input className="ds-input" value={buscar} onChange={e => setBuscar(e.target.value)} /></label><label>Beneficiario<select className="ds-input" value={clave} onChange={e => { setClave(e.target.value); setCuenta(''); }}><option value="">Seleccionar beneficiario</option>{opciones.map(b => <option key={b.clave} value={b.clave}>{b.nombre} · {b.tipo}</option>)}</select></label>{beneficiario && <SelectorCuenta titular={beneficiario.titular} value={cuenta} onChange={setCuenta} administrar />}<ErrorPago error={q.error || guardar.error} /></div></Modal>;
}

function RevisionPagos({ ces, preferencias, cerrar, preparado, actualizarRevision }) {
    const qc = useQueryClient();
    const idempotencia = useIdempotencia();
    const [cuentas, setCuentas] = useState(Object.fromEntries(ces.map(ce => [ce.id, preferencias[ce.id] ?? ce.pago_bancario?.cuenta ?? ''])));
    const [origen, setOrigen] = useState(null);
    const [fecha, setFecha] = useState(getTodayStr());
    const fechaRef = useRef(null);
    const [guardado, setGuardado] = useState(null);
    const [administrar, setAdministrar] = useState(null);
    const origenes = useQuery({ queryKey: ['pagos', 'cuentas', { empresa: true }], queryFn: () => api.cuentas({ empresa: true }) });
    const disponibles = (origenes.data || []).filter(c => c.activa && c.banco === '51');
    const origenElegido = origen ?? disponibles.find(c => c.principal)?.id ?? (disponibles.length === 1 ? disponibles[0].id : '');
    const impedidos = ces.filter(ce => !ce.pago_bancario?.disponible);
    const incompletos = ces.filter(ce => !ce.pago_bancario?.cuentas.some(c => c.activa && String(c.id) === String(cuentas[ce.id])));
    const total = ces.reduce((n, ce) => n + Number(ce.valor), 0);
    const generar = useMutation({ mutationFn: async () => {
        let d = guardado;
        if (!d) {
            const datos = { tipo: 'proveedores', nombre: `Pago a proveedores · ${fechaRef.current?.value ?? fecha}`, fecha_pago: fechaRef.current?.value ?? fecha, cuenta_origen: origenElegido,
                comprobantes: ces.map(ce => ce.id), pagos: ces.map(ce => ({ comprobante: ce.id, cuenta: cuentas[ce.id], huella: ce.pago_bancario.huella })) };
            d = await api.crearLote(datos, idempotencia.cabeceras(datos));
            setGuardado(d); idempotencia.confirmar(); qc.invalidateQueries({ queryKey: ['egresos'] });
        }
        await api.descargarArchivo(d.id, d.revision, d.huella_revision);
        return api.lote(d.id);
    }, onSuccess: d => { qc.invalidateQueries({ queryKey: ['egresos'] }); qc.invalidateQueries({ queryKey: ['pagos', 'lotes'] }); preparado(d); } });
    return <><Modal open className="pb-ce-modal" size="xl" title="Revisar y pagar los CE seleccionados" onClose={cerrar} hayCambios footer={<><div className="pb-review-total"><small>{ces.length} comprobantes</small><strong>{cop(total)}</strong></div><Button variant="secondary" disabled={generar.isPending} onClick={cerrar}>Volver</Button><Button icon={FaDownload} disabled={generar.isPending || (!guardado && (!origenElegido || incompletos.length > 0 || impedidos.length > 0))} loading={generar.isPending} onClick={() => generar.mutate()}>{guardado ? 'Descargar archivo guardado' : 'Generar y descargar Excel'}</Button></>}>
        <div className="pb-form"><div className="pb-note">Revisa beneficiarios, cuentas, productos y totales. Los CE seguirán pendientes hasta confirmar el resultado del banco.</div>
        <div className="pb-form-grid"><label>Cuenta Davivienda de la empresa<select className="ds-input" value={origenElegido} disabled={Boolean(guardado)} onChange={e => setOrigen(e.target.value)}><option value="">Seleccionar cuenta de origen</option>{disponibles.map(c => <option key={c.id} value={c.id}>{etiquetaCuenta(c)}</option>)}</select>{disponibles.filter(c => String(c.id) === String(origenElegido)).map(c => <strong className="pb-selected-account" key={c.id}>Cuenta {c.numero}</strong>)}{!disponibles.length && !origenes.isPending && <button className="ce-bank-link" onClick={() => setAdministrar({ titular: { empresa: true }, nombre: 'Lottus' })}>+ Agregar cuenta de origen</button>}</label><label>Fecha de pago<input ref={fechaRef} className="ds-input" type="date" min={getTodayStr()} value={fecha} disabled={Boolean(guardado)} onChange={e => setFecha(e.target.value)} /></label></div>
        {impedidos.length > 0 && <p className="pb-error" role="alert">CE {impedidos.map(c => c.id).join(', ')} ya no están disponibles. Retíralos de la selección y actualiza.</p>}
        <div className="pb-ce-review-list">{ces.map(ce => <article className="pb-ce-review" key={ce.id}><div className="pb-section-title"><div><strong>{ce.proveedor_nombre}</strong><small>CE #{ce.id} · {ce.fecha}</small></div><b>{cop(ce.valor)}</b></div><div className="pb-ce-destination"><label>Cuenta de {ce.proveedor_nombre}<select className="ds-input" value={cuentas[ce.id] || ''} disabled={Boolean(guardado)} onChange={e => setCuentas(d => ({ ...d, [ce.id]: e.target.value }))}><option value="">Seleccionar cuenta destino</option>{ce.pago_bancario?.cuentas.filter(c => c.activa).map(c => <option key={c.id} value={c.id}>{etiquetaCuenta(c)}</option>)}</select>{ce.pago_bancario?.cuentas.filter(c => String(c.id) === String(cuentas[ce.id])).map(c => <span key={c.id} className="pb-selected-holder"><strong className="pb-selected-account">Cuenta {c.numero}</strong><small className="pb-muted">Titular en el banco: {c.nombres} {c.apellidos}{c.documento ? ` · Identificación ${c.documento}` : ''}</small></span>)}</label>{!guardado && <button className="ce-bank-link" onClick={() => setAdministrar({ titular: ce.pago_bancario.titular, nombre: ce.proveedor_nombre })}>Administrar cuentas</button>}</div><details open><summary>Productos, precios y conceptos</summary><ProductosCE ce={ce} /></details>{ce.descripcion && <p className="pb-muted">{ce.descripcion}</p>}</article>)}</div>
        {guardado && <p className="pb-note">La agrupación #{guardado.id} quedó guardada. Puedes volver a intentar descargarla sin crear otro pago.</p>}<ErrorPago error={generar.error || origenes.error} />{generar.error && !guardado && <Button variant="secondary" onClick={actualizarRevision}>Actualizar datos para revisar de nuevo</Button>}
        </div></Modal>{administrar && <Modal open size="lg" title={`Cuentas · ${administrar.nombre}`} onClose={() => { setAdministrar(null); if (!administrar.titular.empresa) actualizarRevision(); }}><CuentasBancarias titular={administrar.titular} nombre={administrar.nombre} /></Modal>}</>;
}

export default function PrepararPagosCE({ seleccion, preferencias, cerrar, preparado }) {
    const q = useQuery({ queryKey: ['pagos', 'revision-ce', seleccion], queryFn: () => api.revisarCE(seleccion), staleTime: 0, refetchOnWindowFocus: false });
    if (!q.data) return <Modal open title="Revisar pagos" onClose={cerrar}><p role="status">Cargando los CE, sus productos y cuentas…</p><ErrorPago error={q.error} /></Modal>;
    return <RevisionPagos key={q.dataUpdatedAt} ces={q.data} preferencias={preferencias} cerrar={cerrar} preparado={preparado} actualizarRevision={() => q.refetch()} />;
}
