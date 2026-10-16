import React, { useRef, useState } from 'react';
import { FaBold, FaEye, FaHeading, FaItalic, FaListOl, FaListUl, FaMinus, FaPen } from 'react-icons/fa';
import { formatoLottus } from '../utils/textoFormato';
import './EditorTextoFormato.css';

/*
 * Texto largo con formato sencillo para las fichas de producto de la web (2026-10-08).
 * Se guarda como texto con marcas (**negrilla**, *cursiva*, "- " viñeta, "1. " lista,
 * "## " subtítulo, "---" separador) y la vista previa usa el mismo formateador que la web.
 */
export default function EditorTextoFormato({ id, etiqueta, ayuda, valor, alCambiar, filas = 6, placeholder }) {
    const [vista, setVista] = useState(false);
    const area = useRef(null);

    const aplicar = (transformar) => {
        const t = area.current;
        if (!t) return;
        const { selectionStart: ini, selectionEnd: fin } = t;
        const { texto, selIni, selFin } = transformar(valor || '', ini, fin);
        alCambiar(texto);
        requestAnimationFrame(() => { t.focus(); t.setSelectionRange(selIni, selFin); });
    };
    // **negrilla** o *cursiva* alrededor de lo seleccionado (o de un texto de ejemplo).
    const envolver = (marca, ejemplo) => aplicar((v, ini, fin) => {
        const sel = v.slice(ini, fin) || ejemplo;
        return { texto: v.slice(0, ini) + marca + sel + marca + v.slice(fin), selIni: ini + marca.length, selFin: ini + marca.length + sel.length };
    });
    // Prefijo en cada línea seleccionada (viñetas, numeración, subtítulo).
    const prefijar = (prefijo) => aplicar((v, ini, fin) => {
        const inicioLinea = v.lastIndexOf('\n', ini - 1) + 1;
        const finLinea = v.indexOf('\n', fin) === -1 ? v.length : v.indexOf('\n', fin);
        const bloque = v.slice(inicioLinea, finLinea).split('\n')
            .map((l, i) => (typeof prefijo === 'function' ? prefijo(i) : prefijo) + l.replace(/^(\s*[-•*·]\s+|\s*\d+[.)]\s+|#{1,3}\s+)/, ''))
            .join('\n');
        return { texto: v.slice(0, inicioLinea) + bloque + v.slice(finLinea), selIni: inicioLinea, selFin: inicioLinea + bloque.length };
    });
    const separador = () => aplicar((v, ini) => {
        const antes = v.slice(0, ini).replace(/\n*$/, '');
        const insertar = `${antes ? '\n\n' : ''}---\n\n`;
        const texto = antes + insertar + v.slice(ini).replace(/^\n*/, '');
        return { texto, selIni: (antes + insertar).length, selFin: (antes + insertar).length };
    });

    const botones = [
        { icono: FaBold, titulo: 'Negrilla', accion: () => envolver('**', 'texto en negrilla') },
        { icono: FaItalic, titulo: 'Cursiva', accion: () => envolver('*', 'texto en cursiva') },
        { icono: FaListUl, titulo: 'Viñetas', accion: () => prefijar('- ') },
        { icono: FaListOl, titulo: 'Lista numerada', accion: () => prefijar(i => `${i + 1}. `) },
        { icono: FaHeading, titulo: 'Subtítulo', accion: () => prefijar('## ') },
        { icono: FaMinus, titulo: 'Línea separadora', accion: separador },
    ];

    return (
        <div className="etf">
            <div className="etf-cabeza">
                <label className="ds-label" htmlFor={id}>{etiqueta}</label>
                <div className="etf-barra" role="toolbar" aria-label={`Formato de ${etiqueta}`}>
                    {botones.map(({ icono: Icono, titulo, accion }) => (
                        <button type="button" key={titulo} title={titulo} aria-label={titulo} onClick={accion} disabled={vista}><Icono /></button>
                    ))}
                    <span className="etf-sep" aria-hidden="true" />
                    <button type="button" className={`etf-vista${vista ? ' is-activa' : ''}`} aria-pressed={vista} onClick={() => setVista(v => !v)}>
                        {vista ? <><FaPen aria-hidden="true" /> Editar</> : <><FaEye aria-hidden="true" /> Vista previa</>}
                    </button>
                </div>
            </div>
            {vista ? (
                <div className="etf-preview formato" aria-label={`Vista previa de ${etiqueta}`}
                    // Seguro: formatoLottus escapa todo el HTML antes de aplicar el formato.
                    dangerouslySetInnerHTML={{ __html: formatoLottus(valor) || '<p class="etf-vacio">Sin contenido.</p>' }} />
            ) : (
                <textarea ref={area} id={id} className="etf-area" rows={filas} placeholder={placeholder} value={valor || ''} onChange={e => alCambiar(e.target.value)} />
            )}
            {ayuda && <small className="etf-ayuda">{ayuda}</small>}
        </div>
    );
}
