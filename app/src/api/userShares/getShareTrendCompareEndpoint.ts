import authAxios from '../authFetch';
const ENDPOINT = '/user/shares';
const apiURL = import.meta.env.VITE_SERVER_API + ENDPOINT;

export interface ModelPrediction {
    available: boolean;
    signal: string | null;
    condition: string | null;
    rsi: number | null;
    horizon_days: number | null;
    last_close: number | null;
    predicted_close: number | null;
    as_of: string | null;
    model: string | null;
    model_version: string | null;
    backtest: {
        directional_accuracy?: number;
        accuracy_low?: number;
        accuracy_high?: number;
        signal_hit_rate?: number | null;
        neutral_rate?: number;
        folds?: number;
        mae?: number;
        observations?: number;
        series?: Array<{
            date: string;
            predicted: number;
            actual: number;
        }>;
        avg_strategy_return_pct?: number;
        avg_buy_hold_return_pct?: number;
    } | null;
    volatility_forecast: Array<{
        horizon_days: number;
        volatility_pct: number;
    }> | null;
    reason: string | null;
}

export interface ConsensusTrackRecord {
    n_resolved: number;
    // aciertos / veces que dio alza o baja (null si nunca dio señal)
    signal_hit_rate: number | null;
    // % de veces que no se animó a dar señal
    neutral_rate: number | null;
    scope: 'ticker' | 'global';
}

export interface ConsensusReading {
    symbol: string;
    investor_profile: 'conservative' | 'moderate' | 'aggressive';
    classification: 'sobrecompra' | 'sobreventa' | 'neutral' | 'sin_datos';
    composite_score: number;
    aggregate_confidence: number;
    models_considered: number;
    explanation: string;
    track_record: ConsensusTrackRecord | null;
}

export interface CompareTrendsResponse {
    symbol: string;
    as_of: string | null;
    default_model: string | null;
    predictions: Record<string, ModelPrediction>;
    // null si api-ml no respondió
    consensus?: ConsensusReading | null;
}

export async function getShareTrendCompareEndpoint(
    ticker: string,
): Promise<CompareTrendsResponse> {
    const res = await authAxios.get<CompareTrendsResponse>(
        `${apiURL}/${ticker}/trends/compare`,
    );
    return res.data;
}
