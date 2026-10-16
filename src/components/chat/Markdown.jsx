import React from 'react';

/*
 * Markdown mínimo para las respuestas del asistente: títulos, párrafos, listas,
 * tablas, citas, separadores, código y énfasis. Todo se arma como elementos de React
 * (sin HTML crudo), así que el texto del modelo no puede inyectar marcado.
 */

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

function enLinea(texto, clave = '') {
    return String(texto).split(INLINE).filter(Boolean).map((t, i) => {
        const k = `${clave}-${i}`;
        if ((t.startsWith('**') && t.endsWith('**')) || (t.startsWith('__') && t.endsWith('__'))) return <strong key={k}>{enLinea(t.slice(2, -2), k)}</strong>;
        if (t.startsWith('`') && t.endsWith('`')) return <code key={k}>{t.slice(1, -1)}</code>;
        if ((t.startsWith('*') && t.endsWith('*')) || (t.startsWith('_') && t.endsWith('_'))) return <em key={k}>{enLinea(t.slice(1, -1), k)}</em>;
        return <React.Fragment key={k}>{t}</React.Fragment>;
    });
}

const esSeparadorTabla = (l) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const celdas = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
const alineacion = (sep) => celdas(sep).map(c => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left'));

export default function Markdown({ texto }) {
    const lineas = String(texto || '').replace(/\r/g, '').split('\n');
    const bloques = [];
    let i = 0;
    while (i < lineas.length) {
        const l = lineas[i];
        const k = `b${i}`;
        if (!l.trim()) { i += 1; continue; }
        if (l.trim().startsWith('```')) {
            const codigo = [];
            i += 1;
            while (i < lineas.length && !lineas[i].trim().startsWith('```')) { codigo.push(lineas[i]); i += 1; }
            i += 1;
            bloques.push(<pre key={k}><code>{codigo.join('\n')}</code></pre>);
            continue;
        }
        const titulo = l.match(/^(#{1,6})\s+(.*)$/);
        if (titulo) {
            const nivel = Math.min(titulo[1].length + 2, 6);
            bloques.push(React.createElement(`h${nivel}`, { key: k }, enLinea(titulo[2], k)));
            i += 1;
            continue;
        }
        if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) { bloques.push(<hr key={k} />); i += 1; continue; }
        if (l.trim().startsWith('|') && i + 1 < lineas.length && esSeparadorTabla(lineas[i + 1])) {
            const cabecera = celdas(l);
            const alin = alineacion(lineas[i + 1]);
            const filas = [];
            i += 2;
            while (i < lineas.length && lineas[i].trim().startsWith('|')) { filas.push(celdas(lineas[i])); i += 1; }
            bloques.push(
                <div className="md-tabla" key={k}>
                    <table>
                        <thead><tr>{cabecera.map((c, j) => <th key={j} style={{ textAlign: alin[j] }}>{enLinea(c, `${k}h${j}`)}</th>)}</tr></thead>
                        <tbody>{filas.map((f, r) => <tr key={r}>{cabecera.map((_, j) => <td key={j} style={{ textAlign: alin[j] }}>{enLinea(f[j] ?? '', `${k}${r}${j}`)}</td>)}</tr>)}</tbody>
                    </table>
                </div>,
            );
            continue;
        }
        const vineta = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/;
        if (vineta.test(l)) {
            // Viñetas con sangría van anidadas bajo el punto anterior (p. ej. "Qué hacer / Quién").
            const grupos = [];
            while (i < lineas.length && (vineta.test(lineas[i]) || (/^\s{2,}\S/.test(lineas[i]) && grupos.length))) {
                const m = lineas[i].match(vineta);
                const actual = grupos[grupos.length - 1];
                if (!m) {
                    const destino = actual.hijos.length ? actual.hijos[actual.hijos.length - 1] : actual;
                    destino.texto += ` ${lineas[i].trim()}`;
                } else if (m[1].length >= 2 && actual) {
                    actual.hijos.push({ texto: m[3], ordenada: /\d/.test(m[2]) });
                } else {
                    grupos.push({ texto: m[3], ordenada: /\d/.test(m[2]), numero: parseInt(m[2], 10), hijos: [] });
                }
                i += 1;
            }
            const ordenada = grupos[0].ordenada;
            const Lista = ordenada ? 'ol' : 'ul';
            bloques.push(
                <Lista key={k} start={ordenada && grupos[0].numero > 1 ? grupos[0].numero : undefined}>
                    {grupos.map((g, j) => {
                        const Sub = g.hijos[0]?.ordenada ? 'ol' : 'ul';
                        return (
                            <li key={j}>{enLinea(g.texto, `${k}${j}`)}
                                {!!g.hijos.length && <Sub>{g.hijos.map((h, n) => <li key={n}>{enLinea(h.texto, `${k}${j}-${n}`)}</li>)}</Sub>}
                            </li>
                        );
                    })}
                </Lista>,
            );
            continue;
        }
        if (l.trim().startsWith('>')) {
            const cita = [];
            while (i < lineas.length && lineas[i].trim().startsWith('>')) { cita.push(lineas[i].trim().replace(/^>\s?/, '')); i += 1; }
            bloques.push(<blockquote key={k}>{enLinea(cita.join(' '), k)}</blockquote>);
            continue;
        }
        const parrafo = [];
        while (i < lineas.length && lineas[i].trim() && !/^(#{1,6}\s|```|\s*([-*•]|\d+[.)])\s|\s*\|)/.test(lineas[i])) { parrafo.push(lineas[i].trim()); i += 1; }
        if (!parrafo.length) { parrafo.push(l.trim()); i += 1; }
        bloques.push(<p key={k}>{enLinea(parrafo.join(' '), k)}</p>);
    }
    return <div className="md">{bloques}</div>;
}
