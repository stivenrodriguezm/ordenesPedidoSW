import React, { useState } from 'react';
import { FaCamera, FaQrcode } from 'react-icons/fa';
import EscanerQR from './EscanerQR';
import { Button } from './ui';
import { camaraDisponible } from '../utils/camara';
import { unidadDeCodigo } from '../utils/remisiones';

/**
 * Verificación opcional de la carga o la entrega con el QR de cada producto
 * (P11-05). Solo marca en pantalla; no cambia nada en el servidor. Un código
 * que no va en la remisión se avisa de inmediato (error de cargue).
 */
export default function VerificarRemisionQR({ remision, verificados, setVerificados }) {
    const [abierto, setAbierto] = useState(false);
    const [camara, setCamara] = useState(false);
    const [codigo, setCodigo] = useState('');
    const [aviso, setAviso] = useState(null);
    const unidades = remision?.inventario_items_detalle || [];
    const sinCodigo = (remision?.items_manuales || []).length;
    if (!unidades.length) return null;

    const leer = (texto) => {
        const u = unidadDeCodigo(texto, remision);
        if (!u) {
            setAviso({ ok: false, texto: `“${String(texto).slice(0, 40)}” no va en esta remisión.` });
            return;
        }
        setVerificados(prev => (prev.includes(u.id_referencia) ? prev : [...prev, u.id_referencia]));
        setAviso({ ok: true, texto: `${verificados.includes(u.id_referencia) ? 'Ya verificado' : 'Verificado'}: ${u.producto_nombre || 'Producto'} · ${u.id_referencia}` });
    };

    if (!abierto) {
        return (
            <Button variant="secondary" icon={FaQrcode} onClick={() => setAbierto(true)}>
                Verificar productos con QR (opcional)
            </Button>
        );
    }
    return (
        <section className="nr-field verificar-qr" aria-label="Verificar con QR">
            <strong>Verificados {verificados.length} de {unidades.length} productos con código</strong>
            {sinCodigo > 0 && <span className="nr-hint">Los productos escritos o de pedido no tienen QR: revísalos a la vista.</span>}
            <form onSubmit={e => { e.preventDefault(); if (codigo.trim()) { leer(codigo); setCodigo(''); } }} className="verificar-qr__form">
                <input aria-label="Código del producto" className="nr-input" value={codigo} onChange={e => setCodigo(e.target.value)}
                    placeholder="Escribe el código o usa la cámara" autoComplete="off" />
                <Button type="submit" variant="secondary" disabled={!codigo.trim()}>Verificar</Button>
                {camaraDisponible() && !camara && <Button variant="secondary" icon={FaCamera} onClick={() => setCamara(true)}>Cámara</Button>}
            </form>
            {camara && <EscanerQR alLeer={leer} cerrar={() => setCamara(false)} />}
            {aviso && <p role="status" className={`nr-alert ${aviso.ok ? 'nr-alert--success' : 'nr-alert--danger'}`}>{aviso.texto}</p>}
            <ul className="verificar-qr__lista">
                {unidades.map(u => (
                    <li key={u.id_referencia} className={verificados.includes(u.id_referencia) ? 'is-ok' : ''}>
                        {verificados.includes(u.id_referencia) ? '✓' : '○'} {u.producto_nombre || 'Producto'} · {u.id_referencia}
                    </li>
                ))}
            </ul>
        </section>
    );
}
