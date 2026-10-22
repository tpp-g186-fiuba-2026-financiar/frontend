import { act, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('../api/user/getUser', () => ({ getUserEndpoint: vi.fn() }));
vi.mock('../api/userShares/getUserSharesEndpoint', () => ({ getUserSharesEndpoint: vi.fn() }));
vi.mock('../api/userShares/getUserSharesTrendsEndpoint', () => ({ getUserSharesTrendsEndpoint: vi.fn() }));
vi.mock('../api/userShares/getUserSharesPnlEndpoint', () => ({ getUserSharesPnlEndpoint: vi.fn() }));
vi.mock('../api/userShares/getShareTrendCompareEndpoint', () => ({ getShareTrendCompareEndpoint: vi.fn() }));
vi.mock('../api/userShares/getShareHistoryEndpoint', () => ({ getShareHistoryEndpoint: vi.fn() }));
vi.mock('../api/userShares/getUserSharesBalanceHistoryEndpoint', () => ({ getUserSharesBalanceHistoryEndpoint: vi.fn() }));
vi.mock('../api/shares/getShareInfo', () => ({ shareInfoEndpoint: vi.fn() }));
vi.mock('../api/shares/getShareSector', () => ({ shareSectorEndpoint: vi.fn().mockResolvedValue({ sector: 'Financials' }) }));
vi.mock('../api/subscriptions/getUserAlertSubscriptions', () => ({ getUserAlertSubscriptionsEndpoint: vi.fn() }));
vi.mock('../api/subscriptions/portfolioAlertSubscription', () => ({
    subscribeToPortfolioAlertsEndpoint: vi.fn(),
    unsubscribeFromPortfolioAlertsEndpoint: vi.fn(),
}));
vi.mock('../api/subscriptions/tickerAlertSubscription', () => ({
    subscribeToTickerAlertEndpoint: vi.fn(),
    unsubscribeFromTickerAlertEndpoint: vi.fn(),
}));
vi.mock('../api/next/endpoints', () => ({
    getCandlesEndpoint: vi.fn(),
    getMarketSeriesEndpoint: vi.fn(),
    getExplainEndpoint: vi.fn(),
    getSignalHistoryEndpoint: vi.fn(),
    getAdminHealthEndpoint: vi.fn(),
    getAdminModelsEndpoint: vi.fn(),
    getBlackLittermanEndpoint: vi.fn(),
}));
// Componentes con tests propios: acá alcanza con saber que se abren.
vi.mock('../components/Portfolio/PortfolioBuilder', () => ({
    default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>editor de cartera</div> : null),
}));
vi.mock('../components/settings/RiskProfileGate', () => ({ default: () => null }));
vi.mock('../components/settings/DefaultModelsSettings', () => ({ default: () => <div>modelos por defecto</div> }));
vi.mock('../components/settings/ChangePasswordSetting', () => ({ default: () => <div>cambiar contraseña</div> }));
vi.mock('../components/settings/TwoFactorSetting', () => ({ default: () => <div>dos pasos</div> }));
vi.mock('../components/settings/QuestionariePopUp', () => ({
    default: ({ isOpen, onCompleted }: { isOpen: boolean; onCompleted?: (r: string) => void }) =>
        isOpen ? (
            <button type="button" onClick={() => onCompleted?.('aggressive')}>
                terminar cuestionario
            </button>
        ) : null,
}));

import { getUserEndpoint } from '../api/user/getUser';
import { getUserSharesEndpoint } from '../api/userShares/getUserSharesEndpoint';
import { getUserSharesTrendsEndpoint } from '../api/userShares/getUserSharesTrendsEndpoint';
import { getUserSharesPnlEndpoint } from '../api/userShares/getUserSharesPnlEndpoint';
import { getShareTrendCompareEndpoint, type CompareTrendsResponse } from '../api/userShares/getShareTrendCompareEndpoint';
import { getShareHistoryEndpoint } from '../api/userShares/getShareHistoryEndpoint';
import { getUserSharesBalanceHistoryEndpoint } from '../api/userShares/getUserSharesBalanceHistoryEndpoint';
import { shareInfoEndpoint } from '../api/shares/getShareInfo';
import { getUserAlertSubscriptionsEndpoint } from '../api/subscriptions/getUserAlertSubscriptions';
import { subscribeToPortfolioAlertsEndpoint } from '../api/subscriptions/portfolioAlertSubscription';
import { subscribeToTickerAlertEndpoint, unsubscribeFromTickerAlertEndpoint } from '../api/subscriptions/tickerAlertSubscription';
import {
    getAdminHealthEndpoint,
    getAdminModelsEndpoint,
    getBlackLittermanEndpoint,
    getCandlesEndpoint,
    getExplainEndpoint,
    getMarketSeriesEndpoint,
    getSignalHistoryEndpoint,
} from '../api/next/endpoints';
import { AppRoutes } from '../next/routes';
import { clearRemoteCache } from '../next/data/useRemote';

// Las páginas se cargan en diferido (lazy): con toda la suite corriendo a la
// vez pueden tardar más que el segundo por defecto.
configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 30_000 });

const m = vi.mocked;
const DAY = 86_400_000;
const T0 = Date.UTC(2025, 9, 1);
const TICKERS = ['GGAL', 'YPFD', 'BMA'];

function closes(seed: number, n = 260): Array<{ ts: number; close: number }> {
    let v = 100 + seed * 10;
    return Array.from({ length: n }, (_, k) => {
        v *= 1 + Math.sin(k * (0.3 + seed * 0.07)) * 0.02 + (k % 7 === seed ? -0.03 : 0.004);
        return { ts: T0 + k * DAY, close: Math.round(v * 100) / 100 };
    });
}

const pred = (over: Partial<CompareTrendsResponse['predictions'][string]> = {}) => ({
    available: true,
    signal: 'alza',
    condition: 'neutral',
    rsi: 55,
    horizon_days: 5,
    last_close: 100,
    predicted_close: 104,
    as_of: '2026-10-19',
    model: 'lstm',
    model_version: 'v1',
    backtest: { directional_accuracy: 0.6, observations: 40 },
    volatility_forecast: null,
    reason: null,
    ...over,
});

function compareFor(t: string, withComponents = true): CompareTrendsResponse {
    return {
        symbol: t,
        as_of: '2026-10-19',
        default_model: 'xgboost',
        predictions: {
            lstm: pred(),
            'lstm-modal': pred({ backtest: null }),
            xgboost: { ...pred({ signal: t === 'BMA' ? 'baja' : 'alza', predicted_close: t === 'BMA' ? 97 : 103, backtest: { directional_accuracy: 0.7, observations: 120 } }), probability_up: t === 'BMA' ? 0.3 : 0.68 } as never,
            transformer: pred({ signal: 'neutral', predicted_close: 100.2, backtest: null }),
            contexto: { ...pred({ signal: 'neutral', predicted_close: 100, backtest: { cases: 12, observations: 0 } as never }), probability_up: 0.6 } as never,
            'garch-modal': pred({ available: true, predicted_close: null, signal: null, volatility_forecast: [{ horizon_days: 1, volatility_pct: 1.5 }, { horizon_days: 10, volatility_pct: 1.8 }] }),
        },
        consensus: {
            symbol: t,
            investor_profile: 'moderate',
            classification: t === 'BMA' ? 'sobreventa' : 'sobrecompra',
            composite_score: 0.012,
            aggregate_confidence: 0.48,
            confidence_min: 0.5,
            models_considered: 3,
            explanation: 'texto',
            track_record: null,
            components: withComponents
                ? [
                      { model: 'lstm', expected_return: 0.039, quality: 0.55, agreement: 1, signal: 'alza' },
                      { model: 'xgboost', expected_return: -0.03, quality: 0.62, agreement: 1, signal: 'baja' },
                      { model: 'transformer', expected_return: 0.002, quality: 0.5, agreement: 0.5, signal: 'neutral' },
                  ]
                : undefined,
        },
    };
}

const signals = [
    { symbol: 'GGAL', model: 'xgboost', as_of: '2026-09-20', signal: 'alza', horizon_days: 5, last_close: 100, predicted_close: 104, realized_close: 106, hit: true, resolved_at: '2026-09-27' },
    { symbol: 'BMA', model: 'lstm', as_of: '2026-09-21', signal: 'baja', horizon_days: 5, last_close: 100, predicted_close: 99.5, realized_close: 101, hit: false, resolved_at: '2026-09-28' },
    { symbol: 'YPFD', model: 'lstm', as_of: '2026-09-22', signal: 'alza', horizon_days: 5, last_close: 100, predicted_close: 100.5, realized_close: 101, hit: true, resolved_at: '2026-09-29' },
    { symbol: 'GGAL', model: 'lstm', as_of: '2026-10-15', signal: 'alza', horizon_days: 5, last_close: 100, predicted_close: 103, realized_close: null, hit: null, resolved_at: null },
    { symbol: 'GGAL', model: 'lstm', as_of: '2026-10-16', signal: 'neutral', horizon_days: 5, last_close: 100, predicted_close: 100, realized_close: null, hit: null, resolved_at: null },
];

function setup({ admin = false, empty = false } = {}) {
    m(getUserEndpoint).mockResolvedValue({
        id: 1,
        email: 'ana@example.com',
        full_name: 'Ana Pérez',
        risk_profile: 'moderate',
        is_active: true,
        two_factor_enabled: false,
        created_at: '2026-01-01',
        role: admin ? 'admin' : 'user',
    });
    const shares = empty ? [] : TICKERS.map((t, k) => ({ id: k + 1, user_id: 1, ticker: t, quantity: 10 + k, entry_price: 90, created_at: '2026-01-01' }));
    m(getUserSharesEndpoint).mockResolvedValue({ shares } as never);
    m(getUserSharesTrendsEndpoint).mockResolvedValue({
        trends: TICKERS.map((t) => ({ ticker: t, available: true, signal: t === 'BMA' ? 'baja' : 'alza', condition: null, rsi: 40, horizon_days: 5, last_close: 100, predicted_close: 103, as_of: '2026-10-19', model: 'lstm', model_version: 'v1', reason: null })),
    });
    m(getUserSharesPnlEndpoint).mockResolvedValue({
        shares: TICKERS.map((t, k) => ({ id: k + 1, ticker: t, quantity: 10 + k, entry_price: 90, current_price: 100 + k * 50, pnl_amount: 100, pnl_percentage: 11.1 - k * 20, weight_percentage: [20, 35, 45][k] })),
        portfolio: { total_invested: 2970, total_current_value: 4100, total_pnl_amount: 1130, total_pnl_percentage: 38 },
    });
    m(getShareTrendCompareEndpoint).mockImplementation(async (t: string) => compareFor(t, t !== 'YPFD'));
    m(getShareHistoryEndpoint).mockImplementation(async (t: string) => ({ ticker: t, prices: closes(TICKERS.indexOf(t) + 1) }));
    m(getUserSharesBalanceHistoryEndpoint).mockResolvedValue([]);
    m(shareInfoEndpoint).mockResolvedValue({ cached: true, data: [], status: 200, ticker_info: { descripcion: 'Banco privado argentino.', nombre_corto: 'Galicia', nombre_largo: 'Grupo Financiero Galicia' } });
    m(getUserAlertSubscriptionsEndpoint).mockResolvedValue({ portfolio: false, tickers: ['GGAL'] });
    m(subscribeToPortfolioAlertsEndpoint).mockResolvedValue(undefined);
    m(subscribeToTickerAlertEndpoint).mockResolvedValue(undefined);
    m(unsubscribeFromTickerAlertEndpoint).mockResolvedValue(undefined);
    m(getCandlesEndpoint).mockImplementation(async (t: string) => ({
        ticker: t,
        candles: closes(1, 80).map((c) => ({ date: new Date(c.ts).toISOString().slice(0, 10), open: c.close * 0.99, high: c.close * 1.02, low: c.close * 0.97, close: c.close, volume: 1_500_000 })),
    }));
    const series = (key: string, base: number) => ({ key, points: closes(2, 300).map((p) => ({ ts: p.ts, value: (p.close / 100) * base })) });
    m(getMarketSeriesEndpoint).mockResolvedValue({
        series: [series('CCL', 1500), series('MEP', 1450), series('RIESGO_PAIS', 700), series('BADLAR', 30), series('TNX', 4.1)] as never,
    });
    m(getExplainEndpoint).mockResolvedValue({
        symbol: 'GGAL',
        as_of: '2026-10-19',
        probability_up: 0.68,
        base_value: 0.1,
        contributions: [
            { feature: 't_dd60', label: 'Distancia al máximo de 3 meses', value: -0.2, contribution: 0.4 },
            { feature: 'm_ret60', label: 'Mercado: variación de 3 meses', value: 0.1, contribution: 0.3 },
            { feature: 'beta', label: 'Sensibilidad al mercado', value: 1.1, contribution: -0.15 },
        ],
    });
    m(getSignalHistoryEndpoint).mockResolvedValue({ rows: signals, summary: { evaluated: 3, hits: 2, hit_rate: 0.67 } });
    m(getAdminHealthEndpoint).mockResolvedValue({
        services: [
            { name: 'data-colector', status: 'up', latency_ms: 12 },
            { name: 'api-ml', status: 'down', latency_ms: null, error: 'timeout' },
            { name: 'modal', status: 'not_configured', latency_ms: 1500 },
        ],
    });
    m(getAdminModelsEndpoint).mockResolvedValue({
        run_at: '2026-09-03T10:00:00',
        results: { ensemble: { overall: { n_predictions: 10, directional_accuracy: 0.6, signal_hit_rate: 0.7, neutral_rate: 0.2, mae_logret: 0.04 } }, lstm: { overall: { directional_accuracy: 0.51 } } },
        xgboost_oos: { oos_auc: 0.535, oos_samples: 18884, oos_up_rate: 0.61, alza_disabled: 0 },
    });
    m(getBlackLittermanEndpoint).mockResolvedValue({
        pesos_recomendados: { GGAL: 0.4, YPFD: 0.35, BMA: 0.05, ALUA: 0.2 },
        detalle: [
            { ticker: 'GGAL', peso_actual: 0.2, peso_recomendado: 0.4, pi: 0.0003, q: 0.002, omega: 0.0001, mu_bl: 0.001, horizon_days: 5 },
            { ticker: 'YPFD', peso_actual: 0.35, peso_recomendado: 0.35, pi: 0.0002, q: 0.0002, omega: 0.0001, mu_bl: 0.0002, horizon_days: 5 },
            { ticker: 'BMA', peso_actual: 0.45, peso_recomendado: 0.05, pi: 0.0004, q: -0.003, omega: 0.0001, mu_bl: -0.001, horizon_days: 20 },
            { ticker: 'ALUA', peso_actual: 0, peso_recomendado: 0.2, pi: 0.0002, q: 0.0001, omega: 0.0001, mu_bl: 0.00015, horizon_days: 5 },
        ],
        tickers_excluidos: { TGSU2: 'sin historia suficiente' },
        cartera_ancla: 'propia',
    });
}

function Where() {
    const l = useLocation();
    return <span data-testid="where">{l.pathname}</span>;
}

function renderApp(path: string) {
    const Pass = ({ children }: { children: ReactNode }) => <>{children}</>;
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Where />
            <Routes>{AppRoutes(Pass)}</Routes>
        </MemoryRouter>,
    );
}

const where = () => screen.getByTestId('where').textContent;

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearRemoteCache();
    setup();
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: vi.fn(() => ({ matches: true, addListener: vi.fn(), removeListener: vi.fn() })),
    });
    Element.prototype.scrollIntoView = vi.fn();
    window.print = vi.fn();
});

describe('Resumen', () => {
    test('muestra el saludo, los números y las lecturas', async () => {
        renderApp('/home');
        expect(await screen.findByRole('heading', { name: /Ana/ })).toBeInTheDocument();
        await screen.findAllByText('Valor de la cartera');
        expect(screen.getAllByText('$4.100').length).toBeGreaterThan(0);
        await waitFor(() => expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument());
        expect(await screen.findByText('Más optimista')).toBeInTheDocument();
        expect(screen.getByText('Concentración')).toBeInTheDocument();
        expect(await screen.findByText(/hace 6 meses, hoy tendrías/)).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole('button', { name: '1A' })[0]);
        fireEvent.click(screen.getAllByRole('button', { name: '3M' })[1]);
        expect(await screen.findByText(/hace 3 meses/)).toBeInTheDocument();
        const li = screen.getAllByText('BMA').map((e) => e.closest('.nx-li')).find(Boolean)!;
        fireEvent.pointerEnter(li);
        fireEvent.pointerLeave(li);
        fireEvent.click(screen.getByRole('button', { name: /Informe PDF/ }));
        expect(window.print).toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: /Ver cartera/ }));
        expect(where()).toBe('/cartera');
    });

    test('invita a armar la cartera cuando está vacía', async () => {
        setup({ empty: true });
        renderApp('/home');
        fireEvent.click(await screen.findByRole('button', { name: /Armar mi cartera/ }));
        expect(screen.getByText('editor de cartera')).toBeInTheDocument();
    });
});

describe('Cartera', () => {
    test('filtra, ordena y abre el análisis de una acción', async () => {
        renderApp('/cartera');
        const table = await screen.findByRole('table');
        await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(4));
        fireEvent.click(screen.getByRole('button', { name: 'Baja' }));
        expect(within(table).getAllByRole('row')).toHaveLength(2);
        fireEvent.click(screen.getByRole('button', { name: 'Neutral' }));
        expect(screen.getByText('Ninguna acción coincide con el filtro.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
        for (const s of ['Prob. suba', 'Ganancia', 'Semana', 'Peso']) fireEvent.click(screen.getByRole('button', { name: s }));
        fireEvent.change(screen.getByLabelText('Filtrar ticker'), { target: { value: 'ypf' } });
        expect(within(table).getAllByRole('row')).toHaveLength(2);
        fireEvent.keyDown(within(table).getAllByText('YPFD')[0].closest('tr')!, { key: 'Enter' });
        expect(where()).toBe('/accion/YPFD');
    });

    test('abre el editor de cartera', async () => {
        renderApp('/cartera');
        fireEvent.click(await screen.findByRole('button', { name: /Editar cartera/ }));
        expect(screen.getByText('editor de cartera')).toBeInTheDocument();
    });
});

describe('Análisis de acción', () => {
    test('muestra la proyección, la cuenta del consenso y la explicación', async () => {
        renderApp('/accion');
        await waitFor(() => expect(where()).toBe('/accion/GGAL'));
        expect(await screen.findByText('Banco privado argentino.')).toBeInTheDocument();
        expect(await screen.findByText('Análisis de acción · Financials')).toBeInTheDocument();
        expect(await screen.findByText('Lectura alcista')).toBeInTheDocument();
        expect(screen.getByText(/el mínimo pedido es/)).toBeInTheDocument();
        expect(await screen.findByText('Distancia al máximo de 3 meses')).toBeInTheDocument();
        // todos los modelos lado a lado, incluidas las versiones de la nube
        expect(screen.getByText('Qué predice cada modelo')).toBeInTheDocument();
        expect(screen.getByText('LSTM (nube)')).toBeInTheDocument();
        expect(screen.getByText(/estima cuánto se puede mover/)).toBeInTheDocument();
        expect(screen.getByText('sin señal: no alcanza el umbral')).toBeInTheDocument();
        expect(screen.getAllByText('no aplica').length).toBeGreaterThan(0);
        fireEvent.click(screen.getByRole('button', { name: 'Resultados' }));
        expect(await screen.findByText('Qué tan bien predijeron')).toBeInTheDocument();
        expect(screen.getAllByText(/de cada 100 casos/).length).toBeGreaterThan(0);
        expect(screen.getByText(/no dio ninguna señal/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Predicción' }));
        fireEvent.click(screen.getByRole('button', { name: '20d' }));
        fireEvent.click(screen.getByRole('button', { name: 'velas' }));
        await waitFor(() => expect(getCandlesEndpoint).toHaveBeenCalledWith('GGAL'));
        // GGAL ya tiene alerta: el botón lo dice y permite sacarla
        fireEvent.click(await screen.findByRole('button', { name: /Te avisamos si cambia/ }));
        expect(await screen.findByText('Listo: ya no te avisamos por GGAL.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Avisarme si cambia/ }));
        expect(await screen.findByText(/te avisamos por mail si cambia la señal de GGAL/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /BMA/ }));
        expect(await screen.findByText('Lectura bajista')).toBeInTheDocument();
    });

    test('sin componentes de api-ml rearma la cuenta y avisa si la alerta falla', async () => {
        m(subscribeToTickerAlertEndpoint).mockRejectedValue(new Error('x'));
        m(getExplainEndpoint).mockRejectedValue(new Error('x'));
        renderApp('/accion/YPFD');
        expect(await screen.findByText('Cómo se combinan los modelos')).toBeInTheDocument();
        expect(await screen.findByText(/La explicación del modelo no está disponible/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Avisarme si cambia/ }));
        expect(await screen.findByText(/No pudimos guardar la alerta/)).toBeInTheDocument();
        // si ya existía (409), se toma como suscripto
        m(subscribeToTickerAlertEndpoint).mockRejectedValueOnce({ response: { status: 409 } });
        fireEvent.click(screen.getByRole('button', { name: /Avisarme si cambia/ }));
        expect(await screen.findByText(/Ya te avisamos por mail si cambia la señal de YPFD/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Ver en terminal/ }));
        expect(where()).toBe('/terminal');
        expect(await screen.findByText(/qué dice cada modelo de YPFD/)).toBeInTheDocument();
    });
});

describe('Rebalanceo', () => {
    test('explica el reparto estimado paso a paso', async () => {
        renderApp('/rebalanceo');
        expect(await screen.findByText(/Según el cálculo, un reparto con/)).toBeInTheDocument();
        expect(screen.getAllByText('Más peso').length).toBeGreaterThan(0);
        expect(screen.getByText(/hoy no la tenés/)).toBeInTheDocument();
        expect(screen.getByText('La cuenta, paso a paso')).toBeInTheDocument();
        fireEvent.click(screen.getAllByRole('button', { name: /Ver la cuenta/ })[0]);
        fireEvent.click(within(screen.getByRole('table')).getByText('ALUA').closest('tr')!);
        expect(screen.getAllByText(/Hoy no tenés ALUA/).length).toBe(1);
        fireEvent.click(screen.getByRole('button', { name: 'YPFD' }));
        expect(screen.getByText(/no conviene tocarla/)).toBeInTheDocument();
        expect(screen.getByText(/TGSU2: sin historia suficiente/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Igual peso' }));
        await waitFor(() => expect(getBlackLittermanEndpoint).toHaveBeenCalledWith('equal_weight'));
        fireEvent.click(await screen.findByRole('button', { name: 'Ir a Ajustes' }));
        expect(where()).toBe('/ajustes');
    });

    test('avisa si el cálculo falla', async () => {
        m(getBlackLittermanEndpoint).mockRejectedValue(new Error('x'));
        renderApp('/rebalanceo');
        expect(await screen.findByText(/No pudimos hacer el cálculo/)).toBeInTheDocument();
    });
});

describe('Historial, Riesgo y Mercado', () => {
    test('historial cuenta aciertos y filtra por acción', async () => {
        renderApp('/historial');
        // con pocos casos se muestra "aciertos/total" y el rango, no un porcentaje
        expect((await screen.findAllByText('2/3')).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/2 de 3 · entre/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/pocos casos/).length).toBeGreaterThan(0);
        expect(screen.getAllByText('✓ acertó').length).toBe(2);
        // la señal pendiente aparece en curso o, si ya pasó su plazo, vencida
        expect(screen.getAllByText(/en curso|vencida, sin evaluar/).length).toBeGreaterThan(0);
        expect(screen.getByText(/Última señal guardada/)).toBeInTheDocument();
        expect(screen.getAllByText(/XGBoost · 5 ruedas/).length).toBeGreaterThan(0);
        fireEvent.click(screen.getByRole('button', { name: 'BMA' }));
        expect(screen.getAllByText(/0 de 1 · entre/).length).toBeGreaterThan(0);
    });

    test('historial vacío y con error', async () => {
        m(getSignalHistoryEndpoint).mockResolvedValueOnce({ rows: [], summary: { evaluated: 0, hits: 0, hit_rate: null } });
        const { unmount } = renderApp('/historial');
        expect(await screen.findByText(/Todavía no hay señales guardadas/)).toBeInTheDocument();
        unmount();
        clearRemoteCache();
        m(getSignalHistoryEndpoint).mockRejectedValueOnce(new Error('x'));
        renderApp('/historial');
        expect(await screen.findByText(/No pudimos traer el historial/)).toBeInTheDocument();
    });

    test('riesgo calcula VaR, caídas y correlaciones', async () => {
        renderApp('/riesgo');
        expect(await screen.findByText('La peor racha del año')).toBeInTheDocument();
        expect(screen.getAllByTitle(/GGAL · YPFD/).length).toBe(1);
    });

    test('mercado muestra las series y el mapa de la cartera', async () => {
        renderApp('/mercado');
        expect((await screen.findAllByText('Dólar CCL')).length).toBeGreaterThan(0);
        expect(screen.getByText('BYMA · Buenos Aires')).toBeInTheDocument();
        const tile = await screen.findByRole('button', { name: /BMA/ });
        fireEvent.click(tile);
        expect(where()).toBe('/accion/BMA');
    });

    test('mercado sin datos', async () => {
        m(getMarketSeriesEndpoint).mockRejectedValue(new Error('x'));
        renderApp('/mercado');
        expect(await screen.findByText(/No pudimos traer los datos del mercado/)).toBeInTheDocument();
    });
});

describe('Terminal', () => {
    test('ejecuta los comandos con datos reales', async () => {
        renderApp('/terminal');
        const input = await screen.findByPlaceholderText('escribí help');
        const out = screen.getByTestId('term-out');
        await waitFor(() => expect(getShareHistoryEndpoint).toHaveBeenCalledTimes(3));
        const run = async (cmd: string, expected: RegExp) => {
            fireEvent.change(input, { target: { value: cmd } });
            fireEvent.keyDown(input, { key: 'Enter' });
            await waitFor(() => expect(out.textContent).toMatch(expected));
        };
        await run('help', /QUÉ PODÉS ESCRIBIR/);
        await run('cartera', /TOTAL/);
        await run('precio GGAL', /último mes/);
        await run('precio', /probá con: precio GGAL/);
        await run('precio ZZZ', /no tengo precios de ZZZ/);
        await run('velas GGAL', /VOLUMEN/);
        await run('predict GGAL', /opinión combinada/);
        await run('compare GGAL', /el que más acierta/);
        await run('bl', /NO es una recomendación/);
        await run('historial GGAL', /aciertos:/);
        await run('riesgo', /peor caída/);
        await run('macro', /dólar CCL/);
        await run('health', /solo para administradores/);
        await run('nada', /no conozco "nada"/);
        await run('go marte', /pestañas:/);
        fireEvent.keyDown(input, { key: 'ArrowUp' });
        expect((input as HTMLInputElement).value).toBe('go marte');
        fireEvent.keyDown(input, { key: 'ArrowDown' });
        fireEvent.change(input, { target: { value: 'pre' } });
        fireEvent.keyDown(input, { key: 'Tab' });
        expect((input as HTMLInputElement).value).toBe('precio ');
        fireEvent.change(input, { target: { value: 'precio gg' } });
        fireEvent.keyDown(input, { key: 'Tab' });
        expect((input as HTMLInputElement).value).toBe('precio GGAL');
        m(getCandlesEndpoint).mockRejectedValueOnce(new Error('x'));
        await run('velas BMA', /no pude traer esos datos/);
        fireEvent.click(screen.getByRole('button', { name: /^riesgo/ }));
        await run('clear', /^$/);
        await run('go riesgo', /abriendo riesgo/);
        await waitFor(() => expect(where()).toBe('/riesgo'));
    });
});

describe('Alertas y Ajustes', () => {
    test('activa y pausa alertas', async () => {
        renderApp('/alertas');
        const sw = await screen.findByRole('switch', { name: 'Alerta de GGAL' });
        fireEvent.click(sw);
        expect(await screen.findByText('Alerta de GGAL pausada.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('switch', { name: 'Alertas de toda la cartera' }));
        expect(await screen.findByText('Alertas de toda la cartera activadas.')).toBeInTheDocument();
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'BMA' } });
        fireEvent.click(screen.getByRole('button', { name: /Crear alerta/ }));
        await waitFor(() => expect(subscribeToTickerAlertEndpoint).toHaveBeenCalledWith('BMA'));
        m(unsubscribeFromTickerAlertEndpoint).mockRejectedValueOnce(new Error('x'));
        fireEvent.click(await screen.findByRole('switch', { name: 'Alerta de BMA' }));
        expect(await screen.findByText(/No pudimos guardar el cambio/)).toBeInTheDocument();
    });

    test('alertas que no cargan', async () => {
        m(getUserAlertSubscriptionsEndpoint).mockRejectedValue(new Error('x'));
        renderApp('/alertas');
        expect(await screen.findAllByText(/No pudimos cargar tus alertas/)).not.toHaveLength(0);
    });

    test('ajustes cambia el tema, la guía y el perfil', async () => {
        renderApp('/ajustes');
        fireEvent.click(await screen.findByRole('button', { name: 'Claro' }));
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        fireEvent.click(screen.getByRole('button', { name: 'Terminal' }));
        expect(document.documentElement.getAttribute('data-theme')).toBe('terminal');
        fireEvent.click(screen.getByRole('switch', { name: 'Explicaciones' }));
        expect(localStorage.getItem('guide')).toBe('off');
        fireEvent.click(screen.getByRole('button', { name: 'Rehacer' }));
        fireEvent.click(screen.getByRole('button', { name: 'terminar cuestionario' }));
        expect(await screen.findByText('Perfil actualizado: Agresivo.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Ver la guía' }));
        expect(await screen.findByRole('dialog', { name: 'Guía de uso' })).toBeInTheDocument();
    });
});

describe('Shell', () => {
    test('buscador, guía, notificaciones, aviso legal y menú', async () => {
        renderApp('/home');
        await screen.findByRole('heading', { name: /Ana/ });
        // buscador con ⌘K y teclado
        fireEvent.keyDown(document, { key: 'k', metaKey: true });
        const search = screen.getByPlaceholderText(/Escribí un ticker/);
        fireEvent.change(search, { target: { value: 'zzz' } });
        expect(screen.getByText('Sin resultados')).toBeInTheDocument();
        fireEvent.change(search, { target: { value: 'ries' } });
        fireEvent.keyDown(search, { key: 'ArrowDown' });
        fireEvent.keyDown(search, { key: 'ArrowUp' });
        fireEvent.keyDown(search, { key: 'Enter' });
        expect(where()).toBe('/riesgo');
        fireEvent.click(screen.getByRole('button', { name: /Buscar acción/ }));
        fireEvent.change(screen.getByPlaceholderText(/Escribí un ticker/), { target: { value: 'modo terminal' } });
        fireEvent.click(screen.getByRole('option', { name: /Modo terminal/ }));
        expect(document.documentElement.getAttribute('data-theme')).toBe('terminal');
        fireEvent.click(screen.getByRole('button', { name: /Buscar acción/ }));
        fireEvent.change(screen.getByPlaceholderText(/Escribí un ticker/), { target: { value: 'GGAL' } });
        fireEvent.click(await screen.findByRole('option', { name: /GGAL/ }));
        expect(where()).toBe('/accion/GGAL');
        // tema claro/oscuro, terminal y guía
        fireEvent.click(screen.getByRole('button', { name: 'Cambiar tema claro u oscuro' }));
        fireEvent.click(screen.getByRole('button', { name: 'Modo terminal' }));
        fireEvent.click(screen.getByRole('button', { name: /Guía (ON|OFF)/ }));
        // recorrido a demanda, al lado de notificaciones
        fireEvent.click(screen.getByRole('button', { name: 'Guía de uso' }));
        const tour = await screen.findByRole('dialog', { name: 'Guía de uso' });
        expect(where()).toBe('/home');
        await act(async () => {
            await new Promise((r) => setTimeout(r, 350));
        });
        for (let i = 0; i < 12 && within(tour).queryByRole('button', { name: 'Siguiente' }); i++) {
            fireEvent.click(within(tour).getByRole('button', { name: 'Siguiente' }));
        }
        fireEvent.click(within(tour).getByRole('button', { name: '¡Listo!' }));
        expect(screen.queryByRole('dialog', { name: 'Guía de uso' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Guía de uso' }));
        fireEvent.keyDown(document, { key: 'Escape' });
        // notificaciones y aviso legal
        fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));
        expect(await screen.findByText('Toda la cartera')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Configurar alertas' }));
        expect(where()).toBe('/alertas');
        fireEvent.click(screen.getByRole('button', { name: 'Leer aviso legal' }));
        expect(screen.getByRole('complementary', { name: 'Aviso legal' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
        // menú del usuario
        fireEvent.click(screen.getByRole('button', { name: 'Ana Pérez' }));
        fireEvent.click(screen.getByRole('menuitem', { name: /Ajustes/ }));
        expect(where()).toBe('/ajustes');
        fireEvent.click(screen.getByRole('button', { name: 'Ana Pérez' }));
        fireEvent.mouseDown(document.body);
        fireEvent.click(screen.getByRole('button', { name: 'Ana Pérez' }));
        localStorage.setItem('token', 'x');
        fireEvent.click(screen.getByRole('menuitem', { name: /Cerrar sesión/ }));
        expect(localStorage.getItem('token')).toBeNull();
        expect(where()).toBe('/');
    });

    test('sin conexión con el servidor ofrece reintentar', async () => {
        m(getUserEndpoint).mockRejectedValue(new Error('x'));
        renderApp('/home');
        fireEvent.click(await screen.findByRole('button', { name: 'Reintentar ahora' }));
        await waitFor(() => expect(getUserEndpoint).toHaveBeenCalledTimes(2));
    });

    test('un usuario común no entra al panel de administración', async () => {
        renderApp('/admin/servicios');
        await waitFor(() => expect(where()).toBe('/home'));
    });
});

describe('Administración', () => {
    test('recorre arquitectura, servicios, modelos y confiabilidad', async () => {
        setup({ admin: true });
        renderApp('/admin');
        await waitFor(() => expect(where()).toBe('/admin/arquitectura'));
        fireEvent.click(await screen.findByRole('button', { name: 'data-colector' }));
        expect(await screen.findByText('funcionando')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'api-ml' }));
        expect(screen.getByText('con problemas')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('link', { name: /Servicios/ }));
        expect(await screen.findByText('timeout')).toBeInTheDocument();
        expect(screen.getAllByText('sin configurar').length).toBeGreaterThan(0);
        fireEvent.click(screen.getByRole('link', { name: /Modelos/ }));
        expect(await screen.findByText('Todos juntos')).toBeInTheDocument();
        expect(screen.getByText('18.884')).toBeInTheDocument();
        expect(screen.queryByText(/disabled/)).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('link', { name: /Confiabilidad/ }));
        expect(await screen.findByText('¿Cuando está seguro, acierta más?')).toBeInTheDocument();
        // vuelta a la vista de usuario desde el menú
        fireEvent.click(screen.getByRole('button', { name: 'Ana Pérez' }));
        fireEvent.click(screen.getByRole('menuitem', { name: /Ver como usuario/ }));
        expect(where()).toBe('/home');
        fireEvent.click(await screen.findByRole('button', { name: 'Ana Pérez' }));
        fireEvent.click(screen.getByRole('menuitem', { name: /Panel de administración/ }));
        expect(where()).toBe('/admin/arquitectura');
        await act(async () => {
            fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
        });
        fireEvent.change(screen.getByPlaceholderText(/Escribí un ticker/), { target: { value: 'como usuario' } });
        fireEvent.keyDown(screen.getByPlaceholderText(/Escribí un ticker/), { key: 'Enter' });
        expect(where()).toBe('/home');
    });

    test('servicios y modelos que no responden', async () => {
        setup({ admin: true });
        m(getAdminHealthEndpoint).mockRejectedValue(new Error('x'));
        m(getAdminModelsEndpoint).mockRejectedValue(new Error('x'));
        renderApp('/admin/servicios');
        expect(await screen.findByText(/No se pudo consultar el estado/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('link', { name: /Modelos/ }));
        expect(await screen.findByText(/No se pudieron leer las métricas/)).toBeInTheDocument();
    });
});
