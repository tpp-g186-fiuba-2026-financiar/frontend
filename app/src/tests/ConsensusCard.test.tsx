import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConsensusCard } from '../components/Portfolio/ConsensusCard';
import type { ConsensusReading } from '../api/userShares/getShareTrendCompareEndpoint';

const base: ConsensusReading = {
    symbol: 'GGAL',
    investor_profile: 'moderate',
    classification: 'sobrecompra',
    composite_score: 0.02,
    aggregate_confidence: 0.55,
    models_considered: 5,
    explanation: '4 de 5 modelos coinciden en una lectura alcista.',
    track_record: null,
};

describe('ConsensusCard', () => {
    it('muestra la lectura, la explicación y el disclaimer', () => {
        render(<ConsensusCard consensus={base} />);
        expect(screen.getByText('Sobrecompra')).toBeInTheDocument();
        expect(
            screen.getByText(/4 de 5 modelos coinciden/),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/No constituye asesoramiento financiero/),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/no hay suficientes lecturas comprobadas/),
        ).toBeInTheDocument();
    });

    it('muestra cuántas veces acertó cuando hay historial', () => {
        render(
            <ConsensusCard
                consensus={{
                    ...base,
                    track_record: {
                        n_resolved: 40,
                        signal_hit_rate: 0.6,
                        neutral_rate: 0.7,
                        scope: 'global',
                    },
                }}
            />,
        );
        expect(
            screen.getByText(/acertó el 60% de las veces/),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/70% de las lecturas no se animó/),
        ).toBeInTheDocument();
    });

    it('aclara cuando todavía no dio señales', () => {
        render(
            <ConsensusCard
                consensus={{
                    ...base,
                    classification: 'neutral',
                    track_record: {
                        n_resolved: 20,
                        signal_hit_rate: null,
                        neutral_rate: 1,
                        scope: 'ticker',
                    },
                }}
            />,
        );
        expect(screen.getByText(/Todavía no dio señales/)).toBeInTheDocument();
    });
});
