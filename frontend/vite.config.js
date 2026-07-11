import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Le backend Flask sera exposé ici, ex: http://localhost:5000
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
