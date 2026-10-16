import React, { useMemo, useRef, useState } from 'react';
import { FaArrowLeft, FaCheck, FaCloudUploadAlt, FaComments, FaEye, FaFileAlt, FaFilePdf, FaPlus, FaTimes, FaTrashAlt } from 'react-icons/fa';
import API from '../../services/api';
import AvatarPerfil from './AvatarPerfil';
import AudienciaIA from './AudienciaIA';
import { COLORES, GENERAL, ICONOS, PLANTILLAS, miles, resumenAudiencia, tamanoLegible } from './catalogoIA';
import './PerfilesIA.css';

/*
 * Perfiles de IA: agentes especializados del Chat. Cada uno tiene identidad (nombre, rol,
 * ícono y color), instrucciones largas (quién es y cómo actúa), las áreas de datos que puede
 * consultar y documentos .md/.txt/.pdf de los que aprende. Solo GESTIONAR_PERFILES_IA.
 */

const AUDIENCIA = { visible_todos: true, roles_visibles: [], instrucciones_roles: {} };
const VACIO = { nombre: '', rol: '', instrucciones: '', icono: 'robot', color: 'azul', areas: [], activo: true, zona: null, ...AUDIENCIA };
const MIN_INSTRUCCIONES = 40;
const MAX_INSTRUCCIONES = 12000;
const ACEPTA = '.md,.markdown,.txt,.pdf';

const audiencia = (v = {}) => ({ visible_todos: v.visible_todos ?? true, roles_visibles: [...(v.roles_visibles || [])], instrucciones_roles: { ...(v.instrucciones_roles || {}) } });
const delPerfil = (p) => ({ nombre: p.nombre, rol: p.rol, instrucciones: p.instrucciones, icono: p.icono, color: p.color, areas: [...p.areas], activo: p.activo, zona: p.zona ?? null, ...audiencia(p) });
const mensajeError = (e) => e.response?.data?.error || e.response?.data?.detail || 'No se pudo completar la acción.';
const primerError = (v) => (Array.isArray(v) ? v[0] : v);

function validar(f) {
    const faltas = {};
    if (!f.nombre.trim()) faltas.nombre = 'Ponle un nombre.';
    if (!f.rol.trim()) faltas.rol = 'Describe su rol en una frase.';
    if (f.instrucciones.trim().length < MIN_INSTRUCCIONES) faltas.instrucciones = `Describe con más detalle quién es y cómo actúa (mínimo ${MIN_INSTRUCCIONES} caracteres).`;
    if (!f.visible_todos && !f.roles_visibles.length) faltas.roles_visibles = 'Elige al menos un rol o déjalo visible para todos.';
    return faltas;
}

function Seccion({ numero, titulo, ayuda, children, extra }) {
    return (
        <section className="pf-seccion" aria-labelledby={`pf-s${numero}`}>
            <header>
                <span className="pf-seccion__num" aria-hidden="true">{numero}</span>
                <div>
                    <h3 id={`pf-s${numero}`}>{titulo}</h3>
                    {ayuda && <p>{ayuda}</p>}
                </div>
                {extra}
            </header>
            {children}
        </section>
    );
}

function Documento({ d, perfilId, onBorrar, pendiente }) {
    const [texto, setTexto] = useState(null);
    const [abierto, setAbierto] = useState(false);
    const ver = async () => {
        if (abierto) { setAbierto(false); return; }
        setAbierto(true);
        if (texto === null) {
            try { setTexto((await API.get(`/asistente/perfiles/${perfilId}/documentos/${d.id}/`)).data.texto); } catch (e) { setTexto(mensajeError(e)); }
        }
    };
    const Icono = d.tipo === 'pdf' ? FaFilePdf : FaFileAlt;
    return (
        <li className={`pf-doc${pendiente ? ' is-pendiente' : ''}`}>
            <span className={`pf-doc__icono is-${d.tipo}`} aria-hidden="true"><Icono /></span>
            <div className="pf-doc__datos">
                <strong title={d.nombre}>{d.nombre}</strong>
                <small>
                    {pendiente ? `${tamanoLegible(d.tamano)} · se subirá al guardar` : `${tamanoLegible(d.tamano)} · ${miles(d.caracteres)} caracteres`}
                    {d.recortado && <b className="pf-doc__aviso"> · recortado: la IA lee solo el inicio</b>}
                </small>
            </div>
            {!pendiente && <button type="button" className="pf-icono-btn" onClick={ver} aria-expanded={abierto} aria-label={`Ver lo que lee la IA de ${d.nombre}`} title="Ver lo que lee la IA"><FaEye /></button>}
            <button type="button" className="pf-icono-btn is-peligro" onClick={() => onBorrar(d)} aria-label={`Quitar ${d.nombre}`} title="Quitar"><FaTrashAlt /></button>
            {abierto && <pre className="pf-doc__texto">{texto === null ? 'Cargando…' : texto}</pre>}
        </li>
    );
}

export default function PerfilesIA({ estado, perfiles, inicial, onRecargar, onVolver, onProbar, zonaInicial = null, volverTexto = 'Volver al chat' }) {
    const [seleccion, setSeleccion] = useState(inicial ?? (perfiles[0]?.id || 'nuevo'));
    const actual = perfiles.find(p => p.id === seleccion) || null;
    // Tras crear, el id ya está elegido aunque la lista aún se esté recargando: guardar de nuevo edita, no duplica.
    const idActual = actual?.id ?? (typeof seleccion === 'number' ? seleccion : null);
    const [form, setForm] = useState(actual ? delPerfil(actual) : { ...VACIO, zona: zonaInicial });
    const [original, setOriginal] = useState(form);
    const [errores, setErrores] = useState({});
    const [pendientes, setPendientes] = useState([]);
    const [subiendo, setSubiendo] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [aviso, setAviso] = useState('');
    const [errorGeneral, setErrorGeneral] = useState('');
    const [arrastrando, setArrastrando] = useState(false);
    const archivo = useRef(null);
    const temporizador = useRef(null);
    // IA Lottus general: solo quién la ve y cómo responde a cada rol.
    const [general, setGeneral] = useState(() => audiencia(estado?.general));
    const [generalOriginal, setGeneralOriginal] = useState(general);
    const esGeneral = seleccion === 'general';
    const roles = estado?.roles || [];

    const areas = estado?.areas || [];
    const capacidad = estado?.limites?.conocimiento_caracteres || 200000;
    const maxBytes = estado?.limites?.archivo_bytes || 10 * 1024 * 1024;
    const cambiado = esGeneral ? JSON.stringify(general) !== JSON.stringify(generalOriginal) : JSON.stringify(form) !== JSON.stringify(original) || pendientes.length > 0;
    const usado = actual?.conocimiento_caracteres || 0;
    const pctUsado = Math.min(100, Math.round((usado * 100) / capacidad));
    const vistaPrevia = useMemo(() => ({ ...form, nombre: form.nombre || 'Nuevo perfil', rol: form.rol || 'Describe su rol' }), [form]);

    const avisar = (t) => { setAviso(t); clearTimeout(temporizador.current); temporizador.current = setTimeout(() => setAviso(''), 3500); };
    const cambiar = (campo, valor) => { setForm(f => ({ ...f, [campo]: valor })); setErrores(e => ({ ...e, [campo]: undefined })); };
    const descartar = () => !cambiado || window.confirm('Tienes cambios sin guardar. ¿Descartarlos?');

    const elegirGeneral = () => {
        if (esGeneral || !descartar()) return;
        setSeleccion('general'); setGeneral(generalOriginal); setErrores({}); setPendientes([]); setErrorGeneral('');
    };
    const guardarGeneral = async (e) => {
        e?.preventDefault();
        if (!general.visible_todos && !general.roles_visibles.length) { setErrores({ roles_visibles: 'Elige al menos un rol o déjala visible para todos.' }); setErrorGeneral('Revisa los campos marcados.'); return; }
        setGuardando(true); setErrorGeneral('');
        try {
            const r = await API.put('/asistente/general/', general);
            const guardado = audiencia(r.data);
            setGeneral(guardado); setGeneralOriginal(guardado); setErrores({});
            await onRecargar();
            avisar('Cambios guardados.');
        } catch (err) {
            const d = err.response?.data;
            setErrorGeneral(primerError(d?.roles_visibles) || primerError(d?.non_field_errors) || mensajeError(err));
        } finally { setGuardando(false); }
    };
    const elegir = (p) => {
        if ((p ? p.id : 'nuevo') === seleccion || !descartar()) return;
        const datos = p ? delPerfil(p) : { ...VACIO, zona: zonaInicial };
        setSeleccion(p ? p.id : 'nuevo'); setForm(datos); setOriginal(datos);
        setErrores({}); setPendientes([]); setErrorGeneral('');
    };
    const usarPlantilla = (t) => {
        if (form.instrucciones.trim() && form.instrucciones !== t.instrucciones && !window.confirm(`¿Reemplazar lo escrito con la plantilla «${t.nombre}»?`)) return;
        setForm(f => ({ ...f, nombre: f.nombre || t.nombre, rol: t.rol, icono: t.icono, color: t.color, areas: [...t.areas], instrucciones: t.instrucciones }));
        setErrores({});
    };
    const alternarArea = (id) => cambiar('areas', form.areas.includes(id) ? form.areas.filter(a => a !== id) : [...form.areas, id]);

    const subir = async (perfilId, lista) => {
        const fallidos = [];
        for (const f of lista) {
            setSubiendo(s => [...s, f.name]);
            try {
                const datos = new FormData();
                datos.append('archivo', f);
                await API.post(`/asistente/perfiles/${perfilId}/documentos/`, datos, { timeout: 120000 });
            } catch (e) { fallidos.push(`${f.name}: ${mensajeError(e)}`); } finally { setSubiendo(s => s.filter(n => n !== f.name)); }
        }
        return fallidos;
    };
    const elegirArchivos = async (lista) => {
        const validos = [], rechazados = [];
        [...lista].forEach(f => {
            if (!/\.(md|markdown|txt|pdf)$/i.test(f.name)) rechazados.push(`${f.name}: solo .md, .txt o .pdf`);
            else if (f.size > maxBytes) rechazados.push(`${f.name}: supera ${tamanoLegible(maxBytes)}`);
            else validos.push(f);
        });
        setErrorGeneral(rechazados.join(' · '));
        if (!validos.length) return;
        if (!actual) { setPendientes(p => [...p, ...validos]); return; }
        const fallidos = await subir(actual.id, validos);
        await onRecargar();
        setErrorGeneral([...rechazados, ...fallidos].join(' · '));
        if (fallidos.length < validos.length) avisar('Documento agregado. La IA ya lo usa en las nuevas preguntas.');
    };
    const quitarDocumento = async (d) => {
        if (d.pendiente) { setPendientes(p => p.filter(f => f !== d.archivo)); return; }
        if (!window.confirm(`¿Quitar «${d.nombre}»? La IA dejará de usarlo.`)) return;
        try { await API.delete(`/asistente/perfiles/${actual.id}/documentos/${d.id}/`); await onRecargar(); } catch (e) { setErrorGeneral(mensajeError(e)); }
    };

    const guardar = async (e) => {
        e?.preventDefault();
        const faltas = validar(form);
        setErrores(faltas);
        if (Object.keys(faltas).length) { setErrorGeneral('Revisa los campos marcados.'); return; }
        setGuardando(true); setErrorGeneral('');
        try {
            const datos = { ...form, nombre: form.nombre.trim(), rol: form.rol.trim(), instrucciones: form.instrucciones.trim() };
            const r = idActual ? await API.put(`/asistente/perfiles/${idActual}/`, datos) : await API.post('/asistente/perfiles/', datos);
            const fallidos = pendientes.length ? await subir(r.data.id, pendientes) : [];
            setPendientes([]);
            const guardado = delPerfil(r.data);
            setForm(guardado); setOriginal(guardado); setSeleccion(r.data.id);
            await onRecargar();
            if (fallidos.length) setErrorGeneral(`Perfil guardado, pero algunos documentos no se subieron: ${fallidos.join(' · ')}`);
            avisar(idActual ? 'Cambios guardados.' : 'Perfil creado. Ya puedes usarlo en el chat.');
        } catch (err) {
            const d = err.response?.data;
            if (d && typeof d === 'object' && !d.error && !d.detail) {
                setErrores(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, primerError(v)])));
                setErrorGeneral('Revisa los campos marcados.');
            } else setErrorGeneral(mensajeError(err));
        } finally { setGuardando(false); }
    };
    const eliminar = async () => {
        if (!actual || !window.confirm(`¿Eliminar el perfil «${actual.nombre}»?\n\nSus conversaciones se conservan y pasan a la IA Lottus general. Se borran sus documentos y lo que aprendió.`)) return;
        try {
            await API.delete(`/asistente/perfiles/${actual.id}/`);
            const resto = perfiles.filter(p => p.id !== actual.id);
            await onRecargar();
            const siguiente = resto[0];
            setSeleccion(siguiente ? siguiente.id : 'nuevo');
            const datos = siguiente ? delPerfil(siguiente) : VACIO;
            setForm(datos); setOriginal(datos); setPendientes([]); setErrores({});
            avisar('Perfil eliminado.');
        } catch (err) { setErrorGeneral(mensajeError(err)); }
    };

    const documentos = [
        ...(actual?.documentos || []),
        ...pendientes.map((f, i) => ({ id: `p${i}`, nombre: f.name, tipo: /\.pdf$/i.test(f.name) ? 'pdf' : 'md', tamano: f.size, pendiente: true, archivo: f })),
    ];

    return (
        <section className="pf" aria-label="Perfiles de IA">
            <header className="pf-cab">
                <button type="button" className="pf-volver" onClick={() => descartar() && onVolver()}><FaArrowLeft aria-hidden="true" /> {volverTexto}</button>
                <div className="pf-cab__texto">
                    <h1>Perfiles de IA</h1>
                    <small>Crea agentes especializados: quién es, qué datos consulta y qué documentos estudia.</small>
                </div>
            </header>

            <div className="pf-cuerpo">
                <nav className="pf-lista" aria-label="Perfiles">
                    <button type="button" className={`pf-lista__nuevo${seleccion === 'nuevo' ? ' is-actual' : ''}`} onClick={() => elegir(null)}>
                        <FaPlus aria-hidden="true" /> Nuevo perfil
                    </button>
                    {estado?.general && 'visible_todos' in estado.general && (
                        <button type="button" className={`pf-tarjeta pf-tarjeta--general${esGeneral ? ' is-actual' : ''}`} onClick={elegirGeneral} aria-current={esGeneral ? 'true' : undefined}>
                            <AvatarPerfil perfil={GENERAL} tamano={36} />
                            <span className="pf-tarjeta__texto">
                                <strong>IA Lottus (general)</strong>
                                <small>Todos los datos de la plataforma</small>
                                <span className="pf-tarjeta__meta">Lo ven: {resumenAudiencia(generalOriginal, roles)}</span>
                            </span>
                        </button>
                    )}
                    {perfiles.map(p => (
                        <button type="button" key={p.id} className={`pf-tarjeta${p.id === seleccion ? ' is-actual' : ''}${p.activo ? '' : ' is-inactivo'}`}
                            onClick={() => elegir(p)} aria-current={p.id === seleccion ? 'true' : undefined}>
                            <AvatarPerfil perfil={p} tamano={36} />
                            <span className="pf-tarjeta__texto">
                                <strong>{p.nombre}</strong>
                                <small>{p.rol}</small>
                                <span className="pf-tarjeta__meta">
                                    {p.areas.length ? `${p.areas.length} ${p.areas.length === 1 ? 'área' : 'áreas'}` : 'Sin datos'} · {p.documentos.length} doc.{'visible_todos' in p && !p.visible_todos && <> · {resumenAudiencia(audiencia(p), roles)}</>}
                                    {!p.activo && <b className="pf-etiqueta">Pausado</b>}
                                </span>
                            </span>
                        </button>
                    ))}
                    {!perfiles.length && <p className="pf-lista__vacia">Todavía no hay perfiles. Crea el primero con una plantilla.</p>}
                </nav>

                {esGeneral ? (
                <form className="pf-editor" onSubmit={guardarGeneral} noValidate>
                    <div className="pf-heroe" style={{ '--pf-color': '#24241f' }}>
                        <AvatarPerfil perfil={GENERAL} tamano={56} />
                        <div><h2>IA Lottus (general)</h2><p>Asistente con acceso a todas las áreas de datos. Aquí decides a quién le aparece y cómo responde a cada rol.</p></div>
                    </div>
                    <Seccion numero={1} titulo="Quién la ve y cómo les responde"
                        ayuda="Por ejemplo, puedes ocultarla a los vendedores y darles solo un agente con los datos que les correspondan.">
                        <AudienciaIA valor={general} onCambiar={v => { setGeneral(v); setErrores({}); }} roles={roles} areas={areas}
                            areasActivas={areas.map(a => a.id)} error={errores.roles_visibles} nombre="la IA Lottus general" />
                    </Seccion>
                    <footer className="pf-pie">
                        <span className="pf-pie__estado" role="status">{aviso ? <><FaCheck aria-hidden="true" /> {aviso}</> : cambiado ? 'Cambios sin guardar' : ''}</span>
                        {errorGeneral && <p className="pf-pie__error" role="alert"><FaTimes aria-hidden="true" /> {errorGeneral}</p>}
                        <button type="submit" className="pf-btn pf-btn--primario" disabled={guardando || !cambiado}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
                    </footer>
                </form>
                ) : (
                <form className="pf-editor" onSubmit={guardar} noValidate>
                    <div className="pf-heroe" style={{ '--pf-color': COLORES[form.color]?.valor }}>
                        <AvatarPerfil perfil={vistaPrevia} tamano={56} />
                        <div>
                            <h2>{vistaPrevia.nombre}</h2>
                            <p>{vistaPrevia.rol}</p>
                        </div>
                        {actual && <span className={`pf-estado${form.activo ? ' is-activo' : ''}`}>{form.activo ? 'Disponible en el chat' : 'Pausado'}</span>}
                    </div>

                    {!actual && (
                        <div className="pf-plantillas">
                            <p>Empieza rápido con una plantilla y ajústala a tu gusto:</p>
                            <div>
                                {PLANTILLAS.map(t => (
                                    <button type="button" key={t.clave} onClick={() => usarPlantilla(t)}>
                                        <AvatarPerfil perfil={t} tamano={26} /> {t.nombre}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <Seccion numero={1} titulo="Identidad" ayuda="Cómo se llama y cómo lo reconoces en el chat.">
                        <div className="pf-fila">
                            <label className={`pf-campo${errores.nombre ? ' is-error' : ''}`}>
                                <span>Nombre</span>
                                <input value={form.nombre} maxLength={80} onChange={e => cambiar('nombre', e.target.value)} placeholder="Ej.: Analista de ventas" />
                                {actual?.ejecutor&&<small>Es el agente ejecutor de la oficina: IA Lottus le encarga los cambios. Puedes cambiar su nombre, rol, instrucciones y permisos.</small>}
                                {errores.nombre && <em>{primerError(errores.nombre)}</em>}
                            </label>
                            <label className={`pf-campo${errores.rol ? ' is-error' : ''}`}>
                                <span>Rol en una frase</span>
                                <input value={form.rol} maxLength={160} onChange={e => cambiar('rol', e.target.value)} placeholder="Ej.: Analiza el desempeño comercial y propone cómo vender más" />
                                {errores.rol && <em>{primerError(errores.rol)}</em>}
                            </label>
                        </div>
                        {!!estado?.zonas?.length && <label className="pf-campo">
                            <span>Zona en la oficina</span>
                            <select value={form.zona || ''} onChange={e => cambiar('zona', e.target.value ? Number(e.target.value) : null)}>
                                <option value="">Sin zona asignada</option>
                                {estado.zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                            </select>
                            {errores.zona && <em>{primerError(errores.zona)}</em>}
                        </label>}
                        <div className="pf-fila pf-fila--apariencia">
                            <div className="pf-campo">
                                <span id="pf-iconos">Ícono</span>
                                <div className="pf-iconos" role="radiogroup" aria-labelledby="pf-iconos">
                                    {Object.entries(ICONOS).map(([clave, { Icono, nombre }]) => (
                                        <button type="button" key={clave} role="radio" aria-checked={form.icono === clave} aria-label={nombre} title={nombre}
                                            className={form.icono === clave ? 'is-actual' : ''} onClick={() => cambiar('icono', clave)}><Icono /></button>
                                    ))}
                                </div>
                            </div>
                            <div className="pf-campo">
                                <span id="pf-colores">Color</span>
                                <div className="pf-colores" role="radiogroup" aria-labelledby="pf-colores">
                                    {Object.entries(COLORES).map(([clave, { valor, nombre }]) => (
                                        <button type="button" key={clave} role="radio" aria-checked={form.color === clave} aria-label={nombre} title={nombre}
                                            style={{ '--pf-color': valor }} className={form.color === clave ? 'is-actual' : ''} onClick={() => cambiar('color', clave)}>
                                            {form.color === clave && <FaCheck aria-hidden="true" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Seccion>

                    <Seccion numero={2} titulo="Quién es y cómo actúa"
                        ayuda="Escríbelo como si le explicaras el cargo a un empleado nuevo: su objetivo, qué prioriza, su tono, cómo presenta las respuestas y qué debe evitar.">
                        <label className={`pf-campo${errores.instrucciones ? ' is-error' : ''}`}>
                            <span className="sr-only">Instrucciones del perfil</span>
                            <textarea rows={11} value={form.instrucciones} maxLength={MAX_INSTRUCCIONES} onChange={e => cambiar('instrucciones', e.target.value)}
                                placeholder={'Eres el analista de ventas de Lottus. Tu objetivo es…\n\nCómo actúas:\n- …\n- …\n\nFormato: primero la conclusión, luego los datos y al final 3 acciones.'} />
                            <span className="pf-contador">{miles(form.instrucciones.length)} / {miles(MAX_INSTRUCCIONES)}</span>
                            {errores.instrucciones && <em>{primerError(errores.instrucciones)}</em>}
                        </label>
                    </Seccion>

                    <Seccion numero={3} titulo="Datos que puede consultar"
                        ayuda="Solo verá las áreas que actives. Sin ninguna, responde con su criterio y sus documentos, sin cifras de la empresa."
                        extra={<div className="pf-seccion__extra">
                            <button type="button" onClick={() => cambiar('areas', areas.map(a => a.id))}>Todas</button>
                            <button type="button" onClick={() => cambiar('areas', [])}>Ninguna</button>
                        </div>}>
                        <div className="pf-areas">
                            {areas.map(a => {
                                const activa = form.areas.includes(a.id);
                                return (
                                    <label key={a.id} className={`pf-area${activa ? ' is-activa' : ''}`}>
                                        <input type="checkbox" checked={activa} onChange={() => alternarArea(a.id)} />
                                        <span className="pf-area__check" aria-hidden="true"><FaCheck /></span>
                                        <span><strong>{a.nombre}</strong><small>{a.descripcion}</small></span>
                                    </label>
                                );
                            })}
                        </div>
                        {form.areas.includes('pagina_web')&&<p className="pf-pagina-web-ayuda">Puede estudiar los textos, el catálogo publicado, las imágenes, los estilos y el código del sitio y su gestión. Pídele un análisis o propuestas de mejora desde su chat.</p>}
                        {errores.areas && <em className="pf-error-campo">{primerError(errores.areas)}</em>}
                    </Seccion>

                    <Seccion numero={4} titulo="Documentos de conocimiento"
                        ayuda="Políticas, manuales, guiones o fichas técnicas en .md, .txt o .pdf. La IA los lee en cada pregunta y los cita cuando se basa en ellos.">
                        <div className={`pf-subir${arrastrando ? ' is-arrastrando' : ''}`}
                            onDragOver={e => { e.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)}
                            onDrop={e => { e.preventDefault(); setArrastrando(false); elegirArchivos(e.dataTransfer.files); }}>
                            <FaCloudUploadAlt aria-hidden="true" />
                            <p><strong>Arrastra archivos aquí</strong> o <button type="button" onClick={() => archivo.current?.click()}>búscalos en tu equipo</button></p>
                            <small>.md, .txt o .pdf con texto · hasta {tamanoLegible(maxBytes)} cada uno</small>
                            <input ref={archivo} type="file" accept={ACEPTA} multiple hidden aria-label="Subir documentos"
                                onChange={e => { elegirArchivos(e.target.files); e.target.value = ''; }} />
                        </div>
                        {subiendo.length > 0 && <p className="pf-subiendo" role="status"><span className="pf-girando" aria-hidden="true" /> Leyendo {subiendo.join(', ')}…</p>}
                        {documentos.length > 0 && (
                            <ul className="pf-docs">
                                {documentos.map(d => <Documento key={d.id} d={d} perfilId={actual?.id} pendiente={d.pendiente} onBorrar={quitarDocumento} />)}
                            </ul>
                        )}
                        {actual && (
                            <div className="pf-capacidad">
                                <div className="pf-capacidad__barra" role="progressbar" aria-valuenow={pctUsado} aria-valuemin={0} aria-valuemax={100} aria-label="Capacidad de conocimiento usada">
                                    <span style={{ width: `${pctUsado}%` }} className={pctUsado > 85 ? 'is-alto' : ''} />
                                </div>
                                <small>{pctUsado} % de la capacidad · {miles(usado)} de {miles(capacidad)} caracteres. Más texto = respuestas más lentas y costosas.</small>
                            </div>
                        )}
                    </Seccion>

                    <Seccion numero={5} titulo="Quién lo ve y cómo les responde"
                        ayuda="Elige a qué roles les aparece en la oficina y el chat, y si quieres, cómo debe responderle a cada uno. Todos pueden calificar 👍/👎 y enseñarle en cada mensaje.">
                        <AudienciaIA valor={{ visible_todos: form.visible_todos, roles_visibles: form.roles_visibles, instrucciones_roles: form.instrucciones_roles }}
                            onCambiar={v => { setForm(f => ({ ...f, ...v })); setErrores(e => ({ ...e, roles_visibles: undefined, instrucciones_roles: undefined })); }}
                            roles={roles} areas={areas} areasActivas={form.areas} error={primerError(errores.roles_visibles) || primerError(errores.instrucciones_roles)} nombre={form.nombre || 'este agente'} />
                    </Seccion>

                    <Seccion numero={6} titulo="Disponibilidad">
                        <label className="pf-interruptor">
                            <input type="checkbox" checked={form.activo} onChange={e => cambiar('activo', e.target.checked)} />
                            <span className="pf-interruptor__pista" aria-hidden="true" />
                            <span><strong>{form.activo ? 'Disponible en el chat' : 'Pausado'}</strong>
                                <small>{form.activo ? 'Aparece para elegirlo al iniciar una conversación.' : 'No se puede elegir en conversaciones nuevas; las existentes siguen funcionando.'}</small></span>
                        </label>
                    </Seccion>

                    <footer className="pf-pie">
                        {actual && !actual.ejecutor && <button type="button" className="pf-btn pf-btn--peligro" onClick={eliminar} aria-label="Eliminar perfil" title="Eliminar perfil"><FaTrashAlt aria-hidden="true" /> <span className="pf-btn__texto">Eliminar</span></button>}
                        <span className="pf-pie__estado" role="status">
                            {aviso ? <><FaCheck aria-hidden="true" /> {aviso}</> : cambiado ? 'Cambios sin guardar' : ''}
                        </span>
                        {errorGeneral && <p className="pf-pie__error" role="alert"><FaTimes aria-hidden="true" /> {errorGeneral}</p>}
                        {actual && form.activo && !cambiado && <button type="button" className="pf-btn" onClick={() => onProbar(actual)}><FaComments aria-hidden="true" /> Conversar</button>}
                        <button type="submit" className="pf-btn pf-btn--primario" disabled={guardando || (!cambiado && !!idActual)}>
                            {guardando ? 'Guardando…' : idActual ? 'Guardar cambios' : 'Crear perfil'}
                        </button>
                    </footer>
                </form>
                )}
            </div>
        </section>
    );
}
