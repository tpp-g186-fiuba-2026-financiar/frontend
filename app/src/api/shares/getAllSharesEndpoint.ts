import authAxios from '../authFetch';
const ENDPOINT = '/shares';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

interface Share {
    id: number;
    ticker: string;
}

export interface SharesResponse {
    shares: Share[];
}

export async function getAllSharesEndpoint(): Promise<SharesResponse> {
    const res = await authAxios.get<SharesResponse>(apiURL);
    return res.data;
}
