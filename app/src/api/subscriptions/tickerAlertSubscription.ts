import authAxios from '../authFetch';

const ENDPOINT = '/user/alerts/subscriptions';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

export async function subscribeToTickerAlertEndpoint(
    ticker: string,
): Promise<void> {
    await authAxios.post(`${apiURL}/${ticker}`);
}

export async function unsubscribeFromTickerAlertEndpoint(
    ticker: string,
): Promise<void> {
    await authAxios.delete(`${apiURL}/${ticker}`);
}
