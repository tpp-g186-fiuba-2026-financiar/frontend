import { useEffect, useState } from 'react';
import { getAllSharesEndpoint } from '../../api/shares/getAllSharesEndpoint';

function TickerTape() {
    const [tickers, setTickers] = useState<string[]>([]);

    useEffect(() => {
        getAllSharesEndpoint()
            .then((res) => setTickers(res.shares.map((s) => s.ticker)))
            .catch(() => setTickers([]));
    }, []);

    if (tickers.length === 0) return null;

    // Duplicado para que el loop de la animación sea continuo.
    const items = [...tickers, ...tickers];

    return (
        <div className="marquee-wrap mb-4">
            <div className="marquee-track">
                <span className="marquee-label">
                    <span className="livedot" />
                    S&amp;P Merval
                </span>
                {items.map((ticker, i) => (
                    <span className="marquee-item mono" key={`${ticker}-${i}`}>
                        {ticker}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default TickerTape;
