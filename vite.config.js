import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed on GitHub Pages at https://valeryiavialava.github.io/TRAVELER_demo/
// so production assets must resolve under /TRAVELER_demo/. In dev we stay at root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/TRAVELER_demo/' : '/',
  plugins: [react()],
}))
