import { beforeEach, describe, expect, test, vi } from 'vitest';
import axios from 'axios';
import authAxios from '../api/authFetch';
import { helloEndpoint } from '../api/hello';
import { loginEndpoint } from '../api/login';
import { registerEndpoint } from '../api/register';
import { getAllSharesEndpoint } from '../api/shares/getAllSharesEndpoint';
import { shareInfoEndpoint } from '../api/shares/getShareInfo';
import { getUserAlertSubscriptionsEndpoint } from '../api/subscriptions/getUserAlertSubscriptions';
import {
    subscribeToPortfolioAlertsEndpoint,
    unsubscribeFromPortfolioAlertsEndpoint,
} from '../api/subscriptions/portfolioAlertSubscription';
import {
    subscribeToTickerAlertEndpoint,
    unsubscribeFromTickerAlertEndpoint,
} from '../api/subscriptions/tickerAlertSubscription';
import { deleteUserPreferenceEndpoint } from '../api/user/deleteUserPreference';
import { getUserEndpoint } from '../api/user/getUser';
import { updateProfileEndpoint } from '../api/user/updateProfile';
import { deleteUserShareEndpoint } from '../api/userShares/deleteUserShare';
import { getShareHistoryEndpoint } from '../api/userShares/getShareHistoryEndpoint';
import { getShareTrendCompareEndpoint } from '../api/userShares/getShareTrendCompareEndpoint';
import { getUserSharesBalanceHistoryEndpoint } from '../api/userShares/getUserSharesBalanceHistoryEndpoint';
import { getUserSharesEndpoint } from '../api/userShares/getUserSharesEndpoint';
import { getUserSharesPnlEndpoint } from '../api/userShares/getUserSharesPnlEndpoint';
import { getUserSharesTrendsEndpoint } from '../api/userShares/getUserSharesTrendsEndpoint';
import { addUserShareEndpoint } from '../api/userShares/postUserShare';
import { updateUserShareEndpoint } from '../api/userShares/putUserShare';

const payload = { ok: true };

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('API adapters', () => {
    test('returns response data from authenticated reads', async () => {
        const get = vi
            .spyOn(authAxios, 'get')
            .mockResolvedValue({ data: payload });

        const calls = [
            getAllSharesEndpoint(),
            getUserAlertSubscriptionsEndpoint(),
            getUserEndpoint(),
            getShareHistoryEndpoint('GGAL'),
            getShareTrendCompareEndpoint('GGAL'),
            getUserSharesBalanceHistoryEndpoint(),
            getUserSharesEndpoint(),
            getUserSharesPnlEndpoint(),
            getUserSharesTrendsEndpoint(),
        ];

        await expect(Promise.all(calls)).resolves.toEqual(
            Array.from({ length: calls.length }, () => payload),
        );
        expect(get).toHaveBeenCalledTimes(calls.length);
    });

    test('sends authenticated writes and deletes', async () => {
        vi.spyOn(authAxios, 'post').mockResolvedValue({ data: payload });
        vi.spyOn(authAxios, 'put').mockResolvedValue({ data: payload });
        vi.spyOn(authAxios, 'patch').mockResolvedValue({ data: payload });
        const remove = vi
            .spyOn(authAxios, 'delete')
            .mockResolvedValue({ data: undefined });

        await expect(
            addUserShareEndpoint({ ticker: 'GGAL', quantity: 2 }),
        ).resolves.toBe(payload);
        await expect(updateUserShareEndpoint(7, { quantity: 3 })).resolves.toBe(
            payload,
        );
        await expect(
            updateProfileEndpoint({ risk_profile: 'Moderado' }),
        ).resolves.toBe(payload);
        await expect(
            subscribeToPortfolioAlertsEndpoint(),
        ).resolves.toBeUndefined();
        await expect(
            subscribeToTickerAlertEndpoint('GGAL'),
        ).resolves.toBeUndefined();
        await expect(
            unsubscribeFromPortfolioAlertsEndpoint(),
        ).resolves.toBeUndefined();
        await expect(
            unsubscribeFromTickerAlertEndpoint('GGAL'),
        ).resolves.toBeUndefined();
        await expect(deleteUserShareEndpoint(7)).resolves.toBeUndefined();
        await expect(
            deleteUserPreferenceEndpoint('GGAL'),
        ).resolves.toBeUndefined();
        expect(remove).toHaveBeenCalledWith(
            `${import.meta.env.VITE_SERVER_API}/user/preferences/GGAL`,
        );
    });

    test('adapts public API calls', async () => {
        const post = vi
            .spyOn(axios, 'post')
            .mockResolvedValue({ data: payload });

        await expect(
            loginEndpoint({ email: 'ana@example.com', password: 'secret' }),
        ).resolves.toBe(payload);
        await expect(
            registerEndpoint({
                email: 'ana@example.com',
                password: 'secret',
                full_name: 'Ana',
                risk_profile: 'Moderado',
            }),
        ).resolves.toBe(payload);
        await expect(shareInfoEndpoint({ share: 'GGAL' })).resolves.toBe(
            payload,
        );
        expect(post).toHaveBeenCalledTimes(3);
    });

    test('hello reports successful and failed requests and always stops loading', async () => {
        vi.spyOn(axios, 'get')
            .mockResolvedValueOnce({ data: payload })
            .mockRejectedValueOnce(new Error('offline'));
        const setter = vi.fn();
        const errorSetter = vi.fn();
        const loadingSetter = vi.fn();

        helloEndpoint(setter, errorSetter, loadingSetter);
        helloEndpoint(setter, errorSetter, loadingSetter);

        await vi.waitFor(() => expect(loadingSetter).toHaveBeenCalledTimes(2));
        expect(setter).toHaveBeenCalledWith(payload);
        expect(errorSetter).toHaveBeenCalledWith('offline');
    });
});

describe('endpoints de FinanciAr Next', () => {
    test('normalizan las respuestas del backend', async () => {
        const next = await import('../api/next/endpoints');
        const get = vi.spyOn(authAxios, 'get');
        get.mockResolvedValueOnce({ data: { ticker: 'GGAL', candles: [] } });
        await expect(next.getCandlesEndpoint('GGAL')).resolves.toEqual({
            ticker: 'GGAL',
            candles: [],
        });
        get.mockResolvedValueOnce({ data: { series: [] } });
        await expect(next.getMarketSeriesEndpoint()).resolves.toEqual({
            series: [],
        });
        get.mockResolvedValueOnce({ data: { symbol: 'GGAL' } });
        await expect(next.getExplainEndpoint('GGAL')).resolves.toEqual({
            symbol: 'GGAL',
        });
        // sin acciones el backend responde {signals: []}
        get.mockResolvedValueOnce({ data: { signals: [] } });
        await expect(next.getSignalHistoryEndpoint()).resolves.toEqual({
            rows: [],
            summary: { evaluated: 0, hits: 0, hit_rate: null },
        });
        get.mockResolvedValueOnce({ data: { services: [] } });
        await expect(next.getAdminHealthEndpoint()).resolves.toEqual({
            services: [],
        });
        get.mockResolvedValueOnce({
            data: {
                backtest: { run_at: 'r', results: { lstm: {} } },
                xgboost: { version: 'v', metrics: { oos_auc: 0.5, nota: 'x' } },
            },
        });
        await expect(next.getAdminModelsEndpoint()).resolves.toEqual({
            run_at: 'r',
            results: { lstm: {} },
            xgboost_oos: { oos_auc: 0.5 },
            xgboost_version: 'v',
        });
        get.mockResolvedValueOnce({ data: {} });
        await expect(next.getAdminModelsEndpoint()).resolves.toMatchObject({
            results: {},
            xgboost_oos: null,
        });
        get.mockResolvedValueOnce({ data: { pesos_recomendados: {} } });
        await next.getBlackLittermanEndpoint('equal_weight');
        expect(get).toHaveBeenLastCalledWith(
            expect.stringContaining('/user/shares/portfolio/recomendacion'),
            { params: { cartera_ancla: 'equal_weight' } },
        );
    });
});
