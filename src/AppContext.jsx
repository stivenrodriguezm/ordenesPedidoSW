import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import API from "./services/api"; // Usaremos la instancia de API centralizada

export const AppContext = createContext();

export const usePermissions = () => {
  const { usuario } = useContext(AppContext);
  const permissions = usuario?.permissions || [];
  
  const hasPermission = (feature) => {
    if (!usuario) return false;
    if (permissions.includes('ALL')) return true;
    if (feature === 'BASES_DATOS') {
      return permissions.includes('VER_CLIENTES') || permissions.includes('VER_PROVEEDORES') || permissions.includes('VER_REFERENCIAS');
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
  // Counter to force re-verify when admin saves new permissions
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

  // Called after admin saves role permissions — forces fresh user data
  const reloadUser = useCallback(() => {
    setReloadTrigger(t => t + 1);
  }, []);

  const fetchProveedores = useCallback(async () => {
    if (!token) {
      setIsLoadingProveedores(false);
      return;
    }
    setIsLoadingProveedores(true);
    try {
      const response = await API.get('/proveedores/');
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