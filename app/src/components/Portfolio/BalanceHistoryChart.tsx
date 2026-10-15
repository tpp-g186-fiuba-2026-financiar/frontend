import { useEffect, useMemo, useRef, useState } from 'react';
import {
    getUserSharesBalanceHistoryEndpoint,
    type DailyBalancePoint,
} from '../../api/userShares/getUserSharesBalanceHistoryEndpoint';
import {
    BALANCE_RANGES,
    onlyTradingDays,
    rangeProfitChange,
    sliceRange,
    type BalanceRange,
} from '../../utils/balanceHistory';

interface BalanceHistoryChartProps {
    // Cambia cada vez que se recarga la cartera (p. ej. despues de "Editar mi
    // cartera") para volver a pedir el historial.
    reloadKey?: number;
}

function formatMoney(value: number): string {
    return `$${value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

function formatSignedMoney(value: number): string {
    return `${value >= 0 ? '+' : '−'}${formatMoney(Math.abs(value))}`;
}

function formatAxisDate(date: string): string {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year.slice(2)}`;
}

function HistoryCanvas({ series }: { series: DailyBalancePoint[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || series.length < 2) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const styles = getComputedStyle(document.documentElement);
        const valueColor = styles.getPropertyValue('--accent').trim();
        const costColor = styles.getPropertyValue('--ink-3').trim();
        const gridColor = styles.getPropertyValue('--line').trim();
        const labelColor = styles.getPropertyValue('--ink-3').trim();

        const values = series.flatMap((point) => [
            point.total_current_value,
            point.total_cost_basis,
        ]);
        const rawMin = Math.min(...values);
        const rawMax = Math.max(...values);
        const rawSpan = rawMax - rawMin || rawMax || 1;
        const min = Math.max(0, rawMin - rawSpan * 0.08);
        const max = rawMax + rawSpan * 0.08;
        const left = 76;
        const right = width - 18;
        const top = 14;
        const bottom = height - 30;
        const x = (index: number) =>
            left + (index / (series.length - 1)) * (right - left);
        const y = (value: number) =>
            bottom - ((value - min) / (max - min)) * (bottom - top);

        ctx.clearRect(0, 0, width, height);
        ctx.font = '10px ui-monospace, monospace';
        ctx.lineWidth = 1;
        for (let index = 0; index < 4; index += 1) {
            const ratio = index / 3;
            const lineY = top + ratio * (bottom - top);
            ctx.beginPath();
            ctx.moveTo(left, lineY);
            ctx.lineTo(right, lineY);
            ctx.strokeStyle = gridColor;
            ctx.stroke();
            ctx.fillStyle = labelColor;
            ctx.textAlign = 'right';
            ctx.fillText(
                formatMoney(max - ratio * (max - min)),
                left - 8,
                lineY + 3,
            );
        }

        // Area bajo el valor de la cartera
        ctx.beginPath();
        series.forEach((point, index) => {
            const px = x(index);
            const py = y(point.total_current_value);
            if (index === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.lineTo(x(series.length - 1), bottom);
        ctx.lineTo(x(0), bottom);
        ctx.closePath();
        ctx.fillStyle = `${valueColor}1f`;
        ctx.fill();

        const drawLine = (
            key: 'total_current_value' | 'total_cost_basis',
            color: string,
            dash: number[],
        ) => {
            ctx.beginPath();
            series.forEach((point, index) => {
                const px = x(index);
                const py = y(point[key]);
                if (index === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.setLineDash(dash);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.stroke();
            ctx.setLineDash([]);
        };
        drawLine('total_cost_basis', costColor, [5, 4]);
        drawLine('total_current_value', valueColor, []);

        ctx.fillStyle = labelColor;
        ctx.textAlign = 'left';
        ctx.fillText(formatAxisDate(series[0].date), left, height - 7);
        ctx.textAlign = 'right';
        ctx.fillText(
            formatAxisDate(series[series.length - 1].date),
            right,
            height - 7,
        );
    }, [series]);

    const last = series[series.length - 1];
    return (
        <canvas
            className="balance-history-chart"
            ref={canvasRef}
            role="img"
            aria-label={`Evolución del valor de mi cartera entre ${series[0].date} y ${last.date}: de ${formatMoney(series[0].total_current_value)} a ${formatMoney(last.total_current_value)}`}
        />
    );
}

function BalanceHistoryChart({ reloadKey = 0 }: BalanceHistoryChartProps) {
    const [history, setHistory] = useState<DailyBalancePoint[] | null>(null);
    const [error, setError] = useState(false);
    const [range, setRange] = useState<BalanceRange>('3M');

    useEffect(() => {
        let cancelled = false;
        getUserSharesBalanceHistoryEndpoint()
            .then((points) => {
                if (cancelled) return;
                setHistory(onlyTradingDays(points));
                setError(false);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            });
        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    const series = useMemo(
        () => (history ? sliceRange(history, range) : []),
        [history, range],
    );
    const profitChange = rangeProfitChange(series);

    let body;
    if (error) {
        body = (
            <p className="mb-0" style={{ color: 'var(--ink-3)' }}>
                No se pudo cargar la evolución de tu cartera.
            </p>
        );
    } else if (history === null) {
        body = (
            <p className="mb-0" style={{ color: 'var(--ink-3)' }}>
                Cargando evolución…
            </p>
        );
    } else if (series.length < 2) {
        body = (
            <p className="mb-0" style={{ color: 'var(--ink-3)' }}>
                Todavía no hay suficiente historial para graficar.
            </p>
        );
    } else {
        body = (
            <>
                <div className="results-chart-title flex-wrap">
                    <span className="results-legend balance-legend-value">
                        Valor de la cartera
                    </span>
                    <span className="results-legend balance-legend-cost">
                        Monto invertido
                    </span>
                    {profitChange !== null && (
                        <span className="ms-auto">
                            Resultado del período:{' '}
                            <b
                                style={{
                                    color:
                                        profitChange >= 0
                                            ? 'var(--up)'
                                            : 'var(--down)',
                                }}
                            >
                                {formatSignedMoney(profitChange)}
                            </b>
                        </span>
                    )}
                </div>
                <HistoryCanvas series={series} />
            </>
        );
    }

    return (
        <div className="panel mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2 gap-2 flex-wrap">
                <h2 className="portfolio-chart-title mb-0">
                    Evolución de mi cartera
                </h2>
                {history !== null && !error && (
                    <div
                        className="btn-group btn-group-sm"
                        role="group"
                        aria-label="Rango del gráfico"
                    >
                        {BALANCE_RANGES.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`btn ${range === option.value ? 'btn-primary' : 'btn-outline-theme'}`}
                                aria-pressed={range === option.value}
                                onClick={() => setRange(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {body}
        </div>
    );
}

export default BalanceHistoryChart;
