import { useQuery } from '@tanstack/react-query';
import API from '../services/api';

// Hooks compartidos para datos que se piden en muchas páginas.
// Un solo queryKey = dedupe y caché entre páginas (React Query).

export const useVendedores = (options = {}) =>
  useQuery({
    queryKey: ['vendedores'],
    queryFn: async () => {
      const res = await API.get('/vendedores/');
      return res.data?.results || res.data || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });

export const usePendientesIds = (params = undefined, options = {}) =>
  useQuery({
    queryKey: ['pendientes-ids', params || null],
    queryFn: async () => {
      const res = await API.get('/get-pendientes-ids/', params ? { params } : undefined);
      return res.data || [];
    },
    staleTime: 60 * 1000,
    ...options,
  });
