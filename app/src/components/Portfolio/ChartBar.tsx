import type { Ref } from 'react';

interface ChartBarProps {
    ref: Ref<HTMLCanvasElement>;
    tickers: string[];
}

function ChartBar({ ref, tickers }: ChartBarProps) {
    return (
        <div className="panel portfolio-chart-panel mb-4">
            <h2 className="portfolio-chart-title">
                Distribución de mi cartera
            </h2>
            <div className="portfolio-chart-wrap">
                <canvas
                    ref={ref}
                    role="img"
                    aria-label={`Distribución de acciones de mi cartera por cantidad: ${tickers.join(', ')}`}
                />
            </div>
        </div>
    );
}

export default ChartBar;
