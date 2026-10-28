import React, { useEffect, useState } from 'react';
import { FaMinus, FaPlus, FaTimes } from 'react-icons/fa';
import { leerPesos, mostrarPesos } from '../../utils/capturaPrecios';
import { adicionalIncompleto, netoAdicionales, nuevoAdicional } from '../../utils/adicionalesFactura';
import './AdicionalesFactura.css';

/*
 * Adicionales de una factura de proveedor (2026-10-28): lo que por alguna razón se le paga de más
 * o de menos (transporte, embalaje, descuento acordado…). Cada uno es un concepto, si suma o resta
 * y su valor en pesos enteros; el total de la factura los incluye.
 */


function Valor({ valor, onCommit, n }) {
    const [texto, setTexto] = useState(mostrarPesos(valor));
    const [error, setError] = useState('');
    useEffect(() => { setTexto(mostrarPesos(valor)); }, [valor]);
    const confirmar = () => {
        if (!texto.trim()) { setError(''); onCommit(null); return; }
        try {
            const v = leerPesos(texto);
            if (v < 1) throw new Error('El valor debe ser mayor a $0.');
            setError(''); onCommit(String(v)); setTexto(mostrarPesos(v));
        } catch (e) { setError(e.message); }
    };
    return (
        <div className="af-valor">
            <input aria-label={`Valor del adicional ${n}`} inputMode="numeric" placeholder="$0" value={texto} aria-invalid={!!error}
                className={error ? 'is-error' : undefined} onChange={e => setTexto(e.target.value)} onBlur={confirmar}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmar(); } }} />
            {error && <small className="af-error" role="alert">{error}</small>}
        </div>
    );
}

export default function AdicionalesFactura({ ajustes, onChange, mostrarFaltas = false, formatear }) {
    const cambiar = (i, patch) => onChange(ajustes.map((a, j) => (j === i ? { ...a, ...patch } : a)));
    const neto = netoAdicionales(ajustes);
    return (
        <section className="af" aria-label="Adicionales de la factura">
            <div className="af-cabeza">
                <div>
                    <h4>Adicionales</h4>
                    <p>Lo que se le paga de más o de menos al proveedor (transporte, embalaje, un descuento…). Se suma o resta al total.</p>
                </div>
                {ajustes.length > 0 && <span className={`af-neto ${neto < 0 ? 'is-resta' : ''}`}>{neto < 0 ? '−' : '+'}{formatear(Math.abs(neto))}</span>}
            </div>
            {ajustes.map((a, i) => {
                const falta = mostrarFaltas && adicionalIncompleto(a);
                return (
                    <div key={a.id || a.clave} className={`af-fila${falta ? ' is-falta' : ''}`}>
                        <input aria-label={`Concepto del adicional ${i + 1}`} maxLength={200} placeholder="Concepto (ej.: Transporte del proveedor)"
                            value={a.concepto} onChange={e => cambiar(i, { concepto: e.target.value })} />
                        <div className="af-tipo" role="radiogroup" aria-label={`Suma o resta el adicional ${i + 1}`}>
                            <button type="button" role="radio" aria-checked={a.tipo !== 'resta'} className={a.tipo !== 'resta' ? 'is-activo' : ''} onClick={() => cambiar(i, { tipo: 'suma' })}><FaPlus aria-hidden="true" /> Suma</button>
                            <button type="button" role="radio" aria-checked={a.tipo === 'resta'} className={a.tipo === 'resta' ? 'is-activo is-resta' : ''} onClick={() => cambiar(i, { tipo: 'resta' })}><FaMinus aria-hidden="true" /> Resta</button>
                        </div>
                        <Valor valor={a.valor} n={i + 1} onCommit={v => cambiar(i, { valor: v })} />
                        <button type="button" className="af-quitar" aria-label={`Quitar el adicional ${i + 1}`} title="Quitar" onClick={() => onChange(ajustes.filter((_, j) => j !== i))}><FaTimes /></button>
                        {falta && <small className="af-error af-error--fila">Escribe el concepto y el valor, o quítalo.</small>}
                    </div>
                );
            })}
            <button type="button" className="af-agregar" onClick={() => onChange([...ajustes, nuevoAdicional()])}><FaPlus aria-hidden="true" /> Agregar adicional</button>
        </section>
    );
}
