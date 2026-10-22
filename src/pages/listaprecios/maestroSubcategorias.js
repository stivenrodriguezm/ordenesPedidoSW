import { useQuery } from '@tanstack/react-query';
import API from '../../services/api';

// Maestro de Referencias: subcategorías y categorías (las mismas que usa Bases de datos › Referencias).
const lista = async (url) => { const r = await API.get(url); return Array.isArray(r.data) ? r.data : r.data?.results || []; };
export const useSubcategorias = () => useQuery({ queryKey: ['suministros-subcategorias'], queryFn: () => lista('/suministros/subcategorias/'), staleTime: 60_000 });
export const useCategorias = () => useQuery({ queryKey: ['suministros-categorias'], queryFn: () => lista('/suministros/categorias/'), staleTime: 60_000 });
