import { useEffect, useRef, useState } from 'react';
import type { ShareTrend } from '../../api/userShares/getUserSharesTrendsEndpoint';
import {
    getShareTrendCompareEndpoint,
    type CompareTrendsResponse,
    type ModelPrediction,
} from '../../api/userShares/getShareTrendCompareEndpoint';
import {
    getShareHistoryEndpoint,
    type HistoricalPricePoint,
} from '../../api/userShares/getShareHistoryEndpoint';
import InfoTip from '../Layout/InfoTip';

interface PortfolioRow {
    ticker: string;
    quantity: number;
    trend: ShareTrend | null;
}

interface TickerDetailProps {
    row: PortfolioRow;
    onBack: () => void;
}

function pillClass(signal: string | null | undefined): string {
    switch (signal) {
        case 'alza':
            return 'pill-up';
        case 'baja':
            return 'pill-down';
        default:
            return 'pill-neutral';
    }
}

function signalColorVar(signal: string | null | undefined): string {
    switch (signal) {
        case 'alza':
            return '--up';
        case 'baja':
            return '--down';
        default:
            return '--accent';
    }
}

function formatMoney(value: number | null | undefined): string {
    if (value == null) return '—';
    return `$${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
}

interface ProjectionChartProps {
    history: HistoricalPricePoint[];
    lastClose: number | null;
    predictedClose: number | null;
    horizonDays: number | null;
    signal: string | null | undefined;
}

function ProjectionChart({
    history,
    lastClose,
    predictedClose,
    horizonDays,
    signal,
}: ProjectionChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);

        const cs = getComputedStyle(document.documentElement);
        const projectionColor = cs
            .getPropertyValue(signalColorVar(signal))
            .trim();
        const historyColor = cs.getPropertyValue('--ink').trim();
        const labelColor = cs.getPropertyValue('--ink-3').trim();
        const line = cs.getPropertyValue('--line').trim();

        const values = history.map((point) => point.close);
        if (lastClose != null) values.push(lastClose);
        if (predictedClose != null) values.push(predictedClose);
        if (values.length === 0) return;
        const rawMin = Math.min(...values);
        const rawMax = Math.max(...values);
        const rawSpan = rawMax - rawMin || Math.max(1, rawMax * 0.05);
        const min = rawMin - rawSpan * 0.05;
        const max = rawMax + rawSpan * 0.05;
        const span = max - min;
        const padLeft = 72;
        const padRight = 48;
        const padTop = 16;
        const padBottom = 34;
        const x0 = padLeft;
        const x1 = w - padRight;
        const historyEndX = x0 + (x1 - x0) * 0.82;
        const plotBottom = h - padBottom;
        const plotHeight = plotBottom - padTop;
        const y = (v: number) => plotBottom - ((v - min) / span) * plotHeight;
        const pointX = (index: number) =>
            x0 + (index / Math.max(1, history.length - 1)) * (historyEndX - x0);
        const formatAxisPrice = (value: number) =>
            `$${value.toLocaleString('es-AR', {
                maximumFractionDigits: value >= 100 ? 0 : 2,
            })}`;

        function render(t: number) {
            if (!ctx) return;
            ctx.clearRect(0, 0, w, h);

            ctx.strokeStyle = line;
            ctx.lineWidth = 1;
            ctx.font =
                '10px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
            ctx.fillStyle = labelColor;
            for (let g = 0; g < 4; g++) {
                const ratio = g / 3;
                const gy = padTop + ratio * plotHeight;
                ctx.beginPath();
                ctx.moveTo(x0, gy);
                ctx.lineTo(x1, gy);
                ctx.stroke();
                const price = max - ratio * span;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(formatAxisPrice(price), x0 - 10, gy);
            }

            if (history.length > 0) {
                const grad = ctx.createLinearGradient(0, 0, 0, h);
                grad.addColorStop(0, historyColor + '1f');
                grad.addColorStop(1, historyColor + '00');
                ctx.beginPath();
                history.forEach((point, index) => {
                    const px = pointX(index);
                    const py = y(point.close);
                    if (index === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });
                ctx.lineTo(historyEndX, plotBottom);
                ctx.lineTo(x0, plotBottom);
                ctx.closePath();
                ctx.fillStyle = grad;
                ctx.fill();

                ctx.beginPath();
                history.forEach((point, index) => {
                    const px = pointX(index);
                    const py = y(point.close);
                    if (index === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });
                ctx.strokeStyle = historyColor;
                ctx.lineWidth = 1.8;
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.moveTo(historyEndX, padTop);
            ctx.lineTo(historyEndX, plotBottom);
            ctx.strokeStyle = line;
            ctx.setLineDash([3, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            if (lastClose != null && predictedClose != null) {
                const curX = historyEndX + (x1 - historyEndX) * t;
                const curY =
                    y(lastClose) + (y(predictedClose) - y(lastClose)) * t;

                ctx.beginPath();
                ctx.moveTo(historyEndX, y(lastClose));
                ctx.lineTo(curX, curY);
                ctx.strokeStyle = projectionColor;
                ctx.lineWidth = 2.2;
                ctx.setLineDash([6, 5]);
                ctx.lineCap = 'round';
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.beginPath();
                ctx.arc(historyEndX, y(lastClose), 4, 0, Math.PI * 2);
                ctx.fillStyle = projectionColor;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(curX, curY, 4, 0, Math.PI * 2);
                ctx.fillStyle = projectionColor;
                ctx.fill();
                if (t >= 1) {
                    ctx.beginPath();
                    ctx.arc(curX, curY, 7, 0, Math.PI * 2);
                    ctx.strokeStyle = projectionColor;
                    ctx.lineWidth = 1.2;
                    ctx.stroke();
                }
            }

            ctx.font =
                '11px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
            ctx.fillStyle = labelColor;
            ctx.textBaseline = 'alphabetic';
            const dateIndexes = history.length
                ? [0, 1 / 3, 2 / 3].map((ratio) =>
                      Math.round(ratio * (history.length - 1)),
                  )
                : [];
            dateIndexes.forEach((index, labelIndex) => {
                const date = new Date(history[index].ts).toLocaleDateString(
                    'es-AR',
                    { month: 'short', year: '2-digit' },
                );
                ctx.textAlign =
                    labelIndex === 0
                        ? 'left'
                        : labelIndex === dateIndexes.length - 1
                          ? 'right'
                          : 'center';
                ctx.fillText(date, pointX(index), h - 5);
            });
            ctx.textAlign = 'center';
            ctx.fillText('hoy', historyEndX, h - 5);
            ctx.textAlign = 'right';
            if (predictedClose != null) {
                ctx.fillText(
                    horizonDays ? `+${horizonDays} ruedas` : 'proyección',
                    x1 + 12,
                    h - 5,
                );
            }
        }

        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        if (reduceMotion) {
            render(1);
            return;
        }
        const duration = 650;
        const start = performance.now();
        let raf: number;
        function frame(now: number) {
            const t = Math.min(1, (now - start) / duration);
            render(1 - Math.pow(1 - t, 3));
            if (t < 1) raf = requestAnimationFrame(frame);
        }
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, [history, lastClose, predictedClose, horizonDays, signal]);

    return <canvas ref={canvasRef} width={560} height={170} />;
}

function rowClass(signal: string | null | undefined): string {
    switch (signal) {
        case 'alza':
            return 'is-up';
        case 'baja':
            return 'is-down';
        default:
            return 'is-flat';
    }
}

interface ModelComparisonTableProps {
    ticker: string;
}

function ModelComparisonTable({ ticker }: ModelComparisonTableProps) {
    const [compare, setCompare] = useState<CompareTrendsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setCompare(null);
            setError(null);
            try {
                const res = await getShareTrendCompareEndpoint(ticker);
                if (!cancelled) setCompare(res);
            } catch {
                if (!cancelled)
                    setError(
                        'No se pudo comparar los modelos para este ticker.',
                    );
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [ticker]);

    if (error) {
        return (
            <div className="panel mt-3">
                <h3>Comparación de modelos</h3>
                <p className="mb-0" style={{ color: 'var(--ink-3)' }}>
                    {error}
                </p>
            </div>
        );
    }

    if (!compare) {
        return (
            <div className="panel mt-3">
                <h3>Comparación de modelos</h3>
                <p className="mb-0" style={{ color: 'var(--ink-3)' }}>
                    Cargando…
                </p>
            </div>
        );
    }

    const entries = Object.entries(compare.predictions) as [
        string,
        ModelPrediction,
    ][];

    return (
        <div className="panel mt-3">
            <h3>Comparación de modelos</h3>
            <table className="watchlist">
                <thead>
                    <tr>
                        <th>Modelo</th>
                        <th>
                            Señal
                            <InfoTip label="Señal">
                                Alza o baja si el modelo proyecta un retorno
                                mayor a ±1% al horizonte indicado; si no,
                                neutral.
                            </InfoTip>
                        </th>
                        <th>
                            RSI
                            <InfoTip label="RSI (14)">
                                Índice de fuerza relativa a 14 ruedas. Arriba de
                                70 sugiere sobrecompra, abajo de 30 sobreventa.
                            </InfoTip>
                        </th>
                        <th>
                            Condición
                            <InfoTip label="Condición">
                                Lectura del RSI: sobrecompra (≥70), sobreventa
                                (≤30) o neutral.
                            </InfoTip>
                        </th>
                        <th>Último cierre</th>
                        <th>Proyectado</th>
                        <th>Δ%</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map(([name, pred]) => {
                        const delta =
                            pred.available &&
                            pred.last_close != null &&
                            pred.predicted_close != null
                                ? ((pred.predicted_close - pred.last_close) /
                                      pred.last_close) *
                                  100
                                : null;
                        return (
                            <tr
                                key={name}
                                className={
                                    pred.available
                                        ? rowClass(pred.signal)
                                        : 'is-flat'
                                }
                                style={{ cursor: 'default' }}
                            >
                                <td className="t-ticker">{name}</td>
                                {pred.available ? (
                                    <>
                                        <td>
                                            <span
                                                className={`pill ${pillClass(pred.signal)}`}
                                            >
                                                {pred.signal ?? 'neutral'}
                                            </span>
                                        </td>
                                        <td className="num">
                                            {pred.rsi ?? '—'}
                                        </td>
                                        <td>{pred.condition ?? '—'}</td>
                                        <td className="num">
                                            {formatMoney(pred.last_close)}
                                        </td>
                                        <td className="num">
                                            {formatMoney(pred.predicted_close)}
                                        </td>
                                        <td
                                            className="num"
                                            style={{
                                                color:
                                                    delta == null
                                                        ? undefined
                                                        : delta >= 0
                                                          ? 'var(--up)'
                                                          : 'var(--down)',
                                            }}
                                        >
                                            {delta == null
                                                ? '—'
                                                : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`}
                                        </td>
                                    </>
                                ) : (
                                    <td
                                        colSpan={6}
                                        style={{ color: 'var(--ink-3)' }}
                                    >
                                        {pred.reason ?? 'No disponible'}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function TickerDetail({ row, onBack }: TickerDetailProps) {
    const [historyResult, setHistoryResult] = useState<{
        ticker: string;
        prices: HistoricalPricePoint[];
        error: boolean;
    } | null>(null);
    const [range, setRange] = useState<'1M' | '3M' | '6M' | '1A' | 'TODO'>(
        '1A',
    );
    const [historyAttempt, setHistoryAttempt] = useState(0);
    const trend = row.trend;
    const historyLoaded = historyResult?.ticker === row.ticker;
    const history = historyLoaded ? historyResult.prices : [];
    const historyError = historyLoaded && historyResult.error;
    const available = trend?.available ?? false;
    const delta =
        available && trend?.last_close && trend.predicted_close != null
            ? ((trend.predicted_close - trend.last_close) / trend.last_close) *
              100
            : null;

    useEffect(() => {
        let cancelled = false;
        getShareHistoryEndpoint(row.ticker)
            .then((response) => {
                if (!cancelled) {
                    setHistoryResult({
                        ticker: row.ticker,
                        prices: response.prices,
                        error: false,
                    });
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setHistoryResult({
                        ticker: row.ticker,
                        prices: [],
                        error: true,
                    });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [row.ticker, historyAttempt]);

    const rangeDays = { '1M': 31, '3M': 93, '6M': 186, '1A': 366 } as const;
    const filteredHistory =
        range === 'TODO' || history.length === 0
            ? history
            : history.filter(
                  (point) =>
                      point.ts >=
                      history[history.length - 1].ts -
                          rangeDays[range] * 24 * 60 * 60 * 1000,
              );

    return (
        <div>
            <button className="back-link" onClick={onBack}>
                ← Volver a mi cartera
            </button>

            <div className="detail-head">
                <div>
                    <div className="detail-title">
                        <h1 className="mb-0">{row.ticker}</h1>
                        {available ? (
                            <span
                                className={`pill ${pillClass(trend?.signal)}`}
                            >
                                {trend?.signal ?? 'neutral'}
                            </span>
                        ) : (
                            <span className="pill pill-neutral">Sin datos</span>
                        )}
                    </div>
                    <p className="detail-sub mb-0">
                        {row.quantity} nominales
                        {available && trend?.horizon_days
                            ? ` · horizonte ${trend.horizon_days} ruedas`
                            : ''}
                        {available && trend?.as_of
                            ? ` · actualizado ${trend.as_of}`
                            : ''}
                    </p>
                </div>
                <div className="detail-price">
                    <span className="p num">
                        {formatMoney(trend?.last_close)}
                    </span>
                    {delta != null && (
                        <span
                            className="d num"
                            style={{
                                color: delta >= 0 ? 'var(--up)' : 'var(--down)',
                            }}
                        >
                            → {formatMoney(trend?.predicted_close)} (
                            {delta >= 0 ? '+' : ''}
                            {delta.toFixed(1)}%)
                        </span>
                    )}
                </div>
            </div>

            {!historyLoaded ? (
                <div className="panel">
                    <h3 className="mb-0">Histórico → precio proyectado</h3>
                    <p className="mb-0 mt-3" style={{ color: 'var(--ink-3)' }}>
                        Cargando histórico…
                    </p>
                </div>
            ) : history.length > 0 ||
              (available && trend?.last_close != null) ? (
                <div className="detail-grid">
                    <div className="panel chart-panel">
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '12px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <h3 className="mb-0">
                                Histórico → precio proyectado
                            </h3>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {(
                                    ['1M', '3M', '6M', '1A', 'TODO'] as const
                                ).map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        className={
                                            range === option
                                                ? 'pill pill-neutral'
                                                : 'back-link'
                                        }
                                        onClick={() => setRange(option)}
                                        style={{ margin: 0 }}
                                    >
                                        {option === 'TODO' ? 'Todo' : option}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <ProjectionChart
                            history={filteredHistory}
                            lastClose={trend?.last_close ?? null}
                            predictedClose={trend?.predicted_close ?? null}
                            horizonDays={trend?.horizon_days ?? null}
                            signal={trend?.signal}
                        />
                        {historyError && (
                            <p style={{ color: 'var(--ink-3)', margin: 0 }}>
                                No se pudo cargar el histórico; se muestra sólo
                                la proyección.{' '}
                                <button
                                    type="button"
                                    className="back-link"
                                    style={{ margin: 0 }}
                                    onClick={() => {
                                        setHistoryResult(null);
                                        setHistoryAttempt(
                                            (attempt) => attempt + 1,
                                        );
                                    }}
                                >
                                    Reintentar
                                </button>
                            </p>
                        )}
                        {available && (
                            <div className="indicator-row mt-3">
                                <div className="indicator">
                                    <span>
                                        RSI (14)
                                        <InfoTip label="RSI (14)">
                                            Índice de fuerza relativa a 14
                                            ruedas. Arriba de 70 sugiere
                                            sobrecompra, abajo de 30 sobreventa.
                                        </InfoTip>
                                    </span>
                                    <b className="num">{trend?.rsi ?? '—'}</b>
                                </div>
                                <div className="indicator">
                                    <span>
                                        Condición
                                        <InfoTip label="Condición">
                                            Lectura del RSI: sobrecompra (≥70),
                                            sobreventa (≤30) o neutral.
                                        </InfoTip>
                                    </span>
                                    <b>{trend?.condition ?? '—'}</b>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="panel side-panel">
                        <div>
                            <h3 className="mb-2">
                                {available ? 'Predicción' : 'Histórico'}
                            </h3>
                            {available ? (
                                <>
                                    <div className="kv">
                                        <span>Modelo</span>
                                        <span>{trend?.model ?? '—'}</span>
                                    </div>
                                    <div className="kv">
                                        <span>Versión</span>
                                        <span style={{ fontSize: '11px' }}>
                                            {trend?.model_version ?? '—'}
                                        </span>
                                    </div>
                                    <div className="kv">
                                        <span>Último cierre</span>
                                        <span>
                                            {formatMoney(trend?.last_close)}
                                        </span>
                                    </div>
                                    <div className="kv">
                                        <span>Precio proyectado</span>
                                        <span>
                                            {formatMoney(
                                                trend?.predicted_close,
                                            )}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <p style={{ color: 'var(--ink-3)' }}>
                                    Hay precios históricos, pero todavía no hay
                                    un modelo entrenado para este ticker.
                                </p>
                            )}
                        </div>
                        <div className="roadmap-box">
                            La línea continua muestra los cierres históricos.
                            {available && (
                                <>
                                    {' '}
                                    La línea punteada muestra la proyección del
                                    modelo {trend?.model ?? 'lstm'}.
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="panel">
                    <p className="mb-0" style={{ color: 'var(--ink-3)' }}>
                        {trend?.reason ?? 'Todavía sin conexión a api-ml.'}
                    </p>
                </div>
            )}

            <ModelComparisonTable ticker={row.ticker} />
        </div>
    );
}

export default TickerDetail;
