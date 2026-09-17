import type { ShareTrend } from './userShares/getUserSharesTrendsEndpoint';

export interface PortfolioRow {
    ticker: string;
    quantity: number;
    trend: ShareTrend | null;
    entryPrice: number | null;
    currentPrice: number | null;
    pnlAmount: number | null;
    pnlPercentage: number | null;
}
