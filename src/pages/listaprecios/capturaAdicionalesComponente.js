import { borradorEspecial, validarBorradorEspecial } from './configuracionEspecial';

// Solo especiales: los cargos de una pieza son los del producto original (2026-10-15).
export const borradorAdicionales = datos => datos.filter(a => a.tipo === 'especial')
  .map(a => ({ tipo: 'especial', nombre: a.nombre, form: borradorEspecial(a.configuracion) }));

export function validarAdicionales(filas) {
  const errores = {};
  const datos = filas.map((a, i) => {
    const fallo = {};
    if (!a.nombre.trim()) fallo.nombre = 'Escribe el nombre.';
    const dato = { tipo: 'especial', nombre: a.nombre.trim() };
    const r = validarBorradorEspecial(a.form);
    Object.assign(fallo, r.errores); dato.configuracion = r.config;
    if (Object.keys(fallo).length) errores[i] = fallo;
    return dato;
  });
  return { datos, errores, valido: !Object.keys(errores).length };
}
