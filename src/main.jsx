// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppProvider } from "./AppContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles/tokens.css";
import "./styles/base.css";
import "./index.css";
import "./styles/print.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30 segundos — datos frescos, pero se actualizan al navegar
      gcTime: 5 * 60 * 1000,       // 5 minutos en caché
      refetchOnWindowFocus: true,  // Refrescar al volver a la pestaña/ventana
      refetchOnMount: true,        // Refrescar cuando el componente se monta de nuevo
      retry: 1,                    // 1 reintento en caso de error de red
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <App />
    </AppProvider>
  </QueryClientProvider>
);