import type { PortfolioRow } from '../../api/Portfolio';
import SharesTableBody from './SharesTableBody';
import SharesTableHead from './SharesTableHead';

interface SharesTableProps {
    rows: PortfolioRow[];
    setSelectedTicker: (ticker: string) => void;
}

function SharesTable({ rows, setSelectedTicker }: SharesTableProps) {
    return (
        <div style={{ overflowX: 'auto' }}>
            <table className="watchlist">
                <thead>
                    <SharesTableHead />
                </thead>
                <SharesTableBody
                    rows={rows}
                    setSelectedTicker={setSelectedTicker}
                />
            </table>
        </div>
    );
}
export default SharesTable;
