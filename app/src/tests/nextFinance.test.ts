import { describe, expect, test } from 'vitest';
import {
    accuracyOf,
    changeOver,
    confidenceLevel,
    consensusParts,
    consensusSignal,
    correlation,
    drawdownSeries,
    expectedReturn,
    logReturns,
    modelLabel,
    modelQuality,
    normalizeSignal,
    portfolioSeries,
    probabilityUp,
    signalLevel,
    steppedReturns,
    uniqueModels,
    valueAtRisk,
} from '../next/finance';
import {
    arrow,
    longDate,
    num,
    pct,
    pct1,
    shortDate,
    tone,
    usd,
    usd0,
} from '../next/format';
import { BYMA, NYSE, marketStatus } from '../next/shell/marketClock';
import type { CompareTrendsResponse } from '../api/userShares/getShareTrendCompareEndpoint';

const p = (over: Record<string, unknown> = {}) =>
    ({
        available: true,
        signal: 'alza',
        condition: null,
        rsi: 50,
        horizon_days: 5,
        last_close: 100,
        predicted_close: 105,
        as_of: null,
        model: null,
        model_version: null,
        backtest: null,
        volatility_forecast: null,
        reason: null,
        ...over,
    }) as CompareTrendsResponse['predictions'][string];

const cmp = (
    predictions: Record<string, ReturnType<typeof p>>,
    consensus?: Partial<NonNullable<CompareTrendsResponse['consensus']>>,
): CompareTrendsResponse => ({
    symbol: 'X',
    as_of: null,
    default_model: null,
    predictions,
    consensus: consensus as CompareTrendsResponse['consensus'],
});

describe('señales y modelos', () => {
    test('normaliza señales en castellano e inglés', () => {
        expect(normalizeSignal('Alza')).toBe('alza');
        expect(normalizeSignal('sell')).toBe('baja');
        expect(normalizeSignal(null)).toBe('neutral');
    });

    test('retorno esperado, accuracy y nombres', () => {
        expect(expectedReturn(p())).toBeCloseTo(0.05);
        expect(expectedReturn(p({ last_close: 0 }))).toBeNull();
        expect(expectedReturn(null)).toBeNull();
        expect(
            accuracyOf(p({ backtest: { directional_accuracy: 62 } })),
        ).toBeCloseTo(0.62);
        expect(accuracyOf(p())).toBeNull();
        expect(modelLabel('xgboost-modal')).toBe('XGBoost');
        expect(modelLabel('nuevo')).toBe('nuevo');
    });

    test('calidad de un modelo ajustada por cantidad de casos', () => {
        expect(modelQuality(p())).toBe(0.5);
        expect(
            modelQuality(p({ backtest: { directional_accuracy: 0.7 } })),
        ).toBeCloseTo(0.7);
        expect(
            modelQuality(
                p({
                    backtest: { directional_accuracy: 0.7, observations: 50 },
                }),
            ),
        ).toBeCloseTo(0.6);
    });

    test('un modelo por nombre: la versión con más historia', () => {
        const res = uniqueModels(
            cmp({
                lstm: p({ backtest: { observations: 5 } }),
                'lstm-modal': p({ backtest: { observations: 30 } }),
                xgboost: p(),
                'xgboost-modal': p(),
                garch: p(),
                svm: p({ predicted_close: null }),
            }),
        ).map(([k]) => k);
        expect(res).toEqual(['lstm-modal', 'xgboost']);
    });

    test('cuenta del consenso con y sin componentes de api-ml', () => {
        const official = consensusParts(
            cmp(
                {},
                {
                    composite_score: 0.02,
                    components: [
                        {
                            model: 'lstm',
                            expected_return: 0.03,
                            quality: 0.6,
                            agreement: 1,
                            signal: 'alza',
                        },
                    ],
                },
            ),
        );
        expect(official.score).toBe(0.02);
        expect(official.parts[0].signal).toBe('alza');
        const own = consensusParts(
            cmp({
                lstm: p(),
                xgboost: p({ signal: 'neutral', predicted_close: 95 }),
            }),
        );
        expect(own.parts.find((x) => x.model === 'xgboost')?.agreement).toBe(
            0.5,
        );
        expect(own.score).toBeGreaterThan(0);
        expect(consensusParts(undefined)).toEqual({ parts: [], score: null });
    });

    test('probabilidad de suba, señal combinada y confianza', () => {
        const c = cmp(
            { xgboost: { ...p(), probability_up: 0.71 } as never, lstm: p() },
            { classification: 'sobrecompra', aggregate_confidence: 0.6 },
        );
        expect(probabilityUp(c)).toBe(0.71);
        expect(probabilityUp(undefined, { probability_up: 0.4 })).toBe(0.4);
        expect(consensusSignal(c)).toBe('alza');
        expect(consensusSignal(cmp({}, { classification: 'sobreventa' }))).toBe(
            'baja',
        );
        expect(confidenceLevel(c, 0.71)).toBe(3);
        expect(confidenceLevel(c, 0.56)).toBe(2);
        expect(confidenceLevel(c, 0.51)).toBe(1);
        expect(confidenceLevel(c, null)).toBe(3);
        expect(
            confidenceLevel(cmp({}, { classification: 'neutral' }), null),
        ).toBe(1);
        expect(
            confidenceLevel(
                cmp(
                    { lstm: p({ signal: 'baja' }), x: p() },
                    { classification: 'sobreventa', aggregate_confidence: 0.5 },
                ),
                null,
            ),
        ).toBe(2);
    });

    test('confianza de una señal guardada', () => {
        expect(
            signalLevel({
                last_close: 100,
                predicted_close: 103,
                horizon_days: 5,
            }),
        ).toBe(3);
        expect(
            signalLevel({
                last_close: 100,
                predicted_close: 100.8,
                horizon_days: 5,
            }),
        ).toBe(2);
        expect(
            signalLevel({
                last_close: 100,
                predicted_close: 100.1,
                horizon_days: 5,
            }),
        ).toBe(1);
        expect(
            signalLevel({ last_close: 0, predicted_close: 1, horizon_days: 5 }),
        ).toBe(1);
    });
});

describe('riesgo', () => {
    const prices = Array.from(
        { length: 60 },
        (_, k) => 100 + Math.sin(k) * 5 + k * 0.2,
    );

    test('retornos, VaR, caídas y correlación', () => {
        const r = logReturns(prices);
        expect(r).toHaveLength(59);
        const v = valueAtRisk(r)!;
        expect(v.cvar95).toBeGreaterThanOrEqual(v.var95);
        expect(valueAtRisk(r.slice(0, 5))).toBeNull();
        expect(Math.min(...drawdownSeries(prices))).toBeLessThan(0);
        expect(correlation(r, r)).toBeCloseTo(1);
        expect(correlation(r.slice(0, 3), r.slice(0, 3))).toBeNull();
        expect(changeOver([100, 101, 102, 103, 104, 110], 5)).toBeCloseTo(10);
        expect(changeOver([1, 2], 5)).toBeNull();
    });

    test('serie de la cartera con las cantidades de hoy', () => {
        const h = (base: number) =>
            Array.from({ length: 3 }, (_, k) => ({
                ts: Date.UTC(2026, 0, k + 1),
                close: base + k,
            }));
        const s = portfolioSeries(
            [
                { ticker: 'A', quantity: 2 },
                { ticker: 'B', quantity: 1 },
                { ticker: 'C', quantity: 1 },
            ],
            { A: h(10), B: h(20) },
        );
        expect(s.values).toEqual([40, 43, 46]);
        expect(portfolioSeries([{ ticker: 'A', quantity: 1 }], {})).toEqual({
            dates: [],
            values: [],
        });
    });

    test('steppedReturns agrupa cada N ruedas', () => {
        expect(steppedReturns([100, 101, 102, 103, 104, 110], 5)[0]).toBeCloseTo(
            0.1,
        );
        expect(steppedReturns([100, 90], 5)).toEqual([]);
    });
});

describe('formatos y horario de mercado', () => {
    test('números en castellano', () => {
        expect(usd(1234.5)).toBe('$1.234,50');
        expect(usd0(1234.5)).toBe('$1.235');
        expect(pct(-1.234)).toBe('−1,23%');
        expect(pct1(12.34)).toBe('12,3%');
        expect(num(1.5, 1)).toBe('1,5');
        expect(arrow(-1)).toBe('▼');
        expect(tone(0)).toBe('nx-up');
        expect(shortDate('2026-09-28')).toMatch(/28/);
        expect(longDate(new Date(2026, 8, 28))).toMatch(/28/);
    });

    test('abre y cierra según la hora de cada bolsa', () => {
        expect(
            marketStatus(
                'UTC',
                [10, 0],
                [16, 0],
                new Date('2026-10-20T12:00:00Z'),
            ),
        ).toMatchObject({ isOpen: true, message: 'cierra en 4h 00m' });
        expect(
            marketStatus(
                'UTC',
                [10, 0],
                [16, 0],
                new Date('2026-10-20T08:30:00Z'),
            ).message,
        ).toBe('abre en 1h 30m');
        expect(
            marketStatus(
                'UTC',
                [10, 0],
                [16, 0],
                new Date('2026-10-18T12:00:00Z'),
            ).isOpen,
        ).toBe(false);
        expect(BYMA().time).toMatch(/\d\d:\d\d/);
        expect(NYSE().time).toMatch(/\d\d:\d\d/);
    });
});
