import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopBar from '../components/Layout/Topbar';
import type { PortfolioRow } from '../api/Portfolio';

vi.mock('./Balance', () => ({
    default: () => <div>Balance</div>,
}));
vi.mock('./Midbar', () => ({
    default: (props: Record<string, unknown>) => (
        <div data-testid="midbar">{JSON.stringify(Object.keys(props))}</div>
    ),
}));
vi.mock('./PortfolioPnl', () => ({
    default: (props: Record<string, unknown>) => (
        <div data-testid="portfolio-pnl">{JSON.stringify(props)}</div>
    ),
}));

const row: PortfolioRow = {
    ticker: 'GGAL',
    quantity: 10,
    trend: null,
    entryPrice: 100,
    currentPrice: 110,
    pnlAmount: 100,
    pnlPercentage: 10,
};

const baseProps = {
    trendsUnavailable: false,
    rows: [row],
    upCount: 1,
    withTrend: [row],
    refreshingTrends: false,
    setShowEstimacion: vi.fn(),
    setIsBuilderOpen: vi.fn(),
};

describe('TopBar', () => {
    it('calls setShowEstimacion when clicking the Black-Litterman button', async () => {
        const user = userEvent.setup();
        const setShowEstimacion = vi.fn();
        render(<TopBar {...baseProps} setShowEstimacion={setShowEstimacion} />);

        await user.click(
            screen.getByRole('button', { name: /estimación black-litterman/i }),
        );

        expect(setShowEstimacion).toHaveBeenCalledWith(true);
    });

    it('calls setIsBuilderOpen when clicking "Editar mi cartera"', async () => {
        const user = userEvent.setup();
        const setIsBuilderOpen = vi.fn();
        render(<TopBar {...baseProps} setIsBuilderOpen={setIsBuilderOpen} />);

        await user.click(
            screen.getByRole('button', { name: /editar mi cartera/i }),
        );

        expect(setIsBuilderOpen).toHaveBeenCalledWith(true);
    });
});
