import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FaTrash, FaUndo } from 'react-icons/fa';
import API from '../services/api';
import './RemisionProductos.css';

/*
 * Productos de remisión que no salen del inventario (líneas de orden de pedido y
 * productos escritos a mano): categoría, subcategoría, referencia, cantidad y la
 * descripción que ve el cliente. Lo usan el formulario de creación y el de edición.
 */

const CATALOGO_VACIO = { categorias: [], referencias: [] };
let catalogoPromise = null;

/** Categorías, subcategorías y referencias conocidas (se piden una sola vez). */
export function useCatalogoRemision() {
    const [catalogo, setCatalogo] = useState(CATALOGO_VACIO);
    useEffect(() => {
        let vivo = true;
        if (!catalogoPromise) {
            catalogoPromise = API.get('/suministros/remisiones/catalogo/')
                .then(res => res.data || CATALOGO_VACIO)
                .catch(() => {
                    catalogoPromise = null;
                    return CATALOGO_VACIO;
                });
        }
        catalogoPromise.then(data => { if (vivo) setCatalogo(data); });
        return () => { vivo = false; };
    }, []);
    return catalogo;
}

const LISTA_REFERENCIAS = 'rp-referencias';

/** Sugerencias para el campo Referencia (una sola vez por pantalla). */
export function ReferenciasDatalist({ catalogo }) {
    return (
        <datalist id={LISTA_REFERENCIAS}>
            {catalogo.referencias.map(r => <option key={r.nombre} value={r.nombre} />)}
        </datalist>
    );
}

export const productoVacio = (datos = {}) => ({
    categoria: null, subcategoria: null, referencia: '', descripcion: '', tela: '', cantidad: 1, ...datos,
});

/** Sin ningún dato: se ignora al guardar. */
export const productoEnBlanco = p => !p.categoria && !p.subcategoria && !p.referencia.trim() && !p.descripcion.trim();

/** Necesita al menos referencia, subcategoría o descripción para saber qué se entrega. */
export const productoIncompleto = p => !p.subcategoria && !p.referencia.trim() && !p.descripcion.trim();

export const productoAApi = p => ({
    categoria: p.categoria || null,
    subcategoria: p.subcategoria || null,
    referencia: p.referencia.trim(),
    descripcion: p.descripcion.trim(),
    tela: (p.tela || '').trim(),
    cantidad: Math.max(1, parseInt(p.cantidad, 10) || 1),
});

/**
 * Tapizado del producto para el cliente: material, referencia y color (viene de la
 * venta). Es opcional: no todos los productos llevan tela. Un interruptor confirma si
 * lleva tela o cuero; apagado se guarda vacío. Sin proveedor, precio ni metraje.
 */
export function TelaProducto({ value, onChange, disabled }) {
    const [lleva, setLleva] = useState(!!(value || '').trim());
    const campo = useRef(null);
    // Si la tela llega después (al cargar la venta), el interruptor se enciende solo.
    useEffect(() => { if ((value || '').trim()) setLleva(true); }, [value]);
    const alternar = () => {
        if (lleva) { setLleva(false); onChange(''); return; }
        setLleva(true);
        setTimeout(() => campo.current?.focus(), 0);
    };
    return (
        <div className={`rp-tela${lleva ? ' is-on' : ''}`}>
            <button type="button" role="switch" aria-checked={lleva} className="rp-tela__switch" onClick={alternar} disabled={disabled}>
                <span className="rp-tela__pista" aria-hidden="true" />
                <span>{lleva ? 'Lleva tela o cuero' : '¿Lleva tela o cuero?'}</span>
            </button>
            {lleva && (
                <input
                    ref={campo}
                    className="nr-input"
                    maxLength={200}
                    value={value || ''}
                    placeholder="Material, referencia y color · ej.: Tela Lino · color arena"
                    onChange={e => onChange(e.target.value)}
                    disabled={disabled}
                    aria-label="Tapizado (tela o cuero)"
                />
            )}
        </div>
    );
}

/**
 * Descripción de un producto de inventario solo para esta remisión: arranca con el texto
 * del inventario y el inventario nunca cambia. `value` sin definir = texto original.
 */
export function DescripcionInventario({ value, original, onChange }) {
    const ref = useRef(null);
    const texto = value ?? original;
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight + 2}px`;
    }, [texto]);
    return (
        <div className="rp-inv">
            <textarea
                ref={ref}
                className="nr-input rp-inv__desc"
                rows={1}
                value={texto}
                placeholder={original || 'Descripción para el cliente: color, tela, medidas, acabados…'}
                onChange={e => onChange(e.target.value)}
                aria-label="Descripción en la remisión"
            />
            {value != null && value !== original && original && (
                <button type="button" className="nr-link rp-restore" onClick={() => onChange(undefined)}>
                    <FaUndo /> Usar el texto del inventario
                </button>
            )}
        </div>
    );
}

/**
 * Una línea editable. `onToggle` muestra la casilla de incluir (líneas de pedido),
 * `onRemove` el botón de quitar (productos a mano) y `original` el enlace para volver
 * al texto del pedido cuando se cambió la descripción.
 */
export function ProductoEditable({
    item, catalogo, onChange, incluido = true, onToggle, onRemove, original, aviso, extra, error, autoFocus,
}) {
    const descRef = useRef(null);
    const categoriaDeSub = useMemo(() => {
        const m = {};
        catalogo.categorias.forEach(c => c.subcategorias.forEach(s => { m[s.id] = c.id; }));
        return m;
    }, [catalogo]);
    const categoria = catalogo.categorias.find(c => c.id === item.categoria);

    // La descripción crece con el texto (los pedidos traen varias líneas).
    useLayoutEffect(() => {
        const el = descRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight + 2}px`;
    }, [item.descripcion]);

    const cambiarCategoria = valor => {
        const id = valor ? Number(valor) : null;
        onChange({ categoria: id, subcategoria: id && categoriaDeSub[item.subcategoria] === id ? item.subcategoria : null });
    };
    const cambiarSubcategoria = valor => {
        const id = valor ? Number(valor) : null;
        onChange({ subcategoria: id, categoria: id ? categoriaDeSub[id] ?? item.categoria : item.categoria });
    };
    const cambiarReferencia = valor => {
        const patch = { referencia: valor };
        // Una referencia conocida completa la categoría y subcategoría si están vacías.
        const conocida = catalogo.referencias.find(r => r.nombre.toLowerCase() === valor.trim().toLowerCase());
        if (conocida && !item.categoria && !item.subcategoria) {
            patch.categoria = conocida.categoria;
            patch.subcategoria = conocida.subcategoria;
        }
        onChange(patch);
    };

    const apagado = !incluido;
    const cambioDescripcion = original != null && item.descripcion !== original;

    return (
        <div className={`rp-item${apagado ? ' is-off' : ''}${error ? ' has-error' : ''}`}>
            {onToggle && (
                <input
                    type="checkbox"
                    className="nr-check rp-item__check"
                    checked={incluido}
                    onChange={onToggle}
                    aria-label="Incluir en la remisión"
                />
            )}
            <div className="rp-item__main">
                <div className="rp-item__fields">
                    <select
                        className="nr-input rp-cat"
                        value={item.categoria ?? ''}
                        onChange={e => cambiarCategoria(e.target.value)}
                        disabled={apagado}
                        aria-label="Categoría"
                    >
                        <option value="">Categoría</option>
                        {catalogo.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <select
                        className="nr-input rp-sub"
                        value={item.subcategoria ?? ''}
                        onChange={e => cambiarSubcategoria(e.target.value)}
                        disabled={apagado}
                        aria-label="Subcategoría"
                    >
                        <option value="">Subcategoría</option>
                        {categoria
                            ? categoria.subcategorias.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)
                            : catalogo.categorias.map(c => (
                                <optgroup key={c.id} label={c.nombre}>
                                    {c.subcategorias.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </optgroup>
                            ))}
                    </select>
                    <input
                        className="nr-input rp-ref"
                        list={LISTA_REFERENCIAS}
                        placeholder="Referencia"
                        value={item.referencia}
                        onChange={e => cambiarReferencia(e.target.value)}
                        disabled={apagado}
                        autoFocus={autoFocus}
                        aria-label="Referencia"
                    />
                    <label className="rp-cant">
                        <span>Cant.</span>
                        <input
                            type="number"
                            min="1"
                            inputMode="numeric"
                            className="nr-input"
                            value={item.cantidad}
                            onChange={e => onChange({ cantidad: e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            disabled={apagado}
                        />
                    </label>
                    <textarea
                        ref={descRef}
                        className="nr-input rp-desc"
                        rows={1}
                        placeholder="Descripción para el cliente: color, tela, medidas, acabados…"
                        value={item.descripcion}
                        onChange={e => onChange({ descripcion: e.target.value })}
                        disabled={apagado}
                        aria-label="Descripción"
                    />
                    <TelaProducto value={item.tela} onChange={tela => onChange({ tela })} disabled={apagado} />
                </div>
                {(aviso || extra || cambioDescripcion || error) && !apagado && (
                    <div className="rp-item__foot">
                        {error && <span className="rp-error">{error}</span>}
                        {aviso}
                        {extra}
                        {cambioDescripcion && (
                            <button type="button" className="nr-link rp-restore" onClick={() => onChange({ descripcion: original })}>
                                <FaUndo /> Usar el texto del pedido
                            </button>
                        )}
                    </div>
                )}
            </div>
            {onRemove && (
                <button type="button" className="nr-icon-btn rp-item__remove" onClick={onRemove} title="Quitar" aria-label="Quitar producto">
                    <FaTrash />
                </button>
            )}
        </div>
    );
}
