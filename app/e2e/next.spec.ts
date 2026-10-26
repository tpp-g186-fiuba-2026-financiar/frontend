import { test, expect, type Page } from '@playwright/test';
import { mockBackend } from './mock-backend';

const API = 'http://localhost:8000';

async function loggedIn(page: Page) {
    await page.addInitScript(() => {
        window.localStorage.setItem('token', 'e2e-fake-token');
    });
    await mockBackend(page, {
        user: {
            id: 1,
            email: 'test@financiar.com',
            full_name: 'Usuaria Test',
            risk_profile: 'moderate',
            is_active: true,
            created_at: '2026-01-01T00:00:00Z',
        },
        shares: [
            {
                id: 1,
                user_id: 1,
                ticker: 'GGAL',
                quantity: 10,
                entry_price: 5000,
                created_at: '2026-01-01T00:00:00Z',
            },
        ],
        trends: [],
        comparison: {
            symbol: 'GGAL',
            as_of: '2026-10-23',
            default_model: 'xgboost',
            predictions: {
                xgboost: {
                    model: 'xgboost',
                    signal: 'alza',
                    probability_up: 0.71,
                    horizon_days: 20,
                },
            },
        },
    });
}

test('el ranking marca las acciones propias y lleva al analisis', async ({
    page,
}) => {
    await loggedIn(page);
    await page.route(`${API}/user/ranking`, (route) =>
        route.fulfill({
            json: {
                model_version: 'v2',
                horizon_days: 20,
                acciones: [
                    {
                        symbol: 'GGAL',
                        as_of: '2026-10-23',
                        probability_up: 0.71,
                        signal: 'alza',
                        puesto: 1,
                        puntaje: 10,
                    },
                    {
                        symbol: 'YPFD',
                        as_of: '2026-10-23',
                        probability_up: 0.42,
                        signal: 'neutral',
                        puesto: 2,
                        puntaje: 1,
                    },
                ],
            },
        }),
    );

    await page.goto('/ranking');

    await expect(page).toHaveTitle(/Ranking/);
    const ggal = page.getByRole('row', { name: 'Ver GGAL' });
    await expect(ggal).toContainText('en tu cartera');
    await expect(page.getByRole('row', { name: 'Ver YPFD' })).not.toContainText(
        'en tu cartera',
    );
    await expect(page.getByLabel('Puntaje 10 de 10')).toBeVisible();

    await ggal.click();
    await expect(page).toHaveURL('/accion/GGAL');
    await expect(page.getByRole('main')).toContainText('GGAL');
    await expect(page.getByText('Algo falló')).toHaveCount(0);
});

test('el ranking avisa si no se puede armar', async ({ page }) => {
    await loggedIn(page);
    await page.route(`${API}/user/ranking`, (route) =>
        route.fulfill({ status: 503, json: { message: 'sin datos' } }),
    );

    await page.goto('/ranking');

    await expect(
        page.getByText('No pudimos armar el ranking ahora'),
    ).toBeVisible();
});

test('el tema claro se aplica y queda guardado', async ({ page }) => {
    await loggedIn(page);
    await page.goto('/home');

    await page
        .getByRole('button', { name: 'Cambiar tema claro u oscuro' })
        .click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const fondo = await page.evaluate(
        () => getComputedStyle(document.body).backgroundColor,
    );
    expect(fondo).not.toBe('rgb(0, 0, 0)');
});

test('el enlace para saltar al contenido lleva al main', async ({ page }) => {
    await loggedIn(page);
    await page.goto('/home');
    await expect(page.locator('#contenido')).toBeVisible();

    await page.keyboard.press('Tab');
    const salto = page.getByRole('link', { name: /Saltar al contenido/ });
    await expect(salto).toBeFocused();
    await salto.press('Enter');
    await expect(page).toHaveURL(/#contenido$/);
});
