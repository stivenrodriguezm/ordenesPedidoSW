import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import PerfilesIA from '../components/chat/PerfilesIA';
import API from '../services/api';

export default function ConfiguracionIAPage() {
    const navegar = useNavigate();
    const [params] = useSearchParams();
    const cache = useQueryClient();
    const [estado, perfiles] = useQueries({ queries: [
        {queryKey:['oficina-ia','estado'],queryFn:()=>API.get('/asistente/estado/').then(r=>r.data)},
        {queryKey:['oficina-ia','perfiles'],queryFn:()=>API.get('/asistente/perfiles/').then(r=>r.data)},
    ] });
    if (estado.isPending || perfiles.isPending) return <div className="ds-page" role="status">Cargando perfiles…</div>;
    if (estado.isError || perfiles.isError) return <div className="ds-page" role="alert">No se pudieron cargar los perfiles. <button type="button" onClick={()=>cache.invalidateQueries({queryKey:['oficina-ia']})}>Reintentar</button></div>;
    if (!estado.data.puede_gestionar_perfiles) return <div className="ds-page">No tienes permiso para gestionar agentes.</div>;
    const id = Number(params.get('perfil'));
    const inicial = params.get('nuevo') ? 'nuevo' : perfiles.data.some(p=>p.id===id) ? id : undefined;
    const zona = Number(params.get('zona'));
    return <div className="chat-page chat-page--configuracion"><PerfilesIA estado={estado.data} perfiles={perfiles.data} inicial={inicial}
        zonaInicial={estado.data.zonas?.some(z=>z.id===zona)?zona:estado.data.zonas?.find(z=>z.ambiente==='estudio')?.id||estado.data.zonas?.[0]?.id||null}
        onRecargar={()=>cache.invalidateQueries({queryKey:['oficina-ia']})}
        volverTexto="Volver a la oficina" onVolver={()=>navegar('/IA')} onProbar={p=>navegar(`/IA/agentes/${p.id}`)} /></div>;
}
