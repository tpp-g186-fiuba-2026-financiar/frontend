import authAxios from '../authFetch';

// Endpoints nuevos de backend-website que usa la interfaz FinanciAr Next.
// Todas las páginas los consumen con tolerancia a fallas: si un endpoint
// todavía no existe o el servicio está caído, se muestra un estado vacío.

const base = () => import.meta.env.VITE_SERVER_API as string;

export interface CandlePoint {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export async function getCandlesEndpoint(
    ticker: string,
): Promise<{ ticker: string; candles: CandlePoint[] }> {
    const res = await authAxios.get(
        `${base()}/user/shares/${encodeURIComponent(ticker)}/candles`,
    );
    return res.data;
}

export type MarketSeriesKey =
    | 'CCL'
    | 'MEP'
    | 'RIESGO_PAIS'
    | 'TPM'
    | 'BADLAR'
    | 'RESERVAS'
    | 'TNX'
    | 'GOLD'
    | 'OIL';

export interface MarketSeries {
    key: MarketSeriesKey;
    points: Array<{ ts: number; value: number }>;
}

export async function getMarketSeriesEndpoint(): Promise<{
    series: MarketSeries[];
    unavailable?: Array<{ key: string; reason: string }>;
}> {
    const res = await authAxios.get(`${base()}/market/series`);
    return res.data;
}

export interface ExplainContribution {
    feature: string;
    label: string;
    value: number | null;
    contribution: number;
    /** Qué mide, en palabras simples. */
    help?: string | null;
    /** Cómo mostrar value: pct, rank, flag, days, index o num. */
    unit?: string;
}

export interface ExplainResponse {
    symbol: string;
    as_of: string | null;
    probability_up: number;
    base_value: number;
    contributions: ExplainContribution[];
    signal?: 'alza' | 'baja' | 'neutral' | null;
    /** Desde qué P(sube) el modelo dice "alza"; null = no emite alzas. */
    alza_threshold?: number | null;
    /** Hasta qué P(sube) el modelo dice "baja"; null = no emite bajas. */
    baja_threshold?: number | null;
}

export async function getExplainEndpoint(
    ticker: string,
): Promise<ExplainResponse> {
    const res = await authAxios.get(
        `${base()}/user/shares/${encodeURIComponent(ticker)}/explain`,
    );
    return res.data;
}

export interface SignalHistoryRow {
    symbol: string;
    model: string;
    model_version?: string | null;
    as_of: string;
    signal: 'alza' | 'baja' | 'neutral' | string;
    horizon_days: number;
    last_close: number;
    predicted_close: number;
    realized_close: number | null;
    hit: boolean | null;
    resolved_at: string | null;
}

export interface SignalHistoryResponse {
    rows: SignalHistoryRow[];
    summary: {
        evaluated: number;
        hits: number;
        hit_rate: number | null;
        // fecha de la última señal guardada: si queda vieja, el job diario se frenó
        last_signal?: string | null;
        updated_at?: string | null;
    };
}

export async function getSignalHistoryEndpoint(): Promise<SignalHistoryResponse> {
    const res = await authAxios.get(`${base()}/user/signals/history`);
    // sin acciones en cartera el backend responde {signals: []}
    const rows: SignalHistoryRow[] = res.data?.rows ?? res.data?.signals ?? [];
    return {
        rows,
        summary: res.data?.summary ?? { evaluated: 0, hits: 0, hit_rate: null },
    };
}

export interface ServiceHealth {
    // data-colector | api-ml | modal
    name: string;
    // up | down | not_configured
    status: string;
    latency_ms: number | null;
    http_status?: number | null;
    error?: string | null;
}

export async function getAdminHealthEndpoint(): Promise<{
    all_up?: boolean;
    services: ServiceHealth[];
}> {
    const res = await authAxios.get(`${base()}/admin/health`);
    return res.data;
}

export interface ModelSummary {
    n_predictions?: number;
    directional_accuracy?: number;
    signal_hit_rate?: number;
    mae_logret?: number;
    neutral_rate?: number;
}

export interface ModelDiagnostics {
    run_at?: string;
    results?: Record<string, { overall?: ModelSummary }>;
    xgboost_oos?: Record<string, number> | null;
    xgboost_version?: string | null;
}

// api-ml responde {backtest: {run_at, results}, xgboost: {version, metrics}}.
export async function getAdminModelsEndpoint(): Promise<ModelDiagnostics> {
    const res = await authAxios.get(`${base()}/admin/models`);
    const d = res.data ?? {};
    const metrics: Record<string, unknown> = d.xgboost?.metrics ?? {};
    const numeric = Object.fromEntries(
        Object.entries(metrics).filter(([, v]) => typeof v === 'number'),
    ) as Record<string, number>;
    return {
        run_at: d.backtest?.run_at,
        results: d.backtest?.results ?? {},
        xgboost_oos: Object.keys(numeric).length ? numeric : null,
        xgboost_version: d.xgboost?.version ?? null,
    };
}

// Black-Litterman con los valores intermedios por acción (si api-ml todavía
// no los devuelve, `detalle` viene vacío y la pantalla usa solo los pesos).
export interface BlDetalle {
    ticker: string;
    peso_actual: number;
    peso_recomendado: number;
    pi: number;
    q: number;
    omega: number;
    mu_bl: number;
    horizon_days: number | null;
}

export interface BlResponse {
    pesos_recomendados: Record<string, number>;
    detalle?: BlDetalle[];
    tickers_excluidos?: Record<string, string>;
    cartera_ancla?: string;
}

export async function getBlackLittermanEndpoint(
    carteraAncla?: 'propia' | 'equal_weight',
): Promise<BlResponse> {
    const res = await authAxios.get(
        `${base()}/user/shares/portfolio/recomendacion`,
        { params: carteraAncla ? { cartera_ancla: carteraAncla } : undefined },
    );
    return res.data;
}
