import { ArcElement, Chart, Legend, PieController, Tooltip } from 'chart.js';

Chart.register(ArcElement, Legend, PieController, Tooltip);

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

export function buildPortfolioChart(
    canvas: HTMLCanvasElement,
    positions: PortfolioChartPosition[],
) {
    return new Chart(canvas, {
        type: 'pie',
        data: {
            labels: positions.map(({ ticker }) => ticker),
            datasets: [
                {
                    data: chartValues(positions),
                    backgroundColor: [
                        '#0f766e',
                        '#2563eb',
                        '#d97706',
                        '#be123c',
                        '#7c3aed',
                        '#15803d',
                    ],
                    borderWidth: 2,
                    borderColor: 'transparent',
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
            },
        },
    });
}
