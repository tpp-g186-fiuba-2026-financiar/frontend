import type { PortfolioRow } from '../../api/Portfolio';
import type { PortfolioPnlSummary } from '../../api/userShares/getUserSharesPnlEndpoint';
import Balance from './Balance';
import Midbar from './Midbar';
import PortfolioPnl from './PortfolioPnl';

interface TopBarProps {
    trendsUnavailable: boolean;
    rows: PortfolioRow[];
    upCount: number;
    withTrend: PortfolioRow[];
    refreshingTrends: boolean;
    portfolioPnl?: PortfolioPnlSummary | null;
    setShowEstimacion: (show: boolean) => void;
    setIsBuilderOpen: (open: boolean) => void;
}
function TopBar({
    trendsUnavailable,
    rows,
    upCount,
    withTrend,
    refreshingTrends,
    portfolioPnl,
    setShowEstimacion,
    setIsBuilderOpen,
}: TopBarProps) {
    return (
        <div className="toolbar">
            <div>
                <Balance />
                <Midbar
                    trendsUnavailable={trendsUnavailable}
                    rows={rows}
                    upCount={upCount}
                    withTrend={withTrend}
                    refreshingTrends={refreshingTrends}
                />
                {portfolioPnl && <PortfolioPnl {...portfolioPnl} />}
            </div>
            <div className="d-flex gap-2">
                <button
                    className="btn btn-outline-theme"
                    onClick={() => setShowEstimacion(true)}
                >
                    Estimación Black-Litterman →
                </button>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsBuilderOpen(true)}
                >
                    Editar mi cartera
                </button>
            </div>
        </div>
    );
}
export default TopBar;
