// Qué le falta a cada línea antes de guardar (2026-10-08). Es la misma regla que valida
// el servidor en productos_venta.preparar_linea; aquí se usa para señalar cada campo.
// Las marcas `_requiere_grupo` y `_precio_error` las pone el editor al cargar el catálogo
// y al calcular el precio. (2026-10-15) El texto para el cliente es opcional; la tela pide
// su grupo (tela o cuero) y, si se compra aparte, el costo del proveedor por m o dm.

export const TIPOS_ADICIONAL = {
    transporte: 'Transporte',
    articulo: 'Artículo adicional',
    ajuste: 'Ajuste',
};

const texto = (v) => String(v ?? '').trim();
export const recargoListo = (a) => texto(a.descripcion) && Number(a.importe_lista) > 0;

export function faltantesDe(l, grupos = []) {
    const f = {};
    const tipo = l.tipo || 'producto';
    if (tipo !== 'producto') {
        if (!texto(l.producto_nombre)) f.producto_nombre = 'Escribe qué es.';
        if (l.juego) return f; // costos de un conjunto de la lista: el valor lo calcula el servidor
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
    if (especial && !(Number(l.precio_lista_override) > 0)) f.precio_lista_override = 'Indica el precio de lista.';
    if ((especial || l.precio_lista_override) && !texto(l.motivo_precio)) f.motivo_precio = 'Explica el precio especial.';
    if (l._precio_error) f.precio = l._precio_error;
    if (!l.referencia && !l.inventario_origen) f.referencia = 'Elige la referencia de compra.';
    if (!l.tela_modo) {
        f.tela_modo = 'Indica si lleva tela.';
    } else if (l.tela_modo !== 'no_aplica') {
        const de = (l.tela_material || (l.grupo_es_cuero ? 'cuero' : 'tela')) === 'cuero' ? 'del cuero' : 'de la tela';
        if (!texto(l.tela_referencia)) f.tela_referencia = `Escribe la referencia ${de}.`;
        if (!texto(l.tela_color)) f.tela_color = `Escribe el color ${de}.`;
        if (l.tela_modo === 'aparte' && !l.tela_proveedor) f.tela_proveedor = `Elige el proveedor ${de}.`;
        if (l.tela_modo === 'aparte' && !(Number(l.tela_cantidad) > 0)) f.tela_cantidad = `Indica la cantidad ${de}.`;
        // Ya pedida: el pedido de tela no cambia, el grupo y el costo se completan cuando se pueda.
        const pedida = !!l.tela_pedidos?.length;
        const material = de === 'del cuero' ? 'cuero' : 'tela';
        const precio = grupos.find(g => g.id === l.grupo_catalogo);
        const tieneGrupo = l.tela_grupo || (precio ? precio.tipo === material : (l.grupo_catalogo && !grupos.length));
        if (!pedida && !tieneGrupo && !f.tela_grupo) f.tela_grupo = `Elige el grupo ${de}.`;
        // Sin costo escrito vale el del grupo en la lista de precios (lo aplica el servidor).
        const grupo = l.tela_grupo ? grupos.find(g => g.id === l.tela_grupo) : (precio && precio.tipo === material ? precio : null);
        const sinCosto = l.tela_costo === '' || l.tela_costo == null;
        if (!pedida && l.tela_modo === 'aparte' && sinCosto && !(Number(grupo?.precio_por_metro) > 0)) f.tela_costo = `Indica el costo del proveedor por ${material === 'cuero' ? 'decímetro' : 'metro'}.`;
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
    adicionales: 'recargo', tela_grupo: 'grupo de la tela', tela_costo: 'costo de la tela', conjunto_nombre: 'nombre del conjunto',
};
export const nombreCampo = (campo) => NOMBRES[campo] || campo;
