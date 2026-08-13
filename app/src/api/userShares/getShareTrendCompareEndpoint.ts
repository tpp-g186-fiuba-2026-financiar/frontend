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
        mae?: number;
        observations?: number;
        series?: Array<{
            date: string;
            predicted: number;
            actual: number;
        }>;
    } | null;
    reason: string | null;
}

export interface CompareTrendsResponse {
    symbol: string;
    as_of: string | null;
    default_model: string | null;
    predictions: Record<string, ModelPrediction>;
}

export async function getShareTrendCompareEndpoint(
    ticker: string,
): Promise<CompareTrendsResponse> {
    const res = await authAxios.get<CompareTrendsResponse>(
        `${apiURL}/${ticker}/trends/compare`,
    );
    return res.data;
}
