import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: true,
    env: {
      VITE_SERVER_API: 'http://localhost:8000'
    },
    // e2e/ son specs de Playwright, no de Vitest -- mismo patron *.spec.ts.
    exclude: [...configDefaults.exclude, './e2e/**'],
  },
})

