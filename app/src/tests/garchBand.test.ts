import { describe, expect, it } from 'vitest';
import { buildGarchBand } from '../utils/garchBand';

describe('buildGarchBand', () => {
    it('devuelve vacio sin precio base o sin pronostico', () => {
        expect(
            buildGarchBand(null, [{ horizon_days: 1, volatility_pct: 2 }]),
        ).toEqual([]);
        expect(
            buildGarchBand(0, [{ horizon_days: 1, volatility_pct: 2 }]),
        ).toEqual([]);
        expect(buildGarchBand(100, null)).toEqual([]);
        expect(buildGarchBand(100, [])).toEqual([]);
        expect(
            buildGarchBand(100, [{ horizon_days: 0, volatility_pct: 2 }]),
        ).toEqual([]);
    });

    it('acumula las varianzas diarias y arranca en el precio base', () => {
        const band = buildGarchBand(100, [
            { horizon_days: 2, volatility_pct: 4 },
            { horizon_days: 1, volatility_pct: 3 },
        ]);
        expect(band.map((point) => point.days)).toEqual([0, 1, 2]);
        expect(band[0]).toMatchObject({ low: 100, high: 100, sigmaPct: 0 });
        expect(band[1].sigmaPct).toBeCloseTo(3);
        // sqrt(3^2 + 4^2) = 5
        expect(band[2].sigmaPct).toBeCloseTo(5);
        expect(band[2].high).toBeCloseTo(100 * Math.exp(0.05));
        expect(band[2].low).toBeCloseTo(100 * Math.exp(-0.05));
    });

    it('rellena ruedas faltantes con la volatilidad del punto siguiente', () => {
        const band = buildGarchBand(100, [
            { horizon_days: 1, volatility_pct: 2 },
            { horizon_days: 3, volatility_pct: 2 },
        ]);
        // 3 ruedas de 2% -> 2 * sqrt(3)
        expect(band[2].sigmaPct).toBeCloseTo(2 * Math.sqrt(3));
    });

    it('escala la banda con la cantidad de sigmas', () => {
        const [, oneSigma] = buildGarchBand(100, [
            { horizon_days: 1, volatility_pct: 2 },
        ]);
        const [, twoSigmas] = buildGarchBand(
            100,
            [{ horizon_days: 1, volatility_pct: 2 }],
            2,
        );
        expect(twoSigmas.high).toBeCloseTo(100 * Math.exp(0.04));
        expect(twoSigmas.high).toBeGreaterThan(oneSigma.high);
    });
});
