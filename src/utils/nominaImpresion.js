import { ESTADO_VENTA, cop, fecha, pct } from './nomina';

/*
 * Hoja carta de la liquidación de nómina de un asesor. Sin logo ni nombre de la empresa:
 * solo los datos del asesor y de la nómina. Documento HTML completo para el iframe de
 * vista previa e impresión (NominaImpresionModal).
 */

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CSS = `
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #fff; }
  @page { size: letter portrait; margin: 12mm; }
  @media screen { body { padding: 12mm; } }
  body { font-family: Inter, 'Segoe UI', Arial, sans-serif; color: #111827; font-size: 10.5px; line-height: 1.4; }
  h1 { margin: 0; font-size: 17px; letter-spacing: 0.01em; }
  h2 { margin: 16px 0 6px; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; border-bottom: 1.5px solid #111827; padding-bottom: 3px; }
  h2 small { float: right; text-transform: none; letter-spacing: 0; font-weight: 400; color: #6b7280; font-size: 9.5px; padding-top: 2px; }
  .cab { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 10px; border-bottom: 2px solid #111827; }
  .cab p { margin: 3px 0 0; color: #4b5563; font-size: 11px; }
  .cab .fecha { text-align: right; color: #4b5563; font-size: 10px; }
  .borrador { display: inline-block; margin-top: 4px; padding: 1px 7px; border: 1px solid #b45309; border-radius: 3px; color: #b45309; font-weight: 700; font-size: 9.5px; letter-spacing: 0.04em; }
  .datos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; margin-top: 10px; border: 1px solid #d1d5db; border-radius: 4px; }
  .datos div { padding: 6px 9px; border-right: 1px solid #e5e7eb; }
  .datos div:last-child { border-right: none; }
  .datos span { display: block; color: #6b7280; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; }
  .datos strong { font-size: 11.5px; }
  .resumen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 8px; }
  .resumen div { padding: 7px 9px; border: 1px solid #d1d5db; border-radius: 4px; }
  .resumen span { display: block; color: #6b7280; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; }
  .resumen strong { display: block; font-size: 13px; font-variant-numeric: tabular-nums; }
  .resumen small { color: #6b7280; font-size: 9px; }
  .resumen .total { border: 2px solid #111827; }
  table { width: 100%; border-collapse: collapse; font-size: 9.8px; }
  th { padding: 4px 5px; border-bottom: 1px solid #111827; text-align: left; font-weight: 600; color: #374151; white-space: nowrap; }
  td { padding: 3.5px 5px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  tr { page-break-inside: avoid; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .pend td { color: #6b7280; }
  .motivo { display: block; font-size: 8.8px; color: #92400e; }
  tfoot td { border-bottom: none; border-top: 1px solid #111827; font-weight: 700; }
  .vacio { margin: 4px 0; color: #6b7280; font-style: italic; }
  .neg { color: #b91c1c; }
  .recibo { margin-top: 22px; padding: 12px 14px 14px; border: 1px solid #111827; border-radius: 4px; page-break-inside: avoid; }
  .recibo p { margin: 0 0 4px; font-size: 10.5px; line-height: 1.5; }
  .recibo .firma { height: 62px; border-bottom: 1px solid #111827; margin-top: 10px; }
  .recibo .etiqueta { display: block; margin-top: 3px; font-size: 9px; color: #374151; text-transform: uppercase; letter-spacing: 0.04em; }
  .recibo .campos { display: grid; grid-template-columns: 1.6fr 1fr; gap: 28px; margin-top: 16px; }
  .recibo .linea { height: 26px; border-bottom: 1px solid #111827; }
  .nota { margin-top: 14px; color: #6b7280; font-size: 9px; }
`;

function tablaComisiones(lineas) {
    if (!lineas.length) return '<p class="vacio">Sin comisiones en este cierre.</p>';
    const pagadas = lineas.filter(l => l.pagar).reduce((s, l) => s + Number(l.valor || 0), 0);
    return `<table><thead><tr><th>Venta</th><th>Fecha</th><th class="num">Precio de lista</th><th class="num">Valor venta</th>
        <th class="num">% Dcto.</th><th class="num">Comisión</th><th>Pago</th></tr></thead><tbody>
        ${lineas.map(l => `<tr class="${l.pagar ? '' : 'pend'}">
            <td>#${esc(l.venta)}${l.participantes > 1 ? ` <small>(÷${esc(l.participantes)})</small>` : ''}</td>
            <td>${esc(fecha(l.fecha_venta))}</td>
            <td class="num">${l.precio_lista ? esc(cop(l.precio_lista)) : 'Sin precio'}</td>
            <td class="num">${esc(cop(l.valor_venta))}</td><td class="num">${esc(pct(l.descuento_pct))}</td>
            <td class="num">${esc(cop(l.valor))}</td>
            <td>${l.pagar ? 'Sí' : `No${l.motivo_pendiente ? `<span class="motivo">${esc(l.motivo_pendiente)}</span>` : ''}`}</td></tr>`).join('')}
        </tbody><tfoot><tr><td colspan="5">Comisiones a pagar</td><td class="num">${esc(cop(pagadas))}</td><td></td></tr></tfoot></table>`;
}

function tablaBonificaciones(lineas) {
    if (!lineas.length) return '<p class="vacio">Sin bonificaciones en este cierre.</p>';
    return `<table><thead><tr><th>Venta</th><th>Estado</th><th>Ganada en</th><th class="num">Base</th><th class="num">%</th>
        <th class="num">Bonificación</th><th>Se paga</th></tr></thead><tbody>
        ${lineas.map(l => `<tr class="${l.pagar ? '' : 'pend'}"><td>#${esc(l.venta)}</td>
            <td>${esc(ESTADO_VENTA[l.estado_venta] || l.estado_venta)}</td><td>${esc(l.causada_en?.nombre || '')}</td>
            <td class="num">${esc(cop(l.base))}</td><td class="num">${esc(pct(l.porcentaje))}</td><td class="num">${esc(cop(l.valor))}</td>
            <td>${l.pagar ? 'Sí' : `No${l.motivo_pendiente ? `<span class="motivo">${esc(l.motivo_pendiente)}</span>` : ''}`}</td></tr>`).join('')}
        </tbody></table>`;
}

function tablaAjustes(lineas) {
    if (!lineas.length) return '<p class="vacio">Sin ajustes.</p>';
    return `<table><tbody>${lineas.map(l => `<tr><td>${esc(l.cliente)}</td>
        <td class="num ${Number(l.valor) < 0 ? 'neg' : ''}">${Number(l.valor) > 0 ? '+' : ''}${esc(cop(l.valor))}</td></tr>`).join('')}</tbody></table>`;
}

export function hojaNomina(cierre, asesor, hoy = new Date()) {
    const t = asesor.totales;
    const por = (tipo) => asesor.lineas.filter(l => l.tipo === tipo);
    const pendiente = Number(t.comisiones_pendientes) + Number(t.bonificaciones_pendientes);
    const cuerpo = `
<header class="cab">
  <div>
    <h1>Liquidación de nómina</h1>
    <p>${esc(cierre.nombre)} · ventas del ${esc(fecha(cierre.fecha_inicio))} al ${esc(fecha(cierre.fecha_fin))}</p>
    ${(asesor.estado ?? cierre.estado) === 'cerrado' ? '' : '<span class="borrador">BORRADOR · SUJETO A CAMBIOS</span>'}
  </div>
  <div class="fecha">Impreso el ${esc(hoy.toLocaleDateString('es-CO'))}</div>
</header>
<section class="datos">
  <div><span>Asesor</span><strong>${esc(asesor.nombre)}</strong></div>
  <div><span>Ventas del período</span><strong>${esc(cop(asesor.ventas_periodo))}</strong></div>
  <div><span>Meta</span><strong>${Number(asesor.meta) > 0 ? esc(cop(asesor.meta)) : 'Sin meta'} · ${asesor.cumple_meta ? 'Cumple' : 'No cumple'}</strong></div>
</section>
<h2>Resumen</h2>
<section class="resumen">
  <div class="total"><span>Total nómina</span><strong>${esc(cop(t.total_nomina))}</strong><small>Pago ${esc(cierre.pago_nomina || '')}</small></div>
  <div><span>Comisiones</span><strong>${esc(cop(t.comisiones))}</strong></div>
  <div><span>Bonificaciones</span><strong>${esc(cop(t.bonificaciones))}</strong></div>
  <div><span>Ajustes</span><strong class="${Number(t.ajustes) < 0 ? 'neg' : ''}">${esc(cop(t.ajustes))}</strong></div>
  <div><span>Salario básico</span><strong>${esc(cop(t.salario_basico))}</strong><small>Pago el día ${esc(cierre.dia_pago_basico ?? '')}</small></div>
  <div><span>Queda pendiente</span><strong>${esc(cop(pendiente))}</strong><small>Pasa al próximo cierre</small></div>
</section>
<h2>Comisiones <small>Abono mínimo para pagar: ${esc(pct(cierre.abono_minimo_pct))}</small></h2>
${tablaComisiones(por('comision'))}
<h2>Bonificaciones <small>${esc(pct(cierre.bonificacion_pct))} al cumplir la meta; se pagan al entregar</small></h2>
${tablaBonificaciones(por('bonificacion'))}
<h2>Ajustes</h2>
${tablaAjustes(por('ajuste'))}
<p class="nota">El total de nómina incluye comisiones, bonificaciones y ajustes marcados para pago. El salario básico se paga por separado.</p>
<section class="recibo">
  <p>Con mi firma declaro que recibí a satisfacción el pago de <strong>${esc(cop(t.total_nomina))}</strong> correspondiente a esta
  liquidación de nómina (${esc(cierre.nombre)}) y que esa cifra me fue pagada en su totalidad.</p>
  <div class="firma"></div><span class="etiqueta">Firma</span>
  <div class="campos">
    <div><div class="linea"></div><span class="etiqueta">Nombre</span></div>
    <div><div class="linea"></div><span class="etiqueta">Fecha</span></div>
  </div>
</section>`;
    const titulo = `Nomina ${asesor.nombre} - ${cierre.nombre}`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${esc(titulo)}</title><style>${CSS}</style></head><body>${cuerpo}</body></html>`;
}
