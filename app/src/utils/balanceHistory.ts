// Helpers para el grafico de evolucion de la cartera. El back devuelve un
// punto por dia corrido; sabados y domingos repiten el ultimo cierre, asi que
// se sacan para que el grafico no tenga mesetas que no aportan nada.

import type { DailyBalancePoint } from '../api/userShares/getUserSharesBalanceHistoryEndpoint';

export type BalanceRange = '1M' | '3M' | '1A' | 'TODO';

export const BALANCE_RANGES: Array<{ value: BalanceRange; label: string }> = [
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '1A', label: '1A' },
    { value: 'TODO', label: 'Todo' },
];

const RANGE_MONTHS: Record<Exclude<BalanceRange, 'TODO'>, number> = {
    '1M': 1,
    '3M': 3,
    '1A': 12,
};

// `date` viene como YYYY-MM-DD: se interpreta en UTC para que el dia de la
// semana no dependa del huso del navegador.
function utcDate(date: string): Date {
    return new Date(`${date}T00:00:00Z`);
}

export function onlyTradingDays(
    points: DailyBalancePoint[],
): DailyBalancePoint[] {
    return points.filter((point) => {
        const day = utcDate(point.date).getUTCDay();
        return day !== 0 && day !== 6;
    });
}

// Recorta la serie a los ultimos N meses contando desde el ultimo punto.
export function sliceRange(
    points: DailyBalancePoint[],
    range: BalanceRange,
): DailyBalancePoint[] {
    if (range === 'TODO' || points.length === 0) return points;
    const from = utcDate(points[points.length - 1].date);
    from.setUTCMonth(from.getUTCMonth() - RANGE_MONTHS[range]);
    return points.filter((point) => utcDate(point.date) >= from);
}

// Resultado del periodo: cuanto cambio la ganancia/perdida no realizada entre
// el primer y el ultimo punto. Se usa en vez de la variacion del valor total
// porque esa tambien sube con cada compra, sin que la cartera haya ganado nada.
export function rangeProfitChange(points: DailyBalancePoint[]): number | null {
    if (points.length < 2) return null;
    return (
        points[points.length - 1].total_profit_loss -
        points[0].total_profit_loss
    );
}
