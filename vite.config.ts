import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    port: 3000,
    // Abierto en la red local (cualquier wifi) para probar desde el celular. El API y los
    // archivos pasan por este proxy (VITE_API_BASE_URL=/api en .env.development), así que
    // el backend sigue escuchando solo en este equipo.
    host: true,
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/media": "http://127.0.0.1:8000",
    },
  },
  build: {
    outDir: "dist",
  },
});
