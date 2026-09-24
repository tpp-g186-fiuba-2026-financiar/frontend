import { ArcElement, Chart, Legend, PieController, Tooltip } from 'chart.js';

Chart.register(ArcElement, Legend, PieController, Tooltip);

export interface PortfolioChartPosition {
    ticker: string;
    quantity: number;
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
                    data: positions.map(({ quantity }) => quantity),
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