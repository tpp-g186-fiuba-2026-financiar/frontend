import MiniProjection from './MiniProjection';
import Sparkline from './Sparkline';
import {
    pillClass,
    signalLabel,
    signalStrength,
} from '../../utils/modelInsights';
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
    pnlLoading?: boolean;
    trendsLoading?: boolean;
    historyByTicker?: Record<string, number[]>;
}

const Skeleton = () => <span className="skel" aria-hidden="true" />;

function SharesTableBody({
    rows,
    setSelectedTicker,
    pnlLoading,
    trendsLoading,
    historyByTicker,
}: SharesTableBodyProps) {
    return (
        <tbody>
            {rows.map((row, index) => {
                const available = row.trend?.available ?? false;
                const waitingTrend = trendsLoading && row.trend == null;
                const waitingPnl = pnlLoading && row.pnlAmount == null;
                const history = historyByTicker?.[row.ticker];
                return (
                    <tr
                        key={row.ticker}
                        className={`row-in ${available ? rowStateClass(row.trend?.signal) : ''}`}
                        style={{ ['--i' as string]: index }}
                        onClick={() => setSelectedTicker(row.ticker)}
                    >
                        <td className="t-ticker">{row.ticker}</td>
                        <td>
                            {waitingTrend ? (
                                <Skeleton />
                            ) : history ? (
                                <Sparkline
                                    closes={history}
                                    signal={
                                        available ? row.trend?.signal : null
                                    }
                                    label={`Últimos 30 días de ${row.ticker}`}
                                />
                            ) : (
                                available &&
                                row.trend?.last_close != null &&
                                row.trend?.predicted_close != null && (
                                    <MiniProjection
                                        lastClose={row.trend.last_close}
                                        predictedClose={
                                            row.trend.predicted_close
                                        }
                                        signal={row.trend.signal}
                                    />
                                )
                            )}
                        </td>
                        <td className="t-qty">{row.quantity}</td>
                        <td className="t-pnl">
                            {waitingPnl ? (
                                <Skeleton />
                            ) : row.pnlAmount != null ? (
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
                            {waitingTrend ? (
                                <Skeleton />
                            ) : available && row.trend?.last_close != null ? (
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
                            {waitingTrend ? (
                                <Skeleton />
                            ) : available && row.trend?.rsi != null ? (
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
                            {waitingTrend ? (
                                <Skeleton />
                            ) : available ? (
                                <>
                                    <span
                                        className={`pill ${pillClass(row.trend?.signal)}`}
                                    >
                                        {signalLabel(
                                            row.trend?.signal,
                                            row.trend?.horizon_days,
                                        )}
                                    </span>
                                    <SignalStrength
                                        level={signalStrength({
                                            signal: row.trend?.signal,
                                            last_close: row.trend?.last_close,
                                            predicted_close:
                                                row.trend?.predicted_close,
                                            probability_up:
                                                row.trend?.probability_up,
                                        })}
                                    />
                                </>
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
                            {waitingTrend ? (
                                <Skeleton />
                            ) : available ? (
                                `${row.trend?.model ?? '—'} · ${row.trend?.as_of ?? ''}`
                            ) : (
                                'sin cobertura'
                            )}
                        </td>
                        <td className="chev">›</td>
                    </tr>
                );
            })}
        </tbody>
    );
}

function SignalStrength({ level }: { level: 0 | 1 | 2 | 3 }) {
    if (level === 0) return null;
    return (
        <span
            className="strength"
            title="Qué tan marcada es la señal del modelo (1 a 3). No es una probabilidad de acierto."
            aria-label={`Fuerza de la señal: ${level} de 3`}
        >
            {[1, 2, 3].map((i) => (
                <i key={i} className={i <= level ? 'on' : ''} />
            ))}
        </span>
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
