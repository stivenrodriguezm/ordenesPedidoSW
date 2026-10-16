import React, { useState } from 'react';
import { FaPrint } from 'react-icons/fa';
import { Badge } from '../ui';
import { cop, pct } from '../../utils/nomina';
import NominaImpresionModal from './NominaImpresionModal';

// Cierre general del mes: una fila por asesor y lo que se le paga (D12a). El % de
// descuento global compara las ventas con la suma de sus precios de lista.
export default function CierreGeneral({ cierre, abrirAsesor }) {
    const r = cierre.resumen;
    const [imprimir, setImprimir] = useState(null);
    const descuento = (v) => (v == null ? <span className="nom-muted" title="Ninguna venta tiene precio de lista">—</span> : pct(v));
    return (
        <div className="nom-tabla-wrap">
            {imprimir && <NominaImpresionModal cierre={cierre} asesor={imprimir} onClose={() => setImprimir(null)} />}
            <table className="nom-tabla">
                <thead>
                    <tr>
                        <th>Asesor</th>
                        <th className="num">Ventas</th>
                        <th className="num">% Dcto. global<small>Ventas vs. precio de lista</small></th>
                        <th className="num">Comisiones</th>
                        <th className="num">Bonificaciones</th>
                        <th className="num">Básico<small>Pago el día {cierre.dia_pago_basico}</small></th>
                        <th className="num nom-col-total">Total nómina<small>Pago {cierre.pago_nomina}</small></th>
                        <th><span className="sr-only">Imprimir</span></th>
                    </tr>
                </thead>
                <tbody>
                    {cierre.asesores.map(a => (
                        <tr key={a.id}>
                            <td>
                                <button type="button" className="nom-link" onClick={() => abrirAsesor(a.id)}>{a.nombre}</button>
                                {' '}<Badge tone={a.estado === 'cerrado' ? 'success' : 'warning'}>{a.estado === 'cerrado' ? 'Cerrada' : 'Abierta'}</Badge>
                            </td>
                            <td className="num">{cop(a.ventas_periodo)}</td>
                            <td className="num">{descuento(a.totales.descuento_global_pct)}</td>
                            <td className="num">{cop(a.totales.comisiones)}</td>
                            <td className="num">{cop(a.totales.bonificaciones)}</td>
                            <td className="num">{cop(a.totales.salario_basico)}</td>
                            <td className="num nom-col-total"><strong>{cop(a.totales.total_nomina)}</strong></td>
                            <td><button type="button" className="nom-imprimir" onClick={() => setImprimir(a)} aria-label={`Imprimir nómina de ${a.nombre}`} title="Imprimir (carta)"><FaPrint /></button></td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <th>Total</th>
                        <th className="num">{cop(r.ventas_periodo)}</th>
                        <th className="num">{descuento(r.descuento_global_pct)}</th>
                        <th className="num">{cop(r.comisiones)}</th>
                        <th className="num">{cop(r.bonificaciones)}</th>
                        <th className="num">{cop(r.salario_basico)}</th>
                        <th className="num nom-col-total">{cop(r.total_nomina)}</th>
                        <th />
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
