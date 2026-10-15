import authAxios from '../authFetch';
const ENDPOINT = '/user/shares/balance/history';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

// Un punto por dia corrido (UTC), desde la primera operacion hasta hoy.
export interface DailyBalancePoint {
    date: string;
    total_current_value: number;
    total_cost_basis: number;
    total_profit_loss: number;
}

export async function getUserSharesBalanceHistoryEndpoint(): Promise<
    DailyBalancePoint[]
> {
    const res = await authAxios.get<DailyBalancePoint[]>(apiURL);
    return res.data;
}
