import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserEndpoint, type UserResponse } from '../../api/user/getUser';
import {
    getUserSharesEndpoint,
    type UserShareItem,
} from '../../api/userShares/getUserSharesEndpoint';
import {
    getUserSharesTrendsEndpoint,
    type ShareTrend,
} from '../../api/userShares/getUserSharesTrendsEndpoint';
import PortfolioBuilder from '../Portfolio/PortfolioBuilder';
import TickerTape from '../Layout/TickerTape';

interface PortfolioRow {
    ticker: string;
    quantity: number;
    trend: ShareTrend | null;
}

const RISK_PROFILE_LABEL: Record<string, string> = {
    conservative: 'Conservador',
    moderate: 'Moderado',
    aggressive: 'Agresivo',
};

function riskProfileLabel(value: string): string {
    return RISK_PROFILE_LABEL[value] ?? value;
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

function cardStateClass(signal: string | null | undefined): string {
    switch (signal) {
        case 'alza':
            return 'is-up';
        case 'baja':
            return 'is-down';
        default:
            return 'is-neutral';
    }
}

function isNotableCondition(condition: string | null | undefined): boolean {
    return condition === 'sobrecompra' || condition === 'sobreventa';
}

function buildRows(
    shares: UserShareItem[],
    trends: ShareTrend[] | null,
): PortfolioRow[] {
    const trendByTicker: Record<string, ShareTrend> = {};
    (trends ?? []).forEach((t) => {
        trendByTicker[t.ticker] = t;
    });
    return shares.map((s) => ({
        ticker: s.ticker,
        quantity: s.quantity,
        trend: trendByTicker[s.ticker] ?? null,
    }));
}

async function fetchPortfolio(): Promise<{
    rows: PortfolioRow[];
    trendsUnavailable: boolean;
}> {
    const sharesRes = await getUserSharesEndpoint();
    try {
        const trendsRes = await getUserSharesTrendsEndpoint();
        return {
            rows: buildRows(sharesRes.shares, trendsRes.trends),
            trendsUnavailable: false,
        };
    } catch {
        // Las acciones se guardaron igual: mostrarlas sin señal en vez de
        // vaciar toda la pantalla si api-ml no responde.
        return {
            rows: buildRows(sharesRes.shares, null),
            trendsUnavailable: true,
        };
    }
}

function Home() {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserResponse | null>(null);
    const [rows, setRows] = useState<PortfolioRow[]>([]);
    const [loadingPortfolio, setLoadingPortfolio] = useState<boolean>(true);
    const [trendsUnavailable, setTrendsUnavailable] = useState<boolean>(false);
    const [portfolioError, setPortfolioError] = useState<string | null>(null);
    const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);

    const loadPortfolio = async () => {
        try {
            const { rows, trendsUnavailable } = await fetchPortfolio();
            setRows(rows);
            setTrendsUnavailable(trendsUnavailable);
            setPortfolioError(null);
        } catch {
            setPortfolioError('No se pudo cargar tu cartera.');
        }
    };

    useEffect(() => {
        const fetchUser = async () => {
            const u = await getUserEndpoint();
            setUser(u);
        };
        const fetchInitialPortfolio = async () => {
            try {
                const { rows, trendsUnavailable } = await fetchPortfolio();
                setRows(rows);
                setTrendsUnavailable(trendsUnavailable);
                setPortfolioError(null);
            } catch {
                setPortfolioError('No se pudo cargar tu cartera.');
            } finally {
                setLoadingPortfolio(false);
            }
        };
        fetchUser();
        fetchInitialPortfolio();
    }, []);

    if (!user) {
        return <p>Loading...</p>;
    }

    const withTrend = rows.filter((r) => r.trend?.available);
    const upCount = withTrend.filter((r) => r.trend?.signal === 'alza').length;

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <div className="container py-4">
            <TickerTape />

            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="mb-0">{user.full_name}</h3>
                    <p className="mb-0" style={{ color: 'var(--ink-3)' }}>
                        Perfil de riesgo: {riskProfileLabel(user.risk_profile)}
                    </p>
                </div>
                <div>
                    <button
                        className="btn btn-primary me-2"
                        onClick={() => setIsBuilderOpen(true)}
                    >
                        Editar mi cartera
                    </button>
                    <button
                        className="btn btn-outline-light"
                        onClick={handleLogout}
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>

            {loadingPortfolio && <p>Cargando cartera...</p>}

            {portfolioError && (
                <div className="panel">
                    <p className="text-danger mb-0">{portfolioError}</p>
                </div>
            )}

            {!loadingPortfolio && !portfolioError && rows.length === 0 && (
                <div className="panel">
                    <p className="mb-2">Todavía no armaste tu cartera.</p>
                    <p className="mb-0" style={{ color: 'var(--ink-3)' }}>
                        Usá "Editar mi cartera" para elegir qué acciones tenés y
                        cuántas — así te podemos mostrar la señal de tendencia
                        de cada una.
                    </p>
                </div>
            )}

            {!loadingPortfolio && !portfolioError && rows.length > 0 && (
                <>
                    {trendsUnavailable && (
                        <div className="panel mb-4">
                            <p className="mb-0 text-warning">
                                No se pudo conectar con api-ml, así que por
                                ahora no hay señal de tendencia. Tu cartera se
                                guardó igual.
                            </p>
                        </div>
                    )}

                    {!trendsUnavailable && (
                        <div className="summary-banner mb-4">
                            <p className="mb-0">
                                Tu cartera ({rows.length}{' '}
                                {rows.length === 1 ? 'acción' : 'acciones'})
                                tiene{' '}
                                <b style={{ color: 'var(--up)' }}>
                                    {upCount} en alza
                                </b>{' '}
                                de {withTrend.length} con datos disponibles, a{' '}
                                {withTrend[0]?.trend?.horizon_days ?? 5} ruedas.
                            </p>
                        </div>
                    )}

                    <div className="card-grid mb-4">
                        {rows.map((row) => (
                            <div
                                key={row.ticker}
                                className={`share-card ${
                                    row.trend?.available
                                        ? cardStateClass(row.trend.signal)
                                        : 'unavailable'
                                }`}
                            >
                                <div className="row1">
                                    <div className="ticker mono">
                                        {row.ticker}
                                    </div>
                                    <div className="price">
                                        <b className="num">
                                            {row.trend?.available &&
                                            row.trend.last_close != null
                                                ? `$${row.trend.last_close.toLocaleString('es-AR')}`
                                                : '—'}
                                        </b>
                                        <span>{row.quantity} nominales</span>
                                    </div>
                                </div>
                                <div className="badges">
                                    {row.trend?.available ? (
                                        <span
                                            className={`pill ${pillClass(row.trend.signal)}`}
                                        >
                                            {row.trend.signal ?? 'neutral'}
                                        </span>
                                    ) : (
                                        <span
                                            className="pill pill-neutral"
                                            title={row.trend?.reason ?? ''}
                                        >
                                            Sin datos
                                        </span>
                                    )}
                                    {row.trend?.available &&
                                        isNotableCondition(
                                            row.trend.condition,
                                        ) && (
                                            <span className="pill pill-warn">
                                                {row.trend.condition}
                                            </span>
                                        )}
                                </div>
                                <div className="meta">
                                    {row.trend?.available
                                        ? `${row.trend.model ?? '—'} · ${row.trend.as_of ?? ''}`
                                        : (row.trend?.reason ??
                                          'Todavía sin conexión a api-ml')}
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
                onSaved={loadPortfolio}
            />
        </div>
    );
}

export default Home;
