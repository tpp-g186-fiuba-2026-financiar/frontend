import { useEffect, useState } from 'react';
import { getPortfolioRecomendacionEndpoint } from '../../api/userShares/getPortfolioRecomendacionEndpoint';

interface PesoRow {
    ticker: string;
    peso: number;
}

interface ApiErrorResponse {
    message?: string;
}

function extractErrorMessage(err: unknown): string {
    const maybeAxiosError = err as {
        response?: { data?: ApiErrorResponse };
    };
    return (
        maybeAxiosError.response?.data?.message ??
        'No se pudo calcular la estimación. Intentá de nuevo en unos minutos.'
    );
}

function sortedRows(pesos: Record<string, number>): PesoRow[] {
    return Object.entries(pesos)
        .map(([ticker, peso]) => ({ ticker, peso }))
        .sort((a, b) => b.peso - a.peso);
}

interface EstimacionBlackLittermanProps {
    onBack: () => void;
}

function EstimacionBlackLitterman({ onBack }: EstimacionBlackLittermanProps) {
    const [rows, setRows] = useState<PesoRow[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await getPortfolioRecomendacionEndpoint();
                if (!cancelled) {
                    setRows(sortedRows(res.pesos_recomendados));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(extractErrorMessage(err));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="watchlist-panel mb-4">
            <div className="toolbar">
                <div>
                    <h2 className="mb-0">Estimación Black-Litterman</h2>
                    {!loading && !error && rows && (
                        <p className="summary mb-0">
                            Distribución sugerida sobre {rows.length}{' '}
                            {rows.length === 1 ? 'activo' : 'activos'}
                        </p>
                    )}
                </div>
                <button className="btn btn-outline-light" onClick={onBack}>
                    ← Volver a mi cartera
                </button>
            </div>

            {loading && <p className="px-3">Calculando estimación...</p>}

            {!loading && error && (
                <div className="px-3">
                    <p className="text-danger mb-0">{error}</p>
                </div>
            )}

            {!loading && !error && rows && rows.length === 0 && (
                <div className="px-3">
                    <p className="mb-0">No hay recomendación disponible.</p>
                </div>
            )}

            {!loading && !error && rows && rows.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table className="watchlist">
                        <thead>
                            <tr>
                                <th>Ticker</th>
                                <th>Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.ticker}>
                                    <td className="t-ticker">{row.ticker}</td>
                                    <td className="rsi-cell">
                                        <span className="rsi-bar">
                                            <i
                                                style={{
                                                    width: `${(row.peso * 100).toFixed(1)}%`,
                                                }}
                                            />
                                        </span>
                                        <span className="num">
                                            {(row.peso * 100).toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default EstimacionBlackLitterman;