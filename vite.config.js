import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed on GitHub Pages at https://valeryiavialava.github.io/TRAVELER-DEMO/
// so production assets must resolve under /TRAVELER-DEMO/. In dev we stay at root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/TRAVELER-DEMO/' : '/',
  plugins: [react()],
}))
