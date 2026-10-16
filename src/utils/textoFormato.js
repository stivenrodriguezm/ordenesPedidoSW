// Formato sencillo de las fichas de producto de la web (2026-10-08). El MISMO código está
// en webLottus/public/js/main.js (LOTTUS.formato): si cambias uno, cambia el otro.
// Admite **negrilla**, *cursiva*, viñetas "- " "• " "* ", listas "1. ", "## subtítulo" y
// "---" (separador). Primero se escapa el HTML: el texto no puede inyectar marcado.
export function formatoLottus(texto) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const enLinea = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');
  const lineas = String(texto || '').replace(/\r/g, '').split('\n');
  let html = '';
  let lista = null;
  let parrafo = [];
  const cerrarParrafo = () => { if (parrafo.length) { html += `<p>${parrafo.map(enLinea).join('<br>')}</p>`; parrafo = []; } };
  const cerrarLista = () => { if (lista) { html += `</${lista}>`; lista = null; } };
  const abrirLista = (tipo) => { cerrarParrafo(); if (lista !== tipo) { cerrarLista(); html += `<${tipo}>`; lista = tipo; } };
  lineas.forEach((crudo) => {
    const l = crudo.trim();
    let m;
    if (!l) { cerrarParrafo(); cerrarLista(); return; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(l)) { cerrarParrafo(); cerrarLista(); html += '<hr>'; return; }
    if ((m = l.match(/^#{1,3}\s+(.+)$/))) { cerrarParrafo(); cerrarLista(); html += `<h4>${enLinea(m[1])}</h4>`; return; }
    if ((m = l.match(/^[-•*·]\s+(.+)$/))) { abrirLista('ul'); html += `<li>${enLinea(m[1])}</li>`; return; }
    if ((m = l.match(/^\d+[.)]\s+(.+)$/))) { abrirLista('ol'); html += `<li>${enLinea(m[1])}</li>`; return; }
    cerrarLista();
    parrafo.push(l);
  });
  cerrarParrafo();
  cerrarLista();
  return html;
}
