import React, { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FaPlus, FaUniversity, FaEdit, FaTrash } from 'react-icons/fa';
import { Button, Modal } from '../../components/ui';
import { mensajeDeError } from '../../services/errores';
import * as api from '../../services/pagosBancariosService';
import { useIdempotencia } from '../../hooks/useIdempotencia';
import { claveCuentas, etiquetaCuenta } from './cuentas';
import './PagosBancarios.css';

const cuentaVacia = { banco: '51', tipo: 'CA', numero: '', tipo_documento: '01', documento: '', nombres: '', apellidos: '', alias: '', principal: false, activa: true };

function EditarCuenta({ titular, cuenta, cerrar, beneficiario }) {
    const idempotencia = useIdempotencia();
    const [d, setD] = useState({ ...cuentaVacia, ...cuenta, ...titular });
    const id = useId();
    const qc = useQueryClient();
    const cat = useQuery({ queryKey: ['pagos', 'catalogo'], queryFn: api.catalogo });
    const guardar = useMutation({ mutationFn: () => api.guardarCuenta(d, idempotencia.cabeceras(d)), onSuccess: () => {
        idempotencia.confirmar();
        qc.invalidateQueries({ queryKey: claveCuentas(titular) });
        qc.invalidateQueries({ queryKey: ['pagos', 'empleados'] });
        qc.invalidateQueries({ queryKey: ['pagos', 'beneficiarios'] });
        qc.invalidateQueries({ queryKey: ['egresos'] });
        cerrar();
    } });
    const campo = (k, label, props = {}) => <label>{label}<input className="ds-input" value={d[k]} onChange={e => setD(x => ({ ...x, [k]: e.target.value }))} {...props} /></label>;
    return <Modal open title={cuenta ? 'Editar cuenta bancaria' : 'Agregar cuenta bancaria'} onClose={cerrar} size="lg" hayCambios footer={<>
        <Button variant="secondary" onClick={cerrar}>Cancelar</Button><Button type="submit" form={id} loading={guardar.isPending} disabled={!cat.data}>Guardar cuenta</Button>
    </>}><form id={id} className="pb-form" onSubmit={e => { e.preventDefault(); if (!guardar.isPending) guardar.mutate(); }}>
        <div className="pb-owner"><small>Cuenta asociada a</small><strong>{beneficiario}</strong><span>Esta cuenta solo estará disponible para los pagos de este beneficiario.</span></div>
        <div className="pb-form-grid">
            {campo('alias', 'Nombre para reconocerla', { placeholder: 'Ej. Cuenta principal', maxLength: 80 })}
            <label>Banco<select className="ds-input" value={d.banco} onChange={e => setD(x => ({ ...x, banco: e.target.value }))}>
                {Object.entries(cat.data?.bancos || { '51': 'Davivienda', '7': 'Bancolombia' }).sort(([a], [b]) => (a === '51' ? -1 : b === '51' ? 1 : 0)).filter(([k]) => !titular.empresa || ['51', '7'].includes(k)).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select></label>
            <label>Tipo de cuenta<select className="ds-input" value={d.tipo} onChange={e => setD(x => ({ ...x, tipo: e.target.value }))}>
                {Object.entries(cat.data?.tipos || { CA: 'Ahorros', CC: 'Corriente' }).filter(([k]) => ['CA', 'CC'].includes(k) || cuenta?.tipo === k).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select></label>
            {campo('numero', 'Número de cuenta', { required: true, inputMode: 'numeric', pattern: '[0-9]{1,16}', maxLength: 16, autoComplete: 'off' })}
        </div>
        <div className="pb-note">Titular registrado en el banco. Conserva los ceros iniciales de la cuenta y escribe el NIT con su dígito de verificación, sin puntos ni guion.</div>
        <div className="pb-form-grid">
            <label>Tipo de identificación<select className="ds-input" value={d.tipo_documento} onChange={e => setD(x => ({ ...x, tipo_documento: e.target.value }))}>
                {Object.entries(cat.data?.documentos || {}).sort(([a],[b]) => Number(a) - Number(b)).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select></label>
            {campo('documento', 'Número de identificación', { required: true, inputMode: 'numeric', pattern: '[0-9]{1,16}', maxLength: 16 })}
            {campo('nombres', 'Nombres / primera parte de razón social', { required: true, maxLength: 40 })}
            {campo('apellidos', 'Apellidos / segunda parte de razón social', { required: true, maxLength: 40 })}
        </div>
        <p className="pb-muted">El archivo convierte tildes y ñ a letras simples, según el instructivo del banco. Los datos guardados conservan su escritura.</p>
        <label className="pb-check"><input type="checkbox" checked={d.principal} onChange={e => setD(x => ({ ...x, principal: e.target.checked }))} />Cuenta principal de este titular</label>
        {cuenta && <label className="pb-check"><input type="checkbox" checked={d.activa} onChange={e => setD(x => ({ ...x, activa: e.target.checked }))} />Cuenta activa</label>}
        {(guardar.error || cat.error) && <p role="alert" className="pb-error">{mensajeDeError(guardar.error || cat.error)}</p>}
    </form></Modal>;
}

export default function CuentasBancarias({ titular, nombre, editable = true }) {
    const [editar, setEditar] = useState(undefined);
    const [quitar, setQuitar] = useState(null);
    const qc = useQueryClient();
    const directorio = useQuery({ queryKey: ['pagos', 'beneficiarios'], queryFn: api.beneficiarios, enabled: !titular.empresa });
    const beneficiario = titular.empresa ? 'Lottus · Cuenta de origen de la empresa' : directorio.data?.find(b => Object.entries(titular).every(([k,v]) => String(b.titular[k]) === String(v)))?.nombre || nombre || 'Beneficiario seleccionado';
    const eliminar = useMutation({ mutationFn: () => api.eliminarCuenta({ ...quitar, ...titular }), onSuccess: () => { setQuitar(null); qc.invalidateQueries({ queryKey: claveCuentas(titular) }); qc.invalidateQueries({ queryKey: ['pagos', 'beneficiarios'] }); qc.invalidateQueries({ queryKey: ['egresos'] }); } });
    const consulta = useQuery({ queryKey: claveCuentas(titular), queryFn: () => api.cuentas(titular) });
    return <section className="pb-cuentas">
        <div className="pb-owner"><small>Beneficiario asociado</small><strong>{beneficiario}</strong></div>
        <div className="pb-section-title"><h3><FaUniversity /> Cuentas bancarias</h3>{editable && <Button variant="secondary" size="sm" icon={FaPlus} onClick={() => setEditar(null)}>Agregar cuenta</Button>}</div>
        {consulta.isPending ? <p role="status">Cargando cuentas…</p> : consulta.error ? <p role="alert" className="pb-error">{mensajeDeError(consulta.error)}</p> : !consulta.data?.length ? <p className="pb-empty">Aún no hay cuentas. Agrégalas para preparar los pagos.</p> : <div className="pb-account-list">{consulta.data.map(c => <div key={c.id} className={`pb-account ${c.activa ? '' : 'pb-inactive'}`}>
            <div><strong>{c.alias || c.banco_nombre}</strong><span>{c.banco_nombre} · {c.tipo} · {c.numero}</span><small>{c.nombres} {c.apellidos}{c.principal ? ' · Principal' : ''}{!c.activa ? ' · Inactiva' : ''}</small></div>
            {editable && <div className="pb-actions"><Button variant="ghost" size="sm" icon={FaEdit} onClick={() => setEditar(c)} aria-label={`Editar cuenta ${c.numero}`} />{c.activa && <Button variant="ghost" size="sm" icon={FaTrash} onClick={() => setQuitar(c)} aria-label={`Eliminar cuenta ${c.numero}`} />}</div>}
        </div>)}</div>}
        {editar !== undefined && <EditarCuenta beneficiario={beneficiario} titular={titular} cuenta={editar} cerrar={() => setEditar(undefined)} />}
        {quitar && <Modal open title="Eliminar cuenta de pagos" onClose={() => setQuitar(null)} footer={<><Button variant="secondary" onClick={() => setQuitar(null)}>Cancelar</Button><Button variant="danger" loading={eliminar.isPending} onClick={() => eliminar.mutate()}>Eliminar cuenta</Button></>}><p>¿Quitar la cuenta {quitar.numero} de {beneficiario}? Dejará de estar disponible para nuevos pagos. Los comprobantes y archivos anteriores conservarán su información.</p>{eliminar.error && <p role="alert" className="pb-error">{mensajeDeError(eliminar.error)}</p>}</Modal>}
    </section>;
}

export function SelectorCuenta({ titular, value, onChange, disabled, label = 'Cuenta destino', administrar = false, required = false }) {
    const [abierto, setAbierto] = useState(false);
    const habilitado = Boolean(titular?.proveedor || titular?.proveedor_tela || titular?.empleado || titular?.empresa);
    const q = useQuery({ queryKey: claveCuentas(titular), queryFn: () => api.cuentas(titular), enabled: habilitado });
    const elegida = q.data?.find(c => String(c.id) === String(value));
    return <div className="pb-selector"><label>{label}<select className="ds-input" aria-label={label} required={required} value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled || q.isPending || !habilitado}>
        <option value="">{q.isPending && habilitado ? 'Cargando cuentas…' : 'Seleccionar cuenta…'}</option>
        {(q.data || []).filter(c => c.activa || String(c.id) === String(value)).map(c => <option key={c.id} value={c.id} disabled={!c.activa}>{etiquetaCuenta(c)}{!c.activa ? ' (inactiva)' : ''}</option>)}
    </select></label>
        {elegida && <small className="pb-cuenta-elegida"><strong>{elegida.numero}</strong><span>{elegida.nombres} {elegida.apellidos}</span></small>}
        {q.error && <span className="pb-error" role="alert">{mensajeDeError(q.error)}</span>}
        {administrar && habilitado && <Button variant="ghost" size="sm" onClick={() => setAbierto(true)}>Administrar cuentas</Button>}
        {abierto && <Modal open title="Cuentas del beneficiario" size="lg" onClose={() => setAbierto(false)}><CuentasBancarias titular={titular} /></Modal>}
    </div>;
}
