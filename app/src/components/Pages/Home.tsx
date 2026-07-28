import { useEffect, useState } from 'react';
import { getUserEndpoint, type UserResponse } from '../../api/user/getUser';
import { getUserSharesEndpoint } from '../../api/userShares/getUserSharesEndpoint';
import {
    getUserSharesTrendsEndpoint,
    type ShareTrend,
    type TrendsResponse,
} from '../../api/userShares/getUserSharesTrendsEndpoint';
import type { UserSharesResponse } from '../../api/userShares/getUserSharesEndpoint';
import PortfolioBuilder from '../Portfolio/PortfolioBuilder';

interface PortfolioRow extends ShareTrend {
    quantity: number;
}

function signalBadgeClass(signal: string | null): string {
    switch (signal) {
        case 'alza':
            return 'text-bg-success';
        case 'baja':
            return 'text-bg-danger';
        default:
            return 'text-bg-secondary';
    }
}

function isNotableCondition(condition: string | null): boolean {
    return condition === 'sobrecompra' || condition === 'sobreventa';
}

function buildRows(
    sharesRes: UserSharesResponse,
    trendsRes: TrendsResponse,
): PortfolioRow[] {
    const quantityByTicker: Record<string, number> = {};
    sharesRes.shares.forEach((s) => {
        quantityByTicker[s.ticker] = s.quantity;
    });
    return trendsRes.trends.map((t) => ({
        ...t,
        quantity: quantityByTicker[t.ticker] ?? 0,
    }));
}

async function fetchPortfolioRows(): Promise<PortfolioRow[]> {
    const [sharesRes, trendsRes] = await Promise.all([
        getUserSharesEndpoint(),
        getUserSharesTrendsEndpoint(),
    ]);
    return buildRows(sharesRes, trendsRes);
}

function Home() {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [rows, setRows] = useState<PortfolioRow[]>([]);
    const [loadingPortfolio, setLoadingPortfolio] = useState<boolean>(true);
    const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);

    const refreshPortfolio = async () => {
        setRows(await fetchPortfolioRows());
    };

    useEffect(() => {
        const fetchUser = async () => {
            const u = await getUserEndpoint();
            setUser(u);
        };
        const fetchPortfolio = async () => {
            setRows(await fetchPortfolioRows());
            setLoadingPortfolio(false);
        };
        fetchUser();
        fetchPortfolio();
    }, []);

    if (!user) {
        return <p>Loading...</p>;
    }

    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="mb-0">{user.full_name}</h3>
                    <p className="text-secondary small mb-0">
                        Perfil de riesgo: {user.risk_profile}
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsBuilderOpen(true)}
                >
                    Editar mi cartera
                </button>
            </div>

            {loadingPortfolio && <p>Cargando cartera...</p>}

            {!loadingPortfolio && rows.length === 0 && (
                <p className="text-secondary">
                    Todavía no declaraste ninguna acción. Usá "Editar mi
                    cartera" para elegir cuáles tenés.
                </p>
            )}

            {!loadingPortfolio && rows.length > 0 && (
                <div className="table-responsive">
                    <table className="table table-dark table-striped align-middle">
                        <thead>
                            <tr>
                                <th>Ticker</th>
                                <th>Cantidad</th>
                                <th>Último cierre</th>
                                <th>Señal</th>
                                <th>Condición</th>
                                <th>Modelo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.ticker}>
                                    <td className="fw-semibold">
                                        {row.ticker}
                                    </td>
                                    <td>{row.quantity}</td>
                                    <td>
                                        {row.available && row.last_close != null
                                            ? `$${row.last_close.toLocaleString('es-AR')}`
                                            : '—'}
                                    </td>
                                    <td>
                                        {row.available ? (
                                            <span
                                                className={`badge ${signalBadgeClass(row.signal)}`}
                                            >
                                                {row.signal ?? 'neutral'}
                                            </span>
                                        ) : (
                                            <span
                                                className="badge text-bg-secondary"
                                                title={row.reason ?? ''}
                                            >
                                                Sin datos
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {row.available &&
                                        isNotableCondition(row.condition) ? (
                                            <span className="badge text-bg-warning">
                                                {row.condition}
                                            </span>
                                        ) : (
                                            <span className="text-secondary">
                                                —
                                            </span>
                                        )}
                                    </td>
                                    <td className="text-secondary small">
                                        {row.model ?? '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <p className="text-secondary small mt-3">
                Señal a {rows[0]?.horizon_days ?? 5} ruedas, generada por
                modelos de machine learning sobre datos históricos. No es
                asesoramiento financiero.
            </p>

            <PortfolioBuilder
                isOpen={isBuilderOpen}
                onClose={() => setIsBuilderOpen(false)}
                onSaved={refreshPortfolio}
            />
        </div>
    );
}

export default Home;
