import React, { useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FaSave, FaInfoCircle, FaPlus } from 'react-icons/fa';
import API from '../services/api';
import { Modal, Button } from './ui';
import { formatCOP } from '../utils/formatCOP';
import {
    ESTADOS_ACTIVOS, FRANJAS, METODOS_PAGO, fmtHora, fmtFechaLarga, lineasProductos, numeroRemision,
    metodoPagoAForm, metodoPagoAApi,
} from '../utils/remisiones';
import {
    ProductoEditable, ReferenciasDatalist, useCatalogoRemision,
    productoVacio, productoEnBlanco, productoIncompleto, productoAApi,
} from './RemisionProductos';
import '../pages/NuevaRemisionPage.css';

const hhmm = t => (t ? String(t).slice(0, 5) : '');

// Productos de pedido o escritos a mano: se editan aquí (los de inventario no).
let nuevoSeq = 0;
const productosDesde = rem => (rem.items_manuales || []).map(m => ({
    key: `p-${m.id}`,
    id: m.id,
    venta: m.venta ?? null,
    detalle_pedido: m.detalle_pedido ?? null,
    ...productoVacio({
        categoria: m.categoria ?? null,
        subcategoria: m.subcategoria ?? null,
        referencia: m.referencia || '',
        descripcion: m.descripcion || '',
        tela: m.tela || '',
        cantidad: m.cantidad || 1,
    }),
}));
const productosAApi = lista => lista.filter(p => !productoEnBlanco(p)).map(p => ({
    ...(p.id ? { id: p.id } : {}),
    ...productoAApi(p),
    venta: p.venta,
    detalle_pedido: p.detalle_pedido,
}));

function formDesde(rem) {
    return {
        fecha_entrega: rem.fecha_entrega || '',
        hora_desde: hhmm(rem.hora_desde),
        hora_hasta: hhmm(rem.hora_hasta),
        transportador_usuario: rem.transportador_usuario ? String(rem.transportador_usuario) : (rem.transportador ? '__otro__' : ''),
        transportador: rem.transportador || '',
        cliente_nombre: rem.cliente_nombre === 'Cliente Nuevo' ? '' : (rem.cliente_nombre || ''),
        cliente_documento: rem.cliente_documento || '',
        cliente_telefono1: rem.cliente_telefono1 || '',
        cliente_telefono2: rem.cliente_telefono2 || '',
        direccion_entrega: rem.direccion_entrega || '',
        barrio: rem.barrio || '',
        ciudad: rem.ciudad || '',
        sin_saldo: !!rem.sin_saldo,
        saldo: rem.saldo && Number(rem.saldo) > 0 ? String(Math.round(Number(rem.saldo))) : '',
        metodo_pago: metodoPagoAForm(rem.metodo_pago).metodo,
        metodo_otro: metodoPagoAForm(rem.metodo_pago).otro,
        vendedor: rem.vendedor ? String(rem.vendedor) : '',
        novedades: rem.novedades || '',
        costo_entrega: rem.costo_entrega && Number(rem.costo_entrega) > 0 ? String(Math.round(Number(rem.costo_entrega))) : '',
        nota_transportador: rem.nota_transportador || '',
    };
}

// Convierte el formulario al formato de la API (solo para comparar y enviar).
function aApi(f) {
    const otro = f.transportador_usuario === '__otro__';
    return {
        fecha_entrega: f.fecha_entrega || null,
        hora_desde: f.hora_desde || null,
        hora_hasta: f.hora_hasta || null,
        transportador_usuario: f.transportador_usuario && !otro ? Number(f.transportador_usuario) : null,
        transportador: otro ? f.transportador.trim() : '',
        cliente_nombre: f.cliente_nombre.trim(),
        cliente_documento: f.cliente_documento.trim(),
        cliente_telefono1: f.cliente_telefono1.trim(),
        cliente_telefono2: f.cliente_telefono2.trim(),
        direccion_entrega: f.direccion_entrega.trim(),
        barrio: f.barrio.trim(),
        ciudad: f.ciudad.trim(),
        sin_saldo: f.sin_saldo,
        saldo: f.sin_saldo ? 0 : parseInt(f.saldo || '0', 10),
        metodo_pago: f.sin_saldo ? '' : metodoPagoAApi(f.metodo_pago, f.metodo_otro),
        vendedor: f.vendedor ? Number(f.vendedor) : null,
        novedades: f.novedades.trim(),
        costo_entrega: parseInt(f.costo_entrega || '0', 10),
        nota_transportador: f.nota_transportador.trim(),
    };
}

const CAMPOS_EDICION = [
    'fecha_entrega', 'hora_desde', 'hora_hasta', 'transportador_usuario', 'transportador',
    'cliente_nombre', 'cliente_documento', 'cliente_telefono1', 'cliente_telefono2',
    'direccion_entrega', 'barrio', 'ciudad', 'sin_saldo', 'saldo', 'metodo_pago', 'vendedor',
    'novedades',
];

function primerError(data) {
    if (!data) return null;
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) return primerError(data[0]);
    if (data.error) return data.error;
    if (data.detail) return data.detail;
    return primerError(Object.values(data)[0]);
}

/**
 * Editar / reprogramar una remisión, incluidos los productos de pedido o escritos a
 * mano (los de inventario no: si cambian, se anula y se crea otra). Con la remisión ya
 * entregada solo queda el seguimiento (costo del flete y nota del transportador).
 */
const RemisionEditarModal = ({ open, remision, onClose, onDone, transportadores = [], vendedores = [], puedeEditar, puedeSeguimiento, puedeCosto }) => {
    const [form, setForm] = useState(null);
    const [inicial, setInicial] = useState(null);
    const [error, setError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [productos, setProductos] = useState([]);
    const [productosIniciales, setProductosIniciales] = useState('[]');
    const [nuevoKey, setNuevoKey] = useState(null);
    const catalogo = useCatalogoRemision();

    useEffect(() => {
        if (!open || !remision) return;
        const f = formDesde(remision);
        setForm(f);
        setInicial(aApi(f));
        const prods = productosDesde(remision);
        setProductos(prods);
        setProductosIniciales(JSON.stringify(productosAApi(prods)));
        setNuevoKey(null);
        setError('');
        setGuardando(false);
    }, [open, remision]);

    const activa = remision && ESTADOS_ACTIVOS.includes(remision.estado);
    const editaDatos = puedeEditar && activa;

    const fechasRapidas = useMemo(() => [0, 1, 2].map(n => {
        const d = addDays(new Date(), n);
        const nombre = n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : format(d, 'EEEE', { locale: es });
        return { iso: format(d, 'yyyy-MM-dd'), label: `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${format(d, 'd MMM', { locale: es })}` };
    }), []);

    if (!remision || !form) return null;

    const set = (campo, valor) => { setForm(prev => ({ ...prev, [campo]: valor })); setError(''); };
    const input = (campo, extra = {}) => ({
        className: 'nr-input',
        value: form[campo],
        onChange: e => set(campo, e.target.value),
        ...extra,
    });

    const franjaActiva = FRANJAS.find(f => f.desde === form.hora_desde && f.hasta === form.hora_hasta)?.key;
    const deInventario = lineasProductos(remision).filter(p => p.tipo === 'item' && p.codigo);

    const editarProducto = (key, patch) => {
        setProductos(prev => prev.map(p => (p.key === key ? { ...p, ...patch } : p)));
        setError('');
    };
    const agregarProducto = () => {
        const nuevo = { key: `n-${++nuevoSeq}`, id: null, venta: remision.orden_asociada ?? null, detalle_pedido: null, ...productoVacio() };
        setProductos(prev => [...prev, nuevo]);
        setNuevoKey(nuevo.key);
    };

    const guardar = async () => {
        const actual = aApi(form);
        const campos = [
            ...(editaDatos ? CAMPOS_EDICION : []),
            ...(puedeSeguimiento ? ['nota_transportador'] : []),
            ...(puedeSeguimiento && puedeCosto ? ['costo_entrega'] : []),
        ];
        const payload = {};
        campos.forEach(c => { if (actual[c] !== inicial[c]) payload[c] = actual[c]; });
        if (editaDatos) {
            const prods = productosAApi(productos);
            if (JSON.stringify(prods) !== productosIniciales) {
                if (productos.some(p => !productoEnBlanco(p) && productoIncompleto(p))) {
                    return setError('Hay productos sin referencia, subcategoría ni descripción.');
                }
                if (!prods.length && !deInventario.length) {
                    return setError('La remisión debe quedar con al menos un producto.');
                }
                payload.items_manuales = prods;
            }
        }
        // El transportador externo y el interno se envían juntos para no dejar ambos.
        if ('transportador_usuario' in payload || 'transportador' in payload) {
            payload.transportador_usuario = actual.transportador_usuario;
            payload.transportador = actual.transportador;
        }
        if (!Object.keys(payload).length) {
            onClose();
            return;
        }
        if (editaDatos) {
            if (!actual.fecha_entrega) return setError('Indica la fecha de entrega.');
            if (!actual.direccion_entrega) return setError('Indica la dirección de entrega.');
            if (!form.sin_saldo && form.metodo_pago === 'otro' && !form.metodo_otro.trim()) {
                return setError('Escribe cómo se paga el saldo.');
            }
            if (actual.hora_desde && actual.hora_hasta && actual.hora_hasta <= actual.hora_desde) {
                return setError('La hora final debe ser después de la inicial.');
            }
        }
        setGuardando(true);
        setError('');
        try {
            const res = await API.patch(`/suministros/remisiones/${remision.id}/`, payload);
            onDone(res.data);
        } catch (err) {
            setError(primerError(err.response?.data) || 'No se pudieron guardar los cambios.');
            setGuardando(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={guardando ? undefined : onClose}
            size="lg"
            title={`${editaDatos ? 'Editar remisión' : 'Seguimiento de la remisión'} · No. ${numeroRemision(remision.id)}`}
            footer={(
                <>
                    <Button variant="secondary" onClick={onClose} disabled={guardando}>Cancelar</Button>
                    <Button icon={FaSave} loading={guardando} onClick={guardar}>Guardar cambios</Button>
                </>
            )}
        >
            <div className="nr-modal-stack">
                {editaDatos && (
                    <>
                        <div className="nr-modal-section">Programación</div>
                        <div className="nr-grid">
                            <div className="nr-field nr-col-12">
                                <label>Fecha de entrega</label>
                                <div className="nr-date-row">
                                    <div className="nr-chips">
                                        {fechasRapidas.map(f => (
                                            <button type="button" key={f.iso} className={`nr-chip${form.fecha_entrega === f.iso ? ' is-active' : ''}`} onClick={() => set('fecha_entrega', f.iso)}>
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="date"
                                        className="nr-input nr-date-input"
                                        aria-label="Fecha de entrega"
                                        value={form.fecha_entrega}
                                        onClick={e => { try { e.target.showPicker(); } catch { /* sin showPicker */ } }}
                                        onChange={e => set('fecha_entrega', e.target.value)}
                                    />
                                </div>
                                {form.fecha_entrega && <div className="nr-hint">{fmtFechaLarga(form.fecha_entrega)}</div>}
                            </div>
                            <div className="nr-field nr-col-12">
                                <label>Franja horaria</label>
                                <div className="nr-date-row">
                                    <div className="nr-chips">
                                        {FRANJAS.map(f => (
                                            <button
                                                type="button"
                                                key={f.key}
                                                className={`nr-chip${franjaActiva === f.key ? ' is-active' : ''}`}
                                                onClick={() => setForm(prev => ({ ...prev, hora_desde: f.desde, hora_hasta: f.hasta }))}
                                            >
                                                {f.label} <span className="nr-chip__sub">{fmtHora(f.desde)} – {fmtHora(f.hasta)}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="nr-time-range">
                                        <input type="time" className="nr-input" value={form.hora_desde} onChange={e => set('hora_desde', e.target.value)} aria-label="Hora desde" />
                                        <span>a</span>
                                        <input type="time" className="nr-input" value={form.hora_hasta} onChange={e => set('hora_hasta', e.target.value)} aria-label="Hora hasta" />
                                    </div>
                                </div>
                            </div>
                            <div className="nr-field nr-col-6">
                                <label htmlFor="re-transp">Transportador</label>
                                <select id="re-transp" {...input('transportador_usuario')}>
                                    <option value="">Sin asignar</option>
                                    {transportadores.map(t => <option key={t.id} value={t.id}>{t.first_name || t.username}</option>)}
                                    <option value="__otro__">Otro (externo)</option>
                                </select>
                            </div>
                            {form.transportador_usuario === '__otro__' && (
                                <div className="nr-field nr-col-6">
                                    <label htmlFor="re-transp-otro">Nombre del transportador</label>
                                    <input id="re-transp-otro" {...input('transportador', { placeholder: 'Empresa o persona' })} />
                                </div>
                            )}
                        </div>

                        <div className="nr-modal-section">Cliente y dirección</div>
                        <div className="nr-grid">
                            <div className="nr-field nr-col-6">
                                <label htmlFor="re-cliente">Recibe</label>
                                <input id="re-cliente" {...input('cliente_nombre')} />
                            </div>
                            <div className="nr-field nr-col-6">
                                <label htmlFor="re-doc">Documento</label>
                                <input id="re-doc" {...input('cliente_documento', { inputMode: 'numeric' })} />
                            </div>
                            <div className="nr-field nr-col-6">
                                <label htmlFor="re-tel1">Teléfono</label>
                                <input id="re-tel1" {...input('cliente_telefono1', { inputMode: 'tel' })} />
                            </div>
                            <div className="nr-field nr-col-6">
                                <label htmlFor="re-tel2">Teléfono alterno</label>
                                <input id="re-tel2" {...input('cliente_telefono2', { inputMode: 'tel' })} />
                            </div>
                            <div className="nr-field nr-col-12">
                                <label htmlFor="re-dir">Dirección de entrega</label>
                                <input id="re-dir" {...input('direccion_entrega')} />
                            </div>
                            <div className="nr-field nr-col-6">
                                <label htmlFor="re-barrio">Barrio</label>
                                <input id="re-barrio" {...input('barrio')} />
                            </div>
                            <div className="nr-field nr-col-6">
                                <label htmlFor="re-ciudad">Ciudad</label>
                                <input id="re-ciudad" {...input('ciudad')} />
                            </div>
                        </div>

                        <div className="nr-modal-section">Productos</div>
                        {deInventario.length > 0 && (
                            <div className="nr-modal-inv">
                                <span className="nr-modal-inv__title">
                                    Del inventario · para cambiarlos hay que anular y crear otra remisión
                                </span>
                                <ul>
                                    {deInventario.map(p => (
                                        <li key={p.key}>
                                            <strong>{p.referencia || 'Producto'}</strong>
                                            {[p.categoria, p.subcategoria].filter(Boolean).length > 0 && (
                                                <> · {[p.categoria, p.subcategoria].filter(Boolean).join(' · ')}</>
                                            )}
                                            {p.tela && <> · Tapizado: {p.tela}</>}
                                            <span className="nr-code">{p.codigo}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="rp-list">
                            {productos.map(p => (
                                <ProductoEditable
                                    key={p.key}
                                    item={p}
                                    catalogo={catalogo}
                                    onChange={patch => editarProducto(p.key, patch)}
                                    onRemove={() => setProductos(prev => prev.filter(x => x.key !== p.key))}
                                    autoFocus={p.key === nuevoKey}
                                />
                            ))}
                            <button type="button" className="rp-add" onClick={agregarProducto}>
                                <FaPlus /> Agregar un producto
                            </button>
                        </div>
                        <ReferenciasDatalist catalogo={catalogo} />

                        <div className="nr-modal-section">Cobro y notas</div>
                        <div className="nr-grid">
                            <div className="nr-field nr-col-12">
                                <div className="nr-segment" role="radiogroup" aria-label="Saldo">
                                    <button type="button" role="radio" aria-checked={!form.sin_saldo} className={`nr-segment__opt${!form.sin_saldo ? ' is-active' : ''}`} onClick={() => set('sin_saldo', false)}>
                                        Cobrar saldo al entregar
                                    </button>
                                    <button type="button" role="radio" aria-checked={form.sin_saldo} className={`nr-segment__opt${form.sin_saldo ? ' is-active' : ''}`} onClick={() => set('sin_saldo', true)}>
                                        Sin saldo (ya pagó)
                                    </button>
                                </div>
                            </div>
                            {!form.sin_saldo && (
                                <>
                                    <div className="nr-field nr-col-5">
                                        <label htmlFor="re-saldo">Valor a cobrar</label>
                                        <div className="nr-money">
                                            <span>$</span>
                                            <input
                                                id="re-saldo"
                                                inputMode="numeric"
                                                value={form.saldo ? formatCOP(parseInt(form.saldo, 10)).replace('$', '') : ''}
                                                onChange={e => set('saldo', e.target.value.replace(/\D/g, ''))}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="nr-field nr-col-7">
                                        <label>Método de pago</label>
                                        <div className="nr-chips">
                                            {METODOS_PAGO.map(m => (
                                                <button type="button" key={m.value} className={`nr-chip${form.metodo_pago === m.value ? ' is-active' : ''}`} onClick={() => set('metodo_pago', form.metodo_pago === m.value ? '' : m.value)}>
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>
                                        {form.metodo_pago === 'otro' && (
                                            <input
                                                {...input('metodo_otro')}
                                                className="nr-input nr-metodo-otro"
                                                placeholder="¿Cómo paga? Ej: transferencia a Bancolombia, datáfono…"
                                                maxLength={100}
                                                aria-label="Cómo se paga el saldo"
                                            />
                                        )}
                                    </div>
                                </>
                            )}
                            <div className="nr-field nr-col-6">
                                <label htmlFor="re-asesor">Asesor comercial</label>
                                <select id="re-asesor" {...input('vendedor')}>
                                    <option value="">Seleccione…</option>
                                    {vendedores.map(v => <option key={v.id} value={v.id}>{v.first_name || v.username}</option>)}
                                </select>
                            </div>
                            <div className="nr-field nr-col-12">
                                <label htmlFor="re-novedades">Novedades</label>
                                <textarea
                                    id="re-novedades"
                                    rows="2"
                                    {...input('novedades')}
                                    className="nr-input nr-textarea"
                                    placeholder="Faltantes, entregas parciales, detalles aceptados por el cliente…"
                                />
                            </div>
                        </div>
                    </>
                )}

                {puedeSeguimiento && (
                    <>
                        <div className="nr-modal-section">Seguimiento</div>
                        <div className="nr-grid">
                            {puedeCosto && (
                                <div className="nr-field nr-col-5">
                                    <label htmlFor="re-costo">Costo del flete</label>
                                    <div className="nr-money">
                                        <span>$</span>
                                        <input
                                            id="re-costo"
                                            inputMode="numeric"
                                            value={form.costo_entrega ? formatCOP(parseInt(form.costo_entrega, 10)).replace('$', '') : ''}
                                            onChange={e => set('costo_entrega', e.target.value.replace(/\D/g, ''))}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="nr-field nr-col-12">
                                <label htmlFor="re-nota">Nota del transportador</label>
                                <textarea id="re-nota" rows="2" {...input('nota_transportador')} className="nr-input nr-textarea" />
                            </div>
                        </div>
                    </>
                )}

                {editaDatos && (
                    <div className="nr-modal-note">
                        <FaInfoCircle />
                        <span>Los productos no se editan. Si cambian, anula esta remisión y crea una nueva.</span>
                    </div>
                )}
                {error && <div className="nr-alert nr-alert--danger">{error}</div>}
            </div>
        </Modal>
    );
};

export default RemisionEditarModal;
