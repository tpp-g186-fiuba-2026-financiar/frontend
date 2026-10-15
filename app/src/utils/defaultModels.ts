type ModelPrediction = {
    available: boolean;
    backtest?: {
        directional_accuracy?: number | null;
        observations?: number | null;
    } | null;
};

type CompareTrendsResponse = {
    predictions: Record<string, ModelPrediction>;
    default_model?: string | null;
};

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

export interface DefaultModelsConfig {
    /** Toggle global: usar el mejor modelo de cada acción */
    useBest: boolean;
    /** Toggle global: usar el mismo modelo para todas las acciones */
    useSame: boolean;
    /** Modelo elegido en la card "mismo para todos" */
    sameModel: string | null;
    /** Elecciones particulares. NUNCA se borran al tocar los toggles globales */
    perTicker: Record<string, string>;
}

export const DEFAULT_CONFIG: DefaultModelsConfig = {
    useBest: true,
    useSame: false,
    sameModel: null,
    perTicker: {},
};

const STORAGE_KEY = 'defaultModelsConfig';

// TODO: reemplazar por tu endpoint (GET/PUT de preferencias del usuario).
export async function loadConfig(): Promise<DefaultModelsConfig> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
    } catch {
        return DEFAULT_CONFIG;
    }
}

export async function saveConfig(config: DefaultModelsConfig): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function getAccuracy(p: ModelPrediction): number | null {
    if (!p.available) return null;
    return p.backtest?.directional_accuracy ?? null;
}

export function fmtPct(v: number | null): string {
    if (v == null) return '—';
    // por si el backend manda 0-1 en vez de 0-100
    return `${(v <= 1 ? v * 100 : v).toFixed(1)}%`;
}

// Casos "virtuales" al 50% que se le suman a cada accuracy: con pocas
// observaciones el número se acerca al azar, así un 90% sobre 30 casos no le
// gana a un 65% sobre 500 solo por tener suerte. Mismo criterio que usa el
// backend para elegir `default_model`.
const ACCURACY_PRIOR_CASES = 50;

export function shrunkAccuracy(p: ModelPrediction): number | null {
    const acc = getAccuracy(p);
    if (acc == null) return null;
    const value = acc <= 1 ? acc : acc / 100;
    const n = p.backtest?.observations;
    if (n == null || n <= 0) return value;
    return 0.5 + ((value - 0.5) * n) / (n + ACCURACY_PRIOR_CASES);
}

/**
 * Mejor modelo de UNA acción según nuestras métricas: la accuracy direccional
 * de su backtest, ajustada por cantidad de casos. Cada ticker puede tener un
 * ganador distinto.
 */
export function bestModelOf(
    data: CompareTrendsResponse | undefined,
): string | null {
    if (!data) return null;
    let best: string | null = null;
    let bestScore = -Infinity;
    for (const [key, p] of Object.entries(data.predictions)) {
        const score = shrunkAccuracy(p);
        if (score != null && score > bestScore) {
            best = key;
            bestScore = score;
        }
    }
    if (best) return best;
    // fallback: el default del backend si está disponible
    const d = data.default_model;
    return d && data.predictions[d]?.available ? d : null;
}

/**
 * Modelo efectivo para un ticker. Usalo en la página de predicciones.
 * (Conviene moverlo a un utils/ para no mezclar con el componente.)
 */
export function resolveDefaultModel(
    config: DefaultModelsConfig,
    ticker: string,
    data: CompareTrendsResponse | undefined,
): string | null {
    const has = (m: string | null | undefined): m is string =>
        !!m && !!data?.predictions[m]?.available;

    if (config.useSame && has(config.sameModel)) return config.sameModel;
    if (config.useBest) return bestModelOf(data);
    const own = config.perTicker[ticker];
    return has(own) ? own : bestModelOf(data);
}
