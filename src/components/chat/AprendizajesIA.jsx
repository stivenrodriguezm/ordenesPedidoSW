import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaRegCommentDots, FaThumbsDown, FaThumbsUp, FaThumbtack, FaTimes, FaTrashAlt } from 'react-icons/fa';
import API from '../../services/api';
import AvatarPerfil from './AvatarPerfil';
import './Entrenamiento.css';

/* Panel lateral: lo que la IA aprendió del usuario con un perfil. Se puede pausar, borrar o
   enseñar algo nuevo sin estar en una respuesta. Solo las 30 activas más recientes se usan. */

const TIPOS = {
    gusto: { Icono: FaThumbsUp, titulo: 'Le gustó' },
    mejora: { Icono: FaThumbsDown, titulo: 'Para mejorar' },
    nota: { Icono: FaThumbtack, titulo: 'Recordar' },
};
const USADAS = 30;
const fecha = (iso) => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
const mensajeError = (e) => e.response?.data?.error || e.response?.data?.detail || 'No se pudo completar la acción.';

export default function AprendizajesIA({ perfil, onCerrar }) {
    const [lista, setLista] = useState(null);
    const [nueva, setNueva] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        let vigente = true;
        API.get('/asistente/aprendizajes/', { params: perfil.id ? { perfil: perfil.id } : {} })
            .then(r => vigente && setLista(r.data)).catch(e => vigente && (setLista([]), setError(mensajeError(e))));
        return () => { vigente = false; };
    }, [perfil.id]);
    useEffect(() => {
        const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
        window.addEventListener('keydown', alTeclear);
        return () => window.removeEventListener('keydown', alTeclear);
    }, [onCerrar]);

    const ensenar = async (e) => {
        e.preventDefault();
        if (!nueva.trim()) return;
        setEnviando(true); setError('');
        try {
            const r = await API.post('/asistente/aprendizajes/', { texto: nueva.trim(), perfil: perfil.id });
            setLista(l => [r.data, ...(l || [])]); setNueva('');
        } catch (err) { setError(mensajeError(err)); } finally { setEnviando(false); }
    };
    const alternar = async (a) => {
        setLista(l => l.map(x => (x.id === a.id ? { ...x, activo: !a.activo } : x)));
        try { await API.patch(`/asistente/aprendizajes/${a.id}/`, { activo: !a.activo }); } catch (err) {
            setLista(l => l.map(x => (x.id === a.id ? a : x))); setError(mensajeError(err));
        }
    };
    const borrar = async (a) => {
        if (!window.confirm('¿Olvidar esto? La IA dejará de tenerlo en cuenta.')) return;
        try { await API.delete(`/asistente/aprendizajes/${a.id}/`); setLista(l => l.filter(x => x.id !== a.id)); } catch (err) { setError(mensajeError(err)); }
    };

    const activas = (lista || []).filter(a => a.activo).length;
    // En portal: la cabecera fija de la app no debe tapar el panel.
    return createPortal(
        <>
            <div className="ap-velo" onClick={onCerrar} aria-hidden="true" />
            <aside className="ap" role="dialog" aria-modal="true" aria-label="Lo que la IA aprendió de ti">
                <header className="ap-cab">
                    <AvatarPerfil perfil={perfil} tamano={38} />
                    <div>
                        <h2>Lo que aprendió de ti</h2>
                        <small>{perfil.nombre}</small>
                    </div>
                    <button type="button" className="ap-cerrar" aria-label="Cerrar" onClick={onCerrar}><FaTimes /></button>
                </header>

                <form className="ap-nueva" onSubmit={ensenar}>
                    <label htmlFor="ap-nueva">Enséñale algo nuevo</label>
                    <textarea id="ap-nueva" rows={2} maxLength={1200} value={nueva} onChange={e => setNueva(e.target.value)}
                        placeholder="Ej.: Dame las cifras en millones y termina siempre con 3 acciones." />
                    <button type="submit" disabled={!nueva.trim() || enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
                </form>
                {error && <p className="rf-error ap-error" role="alert">{error}</p>}

                {lista === null ? <div className="ap-cargando" aria-label="Cargando"><span /><span /><span /></div>
                    : !lista.length ? (
                        <div className="ap-vacio">
                            <p><strong>Aún no le has enseñado nada.</strong></p>
                            <p>Debajo de cada respuesta usa <FaThumbsUp aria-label="me gustó" /> si te gustó, <FaThumbsDown aria-label="no me gustó" /> si no, o <FaRegCommentDots aria-label="enseñar" /> <b>Enseñar</b> para que recuerde algo. Cada vez responderá más a tu gusto.</p>
                        </div>
                    ) : (
                        <>
                            <p className="ap-resumen">{activas} activas{activas > USADAS ? ` · usa las ${USADAS} más recientes` : ''}. Pausa lo que ya no aplique.</p>
                            <ul className="ap-lista">
                                {lista.map(a => {
                                    const { Icono, titulo } = TIPOS[a.tipo] || TIPOS.nota;
                                    return (
                                        <li key={a.id} className={`ap-item is-${a.tipo}${a.activo ? '' : ' is-pausado'}`}>
                                            <span className="ap-item__icono" title={titulo}><Icono aria-hidden="true" /></span>
                                            <div className="ap-item__cuerpo">
                                                <p>{a.texto || (a.tipo === 'gusto' ? 'Le gustó la respuesta (sin comentario).' : 'No le gustó la respuesta (sin comentario).')}</p>
                                                <small>{a.origen === 'equipo' ? 'Aprendido en equipo, al terminar una tarea' : titulo}{a.pregunta ? ` · sobre «${a.pregunta}»` : ''} · {fecha(a.creado)}</small>
                                            </div>
                                            <div className="ap-item__acciones">
                                                <label className="ap-switch" title={a.activo ? 'Pausar' : 'Activar'}>
                                                    <input type="checkbox" checked={a.activo} onChange={() => alternar(a)} aria-label={a.activo ? 'Pausar aprendizaje' : 'Activar aprendizaje'} />
                                                    <span />
                                                </label>
                                                <button type="button" aria-label="Olvidar" title="Olvidar" onClick={() => borrar(a)}><FaTrashAlt /></button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
            </aside>
        </>,
        document.body,
    );
}
