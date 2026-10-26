import { describe, expect, test } from 'vitest';
import { technicalChecks } from '../next/finance';

const ramp = (n: number, from: number, step: number) =>
    Array.from({ length: n }, (_, k) => from + k * step);

describe('technicalChecks', () => {
    test('una suba sostenida da chequeos alcistas', () => {
        const checks = technicalChecks(ramp(260, 100, 1));
        const byLabel = Object.fromEntries(checks.map((c) => [c.label, c]));
        expect(byLabel['Media de 50 ruedas'].tone).toBe('up');
        expect(byLabel['Media de 200 ruedas'].tone).toBe('up');
        expect(byLabel['Cruce de medias'].tone).toBe('up');
        expect(byLabel['Máximo del año'].tone).toBe('up');
        expect(byLabel['RSI (14)'].tone).toBe('down');
        expect(byLabel['Momentum de 3 meses'].tone).toBe('up');
    });

    test('una caída sostenida da chequeos bajistas', () => {
        const checks = technicalChecks(ramp(260, 400, -1));
        const byLabel = Object.fromEntries(checks.map((c) => [c.label, c]));
        expect(byLabel['Media de 50 ruedas'].tone).toBe('down');
        expect(byLabel['Cruce de medias'].tone).toBe('down');
        expect(byLabel['Mínimo del año'].tone).toBe('down');
    });

    test('con poca historia no inventa chequeos', () => {
        expect(technicalChecks(ramp(10, 100, 1))).toEqual([]);
    });
});
