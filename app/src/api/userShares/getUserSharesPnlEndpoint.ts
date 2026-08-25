import authAxios from '../authFetch';
const ENDPOINT = '/user/shares/pnl';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

export interface SharePnlItem {
    id: number;
    ticker: string;
    quantity: number;
    entry_price: number | null;
    current_price: number | null;
    pnl_amount: number | null;
    pnl_percentage: number | null;
}

export interface PortfolioPnlSummary {
    total_invested: number;
    total_current_value: number;
    total_pnl_amount: number;
    total_pnl_percentage: number | null;
}

export interface PnlResponse {
    shares: SharePnlItem[];
    portfolio: PortfolioPnlSummary;
}

export async function getUserSharesPnlEndpoint(): Promise<PnlResponse> {
    const res = await authAxios.get<PnlResponse>(apiURL);
    return res.data;
}
