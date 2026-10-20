import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Exposes dev server to Mobile, Laptop and local network devices
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  }
})
