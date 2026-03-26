import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    open: true,
    proxy: {
      '/interviews': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
