import authAxios from '../authFetch';

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
    help?: string | null;
    unit?: string;
}

export interface ExplainResponse {
    symbol: string;
    as_of: string | null;
    probability_up: number;
    base_value: number;
    contributions: ExplainContribution[];
    signal?: 'alza' | 'baja' | 'neutral' | null;
    alza_threshold?: number | null;
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
        last_signal?: string | null;
        updated_at?: string | null;
    };
}

export async function getSignalHistoryEndpoint(): Promise<SignalHistoryResponse> {
    const res = await authAxios.get(`${base()}/user/signals/history`);
    const rows: SignalHistoryRow[] = res.data?.rows ?? res.data?.signals ?? [];
    return {
        rows,
        summary: res.data?.summary ?? { evaluated: 0, hits: 0, hit_rate: null },
    };
}

export interface ServiceHealth {
    name: string;
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
    // acciones que la recomendacion suma y no estaban en la cartera
    acciones_nuevas?: string[];
    // fraccion de la cartera que cambia de manos
    rotacion?: number;
    // costo de hacer los movimientos, como fraccion del valor de la cartera
    costo_estimado?: number;
    costo_operacion?: number;
}

// Cuanto puede mover la recomendacion: solo las acciones del usuario, sumar
// hasta 2 nuevas (default de api-ml) o usar todo el panel.
export type BlAlcance = 'mias' | 'pocas' | 'todas';

export async function getBlackLittermanEndpoint(
    carteraAncla?: 'propia' | 'equal_weight',
    alcance: BlAlcance = 'pocas',
): Promise<BlResponse> {
    const params: Record<string, string | number | boolean> = {};
    if (carteraAncla) params.cartera_ancla = carteraAncla;
    if (alcance === 'mias') params.max_nuevas = 0;
    if (alcance === 'todas') params.todas = true;
    const res = await authAxios.get(
        `${base()}/user/shares/portfolio/recomendacion`,
        { params: Object.keys(params).length ? params : undefined },
    );
    return res.data;
}

export interface FairValueChannelPoint {
    date: string;
    estimado: number;
    lo1: number;
    hi1: number;
    lo2: number;
    hi2: number;
}

export interface FairValueResponse {
    symbol: string;
    as_of: string;
    ventana: number;
    precio_actual: number;
    precio_estimado: number;
    diferencia: number;
    desvios: number;
    posicion: 'por_encima' | 'por_debajo' | 'en_linea';
    tendencia_anual: number;
    r2: number;
    // desvio estandar de los residuos de la recta, en log
    desvio_log: number;
    historico: FairValueTramo & { horizonte: number };
    // que paso en el panel en las ruedas siguientes, por distancia a la tendencia
    evidencia: { horizonte: number; casos: number; tramos: FairValueTramo[] };
    canal: FairValueChannelPoint[];
}

export interface FairValueTramo {
    desde: number | null;
    hasta: number | null;
    sube: number;
    relativo: number;
    casos: number;
}

export async function getFairValueEndpoint(
    ticker: string,
): Promise<FairValueResponse> {
    const res = await authAxios.get(
        `${base()}/user/shares/${encodeURIComponent(ticker)}/fair-value`,
    );
    return res.data;
}
