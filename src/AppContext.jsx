import React, { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [proveedores, setProveedores] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const token = localStorage.getItem("accessToken");

  const fetchProveedores = async () => {
    try {
      const res = await axios.get("https://api.muebleslottus.com/api/proveedores/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProveedores(res.data);
    } catch (error) {
      console.error("Error cargando proveedores:", error);
      setProveedores([]);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await axios.get("https://api.muebleslottus.com/api/user/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsuario(res.data);
    } catch (error) {
      console.error("Error cargando usuario:", error);
      setUsuario(null);
    }
  };

  const updateProveedores = async () => {
    await fetchProveedores();
  };

  useEffect(() => {
    // Solo ejecuta las solicitudes si hay un token
    if (token) {
      fetchProveedores();
      fetchUser();
    } else {
      setProveedores([]);
      setUsuario(null);
    }
  }, [token]);

  const value = {
    proveedores,
    setProveedores,
    usuario,
    setUsuario,
    updateProveedores,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}