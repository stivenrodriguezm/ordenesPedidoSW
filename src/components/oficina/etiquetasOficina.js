// Etiquetas del plano (2026-10-09): nombres cortos y ubicados para que no se tapen entre sí.

/** «Sebastian Albarracin» → «Sebastian A.»; los nombres de agentes cortos quedan igual. */
export function nombreCorto(nombre = '') {
    const partes = nombre.trim().split(/\s+/);
    if (partes.length < 2 || nombre.length <= 14) return nombre;
    return `${partes[0]} ${partes[1][0].toUpperCase()}.`;
}

const ALTO = 22, SEPARACION = 3;
const choca = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
const solape = (a, b) => Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));

/**
 * puestos: [{clave, px, py, texto, extra}] en coordenadas del plano (viewBox 1650 de ancho,
 * px/py = pies del personaje). chips: [{px, py, texto}] etiquetas de zona (fijas).
 * Devuelve {clave: {lado: 'abajo'|'arriba', dx}} en píxeles. Se prueba debajo, encima y
 * corrido a los lados, evitando otras etiquetas, los cuerpos y las etiquetas de zona.
 */
export function ubicarEtiquetas(puestos, zoom = 1, chips = []) {
    const escala = (1500 * zoom) / 1650, figura = 73 * zoom, ubicadas = [], salida = {};
    const cuerpos = puestos.map(p => ({ clave: p.clave, x1: p.px * escala - 18 * zoom, x2: p.px * escala + 18 * zoom, y1: p.py * escala - figura + 6, y2: p.py * escala - 2 }));
    const fijos = chips.map(c => { const w = c.texto.length * 5.6 + 18, x = c.px * escala, y = c.py * escala; return { x1: x - w / 2, x2: x + w / 2, y1: y, y2: y + 20 }; });
    const ordenados = [...puestos].sort((a, b) => a.py - b.py || a.px - b.px);
    for (const p of ordenados) {
        const ancho = p.texto.length * 6.4 + 24 + (p.extra || 0), x = p.px * escala, y = p.py * escala;
        const caja = (lado, dx) => {
            const y1 = lado === 'abajo' ? y - 2 : y - figura - ALTO - 2;
            return { x1: x + dx - ancho / 2 - SEPARACION, x2: x + dx + ancho / 2 + SEPARACION, y1, y2: y1 + ALTO, lado, dx };
        };
        const corrimiento = Math.round(ancho / 2 + 6);
        const opciones = [caja('abajo', 0), caja('arriba', 0), caja('abajo', corrimiento), caja('abajo', -corrimiento),
            caja('arriba', corrimiento), caja('arriba', -corrimiento)];
        const otros = [...ubicadas, ...fijos, ...cuerpos.filter(c => c.clave !== p.clave)];
        const elegida = opciones.find(o => !otros.some(u => choca(o, u)))
            || opciones.reduce((mejor, o) => {
                const total = ubicadas.reduce((t, u) => t + solape(o, u) * 3, 0) + otros.reduce((t, u) => t + solape(o, u), 0);
                return total < mejor.total ? { o, total } : mejor;
            }, { o: opciones[0], total: Infinity }).o;
        ubicadas.push(elegida);
        salida[p.clave] = { lado: elegida.lado, dx: elegida.dx };
    }
    return salida;
}
