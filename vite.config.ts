import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/ordenesPedidoSW/",  // 👈 Base correctamente definida
  build: {
    outDir: "dist",
  },
});
