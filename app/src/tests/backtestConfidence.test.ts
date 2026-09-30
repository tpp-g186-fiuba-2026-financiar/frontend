import { describe, expect, it } from 'vitest';
import {
    pickClearWinner,
    toBacktestAccuracy,
    wilsonInterval,
} from '../utils/backtestConfidence';

const model = (accuracy: number, observations: number) =>
    toBacktestAccuracy({ directional_accuracy: accuracy, observations })!;

describe('wilsonInterval', () => {
    it('es más ancho con pocos casos que con muchos', () => {
        const [lowSmall, highSmall] = wilsonInterval(0.6, 20);
        const [lowBig, highBig] = wilsonInterval(0.6, 2000);
        expect(highSmall - lowSmall).toBeGreaterThan(5 * (highBig - lowBig));
    });
});

describe('toBacktestAccuracy', () => {
    it('devuelve null sin accuracy o sin casos', () => {
        expect(toBacktestAccuracy(null)).toBeNull();
        expect(toBacktestAccuracy({ directional_accuracy: 0.9 })).toBeNull();
    });

    it('usa el intervalo del backend si viene', () => {
        const measured = toBacktestAccuracy({
            directional_accuracy: 0.6,
            observations: 24,
            accuracy_low: 0.4,
            accuracy_high: 0.78,
        });
        expect([measured?.low, measured?.high]).toEqual([0.4, 0.78]);
    });
});

describe('pickClearWinner', () => {
    it('corona si supera claramente al azar y al resto, y no si la diferencia es ruido', () => {
        expect(
            pickClearWinner([
                ['arima-modal', model(0.93, 30)],
                ['lstm-modal', model(0.5, 60)],
            ]),
        ).toBe('arima-modal'); // 93% con 30 casos sí supera claramente al azar
        expect(
            pickClearWinner([
                ['lstm', model(0.67, 24)],
                ['xgboost', model(0.52, 24)],
            ]),
        ).toBeNull(); // 67% vs 52% con 24 casos: no se distinguen
    });

    it('no corona a un modelo que no supera al azar', () => {
        expect(pickClearWinner([['a', model(0.55, 40)]])).toBeNull();
    });

    it('corona cuando el intervalo del mejor supera al del resto', () => {
        expect(
            pickClearWinner([
                ['a', model(0.8, 400)],
                ['b', model(0.5, 400)],
            ]),
        ).toBe('a');
    });

    it('devuelve null sin modelos medidos', () => {
        expect(pickClearWinner([])).toBeNull();
    });
});
