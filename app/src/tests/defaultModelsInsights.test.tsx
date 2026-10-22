import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Sparkline from '../components/SharesTable/Sparkline';
import { bestModelOf, shrunkAccuracy } from '../utils/defaultModels';

describe('bestModelOf', () => {
    const preds = (over = {}) => ({
        predictions: {
            xgboost: {
                available: true,
                backtest: { directional_accuracy: 0.62, observations: 400 },
            },
            lstm: {
                available: true,
                backtest: { directional_accuracy: 0.55, observations: 400 },
            },
            contexto: { available: true },
            ...over,
        },
    });

    it('elige el modelo de mejor accuracy según las métricas de esa acción', () => {
        expect(bestModelOf(preds())).toBe('xgboost');
    });

    it('un modelo sin backtest no gana aunque esté disponible', () => {
        expect(bestModelOf(preds({ xgboost: { available: false } }))).toBe(
            'lstm',
        );
    });

    it('pocos casos pesan menos: 90% sobre 10 no le gana a 62% sobre 400', () => {
        const data = preds({
            lstm: {
                available: true,
                backtest: { directional_accuracy: 0.9, observations: 10 },
            },
        });
        expect(bestModelOf(data)).toBe('xgboost');
        expect(shrunkAccuracy(data.predictions.lstm)).toBeLessThan(
            shrunkAccuracy(data.predictions.xgboost)!,
        );
    });

    it('cada acción puede tener un ganador distinto', () => {
        const a = preds();
        const b = preds({
            lstm: {
                available: true,
                backtest: { directional_accuracy: 0.7, observations: 400 },
            },
        });
        expect(bestModelOf(a)).toBe('xgboost');
        expect(bestModelOf(b)).toBe('lstm');
    });

    it('sin métricas cae al default del backend si está disponible', () => {
        expect(
            bestModelOf({
                default_model: 'contexto',
                predictions: {
                    contexto: { available: true },
                    arima: { available: true },
                },
            }),
        ).toBe('contexto');
        expect(
            bestModelOf({
                default_model: 'x',
                predictions: { x: { available: false } },
            }),
        ).toBeNull();
    });
});

describe('Sparkline', () => {
    it('dibuja la línea y la describe para lectores de pantalla', () => {
        render(
            <Sparkline
                closes={[1, 2, 3, 2, 4]}
                signal="alza"
                label="Últimos 30 días de GGAL"
            />,
        );
        expect(
            screen.getByRole('img', { name: 'Últimos 30 días de GGAL' }),
        ).toBeInTheDocument();
    });
});
