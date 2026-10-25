import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../api/user/getUser', () => ({ getUserEndpoint: vi.fn() }));
vi.mock('../api/shares/getAllSharesEndpoint', () => ({
    getAllSharesEndpoint: vi.fn(),
}));
vi.mock('../api/shares/getShareInfo', () => ({ shareInfoEndpoint: vi.fn() }));
vi.mock('../api/userShares/getUserSharesEndpoint', () => ({
    getUserSharesEndpoint: vi.fn(),
}));
vi.mock('../api/userShares/getUserSharesTrendsEndpoint', () => ({
    getUserSharesTrendsEndpoint: vi.fn(),
}));
vi.mock('../api/userShares/getUserSharesPnlEndpoint', () => ({
    getUserSharesPnlEndpoint: vi.fn(),
}));
vi.mock('../api/userShares/getUserSharesBalanceHistoryEndpoint', () => ({
    getUserSharesBalanceHistoryEndpoint: vi.fn().mockResolvedValue([]),
}));
vi.mock('../api/userShares/getShareHistoryEndpoint', () => ({
    getShareHistoryEndpoint: vi.fn(),
}));
vi.mock('../api/user/postUserPreference', () => ({
    postUserPreferenceEndpoint: vi.fn(),
}));
vi.mock('../api/userShares/getShareTrendCompareEndpoint', () => ({
    getShareTrendCompareEndpoint: vi.fn(),
}));
vi.mock('../api/userShares/postUserShare', () => ({
    addUserShareEndpoint: vi.fn(),
}));
vi.mock('../api/userShares/putUserShare', () => ({
    updateUserShareEndpoint: vi.fn(),
}));
vi.mock('../api/userShares/deleteUserShare', () => ({
    deleteUserShareEndpoint: vi.fn(),
}));
vi.mock('../api/subscriptions/getUserAlertSubscriptions', () => ({
    getUserAlertSubscriptionsEndpoint: vi.fn(),
}));
vi.mock('../api/subscriptions/portfolioAlertSubscription', () => ({
    subscribeToPortfolioAlertsEndpoint: vi.fn(),
    unsubscribeFromPortfolioAlertsEndpoint: vi.fn(),
}));
vi.mock('../api/subscriptions/tickerAlertSubscription', () => ({
    subscribeToTickerAlertEndpoint: vi.fn(),
    unsubscribeFromTickerAlertEndpoint: vi.fn(),
}));
vi.mock('../api/user/updateProfile', () => ({
    updateProfileEndpoint: vi.fn(),
}));
vi.mock('../api/login', () => ({ loginEndpoint: vi.fn() }));
vi.mock('../api/register', () => ({ registerEndpoint: vi.fn() }));

import { getUserEndpoint } from '../api/user/getUser';
import { getAllSharesEndpoint } from '../api/shares/getAllSharesEndpoint';
import { shareInfoEndpoint } from '../api/shares/getShareInfo';
import { getUserSharesEndpoint } from '../api/userShares/getUserSharesEndpoint';
import { getUserSharesTrendsEndpoint } from '../api/userShares/getUserSharesTrendsEndpoint';
import { getUserSharesPnlEndpoint } from '../api/userShares/getUserSharesPnlEndpoint';
import { getShareHistoryEndpoint } from '../api/userShares/getShareHistoryEndpoint';
import { postUserPreferenceEndpoint } from '../api/user/postUserPreference';
import { getShareTrendCompareEndpoint } from '../api/userShares/getShareTrendCompareEndpoint';
import { addUserShareEndpoint } from '../api/userShares/postUserShare';
import { updateUserShareEndpoint } from '../api/userShares/putUserShare';
import { deleteUserShareEndpoint } from '../api/userShares/deleteUserShare';
import { getUserAlertSubscriptionsEndpoint } from '../api/subscriptions/getUserAlertSubscriptions';
import {
    subscribeToPortfolioAlertsEndpoint,
    unsubscribeFromPortfolioAlertsEndpoint,
} from '../api/subscriptions/portfolioAlertSubscription';
import {
    subscribeToTickerAlertEndpoint,
    unsubscribeFromTickerAlertEndpoint,
} from '../api/subscriptions/tickerAlertSubscription';
import { updateProfileEndpoint } from '../api/user/updateProfile';
import { loginEndpoint } from '../api/login';
import { registerEndpoint } from '../api/register';

import PortfolioBuilder from '../components/Portfolio/PortfolioBuilder';
import LoginPopUp from '../components/Login/LoginPopUp';
import SignUpPopUp from '../components/SignUp/SignUpPopUp';
import TickerTape from '../components/Layout/TickerTape';

const mocked = <T,>(value: T) => vi.mocked(value);

const shares = [
    {
        id: 1,
        user_id: 7,
        ticker: 'GGAL',
        quantity: 10,
        entry_price: 100,
        created_at: '2026-01-01',
    },
    {
        id: 2,
        user_id: 7,
        ticker: 'YPFD',
        quantity: 5,
        entry_price: null,
        created_at: '2026-01-02',
    },
];

const trend = {
    ticker: 'GGAL',
    available: true,
    signal: 'alza',
    condition: 'neutral',
    rsi: 55,
    horizon_days: 5,
    last_close: 120,
    predicted_close: 132,
    as_of: '2026-09-16',
    model: 'lstm',
    model_version: 'v1',
    reason: null,
};

const unavailableTrend = {
    ...trend,
    ticker: 'YPFD',
    available: false,
    signal: null,
    reason: 'preparando modelo',
    retryable: false,
};

const history = Array.from({ length: 40 }, (_, index) => ({
    ts: Date.UTC(2026, 0, index + 1),
    close: 100 + index,
}));

function setupHappyApis() {
    mocked(getUserEndpoint).mockResolvedValue({
        id: 7,
        email: 'ana@example.com',
        full_name: 'Ana Pérez',
        risk_profile: 'moderate',
        is_active: true,
        two_factor_enabled: false,
        created_at: '2026-01-01',
    });
    mocked(getAllSharesEndpoint).mockResolvedValue({
        shares: [
            { id: 1, ticker: 'GGAL', predictable: true },
            { id: 2, ticker: 'YPFD', predictable: true },
            { id: 3, ticker: 'AAPL', predictable: false },
        ],
    });
    mocked(getUserSharesEndpoint).mockResolvedValue({ shares });
    mocked(getUserSharesTrendsEndpoint).mockResolvedValue({
        trends: [trend, unavailableTrend],
    });
    mocked(getUserSharesPnlEndpoint).mockResolvedValue({
        shares: [
            {
                id: 1,
                ticker: 'GGAL',
                quantity: 10,
                entry_price: 100,
                current_price: 120,
                pnl_amount: 200,
                pnl_percentage: 20,
                weight_percentage: 75,
            },
            {
                id: 2,
                ticker: 'YPFD',
                quantity: 5,
                entry_price: null,
                current_price: 80,
                pnl_amount: null,
                pnl_percentage: null,
                weight_percentage: 25,
            },
        ],
        portfolio: {
            total_invested: 1000,
            total_current_value: 1600,
            total_pnl_amount: 200,
            total_pnl_percentage: 20,
        },
    });
    mocked(getShareHistoryEndpoint).mockResolvedValue({
        ticker: 'GGAL',
        prices: history,
    });
    mocked(postUserPreferenceEndpoint).mockResolvedValue(undefined);
    mocked(shareInfoEndpoint).mockResolvedValue({
        cached: true,
        data: [],
        status: 200,
        ticker_info: {
            descripcion: 'Banco argentino de prueba',
            nombre_corto: 'Grupo Galicia',
            nombre_largo: 'Grupo Financiero Galicia S.A.',
        },
    });
    mocked(getShareTrendCompareEndpoint).mockResolvedValue({
        symbol: 'GGAL',
        as_of: '2026-09-16',
        default_model: 'lstm-modal',
        predictions: {
            'lstm-modal': {
                available: true,
                signal: 'alza',
                condition: 'neutral',
                rsi: 55,
                horizon_days: 5,
                last_close: 120,
                predicted_close: 132,
                as_of: '2026-09-16',
                model: 'svm-modal',
                model_version: 'v1',
                backtest: {
                    directional_accuracy: 0.7,
                    mae: 0.03,
                    observations: 2,
                    series: [
                        { date: '2026-09-15', predicted: 119, actual: 121 },
                        { date: '2026-09-16', predicted: 125, actual: 124 },
                    ],
                    avg_strategy_return_pct: 4.5,
                    avg_buy_hold_return_pct: 1.2,
                },
                volatility_forecast: null,
                reason: null,
            },
            'transformer-modal': {
                available: true,
                signal: 'baja',
                condition: 'neutral',
                rsi: 45,
                horizon_days: 5,
                last_close: 120,
                predicted_close: 114,
                as_of: '2026-09-16',
                model: 'transformer-modal',
                model_version: 'v1',
                backtest: null,
                volatility_forecast: null,
                reason: null,
            },
            'garch-modal': {
                available: false,
                signal: null,
                condition: null,
                rsi: null,
                horizon_days: null,
                last_close: null,
                predicted_close: null,
                as_of: null,
                model: 'garch-modal',
                model_version: 'v1',
                backtest: null,
                volatility_forecast: [
                    { horizon_days: 1, volatility_pct: 3 },
                    { horizon_days: 2, volatility_pct: 4 },
                ],
                reason: 'GARCH proyecta volatilidad, no una direccion',
            },
            garch: {
                available: true,
                signal: null,
                condition: null,
                rsi: null,
                horizon_days: 5,
                last_close: 120,
                predicted_close: null,
                as_of: '2026-09-16',
                model: 'garch',
                model_version: 'v1',
                backtest: null,
                volatility_forecast: [
                    { horizon_days: 1, volatility_pct: 1.2 },
                    { horizon_days: 5, volatility_pct: 2.4 },
                ],
                reason: null,
            },
        },
    });
    mocked(addUserShareEndpoint).mockResolvedValue({
        id: 3,
        user_id: 7,
        ticker: 'PAMP',
        quantity: 1,
        entry_price: null,
        creater_at: new Date(),
    });
    mocked(updateUserShareEndpoint).mockResolvedValue({
        ...shares[0],
        quantity: 11,
    });
    mocked(deleteUserShareEndpoint).mockResolvedValue(undefined);
    mocked(getUserAlertSubscriptionsEndpoint).mockResolvedValue({
        portfolio: false,
        tickers: ['GGAL'],
    });
    mocked(subscribeToPortfolioAlertsEndpoint).mockResolvedValue(undefined);
    mocked(unsubscribeFromPortfolioAlertsEndpoint).mockResolvedValue(undefined);
    mocked(subscribeToTickerAlertEndpoint).mockResolvedValue(undefined);
    mocked(unsubscribeFromTickerAlertEndpoint).mockResolvedValue(undefined);
    mocked(updateProfileEndpoint).mockResolvedValue({
        code: 200,
        message: 'ok',
    });
    mocked(loginEndpoint).mockResolvedValue({
        code: 200,
        message: 'ok',
        token: 'jwt',
    });
    mocked(registerEndpoint).mockResolvedValue({ code: 200, message: 'ok' });
}

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupHappyApis();
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: vi.fn(() => ({
            matches: true,
            addListener: vi.fn(),
            removeListener: vi.fn(),
        })),
    });
    const gradient = { addColorStop: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        scale: vi.fn(),
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        arc: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        fillText: vi.fn(),
        setLineDash: vi.fn(),
        createLinearGradient: vi.fn(() => gradient),
        lineWidth: 1,
        strokeStyle: '',
        fillStyle: '',
        font: '',
        textAlign: 'start',
    } as unknown as CanvasRenderingContext2D);
});

test('PortfolioBuilder validates, adds, updates, removes and clears positions', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const { rerender } = render(
        <PortfolioBuilder isOpen={true} onClose={onClose} onSaved={onSaved} />,
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('GGAL')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByPlaceholderText('Buscar ticker...'), {
        target: { value: 'ZZZ' },
    });
    expect(within(dialog).getByText(/No hay tickers/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByPlaceholderText('Buscar ticker...'), {
        target: { value: '' },
    });

    fireEvent.click(within(dialog).getByLabelText(/Sumar una unidad de GGAL/));
    const ggalRow = within(dialog).getByText('GGAL').closest('.builder-row')!;
    fireEvent.change(
        within(ggalRow as HTMLElement).getByPlaceholderText(
            'Precio de entrada',
        ),
        {
            target: { value: '110' },
        },
    );
    fireEvent.click(
        within(dialog).getByRole('button', { name: /Guardar cartera/ }),
    );
    await waitFor(() => expect(updateUserShareEndpoint).toHaveBeenCalled());

    rerender(
        <PortfolioBuilder isOpen={true} onClose={onClose} onSaved={onSaved} />,
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(
        await screen.findByRole('button', { name: /Vaciar cartera/ }),
    );
    await waitFor(() => expect(deleteUserShareEndpoint).toHaveBeenCalled());
});

test('ticker tape renders the portfolio tickers', async () => {
    render(<TickerTape />);
    expect((await screen.findAllByText('GGAL')).length).toBeGreaterThan(0);
});

describe('authentication popups', () => {
    test('logs in and stores the token', async () => {
        const onClose = vi.fn();
        render(
            <MemoryRouter>
                <LoginPopUp isOpen={true} onClose={onClose} />
            </MemoryRouter>,
        );
        fireEvent.change(screen.getByPlaceholderText('vos@ejemplo.com'), {
            target: { value: 'ana@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'Strong123!' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
        await waitFor(() => expect(localStorage.getItem('token')).toBe('jwt'));
        expect(onClose).toHaveBeenCalled();
    });

    test('walks through signup questionnaire, terms and form', async () => {
        const onClose = vi.fn();
        render(<SignUpPopUp isOpen={true} onClose={onClose} />);
        for (let index = 0; index < 9; index += 1) {
            const options = screen.getAllByRole('radio');
            fireEvent.click(options[0]);
            fireEvent.click(
                screen.getByRole('button', {
                    name: index === 8 ? 'Finalizar' : 'Siguiente',
                }),
            );
        }
        const termsText = screen.getByText(
            (_, element) =>
                element?.tagName === 'P' &&
                Boolean(
                    element.textContent?.includes('El acceso a este Sitio'),
                ),
        );
        const termsScroll = termsText.parentElement!.parentElement!;
        Object.defineProperties(termsScroll, {
            scrollTop: { configurable: true, value: 1000 },
            scrollHeight: { configurable: true, value: 1000 },
            clientHeight: { configurable: true, value: 200 },
        });
        fireEvent.scroll(termsScroll);
        fireEvent.click(screen.getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: /Continuar/ }));
        fireEvent.change(screen.getByPlaceholderText('Juan Pérez'), {
            target: { value: 'Ana' },
        });
        fireEvent.change(screen.getByPlaceholderText('vos@ejemplo.com'), {
            target: { value: 'ana@example.com' },
        });
        const passwordInputs = screen.getAllByPlaceholderText('••••••••');
        fireEvent.change(passwordInputs[0], {
            target: { value: 'Strong123!' },
        });
        fireEvent.change(passwordInputs[1], {
            target: { value: 'Strong123!' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
        await waitFor(() => expect(registerEndpoint).toHaveBeenCalled());
        expect(
            await screen.findByText(/Te enviamos un mail a/),
        ).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
        expect(onClose).toHaveBeenCalled();
    });
});
