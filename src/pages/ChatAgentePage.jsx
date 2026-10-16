import React from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import ChatPage from './ChatPage';

export default function ChatAgentePage() {
    const { perfilId } = useParams();
    const [params] = useSearchParams();
    const ubicacion=useLocation();
    return <ChatPage borradorInicial={ubicacion.state?.borrador||''} key={perfilId} perfilInicial={Number(perfilId)} conversacionInicial={Number(params.get('conversacion')) || null} hiloInicial={params.get('equipo')} />;
}
