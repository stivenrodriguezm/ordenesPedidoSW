import React, {useCallback,useEffect,useRef,useState} from 'react';
import {FaMinus,FaTimes} from 'react-icons/fa';
import ChatPage from '../../pages/ChatPage';
import './PanelChatOficina.css';

// Panel no modal: la oficina permanece disponible para elegir otro agente.
export default function PanelChatOficina({chat,agentes,zonas,borradores,contextos,onCambiar,onCerrar,onMinimizar,onAmpliar,enOficina=true}) {
    const [saliendo,setSaliendo]=useState(false);
    const temporizador=useRef(null),origen=useRef(document.activeElement);
    const clave=String(chat.agente.id??'general');
    const guardarBorrador=useCallback(texto=>{borradores.current[clave]=texto;},[borradores,clave]);
    const guardarContexto=useCallback(id=>{contextos.current[clave]=id;},[contextos,clave]);
    const cerrar=useCallback(()=>{
        if(document.activeElement?.closest('.of-chat-dock'))origen.current?.isConnected&&origen.current.focus();
        if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){onCerrar();return;}
        setSaliendo(true);
        clearTimeout(temporizador.current);
        temporizador.current=setTimeout(onCerrar,180);
    },[onCerrar]);
    const minimizar=useCallback(()=>{
        if(document.activeElement?.closest('.of-chat-dock'))origen.current?.isConnected&&origen.current.focus();
        onMinimizar?.();
    },[onMinimizar]);
    useEffect(()=>{setSaliendo(false);clearTimeout(temporizador.current);},[chat]);
    useEffect(()=>()=>clearTimeout(temporizador.current),[]);
    useEffect(()=>{
        const teclado=e=>{
            if(e.key==='Escape'&&!e.defaultPrevented&&!document.querySelector('[role="dialog"][aria-modal="true"]')){e.preventDefault();cerrar();}
        };
        document.addEventListener('keydown',teclado);
        return ()=>document.removeEventListener('keydown',teclado);
    },[cerrar]);
    const zona=zonas.find(z=>z.id===chat.agente.zona)?.nombre||'Oficina de inteligencia';
    return <aside className={`of-chat-dock${saliendo?' is-saliendo':''}`} role="region" aria-label={enOficina?'Conversación en la oficina':'Chat de IA'}>
        <header className="of-chat-dock__contexto">
            <div><span className="of-chat-dock__marca">LOTTUS</span><span className="of-chat-dock__zona">{zona} · Conversación</span></div>
            <div className="of-chat-dock__controles">
                <button type="button" onClick={minimizar} className="of-chat-dock__btn-accion" aria-label="Minimizar chat (guarda la página actual)" title="Minimizar (conserva la conversación actual)"><FaMinus/></button>
                <button type="button" onClick={cerrar} className="of-chat-dock__btn-accion" aria-label={enOficina?'Cerrar chat y volver a la oficina':'Cerrar chat y volver a la plataforma'} title="Cerrar y reiniciar a página inicial · Esc"><FaTimes/></button>
            </div>
        </header>
        <div className="of-chat-dock__equipo"><label>Conversar con<select aria-label="Elegir agente para conversar" value={chat.agente.id??'general'} onChange={e=>onCambiar(agentes.find(a=>String(a.id??'general')===e.target.value))}>{agentes.map(a=><option key={a.id??'general'} value={a.id??'general'}>{a.nombre}</option>)}</select></label><span>{enOficina?'Sigues en tu oficina':'Sigues en la plataforma'}</span></div>
        <ChatPage key={`${clave}-${chat.conversacion??'nueva'}`} integrado volverTexto={enOficina?'La oficina':'Volver a la plataforma'} perfilInicial={chat.agente.id??null} conversacionInicial={chat.conversacion}
            borradorInicial={borradores.current[clave]||''} onBorrador={guardarBorrador} onConversacion={guardarContexto} onVolver={cerrar}
            onAbrirPantalla={datos=>onAmpliar(chat.agente,datos)}/>
    </aside>;
}
