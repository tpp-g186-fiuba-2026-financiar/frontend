import type {
    CompareTrendsResponse,
    ModelPrediction,
} from '../api/userShares/getShareTrendCompareEndpoint';

export type Signal = 'alza' | 'baja' | 'neutral';

export function normalizeSignal(raw: string | null | undefined): Signal {
    const s = (raw ?? '').toLowerCase();
    if (s.includes('alza') || s === 'buy' || s === 'up') return 'alza';
    if (s.includes('baja') || s === 'sell' || s === 'down') return 'baja';
    return 'neutral';
}

export function expectedReturn(
    p:
        | Pick<ModelPrediction, 'last_close' | 'predicted_close'>
        | null
        | undefined,
): number | null {
    if (
        !p ||
        p.last_close == null ||
        p.predicted_close == null ||
        p.last_close <= 0
    )
        return null;
    return p.predicted_close / p.last_close - 1;
}

export function probabilityOf(p: unknown): number | null {
    const v = (p as { probability_up?: number | null } | null)?.probability_up;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function accuracyOf(
    p: ModelPrediction | null | undefined,
): number | null {
    const v = p?.backtest?.directional_accuracy;
    if (v == null) return null;
    return v <= 1 ? v : v / 100;
}

const MODEL_LABELS: Record<string, string> = {
    lstm: 'LSTM',
    'lstm-modal': 'LSTM',
    xgboost: 'XGBoost',
    'xgboost-modal': 'XGBoost',
    transformer: 'Transformer',
    'transformer-modal': 'Transformer',
    'transformer-v1': 'Transformer v1',
    arima: 'ARIMA',
    'arima-modal': 'ARIMA',
    contexto: 'Contexto',
    macro: 'Macro',
    'svm-modal': 'SVM',
    'garch-modal': 'GARCH',
    'garch-ann-modal': 'GARCH-ANN',
};

export function modelLabel(key: string): string {
    return MODEL_LABELS[key] ?? key;
}

export function directionalModels(
    compare: CompareTrendsResponse | undefined,
): Array<[string, ModelPrediction]> {
    if (!compare) return [];
    return Object.entries(compare.predictions).filter(
        ([key, p]) =>
            p.available &&
            !key.startsWith('garch') &&
            p.predicted_close != null,
    );
}

export function confidenceLevel(
    compare: CompareTrendsResponse | undefined,
    probability: number | null,
    base = 0.5,
): 1 | 2 | 3 {
    const models = directionalModels(compare);
    const signals = models.map(([, p]) => normalizeSignal(p.signal));
    const dominant =
        signals.filter((s) => s === 'alza').length >=
        signals.filter((s) => s === 'baja').length
            ? 'alza'
            : 'baja';
    const agreement = signals.length
        ? signals.filter((s) => s === dominant).length / signals.length
        : 0;
    if (probability != null) {
        const d = Math.abs(probability - base);
        if (d >= 0.1 && agreement >= 0.6) return 3;
        if (d >= 0.05) return 2;
        return 1;
    }
    const c = compare?.consensus;
    if (
        !c ||
        c.classification === 'neutral' ||
        c.classification === 'sin_datos'
    )
        return 1;
    return c.aggregate_confidence >= 0.55 && agreement >= 0.6 ? 3 : 2;
}

export function consensusSignal(
    compare: CompareTrendsResponse | undefined,
): Signal {
    const c = compare?.consensus?.classification;
    if (c === 'sobrecompra') return 'alza';
    if (c === 'sobreventa') return 'baja';
    return 'neutral';
}

export function logReturns(prices: number[]): number[] {
    const out: number[] = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] > 0 && prices[i] > 0)
            out.push(Math.log(prices[i] / prices[i - 1]));
    }
    return out;
}

export function mean(a: number[]): number {
    return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
}

export function std(a: number[]): number {
    if (a.length < 2) return 0;
    const m = mean(a);
    return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
}

export function valueAtRisk(
    returns: number[],
): { var95: number; cvar95: number } | null {
    if (returns.length < 20) return null;
    const sorted = [...returns].sort((a, b) => a - b);
    const k = Math.max(1, Math.floor(sorted.length * 0.05));
    return { var95: -sorted[k - 1], cvar95: -mean(sorted.slice(0, k)) };
}

export function drawdownSeries(values: number[]): number[] {
    let peak = -Infinity;
    return values.map((v) => {
        peak = Math.max(peak, v);
        return peak > 0 ? v / peak - 1 : 0;
    });
}

export function correlation(a: number[], b: number[]): number | null {
    const n = Math.min(a.length, b.length);
    if (n < 10) return null;
    const x = a.slice(-n);
    const y = b.slice(-n);
    const mx = mean(x);
    const my = mean(y);
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    for (let i = 0; i < n; i++) {
        sxy += (x[i] - mx) * (y[i] - my);
        sxx += (x[i] - mx) ** 2;
        syy += (y[i] - my) ** 2;
    }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

export function annualizedVol(returns: number[]): number {
    return std(returns) * Math.sqrt(252);
}

export function steppedReturns(values: number[], step = 5): number[] {
    const out: number[] = [];
    for (let i = step; i < values.length; i += step) {
        if (values[i - step] > 0) out.push(values[i] / values[i - step] - 1);
    }
    return out;
}

export interface ConsensusPart {
    model: string;
    ret: number;
    quality: number;
    agreement: number;
    signal: Signal;
}

const PRIOR_CASES = 50;

export function modelQuality(p: ModelPrediction): number {
    const acc = accuracyOf(p);
    if (acc == null) return 0.5;
    const n = p.backtest?.observations;
    if (!n || n <= 0) return acc;
    return 0.5 + (acc - 0.5) * (n / (n + PRIOR_CASES));
}

export function consensusParts(compare: CompareTrendsResponse | undefined): {
    parts: ConsensusPart[];
    score: number | null;
} {
    const comps = compare?.consensus?.components;
    if (comps && comps.length) {
        return {
            parts: comps.map((c) => ({
                model: c.model,
                ret: c.expected_return,
                quality: c.quality,
                agreement: c.agreement,
                signal: normalizeSignal(c.signal),
            })),
            score: compare!.consensus!.composite_score,
        };
    }
    const parts: ConsensusPart[] = [];
    for (const [model, p] of uniqueModels(compare)) {
        if (!p.last_close || !p.predicted_close || p.last_close <= 0) continue;
        const ret = Math.log(p.predicted_close / p.last_close);
        const signal = normalizeSignal(p.signal);
        const sign = ret > 0 ? 'alza' : ret < 0 ? 'baja' : 'neutral';
        const agreement = signal === sign || ret === 0 ? 1 : 0.5;
        parts.push({ model, ret, quality: modelQuality(p), agreement, signal });
    }
    const sq = parts.reduce((s, x) => s + x.quality, 0);
    const score =
        sq > 0
            ? parts.reduce((s, x) => s + x.quality * x.ret * x.agreement, 0) /
              sq
            : null;
    return { parts, score };
}

export function probabilityUp(
    compare: CompareTrendsResponse | undefined,
    trend?: unknown,
): number | null {
    if (compare) {
        for (const [key, p] of Object.entries(compare.predictions)) {
            if (key.startsWith('xgboost') && p.available) {
                const v = probabilityOf(p);
                if (v != null) return v;
            }
        }
    }
    return probabilityOf(trend);
}

export function changeOver(closes: number[], days = 5): number | null {
    if (closes.length <= days) return null;
    const a = closes[closes.length - 1 - days];
    const b = closes[closes.length - 1];
    return a > 0 ? (b / a - 1) * 100 : null;
}

export function signalLevel(r: {
    last_close: number;
    predicted_close: number;
    horizon_days: number;
}): 1 | 2 | 3 {
    if (!r.last_close || !r.predicted_close) return 1;
    const move =
        Math.abs(r.predicted_close / r.last_close - 1) /
        Math.sqrt(Math.max(1, r.horizon_days));
    return move >= 0.006 ? 3 : move >= 0.003 ? 2 : 1;
}

export function portfolioSeries(
    holdings: Array<{ ticker: string; quantity: number }>,
    history: Record<string, Array<{ ts: number; close: number }>>,
): { dates: number[]; values: number[] } {
    const withData = holdings.filter(
        (h) => (history[h.ticker]?.length ?? 0) > 1,
    );
    if (!withData.length) return { dates: [], values: [] };
    const maps = withData.map(
        (h) =>
            new Map(
                history[h.ticker].map((p) => [
                    new Date(p.ts).toISOString().slice(0, 10),
                    p.close,
                ]),
            ),
    );
    const days = [...maps[0].keys()]
        .filter((d) => maps.every((m) => m.has(d)))
        .sort()
        .slice(-253);
    return {
        dates: days.map((d) => new Date(d).getTime()),
        values: days.map((d) =>
            withData.reduce((s, h, i) => s + h.quantity * maps[i].get(d)!, 0),
        ),
    };
}

export function uniqueModels(
    compare: CompareTrendsResponse | undefined,
): Array<[string, ModelPrediction]> {
    const best = new Map<string, [string, ModelPrediction]>();
    for (const entry of directionalModels(compare)) {
        const label = modelLabel(entry[0]);
        const cur = best.get(label);
        const obs = (e: [string, ModelPrediction]) =>
            e[1].backtest?.observations ?? 0;
        if (
            !cur ||
            obs(entry) > obs(cur) ||
            (obs(entry) === obs(cur) && !entry[0].endsWith('-modal'))
        )
            best.set(label, entry);
    }
    return [...best.values()];
}

export function upBaseRate(
    closes: number[],
    horizon = 20,
    lookback = 750,
): number | null {
    const c = closes.slice(-(lookback + horizon));
    let ups = 0;
    let n = 0;
    for (let i = 0; i + horizon < c.length; i++) {
        if (c[i] > 0 && c[i + horizon] !== c[i]) {
            n++;
            if (c[i + horizon] > c[i]) ups++;
        }
    }
    return n >= 60 ? ups / n : null;
}

export interface TechCheck {
    label: string;
    detail: string;
    tone: 'up' | 'down' | 'neutral';
}

function smaLast(prices: number[], n: number): number | null {
    if (prices.length < n) return null;
    return mean(prices.slice(-n));
}

function rsiLast(prices: number[], n = 14): number | null {
    if (prices.length <= n) return null;
    let gain = 0;
    let loss = 0;
    for (let i = prices.length - n; i < prices.length; i++) {
        const d = prices[i] - prices[i - 1];
        if (d > 0) gain += d;
        else loss -= d;
    }
    if (gain + loss === 0) return 50;
    return (100 * gain) / (gain + loss);
}

const pctTxt = (v: number) =>
    (v >= 0 ? '+' : '−') +
    Math.abs(v * 100)
        .toFixed(1)
        .replace('.', ',') +
    '%';

// Chequeos técnicos de una línea sobre los cierres diarios (estilo "due
// diligence checks"). No son un modelo: describen dónde está el precio.
// `rsi` permite usar el mismo RSI que ya muestra la pantalla (el de los
// modelos), para no mostrar dos números distintos.
export function technicalChecks(
    closes: number[],
    rsiOverride?: number | null,
): TechCheck[] {
    const last = closes[closes.length - 1];
    if (!last || closes.length < 30) return [];
    const out: TechCheck[] = [];
    const sma50 = smaLast(closes, 50);
    const sma200 = smaLast(closes, 200);
    if (sma50 != null)
        out.push({
            label: 'Media de 50 ruedas',
            detail: `El precio está ${pctTxt(last / sma50 - 1)} respecto de su promedio de 50 ruedas.`,
            tone: last >= sma50 ? 'up' : 'down',
        });
    if (sma200 != null)
        out.push({
            label: 'Media de 200 ruedas',
            detail: `El precio está ${pctTxt(last / sma200 - 1)} respecto de su promedio de 200 ruedas.`,
            tone: last >= sma200 ? 'up' : 'down',
        });
    if (sma50 != null && sma200 != null)
        out.push({
            label: 'Cruce de medias',
            detail:
                sma50 >= sma200
                    ? 'La media de 50 está arriba de la de 200 (cruce dorado): tendencia de fondo alcista.'
                    : 'La media de 50 está abajo de la de 200 (cruce de la muerte): tendencia de fondo bajista.',
            tone: sma50 >= sma200 ? 'up' : 'down',
        });
    const year = closes.slice(-252);
    const hi = Math.max(...year);
    const lo = Math.min(...year);
    const fromHi = last / hi - 1;
    out.push({
        label: 'Máximo del año',
        detail: `Está ${pctTxt(fromHi)} de su máximo de las últimas ${year.length} ruedas.`,
        tone: fromHi > -0.05 ? 'up' : fromHi < -0.3 ? 'down' : 'neutral',
    });
    const fromLo = last / lo - 1;
    out.push({
        label: 'Mínimo del año',
        detail: `Está ${pctTxt(fromLo)} por encima de su mínimo del mismo período.`,
        tone: fromLo < 0.05 ? 'down' : 'neutral',
    });
    const rsi = rsiOverride ?? rsiLast(closes);
    if (rsi != null)
        out.push({
            label: 'RSI (14)',
            detail:
                rsi > 70
                    ? `RSI ${Math.round(rsi)}: subió mucho y rápido (sobrecompra).`
                    : rsi < 30
                      ? `RSI ${Math.round(rsi)}: cayó mucho y rápido (sobreventa).`
                      : `RSI ${Math.round(rsi)}: sin excesos.`,
            tone: rsi > 70 ? 'down' : rsi < 30 ? 'up' : 'neutral',
        });
    if (closes.length > 63) {
        const m3 = last / closes[closes.length - 64] - 1;
        out.push({
            label: 'Momentum de 3 meses',
            detail: `Rindió ${pctTxt(m3)} en las últimas 63 ruedas.`,
            tone: m3 > 0.05 ? 'up' : m3 < -0.05 ? 'down' : 'neutral',
        });
    }
    return out;
}
