import{r as d,R as Qe,j as e,B as J,bC as he,C as We,ax as Oe,ac as oe,l as le,as as ge,Q as Te,a$ as de,o as He,by as _e,b1 as Ye,A as Ze,m as Ae,ak as Xe,W as en,cn as nn,ar as sn,E as an,q as on,e as Fe}from"./index-DdrxNfoj.js";import{u as xe}from"./useQuery-Dgd7IaVK.js";import{u as rn}from"./useMutation-CnwVbRY8.js";import{d as tn,t as cn,n as ln,f as me,a as Ve,p as re,m as dn,g as Ue,i as pn,b as mn,c as un,e as hn,h as gn,j as xn}from"./capturaPrecios-BAqyXnrZ.js";import{P as bn}from"./PageHeader-Bvl9vAZJ.js";import{f as v}from"./formatCOP-yhuxI7nV.js";import{m as jn}from"./errores-BlcEEFvV.js";import{M as je}from"./Modal-CwScgEZ6.js";import{B as fn}from"./BotonImprimir-wgtueoCs.js";/* empty css                                    */import"./suspense-tMGEjK3j.js";import"./utils-km2FGkQ4.js";import"./useDialogo-j9hbG4or.js";const Pe="lp_cotizacion_cart",Le=a=>`lp_cotizacion_cart_${a??"anon"}`;function De(a){try{localStorage.getItem(Pe)&&localStorage.removeItem(Pe);const n=localStorage.getItem(a);return n?JSON.parse(n):[]}catch{return[]}}function vn(a){const n=Le(a),[i,p]=d.useState(()=>De(n)),w=d.useRef(a);d.useEffect(()=>{w.current!==a&&(w.current=a,p(De(Le(a))))},[a]),d.useEffect(()=>{try{i.length===0?localStorage.removeItem(n):localStorage.setItem(n,JSON.stringify(i))}catch{}},[i,n]);const m=d.useCallback(x=>{p(l=>[...l,{...x,id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,cantidad:Math.max(1,x.cantidad||1)}])},[]),k=d.useCallback(x=>{p(l=>[...l,...x.map((s,o)=>({...s,id:`${Date.now()}-${o}-${Math.random().toString(36).slice(2,8)}`,cantidad:Math.max(1,s.cantidad||1)}))])},[]),b=d.useCallback(x=>{p(l=>l.filter(s=>s.id!==x))},[]),A=d.useCallback((x,l)=>{p(s=>s.map(o=>o.id===x?{...o,cantidad:Math.max(1,l)}:o))},[]),E=d.useCallback((x,l)=>{p(s=>s.map(o=>o.id===x?{...o,...l,id:x}:o))},[]),f=d.useCallback((x,l)=>{if(x.length<2||!l.trim())return;const s=`conjunto-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;p(o=>o.map(I=>x.includes(I.id)?{...I,conjuntoId:s,conjuntoNombre:l.trim()}:I))},[]),h=d.useCallback(x=>{p(l=>l.map(s=>s.conjuntoId===x?{...s,conjuntoId:null,conjuntoNombre:""}:s))},[]),S=d.useCallback(()=>{p([]);try{localStorage.removeItem(n)}catch{}},[n]),C=i.reduce((x,l)=>x+(Number(l.precioUnitario)||0)*l.cantidad,0),M=d.useMemo(()=>tn(i),[i]),q=Object.values(M).reduce((x,l)=>x+l.valor,0),O=d.useMemo(()=>cn(i),[i]),D=Object.values(O).reduce((x,l)=>x+l.valor,0),P=C-q-D,$=d.useCallback(x=>{var l,s;return(((l=M[x])==null?void 0:l.valor)||0)+(((s=O[x])==null?void 0:s.valor)||0)},[M,O]);return{items:i,agregarItem:m,agregarItems:k,quitarItem:b,actualizarCantidad:A,actualizarItem:E,agrupar:f,desagrupar:h,vaciar:S,total:P,bruto:C,incluido:q,incluidos:M,transportes:O,transporteCompartido:D,descontado:$}}const ue=a=>a.toLocaleDateString("es-CO",{day:"2-digit",month:"short",year:"numeric"}).replace(".",""),Nn=Qe.forwardRef(({items:a,cliente:n,vendedorNombre:i,folio:p,descuento:w=0},m)=>{const k=a.reduce((h,S)=>h+(Number(S.precioUnitario)||0)*S.cantidad-(Number(S.incluido)||0)-(Number(S.transporteCompartido)||0),0),b=Number(w)||0,A=Math.max(0,k-b),E=new Date,f=new Date(E);return f.setDate(f.getDate()+15),e.jsxs("div",{ref:m,className:"cot-page",children:[e.jsxs("div",{className:"cot-header",children:[e.jsx("div",{className:"cot-logo",children:e.jsx("span",{children:"LOTTUS"})}),e.jsxs("div",{className:"cot-doc-title",children:[e.jsx("div",{className:"cot-doc-kicker",children:"Cotización"}),e.jsxs("div",{className:"cot-doc-number",children:["No. ",p]}),e.jsxs("div",{className:"cot-doc-date",children:["Fecha: ",ue(E)]})]})]}),e.jsxs("div",{className:"cot-meta-grid",children:[e.jsxs("div",{className:"cot-meta-box",children:[e.jsx("div",{className:"cot-meta-label",children:"Cliente"}),e.jsx("div",{className:"cot-meta-value",children:n||"Cliente de mostrador"})]}),e.jsxs("div",{className:"cot-meta-box",children:[e.jsx("div",{className:"cot-meta-label",children:"Asesor"}),e.jsx("div",{className:"cot-meta-value",children:i||"—"}),e.jsxs("div",{className:"cot-meta-sub",children:["Válida hasta: ",ue(f)]})]})]}),e.jsxs("table",{className:"cot-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Producto"}),e.jsx("th",{className:"cot-center",children:"Cant."}),e.jsx("th",{className:"cot-right",children:"Vr. Unitario"}),e.jsx("th",{className:"cot-right",children:"Subtotal"})]})}),e.jsx("tbody",{children:a.map(h=>{var S;return e.jsxs("tr",{children:[e.jsxs("td",{children:[e.jsxs("div",{className:"cot-item-nombre",children:[h.lineaNombre," — ",h.varianteNombre]}),e.jsx("div",{className:"cot-item-detalle",children:[h.categoriaNombre,h.grupoNombre].filter(Boolean).join(" · ")}),((S=h.opcionales)==null?void 0:S.length)>0&&e.jsxs("div",{className:"cot-item-opcionales",children:["Incluye: ",h.opcionales.map(C=>`${C.cantidad>1?`${C.cantidad} × `:""}${C.descripcion} (+${v(Number(C.valor)*(Number(C.cantidad)||1))})`).join(", ")]}),h.notas&&e.jsx("div",{className:"cot-item-notas",children:h.notas}),Number(h.incluido)>0&&e.jsxs("div",{className:"cot-item-opcionales",children:["Incluido con «Cojines incluidos»: −",v(h.incluido)]}),Number(h.transporteCompartido)>0&&e.jsxs("div",{className:"cot-item-opcionales",children:["Transporte compartido: −",v(h.transporteCompartido)]})]}),e.jsx("td",{className:"cot-center",children:h.cantidad}),e.jsx("td",{className:"cot-right",children:v(h.precioUnitario)}),e.jsx("td",{className:"cot-right cot-bold",children:v(h.precioUnitario*h.cantidad-(Number(h.incluido)||0)-(Number(h.transporteCompartido)||0))})]},h.id)})})]}),e.jsxs("div",{className:"cot-total-card",children:[b>0&&e.jsxs("div",{style:{paddingBottom:"0.5rem",borderBottom:"1px solid var(--border, #e2e8f0)",marginBottom:"0.5rem"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"0.25rem 0",color:"var(--slate-600, #475569)",fontSize:"0.9rem"},children:[e.jsx("span",{children:"Subtotal"}),e.jsx("span",{children:v(k)})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"0.25rem 0",color:"#b91c1c",fontSize:"0.9rem",fontWeight:600},children:[e.jsx("span",{children:"Descuento Comercial"}),e.jsxs("span",{children:["-",v(b)]})]})]}),e.jsxs("div",{className:"cot-total-final",children:[e.jsx("span",{className:"cot-total-label",children:"Total Cotizado"}),e.jsx("span",{className:"cot-total-value",children:v(A)})]})]}),e.jsxs("div",{className:"cot-condiciones",children:[e.jsx("div",{className:"cot-meta-label",children:"Condiciones"}),e.jsxs("ul",{children:[e.jsx("li",{children:"Precios sujetos a cambio sin previo aviso. Válidos por 15 días desde la fecha de emisión."}),e.jsx("li",{children:"Tiempos de entrega e instalación se confirman al momento del pedido."})]})]}),e.jsxs("div",{className:"cot-firma-box",children:[e.jsx("div",{className:"cot-firma-label",children:"Aceptación del cliente"}),e.jsx("div",{className:"cot-firma-line",children:e.jsx("div",{className:"cot-firma-sub",children:"Firma y fecha de aceptación"})})]}),e.jsxs("div",{className:"cot-footer",children:["LOTTUS · Cotización generada el ",ue(E)," · Doc v1.0"]})]})}),Cn=`/* Cotización — plantilla imprimible/vista previa. Mismo lenguaje visual que
   ComprobanteEgresoReceipt.css (negro/blanco corporativo) para que todos los
   documentos impresos del ERP se vean consistentes. */

.cot-page {
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

.cot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #0f172a;
  padding-bottom: 1rem;
  margin-bottom: 1.5rem;
}

.cot-logo {
  background: #000000;
  padding: 0.65rem 1.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cot-logo span {
  color: #ffffff;
  font-weight: 400;
  font-size: 1.35rem;
  letter-spacing: 0.25rem;
  font-family: "Audiowide", cursive, sans-serif;
  text-transform: uppercase;
  line-height: 1;
}

.cot-doc-title { text-align: right; }

.cot-doc-kicker {
  font-size: 0.62rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.12rem;
  margin-bottom: 0.15rem;
}

.cot-doc-number {
  font-size: 1.35rem;
  font-weight: 900;
  color: #0f172a;
}

.cot-doc-date {
  font-size: 0.68rem;
  color: #475569;
  font-weight: 600;
  margin-top: 0.1rem;
}

.cot-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid #cbd5e1;
  margin-bottom: 1.25rem;
}

.cot-meta-box { padding: 0.75rem 1rem; }
.cot-meta-box:first-child { border-right: 1px solid #cbd5e1; }

.cot-meta-label {
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.06rem;
  margin-bottom: 0.25rem;
}

.cot-meta-value {
  font-size: 0.9rem;
  font-weight: 800;
  color: #0f172a;
}

.cot-meta-sub {
  font-size: 0.68rem;
  color: #475569;
  font-weight: 600;
  margin-top: 0.2rem;
}

.cot-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
  border: 1px solid #cbd5e1;
  margin-bottom: 1.25rem;
}

.cot-table thead tr { background: #0f172a; }

.cot-table thead th {
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-weight: 700;
  font-size: 0.62rem;
  letter-spacing: 0.05rem;
  text-transform: uppercase;
  color: #ffffff;
}

.cot-table tbody td {
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: top;
}

.cot-center { text-align: center; }
.cot-right { text-align: right; }
.cot-bold { font-weight: 700; }

.cot-item-nombre { font-weight: 700; color: #0f172a; }

.cot-item-detalle {
  font-size: 0.68rem;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-top: 0.1rem;
}

.cot-item-opcionales {
  font-size: 0.7rem;
  color: #334155;
  margin-top: 0.2rem;
}

.cot-item-notas {
  font-size: 0.68rem;
  color: #94a3b8;
  font-style: italic;
  margin-top: 0.15rem;
}

.cot-total-card {
  margin-left: auto;
  width: 300px;
  border: 1px solid #cbd5e1;
  border-top: 3px solid #0f172a;
  border-radius: 3px;
  background: #ffffff;
  margin-bottom: 1.5rem;
  overflow: hidden;
}

.cot-total-final {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0f172a;
  color: #ffffff;
  padding: 0.65rem 1rem;
}

.cot-total-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04rem;
  text-transform: uppercase;
}

.cot-total-value {
  font-size: 1.05rem;
  font-weight: 900;
}

.cot-condiciones {
  margin-bottom: 1.25rem;
}

.cot-condiciones ul {
  margin: 0.3rem 0 0;
  padding-left: 1.1rem;
  font-size: 0.68rem;
  color: #475569;
  line-height: 1.5;
}

.cot-firma-box {
  border: 1px solid #cbd5e1;
  padding: 1rem 1.1rem;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.cot-firma-label {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #475569;
  letter-spacing: 0.05rem;
}

.cot-firma-line {
  border-top: 1.5px solid #0f172a;
  padding-top: 0.45rem;
}

.cot-firma-sub {
  font-size: 0.68rem;
  font-weight: 700;
  color: #0f172a;
}

.cot-footer {
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
  body, .cot-page {
    padding: 0 !important;
    margin: 0 auto !important;
    max-width: 100% !important;
    background: transparent !important;
  }
  .cot-table tr,
  .cot-total-card,
  .cot-firma-box,
  .cot-condiciones,
  .cot-meta-grid {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}

`,yn=({open:a,onClose:n,items:i,cliente:p,vendedorNombre:w,folio:m,descuento:k=0})=>{const b=d.useRef(null),A=()=>{var f;return`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Cotización ${m||""}</title>
<link href="https://fonts.googleapis.com/css2?family=Audiowide&display=swap" rel="stylesheet">
<style>
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  @page { size: letter portrait; margin: 12mm; }
  ${Cn}
</style>
</head>
<body>${((f=b.current)==null?void 0:f.outerHTML)||""}</body>
</html>`},E=()=>{if(!b.current)return;const f=document.createElement("iframe");f.style.position="fixed",f.style.right="0",f.style.bottom="0",f.style.width="0",f.style.height="0",f.style.border="0",document.body.appendChild(f);const h=f.contentWindow.document;h.open(),h.write(A()),h.close();const S=()=>{f.parentNode&&f.parentNode.removeChild(f)};setTimeout(()=>{f.contentWindow.focus(),f.contentWindow.print(),setTimeout(S,500)},250)};return e.jsx(je,{open:a,onClose:n,title:`Cotización ${m||""}`,size:"lg",footer:e.jsxs(e.Fragment,{children:[e.jsx(J,{variant:"secondary",onClick:n,children:"Cerrar"}),e.jsx(fn,{documento:A,titulo:`Cotización ${m||""}`,imprimirLocal:E,disabled:!(i!=null&&i.length)})]}),children:e.jsx("div",{className:"cepm-preview-wrapper",children:e.jsx(Nn,{ref:b,items:i||[],cliente:p,vendedorNombre:w,folio:m,descuento:k})})})};function be({src:a,alt:n="",...i}){const[p,w]=d.useState(null);return!a||p===a?e.jsxs("div",{className:"lp-foto-no-disponible",children:[e.jsx(he,{"aria-hidden":"true"}),e.jsx("span",{children:"Foto no disponible"})]}):e.jsx("img",{src:a,alt:n,...i,onError:()=>w(a)})}const qe=a=>a.subcategoria!=null?`sub-${a.subcategoria}`:`ficha-${a.id}`;function Be(a=[]){const n=new Map;for(const i of a){const p=qe(i);n.has(p)||n.set(p,{clave:p,nombre:i.nombre,variantes:[]}),n.get(p).variantes.push(i)}return[...n.values()]}const wn=a=>(a||[]).map(n=>n.nombre).filter(Boolean).join(" · ");function Sn(a=[]){const n=new Map;for(const i of a){const p=`referencia-${ln(i.nombre).replace(/\s+/g," ")||i.id}`;n.has(p)||n.set(p,{...i,id:p,referencia:null,variantes:[],fotos:[]});const w=n.get(p);for(const m of i.fotos||[])w.fotos.includes(m)||w.fotos.push(m);for(const m of i.variantes||[])w.variantes.push({...m,proveedores:m.proveedores??(i.proveedor_nombre?[{id:i.proveedor,nombre:i.proveedor_nombre}]:[]),origen:{lineaId:i.id,referenciaId:m.referencia??i.referencia,proveedorId:i.proveedor,proveedorNombre:i.proveedor_nombre,esDecorativo:!!i.es_decorativo||i.slug==="decorativos",fotos:i.fotos||[],notas:i.notas||""}})}return[...n.values()].map(i=>{var m;const p=new Map((((m=i.disposicion)==null?void 0:m.orden)||[]).map((k,b)=>[k,b]));i.variantes.sort((k,b)=>(p.get(k.subcategoria)??p.size)-(p.get(b.subcategoria)??p.size));const w=[...new Map(i.variantes.flatMap(k=>k.proveedores).map(k=>[k.id??k.nombre,k])).values()];return{...i,proveedores:w,proveedor_nombre:w.length===1?w[0].nombre:w.length?`${w.length} proveedores`:""}})}const ce=(a,n)=>((a==null?void 0:a.opcionales)||[]).filter(i=>i.preseleccionado&&(!i.precios||i.precios.some(p=>p.grupo===n))).map(i=>i.id).sort((i,p)=>i-p);function zn({linea:a,inicial:n,onClose:i,onAgregar:p,onVerCotizacion:w,confirmando:m=!1,inline:k=!1}){var X,fe,ve,Ne,Ce,ye,we,Se,ze,ke,$e,Ie,Ee,Me;const b=a.variantes.find(r=>r.id===(n==null?void 0:n.varianteId))||a.variantes[0],[A,E]=d.useState(b==null?void 0:b.id),[f,h]=d.useState(n?n.grupoId:((fe=(X=b==null?void 0:b.precios)==null?void 0:X[0])==null?void 0:fe.grupo)??null),[S,C]=d.useState(()=>{var r,g,y;return n!=null&&n.id?(n.opcionales||[]).flatMap(L=>Array(Math.max(1,Number(L.cantidad)||1)).fill(L.id)):ce(b,(y=me(b,n?n.grupoId:((g=(r=b==null?void 0:b.precios)==null?void 0:r[0])==null?void 0:g.grupo)??null))==null?void 0:y.grupo)}),[M,q]=d.useState((n==null?void 0:n.cantidad)||1),[O,D]=d.useState((n==null?void 0:n.notaVendedor)||""),[P,$]=d.useState(0),[x,l]=d.useState(""),s=a.variantes.find(r=>r.id===A),o=Be(a.variantes),I=o.find(r=>r.variantes.some(g=>g.id===A)),T=(s==null?void 0:s.proveedores)||[],_=wn(T)||((ve=s==null?void 0:s.origen)==null?void 0:ve.proveedorNombre)||a.proveedor_nombre||"",c=me(s,f),F=((s==null?void 0:s.opcionales)||[]).map(r=>{var y;const g=(y=r.precios)==null?void 0:y.find(L=>L.grupo===(c==null?void 0:c.grupo));return{...r,valor:r.precios?g==null?void 0:g.valor:r.valor,disponible:!r.precios||!!g}}),B=S.length>0||ce(s,c==null?void 0:c.grupo).length>0,ee=(s==null?void 0:s.decorativos_incluidos)||(F.some(r=>r.decorativos&&S.includes(r.id))?2:0),[K,H]=d.useState(!!(n!=null&&n.id)),te=ce(s,c==null?void 0:c.grupo).join(",");d.useEffect(()=>{K||C(te?te.split(",").map(Number):[])},[te,K]);const G=!!((Ne=s==null?void 0:s.opcionales)!=null&&Ne.length)||(s==null?void 0:s.decorativos_incluidos)>0||!!((Ce=s==null?void 0:s.incluidos)!=null&&Ce.length),U=r=>S.filter(g=>g===r).length,ne=r=>{H(!0),C(g=>r(g).sort((y,L)=>y-L)),l("")},se=S.some(r=>!F.some(g=>g.id===r&&g.disponible)),Q=xe({queryKey:["lp-precio-variante",A,c==null?void 0:c.grupo,S],queryFn:()=>Ue(A,{grupo:c==null?void 0:c.grupo,opcionales:S}),enabled:!!c&&B&&!se,staleTime:0,retry:1}),ie=B&&Q.isFetching,ae=B&&Q.isError,Y=B?(ye=Q.data)==null?void 0:ye.precio:c==null?void 0:c.precio,t=!se&&!!c&&re(Y)&&!ie&&!ae&&!m,j=((we=s==null?void 0:s.origen)==null?void 0:we.fotos)||a.fotos||[],N=((Se=s==null?void 0:s.origen)==null?void 0:Se.esDecorativo)??(a.es_decorativo||a.slug==="decorativos"),z=((ze=s==null?void 0:s.origen)==null?void 0:ze.notas)??a.notas,V={lineaId:((ke=s==null?void 0:s.origen)==null?void 0:ke.lineaId)??a.id,lineaNombre:a.nombre,referenciaId:(($e=s==null?void 0:s.origen)==null?void 0:$e.referenciaId)??a.referencia,varianteId:A,varianteNombre:s==null?void 0:s.nombre,proveedorNombre:_,proveedores:T,categoriaNombre:s==null?void 0:s.categoria_nombre,grupoId:(c==null?void 0:c.grupo)??null,grupoNombre:(c==null?void 0:c.grupo_nombre)||"",opcionales:B?((Ie=Q.data)==null?void 0:Ie.opcionales_incluidos)||[]:[],notas:((s==null?void 0:s.notas)||[]).join(" · "),notaVendedor:O.trim(),componentes:(s==null?void 0:s.componentes)||"",precioUnitario:t?Number(Y):null,cantidad:M,foto:j[0]||null,decorativosIncluidos:ee,esDecorativo:N,topeIncluido:(c==null?void 0:c.tope_incluido)??null,transporte:Ve(s,S)},W=r=>{var y;E(r.id);const g=((y=me(r,f))==null?void 0:y.grupo)??null;h(g),C(ce(r,g)),H(!1),$(0),l("")},Z=r=>{h(r),l("")},u=e.jsxs("div",{className:"lp-config-footer",children:[e.jsxs("div",{className:"lp-config-importe","aria-live":"polite","aria-atomic":"true",children:[e.jsxs("small",{children:[s==null?void 0:s.nombre," · ",(c==null?void 0:c.grupo_nombre)||(c?"Sin tela":"Grupo sin elegir")]}),e.jsx("small",{children:M>1?`Total · ${M} unidades`:"Precio de venta · COP"}),e.jsx("strong",{children:ie?"Calculando…":m?"Confirmando precio…":ae?"Precio sin confirmar":t?v(Number(Y)*M):"Elige un grupo de tela"}),t&&M>1&&e.jsxs("small",{children:[v(Y)," por unidad"]})]}),e.jsxs("label",{className:"lp-config-nota",children:[e.jsx(We,{"aria-hidden":"true"}),e.jsx("input",{value:O,maxLength:200,placeholder:"Nota para este producto (opcional)","aria-label":"Nota del producto",onChange:r=>{D(r.target.value),l("")},onKeyDown:r=>{r.key==="Enter"&&r.preventDefault()}})]}),e.jsx("div",{className:"lp-config-acciones",children:e.jsx(J,{icon:Oe,disabled:!t,onClick:()=>{p(V),l(n!=null&&n.id?"Producto actualizado en la cotización.":"Agregado a la cotización."),n!=null&&n.id||D("")},children:n!=null&&n.id?"Guardar cambio":"Agregar"})}),x&&e.jsxs("div",{className:"lp-config-confirmacion",role:"status",children:[e.jsx(oe,{})," ",x,e.jsx("button",{onClick:w,children:"Ver cotización"})]})]}),R=e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"lp-config-resumen",children:[e.jsx("div",{className:"lp-config-foto",children:e.jsx(be,{src:j[P],alt:a.nombre})}),e.jsxs("div",{children:[e.jsx("span",{className:"lp-eyebrow",children:(s==null?void 0:s.categoria_nombre)||"Consulta rápida"}),e.jsx("h3",{children:(s==null?void 0:s.nombre)||"Sin productos"}),e.jsx("p",{children:(c==null?void 0:c.grupo_nombre)||(c?"Precio único · no requiere tela":"Selecciona el grupo de tela")}),(s==null?void 0:s.componentes)&&e.jsxs("p",{className:"lp-componentes",children:[e.jsx(oe,{})," ",s.componentes]})]})]}),j.length>1&&e.jsx("div",{className:"lp-detalle-thumbs",children:j.map((r,g)=>e.jsx("button",{"aria-label":`Ver foto ${g+1}`,"aria-pressed":P===g,className:`lp-thumb ${P===g?"lp-thumb--active":""}`,onClick:()=>$(g),children:e.jsx("img",{src:r,alt:"",loading:"lazy"})},r))}),e.jsxs("section",{className:"lp-config-section","aria-label":"Subcategoría",children:[e.jsxs("h4",{children:[e.jsx("span",{children:"1"})," Subcategoría"]}),e.jsx("div",{className:"lp-variantes",children:o.map(r=>{const g=r.clave===(s&&qe(s)),y=g?s:r.variantes[0];return e.jsxs("button",{className:`lp-variante-opcion ${g?"is-selected":""}`,"aria-pressed":g,onClick:()=>W(y),children:[e.jsxs("span",{children:[y.nombre,y.componentes&&e.jsx("small",{children:y.componentes})]}),g&&e.jsx(oe,{"aria-hidden":"true"})]},r.clave)})}),(I==null?void 0:I.variantes.length)>1&&e.jsxs("label",{className:"lp-config-proveedor",children:[e.jsxs("span",{children:["Opciones de ",I.nombre]}),e.jsx("select",{value:A,onChange:r=>W(I.variantes.find(g=>g.id===Number(r.target.value))),children:I.variantes.map((r,g)=>{const y=(r.precios||[]).map(L=>L.precio).filter(re).map(Number);return e.jsxs("option",{value:r.id,children:["Opción ",g+1,y.length?` · desde ${v(Math.min(...y))}`:""]},r.id)})})]})]}),G&&e.jsxs("section",{className:"lp-config-section","aria-label":"Adicionales",children:[e.jsxs("h4",{children:[e.jsx("span",{children:"2"})," Adicionales ",e.jsx("small",{children:"Incluidos ya van en el precio"})]}),e.jsxs("div",{className:"lp-opcionales-chips",children:[((s==null?void 0:s.incluidos)||[]).map(r=>e.jsxs("span",{className:"lp-opcional-chip lp-opcional-chip--active lp-opcional-chip--fijo",title:"Ya va en el precio: no se puede quitar",children:[e.jsx(oe,{})," ",r,e.jsx("small",{children:"incluido"})]},r)),(s==null?void 0:s.decorativos_incluidos)>0&&e.jsxs("span",{className:"lp-opcional-chip lp-opcional-chip--active lp-opcional-chip--fijo",title:"Ya va en el precio: no se puede quitar",children:[e.jsx(oe,{})," Decorativos x",s.decorativos_incluidos," · incluido"]}),F.map(r=>{const g=U(r.id),y=g>0;return e.jsxs("span",{className:`lp-opcional ${y?"is-activo":""}`,children:[e.jsxs("button",{className:`lp-opcional-chip ${y?"lp-opcional-chip--active":""}`,"aria-pressed":y,disabled:!r.disponible&&!y,onClick:()=>ne(L=>y?L.filter(pe=>pe!==r.id):[...L,r.id]),children:[y?e.jsx(oe,{}):e.jsx(le,{})," ",r.descripcion,!r.disponible&&e.jsx("small",{children:"No aplica a este material"}),r.valor!=null&&e.jsxs("small",{children:[Number(r.valor)<0?"−":"+",dn(Math.abs(Number(r.valor)*Math.max(1,g)))]})]}),y&&r.multiple&&e.jsxs("span",{className:"lp-opcional-cantidad",role:"group","aria-label":`Unidades de ${r.descripcion}`,children:[e.jsx("button",{type:"button","aria-label":`Quitar una unidad de ${r.descripcion}`,onClick:()=>ne(L=>{const pe=L.indexOf(r.id);return L.filter((An,Je)=>Je!==pe)}),children:e.jsx(ge,{})}),e.jsx("output",{"aria-label":`Unidades de ${r.descripcion}`,children:g}),e.jsx("button",{type:"button","aria-label":`Agregar una unidad de ${r.descripcion}`,disabled:g>=9,onClick:()=>ne(L=>[...L,r.id]),children:e.jsx(le,{})})]})]},r.id)})]}),ee>0&&e.jsxs("p",{className:"lp-ayuda",children:["Por unidad incluye ",ee," productos de la línea Decorativos: sin cobro en grupo 1 o 2; desde grupo 3 se cobra la diferencia. Agrégalos a la cotización y se descuentan solos."]}),se&&e.jsx("p",{className:"lp-aviso",role:"alert",children:"Un especial seleccionado no tiene consumo para este material. Desactívalo o elige otro grupo antes de agregar."}),ae&&e.jsxs("div",{className:"lp-aviso",role:"alert",children:["No se pudo confirmar el precio de los adicionales. ",e.jsx("button",{onClick:()=>Q.refetch(),children:"Reintentar"})]})]}),e.jsxs("section",{className:"lp-config-section","aria-label":"Grupo de tela",children:[e.jsxs("h4",{children:[e.jsx("span",{children:G?3:2})," ",(Ee=s==null?void 0:s.precios)!=null&&Ee.every(r=>r.grupo==null)?"Precio único":"Grupo de tela o cuero"]}),e.jsx("div",{className:"lp-telas",children:((s==null?void 0:s.precios)||[]).map(r=>e.jsxs("button",{className:`lp-tela-opcion ${c===r?"is-selected":""}`,"aria-pressed":c===r,onClick:()=>Z(r.grupo),children:[e.jsx("span",{children:r.grupo_nombre||"Sin tela"}),e.jsx("strong",{children:re(r.precio)?v(r.precio):"Sin precio"})]},r.grupo??"unico"))}),e.jsx("p",{className:"lp-ayuda",children:s!=null&&s.componentes?"El grupo de tela aplica a las piezas tapizadas.":"Precios base por unidad. Los adicionales se calculan aparte."}),N&&e.jsxs("p",{className:"lp-ayuda",children:["Decorativo: si la cotización lleva un producto con «Cojines incluidos», va sin cobro hasta su precio en grupo 2",(c==null?void 0:c.tope_incluido)!=null&&c.tope_incluido<c.precio?` (aquí cubre ${v(c.tope_incluido)})`:"","."]}),!c&&e.jsx("p",{className:"lp-aviso",role:"status",children:"Esta medida no ofrece el grupo anterior. Elige uno disponible para confirmar el precio."})]}),e.jsxs("div",{className:"lp-config-cantidad",children:[e.jsx("span",{children:"Cantidad"}),e.jsxs("div",{className:"lp-cantidad-control",children:[e.jsx("button",{"aria-label":"Reducir cantidad",disabled:M<=1,onClick:()=>{q(r=>r-1),l("")},children:e.jsx(ge,{})}),e.jsx("output",{"aria-label":"Cantidad",children:M}),e.jsx("button",{"aria-label":"Aumentar cantidad",disabled:M>=99,onClick:()=>{q(r=>r+1),l("")},children:e.jsx(le,{})})]})]}),((Me=s==null?void 0:s.notas)==null?void 0:Me.length)>0&&e.jsx("p",{className:"lp-notas",children:s.notas.join(" · ")}),z&&e.jsx("p",{className:"lp-notas lp-notas--linea",children:z}),e.jsxs("details",{className:"lp-config-galeria",children:[e.jsx("summary",{children:"Ver foto del producto"}),e.jsx(be,{src:j[P],alt:a.nombre})]})]});return k?e.jsxs("section",{className:"lp-configurador lp-configurador--inline","aria-label":`Configurar ${a.nombre}`,children:[e.jsxs("header",{className:"lp-config-inline-cabecera",children:[e.jsxs("div",{children:[e.jsx("span",{className:"lp-eyebrow",children:"Configura y cotiza"}),e.jsx("h2",{children:a.nombre})]}),e.jsx("button",{className:"lp-icon-btn","aria-label":"Cerrar configuración",onClick:i,children:e.jsx(Te,{})})]}),e.jsx("div",{className:"lp-config-inline-cuerpo",children:R}),e.jsx("footer",{className:"lp-config-inline-pie",children:u})]}):e.jsx(je,{open:!0,onClose:i,title:a.nombre,size:"lg",className:"lp-configurador",footer:u,children:R})}function kn({open:a,cart:n,onClose:i,onEditar:p,onGenerar:w,guardando:m,error:k}){const[b,A]=d.useState(""),[E,f]=d.useState(""),[h,S]=d.useState([]),[C,M]=d.useState(""),[q,O]=d.useState(!1),D=Number(E||0),P=Number.isFinite(D)&&D>=0&&D<=n.total*.25,$=new Map;n.items.forEach(l=>{const s=l.conjuntoId||l.id;$.has(s)||$.set(s,[]),$.get(s).push(l)});const x=h.filter(l=>n.items.some(s=>s.id===l));return e.jsx(je,{open:a,title:`Cotización · ${n.items.length} productos`,onClose:()=>{m||i()},size:"lg",className:"lp-cotizacion",footer:e.jsxs(e.Fragment,{children:[e.jsx(J,{variant:"secondary",onClick:i,disabled:m,children:"Seguir consultando"}),e.jsx(J,{icon:Ye,loading:m,disabled:!n.items.length||!P,onClick:()=>w(b,D),children:"Generar cotización"})]}),children:n.items.length?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"lp-cart-list",children:[...$].map(([l,s])=>e.jsxs("section",{className:"lp-cart-grupo",children:[s[0].conjuntoId&&e.jsxs("div",{className:"lp-conjunto-cabeza",children:[e.jsxs("strong",{children:[e.jsx(de,{})," ",s[0].conjuntoNombre]}),e.jsx("span",{children:v(s.reduce((o,I)=>o+I.precioUnitario*I.cantidad-n.descontado(I.id),0))}),e.jsx("button",{onClick:()=>n.desagrupar(l),disabled:m,children:"Separar piezas"})]}),s.map(o=>{var I,T,_;return e.jsxs("article",{className:"lp-cart-item",children:[e.jsx("label",{className:"lp-cart-seleccionar",children:e.jsx("input",{type:"checkbox","aria-label":`Seleccionar ${o.lineaNombre} ${o.varianteNombre}`,checked:x.includes(o.id),disabled:m,onChange:c=>S(F=>c.target.checked?[...F,o.id]:F.filter(B=>B!==o.id))})}),e.jsxs("div",{className:"lp-cart-item-info",children:[e.jsxs("strong",{children:[o.lineaNombre," · ",o.varianteNombre]}),e.jsx("span",{children:o.grupoNombre||"Sin tela"}),o.componentes&&e.jsxs("span",{className:"lp-componentes",children:["Incluye: ",o.componentes]}),!!((I=o.opcionales)!=null&&I.length)&&e.jsx("span",{children:o.opcionales.map(c=>`${c.cantidad>1?`${c.cantidad} × `:""}${c.descripcion}`).join(" · ")}),e.jsxs("small",{children:[v(o.precioUnitario)," por unidad"]}),o.notaVendedor&&e.jsxs("small",{className:"lp-cart-nota",children:["Nota: ",o.notaVendedor]}),o.decorativosIncluidos>0&&e.jsxs("small",{children:["Incluye ",o.decorativosIncluidos," decorativos por unidad"]}),((T=n.incluidos)==null?void 0:T[o.id])&&e.jsxs("small",{className:"lp-incluido",children:[n.incluidos[o.id].unidades," incluido",n.incluidos[o.id].unidades>1?"s":""," por «Cojines incluidos»: −",v(n.incluidos[o.id].valor)]}),((_=n.transportes)==null?void 0:_[o.id])&&e.jsxs("small",{className:"lp-incluido",children:[n.transportes[o.id].transportes===0?"Transporte incluido en el del conjunto":`${n.transportes[o.id].transportes} transporte${n.transportes[o.id].transportes>1?"s":""} para ${o.cantidad} unidades`,": −",v(n.transportes[o.id].valor)]})]}),e.jsx("strong",{className:"lp-cart-item-precio",children:v(o.precioUnitario*o.cantidad-n.descontado(o.id))}),e.jsxs("div",{className:"lp-cart-item-controles",children:[e.jsxs("div",{className:"lp-cantidad-control",children:[e.jsx("button",{"aria-label":`Reducir cantidad de ${o.varianteNombre}`,disabled:m||o.cantidad<=1,onClick:()=>n.actualizarCantidad(o.id,o.cantidad-1),children:e.jsx(ge,{})}),e.jsx("output",{children:o.cantidad}),e.jsx("button",{"aria-label":`Aumentar cantidad de ${o.varianteNombre}`,disabled:m||o.cantidad>=99,onClick:()=>n.actualizarCantidad(o.id,o.cantidad+1),children:e.jsx(le,{})})]}),e.jsx("button",{className:"lp-icon-btn","aria-label":`Editar ${o.lineaNombre} ${o.varianteNombre}`,disabled:m,onClick:()=>p(o),children:e.jsx(He,{})}),e.jsx("button",{className:"lp-icon-btn","aria-label":`Quitar ${o.lineaNombre} ${o.varianteNombre}`,disabled:m,onClick:()=>n.quitarItem(o.id),children:e.jsx(_e,{})})]})]},o.id)})]},l))}),e.jsxs("div",{className:"lp-armar-conjunto",children:[e.jsxs("h4",{children:[e.jsx(de,{})," Reunir piezas en un conjunto"]}),e.jsx("p",{className:"lp-ayuda",children:"Selecciona dos o más productos arriba, por ejemplo una mesa y sus sillas o las piezas de una alcoba."}),e.jsxs("div",{children:[e.jsx("input",{className:"ds-input","aria-label":"Nombre del conjunto",placeholder:"Ej.: Comedor del cliente",maxLength:120,value:C,onChange:l=>M(l.target.value),disabled:m}),e.jsxs(J,{variant:"secondary",disabled:m||x.length<2||!C.trim(),onClick:()=>{n.agrupar(x,C.trim()),S([]),M("")},children:["Agrupar (",x.length,")"]})]})]}),e.jsxs("div",{className:"lp-cotizacion-datos",children:[e.jsxs("label",{className:"ds-field",children:["Cliente (opcional)",e.jsx("input",{className:"ds-input",value:b,onChange:l=>A(l.target.value),maxLength:200,disabled:m,placeholder:"Nombre del cliente"})]}),e.jsxs("label",{className:"ds-field",children:["Descuento en pesos",e.jsx("input",{className:"ds-input",type:"number",inputMode:"numeric",min:"0",max:n.total*.25,value:E,onChange:l=>f(l.target.value),disabled:m,placeholder:"0"}),e.jsxs("small",{children:["Tope estándar: ",v(n.total*.25)," (25%)."]})]})]}),!P&&e.jsx("p",{className:"lp-aviso",role:"alert",children:"El descuento debe estar entre cero y el tope permitido."}),e.jsxs("div",{className:"lp-cotizacion-total",children:[(n.incluido>0||n.transporteCompartido>0)&&e.jsxs("div",{children:[e.jsx("span",{children:"Productos"}),e.jsx("span",{children:v(n.bruto)})]}),n.incluido>0&&e.jsxs("div",{children:[e.jsx("span",{children:"Decorativos incluidos"}),e.jsxs("span",{children:["−",v(n.incluido)]})]}),n.transporteCompartido>0&&e.jsxs("div",{children:[e.jsx("span",{children:"Transporte compartido"}),e.jsxs("span",{children:["−",v(n.transporteCompartido)]})]}),e.jsxs("div",{children:[e.jsx("span",{children:"Subtotal"}),e.jsx("span",{children:v(n.total)})]}),D>0&&e.jsxs("div",{children:[e.jsx("span",{children:"Descuento"}),e.jsxs("span",{children:["−",v(D)]})]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Total de la propuesta"}),e.jsx("strong",{children:v(Math.max(0,n.total-(P?D:0)))})]})]}),k&&e.jsx("p",{className:"lp-aviso",role:"alert",children:k}),e.jsx("div",{className:"lp-vaciar",children:q?e.jsxs(e.Fragment,{children:[e.jsx("span",{children:"¿Quitar todos los productos?"}),e.jsx(J,{variant:"danger-soft",onClick:n.vaciar,disabled:m,children:"Sí, vaciar"}),e.jsx(J,{variant:"ghost",onClick:()=>O(!1),children:"Cancelar"})]}):e.jsx(J,{variant:"ghost",icon:_e,onClick:()=>O(!0),disabled:m,children:"Vaciar cotización"})})]}):e.jsxs("div",{className:"lp-vacio",children:[e.jsx(de,{}),e.jsx("h3",{children:"Arma la propuesta del cliente"}),e.jsx("p",{children:"Agrega productos desde la consulta. Puedes cambiar telas, medidas y reunir piezas en un conjunto."})]})})}const Ge=a=>`lp_catalogo_subcategorias_v3_${a??"anon"}`,$n=a=>{try{const n=JSON.parse(localStorage.getItem(Ge(a))||"null");return Array.isArray(n==null?void 0:n.data)?n:null}catch{return null}},In=(a,n)=>{try{localStorage.setItem(Ge(a),JSON.stringify({t:Date.now(),data:n}))}catch{}},En=()=>{try{return window.matchMedia("(pointer: fine)").matches}catch{return!1}},Ke="(min-width: 1200px)",Mn=a=>{var i;const n=(i=window.matchMedia)==null?void 0:i.call(window,Ke);return n==null||n.addEventListener("change",a),()=>n==null?void 0:n.removeEventListener("change",a)},_n=()=>{var a,n;return((n=(a=window.matchMedia)==null?void 0:a.call(window,Ke))==null?void 0:n.matches)??!1},Re=a=>{const n=a.variantes.flatMap(i=>i.precios||[]).map(i=>i.precio).filter(re).map(Number);return n.length?Math.min(...n):1/0};function Jn(){var se,Q,ie,ae,Y;const{usuario:a}=d.useContext(Ze),n=d.useSyncExternalStore(Mn,_n,()=>!1),i=d.useRef(null);d.useLayoutEffect(()=>{if(!n||!i.current)return;const t=()=>{const j=i.current;j&&j.style.setProperty("--lp-panel-altura",`${Math.max(300,window.innerHeight-Math.max(24,j.getBoundingClientRect().top)-24)}px`)};return t(),window.addEventListener("scroll",t,!0),window.addEventListener("resize",t),()=>{window.removeEventListener("scroll",t,!0),window.removeEventListener("resize",t)}},[n]);const[p,w]=d.useState("tarjetas"),[m,k]=d.useState("nombre"),[b,A]=d.useState(""),[E,f]=d.useState(""),[h,S]=d.useState(!1),[C,M]=d.useState(null),[q,O]=d.useState([]),[D,P]=d.useState(!1),[$,x]=d.useState(null),[l,s]=d.useState(""),o=vn(a==null?void 0:a.id),I=xe({queryKey:["listaprecios-categorias-publicas"],queryFn:gn,staleTime:6e4}),[T]=d.useState(()=>$n(a==null?void 0:a.id)),_=xe({queryKey:["listaprecios-catalogo",a==null?void 0:a.id,"subcategorias-v3"],queryFn:async()=>{const t=await xn();return In(a==null?void 0:a.id,t),t},staleTime:3e4,initialData:T==null?void 0:T.data,initialDataUpdatedAt:T==null?void 0:T.t}),c=_.isFetching&&!_.isFetchedAfterMount,F=d.useMemo(()=>Sn(_.data||[]),[_.data]),B=d.useMemo(()=>pn(F),[F]),ee=d.useDeferredValue(b),K=d.useMemo(()=>{const t=mn(B,E,ee);return[...h?t.map(N=>({...N,variantes:N.variantes.filter(z=>z.componentes)})).filter(N=>N.variantes.length):t].sort((N,z)=>m==="precio"&&Re(N)-Re(z)||N.nombre.localeCompare(z.nombre,"es"))},[B,E,ee,h,m]),H=(t,j)=>{var V,W;s("");const N=F.find(Z=>Z.id===t.id);if(!N){s("La referencia ya no está disponible. Actualiza el catálogo.");return}const z=t.variantes[0];M({linea:N,inicial:j||{varianteId:z==null?void 0:z.id,grupoId:((W=(V=z==null?void 0:z.precios)==null?void 0:V[0])==null?void 0:W.grupo)??null}}),O(Z=>[t.id,...Z.filter(u=>u!==t.id)].slice(0,5))},te=t=>{const j=F.find(N=>N.variantes.some(z=>z.id===t.varianteId));if(!j||!j.variantes.some(N=>N.id===t.varianteId)){s("Este producto ya no está en el catálogo. Quita la opción y consulta una referencia vigente.");return}P(!1),H(j,t)},G=rn({mutationFn:async({cliente:t,descuento:j})=>{const N=await Promise.all(o.items.map(u=>Ue(u.varianteId,{grupo:u.grupoId,opcionales:(u.opcionales||[]).flatMap(R=>Array(Math.max(1,Number(R.cantidad)||1)).fill(R.id))})));let z=!1;N.forEach((u,R)=>{if(!re(u.precio))throw new Error("Un producto no tiene un precio vigente. Revisa sus opciones.");Math.abs(Number(u.precio)-Number(o.items[R].precioUnitario))>.01&&(o.actualizarItem(o.items[R].id,{precioUnitario:Number(u.precio),opcionales:u.opcionales_incluidos||[]}),z=!0)});const V=new Map(F.flatMap(u=>u.variantes).map(u=>[u.id,u]));if(o.items.forEach(u=>{const R=Ve(V.get(u.varianteId),(u.opcionales||[]).map(X=>X.id));JSON.stringify(R)!==JSON.stringify(u.transporte??null)&&(o.actualizarItem(u.id,{transporte:R}),z=!0)}),z)throw new Error("Los precios cambiaron desde la consulta y ya se actualizaron. Revisa el nuevo total antes de generar la cotización.");const W=o.items.map(u=>{var R,X;return{...u,notas:un(u),incluido:((R=o.incluidos[u.id])==null?void 0:R.valor)||0,transporteCompartido:((X=o.transportes[u.id])==null?void 0:X.valor)||0}}),Z=await hn({cliente_nombre:t,descuento:j,lineas:W.map(u=>({variante:u.varianteId,linea_nombre:u.lineaNombre,variante_nombre:u.varianteNombre,categoria_nombre:u.categoriaNombre,grupo_nombre:u.grupoNombre,grupo_tela:u.grupoId,cantidad:u.cantidad,precio_unitario:u.precioUnitario,opcionales:u.opcionales||[],notas:u.notas,foto:u.foto||null,conjunto:u.conjuntoId||""}))});return{items:W,cliente:t,descuento:j,folio:Z.numero}},onSuccess:t=>{x(t),P(!1)}}),U=C&&F.find(t=>t.id===C.linea.id||t.variantes.some(j=>{var N;return j.id===((N=C.inicial)==null?void 0:N.varianteId)})),ne=U?e.jsx(zn,{inline:n,linea:U,inicial:C.inicial,confirmando:c,onClose:()=>M(null),onAgregar:t=>{var j;return(j=C.inicial)!=null&&j.id?o.actualizarItem(C.inicial.id,t):o.agregarItem(t)},onVerCotizacion:()=>{M(null),P(!0)}},`${U.id}-${((se=C.inicial)==null?void 0:se.id)||"consulta"}-${(Q=C.inicial)==null?void 0:Q.varianteId}-${(ie=C.inicial)==null?void 0:ie.grupoId}`):null;return e.jsxs("div",{className:`ds-page lp-page ${n?"lp-page--escritorio":""}`,children:[e.jsx(bn,{icon:he,title:"Lista de precios",subtitle:"Encuentra el mueble. Cambia la tela. Acompaña la venta."}),n&&e.jsx("div",{className:"lp-escritorio-intro",children:e.jsx("span",{children:"SHOWROOM / CATÁLOGO"})}),e.jsxs("div",{className:"lp-workspace",children:[e.jsxs("div",{className:"lp-catalogo-panel",children:[e.jsxs("div",{className:"lp-consulta-toolbar",children:[e.jsxs("div",{className:"lp-search",children:[e.jsx(Ae,{"aria-hidden":"true"}),e.jsx("input",{type:"search","aria-label":"Buscar referencia o medida",placeholder:"Referencia, sofá, medida, comedor…",value:b,onChange:t=>A(t.target.value),autoFocus:En(),enterKeyHint:"search",onKeyDown:t=>{t.key==="Enter"&&K.length&&(t.preventDefault(),H(K[0]))}}),b&&e.jsx("button",{className:"lp-icon-btn","aria-label":"Limpiar búsqueda",onClick:()=>A(""),children:e.jsx(Te,{})})]}),e.jsx("button",{className:"lp-icon-btn","aria-label":"Actualizar precios",disabled:_.isFetching,onClick:()=>_.refetch(),children:e.jsx(Xe,{className:_.isFetching?"lp-girando":""})})]}),e.jsxs("div",{className:"lp-categoria-chips",role:"group","aria-label":"Categoría",children:[e.jsx("button",{className:`lp-chip ${E?"":"lp-chip--active"}`,"aria-pressed":!E,onClick:()=>f(""),children:"Todas"}),(I.data||[]).map(t=>e.jsx("button",{className:`lp-chip ${String(E)===String(t.id)?"lp-chip--active":""}`,"aria-pressed":String(E)===String(t.id),onClick:()=>f(t.id),children:t.nombre},t.id))]}),I.isError&&e.jsxs("p",{className:"lp-ayuda",children:["No se pudieron cargar las categorías. Puedes buscar en todo el catálogo. ",e.jsx("button",{onClick:()=>I.refetch(),children:"Reintentar"})]}),!!q.length&&!b&&!E&&!h&&e.jsxs("div",{className:"lp-recientes",children:[e.jsxs("span",{children:[e.jsx(en,{})," Recientes"]}),q.map(t=>F.find(j=>j.id===t)).filter(Boolean).map(t=>e.jsx("button",{onClick:()=>H(t),children:t.nombre},t.id))]}),e.jsxs("div",{className:"lp-resultados-cabeza",children:[e.jsx("span",{"aria-live":"polite",children:_.isLoading?"Cargando catálogo…":`${K.length} ${K.length===1?"referencia":"referencias"}`}),n&&e.jsxs("div",{className:"lp-catalogo-controles",children:[e.jsxs("label",{children:["Ordenar ",e.jsxs("select",{"aria-label":"Ordenar referencias",value:m,onChange:t=>k(t.target.value),children:[e.jsx("option",{value:"nombre",children:"Nombre A–Z"}),e.jsx("option",{value:"precio",children:"Menor precio"})]})]}),e.jsxs("div",{role:"group","aria-label":"Vista del catálogo",children:[e.jsx("button",{"aria-label":"Ver tarjetas","aria-pressed":p==="tarjetas",onClick:()=>w("tarjetas"),children:e.jsx(nn,{})}),e.jsx("button",{"aria-label":"Ver lista","aria-pressed":p==="lista",onClick:()=>w("lista"),children:e.jsx(sn,{})})]})]}),e.jsxs("button",{className:`lp-conjuntos-filtro ${h?"is-selected":""}`,"aria-pressed":h,onClick:()=>S(t=>!t),children:[e.jsx(de,{})," Conjuntos"]})]}),_.isFetching&&!_.isLoading&&e.jsx("p",{className:"lp-ayuda",role:"status",children:c?"Confirmando precios vigentes…":"Actualizando precios…"}),l&&e.jsx("p",{className:"lp-aviso",role:"alert",children:l}),_.isError&&F.length>0&&e.jsxs("p",{className:"lp-aviso",role:"alert",children:["No se pudo actualizar. Los precios visibles corresponden a la última consulta. ",e.jsx("button",{onClick:()=>_.refetch(),children:"Reintentar"})]}),_.isLoading?e.jsx("div",{className:"lp-grid",children:Array.from({length:6},(t,j)=>e.jsx("div",{className:"lp-card lp-card--skeleton"},j))}):_.isError&&!F.length?e.jsx(an,{message:"No se pudo cargar el catálogo de precios.",onRetry:_.refetch}):K.length?e.jsx("div",{className:`lp-grid ${n&&p==="lista"?"lp-grid--lista":""}`,children:K.map(t=>{var z;const j=t.variantes.flatMap(V=>V.precios||[]).map(V=>V.precio).filter(re).map(Number),N=Be(t.variantes);return e.jsxs("button",{className:`lp-card ${(U==null?void 0:U.id)===t.id?"lp-card--seleccionada":""}`,"aria-pressed":(U==null?void 0:U.id)===t.id,onClick:()=>H(t),"aria-label":`Consultar ${t.nombre}`,children:[e.jsx("div",{className:"lp-card-foto",children:e.jsx(be,{src:(z=t.fotos)==null?void 0:z[0],loading:"lazy",decoding:"async"})}),e.jsxs("div",{className:"lp-card-info",children:[e.jsx("span",{className:"lp-eyebrow",children:[...new Set(t.variantes.map(V=>V.categoria_nombre))].filter(Boolean).join(" · ")}),e.jsx("strong",{className:"lp-card-nombre",children:t.nombre}),e.jsx("span",{className:"lp-card-descripcion",children:N.length===1?N[0].nombre:`${N.length} subcategorías`}),e.jsx("span",{className:"lp-card-precio",children:j.length?`Desde ${v(Math.min(...j))}`:"Consultar disponibilidad de precio"}),n&&e.jsxs("span",{className:"lp-card-abrir",children:["Ver opciones ",e.jsx(Fe,{})]})]})]},t.id)})}):e.jsx(on,{icon:Ae,title:F.length?"Sin coincidencias":"Sin subcategorías publicadas",message:F.length?"Prueba con la referencia o su subcategoría.":"En Administrar lista, elige el proveedor, guarda el costo y pulsa «Publicar» en cada subcategoría.",action:F.length?e.jsx(J,{onClick:()=>{A(""),f(""),S(!1)},children:"Ver todo"}):void 0}),e.jsx("p",{className:"lp-catalogo-nota",children:"Elige una referencia y su subcategoría para ver el precio exacto según el grupo de tela."})]}),n&&e.jsxs("aside",{ref:i,className:"lp-venta-panel","aria-label":"Asistente de venta",children:[ne||e.jsxs("section",{className:"lp-venta-bienvenida",children:[e.jsx("div",{className:"lp-venta-simbolo",children:e.jsx(he,{})}),e.jsx("span",{className:"lp-eyebrow",children:"Tu consulta, en un solo lugar"}),e.jsx("h2",{children:"Encuentra la combinación ideal."}),e.jsx("p",{children:"Selecciona una referencia. Aquí podrás cambiar la medida, explorar telas y confirmar el precio sin perder de vista el catálogo."}),e.jsxs("ol",{children:[e.jsx("li",{children:"Elige producto y medida"}),e.jsx("li",{children:"Elige tela y opciones"}),e.jsx("li",{children:"Agrégalo a la cotización"})]})]}),e.jsxs("section",{className:"lp-venta-resumen","aria-label":"Resumen de la venta",children:[e.jsxs("div",{className:"lp-venta-resumen-titulo",children:[e.jsx("span",{className:"lp-eyebrow",children:"La propuesta del cliente"}),e.jsxs("span",{children:[o.items.length," productos"]})]}),o.items.length>0&&e.jsx("ul",{children:o.items.slice(-3).map(t=>e.jsxs("li",{children:[e.jsxs("span",{children:[e.jsx("strong",{children:t.lineaNombre}),e.jsxs("small",{children:[t.varianteNombre," · ",t.grupoNombre||"Sin tela"," · ×",t.cantidad]})]}),e.jsx("b",{children:v(t.precioUnitario*t.cantidad)})]},t.id))}),e.jsxs("div",{className:"lp-venta-total",children:[e.jsx("span",{children:"Total cotización"}),e.jsx("strong",{children:v(o.total)})]}),e.jsxs("button",{className:"lp-venta-abrir",onClick:()=>P(!0),children:["Revisar cotización ",e.jsx(Fe,{})]})]})]})]}),!n&&ne,!n&&e.jsx("div",{className:"lp-consulta-dock",children:e.jsxs("button",{className:"lp-dock-cotizacion",onClick:()=>P(!0),children:[e.jsx(Oe,{}),e.jsxs("span",{children:["Cotización ",e.jsxs("strong",{children:[o.items.length," productos · ",v(o.total)]})]})]})}),e.jsx(kn,{open:D,cart:o,onClose:()=>P(!1),onEditar:te,guardando:G.isPending,error:G.isError?(ae=G.error)!=null&&ae.isAxiosError||(Y=G.error)!=null&&Y.response?jn(G.error,"No se pudo guardar la cotización. Tus productos siguen aquí."):G.error.message:"",onGenerar:(t,j)=>G.mutate({cliente:t,descuento:j})}),e.jsx(yn,{open:!!$,onClose:()=>x(null),items:$==null?void 0:$.items,cliente:$==null?void 0:$.cliente,descuento:($==null?void 0:$.descuento)||0,vendedorNombre:a!=null&&a.first_name?`${a.first_name} ${a.last_name||""}`.trim():a==null?void 0:a.username,folio:$==null?void 0:$.folio})]})}export{Jn as default};
