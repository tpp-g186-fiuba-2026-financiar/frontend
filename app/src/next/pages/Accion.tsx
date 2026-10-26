import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { usePortfolio } from '../data/PortfolioContext';
import { useHoldingsView } from '../data/useHoldingsView';
import { useRemote } from '../data/useRemote';
import {
    getCandlesEndpoint,
    getExplainEndpoint,
    getFairValueEndpoint,
    getMarketSeriesEndpoint,
    getVolatilityEndpoint,
    type FairValueChannelPoint,
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
    SignalArrow,
    SignalPill,
    Tip,
} from '../ui/Blocks';
import {
    CandleChart,
    Gauge,
    LineChart,
    PredictionStrip,
    type Forecast,
    type ForecastRay,
    type PredictionRow,
} from '../ui/Charts';
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
    usd0,
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
    technicalChecks,
    uniqueModels,
    type Signal,
} from '../finance';

// Cuanto historico mostrar (en ruedas): no cambia la prediccion.
const SPANS: Array<[number, string]> = [
    [21, '1M'],
    [63, '3M'],
    [126, '6M'],
    [252, '1A'],
    [1260, '5A'],
];

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
    const [span, setSpan] = useState(63);
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
    const fair = useRemote(ticker ? `fair:${ticker}` : null, () =>
        getFairValueEndpoint(ticker!),
    );
    const [showTrend, setShowTrend] = useState<'off' | 'on'>('off');
    const [moneda, setMoneda] = useState<'ars' | 'usd'>('ars');
    const market = useRemote(
        moneda === 'usd' ? 'market-series' : null,
        getMarketSeriesEndpoint,
    );
    // GARCH local a 20 ruedas: lo que mejor se predice es cuanto se mueve.
    const vol = useRemote(ticker ? `vol:${ticker}` : null, () =>
        getVolatilityEndpoint(ticker!, 20),
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

    const horizons = parts
        .map((p) => compare?.predictions[p.model]?.horizon_days)
        .filter((h): h is number => h != null && h > 0);
    const horizon = horizons.length
        ? Math.min(
              20,
              Math.max(
                  5,
                  Math.round(
                      horizons.reduce((s, h) => s + h, 0) / horizons.length,
                  ),
              ),
          )
        : 5;
    const thresholds =
        compare?.consensus?.threshold_buy != null &&
        compare.consensus.threshold_sell != null
            ? {
                  buy: compare.consensus.threshold_buy,
                  sell: compare.consensus.threshold_sell,
              }
            : null;

    const rays: ForecastRay[] =
        last == null
            ? []
            : models.flatMap(([key, p]) => {
                  if (!p.predicted_close || !p.last_close || !p.horizon_days)
                      return [];
                  const ratio = p.predicted_close / p.last_close;
                  const change = pct((ratio - 1) * 100, 1);
                  const name = modelLabel(key);
                  return [
                      {
                          label: `${name} ${change}`,
                          short: `${name.slice(0, 4)} ${change}`,
                          h: p.horizon_days,
                          v: last * ratio,
                          color:
                              ratio > 1.001
                                  ? SIGNAL_COLOR.alza
                                  : ratio < 0.999
                                    ? SIGNAL_COLOR.baja
                                    : SIGNAL_COLOR.neutral,
                      },
                  ];
              });
    const reach = Math.max(horizon, ...rays.map((r) => r.h));
    const predictionRows: PredictionRow[] = models
        .flatMap(([key, p]) =>
            p.predicted_close && p.last_close && p.horizon_days
                ? [
                      {
                          label: modelLabel(key),
                          ret: p.predicted_close / p.last_close - 1,
                          h: p.horizon_days,
                          color: '',
                      },
                  ]
                : [],
        )
        .map((r) => ({
            ...r,
            color:
                r.ret > 0.001
                    ? SIGNAL_COLOR.alza
                    : r.ret < -0.001
                      ? SIGNAL_COLOR.baja
                      : SIGNAL_COLOR.neutral,
        }))
        .sort((a, b) => b.ret - a.ret);

    const proj = (() => {
        if (last == null) return null;
        const daily = score != null ? score / horizon : 0;
        const rets = logReturns(closes.map((c) => c.close).slice(-120));
        const realized =
            rets.length > 10
                ? Math.sqrt(rets.reduce((s, r) => s + r * r, 0) / rets.length)
                : 0.02;
        const fc =
            garch?.volatility_forecast
                ?.filter((p) => p.volatility_pct > 0)
                .sort((a, b) => a.horizon_days - b.horizon_days) ?? [];
        const local = vol.data?.daily_volatility_pct ?? [];
        const sigmaDay = (k: number) => {
            if (local.length) return local[Math.min(k, local.length) - 1] / 100;
            const p = fc.find((f) => f.horizon_days >= k) ?? fc[fc.length - 1];
            return p ? p.volatility_pct / 100 : realized;
        };
        const mid: number[] = [];
        const lo68: number[] = [];
        const hi68: number[] = [];
        const lo95: number[] = [];
        const hi95: number[] = [];
        let variance = 0;
        for (let k = 1; k <= reach; k++) {
            variance += sigmaDay(k) ** 2;
            const m = last * Math.exp(daily * k);
            const s = Math.sqrt(variance);
            mid.push(m);
            lo68.push(m * Math.exp(-s));
            hi68.push(m * Math.exp(s));
            lo95.push(m * Math.exp(-1.96 * s));
            hi95.push(m * Math.exp(1.96 * s));
        }
        const annual = local.length
            ? (local[0] / 100) * Math.sqrt(252)
            : fc.length
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
            fromGarch: local.length > 0 || fc.length > 0,
            hasView: score != null && signal != null && signal !== 'neutral',
        };
    })();

    if (!ticker)
        return rows.length === 0 ? (
            <Empty>Cargá acciones en tu cartera para analizarlas.</Empty>
        ) : null;
    if (!param && ticker) return <Navigate to={`/accion/${ticker}`} replace />;

    const histSlice = closes.slice(-span);
    const lastDate = histSlice.length
        ? new Date(histSlice[histSlice.length - 1].ts)
        : new Date();
    const projDates = Array.from({ length: reach }, (_, k) =>
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
    const predicted = proj?.hasView ? proj.mid[horizon - 1] : null;
    const shown =
        mode === 'velas'
            ? (candles.data?.candles.slice(-span) ?? [])
            : histSlice;
    const today = shown.length - 1;
    const target = proj && score != null ? proj.mid[horizon - 1] : null;
    const projColor = SIGNAL_COLOR[signal ?? 'neutral'];
    const outside =
        thresholds != null &&
        score != null &&
        (score > thresholds.buy || score < thresholds.sell);
    const verdict =
        signal === 'alza'
            ? 'SUBE'
            : signal === 'baja'
              ? 'BAJA'
              : outside
                ? 'NEUTRAL (poca confianza)'
                : 'NEUTRAL';
    // La distancia a la tendencia se mide con el mismo precio que muestra la
    // pantalla (api-ml puede tener la ultima rueda de otra fuente).
    const fv = (() => {
        const f = fair.data;
        if (!f) return null;
        const precio = last ?? f.precio_actual;
        const z =
            f.desvio_log > 0
                ? Math.log(precio / f.precio_estimado) / f.desvio_log
                : 0;
        const tramos = f.evidencia?.tramos ?? [];
        const tramo =
            tramos.find(
                (t) =>
                    (t.desde == null || z >= t.desde) &&
                    (t.hasta == null || z < t.hasta),
            ) ?? f.historico;
        const casos = tramos.reduce((acc, t) => acc + t.casos, 0);
        return {
            ...f,
            precio_actual: precio,
            diferencia: precio / f.precio_estimado - 1,
            desvios: z,
            posicion: z > 1 ? 'por_encima' : z < -1 ? 'por_debajo' : 'en_linea',
            sube: tramo.sube,
            horizonte: f.evidencia?.horizonte ?? f.historico.horizonte,
            promedio: casos
                ? tramos.reduce((acc, t) => acc + t.sube * t.casos, 0) / casos
                : null,
        };
    })();
    const canal = new Map(
        (fair.data?.canal ?? []).map((p) => [p.date.slice(0, 10), p]),
    );
    const onHist = (pick: (p: FairValueChannelPoint) => number) => [
        ...histSlice.map((c) => {
            const p = canal.get(new Date(c.ts).toISOString().slice(0, 10));
            return p ? pick(p) : null;
        }),
        ...Array(reach).fill(null),
    ];
    const trendSeries =
        showTrend === 'on' && mode === 'linea' && fair.data
            ? [
                  {
                      label: 'Tendencia (regresión)',
                      values: onHist((p) => p.estimado),
                      color: 'var(--nx-warn)',
                      dash: '6 4',
                      width: 1.6,
                  },
                  {
                      label: '+1 desvío',
                      values: onHist((p) => p.hi1),
                      color: 'var(--nx-warn)',
                      dash: '2 4',
                      width: 1,
                  },
                  {
                      label: '−1 desvío',
                      values: onHist((p) => p.lo1),
                      color: 'var(--nx-warn)',
                      dash: '2 4',
                      width: 1,
                  },
              ]
            : [];
    const checks = technicalChecks(
        closes.map((c) => c.close),
        rsi,
    );
    const checkCount = {
        up: checks.filter((c) => c.tone === 'up').length,
        neutral: checks.filter((c) => c.tone === 'neutral').length,
        down: checks.filter((c) => c.tone === 'down').length,
    };
    const ups = predictionRows.filter((r) => r.ret > 0.001).length;
    const downs = predictionRows.filter((r) => r.ret < -0.001).length;
    const stripSummary =
        score == null
            ? 'Todavía no hay predicciones para esta acción.'
            : `${ups} ${ups === 1 ? 'modelo espera' : 'modelos esperan'} suba y ${downs} baja. ` +
              (signal === 'alza' || signal === 'baja'
                  ? `La lectura combinada (${pct(score * 100, 1)}) cruza el umbral de ${signal} de tu perfil.`
                  : thresholds && outside
                    ? `La lectura combinada (${pct(score * 100, 1)}) pasa el umbral, pero los modelos no acertaron lo suficiente en el pasado: queda neutral.`
                    : thresholds
                      ? `La lectura combinada (${pct(score * 100, 1)}) queda en la zona neutral: para alza hace falta ${pct(thresholds.buy * 100, 1)} o más y para baja ${pct(thresholds.sell * 100, 1)} o menos.`
                      : `La lectura combinada es ${pct(score * 100, 1)}.`);
    // En dolares CCL: cada cierre se divide por el CCL de ese dia; lo que esta
    // a la derecha de HOY, por el de hoy (supone que el dolar no se mueve).
    const cclPts =
        market.data?.series.find((x) => x.key === 'CCL')?.points ?? [];
    const enDolares = moneda === 'usd' && cclPts.length > 0;
    const cclAt = (ts: number) => {
        let v = cclPts[0]?.value ?? 1;
        for (const p of cclPts) {
            if (p.ts <= ts) v = p.value;
            else break;
        }
        return v;
    };
    const fxHoy =
        enDolares && histSlice.length
            ? cclAt(histSlice[histSlice.length - 1].ts)
            : 1;
    const fx = (i: number) =>
        !enDolares ? 1 : i < histSlice.length ? cclAt(histSlice[i].ts) : fxHoy;
    const conv = (arr: Array<number | null>) =>
        arr.map((v, i) => (v == null ? null : v / fx(i)));
    const forecast: Forecast | undefined =
        last != null
            ? {
                  from: today,
                  start: last,
                  rays,
                  main:
                      target != null && score != null
                          ? {
                                h: horizon,
                                v: target,
                                color: projColor,
                                label: verdict,
                                sublabel: `combinada ${pct(score * 100, 1)} · ${usd0(target)}`,
                            }
                          : undefined,
                  thresholds: thresholds
                      ? {
                            up: last * Math.exp(thresholds.buy),
                            down: last * Math.exp(thresholds.sell),
                        }
                      : undefined,
              }
            : undefined;
    const forecastView: Forecast | undefined =
        forecast && enDolares
            ? {
                  ...forecast,
                  start: forecast.start / fxHoy,
                  rays: forecast.rays.map((r) => ({ ...r, v: r.v / fxHoy })),
                  main: forecast.main && {
                      ...forecast.main,
                      v: forecast.main.v / fxHoy,
                      sublabel: `combinada ${pct((score ?? 0) * 100, 1)}`,
                  },
                  thresholds: forecast.thresholds && {
                      up: forecast.thresholds.up / fxHoy,
                      down: forecast.thresholds.down / fxHoy,
                  },
              }
            : forecast;
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
                        <SignalArrow
                            signal={signal}
                            detail={
                                score != null
                                    ? `Los modelos juntos esperan ${pct(score * 100, 1)} en ~${horizon} ruedas.`
                                    : undefined
                            }
                        />
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
            <div className="nx-grid" style={{ alignItems: 'start' }}>
                <Card span="s8" i={2}>
                    <CardHead
                        title="Precio histórico → proyección"
                        hint={
                            mode === 'velas'
                                ? 'Cada vela = una rueda. A la derecha de HOY, hasta dónde predice cada modelo que llegue el precio y, en grueso, la lectura combinada.'
                                : enDolares
                                  ? 'Cierre de cada rueda dividido por el dólar CCL de ese día: así se ve cuánto subió o bajó sin la inflación. A la derecha de HOY se supone que el CCL no cambia.'
                                  : 'Cierre de cada rueda. A la derecha de HOY, hasta dónde predice cada modelo que llegue el precio (cada uno en su plazo) y, en grueso, la lectura combinada.'
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
                                    label="Período del histórico"
                                    options={SPANS}
                                    value={span}
                                    onChange={setSpan}
                                />
                                {mode === 'linea' && (
                                    <Seg
                                        label="Moneda"
                                        options={[
                                            ['ars', 'pesos'],
                                            ['usd', 'US$ CCL'],
                                        ]}
                                        value={moneda}
                                        onChange={setMoneda}
                                    />
                                )}
                                {mode === 'linea' && fair.data && (
                                    <Seg
                                        label="Canal de tendencia"
                                        options={[
                                            ['off', 'sin tendencia'],
                                            ['on', 'tendencia'],
                                        ]}
                                        value={showTrend}
                                        onChange={setShowTrend}
                                    />
                                )}
                            </div>
                        }
                    />
                    {mode === 'velas' ? (
                        candles.data ? (
                            <CandleChart
                                ariaLabel={`Velas de ${ticker}`}
                                height={340}
                                candles={shown as typeof candles.data.candles}
                                forecast={forecast}
                                projection={
                                    proj
                                        ? {
                                              lo: proj.lo68,
                                              hi: proj.hi68,
                                              coneColor: 'var(--nx-ink-2)',
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
                            yFmt={(v) =>
                                enDolares
                                    ? 'US$' + v.toFixed(2)
                                    : '$' + v.toFixed(v > 100 ? 0 : 1)
                            }
                            vline={histSlice.length - 1}
                            splitAt={histSlice.length - 1}
                            vlineLabel="HOY"
                            forecast={forecastView}
                            bands={[
                                {
                                    lo: conv(pad(proj.lo95)),
                                    hi: conv(pad(proj.hi95)),
                                    color: 'var(--nx-ink-2)',
                                    opacity: 0.06,
                                },
                                {
                                    lo: conv(pad(proj.lo68)),
                                    hi: conv(pad(proj.hi68)),
                                    color: 'var(--nx-ink-2)',
                                    opacity: 0.1,
                                },
                            ]}
                            series={[
                                ...trendSeries.map((t) => ({
                                    ...t,
                                    values: conv(t.values),
                                })),
                                {
                                    label: enDolares
                                        ? 'Cierre en US$ CCL'
                                        : 'Cierre',
                                    values: conv([
                                        ...histSlice.map((c) => c.close),
                                        ...Array(reach).fill(null),
                                    ]),
                                    color: 'var(--nx-accent)',
                                    area: true,
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
                            <i
                                style={{
                                    background:
                                        'linear-gradient(90deg, var(--nx-up) 33%, var(--nx-neu) 33% 66%, var(--nx-down) 66%)',
                                    height: 2,
                                }}
                            />
                            Predicción de cada modelo
                        </span>
                        <span>
                            <i style={{ background: projColor, height: 4 }} />
                            Lectura combinada
                        </span>
                        <span>
                            <i
                                style={{
                                    background: 'var(--nx-ink-2)',
                                    opacity: 0.35,
                                }}
                            />
                            Rango probable 68% / 95% <Tip k="cono" />
                        </span>
                        {thresholds && (
                            <span>
                                <i
                                    style={{
                                        background:
                                            'linear-gradient(90deg, var(--nx-up) 50%, var(--nx-down) 50%)',
                                    }}
                                />
                                Umbral de tu perfil
                            </span>
                        )}
                        {trendSeries.length > 0 && (
                            <span>
                                <i style={{ background: 'var(--nx-warn)' }} />
                                Tendencia del último año ±1 desvío{' '}
                                <Tip k="tendencia" />
                            </span>
                        )}
                    </div>
                    <div className="nx-strip-head">
                        <h3>Qué predijo cada modelo</h3>
                        <p className="nx-muted">{stripSummary}</p>
                    </div>
                    <PredictionStrip
                        ariaLabel={`Retorno que predice cada modelo para ${ticker}`}
                        rows={predictionRows}
                        thresholds={thresholds ?? undefined}
                        combined={
                            score != null
                                ? {
                                      ret: score,
                                      h: horizon,
                                      color: projColor,
                                      verdict,
                                  }
                                : undefined
                        }
                    />
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
                    {fv && (
                        <div className="nx-src-block">
                            <div className="nx-label">
                                Precio estimado por la tendencia{' '}
                                <Tip k="tendencia" />
                            </div>
                            <p
                                className="nx-ink"
                                style={{ fontWeight: 600, margin: '4px 0 2px' }}
                            >
                                {usd(fv.precio_estimado)}{' '}
                                <span
                                    className={`nx-mono ${
                                        fv.posicion === 'por_encima'
                                            ? 'nx-down'
                                            : fv.posicion === 'por_debajo'
                                              ? 'nx-up'
                                              : 'nx-muted'
                                    }`}
                                    style={{ marginLeft: 6, fontWeight: 500 }}
                                >
                                    {fv.posicion === 'en_linea'
                                        ? 'en línea'
                                        : fv.posicion === 'por_encima'
                                          ? 'por encima'
                                          : 'por debajo'}
                                </span>
                            </p>
                            <p className="nx-src">
                                Hoy cotiza {pct(fv.diferencia * 100, 1)}{' '}
                                respecto de la recta del último año (
                                {fv.desvios >= 0 ? '+' : '−'}
                                {Math.abs(fv.desvios)
                                    .toFixed(1)
                                    .replace('.', ',')}{' '}
                                desvíos). La tendencia es de{' '}
                                {pct(fv.tendencia_anual * 100, 0)} al año y
                                explica el {Math.round(fv.r2 * 100)}% del
                                movimiento
                                {fv.r2 < 0.3
                                    ? ': poco, así que el estimado pesa poco'
                                    : ''}
                                . En el panel, desde una distancia así, la
                                acción subió en {fv.horizonte} ruedas el{' '}
                                {Math.round(fv.sube * 100)}% de las veces
                                {fv.promedio != null
                                    ? ` (en promedio, ${Math.round(fv.promedio * 100)}%)`
                                    : ''}
                                .
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
                        {vol.data && last != null && (
                            <div className="nx-stat nx-stat-wide">
                                <div className="k">
                                    Rango probable en {vol.data.horizon_days}{' '}
                                    ruedas <Tip k="garch" />
                                </div>
                                <div className="v">
                                    {usd0(
                                        last *
                                            Math.exp(
                                                -vol.data
                                                    .cumulative_volatility_pct /
                                                    100,
                                            ),
                                    )}{' '}
                                    –{' '}
                                    {usd0(
                                        last *
                                            Math.exp(
                                                vol.data
                                                    .cumulative_volatility_pct /
                                                    100,
                                            ),
                                    )}
                                </div>
                                <div className="d nx-muted">
                                    ±{pct1(vol.data.cumulative_volatility_pct)}{' '}
                                    con 68% de probabilidad (GARCH). A
                                    diferencia de la dirección, cuánto se mueve
                                    una acción sí se predice bien.
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
            <div style={{ marginTop: 16 }}>
                <Legal />
            </div>
            {checks.length > 0 && (
                <div className="nx-grid" style={{ marginTop: 16 }}>
                    <Card span="s12" i={4}>
                        <CardHead
                            title="Chequeos técnicos rápidos"
                            hint="Indicadores clásicos sobre el precio. No son un modelo ni una predicción: describen dónde está la acción hoy."
                            right={
                                <div
                                    className="nx-tech-sum"
                                    aria-label="Resumen de los chequeos"
                                >
                                    <span className="nx-up">
                                        {checkCount.up} alcista
                                        {checkCount.up === 1 ? '' : 's'}
                                    </span>
                                    <span className="nx-muted">
                                        {checkCount.neutral} neutral
                                        {checkCount.neutral === 1 ? '' : 'es'}
                                    </span>
                                    <span className="nx-down">
                                        {checkCount.down} bajista
                                        {checkCount.down === 1 ? '' : 's'}
                                    </span>
                                </div>
                            }
                        />
                        <ul className="nx-checks">
                            {checks.map((c) => (
                                <li key={c.label} className={c.tone}>
                                    <i aria-hidden />
                                    <b>{c.label}</b>
                                    <span>{c.detail}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            )}
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
