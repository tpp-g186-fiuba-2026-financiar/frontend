import { useRemote } from '../../data/useRemote';
import {
    getAdminModelsEndpoint,
    getSignalHistoryEndpoint,
} from '../../../api/next/endpoints';
import {
    Card,
    CardHead,
    ConfidenceBadge,
    Empty,
    Explain,
    PageHead,
    Tip,
} from '../../ui/Blocks';
import { pct1 } from '../../format';
import { modelLabel, normalizeSignal, signalLevel } from '../../finance';

export default function Confiabilidad() {
    const diag = useRemote('admin-models', getAdminModelsEndpoint);
    const hist = useRemote('signals-history', getSignalHistoryEndpoint);
    const accs = Object.entries(diag.data?.results ?? {})
        .map(([k, r]) => ({
            n: k === 'ensemble' ? 'Todos juntos' : modelLabel(k),
            a: r.overall?.directional_accuracy ?? null,
        }))
        .filter((x): x is { n: string; a: number } => x.a != null);
    const ev = (hist.data?.rows ?? []).filter(
        (r) => r.hit != null && normalizeSignal(r.signal) !== 'neutral',
    );
    const byLvl = ([1, 2, 3] as const).map((l) => {
        const e = ev.filter((r) => signalLevel(r) === l);
        return {
            l,
            n: e.length,
            acc: e.length ? e.filter((r) => r.hit).length / e.length : null,
        };
    });
    const scale = (a: number) =>
        Math.min(100, Math.max(0, ((a - 0.4) / 0.25) * 100));

    return (
        <>
            <PageHead
                eyebrow="Administración · Confiabilidad"
                title="¿Se puede confiar en las señales?"
                sub="Antes de mostrar una señal, cada modelo se prueba contra el pasado: como si estuviéramos en esa fecha, sin saber qué pasó después."
            />
            <Explain title="La respuesta corta">
                <p>
                    <b>
                        Adivinar si una acción sube o baja en los próximos días
                        es muy difícil
                    </b>
                    , para cualquiera. Los modelos aciertan un poco más de la
                    mitad de las veces.
                </p>
                <p>
                    Lo importante es que{' '}
                    <b>cuando un modelo está más seguro, acierte más</b>. Por
                    eso se muestra la probabilidad y la confianza, no solo la
                    señal.
                </p>
            </Explain>
            <div className="nx-grid">
                <Card span="s6" i={2}>
                    <CardHead
                        title="¿Cuánto acierta cada uno?"
                        hint={
                            <>
                                De cada 100 veces que opinó en el pasado, en
                                cuántas acertó si subía o bajaba{' '}
                                <Tip k="accuracy" />. La rayita marca el 50%.
                            </>
                        }
                    />
                    {accs.length ? (
                        <div className="nx-bars" style={{ marginTop: 18 }}>
                            {accs.map((a) => (
                                <div className="nx-bar-row" key={a.n}>
                                    <span className="lbl">{a.n}</span>
                                    <div className="nx-bar-track">
                                        <div
                                            className="nx-bar-fill"
                                            style={{
                                                width: `${scale(a.a)}%`,
                                                background:
                                                    a.a > 0.55
                                                        ? 'linear-gradient(90deg,var(--nx-accent),var(--nx-up))'
                                                        : 'var(--nx-accent)',
                                            }}
                                        />
                                        <div
                                            className="nx-bar-mark"
                                            style={{ left: `${scale(0.5)}%` }}
                                        />
                                    </div>
                                    <span
                                        className="nx-mono nx-ink"
                                        style={{ textAlign: 'right' }}
                                    >
                                        {pct1(a.a * 100)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Empty>
                            {diag.loading
                                ? 'Cargando…'
                                : 'Sin resultados de backtest.'}
                        </Empty>
                    )}
                </Card>
                <Card span="s6" i={3}>
                    <CardHead
                        title="¿Cuando está seguro, acierta más?"
                        hint="Señales reales ya resueltas, agrupadas por la confianza que tenían"
                    />
                    {ev.length ? (
                        <div className="nx-bars" style={{ marginTop: 18 }}>
                            {byLvl.map((b) => (
                                <div
                                    className="nx-bar-row"
                                    key={b.l}
                                    style={{
                                        gridTemplateColumns: '110px 1fr 90px',
                                    }}
                                >
                                    <span className="lbl">
                                        <ConfidenceBadge level={b.l} />
                                    </span>
                                    <div className="nx-bar-track">
                                        <div
                                            className="nx-bar-fill"
                                            style={{
                                                width: `${(b.acc ?? 0) * 100}%`,
                                                background:
                                                    b.l === 3
                                                        ? 'var(--nx-up)'
                                                        : 'var(--nx-accent)',
                                            }}
                                        />
                                        <div
                                            className="nx-bar-mark"
                                            style={{
                                                left: '50%',
                                                background: 'var(--nx-ink-3)',
                                            }}
                                        />
                                    </div>
                                    <span
                                        className="nx-mono nx-ink"
                                        style={{ textAlign: 'right' }}
                                    >
                                        {b.acc != null
                                            ? pct1(b.acc * 100)
                                            : '—'}{' '}
                                        <span className="nx-muted">
                                            ({b.n})
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Empty>
                            {hist.loading
                                ? 'Cargando…'
                                : 'Todavía no hay señales resueltas.'}
                        </Empty>
                    )}
                </Card>
                <Card i={4}>
                    <CardHead title="Cómo usar las señales" />
                    <div className="nx-tipsgrid">
                        {[
                            [
                                '01',
                                'Mirar la probabilidad, no solo la palabra',
                                '"Alza" con 56% es casi una moneda al aire. "Alza" con 70% es otra cosa.',
                            ],
                            [
                                '02',
                                'Fijarse si los modelos coinciden',
                                'Si todos dicen lo mismo, la señal es más sólida que si opinan distinto.',
                            ],
                            [
                                '03',
                                'Nunca decidir solo por una señal',
                                'Es una opinión más. Diversificar sigue siendo la mejor protección.',
                            ],
                        ].map(([k, b, p]) => (
                            <div className="nx-stat" key={k}>
                                <div className="k">{k}</div>
                                <b>{b}</b>
                                <p className="nx-muted">{p}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </>
    );
}
