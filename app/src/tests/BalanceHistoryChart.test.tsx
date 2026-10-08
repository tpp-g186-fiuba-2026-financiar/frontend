import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BalanceHistoryChart from '../components/Portfolio/BalanceHistoryChart';
import { getUserSharesBalanceHistoryEndpoint } from '../api/userShares/getUserSharesBalanceHistoryEndpoint';

vi.mock('../api/userShares/getUserSharesBalanceHistoryEndpoint', () => ({
    getUserSharesBalanceHistoryEndpoint: vi.fn(),
}));

const mockedHistory = vi.mocked(getUserSharesBalanceHistoryEndpoint);

function point(date: string, value: number, cost: number) {
    return {
        date,
        total_current_value: value,
        total_cost_basis: cost,
        total_profit_loss: value - cost,
    };
}

const history = [
    point('2026-05-04', 1000, 1000),
    point('2026-09-07', 1200, 1000),
    point('2026-10-05', 1150, 1000),
    point('2026-10-08', 1300, 1000),
];

const ctx = {
    scale: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    lineWidth: 1,
    lineJoin: 'miter',
    strokeStyle: '',
    fillStyle: '',
    font: '',
    textAlign: 'start',
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        ctx as unknown as CanvasRenderingContext2D,
    );
});

describe('BalanceHistoryChart', () => {
    it('muestra el grafico de los ultimos 3 meses y deja cambiar el rango', async () => {
        const user = userEvent.setup();
        mockedHistory.mockResolvedValue(history);
        render(<BalanceHistoryChart />);

        expect(screen.getByText(/cargando evolución/i)).toBeInTheDocument();
        const canvas = await screen.findByRole('img');
        expect(canvas).toHaveAccessibleName(/entre 2026-09-07 y 2026-10-08/);
        expect(screen.getByText('+$100')).toBeInTheDocument();
        expect(ctx.setLineDash).toHaveBeenCalledWith([5, 4]);
        expect(ctx.fillText).toHaveBeenCalledWith(
            '08/10/26',
            expect.any(Number),
            expect.any(Number),
        );

        await user.click(screen.getByRole('button', { name: 'Todo' }));
        expect(screen.getByRole('img')).toHaveAccessibleName(
            /entre 2026-05-04 y 2026-10-08/,
        );
        expect(screen.getByText('+$300')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Todo' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );

        await user.click(screen.getByRole('button', { name: '1M' }));
        expect(screen.getByRole('img')).toHaveAccessibleName(
            /entre 2026-10-05 y 2026-10-08/,
        );
    });

    it('muestra el resultado negativo en rojo', async () => {
        mockedHistory.mockResolvedValue([
            point('2026-10-07', 1000, 1000),
            point('2026-10-08', 900, 1000),
        ]);
        render(<BalanceHistoryChart />);
        const result = await screen.findByText('−$100');
        expect(result).toHaveStyle({ color: 'var(--down)' });
    });

    it('avisa cuando no hay historial suficiente', async () => {
        // Un solo dia habil: el sabado se descarta
        mockedHistory.mockResolvedValue([
            point('2026-10-09', 1000, 1000),
            point('2026-10-10', 1000, 1000),
        ]);
        render(<BalanceHistoryChart />);
        expect(
            await screen.findByText(/no hay suficiente historial/i),
        ).toBeInTheDocument();
        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('muestra un error si el endpoint falla', async () => {
        mockedHistory.mockRejectedValue(new Error('502'));
        render(<BalanceHistoryChart />);
        expect(
            await screen.findByText(/no se pudo cargar la evolución/i),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('group', { name: /rango/i }),
        ).not.toBeInTheDocument();
    });

    it('vuelve a pedir el historial cuando cambia reloadKey', async () => {
        mockedHistory.mockResolvedValue(history);
        const { rerender } = render(<BalanceHistoryChart reloadKey={0} />);
        await screen.findByRole('img');
        rerender(<BalanceHistoryChart reloadKey={1} />);
        await waitFor(() => expect(mockedHistory).toHaveBeenCalledTimes(2));
    });
});
