import { useMemo, useState } from 'react';
import { useRemote } from '../data/useRemote';
import {
    getTrackRecordEndpoint,
    type TrackRecordModel,
} from '../../api/next/endpoints';
import { Card, CardHead, Empty, Tip } from './Blocks';
import { LineChart } from './Charts';
import { modelLabel } from '../finance';
import { pct, pct1 } from '../format';

const keyOf = (m: TrackRecordModel) => `${m.model}·${m.model_version}`;

const PERFIL: Record<string, string> = {
    conservative: 'conservador',
    moderate: 'moderado',
    aggressive: 'arriesgado',
};

function versionLabel(m: TrackRecordModel): string {
    const v = m.model_version;
    if (v === 'modal') return 'nube';
    const date = v.match(/(\d{4})(\d{2})(\d{2})T/);
    return date ? `versión ${date[3]}/${date[2]}/${date[1]}` : '';
}

// "Si hubieras seguido las señales": todo lo resuelto del paper trading, por
// modelo y versión. Compara comprar cuando el modelo dice alza contra comprar
// todo lo que miró ese día (sin elegir nada).
export default function TrackRecord() {
    const tr = useRemote('track-record', getTrackRecordEndpoint);
    const modelos = useMemo(
        () =>
            (tr.data?.modelos ?? [])
                .filter((m) => !m.model.startsWith('consensus-conservative'))
                .sort((a, b) => b.hasta.localeCompare(a.hasta)),
        [tr.data],
    );
    const [pick, setPick] = useState<string | null>(null);
    // Para la curva hacen falta al menos 2 meses y algunas alzas.
    const conAlzas = modelos
        .filter((m) => m.alza.n >= 5 && m.curva.length >= 2)
        .sort((a, b) => b.curva.length - a.curva.length);
    const sel = conAlzas.find((m) => keyOf(m) === pick) ?? conAlzas[0];

    if (tr.loading)
        return (
            <Card i={2}>
                <CardHead title="Si hubieras seguido las señales" />
                <Empty>Calculando con todo el historial…</Empty>
            </Card>
        );
    if (tr.error || !modelos.length) return null;

    const name = (m: TrackRecordModel) =>
        m.model.startsWith('consensus-')
            ? `Lectura combinada (${PERFIL[m.model.slice(10)] ?? m.model.slice(10)})`
            : modelLabel(m.model);

    return (
        <Card i={2}>
            <CardHead
                title="Si hubieras seguido las señales"
                hint="Todas las acciones del panel, no solo las tuyas. Compara comprar cuando el modelo dijo alza contra comprar todo lo que miró ese día. Rendimientos en pesos, al plazo de cada señal, sin comisiones."
            />
            {sel && (
                <>
                    <div className="nx-chips" style={{ marginBottom: 10 }}>
                        {conAlzas.map((m) => (
                            <button
                                key={keyOf(m)}
                                type="button"
                                aria-pressed={keyOf(m) === keyOf(sel)}
                                onClick={() => setPick(keyOf(m))}
                            >
                                {name(m)} <small>{versionLabel(m)}</small>
                            </button>
                        ))}
                    </div>
                    <LineChart
                        ariaLabel={`Resultado de seguir las señales de ${name(sel)}`}
                        height={220}
                        labels={sel.curva.map((p) => p.mes)}
                        xFmt={(l) => l.slice(5) + '/' + l.slice(2, 4)}
                        yFmt={(v) => pct(v, 0)}
                        hline={0}
                        series={[
                            {
                                label: 'Siguiendo las alzas',
                                values: sel.curva.map(
                                    (p) => (Math.exp(p.sigue) - 1) * 100,
                                ),
                                color: 'var(--nx-accent)',
                                width: 2.4,
                            },
                            {
                                label: 'Comprando todo',
                                values: sel.curva.map(
                                    (p) => (Math.exp(p.todas) - 1) * 100,
                                ),
                                color: 'var(--nx-ink-3)',
                                dash: '5 4',
                            },
                        ]}
                    />
                    <div className="nx-legend" style={{ marginTop: 6 }}>
                        <span>
                            <i style={{ background: 'var(--nx-accent)' }} />
                            Comprar cuando dijo alza
                        </span>
                        <span>
                            <i style={{ background: 'var(--nx-ink-3)' }} />
                            Comprar todo lo que miró
                        </span>
                    </div>
                </>
            )}
            <div className="nx-table-wrap" style={{ marginTop: 14 }}>
                <table className="nx-table">
                    <thead>
                        <tr>
                            <th>Modelo</th>
                            <th className="r">Casos</th>
                            <th className="r">
                                Subió <Tip k="tasabase" />
                            </th>
                            <th className="r">Alzas · acierto</th>
                            <th className="r">Bajas · acierto</th>
                            <th className="r">Rinde tras alza</th>
                            <th className="r">Rinde todo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {modelos.map((m) => {
                            const ventaja =
                                m.alza.acierto != null
                                    ? m.alza.acierto - m.tasa_suba
                                    : null;
                            return (
                                <tr key={keyOf(m)}>
                                    <td>
                                        <b className="nx-ink">{name(m)}</b>{' '}
                                        <span className="nx-muted">
                                            {[
                                                versionLabel(m),
                                                `${m.horizon_days} ruedas`,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </span>
                                    </td>
                                    <td className="r nx-mono">{m.casos}</td>
                                    <td className="r nx-mono">
                                        {pct1(m.tasa_suba * 100)}
                                    </td>
                                    <td className="r nx-mono">
                                        {m.alza.n}
                                        {m.alza.acierto != null && (
                                            <>
                                                {' · '}
                                                <span
                                                    className={
                                                        ventaja != null &&
                                                        ventaja > 0
                                                            ? 'nx-up'
                                                            : 'nx-down'
                                                    }
                                                >
                                                    {pct1(m.alza.acierto * 100)}
                                                </span>
                                            </>
                                        )}
                                    </td>
                                    <td className="r nx-mono">
                                        {m.baja.n}
                                        {m.baja.acierto != null && (
                                            <>
                                                {' · '}
                                                <span
                                                    className={
                                                        m.baja.acierto >
                                                        1 - m.tasa_suba
                                                            ? 'nx-up'
                                                            : 'nx-down'
                                                    }
                                                >
                                                    {pct1(m.baja.acierto * 100)}
                                                </span>
                                            </>
                                        )}
                                    </td>
                                    <td className="r nx-mono">
                                        {m.alza.retorno_medio != null
                                            ? pct(m.alza.retorno_medio * 100, 1)
                                            : '—'}
                                    </td>
                                    <td className="r nx-mono">
                                        {pct(m.retorno_medio_todas * 100, 1)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="nx-src" style={{ marginTop: 10 }}>
                Un acierto en verde es mejor que la tasa base de esas mismas
                fechas (la columna "Subió" para las alzas, su complemento para
                las bajas). Las versiones nuevas recién empiezan a sumar casos.
            </p>
        </Card>
    );
}
