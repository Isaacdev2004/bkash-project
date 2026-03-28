import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  // Relative paths so the same build loads inside Capacitor (iOS / Android WebView)
  base: "./",
  server: {
    // Listen on all addresses so http://localhost:8080 and http://127.0.0.1:8080 work
    host: true,
    port: 8080,
    strictPort: false,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
