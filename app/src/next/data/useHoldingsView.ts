import { useMemo } from 'react';
import { usePortfolio, type Holding } from './PortfolioContext';
import {
    changeOver,
    confidenceLevel,
    modelLabel,
    normalizeSignal,
    probabilityOf,
    probabilityUp,
    upBaseRate,
    type Signal,
} from '../finance';

export interface HoldingView extends Holding {
    closes: number[];
    price: number | null;
    value: number | null;
    cost: number | null;
    share: number;
    week: number | null;
    signal: Signal | null;
    prob: number | null;
    probModel: string | null;
    base: number | null;
    conf: 1 | 2 | 3;
    model: string | null;
}

export function useHoldingsView() {
    const { holdings, history, compare, pnl } = usePortfolio();
    return useMemo(() => {
        const base = holdings.map((h) => {
            const closes = history[h.ticker]?.map((p) => p.close) ?? [];
            const price =
                h.currentPrice ??
                (closes.length ? closes[closes.length - 1] : null);
            const value = price != null ? price * h.quantity : null;
            const cost =
                h.entryPrice != null ? h.entryPrice * h.quantity : null;
            const own = probabilityOf(h.trend);
            const prob = own ?? probabilityUp(compare[h.ticker]);
            const probModel =
                prob == null
                    ? null
                    : own != null
                      ? (h.trend?.model ?? null)
                      : 'xgboost';
            const baseRate = upBaseRate(closes);
            return {
                ...h,
                closes,
                price,
                value,
                cost,
                share: 0,
                week: changeOver(closes, 5),
                signal: h.trend?.available
                    ? normalizeSignal(h.trend.signal)
                    : null,
                prob,
                probModel: probModel ? modelLabel(probModel) : null,
                base: baseRate,
                conf: confidenceLevel(compare[h.ticker], prob, baseRate ?? 0.5),
                model: h.trend?.model ?? null,
            } satisfies HoldingView;
        });
        const totalValue =
            pnl?.total_current_value ??
            base.reduce((s, h) => s + (h.value ?? 0), 0);
        const totalCost =
            pnl?.total_invested ?? base.reduce((s, h) => s + (h.cost ?? 0), 0);
        const sumValues = base.reduce((s, h) => s + (h.value ?? 0), 0);
        const rows = base.map((h) => ({
            ...h,
            share:
                h.weight != null
                    ? h.weight / 100
                    : sumValues > 0
                      ? (h.value ?? 0) / sumValues
                      : 0,
        }));
        const weekAmount = rows.reduce((s, h) => {
            if (h.week == null || h.value == null) return s;
            return s + h.value - h.value / (1 + h.week / 100);
        }, 0);
        const hasWeek = rows.some((h) => h.week != null);
        const weekPct =
            hasWeek && totalValue - weekAmount > 0
                ? (weekAmount / (totalValue - weekAmount)) * 100
                : null;
        const withProb = rows.filter((h) => h.prob != null);
        const probShare = withProb.reduce((s, h) => s + h.share, 0);
        const portfolioProb =
            withProb.length === 0
                ? null
                : probShare > 0
                  ? withProb.reduce((s, h) => s + h.prob! * h.share, 0) /
                    probShare
                  : withProb.reduce((s, h) => s + h.prob!, 0) / withProb.length;
        return {
            rows,
            totalValue,
            totalCost,
            weekAmount,
            weekPct,
            portfolioProb,
        };
    }, [holdings, history, compare, pnl]);
}
