import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DefaultModelsSettings from '../components/settings/DefaultModelsSettings';
import { getUserSharesEndpoint } from '../api/userShares/getUserSharesEndpoint';
import { getTrendsCompareEndpoint } from '../api/userShares/getShareTrendsCompare';

vi.mock('../api/userShares/getUserSharesEndpoint', () => ({
    getUserSharesEndpoint: vi.fn(),
}));
vi.mock('../api/userShares/getShareTrendsCompare', () => ({
    getTrendsCompareEndpoint: vi.fn(),
}));

const compare = (lstm: number, xgb: number) =>
    ({
        symbol: 'GGAL',
        as_of: '2026-09-29',
        default_model: 'lstm',
        predictions: {
            lstm: { available: true, backtest: { directional_accuracy: lstm } },
            xgboost: {
                available: true,
                backtest: { directional_accuracy: xgb },
            },
            arima: {
                available: false,
                reason: 'sin datos',
                backtest: null,
            },
        },
    }) as never;

function mockShares(tickers: string[]) {
    vi.mocked(getUserSharesEndpoint).mockResolvedValue({
        shares: tickers.map((ticker) => ({ ticker })),
    } as never);
}

beforeEach(() => {
    localStorage.clear();
    vi.mocked(getUserSharesEndpoint).mockReset();
    vi.mocked(getTrendsCompareEndpoint).mockReset();
});

describe('DefaultModelsSettings', () => {
    it('shows an empty state when the user has no shares', async () => {
        mockShares([]);
        render(<DefaultModelsSettings />);
        expect(
            await screen.findByText(/No tenés acciones cargadas/),
        ).toBeInTheDocument();
    });

    it('shows an error when shares cannot be loaded', async () => {
        vi.mocked(getUserSharesEndpoint).mockRejectedValue(new Error('boom'));
        render(<DefaultModelsSettings />);
        expect(
            await screen.findByText('No pudimos cargar los modelos.'),
        ).toBeInTheDocument();
    });

    it('marks the best model of each ticker and falls back when compare fails', async () => {
        mockShares(['GGAL', 'YPFD']);
        vi.mocked(getTrendsCompareEndpoint).mockImplementation(async (t) => {
            if (t === 'YPFD') throw new Error('down');
            return compare(0.55, 0.62);
        });
        render(<DefaultModelsSettings />);

        expect(
            await screen.findByText('Elegido: xgboost (mejor)'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('No pudimos cargar los modelos'),
        ).toBeInTheDocument();
    });

    it('lets the user override a ticker once the global toggles are off', async () => {
        const user = userEvent.setup();
        mockShares(['GGAL']);
        vi.mocked(getTrendsCompareEndpoint).mockResolvedValue(
            compare(0.55, 0.62),
        );
        render(<DefaultModelsSettings />);
        await screen.findByText('Elegido: xgboost (mejor)');

        // useBest arranca prendido: apagarlo habilita la elección por acción
        await user.click(
            screen.getByRole('switch', {
                name: 'Usar el mejor modelo para cada acción',
            }),
        );
        await user.click(screen.getByRole('button', { name: /GGAL/ }));
        await user.click(screen.getAllByRole('radio', { name: /lstm/ })[0]);

        await waitFor(() =>
            expect(screen.getByText('Elegido: lstm')).toBeInTheDocument(),
        );
        expect(
            JSON.parse(localStorage.getItem('defaultModelsConfig') ?? '{}')
                .perTicker,
        ).toEqual({ GGAL: 'lstm' });
    });

    it('uses the same model for every share, excluding the other toggle', async () => {
        const user = userEvent.setup();
        mockShares(['GGAL']);
        vi.mocked(getTrendsCompareEndpoint).mockResolvedValue(
            compare(0.55, 0.62),
        );
        render(<DefaultModelsSettings />);
        await screen.findByText('Elegido: xgboost (mejor)');

        const useSame = screen.getByRole('switch', {
            name: 'Usar el mismo modelo para todas las acciones',
        });
        await user.click(useSame);
        expect(useSame).toHaveAttribute('aria-checked', 'true');
        expect(
            screen.getByRole('switch', {
                name: 'Usar el mejor modelo para cada acción',
            }),
        ).toHaveAttribute('aria-checked', 'false');

        await user.click(
            screen.getByRole('button', {
                name: /Modelo para todas las acciones/,
            }),
        );
        await user.click(screen.getAllByRole('radio', { name: /xgboost/ })[0]);
        expect(
            await screen.findByText('Todas las acciones usan xgboost'),
        ).toBeInTheDocument();

        // volver a tocarlo lo apaga
        await user.click(useSame);
        expect(useSame).toHaveAttribute('aria-checked', 'false');
    });
});
