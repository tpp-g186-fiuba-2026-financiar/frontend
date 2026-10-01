import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { mockBackend } from '../mock-backend.ts';
import { appUrl, type AppWorld } from './support.ts';

const testUser = {
    id: 1,
    email: 'test@financiar.com',
    full_name: 'Usuaria Test',
    risk_profile: 'moderate',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
};

Given(
    'I have an empty portfolio and {string} is available',
    async function (this: AppWorld, ticker: string) {
        await this.page.addInitScript(() => {
            window.localStorage.setItem('token', 'e2e-fake-token');
        });
        await mockBackend(this.page, {
            user: testUser,
            shares: [],
            trends: [],
            availableShares: [{ id: 1, ticker, predictable: true }],
        });
        await this.page.goto(`${appUrl}/home`);
        await expect(
            this.page.getByRole('button', { name: 'Editar mi cartera' }),
        ).toBeVisible();
    },
);

Given(
    'my portfolio contains {string}',
    async function (this: AppWorld, tickerList: string) {
        const tickers = tickerList.split(',').map((ticker) => ticker.trim());
        await this.page.addInitScript(() => {
            window.localStorage.setItem('token', 'e2e-fake-token');
        });
        await mockBackend(this.page, {
            user: testUser,
            shares: tickers.map((ticker, index) => ({
                id: index + 1,
                user_id: 1,
                ticker,
                quantity: index + 1,
                entry_price: 100,
                created_at: '2026-01-01T00:00:00Z',
            })),
            trends: [],
        });
        await this.page.goto(`${appUrl}/home`);
        await expect(this.page.locator('.t-ticker')).toHaveCount(
            tickers.length,
        );
    },
);

Given(
    '{string} has predictions from multiple models',
    async function (this: AppWorld, ticker: string) {
        const prediction = (predictedClose: number, model: string) => ({
            available: true,
            signal: 'alza',
            condition: 'neutral',
            rsi: 55,
            horizon_days: 5,
            last_close: 100,
            predicted_close: predictedClose,
            as_of: '2026-09-01',
            model,
            model_version: `${model}-e2e`,
            backtest: null,
            volatility_forecast: null,
            reason: null,
        });

        await this.page.route(
            `http://localhost:8000/user/shares/${ticker}/trends/compare`,
            (route) =>
                route.fulfill({
                    json: {
                        symbol: ticker,
                        as_of: '2026-09-01',
                        default_model: 'xgboost',
                        predictions: {
                            xgboost: prediction(110, 'xgboost'),
                            lstm: prediction(120, 'lstm'),
                        },
                    },
                }),
        );
    },
);

When(
    'I add {int} units of {string} to my portfolio',
    async function (this: AppWorld, quantity: number, ticker: string) {
        await this.page
            .getByRole('button', { name: 'Editar mi cartera' })
            .click();
        const stockRow = this.page
            .locator('.builder-row')
            .filter({ hasText: ticker });
        await stockRow.getByRole('checkbox').check();
        await stockRow.locator('.builder-qty').fill(String(quantity));
        await this.page.getByRole('button', { name: 'Guardar cartera' }).click();
    },
);

When(
    'I open stock {string} from my portfolio',
    async function (this: AppWorld, ticker: string) {
        await this.page.getByRole('cell', { name: ticker }).click();
    },
);

Then(
    'my portfolio should show {string} with {int} units',
    async function (this: AppWorld, ticker: string, quantity: number) {
        const row = this.page
            .locator('tbody tr')
            .filter({ has: this.page.locator('.t-ticker', { hasText: ticker }) });
        await expect(row.locator('.t-ticker')).toHaveText(ticker);
        await expect(row.locator('.t-qty')).toHaveText(String(quantity));
    },
);

Then(
    'the chart should show {int} stocks labeled {string}',
    async function (this: AppWorld, count: number, tickerList: string) {
        const tickers = tickerList.split(',').map((ticker) => ticker.trim());
        expect(tickers).toHaveLength(count);
        await expect(
            this.page.getByRole('img', {
                name: 'Distribución de acciones de mi cartera por cantidad',
            }),
        ).toHaveAttribute(
            'aria-label',
            `Distribución de acciones de mi cartera por cantidad: ${tickers.join(', ')}`,
        );
    },
);

Then(
    'I should be on the stock page for {string}',
    async function (this: AppWorld, ticker: string) {
        await expect(
            this.page.getByRole('heading', { name: ticker, level: 1 }),
        ).toBeVisible();
    },
);

Then(
    'I should see predictions from {int} models',
    async function (this: AppWorld, count: number) {
        const comparisonPanel = this.page
            .locator('.panel')
            .filter({
                has: this.page.getByRole('heading', {
                    name: 'Qué predice cada modelo',
                }),
            });
        const predictionRows = comparisonPanel.locator('tbody tr');
        await expect(predictionRows).toHaveCount(count);
        await expect(predictionRows.nth(0)).toContainText('xgboost');
        await expect(predictionRows.nth(0)).toContainText('$110');
        await expect(predictionRows.nth(1)).toContainText('lstm');
        await expect(predictionRows.nth(1)).toContainText('$120');
    },
);