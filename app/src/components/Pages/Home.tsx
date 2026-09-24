import { useEffect, useRef, useState } from 'react';
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
import {
    getUserSharesPnlEndpoint,
    type SharePnlItem,
    type PortfolioPnlSummary,
} from '../../api/userShares/getUserSharesPnlEndpoint';
import PortfolioBuilder from '../Portfolio/PortfolioBuilder';
import { buildPortfolioChart } from '../Portfolio/ChartBuilder';
import TickerDetail from '../Portfolio/TickerDetail';
import EstimacionBlackLitterman from '../Portfolio/EstimacionBlackLitterman';
import TickerTape, { type TapeItem } from '../Layout/TickerTape';
import { useTheme } from '../../hooks/useTheme';
import LayoutDisclaimer from '../Layout/LayoutDisclaimer';
import TopBar from '../Layout/Topbar';
import SharesTable from '../SharesTable/SharesTable';

interface PortfolioRow {
    ticker: string;
    quantity: number;
    trend: ShareTrend | null;
    entryPrice: number | null;
    currentPrice: number | null;
    pnlAmount: number | null;
    pnlPercentage: number | null;
}

const RISK_PROFILE_LABEL: Record<string, string> = {
    conservative: 'Conservador',
    moderate: 'Moderado',
    aggressive: 'Agresivo',
};

function riskProfileLabel(value: string): string {
    return RISK_PROFILE_LABEL[value] ?? value;
}

function buildRows(
    shares: UserShareItem[],
    trends: ShareTrend[] | null,
    pnlByTicker: Record<string, SharePnlItem> | null,
): PortfolioRow[] {
    const trendByTicker: Record<string, ShareTrend> = {};
    (trends ?? []).forEach((t) => {
        trendByTicker[t.ticker] = t;
    });
    return shares.map((s) => {
        const pnl = pnlByTicker?.[s.ticker];
        return {
            ticker: s.ticker,
            quantity: s.quantity,
            trend: trendByTicker[s.ticker] ?? null,
            entryPrice: s.entry_price,
            currentPrice: pnl?.current_price ?? null,
            pnlAmount: pnl?.pnl_amount ?? null,
            pnlPercentage: pnl?.pnl_percentage ?? null,
        };
    });
}

// El P&L depende de data-colector (mismo backend que las tendencias) asi que
// puede fallar igual: si no responde, se muestra la cartera sin esa columna
// en vez de cortar toda la pantalla.
async function fetchPnl(): Promise<{
    byTicker: Record<string, SharePnlItem> | null;
    portfolio: PortfolioPnlSummary | null;
}> {
    try {
        const res = await getUserSharesPnlEndpoint();
        const byTicker: Record<string, SharePnlItem> = {};
        res.shares.forEach((item) => {
            byTicker[item.ticker] = item;
        });
        return { byTicker, portfolio: res.portfolio };
    } catch {
        return { byTicker: null, portfolio: null };
    }
}

async function fetchPortfolio(): Promise<{
    rows: PortfolioRow[];
    trendsUnavailable: boolean;
    portfolioPnl: PortfolioPnlSummary | null;
}> {
    const sharesRes = await getUserSharesEndpoint();
    const { byTicker: pnlByTicker, portfolio: portfolioPnl } = await fetchPnl();
    try {
        const trendsRes = await getUserSharesTrendsEndpoint();
        return {
            rows: buildRows(sharesRes.shares, trendsRes.trends, pnlByTicker),
            trendsUnavailable: false,
            portfolioPnl,
        };
    } catch {
        // Las acciones se guardaron igual: mostrarlas sin señal en vez de
        // vaciar toda la pantalla si los modelos no responden.
        return {
            rows: buildRows(sharesRes.shares, null, pnlByTicker),
            trendsUnavailable: true,
            portfolioPnl,
        };
    }
}

function Home() {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserResponse | null>(null);
    const [userError, setUserError] = useState(false);
    const [userAttempt, setUserAttempt] = useState(0);
    const [rows, setRows] = useState<PortfolioRow[]>([]);
    const [portfolioPnl, setPortfolioPnl] =
        useState<PortfolioPnlSummary | null>(null);
    const [loadingPortfolio, setLoadingPortfolio] = useState<boolean>(true);
    const [trendsUnavailable, setTrendsUnavailable] = useState<boolean>(false);
    const [portfolioError, setPortfolioError] = useState<string | null>(null);
    const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
    const [showEstimacion, setShowEstimacion] = useState<boolean>(false);
    const [refreshingTrends, setRefreshingTrends] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    // Solo para aplicar el tema guardado al cargar Home; cambiarlo se hace
    // desde /ajustes.
    useTheme();
    const userMenuRef = useRef<HTMLDivElement>(null);
    const portfolioChartRef = useRef<HTMLCanvasElement>(null);
    const selectedRow =
        rows.find((row) => row.ticker === selectedTicker) ?? null;

    const loadPortfolio = async () => {
        try {
            const sharesRes = await getUserSharesEndpoint();
            const { byTicker: pnlByTicker, portfolio: pnlSummary } =
                await fetchPnl();
            setPortfolioPnl(pnlSummary);
            setRows((currentRows) => {
                const currentTrends = currentRows
                    .map((row) => row.trend)
                    .filter((trend): trend is ShareTrend => trend !== null);
                return buildRows(sharesRes.shares, currentTrends, pnlByTicker);
            });
            setPortfolioError(null);

            try {
                const trendsRes = await getUserSharesTrendsEndpoint();
                setRows(
                    buildRows(sharesRes.shares, trendsRes.trends, pnlByTicker),
                );
                setTrendsUnavailable(false);
            } catch {
                setTrendsUnavailable(true);
            }
        } catch {
            setPortfolioError('No se pudo cargar tu cartera.');
        }
    };

    useEffect(() => {
        let cancelled = false;
        let retryTimer: number | undefined;
        const fetchUser = async () => {
            try {
                const u = await getUserEndpoint();
                if (!cancelled) {
                    setUser(u);
                    setUserError(false);
                }
            } catch {
                if (!cancelled) {
                    setUserError(true);
                    retryTimer = window.setTimeout(
                        () => setUserAttempt((attempt) => attempt + 1),
                        10_000,
                    );
                }
            }
        };
        const fetchInitialPortfolio = async () => {
            try {
                const { rows, trendsUnavailable, portfolioPnl } =
                    await fetchPortfolio();
                setRows(rows);
                setTrendsUnavailable(trendsUnavailable);
                setPortfolioPnl(portfolioPnl);
                setPortfolioError(null);
            } catch {
                setPortfolioError('No se pudo cargar tu cartera.');
            } finally {
                setLoadingPortfolio(false);
            }
        };
        fetchUser();
        fetchInitialPortfolio();
        return () => {
            cancelled = true;
            if (retryTimer) window.clearTimeout(retryTimer);
        };
    }, [userAttempt]);

    // Un ticker nuevo puede estar preparando su primer artefacto en Modal.
    // Reconsulta en segundo plano para que la señal aparezca sin recargar la web.
    useEffect(() => {
        if (
            !rows.some(
                (row) =>
                    row.trend == null ||
                    (!row.trend.available && row.trend.retryable !== false),
            )
        )
            return;
        const timer = window.setTimeout(async () => {
            setRefreshingTrends(true);
            try {
                const response = await getUserSharesTrendsEndpoint();
                const byTicker = new Map(
                    response.trends.map((trend) => [trend.ticker, trend]),
                );
                setRows((current) =>
                    current.map((row) => ({
                        ...row,
                        trend: byTicker.get(row.ticker) ?? row.trend,
                    })),
                );
                setTrendsUnavailable(false);
            } catch {
                setTrendsUnavailable(true);
            } finally {
                setRefreshingTrends(false);
            }
        }, 30_000);
        return () => window.clearTimeout(timer);
    }, [rows]);

    useEffect(() => {
        if (!isUserMenuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (
                userMenuRef.current &&
                !userMenuRef.current.contains(e.target as Node)
            ) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [isUserMenuOpen]);

    useEffect(() => {
        if (
            selectedTicker ||
            !portfolioChartRef.current ||
            rows.length === 0
        ) {
            return;
        }
        const chart = buildPortfolioChart(
            portfolioChartRef.current,
            rows.map(({ ticker, quantity }) => ({ ticker, quantity })),
        );
        return () => chart.destroy();
    }, [rows, selectedTicker]);

    if (!user) {
        return (
            <div className="container py-4">
                <div className="panel connection-state">
                    <h2 className="mb-2">
                        {userError
                            ? 'No pudimos conectar con el servidor'
                            : 'Cargando tu cuenta…'}
                    </h2>
                    <p className="mb-3" style={{ color: 'var(--ink-3)' }}>
                        {userError
                            ? 'Puede estar reiniciándose. Volveremos a intentar automáticamente.'
                            : 'Esto puede demorar unos segundos.'}
                    </p>
                    {userError && (
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                setUserError(false);
                                setUserAttempt((attempt) => attempt + 1);
                            }}
                        >
                            Reintentar ahora
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const withTrend = rows.filter((r) => r.trend?.available);
    const upCount = withTrend.filter((r) => r.trend?.signal === 'alza').length;

    // Todas las acciones declaradas, no solo las que tienen prediccion —
    // asi la cinta no "pierde" tickers sin cobertura de los modelos.
    const tapeItems: TapeItem[] = rows.map((r) => ({
        ticker: r.ticker,
        lastClose: r.trend?.available ? r.trend.last_close : null,
        deltaPct:
            r.trend?.available &&
            r.trend?.last_close &&
            r.trend?.predicted_close != null
                ? ((r.trend.predicted_close - r.trend.last_close) /
                      r.trend.last_close) *
                  100
                : null,
        signal: r.trend?.available ? r.trend.signal : null,
    }));

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <div className="container py-4">
            <div className="topbar">
                <button
                    type="button"
                    className="wordmark wordmark-link"
                    onClick={() => navigate('/home')}
                >
                    Financi<span className="accent">Ar</span>
                </button>
                <div className="userzone">
                    <div className="user-menu-wrap" ref={userMenuRef}>
                        <button
                            type="button"
                            className="chip chip-trigger"
                            onClick={() => setIsUserMenuOpen((open) => !open)}
                            aria-haspopup="menu"
                            aria-expanded={isUserMenuOpen}
                        >
                            {user.full_name} ·{' '}
                            {riskProfileLabel(user.risk_profile)}
                            <span className="chip-caret">▾</span>
                        </button>

                        {isUserMenuOpen && (
                            <div className="user-menu" role="menu">
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="user-menu-item"
                                    onClick={() => {
                                        setIsUserMenuOpen(false);
                                        navigate('/ajustes');
                                    }}
                                >
                                    Ajustes
                                </button>
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="user-menu-item"
                                    onClick={handleLogout}
                                >
                                    Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <TickerTape items={tapeItems.length > 0 ? tapeItems : undefined} />
            <LayoutDisclaimer />
            {selectedRow ? (
                <TickerDetail
                    row={selectedRow}
                    onBack={() => setSelectedTicker(null)}
                />
            ) : (
                <>
                    {loadingPortfolio && <p>Cargando cartera...</p>}

                    {portfolioError && (
                        <div className="panel">
                            <p className="text-danger mb-3">{portfolioError}</p>
                            <button
                                className="btn btn-primary"
                                onClick={async () => {
                                    setLoadingPortfolio(true);
                                    await loadPortfolio();
                                    setLoadingPortfolio(false);
                                }}
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    {!loadingPortfolio &&
                        !portfolioError &&
                        rows.length === 0 && (
                            <div className="panel">
                                <p className="mb-2">
                                    Todavía no armaste tu cartera.
                                </p>
                                <p
                                    className="mb-3"
                                    style={{ color: 'var(--ink-3)' }}
                                >
                                    Elegí qué acciones tenés y cuántas — así te
                                    podemos mostrar la señal de tendencia de
                                    cada una.
                                </p>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setIsBuilderOpen(true)}
                                >
                                    Editar mi cartera
                                </button>
                            </div>
                        )}

                    {!loadingPortfolio &&
                        !portfolioError &&
                        rows.length > 0 &&
                        (showEstimacion ? (
                            <EstimacionBlackLitterman
                                onBack={() => setShowEstimacion(false)}
                            />
                        ) : (
                            <>
                                {trendsUnavailable && (
                                    <div className="panel mb-4">
                                        <p className="mb-0 text-warning">
                                            Los modelos están demorando más de
                                            lo esperado. Tu cartera está
                                            guardada y las predicciones se
                                            actualizarán automáticamente.
                                        </p>
                                    </div>
                                )}

                                <div className="panel portfolio-chart-panel mb-4">
                                    <h2 className="portfolio-chart-title">
                                        Distribución de mi cartera
                                    </h2>
                                    <div className="portfolio-chart-wrap">
                                        <canvas
                                            ref={portfolioChartRef}
                                            role="img"
                                            aria-label="Distribución de acciones de mi cartera por cantidad"
                                        />
                                    </div>
                                </div>

                                <div className="watchlist-panel mb-4">
                                    <TopBar
                                        trendsUnavailable={trendsUnavailable}
                                        rows={rows}
                                        upCount={upCount}
                                        withTrend={withTrend}
                                        refreshingTrends={refreshingTrends}
                                        portfolioPnl={portfolioPnl}
                                        setShowEstimacion={setShowEstimacion}
                                        setIsBuilderOpen={setIsBuilderOpen}
                                    />
                                    <SharesTable
                                        rows={rows}
                                        setSelectedTicker={setSelectedTicker}
                                    />
                                </div>
                            </>
                        ))}
                </>
            )}
            
            <p style={{ color: 'var(--ink-3)', fontSize: '13px' }}>
                Señal generada por modelos de machine learning sobre datos
                históricos. No es asesoramiento financiero.
            </p>

            <footer className="site-footer">
                <div>
                    <b>FinanciAr</b> — Trabajo Profesional de Ingeniería en
                    Informática, FIUBA — Grupo 186
                </div>
            </footer>

            <PortfolioBuilder
                isOpen={isBuilderOpen}
                onClose={() => setIsBuilderOpen(false)}
                onSaved={loadPortfolio}
            />
        </div>
    );
}

export default Home;
