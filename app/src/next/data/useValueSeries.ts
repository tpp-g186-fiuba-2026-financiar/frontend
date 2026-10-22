import { useMemo } from 'react';
import { usePortfolio } from './PortfolioContext';
import { portfolioSeries } from '../finance';

export interface ValuePoint {
    date: string;
    value: number;
    cost: number | null;
}

const MIN_DAYS = 20;

export function useValueSeries(): { points: ValuePoint[]; simulated: boolean } {
    const { balanceHistory, holdings, history } = usePortfolio();
    return useMemo(() => {
        const real = balanceHistory.filter((p) => p.total_current_value > 0);
        if (real.length >= MIN_DAYS) {
            return {
                simulated: false,
                points: real.map((p) => ({
                    date: p.date,
                    value: p.total_current_value,
                    cost: p.total_cost_basis,
                })),
            };
        }
        const { dates, values } = portfolioSeries(holdings, history);
        return {
            simulated: true,
            points: dates.map((d, k) => ({
                date: new Date(d).toISOString(),
                value: values[k],
                cost: null,
            })),
        };
    }, [balanceHistory, holdings, history]);
}
