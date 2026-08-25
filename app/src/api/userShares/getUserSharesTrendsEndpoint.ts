import authAxios from '../authFetch';
const ENDPOINT = '/user/shares/trends';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

export interface ShareTrend {
    ticker: string;
    available: boolean;
    signal: string | null;
    condition: string | null;
    rsi: number | null;
    horizon_days: number | null;
    last_close: number | null;
    predicted_close: number | null;
    as_of: string | null;
    model: string | null;
    model_version: string | null;
    reason: string | null;
    retryable?: boolean;
}

export interface TrendsResponse {
    trends: ShareTrend[];
}

export async function getUserSharesTrendsEndpoint(): Promise<TrendsResponse> {
    const res = await authAxios.get<TrendsResponse>(apiURL);
    return res.data;
}
