import authAxios from '../authFetch';

const ENDPOINT = '/user/alerts/subscriptions/portfolio';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

export async function subscribeToPortfolioAlertsEndpoint(): Promise<void> {
    await authAxios.post(apiURL);
}

export async function unsubscribeFromPortfolioAlertsEndpoint(): Promise<void> {
    await authAxios.delete(apiURL);
}
