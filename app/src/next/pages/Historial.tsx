import { useMemo, useState } from 'react';
import { useRemote } from '../data/useRemote';
import {
    getSignalHistoryEndpoint,
    type SignalHistoryRow,
} from '../../api/next/endpoints';
import {
    Card,
    CardHead,
    ConfidenceBadge,
    Empty,
    Explain,
    Legal,
    PageHead,
    SignalPill,
    Tip,
} from '../ui/Blocks';
import Icon from '../ui/Icon';
import TrackRecord from '../ui/TrackRecord';
import { longDate, pct1, tone, usd } from '../format';
import {
    modelLabel,
    normalizeSignal,
    signalLevel as levelOf,
} from '../finance';
import {
    MIN_RELIABLE_CASES,
    wilsonInterval,
} from '../../utils/backtestConfidence';

const DAY = 86_400_000;

function dateOf(iso: string): Date {
    return new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso);
}

function addBusinessDays(from: Date, n: number): Date {
    const d = new Date(from);
    let k = 0;
    while (k < n) {
        d.setTime(d.getTime() + DAY);
        if (d.getDay() !== 0 && d.getDay() !== 6) k++;
    }
    return d;
}

function businessDaysBetween(from: Date, to: Date): number {
    let n = 0;
    const d = new Date(from);
    while (d < to) {
        d.setTime(d.getTime() + DAY);
        if (d <= to && d.getDay() !== 0 && d.getDay() !== 6) n++;
    }
    return n;
}

function isOverdue(r: SignalHistoryRow, now: Date): boolean {
    return (
        r.hit == null &&
        addBusinessDays(dateOf(r.as_of), r.horizon_days + 1) < now
    );
}

function versionText(version: string | null | undefined): string {
    if (!version) return '';
    const m = version.match(/(\d{4})-?(\d{2})-?(\d{2})/);
    if (!m) return ` · ${version}`;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return ` · versión del ${d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`;
}

function RateText({ hits, n }: { hits: number; n: number }) {
    if (!n) return <>sin señales evaluadas</>;
    const [lo, hi] = wilsonInterval(hits / n, n);
    return (
        <>
            {hits} de {n} · entre {Math.round(lo * 100)}% y{' '}
            {Math.round(hi * 100)}%
            {n < MIN_RELIABLE_CASES &&
                ' · pocos casos, no alcanza para sacar conclusiones'}
        </>
    );
}

function rateValue(hits: number, n: number): string {
    if (!n) return '—';
    return n < MIN_RELIABLE_CASES ? `${hits}/${n}` : pct1((hits / n) * 100);
}

export default function Historial() {
    const hist = useRemote('signals-history', getSignalHistoryEndpoint);
    const [pick, setPick] = useState('todas');
    const [now] = useState(() => new Date());

    const all = useMemo(
        () =>
            (hist.data?.rows ?? []).filter(
                (r) => normalizeSignal(r.signal) !== 'neutral',
            ),
        [hist.data],
    );
    const tickers = useMemo(
        () => [...new Set(all.map((r) => r.symbol))].sort(),
        [all],
    );
    const rows = all
        .filter((r) => pick === 'todas' || r.symbol === pick)
        .sort((a, b) => b.as_of.localeCompare(a.as_of));
    const ev = rows.filter((r) => r.hit != null);
    const hits = ev.filter((r) => r.hit).length;
    const overdue = rows.filter((r) => isOverdue(r, now));
    const running = rows.filter((r) => r.hit == null && !isOverdue(r, now));
    const byLvl = ([3, 2, 1] as const).map((l) => {
        const e = ev.filter((r) => levelOf(r) === l);
        return { l, n: e.length, hits: e.filter((r) => r.hit).length };
    });
    const hi = byLvl[0];

    const byModel = (() => {
        const groups = new Map<
            string,
            { label: string; n: number; hits: number }
        >();
        ev.forEach((r) => {
            const key = `${r.model}|${r.model_version ?? ''}|${r.horizon_days}`;
            const g = groups.get(key) ?? {
                label: `${modelLabel(r.model)} · ${r.horizon_days} ruedas${versionText(r.model_version)}`,
                n: 0,
                hits: 0,
            };
            g.n += 1;
            g.hits += r.hit ? 1 : 0;
            groups.set(key, g);
        });
        return [...groups.values()].sort((a, b) => b.n - a.n);
    })();

    const lastSignal =
        hist.data?.summary.last_signal ??
        (all.length
            ? all
                  .map((r) => r.as_of)
                  .sort()
                  .at(-1)!
            : null);
    const staleDays = lastSignal
        ? businessDaysBetween(dateOf(lastSignal), now)
        : null;

    return (
        <>
            <PageHead
                eyebrow="Historial de señales"
                title="¿Acertaron los modelos?"
                sub="Cada día guardamos lo que dijo cada modelo sobre tus acciones. Cuando pasa el plazo, miramos si el precio se movió para el lado que dijeron."
            />
            <Legal />
            <Explain title="Cómo se cuenta un acierto">
                <p>
                    Si un día la señal de una acción fue <b>Alza</b>, miramos el
                    precio <b>al terminar el plazo del modelo</b>. Si subió,
                    cuenta como acierto; si bajó, como error. Con las señales de{' '}
                    <b>Baja</b> es al revés. Las señales <b>Neutral</b> no
                    cuentan, porque no apostaban a ningún lado.
                </p>
                <p>
                    Con menos de {MIN_RELIABLE_CASES} casos un porcentaje no
                    dice nada: por eso mostramos cuántos fueron y el rango en el
                    que probablemente está el acierto real.
                </p>
            </Explain>
            {hist.loading && <Empty>Cargando el historial…</Empty>}
            {hist.error && (
                <Empty>
                    No pudimos traer el historial de señales. Probá de nuevo más
                    tarde.
                </Empty>
            )}
            {hist.data && all.length === 0 && (
                <Empty>
                    Todavía no hay señales guardadas para tus acciones.
                </Empty>
            )}
            {lastSignal && (
                <p
                    className={`nx-why ${staleDays != null && staleDays > 2 ? 'nx-warn-box' : ''}`}
                    role="status"
                >
                    {staleDays != null && staleDays > 2 && (
                        <Icon name="alert" size={14} />
                    )}{' '}
                    Última señal guardada: <b>{longDate(lastSignal)}</b>
                    {staleDays != null && staleDays > 2
                        ? ` · hace ${staleDays} días hábiles. El registro diario de señales está frenado: las nuevas no se están guardando ni evaluando.`
                        : ''}
                </p>
            )}
            <div style={{ marginBottom: 16 }}>
                <TrackRecord />
            </div>
            {all.length > 0 && (
                <>
                    <div className="nx-chips nx-rv">
                        {['todas', ...tickers].map((t) => (
                            <button
                                key={t}
                                type="button"
                                aria-pressed={pick === t}
                                onClick={() => setPick(t)}
                            >
                                {t === 'todas' ? 'Todas' : t}
                            </button>
                        ))}
                    </div>
                    <div className="nx-grid" style={{ marginBottom: 16 }}>
                        <Card span="s3 nx-kpi" i={1}>
                            <div className="nx-label">Señales evaluadas</div>
                            <div className="nx-value">{ev.length}</div>
                            <div className="nx-plain">
                                sin contar las neutrales
                            </div>
                        </Card>
                        <Card span="s3 nx-kpi" i={2}>
                            <div className="nx-label">Acertaron</div>
                            <div className="nx-value">
                                {rateValue(hits, ev.length)}
                            </div>
                            <div className="nx-plain">
                                <RateText hits={hits} n={ev.length} />
                            </div>
                        </Card>
                        <Card span="s3 nx-kpi" i={3}>
                            <div className="nx-label">
                                Con confianza alta <Tip k="confsenal" />
                            </div>
                            <div className="nx-value">
                                {rateValue(hi.hits, hi.n)}
                            </div>
                            <div className="nx-plain">
                                <RateText hits={hi.hits} n={hi.n} />
                            </div>
                        </Card>
                        <Card span="s3 nx-kpi" i={4}>
                            <div className="nx-label">En curso</div>
                            <div className="nx-value">{running.length}</div>
                            <div className="nx-plain">
                                todavía no pasó el plazo
                                {overdue.length > 0 &&
                                    ` · ${overdue.length} vencidas sin evaluar`}
                            </div>
                        </Card>
                    </div>
                    <div className="nx-grid">
                        <Card span="s5" i={5}>
                            <CardHead
                                title="Acierto por modelo"
                                hint="Cada modelo, versión y plazo por separado"
                            />
                            {byModel.length ? (
                                <div className="nx-list">
                                    {byModel.map((g) => (
                                        <div
                                            className="nx-li"
                                            key={g.label}
                                            style={{
                                                alignItems: 'flex-start',
                                                flexDirection: 'column',
                                                gap: 2,
                                            }}
                                        >
                                            <div
                                                className="nx-sys-row"
                                                style={{ width: '100%' }}
                                            >
                                                <b className="nx-ink">
                                                    {g.label}
                                                </b>
                                                <b className="nx-mono nx-ink">
                                                    {rateValue(g.hits, g.n)}
                                                </b>
                                            </div>
                                            <span
                                                className="nx-muted"
                                                style={{ fontSize: 11.5 }}
                                            >
                                                <RateText
                                                    hits={g.hits}
                                                    n={g.n}
                                                />
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Empty>Todavía no hay señales evaluadas.</Empty>
                            )}
                            <CardHead
                                title="Según la confianza"
                                hint="Las señales más firmes deberían acertar más seguido"
                            />
                            <div className="nx-bars" style={{ marginTop: 6 }}>
                                {byLvl.map((b) => (
                                    <div
                                        className="nx-bar-row"
                                        key={b.l}
                                        style={{
                                            gridTemplateColumns:
                                                '110px 1fr 54px',
                                        }}
                                    >
                                        <span className="lbl">
                                            <ConfidenceBadge level={b.l} />
                                        </span>
                                        <div className="nx-bar-track">
                                            <div
                                                className="nx-bar-fill"
                                                style={{
                                                    width: `${b.n ? (b.hits / b.n) * 100 : 0}%`,
                                                    background:
                                                        b.l === 3
                                                            ? 'var(--nx-up)'
                                                            : b.l === 2
                                                              ? 'var(--nx-accent)'
                                                              : 'var(--nx-neu)',
                                                    opacity:
                                                        b.n < MIN_RELIABLE_CASES
                                                            ? 0.45
                                                            : 1,
                                                }}
                                            />
                                            <div
                                                className="nx-bar-mark"
                                                style={{
                                                    left: '50%',
                                                    background:
                                                        'var(--nx-ink-3)',
                                                }}
                                            />
                                        </div>
                                        <span
                                            className="nx-mono nx-ink"
                                            style={{ textAlign: 'right' }}
                                        >
                                            {rateValue(b.hits, b.n)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p
                                className="nx-muted"
                                style={{ fontSize: 12, margin: '14px 0 0' }}
                            >
                                La rayita marca el 50%. Las barras pálidas
                                tienen menos de {MIN_RELIABLE_CASES} casos.
                            </p>
                        </Card>
                        <Card span="s7" i={6}>
                            <CardHead
                                title="Señal por señal"
                                hint="Las más recientes primero"
                            />
                            <div className="nx-table-wrap">
                                <table className="nx-table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Acción</th>
                                            <th>Modelo</th>
                                            <th>
                                                Señal <Tip k="senal" />
                                            </th>
                                            <th className="r">
                                                Precio ese día
                                            </th>
                                            <th className="r">
                                                Al final del plazo
                                            </th>
                                            <th>Resultado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.slice(0, 60).map((r, k) => (
                                            <tr
                                                key={`${r.symbol}-${r.model}-${r.as_of}-${k}`}
                                                style={{ cursor: 'default' }}
                                            >
                                                <td className="nx-mono nx-muted">
                                                    {longDate(r.as_of)}
                                                </td>
                                                <td>
                                                    <b className="nx-ink">
                                                        {r.symbol}
                                                    </b>
                                                </td>
                                                <td
                                                    className="nx-mono nx-muted"
                                                    style={{ fontSize: 12 }}
                                                >
                                                    {modelLabel(r.model)} ·{' '}
                                                    {r.horizon_days}r
                                                </td>
                                                <td>
                                                    <SignalPill
                                                        signal={normalizeSignal(
                                                            r.signal,
                                                        )}
                                                    />
                                                </td>
                                                <td className="r nx-mono">
                                                    {usd(r.last_close)}
                                                </td>
                                                <td
                                                    className={`r nx-mono ${r.realized_close != null ? tone(r.realized_close - r.last_close) : 'nx-muted'}`}
                                                >
                                                    {r.realized_close != null
                                                        ? usd(r.realized_close)
                                                        : '—'}
                                                </td>
                                                <td>
                                                    {r.hit == null ? (
                                                        isOverdue(r, now) ? (
                                                            <span
                                                                className="nx-mono"
                                                                style={{
                                                                    color: 'var(--nx-warn)',
                                                                }}
                                                            >
                                                                ⚠ vencida, sin
                                                                evaluar
                                                            </span>
                                                        ) : (
                                                            <span className="nx-muted nx-mono">
                                                                ⏳ en curso
                                                            </span>
                                                        )
                                                    ) : r.hit ? (
                                                        <span className="nx-up nx-mono">
                                                            ✓ acertó
                                                        </span>
                                                    ) : (
                                                        <span className="nx-down nx-mono">
                                                            ✗ no acertó
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </>
    );
}
