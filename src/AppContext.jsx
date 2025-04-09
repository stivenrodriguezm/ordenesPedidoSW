// src/AppContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

// Bandera global para asegurar una sola ejecución
let hasInitialized = false;

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [proveedores, setProveedores] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const token = localStorage.getItem("accessToken");

  const fetchInitialData = async () => {
    if (!token || hasInitialized) {
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
      setProveedores(proveedoresRes.data);
      setUsuario(userRes.data);
      hasInitialized = true;
    } catch (error) {
      console.error("Error cargando datos iniciales:", error);
      setProveedores([]);
      setUsuario(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log("Montando AppContext...");
    fetchInitialData();
  }, []);

  const value = {
    proveedores,
    usuario,
    setUsuario, // Exponemos setUsuario para que LoginPage pueda usarlo
    isLoading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = () => useContext(AppContext);