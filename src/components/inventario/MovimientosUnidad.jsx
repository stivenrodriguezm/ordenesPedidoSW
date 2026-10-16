import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import API from '../../services/api';
import { mensajeDeError } from '../../services/errores';
import { usePermissions } from '../../AppContext';
import { describirCambios } from '../../utils/inventario';
import { Button, Modal } from '../ui';
import { ErrorState } from '../ui/States';

const NO_DEVOLVIBLE = ['por_despachar', 'despachado', 'entregado', 'devuelto_proveedor'];

// Historial de una unidad y devolución al proveedor (P11-02).
export default function MovimientosUnidad({ item, zonas, cerrar, alCambiar }) {
    const hasPermission = usePermissions();
    const [motivo, setMotivo] = useState('');
    const historial = useQuery({
        queryKey: ['inventario-movimientos', item.dbId],
        queryFn: async () => (await API.get(`/suministros/inventario/${item.dbId}/movimientos/`)).data,
    });
    const devolver = useMutation({
        mutationFn: async () => (await API.post(`/suministros/inventario/${item.dbId}/devolver-proveedor/`, { motivo: motivo.trim() })).data,
        onSuccess: (data) => { alCambiar?.(data); cerrar(); },
    });
    const puedeDevolver = hasPermission('EDITAR_ITEM_INVENTARIO') && !NO_DEVOLVIBLE.includes(item.disponibilidad);
    return (
        <Modal open onClose={cerrar} title={`Historial · ${item.id}`} size="md" hayCambios={Boolean(motivo.trim())}>
            {historial.isError ? <ErrorState message={mensajeDeError(historial.error)} onRetry={historial.refetch} />
                : historial.isPending ? <p role="status">Cargando historial…</p>
                    : historial.data.length === 0 ? <p>Sin movimientos registrados (unidad anterior a la bitácora).</p>
                        : <ol className="inv-movimientos">
                            {historial.data.map((m, i) => (
                                <li key={i}>
                                    <strong>{m.tipo_label}</strong> · {new Date(m.fecha).toLocaleString('es-CO')}
                                    {m.usuario && ` · ${m.usuario}`}
                                    {m.documento && ` · ${m.documento.replace(':', ' #')}`}
                                    {describirCambios(m.antes, m.despues, zonas).map(t => <div key={t} className="inv-movimientos__cambio">{t}</div>)}
                                    {m.motivo && <div className="inv-movimientos__motivo">{m.motivo}</div>}
                                </li>
                            ))}
                        </ol>}
            {puedeDevolver && (
                <form className="inv-devolver" onSubmit={e => { e.preventDefault(); if (motivo.trim() && !devolver.isPending) devolver.mutate(); }}>
                    <label htmlFor="inv-devolver-motivo">Devolver al proveedor</label>
                    <input id="inv-devolver-motivo" className="ds-input" value={motivo} maxLength={1000} required
                        placeholder="Motivo: tela equivocada, llegó con daño…" onChange={e => setMotivo(e.target.value)} />
                    <p className="inv-devolver__nota">La unidad deja de estar disponible y, si venía de una orden de pedido, esa línea vuelve a quedar pendiente para la reposición.</p>
                    {devolver.isError && <p role="alert">{mensajeDeError(devolver.error)}</p>}
                    <Button type="submit" variant="danger" loading={devolver.isPending} disabled={!motivo.trim()}>Registrar devolución</Button>
                </form>
            )}
        </Modal>
    );
}
