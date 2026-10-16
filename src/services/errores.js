// Interpretación común de errores de la API (P08-06, U03): distingue conexión,
// permiso, validación, conflicto y fallo del servidor, y convierte los errores
// anidados por fila/campo en texto legible en vez de mostrar JSON crudo.

const TIPO_POR_ESTADO = { 400: 'validacion', 401: 'sesion', 403: 'permiso', 404: 'no_encontrado', 409: 'conflicto', 429: 'limite' };

const PREFIJO = {
  sesion: 'Tu sesión expiró. Vuelve a iniciar sesión; los datos del formulario siguen aquí.',
  limite: 'Demasiadas solicitudes seguidas. Espera un momento e intenta de nuevo.',
};

// "producto_2" → "Producto 2"; "non_field_errors" no aporta: se omite.
const etiqueta = (clave) => {
  if (clave === 'non_field_errors' || clave === 'detail' || clave === 'error') return '';
  const texto = String(clave).replace(/_/g, ' ').trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

// Aplana { productos: { producto_2: { costo: ['...'] } } } en
// [{ ruta: ['Productos', 'Producto 2', 'Costo'], mensaje: '...' }].
const aplanar = (valor, ruta = []) => {
  if (valor == null) return [];
  if (typeof valor === 'string') return [{ ruta, mensaje: valor }];
  if (Array.isArray(valor)) return valor.flatMap((v) => aplanar(v, ruta));
  if (typeof valor === 'object') {
    return Object.entries(valor).flatMap(([k, v]) => aplanar(v, etiqueta(k) ? [...ruta, etiqueta(k)] : ruta));
  }
  return [{ ruta, mensaje: String(valor) }];
};

export const describirError = (error, porDefecto = 'No se pudo completar la operación.') => {
  if (!error?.response) {
    return {
      tipo: 'conexion',
      mensaje: 'Sin respuesta del servidor. Revisa si la operación quedó registrada antes de reintentar.',
      campos: [],
    };
  }
  const { status, data } = error.response;
  const tipo = TIPO_POR_ESTADO[status] || (status >= 500 ? 'servidor' : 'validacion');
  if (PREFIJO[tipo]) return { tipo, mensaje: PREFIJO[tipo], campos: [] };
  if (tipo === 'servidor') {
    return { tipo, mensaje: 'Error del servidor. No se guardó nada; intenta de nuevo o avisa al administrador.', campos: [] };
  }
  // HTML u otra respuesta no estructurada: no se muestra tal cual.
  if (typeof data === 'string') {
    return { tipo, mensaje: data.length <= 300 && !data.trim().startsWith('<') ? data : porDefecto, campos: [] };
  }
  const campos = aplanar(data);
  const mensaje = campos.length
    ? campos.map(({ ruta, mensaje }) => (ruta.length ? `${ruta.join(' · ')}: ${mensaje}` : mensaje)).join(' ')
    : porDefecto;
  return { tipo, mensaje, campos };
};

/** Mensaje legible de un error de la API. */
export const mensajeDeError = (error, porDefecto) => describirError(error, porDefecto).mensaje;
