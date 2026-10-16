import React, { lazy, Suspense, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FaComments, FaTimes, FaWindowMaximize } from 'react-icons/fa';
import { AppContext, usePermissions } from '../../AppContext';
import API from '../../services/api';
import { GENERAL } from './catalogoIA';
import { ChatLateralContext } from './ChatLateralContext';
import './ChatLateral.css';

const PanelChatOficina = lazy(() => import('../oficina/PanelChatOficina'));

export default function ChatLateralProvider({ children }) {
    const { usuario } = useContext(AppContext);
    const puede = usePermissions();
    const cache = useQueryClient();
    const navegar = useNavigate();
    const ubicacion = useLocation();
    const [chat, setChat] = useState(null);
    const [minimizado, setMinimizado] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState('');
    const borradores = useRef({}), contextos = useRef({});
    const usaIA = puede('USAR_ASISTENTE_IA');
    const acceso = usuario?.acceso_rapido_ia === true && usaIA;
    const sesion = useRef(0);

    const abrir = async () => {
        if (chat && minimizado) {
            setMinimizado(false);
            return;
        }
        const version = ++sesion.current;
        setCargando(true); setError('');
        try {
            const [estado, perfiles, zonas, conversaciones] = await Promise.all(
                [['estado', '/asistente/estado/'], ['perfiles', '/asistente/perfiles/'],
                    ['zonas', '/asistente/zonas/'], ['conversaciones', '/asistente/conversaciones/']]
                    .map(([clave, url]) => cache.fetchQuery({ queryKey: ['oficina-ia', clave], queryFn: () => API.get(url).then(r => r.data), staleTime: 0 }))
            );
            if (version !== sesion.current) return;
            const agentes = [...(estado.general?.visible !== false ? [GENERAL] : []), ...perfiles.filter(p => p.activo)];
            if (!agentes.length) { setError('No tienes agentes de IA habilitados.'); return; }
            const agente = agentes[0], clave = String(agente.id ?? 'general');
            // Si se minimizó se conserva el contexto guardado; si se cerró con X se abre en la página inicial (conversacion: null)
            const conversacion = Object.hasOwn(contextos.current, clave) ? contextos.current[clave] : null;
            setChat({ agente, agentes, zonas, conversaciones, conversacion });
            setMinimizado(false);
        } catch { if (version === sesion.current) setError('No se pudo abrir el chat. Intenta de nuevo.'); }
        finally { if (version === sesion.current) setCargando(false); }
    };

    const cerrar = useCallback(() => {
        // Al cerrar (X) se reinicia a la página inicial
        setChat(null);
        setMinimizado(false);
        contextos.current = {};
        borradores.current = {};
    }, []);

    const minimizar = useCallback(() => {
        setMinimizado(true);
    }, []);

    const restaurar = useCallback(() => {
        setMinimizado(false);
    }, []);

    const cambiarChat = useCallback(nuevo => {
        if (!nuevo) {
            cerrar();
            return;
        }
        setChat(nuevo);
        setMinimizado(false);
    }, [cerrar]);

    const cambiar = agente => {
        if (!agente) return;
        const clave = String(agente.id ?? 'general');
        setChat(c => ({ ...c, agente, conversacion: Object.hasOwn(contextos.current, clave) ? contextos.current[clave] : null }));
        setMinimizado(false);
    };

    const ampliar = (agente, datos) => {
        cerrar();
        navegar(`${agente.id ? `/IA/agentes/${agente.id}` : '/IA/general'}${datos.conversacion ? `?conversacion=${datos.conversacion}` : ''}`, { state: { borrador: datos.borrador } });
    };

    const valor = useMemo(() => ({
        chat,
        setChat: cambiarChat,
        minimizado,
        setMinimizado,
        minimizar,
        restaurar,
        cerrar,
        borradores,
        contextos
    }), [chat, cambiarChat, minimizado, minimizar, restaurar, cerrar]);

    return <ChatLateralContext.Provider value={valor}>
        {children}
        {acceso && !chat && <div className="ia-acceso">
            {error && <p role="alert">{error}</p>}
            <button type="button" onClick={abrir} disabled={cargando} aria-label="Abrir chat de IA" title="Abrir chat de IA" aria-busy={cargando}>
                <FaComments aria-hidden="true" /><span>{cargando ? '…' : 'IA'}</span>
            </button>
        </div>}
        {usaIA && chat && (
            <div className={`ia-chat-wrapper${minimizado ? ' is-minimizado' : ''}`}>
                <Suspense fallback={<div className="ia-acceso" role="status">Abriendo chat…</div>}>
                    <PanelChatOficina
                        chat={chat}
                        agentes={chat.agentes}
                        zonas={chat.zonas}
                        borradores={borradores}
                        contextos={contextos}
                        enOficina={/^\/ia\/?$/i.test(ubicacion.pathname)}
                        onCambiar={cambiar}
                        onCerrar={cerrar}
                        onMinimizar={minimizar}
                        onAmpliar={ampliar}
                    />
                </Suspense>
            </div>
        )}
        {usaIA && chat && minimizado && (
            <aside className="ia-chat-minimizado" role="region" aria-label="Chat de IA minimizado" onClick={restaurar}>
                <div className="ia-chat-minimizado__info">
                    <span className="ia-chat-minimizado__punto" aria-hidden="true" />
                    <FaComments className="ia-chat-minimizado__icono" aria-hidden="true" />
                    <div className="ia-chat-minimizado__texto">
                        <strong>{chat.agente?.nombre || 'IA Lottus'}</strong>
                        <small>{chat.conversacion ? 'Conversación activa · Clic para restaurar' : 'Página inicial · Clic para restaurar'}</small>
                    </div>
                </div>
                <div className="ia-chat-minimizado__acciones" onClick={e => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={restaurar}
                        className="ia-chat-minimizado__btn"
                        aria-label="Restaurar chat (guarda la página actual)"
                        title="Restaurar chat (conserva la página actual)"
                    >
                        <FaWindowMaximize />
                    </button>
                    <button
                        type="button"
                        onClick={cerrar}
                        className="ia-chat-minimizado__btn ia-chat-minimizado__btn--cerrar"
                        aria-label="Cerrar chat (reinicia a página inicial)"
                        title="Cerrar y reiniciar a la página inicial"
                    >
                        <FaTimes />
                    </button>
                </div>
            </aside>
        )}
    </ChatLateralContext.Provider>;
}
