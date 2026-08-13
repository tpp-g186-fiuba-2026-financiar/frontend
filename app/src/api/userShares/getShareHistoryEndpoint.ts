import authAxios from '../authFetch';

const apiURL = `${import.meta.env.VITE_SERVER_API}/user/shares`;

export interface HistoricalPricePoint {
    ts: number;
    close: number;
}

export interface ShareHistoryResponse {
    ticker: string;
    prices: HistoricalPricePoint[];
}

export async function getShareHistoryEndpoint(
    ticker: string,
): Promise<ShareHistoryResponse> {
    const response = await authAxios.get<ShareHistoryResponse>(
        `${apiURL}/${ticker}/history`,
    );
    return response.data;
}
