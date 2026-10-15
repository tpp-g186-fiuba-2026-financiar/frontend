import {
    ArcElement,
    Chart,
    DoughnutController,
    Legend,
    Tooltip,
    type Plugin,
} from 'chart.js';

Chart.register(ArcElement, Legend, DoughnutController, Tooltip);

export interface PortfolioChartPosition {
    ticker: string;
    quantity: number;
    currentPrice?: number | null;
}

// Pondera por valor de mercado (cantidad x precio actual). Si alguna
// tenencia no tiene precio, no se pueden mezclar unidades: cae a cantidad.
function chartValues(positions: PortfolioChartPosition[]): number[] {
    const allPriced = positions.every(
        ({ currentPrice }) => currentPrice != null,
    );
    return positions.map(({ quantity, currentPrice }) =>
        allPriced ? quantity * (currentPrice as number) : quantity,
    );
}

const PALETTE = [
    '#0f766e',
    '#2563eb',
    '#d97706',
    '#be123c',
    '#7c3aed',
    '#15803d',
    '#0891b2',
    '#c2410c',
];

// Texto al centro del donut: el total (en $ si hay precios) y una leyenda.
function centerText(positions: PortfolioChartPosition[]): Plugin<'doughnut'> {
    const allPriced = positions.every(
        ({ currentPrice }) => currentPrice != null,
    );
    const total = chartValues(positions).reduce((a, b) => a + b, 0);
    const main = allPriced
        ? `$${Math.round(total).toLocaleString('es-AR')}`
        : `${positions.length}`;
    const sub = allPriced
        ? 'valor de la cartera'
        : positions.length === 1
          ? 'acción'
          : 'acciones';
    return {
        id: 'centerText',
        afterDraw(chart) {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            const style = getComputedStyle(document.documentElement);
            const ink = style.getPropertyValue('--ink').trim() || '#e9f2ef';
            const muted = style.getPropertyValue('--ink-3').trim() || '#66807b';
            const cx = (chartArea.left + chartArea.right) / 2;
            const cy = (chartArea.top + chartArea.bottom) / 2;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = ink;
            ctx.font = '600 18px ui-monospace, "SF Mono", Menlo, monospace';
            ctx.fillText(main, cx, cy - 8);
            ctx.fillStyle = muted;
            ctx.font = '11px system-ui, sans-serif';
            ctx.fillText(sub, cx, cy + 12);
            ctx.restore();
        },
    };
}

export function buildPortfolioChart(
    canvas: HTMLCanvasElement,
    positions: PortfolioChartPosition[],
) {
    const reduceMotion = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
    ).matches;
    const style = getComputedStyle(document.documentElement);
    const legendColor = style.getPropertyValue('--ink-2').trim() || '#9baea9';
    return new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: positions.map(({ ticker }) => ticker),
            datasets: [
                {
                    data: chartValues(positions),
                    backgroundColor: positions.map(
                        (_, i) => PALETTE[i % PALETTE.length],
                    ),
                    borderWidth: 3,
                    borderColor: 'transparent',
                    borderRadius: 6,
                    hoverOffset: 10,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '66%',
            animation: reduceMotion
                ? false
                : { animateRotate: true, animateScale: true, duration: 900 },
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: legendColor, usePointStyle: true },
                },
            },
        },
        plugins: [centerText(positions)],
    });
}
