import { test, expect } from '@playwright/test';
import { mockBackend } from './mock-backend';

test('cerrar sesion vuelve a la landing y borra el token', async ({ page }) => {
    // Simula un login previo: setea el token antes de que corra cualquier
    // script de la pagina (addInitScript corre antes que el primer goto).
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
        shares: [],
        trends: [],
    });

    await page.goto('/home');
    await expect(page.getByText('Usuaria Test')).toBeVisible();

    await page.getByRole('button', { name: /Usuaria Test/ }).click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();

    await expect(page).toHaveURL('/');
    const token = await page.evaluate(() =>
        window.localStorage.getItem('token'),
    );
    expect(token).toBeNull();
});
