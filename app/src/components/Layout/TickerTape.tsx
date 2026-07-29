import { useEffect, useState } from 'react';
import { getAllSharesEndpoint } from '../../api/shares/getAllSharesEndpoint';

export interface TapeItem {
    ticker: string;
    lastClose?: number | null;
    deltaPct?: number | null;
    signal?: string | null;
}

interface TickerTapeProps {
    // Si se pasan items (con precio/variación reales, ej. desde la cartera
    // del usuario), se muestran esos en vez de salir a buscar la lista
    // publica de tickers.
    items?: TapeItem[];
}

function deltaColor(deltaPct: number | null | undefined): string {
    if (deltaPct == null) return '#9fb3ad';
    return deltaPct >= 0 ? '#3fe0a0' : '#ff8a73';
}

function TickerTape({ items }: TickerTapeProps) {
    const [publicTickers, setPublicTickers] = useState<string[]>([]);

    useEffect(() => {
        if (items) return;
        getAllSharesEndpoint()
            .then((res) => setPublicTickers(res.shares.map((s) => s.ticker)))
            .catch(() => setPublicTickers([]));
    }, [items]);

    const list: TapeItem[] =
        items ?? publicTickers.map((ticker) => ({ ticker }));

    if (list.length === 0) return null;

    // Duplicado para que el loop de la animación sea continuo.
    const doubled = [...list, ...list];
    // La distancia a recorrer crece con la cantidad de tickers, así que la
    // duración también tiene que crecer o la cinta se acelera sin control.
    const durationSeconds = Math.max(18, list.length * 2.2);

    return (
        <div className="marquee-wrap mb-4">
            <div
                className="marquee-track"
                style={{ animationDuration: `${durationSeconds}s` }}
            >
                <span className="marquee-label">
                    <span className="livedot" />
                    S&amp;P Merval
                </span>
                {doubled.map((item, i) => (
                    <span
                        className="marquee-item mono"
                        key={`${item.ticker}-${i}`}
                    >
                        <b>{item.ticker}</b>
                        {item.lastClose != null && (
                            <span style={{ marginLeft: 6 }}>
                                $
                                {item.lastClose.toLocaleString('es-AR', {
                                    maximumFractionDigits: 0,
                                })}
                            </span>
                        )}
                        {item.deltaPct != null && (
                            <span
                                style={{
                                    marginLeft: 6,
                                    color: deltaColor(item.deltaPct),
                                }}
                            >
                                {item.deltaPct >= 0 ? '▲' : '▼'}{' '}
                                {Math.abs(item.deltaPct).toFixed(1)}%
                            </span>
                        )}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default TickerTape;
