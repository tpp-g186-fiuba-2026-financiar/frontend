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

function pillClass(signal: string | null): string {
    switch (signal) {
        case 'alza':
            return 'pill-up';
        case 'baja':
            return 'pill-down';
        default:
            return 'pill-neutral';
    }
}

function cardStateClass(signal: string | null): string {
    switch (signal) {
        case 'alza':
            return 'is-up';
        case 'baja':
            return 'is-down';
        default:
            return 'is-neutral';
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
    const [portfolioError, setPortfolioError] = useState<string | null>(null);
    const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);

    const refreshPortfolio = async () => {
        try {
            setRows(await fetchPortfolioRows());
            setPortfolioError(null);
        } catch {
            setPortfolioError('No se pudo actualizar la cartera.');
        }
    };

    useEffect(() => {
        const fetchUser = async () => {
            const u = await getUserEndpoint();
            setUser(u);
        };
        const fetchPortfolio = async () => {
            try {
                setRows(await fetchPortfolioRows());
                setPortfolioError(null);
            } catch {
                setPortfolioError(
                    'No se pudo cargar la cartera. Revisá que el backend y api-ml estén levantados.',
                );
            } finally {
                setLoadingPortfolio(false);
            }
        };
        fetchUser();
        fetchPortfolio();
    }, []);

    if (!user) {
        return <p>Loading...</p>;
    }

    const available = rows.filter((r) => r.available);
    const upCount = available.filter((r) => r.signal === 'alza').length;

    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="mb-0">{user.full_name}</h3>
                    <p className="mb-0" style={{ color: 'var(--ink-3)' }}>
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

            {portfolioError && <p className="text-danger">{portfolioError}</p>}

            {!loadingPortfolio && !portfolioError && rows.length === 0 && (
                <p style={{ color: 'var(--ink-3)' }}>
                    Todavía no declaraste ninguna acción. Usá "Editar mi
                    cartera" para elegir cuáles tenés.
                </p>
            )}

            {!loadingPortfolio && rows.length > 0 && (
                <>
                    <div className="summary-banner mb-4">
                        <p className="mb-0">
                            Tu cartera ({rows.length}{' '}
                            {rows.length === 1 ? 'acción' : 'acciones'}) tiene{' '}
                            <b style={{ color: 'var(--up)' }}>
                                {upCount} en alza
                            </b>{' '}
                            de {available.length} con datos disponibles, a{' '}
                            {rows[0]?.horizon_days ?? 5} ruedas.
                        </p>
                    </div>

                    <div className="card-grid mb-4">
                        {rows.map((row) => (
                            <div
                                key={row.ticker}
                                className={`share-card ${row.available ? cardStateClass(row.signal) : 'unavailable'}`}
                            >
                                <div className="row1">
                                    <div className="ticker mono">
                                        {row.ticker}
                                    </div>
                                    <div className="price">
                                        <b className="num">
                                            {row.available &&
                                            row.last_close != null
                                                ? `$${row.last_close.toLocaleString('es-AR')}`
                                                : '—'}
                                        </b>
                                        <span>{row.quantity} nominales</span>
                                    </div>
                                </div>
                                <div className="badges">
                                    {row.available ? (
                                        <span
                                            className={`pill ${pillClass(row.signal)}`}
                                        >
                                            {row.signal ?? 'neutral'}
                                        </span>
                                    ) : (
                                        <span
                                            className="pill pill-neutral"
                                            title={row.reason ?? ''}
                                        >
                                            Sin datos
                                        </span>
                                    )}
                                    {row.available &&
                                        isNotableCondition(row.condition) && (
                                            <span className="pill pill-warn">
                                                {row.condition}
                                            </span>
                                        )}
                                </div>
                                <div className="meta">
                                    {row.available
                                        ? `${row.model ?? '—'} · ${row.as_of ?? ''}`
                                        : row.reason}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <p style={{ color: 'var(--ink-3)', fontSize: '13px' }}>
                Señal generada por modelos de machine learning sobre datos
                históricos. No es asesoramiento financiero.
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
