// src/AppContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

// Bandera global para asegurar una sola ejecución inicial
let hasInitialized = false;

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [proveedores, setProveedores] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const token = localStorage.getItem("accessToken");

  const fetchInitialData = async () => {
    if (!token || hasInitialized) {
      console.log("No hay token o ya se inicializó. Saltando fetchInitialData.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Cargando datos iniciales desde AppContext...");
      setIsLoading(true);
      const [proveedoresRes, userRes] = await Promise.all([
        axios.get("https://api.muebleslottus.com/api/proveedores/", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("https://api.muebleslottus.com/api/user/", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      console.log("Proveedores cargados:", proveedoresRes.data);
      console.log("Usuario cargado:", userRes.data);
      setProveedores(proveedoresRes.data);
      setUsuario(userRes.data);
      hasInitialized = true;
    } catch (error) {
      console.error("Error cargando datos iniciales:", error.response?.data || error.message);
      setProveedores([]);
      setUsuario(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("Montando AppContext... Token disponible:", !!token);
    fetchInitialData();
  }, [token]); // Dependencia en token para recargar si cambia

  const value = {
    proveedores,
    usuario,
    setUsuario,
    isLoading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = () => useContext(AppContext);