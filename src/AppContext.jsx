import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import API from "./services/api"; // Usaremos la instancia de API centralizada

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false); // Nuevo estado para el loader de login
  const [proveedores, setProveedores] = useState([]);
  const [isLoadingProveedores, setIsLoadingProveedores] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [isLoadingClientes, setIsLoadingClientes] = useState(true);
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
        console.error("Error verificando el usuario:", error);
        setUsuario(null);
        localStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };

    verifyUser();
  }, [token]);

  const fetchProveedores = useCallback(async () => {
    if (!token) {
      setIsLoadingProveedores(false);
      return;
    }
    setIsLoadingProveedores(true);
    try {
      const response = await API.get('/proveedores/');
      setProveedores(response.data.results || []);
    } catch (error) {
      console.error("Error al cargar proveedores:", error);
      setProveedores([]);
    } finally {
      setIsLoadingProveedores(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProveedores();
  }, [fetchProveedores]);

  // fetchClientes removed to prevent backend timeout (page_size=1000)
  // Clientes page now handles its own data fetching with pagination.
  const fetchClientes = useCallback(async () => {
    // No-op or minimal fetch if absolutely needed, but for now we disable the global heavy fetch.
    setClientes([]);
    setIsLoadingClientes(false);
  }, []);

  return (
    <AppContext.Provider
      value={{
        usuario,
        setUsuario,
        isLoading,
        isLoggingIn, // Proveer el nuevo estado
        setIsLoggingIn, // Proveer la función para modificarlo
        proveedores,
        isLoadingProveedores,
        fetchProveedores,
        clientes,
        isLoadingClientes,
        fetchClientes, // Expose the function
      }}
    >
      {children}
    </AppContext.Provider>
  );
}