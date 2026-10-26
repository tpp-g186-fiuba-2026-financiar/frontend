import { defineConfig, devices } from '@playwright/test';

// Puerto propio para no reusar un `npm run dev` que apunte a otro backend.
const PORT = process.env.E2E_PORT ?? '5173';

// Los tests interceptan el backend con page.route() (ver e2e/mock-backend.ts),
// asi que no hace falta levantar api-ml/backend-website: alcanza con el
// front. VITE_SERVER_API igual tiene que estar seteada para que axios arme
// URLs validas (si no, apiURL = "undefined/login" y page.route no matchea).
export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: 'html',
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: `npm run dev -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        env: { VITE_SERVER_API: 'http://localhost:8000' },
    },
});
