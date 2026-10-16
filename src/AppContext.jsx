import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from "react";
import { obtenerTodasLasPaginas } from './services/paginacion';
import API from "./services/api"; // Usaremos la instancia de API centralizada

export const AppContext = createContext();
// Contexto separado para el toast global: evita que cada notificación
// re-renderice todos los consumidores de AppContext
export const NotificationContext = createContext();

export const usePermissions = () => {
  const { usuario } = useContext(AppContext);
  const permissions = usuario?.permissions || [];
  
  const hasPermission = (feature) => {
    if (!usuario) return false;
    // El rol administrador siempre tiene acceso total (misma regla que el
    // backend aplica en cada endpoint), sin importar qué haya quedado
    // guardado en la configuración de permisos del rol.
    if (usuario.role?.toLowerCase() === 'administrador') return true;
    // 'ALL' llega desde el backend para roles sin configuración explícita
    // guardada todavía.
    if (permissions.includes('ALL')) return true;

    if(feature==='ACCESO_OFICINA')return !!usuario.acceso_oficina||permissions.includes('USAR_ASISTENTE_IA');

    if (feature === 'ACCESO_CAJA') {
      return permissions.includes('ACCESO_CAJA') || permissions.includes('VER_CAJA');
    }
    if (feature === 'ACCESO_RECIBOS') {
      return permissions.includes('ACCESO_RECIBOS') || permissions.includes('VER_RECIBOS');
    }
    if (feature === 'ACCESO_EGRESOS') {
      return permissions.includes('ACCESO_EGRESOS') || permissions.includes('VER_COMPROBANTES_EGRESO');
    }

    if (feature === 'VER_VENTAS') {
      return permissions.includes('VER_TODAS_VENTAS') || permissions.includes('VER_PROPIAS_VENTAS');
    }
    if (feature === 'VER_TELAS') {
      return permissions.includes('VER_PEDIDOS_TELAS');
    }
    if (feature === 'GESTION_WEB') {
      return usuario.role?.toLowerCase() === 'administrador' || permissions.includes('GESTION_WEB') || permissions.includes('ADMINISTRAR_PAGINA_WEB');
    }
    return permissions.includes(feature);
  };
  return hasPermission;
};

export function AppProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // Error recuperable al cargar la sesión (red, 5xx, timeout): se muestra con
  // opción de reintentar en vez de un loader infinito (H28).
  const [sessionError, setSessionError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [isLoadingProveedores, setIsLoadingProveedores] = useState(true);
  // Notificación global (toast) — una sola implementación para toda la app
  const [notification, setNotification] = useState(null);

  const notify = useCallback((message, type = 'success') => {
    setNotification({ message, type });
  }, []);

  const clearNotification = useCallback(() => setNotification(null), []);

  // Read token at render time — when it changes, useEffect re-runs
  const token = localStorage.getItem("accessToken");
  const [sessionRetry, setSessionRetry] = useState(0);
  const retrySession = useCallback(() => setSessionRetry(n => n + 1), []);

  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setIsLoading(false);
        setUsuario(null);
        return;
      }
      setIsLoading(true);
      setSessionError(null);
      try {
        const userRes = await API.get("/user/");
        setUsuario(userRes.data);
      } catch (error) {
        // Only kill session on 401 (expired/invalid token).
        // 403 (permission denied) and other errors must NOT clear the session.
        if (error?.response?.status === 401) {
          setUsuario(null);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        } else {
          if (error?.response?.status === 429) {
            const segundos = Math.max(1, Math.ceil(Number(error.response.headers?.['retry-after']) || 60));
            setSessionError(`Se alcanzó el límite de consultas de sesión. Espera ${segundos} segundos y vuelve a intentar. Tu sesión sigue abierta.`);
          } else {
            setSessionError(error?.response
              ? 'El servidor no pudo cargar tu sesión. Intenta de nuevo en un momento.'
              : 'No hay conexión con el servidor. Revisa tu red e intenta de nuevo.');
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    verifyUser();
  }, [token, sessionRetry]); // re-runs on login/logout o al reintentar

  // Called after login or when user data needs updating
  const reloadUser = useCallback(async () => {
    const currentToken = localStorage.getItem("accessToken");
    if (!currentToken) return;
    try {
      const userRes = await API.get("/user/");
      setUsuario(userRes.data);
      return userRes.data;
    } catch (error) {
      if (error?.response?.status === 401) {
        setUsuario(null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
    }
  }, []);

  const fetchProveedores = useCallback(async () => {
    if (!token) {
      setIsLoadingProveedores(false);
      return;
    }
    setIsLoadingProveedores(true);
    try {
      // El API pagina de a 100: antes se pedían 1000 y se descartaba `next`,
      // así que los proveedores después del 100 no aparecían en los selectores.
      setProveedores(await obtenerTodasLasPaginas(API, '/proveedores/'));
    } catch {
      // Silently ignore — vendedores without VER_PROVEEDORES get 403 here
      setProveedores([]);
    } finally {
      setIsLoadingProveedores(false);
    }
  }, [token]);

  useEffect(() => {
    if (usuario) fetchProveedores();
  }, [usuario, fetchProveedores]);

  const value = useMemo(() => ({
    usuario,
    setUsuario,
    isLoading,
    sessionError,
    retrySession,
    isLoggingIn,
    setIsLoggingIn,
    reloadUser,
    notify,
    proveedores,
    isLoadingProveedores,
    fetchProveedores,
  }), [
    usuario, isLoading, sessionError, retrySession, isLoggingIn, reloadUser, notify,
    proveedores, isLoadingProveedores, fetchProveedores,
  ]);

  const notificationValue = useMemo(
    () => ({ notification, clearNotification }),
    [notification, clearNotification]
  );

  return (
    <AppContext.Provider value={value}>
      <NotificationContext.Provider value={notificationValue}>
        {children}
      </NotificationContext.Provider>
    </AppContext.Provider>
  );
}
