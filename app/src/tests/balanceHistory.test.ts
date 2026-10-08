import { describe, expect, it } from 'vitest';
import type { DailyBalancePoint } from '../api/userShares/getUserSharesBalanceHistoryEndpoint';
import {
    onlyTradingDays,
    rangeProfitChange,
    sliceRange,
} from '../utils/balanceHistory';

function point(date: string, value = 100, cost = 90): DailyBalancePoint {
    return {
        date,
        total_current_value: value,
        total_cost_basis: cost,
        total_profit_loss: value - cost,
    };
}

describe('onlyTradingDays', () => {
    it('saca sabados y domingos', () => {
        // 2026-10-02 es viernes
        const points = [
            point('2026-10-02'),
            point('2026-10-03'),
            point('2026-10-04'),
            point('2026-10-05'),
        ];
        expect(onlyTradingDays(points).map((p) => p.date)).toEqual([
            '2026-10-02',
            '2026-10-05',
        ]);
    });
});

describe('sliceRange', () => {
    const points = [
        point('2025-09-01'),
        point('2026-06-01'),
        point('2026-08-10'),
        point('2026-09-08'),
        point('2026-10-08'),
    ];

    it('devuelve todo con TODO o sin puntos', () => {
        expect(sliceRange(points, 'TODO')).toBe(points);
        expect(sliceRange([], '1M')).toEqual([]);
    });

    it('recorta contando desde el ultimo punto', () => {
        expect(sliceRange(points, '1M').map((p) => p.date)).toEqual([
            '2026-09-08',
            '2026-10-08',
        ]);
        expect(sliceRange(points, '3M').map((p) => p.date)).toEqual([
            '2026-08-10',
            '2026-09-08',
            '2026-10-08',
        ]);
        expect(sliceRange(points, '1A')).toHaveLength(4);
    });
});

describe('rangeProfitChange', () => {
    it('es null con menos de dos puntos', () => {
        expect(rangeProfitChange([])).toBeNull();
        expect(rangeProfitChange([point('2026-10-01')])).toBeNull();
    });

    it('resta la ganancia no realizada del primer punto a la del ultimo', () => {
        // Entre medio se compro: el valor sube 1000 pero el resultado solo 15
        expect(
            rangeProfitChange([
                point('2026-10-01', 100, 90),
                point('2026-10-02', 1100, 1075),
            ]),
        ).toBe(15);
    });
});
