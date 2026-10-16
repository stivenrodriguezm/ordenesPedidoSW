// Convierte un nodo del DOM en PNG y lo descarga (imágenes de pedidos para el proveedor).
export async function descargarImagen(nodo, nombre) {
    if (document.fonts?.ready) await document.fonts.ready;
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(nodo, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
    const enlace = document.createElement('a');
    enlace.href = canvas.toDataURL('image/png');
    enlace.download = nombre;
    enlace.click();
}

// Fecha de las imágenes, como las de siempre: órdenes '05-oct-2026'; pedidos de tela
// (/telas) '5-oct-2026', sin cero a la izquierda.
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function fechaImagen(valor, { conCero = true } = {}) {
    if (!valor) return '';
    const [y, m, d] = String(valor).slice(0, 10).split('-').map(Number);
    return `${conCero ? String(d).padStart(2, '0') : d}-${MESES[m - 1]}-${y}`;
}
