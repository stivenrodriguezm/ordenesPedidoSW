// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppProvider } from "./AppContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles/tokens.css";
import "./styles/base.css";
import "./index.css";
import "./styles/tablasMovil.css";
import "./styles/print.css";

// En iPhone/iPad, escala máxima 1 para que no se acerque solo al tocar un campo; iOS deja
// ampliar con dos dedos igual. En Android eso bloquearía el zoom, por eso solo en iOS.
if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport && !viewport.content.includes("maximum-scale")) viewport.content += ", maximum-scale=1";
}

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