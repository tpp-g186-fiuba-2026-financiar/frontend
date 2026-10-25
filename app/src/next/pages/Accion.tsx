import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { usePortfolio } from '../data/PortfolioContext';
import { useHoldingsView } from '../data/useHoldingsView';
import { useRemote } from '../data/useRemote';
import {
    getCandlesEndpoint,
    getExplainEndpoint,
} from '../../api/next/endpoints';
import { getShareTrendCompareEndpoint } from '../../api/userShares/getShareTrendCompareEndpoint';
import { getShareInfo, getShareSector } from '../data/shareInfo';
import {
    subscribeToTickerAlertEndpoint,
    unsubscribeFromTickerAlertEndpoint,
} from '../../api/subscriptions/tickerAlertSubscription';
import { getUserAlertSubscriptionsEndpoint } from '../../api/subscriptions/getUserAlertSubscriptions';
import {
    Card,
    CardHead,
    ConfidenceBadge,
    Empty,
    Explain,
    Legal,
    Seg,
    SignalBanner,
    SignalPill,
    Tip,
} from '../ui/Blocks';
import { CandleChart, Gauge, LineChart } from '../ui/Charts';
import ModelsPanel from '../ui/ModelsPanel';
import Icon from '../ui/Icon';
import {
    featureValue,
    num,
    pct,
    pct1,
    shortDate,
    signalRule,
    tone,
    usd,
    xgbProbabilityNote,
} from '../format';
import InfoTip from '../../components/Layout/InfoTip';
import {
    annualizedVol,
    confidenceLevel,
    consensusParts,
    consensusSignal,
    logReturns,
    modelLabel,
    normalizeSignal,
    probabilityUp,
    uniqueModels,
    type Signal,
} from '../finance';

const HN = 70;

const SIGNAL_COLOR: Record<Signal, string> = {
    alza: 'var(--nx-up)',
    baja: 'var(--nx-down)',
    neutral: 'var(--nx-neu)',
};

const CLASS_TEXT: Record<string, string> = {
    sobrecompra: 'Lectura alcista',
    sobreventa: 'Lectura bajista',
    neutral: 'Sin una tendencia clara',
    sin_datos: 'Sin datos suficientes',
};

function addBusinessDays(from: Date, n: number): Date {
    const d = new Date(from);
    let k = 0;
    while (k < n) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) k++;
    }
    return d;
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export default function Accion() {
    const { ticker: param } = useParams();
    const navigate = useNavigate();
    const { history, compare: allCompare } = usePortfolio();
    const { rows } = useHoldingsView();
    const [horizon, setHorizon] = useState(10);
    const [mode, setMode] = useState<'linea' | 'velas'>('linea');
    const [alertMsg, setAlertMsg] = useState<string | null>(null);
    const subs = useRemote('alert-subs', getUserAlertSubscriptionsEndpoint);
    const [followed, setFollowed] = useState<Record<string, boolean>>({});

    const ticker = param?.toUpperCase() ?? rows[0]?.ticker;
    const row = rows.find((r) => r.ticker === ticker);
    const fetched = useRemote(
        ticker && !allCompare[ticker] ? `compare:${ticker}` : null,
        () => getShareTrendCompareEndpoint(ticker!),
    );
    const compare = ticker
        ? (allCompare[ticker] ?? fetched.data ?? undefined)
        : undefined;
    const candles = useRemote(
        ticker && mode === 'velas' ? `candles:${ticker}` : null,
        () => getCandlesEndpoint(ticker!),
    );
    const explain = useRemote(ticker ? `explain:${ticker}` : null, () =>
        getExplainEndpoint(ticker!),
    );
    const info = useRemote(ticker ? `info:${ticker}` : null, () =>
        getShareInfo(ticker!),
    );
    const sector = useRemote(ticker ? `sector:${ticker}` : null, () =>
        getShareSector(ticker!),
    );

    const closes = useMemo(
        () => (ticker ? (history[ticker] ?? []) : []),
        [history, ticker],
    );
    const last = row?.price ?? closes[closes.length - 1]?.close ?? null;
    const xgb =
        compare?.predictions.xgboost ?? compare?.predictions['xgboost-modal'];
    const prob = probabilityUp(compare, row?.trend);
    const xgbSignal: Signal | null = xgb?.available
        ? normalizeSignal(xgb.signal)
        : null;
    const xgbHorizon = xgb?.horizon_days ?? 20;
    const { parts, score } = consensusParts(compare);
    const conf = confidenceLevel(compare, prob, row?.base ?? 0.5);
    const signal: Signal | null = compare?.consensus
        ? consensusSignal(compare)
        : (row?.signal ?? null);
    const models = uniqueModels(compare);
    const rsi =
        row?.trend?.rsi ??
        models.find(([, p]) => p.rsi != null)?.[1].rsi ??
        null;
    const garch =
        compare?.predictions['garch-modal'] ??
        compare?.predictions['garch-ann-modal'];

    const proj = (() => {
        if (last == null) return null;
        const avgH = parts.length
            ? parts.reduce(
                  (s, p) =>
                      s + (compare?.predictions[p.model]?.horizon_days ?? 10),
                  0,
              ) / parts.length
            : 10;
        const daily =
            score != null && signal && signal !== 'neutral'
                ? score / Math.max(1, avgH)
                : 0;
        const rets = logReturns(closes.map((c) => c.close).slice(-120));
        const realized =
            rets.length > 10
                ? Math.sqrt(rets.reduce((s, r) => s + r * r, 0) / rets.length)
                : 0.02;
        const fc =
            garch?.volatility_forecast
                ?.filter((p) => p.volatility_pct > 0)
                .sort((a, b) => a.horizon_days - b.horizon_days) ?? [];
        const sigmaDay = (k: number) => {
            const p = fc.find((f) => f.horizon_days >= k) ?? fc[fc.length - 1];
            return p ? p.volatility_pct / 100 : realized;
        };
        const mid: number[] = [];
        const lo68: number[] = [];
        const hi68: number[] = [];
        const lo95: number[] = [];
        const hi95: number[] = [];
        let variance = 0;
        for (let k = 1; k <= horizon; k++) {
            variance += sigmaDay(k) ** 2;
            const m = last * Math.exp(daily * k);
            const s = Math.sqrt(variance);
            mid.push(m);
            lo68.push(m * Math.exp(-s));
            hi68.push(m * Math.exp(s));
            lo95.push(m * Math.exp(-1.96 * s));
            hi95.push(m * Math.exp(1.96 * s));
        }
        const annual = fc.length
            ? (fc[0].volatility_pct / 100) * Math.sqrt(252)
            : rets.length > 20
              ? annualizedVol(rets)
              : null;
        return {
            mid,
            lo68,
            hi68,
            lo95,
            hi95,
            annual,
            fromGarch: fc.length > 0,
            hasView: score != null && signal != null && signal !== 'neutral',
        };
    })();

    if (!ticker)
        return rows.length === 0 ? (
            <Empty>Cargá acciones en tu cartera para analizarlas.</Empty>
        ) : null;
    if (!param && ticker) return <Navigate to={`/accion/${ticker}`} replace />;

    const histSlice = closes.slice(-HN);
    const lastDate = histSlice.length
        ? new Date(histSlice[histSlice.length - 1].ts)
        : new Date();
    const projDates = Array.from({ length: horizon }, (_, k) =>
        addBusinessDays(lastDate, k + 1).toISOString(),
    );
    const labels = [
        ...histSlice.map((c) => new Date(c.ts).toISOString()),
        ...projDates,
    ];
    const pad = (arr: number[]) => [
        ...Array(Math.max(0, histSlice.length - 1)).fill(null),
        last,
        ...arr,
    ];
    const predicted = proj?.hasView ? proj.mid[proj.mid.length - 1] : null;
    const name = info.data?.nombre_largo || info.data?.nombre_corto || '';
    const sumQ = parts.reduce((s, p) => s + p.quality, 0);

    const isFollowed =
        followed[ticker] ?? subs.data?.tickers.includes(ticker) ?? false;
    const toggleAlert = async () => {
        try {
            if (isFollowed) {
                await unsubscribeFromTickerAlertEndpoint(ticker);
                setFollowed((f) => ({ ...f, [ticker]: false }));
                setAlertMsg(`Listo: ya no te avisamos por ${ticker}.`);
            } else {
                await subscribeToTickerAlertEndpoint(ticker);
                setFollowed((f) => ({ ...f, [ticker]: true }));
                setAlertMsg(
                    `Listo: te avisamos por mail si cambia la señal de ${ticker}.`,
                );
            }
        } catch (err) {
            if (
                (err as { response?: { status?: number } }).response?.status ===
                409
            ) {
                setFollowed((f) => ({ ...f, [ticker]: true }));
                setAlertMsg(
                    `Ya te avisamos por mail si cambia la señal de ${ticker}.`,
                );
                return;
            }
            setAlertMsg(
                'No pudimos guardar la alerta. Probá de nuevo más tarde.',
            );
        }
    };

    const shap = (() => {
        const e = explain.data;
        if (!e || !e.contributions.length) return null;
        const baseP = sigmoid(e.base_value);
        const total = e.contributions.reduce((s, c) => s + c.contribution, 0);
        const diff = e.probability_up - baseP;
        const toPts = (c: number) =>
            Math.abs(total) > 1e-9 ? (c / total) * diff : 0;
        const items = e.contributions
            .map((c) => ({ ...c, pts: toPts(c.contribution) }))
            .sort((a, b) => Math.abs(b.pts) - Math.abs(a.pts))
            .slice(0, 9);
        const max = Math.max(1e-9, ...items.map((i) => Math.abs(i.pts)));
        return {
            baseP,
            items,
            max,
            p: e.probability_up,
            signal: e.signal ?? 'neutral',
            hasRule: e.alza_threshold !== undefined,
            alzaFrom: e.alza_threshold ?? null,
            bajaTo: e.baja_threshold ?? null,
            horizon: compare?.predictions.xgboost?.horizon_days ?? 20,
        };
    })();

    return (
        <>
            <div className="nx-chips nx-rv">
                {rows.map((r) => (
                    <button
                        key={r.ticker}
                        type="button"
                        aria-pressed={r.ticker === ticker}
                        onClick={() => navigate(`/accion/${r.ticker}`)}
                    >
                        {r.ticker}{' '}
                        {r.week != null && (
                            <small className={tone(r.week)}>
                                {pct(r.week)}
                            </small>
                        )}
                    </button>
                ))}
            </div>
            <div className="nx-head nx-rv">
                <div>
                    <div className="nx-eyebrow">
                        Análisis de acción
                        {sector.data ? ` · ${sector.data}` : ''}
                    </div>
                    <div className="nx-ticker-hero">
                        <div>
                            <h1>{ticker}</h1>
                            {name && <div className="nx-muted">{name}</div>}
                        </div>
                        <div className="px">
                            {last != null ? usd(last) : '—'}
                        </div>
                        {row?.week != null && (
                            <div>
                                <span className={`nx-chip-d ${tone(row.week)}`}>
                                    {pct(row.week)}
                                </span>{' '}
                                <span className="nx-muted">semana</span>
                            </div>
                        )}
                        <SignalPill signal={signal} />
                        <ConfidenceBadge level={conf} />
                    </div>
                </div>
                <div className="nx-actions">
                    <button
                        type="button"
                        className="nx-btn"
                        onClick={toggleAlert}
                        aria-pressed={isFollowed}
                        title={
                            isFollowed
                                ? 'Tocá para dejar de recibir el aviso'
                                : undefined
                        }
                    >
                        <Icon name="bell" />{' '}
                        {isFollowed
                            ? 'Te avisamos si cambia ✓'
                            : 'Avisarme si cambia'}
                    </button>
                    <button
                        type="button"
                        className="nx-btn"
                        onClick={() =>
                            navigate('/terminal', {
                                state: { cmd: `compare ${ticker}` },
                            })
                        }
                    >
                        <Icon name="term" /> Ver en terminal
                    </button>
                </div>
            </div>
            {alertMsg && (
                <p className="nx-why" role="status">
                    {alertMsg}
                </p>
            )}
            <Legal />
            <Explain
                title={`Todo lo que sabemos de ${ticker}, en una pantalla`}
            >
                <p>
                    Arriba ves el <b>precio de cada rueda</b> <Tip k="ohlc" />{' '}
                    y, a la derecha de "HOY", la <b>lectura combinada</b> de
                    todos los modelos (no de uno solo), con un <b>cono</b>{' '}
                    <Tip k="cono" /> del rango probable.
                </p>
                <p>
                    Más abajo, <b>qué dice cada modelo</b> y qué tan seguido le
                    acertó a esta acción en el pasado. Al final, <b>por qué</b>{' '}
                    XGBoost dice lo que dice <Tip k="shap" />.
                </p>
            </Explain>
            <div className="nx-grid" style={{ alignItems: 'start' }}>
                <Card span="s8" i={2}>
                    <CardHead
                        title="Precio histórico → proyección"
                        hint={
                            mode === 'velas'
                                ? 'Cada vela = una rueda. Las barras de abajo son el volumen operado.'
                                : 'Cierre de cada rueda. La línea punteada solo se inclina si la lectura combinada se juega por un lado.'
                        }
                        right={
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 8,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Seg
                                    label="Tipo de gráfico"
                                    options={[
                                        ['linea', 'línea'],
                                        ['velas', 'velas'],
                                    ]}
                                    value={mode}
                                    onChange={setMode}
                                />
                                <Seg
                                    label="Horizonte"
                                    options={[
                                        [5, '5d'],
                                        [10, '10d'],
                                        [20, '20d'],
                                    ]}
                                    value={horizon}
                                    onChange={setHorizon}
                                />
                            </div>
                        }
                    />
                    <SignalBanner
                        signal={signal}
                        detail={
                            signal && score != null && signal !== 'neutral'
                                ? `Lectura combinada de todos los modelos: esperan ${pct(score * 100, 1)} en el plazo.`
                                : signal === 'neutral'
                                  ? 'Lectura combinada de todos los modelos: no se juegan por un lado.'
                                  : undefined
                        }
                    />
                    {mode === 'velas' ? (
                        candles.data ? (
                            <CandleChart
                                ariaLabel={`Velas de ${ticker}`}
                                height={340}
                                candles={candles.data.candles.slice(-HN)}
                                projection={
                                    proj
                                        ? {
                                              mid: proj.mid,
                                              lo: proj.lo68,
                                              hi: proj.hi68,
                                          }
                                        : undefined
                                }
                            />
                        ) : (
                            <Empty>
                                {candles.error
                                    ? 'No pudimos traer las velas de esta acción.'
                                    : 'Cargando velas…'}
                            </Empty>
                        )
                    ) : histSlice.length > 1 && proj ? (
                        <LineChart
                            ariaLabel={`Precio de ${ticker} y proyección`}
                            height={340}
                            labels={labels}
                            xFmt={shortDate}
                            yFmt={(v) => '$' + v.toFixed(v > 100 ? 0 : 1)}
                            vline={histSlice.length - 1}
                            vlineLabel="HOY"
                            bands={[
                                {
                                    lo: pad(proj.lo95),
                                    hi: pad(proj.hi95),
                                    color: 'var(--nx-accent-2)',
                                    opacity: 0.1,
                                },
                                {
                                    lo: pad(proj.lo68),
                                    hi: pad(proj.hi68),
                                    color: 'var(--nx-accent-2)',
                                    opacity: 0.18,
                                },
                            ]}
                            series={[
                                {
                                    label: 'Cierre',
                                    values: [
                                        ...histSlice.map((c) => c.close),
                                        ...Array(horizon).fill(null),
                                    ],
                                    color: 'var(--nx-accent)',
                                    area: true,
                                },
                                {
                                    label: 'Proyección',
                                    values: pad(proj.mid),
                                    color: 'var(--nx-accent-2)',
                                    dash: '5 4',
                                },
                            ]}
                        />
                    ) : (
                        <Empty>Cargando precios…</Empty>
                    )}
                    <div className="nx-legend" style={{ marginTop: 8 }}>
                        {mode === 'velas' ? (
                            <>
                                <span>
                                    <i style={{ background: 'var(--nx-up)' }} />
                                    Rueda alcista
                                </span>
                                <span>
                                    <i
                                        style={{ background: 'var(--nx-down)' }}
                                    />
                                    Rueda bajista
                                </span>
                            </>
                        ) : (
                            <span>
                                <i style={{ background: 'var(--nx-accent)' }} />
                                Cierre
                            </span>
                        )}
                        <span>
                            <i style={{ background: 'var(--nx-accent-2)' }} />
                            Proyección
                        </span>
                        <span>
                            <i
                                style={{
                                    background: 'var(--nx-accent-2)',
                                    opacity: 0.35,
                                }}
                            />
                            Cono 68% / 95% <Tip k="cono" />
                        </span>
                    </div>
                </Card>
                <Card span="s4" i={3}>
                    <CardHead
                        title="De dónde sale cada número"
                        hint="Son cosas distintas: no se mezclan."
                    />
                    <div className="nx-src-block">
                        <div className="nx-label">
                            1. Lectura combinada <Tip k="consenso" />
                        </div>
                        {compare?.consensus ? (
                            <p
                                className="nx-ink"
                                style={{
                                    fontWeight: 600,
                                    margin: '4px 0 2px',
                                }}
                            >
                                {CLASS_TEXT[compare.consensus.classification]}
                                {score != null && (
                                    <span
                                        className={`nx-mono ${tone(score)}`}
                                        style={{
                                            marginLeft: 8,
                                            fontWeight: 500,
                                        }}
                                    >
                                        {pct(score * 100, 1)}
                                    </span>
                                )}
                            </p>
                        ) : (
                            !parts.length && (
                                <Empty>
                                    Los modelos todavía no respondieron para
                                    esta acción.
                                </Empty>
                            )
                        )}
                        <p className="nx-src">
                            Mezcla el retorno que espera cada modelo, pesando
                            más a los que más acertaron con {ticker} en el
                            pasado. No es la probabilidad de XGBoost.
                        </p>
                        {parts.length > 0 && (
                            <a className="nx-see" href="#como-se-combinan">
                                Ver la cuenta ↓
                            </a>
                        )}
                        <div className="nx-sys-row" style={{ marginTop: 8 }}>
                            <span className="nx-muted">
                                Confianza <Tip k="confsenal" />
                            </span>
                            <ConfidenceBadge level={conf} />
                        </div>
                    </div>
                    {prob != null && (
                        <div className="nx-src-block">
                            <div className="nx-label">
                                2. XGBoost — chances de suba <Tip k="prob" />
                            </div>
                            <Gauge
                                p={prob}
                                label="CHANCES DE SUBA"
                                signal={xgbSignal ?? undefined}
                            />
                            <p className="nx-src">
                                {xgbProbabilityNote(
                                    prob,
                                    xgbSignal ?? 'neutral',
                                    xgbHorizon,
                                    shap?.alzaFrom ?? null,
                                    shap?.bajaTo ?? null,
                                )}
                            </p>
                        </div>
                    )}
                    {rsi != null && (
                        <div className="nx-src-block">
                            <div className="nx-sys-row">
                                <span className="nx-muted">
                                    RSI (14) — no es un modelo <Tip k="rsi" />
                                </span>
                                <b className="nx-mono nx-ink">
                                    {Math.round(rsi)}
                                </b>
                            </div>
                            <div className="nx-meter">
                                <i
                                    style={{
                                        left: `calc(${Math.min(100, Math.max(0, rsi))}% - 2px)`,
                                    }}
                                />
                            </div>
                            <div
                                className="nx-sys-row nx-muted nx-mono"
                                style={{ fontSize: 10.5 }}
                            >
                                <span>cayó mucho</span>
                                <span>subió mucho</span>
                            </div>
                        </div>
                    )}
                    <div className="nx-stat-grid" style={{ marginTop: 12 }}>
                        <div className="nx-stat">
                            <div className="k">
                                {proj?.hasView
                                    ? `Si se cumple, en ${horizon} ruedas`
                                    : `Precio de hoy (sin vista)`}{' '}
                                <Tip k="centro" />
                            </div>
                            <div
                                className={`v ${predicted != null && last != null && proj?.hasView ? tone(predicted - last) : ''}`}
                            >
                                {predicted != null
                                    ? usd(predicted)
                                    : last != null
                                      ? usd(last)
                                      : '—'}
                            </div>
                        </div>
                        <div className="nx-stat">
                            <div className="k">
                                Cuánto suele moverse <Tip k="garch" />
                            </div>
                            <div className="v">
                                {proj?.annual != null
                                    ? pct1(proj.annual * 100)
                                    : '—'}
                            </div>
                            <div className="d nx-muted">
                                en un año
                                {proj && !proj.fromGarch ? ', histórico' : ''}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
            <div className="nx-grid" style={{ marginTop: 16 }}>
                <ModelsPanel compare={compare} loading={fetched.loading} />
            </div>
            {parts.length > 0 && score != null && (
                <div
                    className="nx-grid"
                    style={{ marginTop: 16 }}
                    id="como-se-combinan"
                >
                    <Card i={10}>
                        <CardHead
                            title="Cómo se combinan los modelos"
                            hint={
                                <>
                                    De dónde sale la lectura combinada{' '}
                                    <Tip k="consenso" />
                                </>
                            }
                        />
                        <div className="nx-calc">
                            <b className="nx-ink">1.</b> Esto arma la lectura
                            combinada (el cartel grande de arriba), no el 70% de
                            XGBoost. Cada modelo dice cuánto espera que suba o
                            baje, y pesa según cuánto acertó en el pasado:
                            <div className="nx-calc-eq">
                                {parts.map((p, k) => (
                                    <span key={p.model}>
                                        {k > 0 && <i>+</i>}
                                        {modelLabel(p.model)}{' '}
                                        <b className={tone(p.ret)}>
                                            {pct(p.ret * 100, 1)}
                                        </b>{' '}
                                        × peso{' '}
                                        {Math.round((p.quality / sumQ) * 100)}%
                                        {p.agreement < 1 && ' × ½'}
                                    </span>
                                ))}
                                <i>=</i>
                                <span className="res">
                                    <b className={tone(score)}>
                                        {pct(score * 100, 2)}
                                    </b>
                                </span>
                            </div>
                            <div style={{ marginTop: 8 }}>
                                <b className="nx-ink">2.</b> Si un modelo dice
                                "neutral" pero su número apunta para un lado, su
                                aporte se reduce a la mitad (× ½). El resultado
                                se compara con un umbral que depende de tu
                                perfil: arriba es alza, abajo es baja, en el
                                medio, neutral.
                            </div>
                            {compare?.consensus &&
                                compare.consensus.confidence_min != null && (
                                    <div style={{ marginTop: 8 }}>
                                        <b className="nx-ink">3.</b> Además, los
                                        modelos tienen que haber acertado lo
                                        suficiente en el pasado: su acierto
                                        promedio es{' '}
                                        {pct1(
                                            compare.consensus
                                                .aggregate_confidence * 100,
                                        )}{' '}
                                        y el mínimo pedido es{' '}
                                        {pct1(
                                            compare.consensus.confidence_min *
                                                100,
                                        )}
                                        .
                                        {compare.consensus
                                            .aggregate_confidence <
                                            compare.consensus.confidence_min &&
                                            ' Como no llega, la lectura queda neutral.'}
                                    </div>
                                )}
                        </div>
                    </Card>
                </div>
            )}
            <div className="nx-grid" style={{ marginTop: 16 }}>
                <Card span="s7" i={11}>
                    <CardHead
                        title="¿Por qué XGBoost opina esto?"
                        hint={
                            <>
                                Desarma la fila de XGBoost de la tabla de
                                modelos: qué datos de {ticker} le subieron o
                                bajaron las chances de suba. No es otro modelo
                                ni el consenso. <Tip k="shap" />
                            </>
                        }
                    />
                    {shap ? (
                        <>
                            <div
                                className="nx-wf-row"
                                style={{ fontWeight: 600 }}
                            >
                                <span className="nx-ink">Lo normal</span>
                                <div className="nx-wf-track">
                                    <div className="axis0" />
                                </div>
                                <span
                                    className="nx-mono nx-ink"
                                    style={{ textAlign: 'right' }}
                                >
                                    {Math.round(shap.baseP * 100)}%
                                </span>
                            </div>
                            <p className="nx-why-start">
                                Antes de mirar los datos de {ticker}, el modelo
                                parte de que una acción sube en {shap.horizon}{' '}
                                ruedas el {Math.round(shap.baseP * 100)}% de las
                                veces (lo que pasó en los años con los que se
                                entrenó). Cada dato suma{' '}
                                <span className="nx-up">(verde)</span> o resta{' '}
                                <span className="nx-down">(rojo)</span> puntos a
                                ese porcentaje. Debajo de cada dato está su
                                valor de hoy; tocá la "i" para ver qué mide.
                            </p>
                            {shap.items.map((it, k) => {
                                const w = (Math.abs(it.pts) / shap.max) * 48;
                                return (
                                    <div className="nx-wf-row" key={it.feature}>
                                        <span>
                                            {it.label || it.feature}
                                            {it.help && (
                                                <InfoTip
                                                    label={
                                                        it.label || it.feature
                                                    }
                                                >
                                                    {it.help}
                                                </InfoTip>
                                            )}
                                            <span className="nx-wf-val">
                                                hoy:{' '}
                                                {featureValue(
                                                    it.value,
                                                    it.unit,
                                                )}
                                            </span>
                                        </span>
                                        <div className="nx-wf-track">
                                            <div className="axis0" />
                                            <i
                                                style={{
                                                    animationDelay: `${k * 110 + 200}ms`,
                                                    left:
                                                        it.pts >= 0
                                                            ? '50%'
                                                            : `${50 - w}%`,
                                                    width: `${w}%`,
                                                    transformOrigin:
                                                        it.pts >= 0
                                                            ? 'left'
                                                            : 'right',
                                                    background:
                                                        it.pts >= 0
                                                            ? 'var(--nx-up)'
                                                            : 'var(--nx-down)',
                                                }}
                                            />
                                        </div>
                                        <span
                                            className={`nx-mono ${tone(it.pts)}`}
                                            style={{ textAlign: 'right' }}
                                        >
                                            {it.pts >= 0 ? '+' : '−'}
                                            {num(Math.abs(it.pts) * 100, 1)}
                                        </span>
                                    </div>
                                );
                            })}
                            <div className="nx-wf-result">
                                <div>
                                    <div
                                        className="nx-muted"
                                        style={{ fontSize: 12 }}
                                    >
                                        Resultado: chances de que {ticker} esté
                                        más arriba dentro de {shap.horizon}{' '}
                                        ruedas
                                    </div>
                                    <b>{Math.round(shap.p * 100)}%</b>
                                </div>
                                <SignalPill signal={shap.signal} />
                            </div>
                            {shap.hasRule && (
                                <p
                                    className="nx-muted"
                                    style={{ fontSize: 12 }}
                                >
                                    {signalRule(shap.alzaFrom, shap.bajaTo)}
                                </p>
                            )}
                        </>
                    ) : (
                        <Empty>
                            {explain.loading
                                ? 'Calculando…'
                                : 'La explicación del modelo no está disponible para esta acción.'}
                        </Empty>
                    )}
                </Card>
                <Card span="s5" i={12}>
                    <CardHead
                        title="¿Están de acuerdo?"
                        hint="Si todas las barras van para el mismo lado, la señal es más confiable"
                    />
                    {parts.length ? (
                        (() => {
                            const maxR = Math.max(
                                1e-6,
                                ...parts.map((p) => Math.abs(p.ret)),
                                Math.abs(score ?? 0),
                            );
                            const bar = (
                                label: string,
                                r: number,
                                strong = false,
                            ) => {
                                const w = (Math.abs(r) / maxR) * 50;
                                return (
                                    <div className="nx-bar-row" key={label}>
                                        <span
                                            className={`lbl ${strong ? 'nx-ink' : ''}`}
                                            style={{
                                                fontWeight: strong ? 600 : 400,
                                            }}
                                        >
                                            {label}
                                        </span>
                                        <div
                                            className="nx-bar-track"
                                            style={{ position: 'relative' }}
                                        >
                                            <div
                                                className="nx-bar-fill"
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    bottom: 0,
                                                    left:
                                                        r >= 0
                                                            ? '50%'
                                                            : `${50 - w}%`,
                                                    width: `${w}%`,
                                                    background: strong
                                                        ? 'linear-gradient(90deg,var(--nx-accent),var(--nx-accent-2))'
                                                        : SIGNAL_COLOR[
                                                              r > 0
                                                                  ? 'alza'
                                                                  : r < 0
                                                                    ? 'baja'
                                                                    : 'neutral'
                                                          ],
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
                                            className={`nx-mono ${tone(r)}`}
                                            style={{
                                                textAlign: 'right',
                                                fontWeight: strong ? 600 : 400,
                                            }}
                                        >
                                            {pct(r * 100, 1)}
                                        </span>
                                    </div>
                                );
                            };
                            const same = parts.every(
                                (p) =>
                                    Math.sign(p.ret) ===
                                    Math.sign(parts[0].ret),
                            );
                            return (
                                <>
                                    <div
                                        className="nx-bars"
                                        style={{ marginTop: 14 }}
                                    >
                                        {parts.map((p) =>
                                            bar(modelLabel(p.model), p.ret),
                                        )}
                                        {score != null &&
                                            bar('Consenso', score, true)}
                                    </div>
                                    <p
                                        className="nx-muted"
                                        style={{
                                            fontSize: 12.5,
                                            margin: '16px 0 0',
                                        }}
                                    >
                                        {same
                                            ? 'Los modelos van para el mismo lado: la señal es más firme.'
                                            : 'Los modelos opinan distinto entre sí: tomá la señal con más cautela.'}
                                    </p>
                                </>
                            );
                        })()
                    ) : (
                        <Empty>Sin predicciones para comparar.</Empty>
                    )}
                </Card>
            </div>
            {info.data?.descripcion && (
                <div className="nx-grid" style={{ marginTop: 16 }}>
                    <Card i={13}>
                        <CardHead
                            title={`Sobre ${name || ticker}`}
                            hint={
                                sector.data
                                    ? `Sector: ${sector.data}`
                                    : undefined
                            }
                        />
                        <p
                            style={{
                                fontSize: 13.5,
                                margin: 0,
                                color: 'var(--nx-ink-2)',
                            }}
                        >
                            {info.data.descripcion}
                        </p>
                    </Card>
                </div>
            )}
        </>
    );
}
