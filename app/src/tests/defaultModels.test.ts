import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    DEFAULT_CONFIG,
    loadConfig,
    saveConfig,
    getAccuracy,
    fmtPct,
    bestModelOf,
    resolveDefaultModel,
    type DefaultModelsConfig,
} from '../utils/defaultModels';

const makePred = (available: boolean, accuracy?: number | null) => ({
    available,
    backtest:
        accuracy === undefined ? undefined : { directional_accuracy: accuracy },
});

beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

describe('loadConfig / saveConfig', () => {
    it('returns DEFAULT_CONFIG when nothing is stored', async () => {
        const cfg = await loadConfig();
        expect(cfg).toEqual(DEFAULT_CONFIG);
    });

    it('merges stored config over the default', async () => {
        localStorage.setItem(
            'defaultModelsConfig',
            JSON.stringify({ useBest: false, sameModel: 'lstm' }),
        );
        const cfg = await loadConfig();
        expect(cfg.useBest).toBe(false);
        expect(cfg.sameModel).toBe('lstm');
        expect(cfg.perTicker).toEqual({}); // sigue viniendo del default
    });

    it('falls back to DEFAULT_CONFIG on malformed JSON', async () => {
        localStorage.setItem('defaultModelsConfig', '{not-json');
        const cfg = await loadConfig();
        expect(cfg).toEqual(DEFAULT_CONFIG);
    });

    it('persists the config via saveConfig and it round-trips through loadConfig', async () => {
        const cfg: DefaultModelsConfig = {
            useBest: false,
            useSame: true,
            sameModel: 'transformer',
            perTicker: { GGAL: 'lstm' },
        };
        await saveConfig(cfg);
        expect(await loadConfig()).toEqual(cfg);
    });
});

describe('getAccuracy', () => {
    it('returns null when the model is not available', () => {
        expect(getAccuracy(makePred(false, 0.8))).toBeNull();
    });

    it('returns null when there is no backtest data', () => {
        expect(getAccuracy(makePred(true))).toBeNull();
    });

    it('returns the directional accuracy when present', () => {
        expect(getAccuracy(makePred(true, 0.73))).toBe(0.73);
    });
});

describe('fmtPct', () => {
    it('renders the dash placeholder for null', () => {
        expect(fmtPct(null)).toBe('—');
    });

    it('scales 0-1 values to a percentage', () => {
        expect(fmtPct(0.734)).toBe('73.4%');
    });

    it('leaves values already in 0-100 range untouched', () => {
        expect(fmtPct(73.4)).toBe('73.4%');
    });

    it('treats exactly 1 as the 0-1 scale (100%)', () => {
        expect(fmtPct(1)).toBe('100.0%');
    });
});

describe('bestModelOf', () => {
    it('returns null when data is undefined', () => {
        expect(bestModelOf(undefined)).toBeNull();
    });

    it('picks the model with the highest accuracy', () => {
        const data = {
            predictions: {
                lstm: makePred(true, 0.6),
                transformer: makePred(true, 0.82),
                arima: makePred(true, 0.5),
            },
        };
        expect(bestModelOf(data)).toBe('transformer');
    });

    it('ignores unavailable models', () => {
        const data = {
            predictions: {
                lstm: makePred(false, 0.99),
                arima: makePred(true, 0.4),
            },
        };
        expect(bestModelOf(data)).toBe('arima');
    });

    it('falls back to default_model when nothing has accuracy data', () => {
        const data = {
            predictions: {
                lstm: makePred(true),
                arima: makePred(true),
            },
            default_model: 'arima',
        };
        expect(bestModelOf(data)).toBe('arima');
    });

    it('does not fall back to a default_model that is unavailable', () => {
        const data = {
            predictions: {
                lstm: makePred(true),
                arima: makePred(false),
            },
            default_model: 'arima',
        };
        expect(bestModelOf(data)).toBeNull();
    });

    it('returns null when there are no predictions and no default_model', () => {
        expect(bestModelOf({ predictions: {} })).toBeNull();
    });
});

describe('resolveDefaultModel', () => {
    const data = {
        predictions: {
            lstm: makePred(true, 0.6),
            transformer: makePred(true, 0.82),
            arima: makePred(false, 0.9),
        },
    };

    it('uses sameModel when useSame is on and it is available', () => {
        const cfg: DefaultModelsConfig = {
            useBest: false,
            useSame: true,
            sameModel: 'lstm',
            perTicker: {},
        };
        expect(resolveDefaultModel(cfg, 'GGAL', data)).toBe('lstm');
    });

    it('falls through to useBest when sameModel is unavailable', () => {
        const cfg: DefaultModelsConfig = {
            useBest: true,
            useSame: true,
            sameModel: 'arima', // no disponible
            perTicker: {},
        };
        expect(resolveDefaultModel(cfg, 'GGAL', data)).toBe('transformer');
    });

    it('uses bestModelOf when useBest is on (ignores perTicker)', () => {
        const cfg: DefaultModelsConfig = {
            useBest: true,
            useSame: false,
            sameModel: null,
            perTicker: { GGAL: 'lstm' },
        };
        expect(resolveDefaultModel(cfg, 'GGAL', data)).toBe('transformer');
    });

    it('uses the per-ticker choice when neither global toggle is on', () => {
        const cfg: DefaultModelsConfig = {
            useBest: false,
            useSame: false,
            sameModel: null,
            perTicker: { GGAL: 'lstm' },
        };
        expect(resolveDefaultModel(cfg, 'GGAL', data)).toBe('lstm');
    });

    it('falls back to bestModelOf when the per-ticker choice is unavailable', () => {
        const cfg: DefaultModelsConfig = {
            useBest: false,
            useSame: false,
            sameModel: null,
            perTicker: { GGAL: 'arima' }, // no disponible
        };
        expect(resolveDefaultModel(cfg, 'GGAL', data)).toBe('transformer');
    });

    it('falls back to bestModelOf when there is no per-ticker choice', () => {
        const cfg: DefaultModelsConfig = {
            useBest: false,
            useSame: false,
            sameModel: null,
            perTicker: {},
        };
        expect(resolveDefaultModel(cfg, 'GGAL', data)).toBe('transformer');
    });
});
