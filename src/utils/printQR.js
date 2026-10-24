// Impresión de etiquetas QR sin HTML concatenado (auditoría 2026-10-02, H17).
// Los datos del producto son editables por usuarios: se insertan como texto
// (textContent) y el SVG se copia como nodo, nunca como cadena HTML.

/** Construye el contenido de la etiqueta dentro del documento `doc`. */
export const construirEtiquetaQR = (doc, { svg, id, nombre }) => {
  doc.title = 'Imprimir QR';
  const body = doc.body;
  body.style.cssText = 'display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif;';

  const contenedor = doc.createElement('div');
  contenedor.style.textAlign = 'center';
  if (svg) contenedor.appendChild(doc.importNode(svg, true));

  const pId = doc.createElement('p');
  pId.style.cssText = 'margin-top:10px;font-weight:bold;font-size:14px;';
  pId.textContent = `ID: ${id ?? ''}`;

  const pNombre = doc.createElement('p');
  pNombre.style.cssText = 'font-size:12px;color:#555;';
  pNombre.textContent = nombre || '';

  contenedor.append(pId, pNombre);
  body.replaceChildren(contenedor);
  return contenedor;
};

/** La etiqueta como documento HTML completo (para la impresora de la oficina). */
export const documentoEtiquetaQR = (datos) => {
  const doc = document.implementation.createHTMLDocument('Imprimir QR');
  construirEtiquetaQR(doc, datos);
  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
};

/** Abre una ventana, arma la etiqueta e imprime. Sin scripts inyectados. */
export const imprimirEtiquetaQR = ({ svg, id, nombre }) => {
  const ventana = window.open('', '', 'width=400,height=400');
  if (!ventana) return false;
  construirEtiquetaQR(ventana.document, { svg, id, nombre });
  ventana.setTimeout(() => {
    ventana.focus();
    ventana.print();
    ventana.close();
  }, 300);
  return true;
};
