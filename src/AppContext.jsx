import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import API from "./services/api"; // Usaremos la instancia de API centralizada

export const AppContext = createContext();

export const usePermissions = () => {
  const { usuario } = useContext(AppContext);
  const permissions = usuario?.permissions || [];
  
  const hasPermission = (feature) => {
    if (!usuario) return false;
    if (usuario.role?.toLowerCase() === 'administrador') return true;
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
  const [isLoadingClientes, setIsLoadingClientes] = useState(true);
  // Used to re-run verifyUser on login
  const [reloadTrigger, setReloadTrigger] = useState(0);

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
  }, [token, reloadTrigger]); // re-runs on login/logout OR when reloadTrigger increments

  // Called after admin saves role permissions — forces fresh user data silently
  const reloadUser = useCallback(async () => {
    if (!token) return;
    try {
      const userRes = await API.get("/user/");
      setUsuario(userRes.data);
    } catch (error) {
      if (error?.response?.status === 401) {
        setUsuario(null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
    }
  }, [token]);

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
    setClientes([]);
    setIsLoadingClientes(false);
  }, []);

  return (
    <AppContext.Provider
      value={{
        usuario,
        setUsuario,
        isLoading,
        isLoggingIn,
        setIsLoggingIn,
        reloadUser,
        proveedores,
        isLoadingProveedores,
        fetchProveedores,
        clientes,
        isLoadingClientes,
        fetchClientes,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}