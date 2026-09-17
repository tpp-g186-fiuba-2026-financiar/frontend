import MiniProjection from './MiniProjection';
import { type ShareTrend } from '../../api/userShares/getUserSharesTrendsEndpoint';
interface PortfolioRow {
    ticker: string;
    quantity: number;
    trend: ShareTrend | null;
    entryPrice: number | null;
    currentPrice: number | null;
    pnlAmount: number | null;
    pnlPercentage: number | null;
}

interface SharesTableBodyProps {
    rows: PortfolioRow[];
    setSelectedTicker: (ticker: string) => void;
}

function SharesTableBody({ rows, setSelectedTicker }: SharesTableBodyProps) {
    return (
        <tbody>
            {rows.map((row) => {
                const available = row.trend?.available ?? false;
                return (
                    <tr
                        key={row.ticker}
                        className={
                            available ? rowStateClass(row.trend?.signal) : ''
                        }
                        onClick={() => setSelectedTicker(row.ticker)}
                    >
                        <td className="t-ticker">{row.ticker}</td>
                        <td>
                            {available &&
                                row.trend?.last_close != null &&
                                row.trend?.predicted_close != null && (
                                    <MiniProjection
                                        lastClose={row.trend.last_close}
                                        predictedClose={
                                            row.trend.predicted_close
                                        }
                                        signal={row.trend.signal}
                                    />
                                )}
                        </td>
                        <td className="t-qty">{row.quantity}</td>
                        <td className="t-pnl">
                            {row.pnlAmount != null ? (
                                <span
                                    className="num"
                                    style={{
                                        color:
                                            row.pnlAmount >= 0
                                                ? 'var(--up)'
                                                : 'var(--down)',
                                    }}
                                >
                                    {formatPnl(
                                        row.pnlAmount,
                                        row.pnlPercentage,
                                    )}
                                </span>
                            ) : (
                                <span
                                    className="dash"
                                    title="Cargá el precio de entrada en 'Editar mi cartera' para ver el P&L"
                                >
                                    —
                                </span>
                            )}
                        </td>
                        <td className="t-price">
                            {available && row.trend?.last_close != null ? (
                                <span className="num">
                                    $
                                    {row.trend.last_close.toLocaleString(
                                        'es-AR',
                                    )}
                                </span>
                            ) : (
                                <span className="dash">—</span>
                            )}
                        </td>
                        <td className="rsi-cell">
                            {available && row.trend?.rsi != null ? (
                                <>
                                    <span className="rsi-bar">
                                        <i
                                            style={{
                                                width: `${row.trend.rsi}%`,
                                            }}
                                        />
                                    </span>
                                    <span className="num">
                                        {row.trend.rsi.toFixed(0)}
                                    </span>
                                </>
                            ) : (
                                <span className="dash">—</span>
                            )}
                        </td>
                        <td>
                            {available ? (
                                <span
                                    className={`pill ${pillClass(row.trend?.signal)}`}
                                >
                                    {row.trend?.signal ?? 'neutral'}
                                </span>
                            ) : (
                                <span
                                    className="pill pill-neutral"
                                    title={row.trend?.reason ?? ''}
                                >
                                    Preparando
                                </span>
                            )}
                        </td>
                        <td className="t-model">
                            {available
                                ? `${row.trend?.model ?? '—'} · ${row.trend?.as_of ?? ''}`
                                : 'sin cobertura'}
                        </td>
                        <td className="chev">›</td>
                    </tr>
                );
            })}
        </tbody>
    );
}

function formatPnl(amount: number, percentage: number | null): string {
    const sign = amount >= 0 ? '+' : '−';
    const formattedAmount = Math.abs(amount).toLocaleString('es-AR', {
        maximumFractionDigits: 0,
    });
    if (percentage == null) return `${sign}$${formattedAmount}`;
    return `${sign}$${formattedAmount} (${sign}${Math.abs(percentage).toFixed(1)}%)`;
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
function rowStateClass(signal: string | null | undefined): string {
    switch (signal) {
        case 'alza':
            return 'is-up';
        case 'baja':
            return 'is-down';
        default:
            return 'is-flat';
    }
}
export default SharesTableBody;
