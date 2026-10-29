import React, {useCallback,useEffect,useRef,useState} from 'react';
import ChatPage from '../../pages/ChatPage';
import './PanelChatOficina.css'; // .of-chat-dock: también lo usa la Bandeja (PanelColaboracion)

// Ventana flotante del chat de IA (abajo a la derecha, 2026-10-29): no modal, la oficina o la
// página actual siguen disponibles. Los agentes y sus chats están en el menú lateral del chat.
export default function PanelChatOficina({chat,borradores,contextos,onCerrar,onMinimizar,onAmpliar,enOficina=true}) {
    const [saliendo,setSaliendo]=useState(false);
    const temporizador=useRef(null),origen=useRef(document.activeElement);
    const cerrar=useCallback(()=>{
        if(document.activeElement?.closest('.cv-ventana'))origen.current?.isConnected&&origen.current.focus();
        if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){onCerrar();return;}
        setSaliendo(true);
        clearTimeout(temporizador.current);
        temporizador.current=setTimeout(onCerrar,160);
    },[onCerrar]);
    const minimizar=useCallback(()=>{
        if(document.activeElement?.closest('.cv-ventana'))origen.current?.isConnected&&origen.current.focus();
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
    const clave=String(chat.agente.id??'general');
    return <aside className={`cv-ventana${saliendo?' is-saliendo':''}`} role="region" aria-label={enOficina?'Conversación en la oficina':'Chat de IA'}>
        <ChatPage key={`${clave}-${chat.conversacion??'nueva'}`} integrado perfilInicial={chat.agente.id??null} conversacionInicial={chat.conversacion}
            borradores={borradores} contextos={contextos} etiquetaCerrar={enOficina?'Cerrar chat y volver a la oficina':'Cerrar chat y volver a la plataforma'}
            onVolver={cerrar} onMinimizar={onMinimizar?minimizar:undefined} onAbrirPantalla={datos=>onAmpliar(chat.agente,datos)}/>
    </aside>;
}
