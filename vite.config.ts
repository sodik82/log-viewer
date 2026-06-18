import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/log-viewer/',
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'node',
  },
})
