import type { Page } from '@playwright/test';

// Todas las llamadas del front pegan a VITE_SERVER_API (ver playwright.config.ts).
const API = 'http://localhost:8000';

export interface MockBackendOptions {
    login?: { code: number; message: string; token: string };
    user?: {
        id: number;
        email: string;
        full_name: string;
        risk_profile: string;
        is_active: boolean;
        created_at: string;
    };
    shares?: Array<{
        id: number;
        user_id: number;
        ticker: string;
        quantity: number;
        entry_price: number | null;
        created_at: string;
    }>;
    trends?: Array<Record<string, unknown>>;
}

/**
 * Intercepta las llamadas al backend que el front hace en casi cualquier
 * pantalla (hello, tickers publicos) mas las que se pasen por `opts`. Nada
 * de esto pega a un backend real: si una ruta no se mockea y el front la
 * llama, Playwright la deja pasar y falla como cualquier request de red sin
 * servidor -- a proposito, para que un endpoint nuevo sin mockear se note.
 */
export async function mockBackend(page: Page, opts: MockBackendOptions = {}) {
    await page.route(`${API}/hello`, (route) =>
        route.fulfill({
            json: { status: 'ok', version: 'e2e', message: 'en vivo' },
        }),
    );
    await page.route(`${API}/shares`, (route) =>
        route.fulfill({ json: { shares: [] } }),
    );

    if (opts.login) {
        await page.route(`${API}/login`, (route) =>
            route.fulfill({ json: opts.login }),
        );
    }
    if (opts.user) {
        await page.route(`${API}/user`, (route) =>
            route.fulfill({ json: opts.user }),
        );
    }
    if (opts.shares) {
        await page.route(`${API}/user/shares`, (route) =>
            route.fulfill({ json: { shares: opts.shares } }),
        );
    }
    if (opts.trends) {
        await page.route(`${API}/user/shares/trends`, (route) =>
            route.fulfill({ json: { trends: opts.trends } }),
        );
    }
    // El P&L es best-effort en Home (fetchPnl atrapa el error y sigue sin esa
    // columna), asi que un 404 acá es una respuesta valida a probar, no un mock.
    await page.route(`${API}/user/shares/pnl`, (route) =>
        route.fulfill({ status: 404, json: { message: 'no implementado' } }),
    );
}
