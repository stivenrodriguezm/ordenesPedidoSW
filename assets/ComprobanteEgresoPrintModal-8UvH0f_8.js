import{R as j,j as e,r as N,B as w}from"./index-DdrxNfoj.js";import{M as y}from"./Modal-CwScgEZ6.js";import{B as _}from"./BotonImprimir-wgtueoCs.js";import{f as s}from"./formatCOP-yhuxI7nV.js";import{p as z}from"./dates-CiDIK8D2.js";import{g as C}from"./groupProductos-CBSD1nuG.js";/* empty css                                    */const v=n=>{const m=z(n);return m?m.toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"}).replace(".",""):"—"},k=j.forwardRef(({comprobante:n},m)=>{var b;if(!n)return null;const o=n.facturas_detalle||[],c=Array.isArray(n.otros_conceptos)?n.otros_conceptos:[],f=c.reduce((r,l)=>r+(parseFloat(l.valor)||0),0),h=n.proveedor_nombre||n.proveedor_otro_nombre||"N/A",a=o.reduce((r,l)=>{var t;return r+(((t=l.productos)==null?void 0:t.length)||0)},0),i=o.reduce((r,l)=>r+(parseFloat(l.valor)||0),0),x=parseFloat(n.valor)||0,g=i-x;let d=0;if(n.descripcion){const r=n.descripcion.match(/Descuento[^\d]*?([\d.,]+)/i);r&&(d=parseFloat(r[1].replace(/[^\d]/g,"")))}!d&&g>0&&(d=g);const p=i>0&&d>0?d/i:0,u=c.length>0?f:d-g;return e.jsxs("div",{ref:m,className:"cer-page",children:[e.jsxs("div",{className:"cer-header",children:[e.jsx("div",{className:"cer-logo",children:e.jsx("span",{children:"LOTTUS"})}),e.jsxs("div",{className:"cer-doc-title",children:[e.jsx("div",{className:"cer-doc-kicker",children:"Comprobante de Egreso"}),e.jsxs("div",{className:"cer-doc-number",children:["No. CE-",n.id]}),e.jsxs("div",{className:"cer-doc-date",children:["Fecha: ",v(n.fecha)]}),e.jsx("div",{className:"cer-doc-status-badge",children:e.jsx("span",{className:"cer-status-text",children:"Estado: Pagado"})})]})]}),e.jsxs("div",{className:"cer-meta-grid",children:[e.jsxs("div",{className:"cer-meta-box",children:[e.jsx("div",{className:"cer-meta-label",children:"Beneficiario / Proveedor"}),e.jsx("div",{className:"cer-meta-value",children:h}),n.recibido_por&&e.jsxs("div",{className:"cer-meta-sub",children:["Recibido por: ",n.recibido_por]})]}),e.jsxs("div",{className:"cer-meta-box",children:[e.jsx("div",{className:"cer-meta-label",children:"Medio de Pago"}),e.jsx("div",{className:"cer-meta-value",children:n.medio_pago||"—"})]})]}),n.concepto&&e.jsxs("div",{className:"cer-concepto",children:[e.jsx("span",{className:"cer-concepto-label",children:"Concepto:"})," ",n.concepto]}),((b=n.cuenta_destino_snapshot)==null?void 0:b.numero)&&e.jsxs("div",{className:"cer-concepto",children:[e.jsx("span",{className:"cer-concepto-label",children:"Cuenta destino:"})," ",n.cuenta_destino_snapshot.banco==="51"?"Davivienda":n.cuenta_destino_snapshot.banco==="7"?"Bancolombia":`Banco ${n.cuenta_destino_snapshot.banco}`," · ",n.cuenta_destino_snapshot.tipo," · ",n.cuenta_destino_snapshot.numero,e.jsx("br",{}),"Titular: ",n.cuenta_destino_snapshot.nombres," ",n.cuenta_destino_snapshot.apellidos]}),o.length>0&&e.jsxs("div",{className:"cer-section",children:[e.jsxs("div",{className:"cer-section-title",children:["Facturas pagadas (",o.length,")",a>0?` · ${a} producto${a===1?"":"s"}`:""]}),e.jsxs("table",{className:"cer-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Factura"}),e.jsx("th",{children:"Fecha"}),e.jsx("th",{className:"cer-right",children:"Valor"})]})}),e.jsx("tbody",{children:o.map((r,l)=>e.jsxs(j.Fragment,{children:[e.jsxs("tr",{className:"cer-factura-row",children:[e.jsxs("td",{className:"cer-bold",children:["#",r.id_manual||r.id]}),e.jsx("td",{children:v(r.fecha_factura)}),e.jsx("td",{className:"cer-right cer-bold",children:p>0?e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",lineHeight:1.2},children:[e.jsx("span",{style:{textDecoration:"line-through",color:"#94a3b8",fontSize:"0.65rem",fontWeight:"normal"},children:s(r.valor)}),e.jsx("span",{children:s(r.valor-r.valor*p)})]}):s(r.valor)})]}),r.productos&&r.productos.length>0&&e.jsx("tr",{className:"cer-productos-row",children:e.jsx("td",{colSpan:"3",children:e.jsx("div",{className:"cer-productos-list",children:C(r.productos).map(t=>e.jsxs("div",{className:"cer-producto-item",children:[e.jsx("span",{className:"cer-producto-dot",children:"•"}),e.jsxs("span",{className:"cer-producto-nombre",children:[t.cantidad>1?`x${t.cantidad} `:"",t.referencia_nombre,t.variacion?` — ${t.variacion}`:"",(t.categoria_nombre||t.subcategoria_nombre)&&e.jsxs("span",{className:"cer-producto-cat",children:[" ","(",[t.categoria_nombre,t.subcategoria_nombre].filter(Boolean).join(" · "),")"]})]}),e.jsx("span",{className:"cer-producto-costo",children:p>0?e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",lineHeight:1.2},children:[e.jsx("span",{style:{textDecoration:"line-through",color:"#94a3b8",fontSize:"0.55rem"},children:s(t.costo*t.cantidad)}),e.jsx("span",{children:s(t.costo*t.cantidad-t.costo*t.cantidad*p)})]}):s(t.costo*t.cantidad)})]},t.id))})})})]},r.id||l))})]})]}),c.length>0&&e.jsxs("div",{className:"cer-section",children:[e.jsxs("div",{className:"cer-section-title",children:["Otros conceptos (",c.length,")"]}),e.jsxs("table",{className:"cer-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Descripción"}),e.jsx("th",{className:"cer-right",children:"Valor"})]})}),e.jsx("tbody",{children:c.map((r,l)=>e.jsxs("tr",{children:[e.jsx("td",{children:r.descripcion}),e.jsx("td",{className:"cer-right cer-bold",children:s(r.valor)})]},l))})]})]}),n.descripcion&&e.jsxs("div",{className:"cer-notas",children:[e.jsx("div",{className:"cer-meta-label",children:"Notas"}),e.jsx("div",{className:"cer-notas-text",children:n.descripcion})]}),e.jsxs("div",{className:"cer-total-card",children:[i>0&&Math.abs(g)>.01&&e.jsxs("div",{className:"cer-total-breakdown",children:[e.jsxs("div",{className:"cer-total-row",children:[e.jsx("span",{children:"Subtotal Facturas"}),e.jsx("span",{children:s(i)})]}),d>0&&e.jsxs("div",{className:"cer-total-row",children:[e.jsxs("span",{children:["Descuento comercial (",(p*100).toFixed(1).replace(/\.0$/,""),"%)"]}),e.jsxs("span",{children:["-",s(d)]})]}),u>.01&&e.jsxs("div",{className:"cer-total-row",children:[e.jsx("span",{children:"Conceptos adicionales"}),e.jsxs("span",{children:["+",s(u)]})]})]}),e.jsxs("div",{className:"cer-total-final",children:[e.jsx("span",{className:"cer-total-label",children:"Valor Pagado"}),e.jsx("span",{className:"cer-total-value",children:s(n.valor)})]})]}),e.jsxs("div",{className:"cer-firma-box",children:[e.jsx("div",{className:"cer-firma-label",children:"Recibí conforme (beneficiario / proveedor)"}),e.jsxs("div",{className:"cer-firma-line",children:[e.jsx("div",{className:"cer-firma-sub",children:"Firma, C.C. / NIT y fecha de recepción"}),e.jsxs("div",{className:"cer-firma-nombre",children:["Nombre: ",n.recibido_por||h]})]})]}),e.jsx("div",{className:"cer-semantica-nota",children:"* Nota operativa: El comprobante impreso se expide como “Pagado” conforme a la política comercial del negocio. En pagos con medio de transferencia bancaria, el estado administrativo en base de datos permanece como “Por confirmar pago” hasta la conciliación y verificación por usuarios autorizados."}),e.jsxs("div",{className:"cer-footer",children:["LOTTUS · Documento de comprobante de egreso · Doc v1.0 · Impreso el"," ",new Date().toLocaleDateString("es-CO",{year:"numeric",month:"long",day:"numeric"})]})]})}),E=`/* Comprobante de Egreso — plantilla imprimible/vista previa.
   Diseño corporativo simple: negro/blanco, tipografía clara, pensado
   tanto para pantalla (dentro del modal de vista previa) como para
   impresión directa (ver src/styles/print.css). */

.cer-page {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  background: #ffffff;
  color: #0f172a;
  font-family: "Segoe UI", Arial, sans-serif;
  padding: 2.5rem 2.75rem;
  box-sizing: border-box;
  word-break: break-word;
  overflow-wrap: break-word;
}

.cer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #0f172a;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}

.cer-logo {
  background: #000000;
  padding: 0.65rem 1.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cer-logo span {
  color: #ffffff;
  font-weight: 400;
  font-size: 1.35rem;
  letter-spacing: 0.25rem;
  font-family: "Audiowide", cursive, sans-serif;
  text-transform: uppercase;
  line-height: 1;
}

.cer-doc-title {
  text-align: right;
}

.cer-doc-kicker {
  font-size: 0.62rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.12rem;
  margin-bottom: 0.15rem;
}

.cer-doc-number {
  font-size: 1.35rem;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: 0.02rem;
}

.cer-doc-date {
  font-size: 0.68rem;
  color: #475569;
  font-weight: 600;
  margin-top: 0.1rem;
}

.cer-doc-status-badge {
  display: inline-block;
  margin-top: 0.35rem;
  padding: 0.15rem 0.55rem;
  background: #f1f5f9;
  border: 1.5px solid #0f172a;
  border-radius: 3px;
}

.cer-status-text {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08rem;
  color: #0f172a;
}

.cer-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid #cbd5e1;
  margin-bottom: 1.25rem;
}

.cer-meta-box {
  padding: 0.75rem 1rem;
}

.cer-meta-box:first-child {
  border-right: 1px solid #cbd5e1;
}

.cer-meta-label {
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.06rem;
  margin-bottom: 0.25rem;
}

.cer-meta-value {
  font-size: 0.9rem;
  font-weight: 800;
  color: #0f172a;
}

.cer-meta-sub {
  font-size: 0.68rem;
  color: #475569;
  font-weight: 600;
  margin-top: 0.2rem;
}

.cer-concepto {
  font-size: 0.78rem;
  color: #334155;
  margin-bottom: 1.25rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-left: 3px solid #0f172a;
}

.cer-concepto-label {
  font-weight: 700;
  color: #0f172a;
}

.cer-section {
  margin-bottom: 1.25rem;
}

.cer-section-title {
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06rem;
  color: #475569;
  margin-bottom: 0.4rem;
}

.cer-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
  border: 1px solid #cbd5e1;
}

.cer-table thead tr {
  background: #0f172a;
}

.cer-table thead th {
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-weight: 700;
  font-size: 0.62rem;
  letter-spacing: 0.05rem;
  text-transform: uppercase;
  color: #ffffff;
}

.cer-right {
  text-align: right;
}

.cer-bold {
  font-weight: 700;
}

.cer-factura-row td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.cer-productos-row td {
  padding: 0 0.75rem 0.55rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.cer-productos-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding-top: 0.3rem;
}

.cer-producto-item {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  font-size: 0.72rem;
  color: #475569;
}

.cer-producto-dot {
  color: #94a3b8;
}

.cer-producto-nombre {
  flex: 1;
}

.cer-producto-cat {
  color: #94a3b8;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.cer-producto-costo {
  font-weight: 600;
  color: #334155;
  font-variant-numeric: tabular-nums;
}

.cer-notas {
  margin-bottom: 1.25rem;
}

.cer-notas-text {
  font-size: 0.78rem;
  color: #334155;
  font-style: italic;
  margin-top: 0.2rem;
}

.cer-total-card {
  margin-left: auto;
  width: 300px;
  border: 1px solid #cbd5e1;
  border-top: 3px solid #0f172a;
  border-radius: 3px;
  background: #ffffff;
  margin-bottom: 2rem;
  overflow: hidden;
}

.cer-total-breakdown {
  padding: 0.75rem 1rem 0.6rem;
}

.cer-total-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.74rem;
  color: #475569;
  font-weight: 600;
  padding: 0.18rem 0;
}

.cer-total-row span:last-child {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: #0f172a;
}

.cer-total-final {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0f172a;
  color: #ffffff;
  padding: 0.65rem 1rem;
}

.cer-total-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04rem;
  text-transform: uppercase;
}

.cer-total-value {
  font-size: 1.05rem;
  font-weight: 900;
}

.cer-firma-box {
  border: 1px solid #cbd5e1;
  padding: 1rem 1.1rem;
  min-height: 130px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.cer-firma-label {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #475569;
  letter-spacing: 0.05rem;
}

.cer-firma-line {
  border-top: 1.5px solid #0f172a;
  padding-top: 0.45rem;
}

.cer-firma-sub {
  font-size: 0.68rem;
  font-weight: 700;
  color: #0f172a;
}

.cer-firma-nombre {
  font-size: 0.62rem;
  color: #64748b;
  margin-top: 0.1rem;
}

.cer-semantica-nota {
  margin-top: 1rem;
  font-size: 0.62rem;
  color: #475569;
  line-height: 1.4;
  font-style: italic;
  padding: 0.45rem 0.65rem;
  background: #f8fafc;
  border-left: 2.5px solid #0f172a;
}

.cer-footer {
  margin-top: 1.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  font-size: 0.56rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05rem;
}

@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  @page {
    size: letter portrait;
    margin: 12mm;
  }
  body, .cer-page {
    padding: 0 !important;
    margin: 0 auto !important;
    max-width: 100% !important;
    background: transparent !important;
  }
  .cer-table tr,
  .cer-factura-row,
  .cer-productos-row,
  .cer-total-card,
  .cer-firma-box,
  .cer-meta-grid,
  .cer-concepto,
  .cer-notas,
  .cer-semantica-nota,
  .cer-section {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}

`,S=({open:n,onClose:m,comprobante:o})=>{const c=N.useRef(null),f=()=>{var a;return`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Comprobante de Egreso ${o?`CE-${o.id}`:""}</title>
<link href="https://fonts.googleapis.com/css2?family=Audiowide&display=swap" rel="stylesheet">
<style>
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  @page { size: letter portrait; margin: 12mm; }
  ${E}
</style>
</head>
<body>${((a=c.current)==null?void 0:a.outerHTML)||""}</body>
</html>`},h=()=>{if(!c.current)return;const a=document.createElement("iframe");a.style.position="fixed",a.style.right="0",a.style.bottom="0",a.style.width="0",a.style.height="0",a.style.border="0",document.body.appendChild(a);const i=a.contentWindow.document;i.open(),i.write(f()),i.close();const x=()=>{a.parentNode&&a.parentNode.removeChild(a)};setTimeout(()=>{a.contentWindow.focus(),a.contentWindow.print(),setTimeout(x,500)},250)};return e.jsx(y,{open:n,onClose:m,title:o?`Comprobante de Egreso CE-${o.id}`:"Comprobante de Egreso",size:"lg",footer:e.jsxs(e.Fragment,{children:[e.jsx(w,{variant:"secondary",onClick:m,children:"Cerrar"}),e.jsx(_,{documento:f,titulo:`Comprobante de Egreso ${o?`CE-${o.id}`:""}`,imprimirLocal:h})]}),children:e.jsx("div",{className:"cepm-preview-wrapper",children:e.jsx(k,{ref:c,comprobante:o})})})};export{S as C};
