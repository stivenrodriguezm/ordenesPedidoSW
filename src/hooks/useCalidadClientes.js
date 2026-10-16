import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppContext } from '../AppContext';

export function useCalidadClientes(clave, consulta) {
    const { usuario } = useContext(AppContext);
    return useQuery({
        queryKey: ['calidad-clientes', usuario?.id, usuario?.role, (usuario?.permissions || []).join('|'), ...clave],
        queryFn: consulta,
        enabled: Boolean(usuario),
    });
}
