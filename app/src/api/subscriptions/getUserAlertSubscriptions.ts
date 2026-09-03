import authAxios from '../authFetch';

const ENDPOINT = '/user/alerts/subscriptions';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

export interface AlertSubscriptions {
    portfolio: boolean;
    tickers: string[];
}

export async function getUserAlertSubscriptionsEndpoint(): Promise<AlertSubscriptions> {
    const res = await authAxios.get<AlertSubscriptions>(apiURL);
    return res.data;
}
