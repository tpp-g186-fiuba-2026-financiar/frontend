import type { PortfolioRow } from '../../api/Portfolio';

interface MidbarProps {
    trendsUnavailable: boolean;
    trendsLoading?: boolean;
    rows: PortfolioRow[];
    upCount: number;
    withTrend: PortfolioRow[];
    refreshingTrends: boolean;
}
function Midbar({
    trendsUnavailable,
    trendsLoading,
    rows,
    upCount,
    withTrend,
    refreshingTrends,
}: MidbarProps) {
    return (
        !trendsUnavailable &&
        (trendsLoading ? (
            <p className="summary mb-0">
                {rows.length} {rows.length === 1 ? 'acción' : 'acciones'} ·
                calculando señales…
            </p>
        ) : (
            <p className="summary mb-0">
                {rows.length} {rows.length === 1 ? 'acción' : 'acciones'} ·{' '}
                <b>{upCount} en alza</b> de {withTrend.length} con datos
                disponibles, a {withTrend[0]?.trend?.horizon_days ?? 5} ruedas
                {refreshingTrends ? ' · actualizando…' : ''}
            </p>
        ))
    );
}
export default Midbar;
