import type { ConsensusReading } from '../../api/userShares/getShareTrendCompareEndpoint';

const LABELS: Record<ConsensusReading['classification'], string> = {
    sobrecompra: 'Sobrecompra',
    sobreventa: 'Sobreventa',
    neutral: 'Neutral',
    sin_datos: 'Sin datos',
};

const PROFILES: Record<ConsensusReading['investor_profile'], string> = {
    conservative: 'conservador',
    moderate: 'moderado',
    aggressive: 'arriesgado',
};

function trackRecordText(
    record: NonNullable<ConsensusReading['track_record']>,
) {
    const scope =
        record.scope === 'ticker' ? 'este ticker' : 'todos los tickers';
    if (record.signal_hit_rate == null) {
        return `Todavía no dio señales de alza o baja (${record.n_resolved} lecturas en ${scope}).`;
    }
    const neutral =
        record.neutral_rate != null
            ? `, y en ${(record.neutral_rate * 100).toFixed(0)}% de las lecturas no se animó a dar señal`
            : '';
    return `Cuando dio señal de alza o baja acertó el ${(record.signal_hit_rate * 100).toFixed(0)}% de las veces (${record.n_resolved} lecturas ya comprobadas en ${scope}${neutral}).`;
}

export function ConsensusCard({ consensus }: { consensus: ConsensusReading }) {
    return (
        <div className="panel mt-3" data-testid="consensus-card">
            <h3>Lectura combinada de los modelos</h3>
            <p className="mb-1">
                <strong>{LABELS[consensus.classification]}</strong>
                <small style={{ color: 'var(--ink-3)' }}>
                    {' '}
                    · perfil {PROFILES[consensus.investor_profile]} ·{' '}
                    {consensus.models_considered} modelos
                </small>
            </p>
            <p className="mb-1">{consensus.explanation}</p>
            <p className="mb-1" style={{ color: 'var(--ink-3)' }}>
                {consensus.track_record
                    ? trackRecordText(consensus.track_record)
                    : 'Todavía no hay suficientes lecturas comprobadas para medir cuánto acierta.'}
            </p>
            <small style={{ color: 'var(--ink-3)' }}>
                Información orientativa generada por modelos estadísticos. No
                constituye asesoramiento financiero ni una recomendación de
                inversión.
            </small>
        </div>
    );
}
