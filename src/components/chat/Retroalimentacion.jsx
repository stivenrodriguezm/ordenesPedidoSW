import React, { useEffect, useRef, useState } from 'react';
import { FaCheck, FaRegCommentDots, FaRegThumbsDown, FaRegThumbsUp, FaThumbsDown, FaThumbsUp, FaThumbtack } from 'react-icons/fa';
import API from '../../services/api';
import './Entrenamiento.css';

/*
 * Entrenamiento desde el chat: 👍 / 👎 con detalle opcional y 💬 "Enseñar" para que la IA
 * recuerde o resalte algo. Lo guardado se usa en las siguientes respuestas del mismo perfil.
 */

const MOTIVOS = {
    gusto: ['Claro y directo', 'Buen nivel de detalle', 'Buenas recomendaciones', 'Me sirvió el gráfico', 'Buen formato'],
    mejora: ['Muy largo', 'Muy corto', 'Faltaron datos', 'Cifras dudosas', 'Faltó un gráfico', 'Poco concreto', 'No era lo que pregunté'],
};
const TITULOS = {
    gusto: '¿Qué te gustó? Así la IA repite lo que funciona.',
    mejora: '¿Qué no te gustó? La IA lo corregirá en las próximas respuestas.',
    nota: 'Enséñale algo a la IA',
};

const mensajeError = (e) => e.response?.data?.error || e.response?.data?.detail || 'No se pudo guardar. Intenta de nuevo.';

function separar(comentario, tipo) {
    const partes = (comentario || '').split(' · ');
    const chips = partes.filter(p => (MOTIVOS[tipo] || []).includes(p));
    return { chips, texto: partes.filter(p => !chips.includes(p)).join(' · ') };
}

export default function Retroalimentacion({ m, agente, onActualizado, onCopiar, copiado }) {
    const [panel, setPanel] = useState(null); // 'gusto' | 'mejora' | 'nota'
    const [chips, setChips] = useState([]);
    const [texto, setTexto] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState('');
    const caja = useRef(null);
    const temporizador = useRef(null);
    useEffect(() => () => clearTimeout(temporizador.current), []);
    useEffect(() => { if (panel === 'nota') caja.current?.focus(); }, [panel]);

    const avisar = (t) => { setAviso(t); clearTimeout(temporizador.current); temporizador.current = setTimeout(() => setAviso(''), 3500); };
    const abrirPanel = (tipo, comentario = '') => {
        const previo = tipo === 'nota' ? { chips: [], texto: '' } : separar(comentario, tipo);
        setChips(previo.chips); setTexto(previo.texto); setError(''); setPanel(tipo);
    };

    const valorar = async (tipo) => {
        if (guardando) return;
        const quitar = m.valoracion === tipo;
        setGuardando(true); setError('');
        try {
            const r = await API.post(`/asistente/mensajes/${m.id}/valorar/`, { valoracion: quitar ? null : tipo });
            onActualizado(r.data);
            if (quitar) { setPanel(null); avisar('Valoración quitada.'); } else abrirPanel(tipo);
        } catch (e) { setError(mensajeError(e)); } finally { setGuardando(false); }
    };

    const guardar = async () => {
        const detalle = [...chips, texto.trim()].filter(Boolean).join(' · ');
        if (panel === 'nota' && !detalle) { setError('Escribe qué debe recordar la IA.'); return; }
        setGuardando(true); setError('');
        try {
            const r = panel === 'nota'
                ? await API.post(`/asistente/mensajes/${m.id}/notas/`, { texto: detalle })
                : await API.post(`/asistente/mensajes/${m.id}/valorar/`, { valoracion: panel, comentario: detalle });
            onActualizado(r.data);
            setPanel(null);
            avisar(`Aprendido. ${agente} lo tendrá en cuenta desde la próxima respuesta.`);
        } catch (e) { setError(mensajeError(e)); } finally { setGuardando(false); }
    };

    const alternarChip = (c) => setChips(cs => (cs.includes(c) ? cs.filter(x => x !== c) : [...cs, c]));

    return (
        <div className="rf">
            <div className="rf-barra">
                <div className="rf-botones" role="group" aria-label="Entrenar a la IA con esta respuesta">
                    <button type="button" className={`rf-boton${m.valoracion === 'gusto' ? ' is-gusto' : ''}`} aria-pressed={m.valoracion === 'gusto'}
                        title="Me gustó" aria-label="Me gustó" disabled={guardando} onClick={() => valorar('gusto')}>
                        {m.valoracion === 'gusto' ? <FaThumbsUp /> : <FaRegThumbsUp />}
                    </button>
                    <button type="button" className={`rf-boton${m.valoracion === 'mejora' ? ' is-mejora' : ''}`} aria-pressed={m.valoracion === 'mejora'}
                        title="No me gustó" aria-label="No me gustó" disabled={guardando} onClick={() => valorar('mejora')}>
                        {m.valoracion === 'mejora' ? <FaThumbsDown /> : <FaRegThumbsDown />}
                    </button>
                    <button type="button" className={`rf-boton rf-boton--texto${panel === 'nota' ? ' is-activo' : ''}`} title="Enseñarle algo a la IA"
                        onClick={() => (panel === 'nota' ? setPanel(null) : abrirPanel('nota'))}>
                        <FaRegCommentDots aria-hidden="true" /> Enseñar
                    </button>
                </div>
                {aviso && <span className="rf-aviso" role="status"><FaCheck aria-hidden="true" /> {aviso}</span>}
                <button type="button" className="chat-copiar" onClick={onCopiar}>{copiado ? 'Copiado' : 'Copiar'}</button>
            </div>

            {(m.comentario || m.notas?.length > 0) && !panel && (
                <ul className="rf-registro" aria-label="Lo que la IA aprendió de esta respuesta">
                    {m.comentario && (
                        <li className={`is-${m.valoracion}`}>
                            {m.valoracion === 'gusto' ? <FaThumbsUp aria-hidden="true" /> : <FaThumbsDown aria-hidden="true" />}
                            <span>{m.comentario}</span>
                            <button type="button" onClick={() => abrirPanel(m.valoracion, m.comentario)}>Editar</button>
                        </li>
                    )}
                    {(m.notas || []).map(n => <li key={n.id} className="is-nota"><FaThumbtack aria-hidden="true" /><span>{n.texto}</span></li>)}
                </ul>
            )}

            {panel && (
                <div className={`rf-panel rf-panel--${panel}`}>
                    <p className="rf-panel__titulo">{TITULOS[panel]}</p>
                    {panel !== 'nota' && (
                        <div className="rf-chips">
                            {MOTIVOS[panel].map(c => (
                                <button type="button" key={c} className={chips.includes(c) ? 'is-activo' : ''} aria-pressed={chips.includes(c)} onClick={() => alternarChip(c)}>{c}</button>
                            ))}
                        </div>
                    )}
                    <textarea ref={caja} rows={2} maxLength={1200} value={texto} onChange={e => setTexto(e.target.value)}
                        aria-label={panel === 'nota' ? 'Qué debe recordar la IA' : 'Comentario para la IA'}
                        placeholder={panel === 'nota'
                            ? 'Ej.: Cuando hables de ventas, muéstrame primero el total en millones y después el detalle por sede.'
                            : 'Cuéntale con tus palabras (opcional)'} />
                    {error && <p className="rf-error" role="alert">{error}</p>}
                    <div className="rf-acciones">
                        <small>Solo afecta tus respuestas con {agente}.</small>
                        <button type="button" className="rf-secundario" onClick={() => setPanel(null)}>{panel === 'nota' ? 'Cancelar' : 'Ahora no'}</button>
                        <button type="button" className="rf-primario" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar'}</button>
                    </div>
                </div>
            )}
            {!panel && error && <p className="rf-error" role="alert">{error}</p>}
        </div>
    );
}
