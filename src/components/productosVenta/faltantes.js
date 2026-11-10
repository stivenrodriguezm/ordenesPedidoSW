// Qué le falta a cada línea antes de guardar (2026-10-08). Es la misma regla que valida
// el servidor en productos_venta.preparar_linea; aquí se usa para señalar cada campo.
// Las marcas `_requiere_grupo` y `_precio_error` las pone el editor al cargar el catálogo
// y al calcular el precio. (2026-10-15) El texto para el cliente es opcional; la tela pide
// su grupo (tela o cuero) y, si se compra aparte, el costo del proveedor por m o dm.

export const TIPOS_ADICIONAL = {
    transporte: 'Transporte',
    articulo: 'Artículo adicional',
    ajuste: 'Ajuste',
    bold: 'Bold',
};

// Bold (2026-11-10): se escribe lo recibido por Bold y a la lista se suma su costo (5 %).
export const PORCENTAJE_BOLD = 5;
export const costoBold = (recibido) => Math.round((Number(recibido) || 0) * PORCENTAJE_BOLD / 100);

const texto = (v) => String(v ?? '').trim();
export const recargoListo = (a) => texto(a.descripcion) && Number(a.importe_lista) > 0;

// «Producto especial» (2026-10-28): producto fuera de la lista con su costo total; el precio de
// lista lo calcula el servidor con el costo, el consumo del grupo y el multiplicador general.
// Los especiales antiguos con precio autorizado (sin costo) se siguen editando como antes.
export const esEspecialPorCosto = (l) => !l.variante && (l.tipo || 'producto') === 'producto'
    && Boolean(l._por_costo || l.costo_especial != null || l.metraje_especial != null);

export function faltantesDe(l, grupos = []) {
    const f = {};
    const tipo = l.tipo || 'producto';
    if (tipo !== 'producto') {
        if (!texto(l.producto_nombre)) f.producto_nombre = 'Escribe qué es.';
        if (l.juego) return f; // costos de un conjunto de la lista: el valor lo calcula el servidor
        if (tipo === 'bold') {
            if (!(Number(l.bold_recibido) > 0)) f.bold_recibido = 'Indica cuánto se recibió por Bold.';
            return f;
        }
        const valor = Number(l.precio_lista_override);
        if (!valor || (tipo !== 'ajuste' && valor < 0)) f.precio_lista_override = 'Indica el valor.';
        if (tipo === 'articulo' && !(Number(l.cantidad) >= 1)) f.cantidad = 'Indica la cantidad.';
        return f;
    }
    const especial = !l.variante;
    if (especial && !texto(l.producto_nombre)) f.producto_nombre = 'Escribe el nombre del producto.';
    if (!(Number(l.cantidad) >= 1)) f.cantidad = 'Indica la cantidad.';
    // El grupo se elige en la sección Tela; en un producto de catálogo define el precio.
    if (l._requiere_grupo && !l.grupo_catalogo) f.tela_grupo = 'Elige el grupo: define el precio de lista.';
    if (esEspecialPorCosto(l)) {
        if (!(Number(l.costo_especial) > 0)) f.costo_especial = 'Indica el costo por unidad.';
        if (l.grupo_catalogo && !(Number(l.metraje_especial) > 0)) f.metraje_especial = 'Indica el consumo por unidad.';
    } else {
        if (especial && !(Number(l.precio_lista_override) > 0)) f.precio_lista_override = 'Indica el precio de lista.';
        if ((especial || l.precio_lista_override) && !texto(l.motivo_precio)) f.motivo_precio = 'Explica el precio especial.';
    }
    if (l._precio_error) f.precio = l._precio_error;
    if (!l.referencia && !l.inventario_origen) f.referencia = 'Elige la referencia de compra.';
    if (!l.tela_modo) {
        f.tela_modo = 'Indica si lleva tela.';
    } else if (l.tela_modo !== 'no_aplica') {
        const de = (l.tela_material || (l.grupo_es_cuero ? 'cuero' : 'tela')) === 'cuero' ? 'del cuero' : 'de la tela';
        if (!texto(l.tela_referencia)) f.tela_referencia = `Escribe la referencia ${de}.`;
        if (!texto(l.tela_color)) f.tela_color = `Escribe el color ${de}.`;
        // «No pedir»: queda registrada, sin proveedor ni cantidad obligatorios.
        const pedirla = l.tela_modo === 'aparte' && !l.tela_sin_pedir;
        if (pedirla && !l.tela_proveedor) f.tela_proveedor = `Elige el proveedor ${de}.`;
        if (pedirla && !(Number(l.tela_cantidad) > 0)) f.tela_cantidad = `Indica la cantidad ${de}.`;
        // Ya pedida: el pedido de tela no cambia, el grupo se completa cuando se pueda.
        const pedida = !!l.tela_pedidos?.length;
        const material = de === 'del cuero' ? 'cuero' : 'tela';
        const precio = grupos.find(g => g.id === l.grupo_catalogo);
        const tieneGrupo = l.tela_grupo || (precio ? precio.tipo === material : (l.grupo_catalogo && !grupos.length));
        // El costo de la tela no se pide (2026-11-04): es el del grupo en la lista de precios, si lo tiene.
        if (!pedida && !tieneGrupo && !f.tela_grupo) f.tela_grupo = `Elige el grupo ${de}.`;
    }
    if (l.conjunto && !texto(l.conjunto_nombre)) f.conjunto_nombre = 'Ponle nombre al conjunto.';
    if (!l.sin_texto_proveedor && !texto(l.texto_proveedor) && !l.inventario_origen) f.texto_proveedor = 'Escribe el texto para el proveedor o marca "No aplica".';
    if ((l.adicionales || []).some(a => !recargoListo(a))) f.adicionales = 'Completa el recargo (qué es y su valor) o quítalo.';
    return f;
}

// Nombres cortos para el resumen ("faltan: referencia de compra, color de la tela…").
const NOMBRES = {
    producto_nombre: 'nombre', cantidad: 'cantidad', grupo_catalogo: 'grupo de tela', precio_lista_override: 'valor o precio',
    motivo_precio: 'motivo del precio', precio: 'precio de lista', referencia: 'referencia de compra', tela_modo: 'si lleva tela',
    tela_referencia: 'referencia de la tela', tela_color: 'color de la tela', tela_proveedor: 'proveedor de la tela',
    tela_cantidad: 'cantidad de tela', texto_proveedor: 'texto para el proveedor', texto_cliente: 'texto para el cliente',
    adicionales: 'recargo', bold_recibido: 'valor recibido por Bold', costo_especial: 'costo', metraje_especial: 'consumo de tela', tela_grupo: 'grupo de la tela', tela_costo: 'costo de la tela', conjunto_nombre: 'nombre del conjunto',
};
export const nombreCampo = (campo) => NOMBRES[campo] || campo;
