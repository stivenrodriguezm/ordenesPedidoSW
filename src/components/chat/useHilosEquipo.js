import { useCallback, useEffect, useState } from 'react';
import API from '../../services/api';

const mensajeError = (e) => e.response?.data?.error || e.response?.data?.detail || 'No se pudo cargar la conversación.';

/** Hilos del equipo; con `agente` solo los que incluyen a ese agente. */
export default function useHilosEquipo(activo, agente = null) {
    const [hilos, setHilos] = useState(null);
    const [error, setError] = useState('');
    const cargar = useCallback(() => API.get('/asistente/equipo/hilos/').then(r => {
        const todos = r.data?.hilos || [];
        setHilos(agente ? todos.filter(h => h.participantes.some(p => p.clave === `ia-${agente}`)) : todos); setError('');
    }).catch(e => setError(mensajeError(e))), [agente]);
    useEffect(() => {
        if (!activo) return undefined;
        cargar();
        const t = setInterval(cargar, 8000);
        return () => clearInterval(t);
    }, [activo, cargar]);
    return { hilos, error, recargar: cargar };
}

