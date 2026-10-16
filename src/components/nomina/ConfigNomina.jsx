import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Modal } from '../ui';
import { mensajeDeError } from '../../services/errores';
import * as servicio from '../../services/nominaService';
import CampoEditable from './CampoEditable';
import { cop } from '../../utils/nomina';

// Reglas de nómina y datos fijos por asesor (D12a). Los cierres nuevos copian
// estas reglas; en un cierre en borrador también se pueden cambiar sus líneas.
export default function ConfigNomina({ cerrar, editable }) {
    const qc = useQueryClient();
    const config = useQuery({ queryKey: ['nomina', 'config'], queryFn: servicio.obtenerConfig });
    const asesores = useQuery({ queryKey: ['nomina', 'asesores'], queryFn: servicio.listarAsesores });
    const [form, setForm] = useState(null);
    useEffect(() => { if (config.data && !form) setForm({ ...config.data, tabla: config.data.tabla_comision.map(f => [String(f[0]), String(f[1])]) }); }, [config.data, form]);
    const guardar = useMutation({
        mutationFn: () => servicio.guardarConfig({
            tabla_comision: form.tabla.filter(f => f[0] !== '' && f[1] !== '').map(f => [Number(f[0]), Number(f[1])]),
            abono_minimo_pct: form.abono_minimo_pct, bonificacion_pct: form.bonificacion_pct,
            ventas_desde: form.ventas_desde || null, dia_pago_basico: form.dia_pago_basico, pago_nomina: form.pago_nomina,
        }),
        onSuccess: (data) => { qc.setQueryData(['nomina', 'config'], data); cerrar(); },
    });
    const guardarAsesor = useMutation({
        mutationFn: ({ id, datos }) => servicio.guardarAsesor(id, datos),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['nomina', 'asesores'] }),
    });
    const fila = (i, j, v) => setForm(f => ({ ...f, tabla: f.tabla.map((r, k) => (k === i ? (j === 0 ? [v, r[1]] : [r[0], v]) : r)) }));
    return (
        <Modal open onClose={cerrar} title="Configuración de nómina" size="lg"
            footer={editable && <><Button variant="secondary" onClick={cerrar}>Cerrar</Button>
                <Button onClick={() => guardar.mutate()} loading={guardar.isPending} disabled={!form}>Guardar reglas</Button></>}>
            {!form ? <p role="status">Cargando…</p> : (
                <div className="nom-config">
                    <section>
                        <h3>Comisión según el descuento</h3>
                        <p className="nom-ayuda">Cada fila: hasta ese descuento sobre el precio de lista se paga ese porcentaje del valor de la venta. Un descuento mayor que la última fila paga el último porcentaje.</p>
                        <table className="nom-tabla nom-tabla--compacta">
                            <thead><tr><th>Descuento hasta (%)</th><th>Comisión (%)</th>{editable && <th />}</tr></thead>
                            <tbody>
                                {form.tabla.map((r, i) => (
                                    <tr key={i}>
                                        <td>{editable ? <input className="nom-input" aria-label={`Descuento fila ${i + 1}`} type="number" step="any" value={r[0]} onChange={e => fila(i, 0, e.target.value)} /> : r[0]}</td>
                                        <td>{editable ? <input className="nom-input" aria-label={`Comisión fila ${i + 1}`} type="number" step="any" value={r[1]} onChange={e => fila(i, 1, e.target.value)} /> : r[1]}</td>
                                        {editable && <td><Button variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, tabla: f.tabla.filter((_, k) => k !== i) }))}>Quitar</Button></td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {editable && <Button variant="secondary" size="sm" onClick={() => setForm(f => ({ ...f, tabla: [...f.tabla, ['', '']] }))}>Agregar fila</Button>}
                    </section>
                    <section className="nom-config__reglas">
                        <label>Abono mínimo para pagar la comisión (%)
                            <input className="nom-input" type="number" step="any" disabled={!editable} value={form.abono_minimo_pct} onChange={e => setForm(f => ({ ...f, abono_minimo_pct: e.target.value }))} /></label>
                        <label>Bonificación por cumplir la meta (%)
                            <input className="nom-input" type="number" step="any" disabled={!editable} value={form.bonificacion_pct} onChange={e => setForm(f => ({ ...f, bonificacion_pct: e.target.value }))} /></label>
                        <label>Día de pago del básico
                            <input className="nom-input" type="number" min="1" max="31" disabled={!editable} value={form.dia_pago_basico} onChange={e => setForm(f => ({ ...f, dia_pago_basico: e.target.value }))} /></label>
                        <label>Pago de la nómina
                            <input className="nom-input" disabled={!editable} value={form.pago_nomina} onChange={e => setForm(f => ({ ...f, pago_nomina: e.target.value }))} /></label>
                        <label>Comisionar ventas desde
                            <input className="nom-input" type="date" disabled={!editable} value={form.ventas_desde || ''} onChange={e => setForm(f => ({ ...f, ventas_desde: e.target.value }))} />
                            <small>Las ventas anteriores se liquidaron fuera del sistema.</small></label>
                    </section>
                    <section>
                        <h3>Básico y meta por asesor</h3>
                        <p className="nom-ayuda">Valores por defecto para los cierres nuevos; en cada cierre se pueden cambiar.</p>
                        {asesores.isPending ? <p role="status">Cargando…</p> : (
                            <table className="nom-tabla nom-tabla--compacta">
                                <thead><tr><th>Asesor</th><th className="num">Básico</th><th className="num">Meta mensual</th><th>En nómina</th></tr></thead>
                                <tbody>
                                    {(asesores.data || []).map(a => (
                                        <tr key={a.asesor}>
                                            <td>{a.nombre}</td>
                                            <td className="num"><CampoEditable valor={a.salario_basico} formato={cop} editable={editable} etiqueta={`Básico de ${a.nombre}`}
                                                onGuardar={v => guardarAsesor.mutate({ id: a.asesor, datos: { salario_basico: v || 0 } })} /></td>
                                            <td className="num"><CampoEditable valor={a.meta} formato={cop} editable={editable} etiqueta={`Meta de ${a.nombre}`}
                                                onGuardar={v => guardarAsesor.mutate({ id: a.asesor, datos: { meta: v || 0 } })} /></td>
                                            <td><input type="checkbox" checked={a.activo} disabled={!editable} aria-label={`${a.nombre} en nómina`}
                                                onChange={e => guardarAsesor.mutate({ id: a.asesor, datos: { activo: e.target.checked } })} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>
                    {(guardar.isError || guardarAsesor.isError) && <p role="alert">{mensajeDeError(guardar.error || guardarAsesor.error)}</p>}
                </div>
            )}
        </Modal>
    );
}
