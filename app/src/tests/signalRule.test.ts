import { describe, expect, test } from 'vitest';
import { featureValue, signalRule, xgbProbabilityNote } from '../next/format';

describe('signalRule', () => {
    test('muestra los dos umbrales cuando ambos lados están activos', () => {
        const text = signalRule(0.826, 0.44);
        expect(text).toContain('"alza" desde 83%');
        expect(text).toContain('"baja" hasta 44%');
    });

    test('omite el lado apagado', () => {
        const text = signalRule(0.8, null);
        expect(text).toContain('"alza" desde 80%');
        expect(text).not.toContain('baja');
    });

    test('sin umbrales avisa que no emite señales', () => {
        expect(signalRule(null, null)).toMatch(/no emite señales/);
    });
});

describe('xgbProbabilityNote', () => {
    test('un 70% neutral no se vende como alza', () => {
        const text = xgbProbabilityNote(0.7, 'neutral', 20, 0.826, 0.44);
        expect(text).toContain('el 70% de las veces');
        expect(text).toContain('20 ruedas');
        expect(text).toContain('no es una señal de alza');
        expect(text).toContain('"alza" desde 83%');
    });

    test('sin umbrales no dice que el modelo no emite señales', () => {
        const text = xgbProbabilityNote(0.7, 'neutral', 20, null, null);
        expect(text).toContain('extremos');
        expect(text).not.toMatch(/no emite señales/);
    });
});

describe('featureValue', () => {
    test('formatea según la unidad', () => {
        expect(featureValue(-0.084, 'pct')).toBe('−8,4%');
        expect(featureValue(0.72, 'rank')).toBe(
            'mayor que el 72% de las acciones',
        );
        expect(featureValue(1, 'flag')).toBe('sí');
        expect(featureValue(3, 'days')).toBe('3 ruedas');
        expect(featureValue(64.4, 'index')).toBe('64');
        expect(featureValue(1.234, 'num')).toBe('+1,23');
        expect(featureValue(null, 'pct')).toBe('sin dato');
    });
});
