import authAxios from '../authFetch';
const ENDPOINT = '/user/shares';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

export type TrendModelName =
    | 'arima'
    | 'arima-modal'
    | 'garch-modal'
    | 'lstm'
    | 'lstm-modal'
    | 'svm-modal'
    | 'transformer'
    | 'xgboost'
    | 'xgboost-modal';

export interface TrendBacktestPoint {
    date: string;
    actual: number;
    predicted: number;
}

export interface TrendBacktest {
    observations: number;
    directional_accuracy?: number;
    mae?: number;
    // Solo en lstm / xgboost
    avg_buy_hold_return_pct?: number;
    avg_strategy_return_pct?: number;
    // Solo en garch
    variance_mae?: number;
    series?: TrendBacktestPoint[];
}

export interface VolatilityForecastItem {
    horizon_days: number;
    volatility_pct: number;
}

export interface TrendPrediction {
    model: string;
    model_version: string;
    available: boolean;
    as_of: string | null;
    horizon_days: number | null;
    last_close: number | null;
    predicted_close: number | null;
    rsi: number | null;
    condition: string | null;
    signal: string | null; // ej: 'neutral' | 'alza' | 'baja'
    reason?: string | null;
    // Según el modelo viene uno u otro
    symbol?: string;
    ticker?: string;
    source?: string;
    confidence?: number;
    expected_return?: number;
    backtest?: TrendBacktest;
    // Solo en garch
    volatility_forecast?: VolatilityForecastItem[];
}

export interface TrendsCompareResponse {
    as_of: string;
    default_model: string;
    symbol: string;
    predictions: Partial<Record<TrendModelName, TrendPrediction>>;
}

export async function getTrendsCompareEndpoint(
    ticker: string,
): Promise<TrendsCompareResponse> {
    const res = await authAxios.get<TrendsCompareResponse>(
        `${apiURL}/${encodeURIComponent(ticker)}/trends/compare`,
    );
    return res.data;
}
