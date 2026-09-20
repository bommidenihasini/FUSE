import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/health": "http://127.0.0.1:8787",
      "/runs": "http://127.0.0.1:8787",
      "/policies": "http://127.0.0.1:8787",
    },
  },
})
