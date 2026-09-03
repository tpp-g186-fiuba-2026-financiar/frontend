import { test, expect } from '@playwright/test';
import { mockBackend } from './mock-backend';

test('login exitoso lleva a /home y muestra la cartera', async ({ page }) => {
    await mockBackend(page, {
        login: { code: 200, message: 'ok', token: 'e2e-fake-token' },
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
                entry_price: 100,
                created_at: '2026-01-01T00:00:00Z',
            },
        ],
        trends: [
            {
                ticker: 'GGAL',
                available: true,
                signal: 'alza',
                condition: 'neutral',
                rsi: 55,
                horizon_days: 5,
                last_close: 100,
                predicted_close: 105,
                as_of: '2026-09-01',
                model: 'xgboost',
                model_version: 'xgb-e2e',
                reason: null,
            },
        ],
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('vos@ejemplo.com').fill('test@financiar.com');
    await dialog.getByPlaceholder('••••••••').fill('supersecreta');
    await dialog.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByText('Usuaria Test')).toBeVisible();
    await expect(page.locator('.t-ticker')).toContainText('GGAL');
});

test('login con credenciales invalidas muestra el error y no navega', async ({
    page,
}) => {
    await mockBackend(page, {
        login: {
            code: 401,
            message: 'Email o contraseña incorrectos',
            token: '',
        },
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('vos@ejemplo.com').fill('test@financiar.com');
    await dialog.getByPlaceholder('••••••••').fill('cualquiera');
    await dialog.getByRole('button', { name: 'Ingresar' }).click();

    await expect(
        page.getByText('Email o contraseña incorrectos'),
    ).toBeVisible();
    await expect(page).toHaveURL('/');
});
