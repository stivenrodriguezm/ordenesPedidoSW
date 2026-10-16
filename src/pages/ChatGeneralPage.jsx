import React from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import ChatPage from './ChatPage';
export default function ChatGeneralPage() {
    const [params] = useSearchParams();
    const ubicacion=useLocation();
    return <ChatPage borradorInicial={ubicacion.state?.borrador||''} conversacionInicial={Number(params.get('conversacion')) || null} hiloInicial={params.get('equipo')} />;
}
