import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { PredictionStrip } from '../next/ui/Charts';

describe('PredictionStrip', () => {
    test('muestra cada modelo, las zonas del perfil y la lectura combinada', () => {
        render(
            <PredictionStrip
                ariaLabel="predicciones"
                rows={[
                    { label: 'LSTM', ret: 0.03, h: 5, color: 'green' },
                    { label: 'ARIMA', ret: -0.02, h: 5, color: 'red' },
                ]}
                thresholds={{ buy: 0.015, sell: -0.015 }}
                combined={{
                    ret: 0.018,
                    h: 13,
                    color: 'green',
                    verdict: 'SUBE',
                }}
            />,
        );

        expect(
            screen.getByRole('img', { name: 'predicciones' }),
        ).toBeInTheDocument();
        expect(screen.getByText('ALZA ▶')).toBeInTheDocument();
        expect(screen.getByText('◀ BAJA')).toBeInTheDocument();
        expect(screen.getByText('NEUTRAL')).toBeInTheDocument();
        expect(screen.getByText('LSTM')).toBeInTheDocument();
        expect(screen.getByText('+3,0%')).toBeInTheDocument();
        expect(screen.getByText('−2,0%')).toBeInTheDocument();
        expect(screen.getByText('Lectura combinada')).toBeInTheDocument();
        expect(screen.getByText('+1,8%')).toBeInTheDocument();
    });

    test('sin predicciones avisa en vez de dibujar un eje vacío', () => {
        render(<PredictionStrip ariaLabel="predicciones" rows={[]} />);
        expect(screen.getByText(/todavía no respondieron/)).toBeInTheDocument();
    });
});
