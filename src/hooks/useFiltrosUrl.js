import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// Filtros de tablas operativas persistentes en la URL (P08-08, U05): volver
// con "atrás", recargar o compartir el enlace muestra el mismo conjunto.
// Solo gestiona las claves declaradas; los demás parámetros (p. ej.
// ?action=create) se conservan. La URL se sincroniza con replace para no
// ensuciar el historial, y se devuelve el setter de useState tal cual, así
// que las actualizaciones funcionales encadenadas funcionan igual.
export function useFiltrosUrl(defecto) {
  const [searchParams, setSearchParams] = useSearchParams();
  const claves = useRef(Object.keys(defecto)).current;
  const [filters, setFilters] = useState(() => {
    const inicial = { ...defecto };
    for (const k of claves) {
      const v = searchParams.get(k);
      if (v !== null) inicial[k] = v;
    }
    return inicial;
  });

  useEffect(() => {
    setSearchParams(prev => {
      const params = new URLSearchParams(prev);
      for (const k of claves) {
        if (filters[k]) params.set(k, filters[k]);
        else params.delete(k);
      }
      return params;
    }, { replace: true });
  }, [filters, claves, setSearchParams]);

  return [filters, setFilters];
}
