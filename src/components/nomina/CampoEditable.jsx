import React, { useEffect, useState } from 'react';

/**
 * Valor que se edita en su sitio: se guarda al salir del campo o con Enter, y
 * Escape descarta. Sin `editable` solo muestra el texto formateado.
 */
export default function CampoEditable({ valor, formato = (v) => v, onGuardar, editable, etiqueta, tipo = 'number', ancho = '7.5rem' }) {
    const [texto, setTexto] = useState(valor ?? '');
    useEffect(() => { setTexto(valor ?? ''); }, [valor]);
    if (!editable) return <span>{formato(valor)}</span>;
    const guardar = () => {
        if (String(texto) !== String(valor ?? '')) onGuardar(texto === '' ? null : texto);
    };
    return (
        <input
            aria-label={etiqueta}
            className="nom-input"
            style={{ width: ancho }}
            type={tipo}
            step="any"
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onBlur={guardar}
            onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') { setTexto(valor ?? ''); e.currentTarget.blur(); }
            }}
        />
    );
}
