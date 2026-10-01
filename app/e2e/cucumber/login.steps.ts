import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { mockBackend } from '../mock-backend.ts';
import { appUrl, type AppWorld } from './support.ts';

Given('the backend accepts valid credentials', async function (this: AppWorld) {
    await mockBackend(this.page, {
        login: { code: 200, message: 'ok', token: 'e2e-fake-token' },
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
});

Given('the backend rejects login', async function (this: AppWorld) {
    await mockBackend(this.page, {
        login: {
            code: 401,
            message: 'Email o contraseña incorrectos',
            token: '',
        },
    });
});

When('I open the login form', async function (this: AppWorld) {
    await this.page.goto(appUrl);
    await this.page.getByRole('button', { name: 'Ingresar' }).click();
});

When('I submit valid credentials', async function (this: AppWorld) {
    const dialog = this.page.getByRole('dialog');
    await dialog.getByPlaceholder('vos@ejemplo.com').fill('test@financiar.com');
    await dialog.getByPlaceholder('••••••••').fill('supersecreta');
    await dialog.getByRole('button', { name: 'Ingresar' }).click();
});

When('I submit invalid credentials', async function (this: AppWorld) {
    const dialog = this.page.getByRole('dialog');
    await dialog.getByPlaceholder('vos@ejemplo.com').fill('test@financiar.com');
    await dialog.getByPlaceholder('••••••••').fill('incorrecta');
    await dialog.getByRole('button', { name: 'Ingresar' }).click();
});

Then('I should see my portfolio', async function (this: AppWorld) {
    await expect(this.page).toHaveURL(/\/home$/);
    await expect(this.page.getByText('Usuaria Test')).toBeVisible();
});

Then(
    'I should see the login error {string}',
    async function (this: AppWorld, message: string) {
        await expect(this.page.getByText(message)).toBeVisible();
        await expect(this.page).toHaveURL(`${appUrl}/`);
    },
);