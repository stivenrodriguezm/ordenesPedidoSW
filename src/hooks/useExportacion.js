import { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { obtenerArchivo, guardarArchivo } from '../services/descargas';
import { mensajeDeError } from '../services/errores';

export function useExportacion(reporte, nombre, notificar) {
  const enCurso = useRef(false);
  const descarga = useMutation({
    mutationFn: async params => {
      const blob = await obtenerArchivo(`/reportes-operativos/${reporte}/exportar/`, { params });
      guardarArchivo(blob, nombre);
    },
    retry: false,
    onSuccess: () => notificar({ message: 'Archivo completo del filtro generado. La generación quedó registrada.', type: 'success' }),
    onError: error => notificar({ message: mensajeDeError(error), type: 'error' }),
  });
  const exportar = async params => {
    if (enCurso.current) return;
    enCurso.current = true;
    try { await descarga.mutateAsync(params); } catch { /* onError muestra el error; no reintentar descargas automáticamente. */ }
    finally { enCurso.current = false; }
  };
  return { exportar, exportando: descarga.isPending };
}
