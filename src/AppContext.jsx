import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from "react";
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
    // 'ALL' solo llega desde el backend cuando el rol (p.ej. administrador
    // recién creado) todavía no tiene una configuración explícita guardada.
    if (permissions.includes('ALL')) return true;

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
    if (feature === 'CREAR_ORDEN') {
      return permissions.includes('CREAR_ORDEN') || permissions.includes('CREAR_PROPIAS_ORDENES') || permissions.includes('CREAR_ORDENES_OTROS');
    }
    return permissions.includes(feature);
  };
  return hasPermission;
};

export function AppProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [isLoadingProveedores, setIsLoadingProveedores] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [isLoadingClientes, setIsLoadingClientes] = useState(false);
  // Notificación global (toast) — una sola implementación para toda la app
  const [notification, setNotification] = useState(null);

  const notify = useCallback((message, type = 'success') => {
    setNotification({ message, type });
  }, []);

  const clearNotification = useCallback(() => setNotification(null), []);

  // Read token at render time — when it changes, useEffect re-runs
  const token = localStorage.getItem("accessToken");

  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setIsLoading(false);
        setUsuario(null);
        return;
      }
      setIsLoading(true);
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
        }
      } finally {
        setIsLoading(false);
      }
    };
    verifyUser();
  }, [token]); // re-runs on login/logout

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
      const response = await API.get('/proveedores/', { params: { page_size: 1000 } });
      setProveedores(response.data.results || []);
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

  const fetchClientes = useCallback(async () => {
    if (!token) {
      setClientes([]);
      return;
    }
    setIsLoadingClientes(true);
    try {
      const response = await API.get('/clientes/', { params: { page_size: 1000 } });
      setClientes(response.data.results || response.data || []);
    } catch {
      // Silently ignore — usuarios sin permiso de clientes reciben 403
      setClientes([]);
    } finally {
      setIsLoadingClientes(false);
    }
  }, [token]);

  const value = useMemo(() => ({
    usuario,
    setUsuario,
    isLoading,
    isLoggingIn,
    setIsLoggingIn,
    reloadUser,
    notify,
    proveedores,
    isLoadingProveedores,
    fetchProveedores,
    clientes,
    isLoadingClientes,
    fetchClientes,
  }), [
    usuario, isLoading, isLoggingIn, reloadUser, notify,
    proveedores, isLoadingProveedores, fetchProveedores,
    clientes, isLoadingClientes, fetchClientes,
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