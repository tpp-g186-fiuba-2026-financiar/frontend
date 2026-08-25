import authAxios from '../authFetch';
const ENDPOINT = '/user/shares';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

export interface UserShareItem {
    id: number;
    user_id: number;
    ticker: string;
    quantity: number;
    entry_price: number | null;
    created_at: string;
}

export interface UserSharesResponse {
    shares: UserShareItem[];
}

export async function getUserSharesEndpoint(): Promise<UserSharesResponse> {
    const res = await authAxios.get<UserSharesResponse>(apiURL);
    return res.data;
}
