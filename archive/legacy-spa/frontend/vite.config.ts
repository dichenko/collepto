import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  build: {
    outDir: '../assets',
    emptyOutDir: true,
    assetsDir: 'static',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react']
        }
      }
    }
  },
  base: '/',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://collepto.3451881.workers.dev',
        changeOrigin: true,
        secure: true
      }
    }
  }
})