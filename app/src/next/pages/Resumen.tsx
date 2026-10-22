import {
    lazy,
    Suspense,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../data/PortfolioContext';
import { useUi } from '../data/UiContext';
import { useHoldingsView, type HoldingView } from '../data/useHoldingsView';
import { useValueSeries } from '../data/useValueSeries';
import { useRemote } from '../data/useRemote';
import {
    getMarketSeriesEndpoint,
    type MarketSeries,
} from '../../api/next/endpoints';
import {
    Card,
    CardHead,
    Empty,
    Explain,
    Seg,
    SignalPill,
    Tip,
} from '../ui/Blocks';
import { Donut, Gauge, LineChart } from '../ui/Charts';
import Icon from '../ui/Icon';
import Sparkline from '../../components/SharesTable/Sparkline';
import { arrow, longDate, pct, pct1, shortDate, tone, usd0 } from '../format';
import { modelLabel } from '../finance';
import { bestModelOf } from '../../utils/defaultModels';
import { PALETTE } from '../ui/palette';

const HeroMonitor = lazy(() => import('../ui/HeroMonitor'));

function greeting(now = new Date()): string {
    const h = now.getHours();
    return h < 12 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
}

function Kpi({
    label,
    tip,
    value,
    className = '',
    children,
    i,
}: {
    label: string;
    tip?: Parameters<typeof Tip>[0]['k'];
    value: string;
    className?: string;
    children?: ReactNode;
    i: number;
}) {
    return (
        <Card span="s3 nx-kpi" i={i}>
            <div className="nx-label">
                {label} {tip && <Tip k={tip} />}
            </div>
            <div className={`nx-value ${className}`}>{value}</div>
            {children}
        </Card>
    );
}

// ¿Te fue mejor que un plazo fijo o que el dólar? Toma la evolución del valor
// de la cartera y la compara con haber puesto la misma plata a la tasa BADLAR
// (capitalizando día a día) o en dólar MEP.
function Comparison() {
    const { points, simulated } = useValueSeries();
    const [range, setRange] = useState(126);
    const market = useRemote('market-series', getMarketSeriesEndpoint);
    const byKey = useMemo(() => {
        const m = new Map<string, MarketSeries>();
        market.data?.series.forEach((s) => m.set(s.key, s));
        return m;
    }, [market.data]);

    const data = useMemo(() => {
        if (points.length < 10) return null;
        const slice = simulated
            ? points.slice(-range)
            : points.slice(-Math.round((range * 365) / 252));
        const t0 = new Date(slice[0].date).getTime();
        const near = (s: MarketSeries | undefined, ts: number) => {
            if (!s || s.points.length === 0) return null;
            let best: number | null = null;
            for (const p of s.points) {
                if (p.ts <= ts) best = p.value;
                else break;
            }
            return best ?? s.points[0].value;
        };
        const mep = byKey.get('MEP');
        const badlar = byKey.get('BADLAR');
        const mep0 = near(mep, t0);
        // aportes: si el usuario sumó plata en el medio, se descuenta con el costo
        // con historia real se usa valor/costo, así los aportes nuevos no cuentan como ganancia
        const ratio = (p: (typeof slice)[number]) =>
            p.cost ? p.value / p.cost : p.value;
        const acc = slice.map((p) => (ratio(p) / ratio(slice[0])) * 100);
        let pf = 100;
        const pfs = slice.map((p, k) => {
            if (k > 0) {
                const rate = near(badlar, new Date(p.date).getTime()) ?? 0;
                const dt =
                    (new Date(p.date).getTime() -
                        new Date(slice[k - 1].date).getTime()) /
                    86_400_000;
                pf *= Math.pow(1 + rate / 100 / 365, dt);
            }
            return pf;
        });
        const dol = slice.map((p) => {
            const v = near(mep, new Date(p.date).getTime());
            return v != null && mep0 ? (v / mep0) * 100 : null;
        });
        return {
            labels: slice.map((p) => p.date),
            acc,
            pf: badlar ? pfs : null,
            dol: mep ? dol : null,
        };
    }, [points, simulated, range, byKey]);

    const results = data
        ? (
              [
                  [
                      'Tus acciones',
                      data.acc[data.acc.length - 1],
                      'var(--nx-accent)',
                  ],
                  [
                      'Plazo fijo',
                      data.pf?.[data.pf.length - 1] ?? null,
                      'var(--nx-warn)',
                  ],
                  [
                      'Dólar MEP',
                      data.dol?.[data.dol.length - 1] ?? null,
                      'var(--nx-up)',
                  ],
              ] as Array<[string, number | null, string]>
          )
              .filter((r): r is [string, number, string] => r[1] != null)
              .sort((a, b) => b[1] - a[1])
        : [];
    const months = { 63: '3 meses', 126: '6 meses', 252: 'un año' }[range];

    return (
        <>
            <Card span="s8" i={7}>
                <CardHead
                    title="¿Te fue mejor que un plazo fijo o que el dólar?"
                    hint={
                        <>
                            Si hubieras puesto la misma plata en otra cosa{' '}
                            <Tip k="compara" />
                        </>
                    }
                    right={
                        <Seg
                            label="Período"
                            options={[
                                [63, '3M'],
                                [126, '6M'],
                                [252, '1A'],
                            ]}
                            value={range}
                            onChange={setRange}
                        />
                    }
                />
                {data ? (
                    <>
                        <div className="nx-legend">
                            <span>
                                <i style={{ background: 'var(--nx-accent)' }} />
                                Tus acciones
                            </span>
                            {data.pf && (
                                <span>
                                    <i
                                        style={{ background: 'var(--nx-warn)' }}
                                    />
                                    Plazo fijo <Tip k="badlar" />
                                </span>
                            )}
                            {data.dol && (
                                <span>
                                    <i style={{ background: 'var(--nx-up)' }} />
                                    Dólar MEP <Tip k="mep" />
                                </span>
                            )}
                        </div>
                        <LineChart
                            ariaLabel="Comparación contra plazo fijo y dólar"
                            labels={data.labels}
                            height={250}
                            xFmt={shortDate}
                            yFmt={(v) => usd0(v * 1000)}
                            series={[
                                {
                                    label: 'Tus acciones',
                                    values: data.acc,
                                    color: 'var(--nx-accent)',
                                    area: true,
                                },
                                ...(data.pf
                                    ? [
                                          {
                                              label: 'Plazo fijo',
                                              values: data.pf,
                                              color: 'var(--nx-warn)',
                                              width: 1.8,
                                          },
                                      ]
                                    : []),
                                ...(data.dol
                                    ? [
                                          {
                                              label: 'Dólar MEP',
                                              values: data.dol,
                                              color: 'var(--nx-up)',
                                              width: 1.8,
                                          },
                                      ]
                                    : []),
                            ]}
                        />
                    </>
                ) : (
                    <Empty>
                        Todavía no hay suficiente historia de tu cartera para
                        comparar.
                    </Empty>
                )}
            </Card>
            <Card span="s4" i={8}>
                <CardHead title="Si hubieras puesto $100.000" />
                {results.length > 0 ? (
                    <>
                        <p
                            className="nx-muted"
                            style={{ fontSize: 12.5, margin: '-6px 0 10px' }}
                        >
                            hace {months}, hoy tendrías:
                        </p>
                        <div className="nx-list">
                            {results.map(([n, v, c], k) => (
                                <div className="nx-li" key={n}>
                                    <i
                                        style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: 3,
                                            background: c,
                                        }}
                                    />
                                    <span
                                        className={`nx-grow ${k === 0 ? 'nx-ink' : ''}`}
                                        style={{
                                            fontWeight: k === 0 ? 600 : 400,
                                        }}
                                    >
                                        {n}
                                        {k === 0 && results.length > 1
                                            ? ' 🏆'
                                            : ''}
                                    </span>
                                    <b className="nx-mono nx-ink">
                                        {usd0(v * 1000)}
                                    </b>
                                    <span
                                        className={`nx-mono ${tone(v - 100)}`}
                                        style={{
                                            width: 62,
                                            textAlign: 'right',
                                        }}
                                    >
                                        {pct(v - 100)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {results.length > 1 && (
                            <p
                                className="nx-muted"
                                style={{ fontSize: 12, margin: '12px 0 0' }}
                            >
                                {results[0][0] === 'Tus acciones'
                                    ? 'En este período, tus acciones rindieron más que las otras opciones.'
                                    : `En este período, ${results[0][0].toLowerCase()} rindió más que tus acciones. Las acciones suben y bajan más: en otros períodos puede ser al revés.`}
                            </p>
                        )}
                        {results.length === 1 && (
                            <p
                                className="nx-muted"
                                style={{ fontSize: 12, marginTop: 12 }}
                            >
                                No pudimos traer las tasas y el dólar para
                                comparar.
                            </p>
                        )}
                    </>
                ) : (
                    <Empty>Sin datos para comparar todavía.</Empty>
                )}
            </Card>
        </>
    );
}

function TypedInsights({ items }: { items: Array<[string, string]> }) {
    const reduce =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const full = items.map((i) => i[1]).join('\u0000');
    const total = full.length;
    const [n, setN] = useState(reduce ? total : 0);
    useEffect(() => {
        if (reduce) return;
        const id = window.setInterval(
            () =>
                setN((c) =>
                    c >= total ? (window.clearInterval(id), c) : c + 2,
                ),
            16,
        );
        return () => window.clearInterval(id);
    }, [full, total, reduce]);
    const starts = items.map((_, k) =>
        items.slice(0, k).reduce((s, [, t]) => s + t.length + 1, 0),
    );
    return (
        <div>
            {items.map(([h, t], k) => {
                const left = n - starts[k];
                const shown = t.slice(0, Math.max(0, left));
                const typing = left > 0 && left < t.length;
                return (
                    <div className="nx-insight" key={h}>
                        <div className="ih">
                            <Icon name="trend" size={13} /> {h}
                        </div>
                        <div className={typing ? 'nx-caret' : ''}>{shown}</div>
                    </div>
                );
            })}
        </div>
    );
}

function insightsOf(
    rows: HoldingView[],
    compareBest: (t: string) => string | null,
): Array<[string, string]> {
    const out: Array<[string, string]> = [];
    const withProb = rows.filter((r) => r.prob != null);
    if (withProb.length) {
        const top = [...withProb].sort((a, b) => b.prob! - a.prob!)[0];
        const best = compareBest(top.ticker);
        out.push([
            'Más optimista',
            `${top.ticker} tiene la probabilidad de suba más alta (${Math.round(top.prob! * 100)}%).${best ? ` El modelo que mejor le acertó en el pasado es ${modelLabel(best)}.` : ''}`,
        ]);
    }
    const biggest = [...rows].sort((a, b) => b.share - a.share)[0];
    if (biggest && biggest.share > 0) {
        out.push([
            'Concentración',
            biggest.share > 0.25
                ? `El ${Math.round(biggest.share * 100)}% de tu plata está en ${biggest.ticker}. Si esa acción cae, arrastra a toda tu cartera. Mirá la pestaña Riesgo.`
                : `Tu posición más grande es ${biggest.ticker}, con el ${Math.round(biggest.share * 100)}% de la cartera: está bastante repartida.`,
        ]);
    }
    const weak = rows.filter(
        (r) => r.signal === 'baja' || (r.prob != null && r.prob < 0.45),
    );
    if (weak.length) {
        const w = weak[0];
        out.push([
            'Ojo con',
            `${w.ticker}: señal ${w.signal}${w.prob != null ? ` y ${Math.round(w.prob * 100)}% de probabilidad de suba` : ''}${w.trend?.rsi != null ? `, RSI ${Math.round(w.trend.rsi)}` : ''}.`,
        ]);
    }
    return out;
}

export default function Resumen() {
    const navigate = useNavigate();
    const ui = useUi();
    const { user, pnl, compare, loading, error, holdings } = usePortfolio();
    const { points, simulated } = useValueSeries();
    const { rows, totalValue, totalCost, weekPct, portfolioProb } =
        useHoldingsView();
    const [range, setRange] = useState(126);

    const ups = rows.filter((r) => r.signal === 'alza').length;
    // acciones con una señal real (las que los modelos todavía no
    // respondieron no cuentan como "neutral")
    const withSignal = rows.filter((r) => r.signal != null).length;
    const signalText = withSignal ? `${ups} de ${withSignal}` : '—';
    const sig = {
        alza: ups,
        neutral: rows.filter((r) => r.signal === 'neutral').length,
        baja: rows.filter((r) => r.signal === 'baja').length,
    };
    const totalPnl = pnl?.total_pnl_amount ?? totalValue - totalCost;
    const totalPnlPct =
        pnl?.total_pnl_percentage ??
        (totalCost > 0 ? (totalPnl / totalCost) * 100 : null);
    const movers = [...rows]
        .filter((r) => r.week != null)
        .sort((a, b) => Math.abs(b.week!) - Math.abs(a.week!))
        .slice(0, 5);
    const comp = [...rows].sort((a, b) => b.share - a.share);
    const [hl, setHl] = useState<number | null>(null);

    const evo = useMemo(() => {
        const pts = simulated
            ? points.slice(-range)
            : points.slice(-Math.round((range * 365) / 252));
        return {
            labels: pts.map((p) => p.date),
            value: pts.map((p) => p.value),
            cost: simulated ? null : pts.map((p) => p.cost),
        };
    }, [points, simulated, range]);

    const modelsSeen = new Set<string>();
    Object.values(compare).forEach((c) =>
        Object.entries(c.predictions).forEach(
            ([k, p]) =>
                p.available &&
                !k.startsWith('garch') &&
                modelsSeen.add(modelLabel(k)),
        ),
    );
    const firstName = user?.full_name.split(/\s+/)[0] ?? '';
    const insights = insightsOf(rows, (t) => bestModelOf(compare[t]));
    const today = new Date().toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
    });

    if (!loading && !error && holdings.length === 0) {
        return (
            <section className="nx-card nx-hero">
                <div className="nx-hero-txt">
                    <div className="nx-eyebrow">{today}</div>
                    <h1>
                        {greeting()}, {firstName}
                    </h1>
                    <p>
                        Todavía no cargaste acciones. Armá tu cartera para ver
                        qué opinan los modelos de cada una.
                    </p>
                    <div className="nx-actions">
                        <button
                            type="button"
                            className="nx-btn primary"
                            onClick={() => ui.setBuilderOpen(true)}
                        >
                            <Icon name="plus" /> Armar mi cartera
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <>
            <section className="nx-card nx-hero nx-rv">
                <Suspense fallback={<div className="nx-hero-orb" />}>
                    <HeroMonitor
                        series={comp
                            .slice(0, 6)
                            .map((r) => ({ name: r.ticker, closes: r.closes }))}
                    />
                </Suspense>
                <div className="nx-hero-txt">
                    <div className="nx-eyebrow">
                        {today} · datos al último cierre
                    </div>
                    <h1>
                        {greeting()}, {firstName}
                    </h1>
                    <p>
                        Esta es tu cartera de {rows.length}{' '}
                        {rows.length === 1 ? 'acción' : 'acciones'} y lo que
                        opinan los modelos sobre cada una.
                    </p>
                    <div className="nx-actions">
                        <button
                            type="button"
                            className="nx-btn primary"
                            onClick={() => navigate('/cartera')}
                        >
                            <Icon name="wallet" /> Ver cartera
                        </button>
                        <button
                            type="button"
                            className="nx-btn"
                            onClick={() => window.print()}
                        >
                            <Icon name="download" /> Informe PDF
                        </button>
                    </div>
                    <div className="nx-mini">
                        <div>
                            Valor <Tip k="valor" />
                            <b>{usd0(totalValue)}</b>
                        </div>
                        <div>
                            Semana <Tip k="semana" />
                            <b className={weekPct != null ? tone(weekPct) : ''}>
                                {weekPct != null ? pct(weekPct) : '—'}
                            </b>
                        </div>
                        <div>
                            Señales de suba <Tip k="senal" />
                            <b>{signalText}</b>
                        </div>
                    </div>
                </div>
            </section>
            <Explain title="Tu tablero en 10 segundos">
                <p>
                    Arriba están los <b>números grandes</b>: cuánto vale tu
                    cartera, cuánto ganaste desde que compraste y cuántas
                    acciones tienen una señal de suba. En el medio, cómo{' '}
                    <b>evolucionó</b> el valor de tu cartera y qué opinan los
                    modelos. Abajo, cómo está repartida y qué se movió en la
                    semana.
                </p>
                <p>
                    Los precios se actualizan <b>una vez por día</b>, con el
                    cierre del mercado.
                </p>
            </Explain>
            {error && <Empty>{error}</Empty>}
            <div className="nx-grid" style={{ marginBottom: 16 }}>
                <Kpi
                    label="Valor de la cartera"
                    tip="valor"
                    value={usd0(totalValue)}
                    i={1}
                >
                    {weekPct != null && (
                        <div className="nx-delta">
                            <span className={`nx-chip-d ${tone(weekPct)}`}>
                                {arrow(weekPct)} {pct(weekPct)}
                            </span>
                            <span className="nx-muted">en la semana</span>
                        </div>
                    )}
                </Kpi>
                <Kpi
                    label="Ganancia total"
                    tip="pnl"
                    value={usd0(totalPnl)}
                    className={tone(totalPnl)}
                    i={2}
                >
                    <div className="nx-delta">
                        {totalPnlPct != null && (
                            <span className={`nx-chip-d ${tone(totalPnlPct)}`}>
                                {arrow(totalPnlPct)} {pct(totalPnlPct)}
                            </span>
                        )}
                        <span className="nx-muted">
                            pagaste {usd0(totalCost)}
                        </span>
                    </div>
                </Kpi>
                <Kpi
                    label="Señales de suba"
                    tip="senal"
                    value={withSignal ? `${ups} / ${withSignal}` : '—'}
                    i={3}
                >
                    <div
                        style={{
                            display: 'flex',
                            height: 6,
                            borderRadius: 6,
                            overflow: 'hidden',
                            gap: 2,
                            marginTop: 10,
                        }}
                    >
                        <i
                            style={{
                                flex: sig.alza,
                                background: 'var(--nx-up)',
                            }}
                        />
                        <i
                            style={{
                                flex: sig.neutral,
                                background: 'var(--nx-neu)',
                            }}
                        />
                        <i
                            style={{
                                flex: sig.baja,
                                background: 'var(--nx-down)',
                            }}
                        />
                    </div>
                    <div className="nx-plain">
                        {withSignal
                            ? `${sig.alza} alza · ${sig.neutral} neutral · ${sig.baja} baja`
                            : 'los modelos todavía no respondieron'}
                        {withSignal > 0 &&
                            withSignal < rows.length &&
                            ` · ${rows.length - withSignal} sin datos`}
                    </div>
                </Kpi>
                <Kpi
                    label="Consenso de la cartera"
                    tip="consenso"
                    value={
                        portfolioProb != null ? pct1(portfolioProb * 100) : '—'
                    }
                    i={4}
                >
                    <div className="nx-plain">
                        probabilidad de suba promedio, pesada por cuánto pesa
                        cada acción
                    </div>
                </Kpi>
            </div>
            <div className="nx-grid">
                <Card span="s8" i={5}>
                    <CardHead
                        title="Evolución de la cartera"
                        hint={
                            simulated
                                ? 'Tu cartera es nueva: así se habría movido con las cantidades que tenés hoy'
                                : 'Cuánto valía tu cartera cada día, comparado con lo que pusiste'
                        }
                        right={
                            <Seg
                                label="Período"
                                options={[
                                    [21, '1M'],
                                    [63, '3M'],
                                    [126, '6M'],
                                    [252, '1A'],
                                ]}
                                value={range}
                                onChange={setRange}
                            />
                        }
                    />
                    {evo.labels.length > 1 ? (
                        <>
                            <div className="nx-legend">
                                <span>
                                    <i
                                        style={{
                                            background: 'var(--nx-accent)',
                                        }}
                                    />
                                    Valor de tu cartera
                                </span>
                                {evo.cost && (
                                    <span>
                                        <i
                                            style={{
                                                background: 'var(--nx-ink-3)',
                                            }}
                                        />
                                        Lo que pusiste
                                    </span>
                                )}
                            </div>
                            <LineChart
                                ariaLabel="Evolución del valor de la cartera"
                                labels={evo.labels}
                                height={290}
                                xFmt={shortDate}
                                yFmt={(v) => usd0(v)}
                                series={[
                                    {
                                        label: 'Valor',
                                        values: evo.value,
                                        color: 'var(--nx-accent)',
                                        area: true,
                                        width: 2.2,
                                    },
                                    ...(evo.cost
                                        ? [
                                              {
                                                  label: 'Lo que pusiste',
                                                  values: evo.cost,
                                                  color: 'var(--nx-ink-3)',
                                                  dash: '4 4',
                                                  width: 1.4,
                                              },
                                          ]
                                        : []),
                                ]}
                            />
                        </>
                    ) : (
                        <Empty>
                            Cuando tu cartera tenga algunos días de historia,
                            vas a ver su evolución acá.
                        </Empty>
                    )}
                </Card>
                <Card span="s4" i={6}>
                    <CardHead
                        title="¿Qué dicen los modelos?"
                        hint={
                            <>
                                Aguja a la derecha = esperan suba. A la
                                izquierda = esperan baja. <Tip k="consenso" />
                            </>
                        }
                    />
                    {portfolioProb != null ? (
                        <>
                            <Gauge p={portfolioProb} label="CHANCES DE SUBA" />
                            <p className="nx-src">
                                Promedio de las chances de suba de XGBoost,
                                pesado por cuánto vale cada acción. No es una
                                señal de alza o baja: un 70% quiere decir "en
                                situaciones parecidas, 7 de cada 10 veces
                                terminó más arriba".
                            </p>
                        </>
                    ) : (
                        <Empty>Los modelos todavía no respondieron.</Empty>
                    )}
                    <div className="nx-stat-grid" style={{ marginTop: 12 }}>
                        <div className="nx-stat">
                            <div className="k">Modelos</div>
                            <div className="v">{modelsSeen.size || '—'}</div>
                            <div className="d nx-muted">
                                {[...modelsSeen].join(' · ')}
                            </div>
                        </div>
                        <div className="nx-stat">
                            <div className="k">
                                Horizonte <Tip k="horizonte" />
                            </div>
                            <div className="v">5–20 ruedas</div>
                            <div className="d nx-muted">según el modelo</div>
                        </div>
                    </div>
                </Card>
                <Comparison />
                <Card span="s4" i={9}>
                    <CardHead
                        title="Cómo está repartida"
                        hint={
                            <>
                                Qué parte de tu plata está en cada acción{' '}
                                <Tip k="peso" />
                            </>
                        }
                    />
                    {comp.length ? (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '130px 1fr',
                                gap: 16,
                                alignItems: 'center',
                            }}
                        >
                            <Donut
                                label={`Composición de la cartera: ${comp.map((r) => r.ticker).join(', ')}`}
                                items={comp.map((r, k) => ({
                                    v: r.share,
                                    color:
                                        hl == null || hl === k
                                            ? PALETTE[k % PALETTE.length]
                                            : 'var(--nx-line-2)',
                                }))}
                                center={
                                    hl == null
                                        ? comp.length
                                        : pct1(comp[hl].share * 100)
                                }
                            />
                            <div className="nx-list">
                                {comp.map((r, k) => (
                                    <div
                                        key={r.ticker}
                                        className="nx-li"
                                        style={{
                                            padding: '6px 0',
                                            fontSize: 12.5,
                                        }}
                                        onPointerEnter={() => setHl(k)}
                                        onPointerLeave={() => setHl(null)}
                                    >
                                        <i
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: 2,
                                                background:
                                                    PALETTE[k % PALETTE.length],
                                            }}
                                        />
                                        <span className="nx-grow">
                                            {r.ticker}
                                        </span>
                                        <b className="nx-mono nx-ink">
                                            {pct1(r.share * 100)}
                                        </b>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <Empty>Sin posiciones.</Empty>
                    )}
                </Card>
                <Card span="s4" i={10}>
                    <CardHead
                        title="Lo que más se movió"
                        hint="Variación de la última semana"
                    />
                    {movers.length ? (
                        <div className="nx-list">
                            {movers.map((r) => (
                                <button
                                    type="button"
                                    key={r.ticker}
                                    className="nx-li nx-plain-btn"
                                    onClick={() =>
                                        navigate(`/accion/${r.ticker}`)
                                    }
                                >
                                    <div className="nx-logo">
                                        {r.ticker.slice(0, 4)}
                                    </div>
                                    <div
                                        className="nx-grow"
                                        style={{ textAlign: 'left' }}
                                    >
                                        <b className="nx-ink">{r.ticker}</b>
                                        <div
                                            className="nx-muted"
                                            style={{ fontSize: 11.5 }}
                                        >
                                            {r.price != null
                                                ? usd0(r.price)
                                                : '—'}
                                        </div>
                                    </div>
                                    {r.closes.length > 2 && (
                                        <Sparkline
                                            closes={r.closes.slice(-30)}
                                            signal={
                                                r.week! >= 0 ? 'alza' : 'baja'
                                            }
                                            label={r.ticker}
                                        />
                                    )}
                                    <span
                                        className={`nx-mono ${tone(r.week!)}`}
                                        style={{
                                            width: 64,
                                            textAlign: 'right',
                                        }}
                                    >
                                        {pct(r.week!)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <Empty>Cargando precios…</Empty>
                    )}
                </Card>
                <Card span="s4" i={11}>
                    <CardHead
                        title="Lectura automática"
                        hint="Frases armadas con reglas simples sobre tus datos"
                    />
                    <TypedInsights
                        key={insights.map((i) => i[1]).join('|')}
                        items={insights}
                    />
                </Card>
                <Card span="s12" i={12}>
                    <CardHead
                        title="Señales de hoy"
                        hint="La señal de cada acción según el modelo elegido en Ajustes"
                    />
                    <div className="nx-chips">
                        {rows.map((r) => (
                            <button
                                type="button"
                                key={r.ticker}
                                onClick={() => navigate(`/accion/${r.ticker}`)}
                            >
                                {r.ticker} <SignalPill signal={r.signal} />
                            </button>
                        ))}
                    </div>
                    <p
                        className="nx-muted"
                        style={{ fontSize: 12, margin: '10px 0 0' }}
                    >
                        Último dato:{' '}
                        {points.length
                            ? longDate(points[points.length - 1].date)
                            : '—'}
                    </p>
                </Card>
            </div>
        </>
    );
}
