import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import VolatilityPanel from '../next/ui/VolatilityPanel';
import type { VolatilityForecast } from '../api/next/endpoints';

const vol: VolatilityForecast = {
    symbol: 'GGAL',
    horizon_days: 20,
    daily_volatility_pct: Array.from({ length: 20 }, (_, i) => 4 - i * 0.02),
    cumulative_volatility_pct: 10,
    last_close: 5000,
    as_of: '2026-10-28',
    regime: {
        daily_pct: 4,
        long_run_daily_pct: 3,
        percentile: 82,
        level: 'alta',
        persistence: 0.96,
    },
    backtest: {
        horizon_days: 20,
        windows: Array.from({ length: 8 }, (_, i) => ({
            as_of: `2026-0${(i % 9) + 1}-01`,
            forecast_pct: 10,
            naive_pct: 9,
            realized_pct: 8,
            return_pct: i === 3 ? -14 : 3,
        })),
        inside_68_pct: 87.5,
        inside_95_pct: 100,
        corr_garch: 0.4,
        corr_naive: 0.45,
        mae_garch_pct: 2,
        mae_naive_pct: 1.8,
    },
};

describe('VolatilityPanel', () => {
    test('régimen, posición, ruido y backtest', () => {
        render(
            <VolatilityPanel
                vol={vol}
                last={5000}
                position={100000}
                view={{ name: 'LSTM', ret: 0.02, h: 5 }}
            />,
        );
        expect(screen.getByText('Agitada')).toBeInTheDocument();
        expect(
            screen.getByText(/Su nivel habitual es ±3,0%/),
        ).toBeInTheDocument();
        // ±1 desvío de 10% sobre una posición de $100.000
        expect(screen.getByText(/podría perder hasta/)).toHaveTextContent(
            /\$\s?9\.516/,
        );
        fireEvent.click(screen.getByRole('button', { name: '95%' }));
        expect(screen.getByText(/podría perder hasta/)).toHaveTextContent(
            /\$\s?17\.799/,
        );
        expect(screen.getByText(/desvíos/).closest('p')).toHaveTextContent(
            /0,22 desvíos: es chica/,
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Ventana desde 2026-04-01' }),
        );
        expect(screen.getByText(/la acción hizo -14,0%/)).toBeInTheDocument();
    });

    test('sin precio esperado no compara contra el ruido', () => {
        render(
            <VolatilityPanel
                vol={{ ...vol, backtest: null, regime: null }}
                last={5000}
                position={null}
                view={{ name: 'XGBoost', ret: 0, h: 20 }}
            />,
        );
        expect(screen.queryByText(/desvíos/)).not.toBeInTheDocument();
        expect(
            screen.queryByText(/Cómo le fue a GARCH/),
        ).not.toBeInTheDocument();
        expect(screen.getByText(/Precio en 20 ruedas/)).toBeInTheDocument();
    });
});
