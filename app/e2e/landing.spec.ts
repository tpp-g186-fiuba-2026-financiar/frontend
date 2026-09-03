import { test, expect } from '@playwright/test';
import { mockBackend } from './mock-backend';

test('la landing carga y muestra los accesos a crear cuenta / ingresar', async ({
    page,
}) => {
    await mockBackend(page);
    await page.goto('/');

    await expect(
        page.getByRole('heading', { name: /Señales de tendencia/ }),
    ).toBeVisible();
    await expect(
        page.getByRole('button', { name: 'Crear cuenta' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
});
