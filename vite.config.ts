import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// NOTE: keep it simple for Electron. We don’t need PWA during packaging.
// The critical bit that fixes the blank window is `base: './'`.
export default defineConfig({
  base: './',                 // <<< important for file:// loading in Electron
  plugins: [react()],
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: { exclude: ['argon2-browser'] },
})
