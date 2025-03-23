import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/ordenesPedidoSW/",
  build: {
    outDir: "build",
  },
  server: {
    historyApiFallback: true, // Asegura que las rutas sean manejadas por React
  },
});
