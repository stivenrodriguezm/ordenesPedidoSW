import React, { useEffect, useState } from 'react';
import { FaTruck, FaCheckCircle, FaUndo, FaBan, FaReply } from 'react-icons/fa';
import API from '../services/api';
import { Modal, Button } from './ui';
import { formatCOP } from '../utils/formatCOP';
import { MOTIVOS_NO_ENTREGA, numeroRemision, productosDeRemision } from '../utils/remisiones';
import VerificarRemisionQR from './VerificarRemisionQR';
import { useEnLinea } from '../hooks/useEnLinea';
import '../pages/NuevaRemisionPage.css';

export const ACCIONES_REMISION = {
    despachada: {
        titulo: 'Marcar como despachada',
        boton: 'Marcar despachada',
        corto: 'Despachar',
        icon: FaTruck,
        texto: 'La remisión pasa a “En ruta” y sus productos quedan como despachados.',
    },
    finalizada: {
        titulo: 'Confirmar entrega',
        boton: 'Confirmar entrega',
        corto: 'Entregada',
        icon: FaCheckCircle,
        texto: 'La confirmación es la constancia de la entrega. Si algo no se entregó, márcalo: vuelve a bodega y queda pendiente para otra remisión.',
    },
    devuelta: {
        titulo: 'Registrar devolución',
        boton: 'Registrar devolución',
        corto: 'Devuelta',
        icon: FaUndo,
        variant: 'danger',
        motivo: true,
        texto: 'Los productos vuelven a bodega y quedan libres para programar otra remisión.',
    },
    creada: {
        titulo: 'Volver a “Por despachar”',
        boton: 'Volver a por despachar',
        corto: 'Volver a programada',
        icon: FaReply,
        texto: 'Úsalo si el despacho se marcó por error o el viaje se canceló antes de salir.',
    },
    anulada: {
        titulo: 'Anular remisión',
        boton: 'Anular remisión',
        corto: 'Anular',
        icon: FaBan,
        variant: 'danger',
        motivo: true,
        texto: 'La remisión no se borra: queda anulada con su historial y sus productos quedan libres para otra remisión.',
    },
};

function NoEntregados({ productos, marcados, setMarcados, verificados }) {
    const cambiar = (clave, patch) => setMarcados(prev => ({ ...prev, [clave]: { ...prev[clave], ...patch } }));
    const alternar = p => setMarcados(prev => {
        const n = { ...prev };
        if (n[p.clave]) delete n[p.clave];
        else n[p.clave] = { motivo: '', detalle: '', cantidad: p.cantidad };
        return n;
    });
    return (
        <fieldset className="nr-field">
            <legend>¿Algo no se entregó? <span className="nr-optional">márcalo</span></legend>
            {productos.map(p => {
                const m = marcados[p.clave];
                return (
                    <div key={p.clave} className="nr-no-entrega">
                        <label className="nr-check-row">
                            <input type="checkbox" className="nr-check" checked={Boolean(m)} onChange={() => alternar(p)} />
                            <span>{p.nombre}{verificados.includes(p.id) && <span className="nr-verificado">✓ verificado</span>}</span>
                        </label>
                        {m && (
                            <div className="nr-no-entrega__datos">
                                <select aria-label={`Motivo: ${p.nombre}`} className="nr-input" value={m.motivo}
                                    onChange={e => cambiar(p.clave, { motivo: e.target.value })}>
                                    <option value="">¿Por qué no se entregó?</option>
                                    {Object.entries(MOTIVOS_NO_ENTREGA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                                {p.cantidad > 1 && (
                                    <input aria-label={`Cantidad no entregada: ${p.nombre}`} className="nr-input" type="number"
                                        min="1" max={p.cantidad} value={m.cantidad}
                                        onChange={e => cambiar(p.clave, { cantidad: e.target.value })} />
                                )}
                                <input aria-label={`Detalle: ${p.nombre}`} className="nr-input" value={m.detalle} maxLength={1000}
                                    placeholder={m.motivo === 'otro' ? 'Explica qué pasó (obligatorio)' : 'Detalle (opcional)'}
                                    onChange={e => cambiar(p.clave, { detalle: e.target.value })} />
                            </div>
                        )}
                    </div>
                );
            })}
        </fieldset>
    );
}

function primerError(data) {
    if (!data) return null;
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) return primerError(data[0]);
    if (data.error) return data.error;
    if (data.detail) return data.detail;
    return primerError(Object.values(data)[0]);
}

/**
 * Confirmación de un cambio de estado. Pide solo lo que ese cambio necesita:
 * motivo al anular/devolver; nota, costo del flete y cierre de la venta al entregar.
 */
const RemisionAccionModal = ({ open, accion, remision, onClose, onDone, puedeCosto, puedeCerrarVenta, esTransportador }) => {
    const cfg = ACCIONES_REMISION[accion];
    const [motivo, setMotivo] = useState('');
    const [nota, setNota] = useState('');
    const [costo, setCosto] = useState('');
    const [cerrar, setCerrar] = useState([]);
    const [marcados, setMarcados] = useState({});
    const [verificados, setVerificados] = useState([]);
    const enLinea = useEnLinea();
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);

    const ventasPendientes = (remision?.ventas_detalle || []).filter(v => v.estado === 'pendiente');

    useEffect(() => {
        if (!open || !remision) return;
        setMotivo('');
        setNota(remision.nota_transportador || '');
        setCosto(remision.costo_entrega && Number(remision.costo_entrega) > 0 ? String(Math.round(Number(remision.costo_entrega))) : '');
        setCerrar((remision.ventas_detalle || []).filter(v => v.estado === 'pendiente').map(v => v.id));
        setMarcados({});
        setVerificados([]);
        setError('');
        setGuardando(false);
    }, [open, remision, accion]);

    if (!cfg || !remision) return null;

    const esEntrega = accion === 'finalizada';
    const productos = esEntrega ? productosDeRemision(remision) : [];
    const hayPendientes = Object.keys(marcados).length > 0;
    const mostrarCosto = esEntrega && puedeCosto && !esTransportador;
    // Con productos sin entregar la venta no queda completa (el servidor tampoco la cierra).
    const mostrarCerrar = esEntrega && puedeCerrarVenta && ventasPendientes.length > 0 && !hayPendientes;

    const confirmar = async () => {
        if (cfg.motivo && !motivo.trim()) {
            setError('Escribe el motivo.');
            return;
        }
        const noEntregados = productos.filter(p => marcados[p.clave]).map(p => {
            const m = marcados[p.clave];
            const cantidad = Math.min(p.cantidad, Math.max(1, parseInt(m.cantidad, 10) || 1));
            return { [p.tipo]: p.id, motivo: m.motivo, detalle: m.detalle.trim(), ...(p.tipo === 'item_manual' ? { cantidad } : {}) };
        });
        if (noEntregados.some(n => !n.motivo)) {
            setError('Indica por qué no se entregó cada producto marcado.');
            return;
        }
        if (noEntregados.some(n => n.motivo === 'otro' && !n.detalle)) {
            setError('Explica qué pasó con los productos marcados como “Otro”.');
            return;
        }
        const payload = { estado: accion };
        if (motivo.trim()) payload.motivo = motivo.trim();
        if (noEntregados.length) payload.no_entregados = noEntregados;
        if (esEntrega && nota.trim() !== (remision.nota_transportador || '').trim()) payload.nota_transportador = nota.trim();
        if (mostrarCosto) {
            const valor = parseInt(costo || '0', 10);
            if (valor !== Math.round(Number(remision.costo_entrega) || 0)) payload.costo_entrega = valor;
        }
        if (mostrarCerrar && cerrar.length) payload.cerrar_ventas = cerrar;

        setGuardando(true);
        setError('');
        try {
            const res = await API.patch(`/suministros/remisiones/${remision.id}/`, payload);
            onDone(res.data, accion);
        } catch (err) {
            setError(primerError(err.response?.data) || 'No se pudo guardar. Intenta de nuevo.');
            setGuardando(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={guardando ? undefined : onClose}
            size="md"
            title={`${cfg.titulo} · No. ${numeroRemision(remision.id)}`}
            footer={(
                <>
                    <Button variant="secondary" onClick={onClose} disabled={guardando}>Cancelar</Button>
                    <Button variant={cfg.variant || 'primary'} icon={cfg.icon} loading={guardando} onClick={confirmar} disabled={!enLinea}>
                        {cfg.boton}
                    </Button>
                </>
            )}
        >
            <div className="nr-modal-stack">
                <p className="nr-modal-lead">
                    <strong>{remision.cliente_nombre}</strong>
                    {remision.direccion_entrega ? ` · ${remision.direccion_entrega}` : ''}
                </p>
                <p className="nr-modal-text">{cfg.texto}</p>

                {cfg.motivo || accion === 'creada' ? (
                    <div className="nr-field">
                        <label htmlFor="ra-motivo">
                            Motivo {!cfg.motivo && <span className="nr-optional">opcional</span>}
                        </label>
                        <textarea
                            id="ra-motivo"
                            className="nr-input nr-textarea"
                            rows="3"
                            value={motivo}
                            autoFocus
                            onChange={e => { setMotivo(e.target.value); setError(''); }}
                            placeholder={accion === 'anulada' ? 'Ej: el cliente pidió cambiar los productos…' : 'Ej: el cliente no estaba, dirección incorrecta…'}
                        />
                    </div>
                ) : null}

                {(esEntrega || accion === 'despachada') && (
                    <VerificarRemisionQR remision={remision} verificados={verificados} setVerificados={setVerificados} />
                )}

                {esEntrega && productos.length > 0 && (
                    <NoEntregados productos={productos} marcados={marcados} setMarcados={setMarcados} verificados={verificados} />
                )}

                {esEntrega && (
                    <div className="nr-field">
                        <label htmlFor="ra-nota">Nota de la entrega <span className="nr-optional">opcional</span></label>
                        <textarea
                            id="ra-nota"
                            className="nr-input nr-textarea"
                            rows="2"
                            value={nota}
                            onChange={e => setNota(e.target.value)}
                            placeholder="Ej: recibió la portería, se armó en sitio…"
                        />
                    </div>
                )}

                {mostrarCosto && (
                    <div className="nr-field">
                        <label htmlFor="ra-costo">Costo del flete <span className="nr-optional">opcional</span></label>
                        <div className="nr-money">
                            <span>$</span>
                            <input
                                id="ra-costo"
                                inputMode="numeric"
                                value={costo ? formatCOP(parseInt(costo, 10)).replace('$', '') : ''}
                                onChange={e => setCosto(e.target.value.replace(/\D/g, ''))}
                                placeholder="0"
                            />
                        </div>
                    </div>
                )}

                {mostrarCerrar && (
                    <div className="nr-close-ventas">
                        <span className="nr-close-ventas__title">¿La venta quedó completamente entregada?</span>
                        {ventasPendientes.map(v => (
                            <label key={v.id} className="nr-check-row">
                                <input
                                    type="checkbox"
                                    className="nr-check"
                                    checked={cerrar.includes(v.id)}
                                    onChange={() => setCerrar(prev => (prev.includes(v.id) ? prev.filter(x => x !== v.id) : [...prev, v.id]))}
                                />
                                <span>Marcar la venta <strong>#{v.id}</strong> como entregada</span>
                            </label>
                        ))}
                        <span className="nr-hint">Desmárcalo si todavía faltan productos por entregar (entrega parcial).</span>
                    </div>
                )}

                {!enLinea && <div className="nr-alert nr-alert--danger" role="alert">Sin conexión: espera a tener señal para confirmar. Si ya lo habías enviado, repetirlo no duplica nada.</div>}
                {error && <div className="nr-alert nr-alert--danger">{error}</div>}
            </div>
        </Modal>
    );
};

export default RemisionAccionModal;
