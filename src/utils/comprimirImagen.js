// Reduce una foto en el navegador antes de subirla (2026-10-28): JPEG con el lado mayor de
// hasta 2000 px. Así un pantallazo o una foto de cámara de 10-20 MB sube rápido y nunca se
// rechaza por tamaño; el servidor la vuelve a comprimir de todas formas. Si el navegador no
// puede leerla (p. ej. HEIC fuera de Safari), devuelve el archivo original.

const cargar = async (archivo) => {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    } catch { /* se intenta con <img> */ }
  }
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const aBlob = (canvas, calidad) => new Promise((resolver) => canvas.toBlob(resolver, 'image/jpeg', calidad));

export async function comprimirImagen(archivo, { lado = 2000, calidad = 0.82 } = {}) {
  try {
    const imagen = await cargar(archivo);
    const ancho = imagen.width || imagen.naturalWidth;
    const alto = imagen.height || imagen.naturalHeight;
    const escala = Math.min(1, lado / Math.max(ancho, alto));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(ancho * escala));
    canvas.height = Math.max(1, Math.round(alto * escala));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // pantallazos con transparencia
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);
    imagen.close?.();
    const blob = await aBlob(canvas, calidad);
    if (!blob) return archivo;
    const nombre = (archivo.name || 'comprobante').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], nombre, { type: 'image/jpeg' });
  } catch {
    return archivo;
  }
}
