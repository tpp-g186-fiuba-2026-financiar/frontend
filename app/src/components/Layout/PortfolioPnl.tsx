import type { PortfolioPnlSummary } from '../../api/userShares/getUserSharesPnlEndpoint';

function PortfolioPnl(portfolioPnl: PortfolioPnlSummary) {
    return (
        portfolioPnl.total_invested > 0 && (
            <p className="summary mb-0">
                P&L de la cartera:{' '}
                <b
                    style={{
                        color:
                            portfolioPnl.total_pnl_amount >= 0
                                ? 'var(--up)'
                                : 'var(--down)',
                    }}
                >
                    {formatPnl(
                        portfolioPnl.total_pnl_amount,
                        portfolioPnl.total_pnl_percentage,
                    )}
                </b>
            </p>
        )
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

export default PortfolioPnl;
