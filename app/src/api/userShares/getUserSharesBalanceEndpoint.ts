import authAxios from '../authFetch';
const ENDPOINT = '/user/shares/balance';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

export interface UserShareBalanceItem {
    ticker: string;
    quantity: number;
    entry_price: number | null;
    current_price: number | null;
    current_value: number | null;
    cost_basis: number | null;
    profit_loss: number | null;
    profit_loss_percent: number | null;
}

export interface UserSharesBalanceResponse {
    shares: UserShareBalanceItem[];
    total_cost_basis: number | null;
    total_current_value: number;
    total_profit_loss: number | null;
    total_profit_loss_percent: number | null;
}

export async function getUserSharesBalanceEndpoint(): Promise<UserSharesBalanceResponse> {
    const res = await authAxios.get<UserSharesBalanceResponse>(apiURL);
    return res.data;
}
