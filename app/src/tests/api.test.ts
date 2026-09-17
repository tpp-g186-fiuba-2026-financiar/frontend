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
import { getUserEndpoint } from '../api/user/getUser';
import { updateProfileEndpoint } from '../api/user/updateProfile';
import { deleteUserShareEndpoint } from '../api/userShares/deleteUserShare';
import { getPortfolioRecomendacionEndpoint } from '../api/userShares/getPortfolioRecomendacionEndpoint';
import { getShareHistoryEndpoint } from '../api/userShares/getShareHistoryEndpoint';
import { getShareTrendCompareEndpoint } from '../api/userShares/getShareTrendCompareEndpoint';
import { getUserSharesBalanceEndpoint } from '../api/userShares/getUserSharesBalanceEndpoint';
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
            getPortfolioRecomendacionEndpoint(),
            getShareHistoryEndpoint('GGAL'),
            getShareTrendCompareEndpoint('GGAL'),
            getUserSharesBalanceEndpoint(),
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
        vi.spyOn(authAxios, 'delete').mockResolvedValue({ data: undefined });

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
