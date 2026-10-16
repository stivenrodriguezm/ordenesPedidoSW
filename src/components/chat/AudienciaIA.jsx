import React, { useState } from 'react';
import { FaCheck, FaChevronDown, FaExclamationTriangle, FaUsers } from 'react-icons/fa';

/*
 * Quién ve un agente (o la IA Lottus general) y cómo debe responder a cada rol.
 * valor: { visible_todos, roles_visibles, instrucciones_roles }. Quienes administran
 * agentes siempre los ven, por eso el rol administrador no se ofrece.
 */
const MAX = 4000;
const EJEMPLOS = {
    vendedor: 'Ej.: Háblale como coach: frases cortas, ejemplos de qué decirle al cliente y una acción para hoy. No muestres costos ni márgenes.',
    auxiliar: 'Ej.: Enfócate en procesos y pasos concretos dentro de la plataforma.',
    transportador: 'Ej.: Respuestas muy breves, pensadas para leer en el celular.',
    marketing: 'Ej.: Prioriza tendencias, productos más pedidos y mensajes para redes.',
};

export default function AudienciaIA({ valor, onCambiar, roles = [], areas = [], areasActivas = [], error, nombre = 'este agente' }) {
    const [abierto, setAbierto] = useState(null);
    const elegibles = roles.filter(r => r.id !== 'administrador');
    const ven = valor.visible_todos ? elegibles : elegibles.filter(r => valor.roles_visibles.includes(r.id));
    const alternar = (id) => onCambiar({ ...valor, roles_visibles: valor.roles_visibles.includes(id) ? valor.roles_visibles.filter(r => r !== id) : [...valor.roles_visibles, id] });
    const escribir = (id, texto) => onCambiar({ ...valor, instrucciones_roles: { ...valor.instrucciones_roles, [id]: texto } });
    const datos = areas.filter(a => areasActivas.includes(a.id)).map(a => a.nombre);

    return (
        <div className="pf-audiencia">
            <div className="pf-audiencia__modo" role="radiogroup" aria-label={`Quién ve ${nombre}`}>
                <button type="button" role="radio" aria-checked={valor.visible_todos} className={valor.visible_todos ? 'is-actual' : ''}
                    onClick={() => onCambiar({ ...valor, visible_todos: true })}>
                    <FaUsers aria-hidden="true" /><span><strong>Todos los que usan IA</strong><small>Cualquier rol con permiso de IA lo ve en la oficina y el chat.</small></span>
                </button>
                <button type="button" role="radio" aria-checked={!valor.visible_todos} className={!valor.visible_todos ? 'is-actual' : ''}
                    onClick={() => onCambiar({ ...valor, visible_todos: false })}>
                    <FaCheck aria-hidden="true" /><span><strong>Solo algunos roles</strong><small>Elige a quién le aparece.</small></span>
                </button>
            </div>
            {!valor.visible_todos && (
                <div className="pf-audiencia__roles" role="group" aria-label="Roles que lo ven">
                    {elegibles.map(r => {
                        const activo = valor.roles_visibles.includes(r.id);
                        return (
                            <label key={r.id} className={`pf-chip${activo ? ' is-activo' : ''}`}>
                                <input type="checkbox" checked={activo} onChange={() => alternar(r.id)} />
                                {activo && <FaCheck aria-hidden="true" />}{r.nombre}
                            </label>
                        );
                    })}
                </div>
            )}
            {error && <em className="pf-error-campo">{error}</em>}
            <p className="pf-audiencia__nota">Los administradores siempre lo ven. Además, cada rol necesita el permiso «Usar asistente IA» (Gestión de usuarios).</p>
            {datos.length > 0 && ven.length > 0 && (
                <p className="pf-audiencia__aviso" role="note"><FaExclamationTriangle aria-hidden="true" />
                    Quienes lo vean podrán consultar con él datos de toda la empresa de: {datos.join(', ')}. Si no quieres eso para un rol, crea otro agente sin esas áreas para ellos.</p>
            )}

            {ven.length > 0 && <>
                <h4 className="pf-audiencia__titulo">Cómo responder a cada rol <small>Opcional · se suma a sus instrucciones</small></h4>
                <ul className="pf-audiencia__lista">
                    {ven.map(r => {
                        const texto = valor.instrucciones_roles[r.id] || '';
                        const abiertoAqui = abierto === r.id;
                        return (
                            <li key={r.id} className={abiertoAqui ? 'is-abierto' : ''}>
                                <button type="button" aria-expanded={abiertoAqui} onClick={() => setAbierto(abiertoAqui ? null : r.id)}>
                                    <strong>{r.nombre}</strong>
                                    <span className={texto.trim() ? 'is-definido' : ''}>{texto.trim() ? 'Con instrucciones propias' : 'Igual que a todos'}</span>
                                    <FaChevronDown aria-hidden="true" />
                                </button>
                                {abiertoAqui && (
                                    <div className="pf-campo">
                                        <textarea rows={4} maxLength={MAX} value={texto} onChange={e => escribir(r.id, e.target.value)} aria-label={`Cómo responder a ${r.nombre}`}
                                            placeholder={EJEMPLOS[r.id] || 'Ej.: tono, nivel de detalle, qué mostrar y qué evitar con este rol.'} />
                                        <span className="pf-contador">{texto.length} / {MAX}</span>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </>}
        </div>
    );
}
