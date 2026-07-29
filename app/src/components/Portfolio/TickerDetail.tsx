import { useEffect, useRef } from 'react';
import type { ShareTrend } from '../../api/userShares/getUserSharesTrendsEndpoint';

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
    lastClose: number;
    predictedClose: number;
    horizonDays: number | null;
    signal: string | null | undefined;
}

function ProjectionChart({
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
        const color = cs.getPropertyValue(signalColorVar(signal)).trim();
        const line = cs.getPropertyValue('--line').trim();

        const min = Math.min(lastClose, predictedClose);
        const max = Math.max(lastClose, predictedClose);
        const span = max - min || 1;
        const padX = 46;
        const padY = 24;
        const x0 = padX;
        const x1 = w - padX;
        const y = (v: number) => h - padY - ((v - min) / span) * (h - padY * 2);

        function render(t: number) {
            if (!ctx) return;
            ctx.clearRect(0, 0, w, h);

            ctx.strokeStyle = line;
            ctx.lineWidth = 1;
            for (let g = 0; g < 3; g++) {
                const gy = padY + (g / 2) * (h - padY * 2);
                ctx.beginPath();
                ctx.moveTo(0, gy);
                ctx.lineTo(w, gy);
                ctx.stroke();
            }

            const curX = x0 + (x1 - x0) * t;
            const curY = y(lastClose) + (y(predictedClose) - y(lastClose)) * t;

            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, color + '33');
            grad.addColorStop(1, color + '00');
            ctx.beginPath();
            ctx.moveTo(x0, y(lastClose));
            ctx.lineTo(curX, curY);
            ctx.lineTo(curX, h);
            ctx.lineTo(x0, h);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(x0, y(lastClose));
            ctx.lineTo(curX, curY);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.2;
            ctx.lineCap = 'round';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x0, y(lastClose), 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(curX, curY, 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            if (t >= 1) {
                ctx.beginPath();
                ctx.arc(curX, curY, 7, 0, Math.PI * 2);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.2;
                ctx.stroke();
            }

            ctx.font =
                '11px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
            ctx.fillStyle = cs.getPropertyValue('--ink-3').trim();
            ctx.textAlign = 'left';
            ctx.fillText('hoy', x0 - 12, h - 4);
            ctx.textAlign = 'right';
            ctx.fillText(
                horizonDays ? `+${horizonDays} ruedas` : 'proyección',
                x1 + 12,
                h - 4,
            );
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
    }, [lastClose, predictedClose, horizonDays, signal]);

    return <canvas ref={canvasRef} width={560} height={170} />;
}

function TickerDetail({ row, onBack }: TickerDetailProps) {
    const trend = row.trend;
    const available = trend?.available ?? false;
    const delta =
        available && trend?.last_close && trend.predicted_close != null
            ? ((trend.predicted_close - trend.last_close) / trend.last_close) *
              100
            : null;

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

            {available &&
            trend?.last_close != null &&
            trend.predicted_close != null ? (
                <div className="detail-grid">
                    <div className="panel chart-panel">
                        <h3>Último cierre → precio proyectado</h3>
                        <ProjectionChart
                            lastClose={trend.last_close}
                            predictedClose={trend.predicted_close}
                            horizonDays={trend.horizon_days}
                            signal={trend.signal}
                        />
                        <div className="indicator-row mt-3">
                            <div className="indicator">
                                <span>RSI (14)</span>
                                <b className="num">{trend.rsi ?? '—'}</b>
                            </div>
                            <div className="indicator">
                                <span>Condición</span>
                                <b>{trend.condition ?? '—'}</b>
                            </div>
                        </div>
                    </div>
                    <div className="panel side-panel">
                        <div>
                            <h3 className="mb-2">Predicción</h3>
                            <div className="kv">
                                <span>Modelo</span>
                                <span>{trend.model ?? '—'}</span>
                            </div>
                            <div className="kv">
                                <span>Versión</span>
                                <span style={{ fontSize: '11px' }}>
                                    {trend.model_version ?? '—'}
                                </span>
                            </div>
                            <div className="kv">
                                <span>Último cierre</span>
                                <span>{formatMoney(trend.last_close)}</span>
                            </div>
                            <div className="kv">
                                <span>Precio proyectado</span>
                                <span>
                                    {formatMoney(trend.predicted_close)}
                                </span>
                            </div>
                        </div>
                        <div className="roadmap-box">
                            <b>Todavía no está conectado:</b> este gráfico marca
                            hoy y la proyección del modelo{' '}
                            {trend.model ?? 'lstm'} — no es un histórico de
                            precios (todavía no hay un endpoint que lo exponga).
                            Tampoco compara los otros 3 modelos que api-ml ya
                            corre en paralelo (xgboost, transformer, arima);
                            falta ese endpoint en backend-website.
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
        </div>
    );
}

export default TickerDetail;
