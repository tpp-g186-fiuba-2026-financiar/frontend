import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SharesTableBody from '../components/SharesTable/SharesTableBody';
import Sparkline from '../components/SharesTable/Sparkline';
import { bestModelOf, shrunkAccuracy } from '../utils/defaultModels';
import {
    projectionBand,
    signalLabel,
    signalStrength,
} from '../utils/modelInsights';

const trend = (over = {}) => ({
    ticker: 'GGAL',
    available: true,
    signal: 'alza',
    condition: 'sobreventa',
    rsi: 28,
    horizon_days: 20,
    last_close: 5750,
    predicted_close: 6621,
    as_of: '2026-10-14',
    model: 'contexto',
    model_version: 'contexto-1',
    reason: null,
    ...over,
});

const row = (over = {}) => ({
    ticker: 'GGAL',
    quantity: 120,
    trend: trend(),
    entryPrice: 5000,
    currentPrice: 5750,
    pnlAmount: 48300,
    pnlPercentage: 7.5,
    ...over,
});

function renderBody(rows: ReturnType<typeof row>[], props = {}) {
    return render(
        <table>
            <SharesTableBody
                rows={rows}
                setSelectedTicker={() => {}}
                {...props}
            />
        </table>,
    );
}

describe('signalLabel / signalStrength', () => {
    it('incluye el horizonte solo si hay dirección', () => {
        expect(signalLabel('alza', 20)).toBe('alza · 20r');
        expect(signalLabel('baja', null)).toBe('baja');
        expect(signalLabel('neutral', 20)).toBe('sin vista');
    });

    it('mide la fuerza con la probabilidad cuando existe', () => {
        const base = { signal: 'alza', last_close: 100, predicted_close: 101 };
        expect(signalStrength({ ...base, probability_up: 0.9 })).toBe(3);
        expect(signalStrength({ ...base, probability_up: 0.8 })).toBe(2);
        expect(signalStrength({ ...base, probability_up: 0.6 })).toBe(1);
    });

    it('sin probabilidad usa el tamaño del movimiento y no marca neutral', () => {
        expect(
            signalStrength({
                signal: 'alza',
                last_close: 100,
                predicted_close: 106,
            }),
        ).toBe(3);
        expect(
            signalStrength({
                signal: 'baja',
                last_close: 100,
                predicted_close: 97,
            }),
        ).toBe(2);
        expect(
            signalStrength({
                signal: 'alza',
                last_close: 100,
                predicted_close: 100.5,
            }),
        ).toBe(1);
        expect(
            signalStrength({
                signal: 'neutral',
                last_close: 100,
                predicted_close: 100,
            }),
        ).toBe(0);
        expect(
            signalStrength({
                signal: 'alza',
                last_close: null,
                predicted_close: null,
            }),
        ).toBe(1);
    });
});

describe('projectionBand', () => {
    const flat = Array.from({ length: 70 }, () => ({ close: 100 }));
    const noisy = Array.from({ length: 70 }, (_, i) => ({
        close: 100 + (i % 2 ? 2 : -2),
    }));

    it('no dibuja banda sin historia suficiente o sin horizonte', () => {
        expect(projectionBand(flat.slice(0, 10), 100, 20)).toBeNull();
        expect(projectionBand(flat, 100, null)).toBeNull();
    });

    it('es simétrica en log alrededor del proyectado y crece con el horizonte', () => {
        const short = projectionBand(noisy, 110, 5)!;
        const long = projectionBand(noisy, 110, 20)!;
        expect(short.low).toBeLessThan(110);
        expect(short.high).toBeGreaterThan(110);
        expect(long.high - long.low).toBeGreaterThan(short.high - short.low);
        expect(Math.sqrt(short.low * short.high)).toBeCloseTo(110, 5);
    });

    it('una serie sin movimiento da una banda de ancho cero', () => {
        const band = projectionBand(flat, 100, 20)!;
        expect(band.high - band.low).toBeCloseTo(0, 8);
    });
});

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

describe('SharesTableBody', () => {
    it('muestra horizonte y fuerza en la señal', () => {
        renderBody([row()]);
        expect(screen.getByText('alza · 20r')).toBeInTheDocument();
        expect(
            screen.getByLabelText('Fuerza de la señal: 3 de 3'),
        ).toBeInTheDocument();
    });

    it('«sin vista» no lleva medidor de fuerza', () => {
        renderBody([
            row({ trend: trend({ signal: 'neutral', predicted_close: 5750 }) }),
        ]);
        expect(screen.getByText('sin vista')).toBeInTheDocument();
        expect(screen.queryByLabelText(/Fuerza de la señal/)).toBeNull();
    });

    it('muestra esqueletos mientras llegan precios y señales', () => {
        const { container } = renderBody(
            [
                row({
                    trend: null,
                    pnlAmount: null,
                    pnlPercentage: null,
                    currentPrice: null,
                }),
            ],
            { pnlLoading: true, trendsLoading: true },
        );
        expect(
            container.querySelectorAll('.skel').length,
        ).toBeGreaterThanOrEqual(5);
        expect(screen.getByText('GGAL')).toBeInTheDocument();
    });

    it('usa el minigráfico de 30 días cuando hay historial', () => {
        renderBody([row()], { historyByTicker: { GGAL: [1, 2, 3, 4, 5, 6] } });
        expect(
            screen.getByRole('img', { name: 'Últimos 30 días de GGAL' }),
        ).toBeInTheDocument();
    });
});
