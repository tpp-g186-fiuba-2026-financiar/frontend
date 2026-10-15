import type { PortfolioRow } from '../../api/Portfolio';
import SharesTableBody from './SharesTableBody';
import SharesTableHead from './SharesTableHead';

interface SharesTableProps {
    rows: PortfolioRow[];
    setSelectedTicker: (ticker: string) => void;
    pnlLoading?: boolean;
    trendsLoading?: boolean;
    historyByTicker?: Record<string, number[]>;
}

function SharesTable({
    rows,
    setSelectedTicker,
    pnlLoading,
    trendsLoading,
    historyByTicker,
}: SharesTableProps) {
    return (
        <div style={{ overflowX: 'auto' }}>
            <table className="watchlist">
                <thead>
                    <SharesTableHead />
                </thead>
                <SharesTableBody
                    rows={rows}
                    setSelectedTicker={setSelectedTicker}
                    pnlLoading={pnlLoading}
                    trendsLoading={trendsLoading}
                    historyByTicker={historyByTicker}
                />
            </table>
        </div>
    );
}
export default SharesTable;
