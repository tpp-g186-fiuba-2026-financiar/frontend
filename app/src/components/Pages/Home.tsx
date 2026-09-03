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
import TickerDetail from '../Portfolio/TickerDetail';
import EstimacionBlackLitterman from '../Portfolio/EstimacionBlackLitterman';
import TickerTape, { type TapeItem } from '../Layout/TickerTape';
import InfoTip from '../Layout/InfoTip';
import { useTheme } from '../../hooks/useTheme';
import LayoutDisclaimer from '../Layout/LayoutDisclaimer';

interface PortfolioRow {
    ticker: string;
    quantity: number;
    trend: ShareTrend | null;
    entryPrice: number | null;
    currentPrice: number | null;
    pnlAmount: number | null;
    pnlPercentage: number | null;
}

function formatPnl(amount: number, percentage: number | null): string {
    const sign = amount >= 0 ? '+' : '−';
    const formattedAmount = Math.abs(amount).toLocaleString('es-AR', {
        maximumFractionDigits: 0,
    });
    if (percentage == null) return `${sign}$${formattedAmount}`;
    return `${sign}$${formattedAmount} (${sign}${Math.abs(percentage).toFixed(1)}%)`;
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

function signalStrokeVar(signal: string | null | undefined): string {
    switch (signal) {
        case 'alza':
            return 'var(--up)';
        case 'baja':
            return 'var(--down)';
        default:
            return 'var(--neutral-sig)';
    }
}

// Linea de 2 puntos (ultimo cierre -> precio proyectado): son los unicos
// datos reales que tenemos por fila, no hay historico de precios todavia.
function MiniProjection({
    lastClose,
    predictedClose,
    signal,
}: {
    lastClose: number;
    predictedClose: number;
    signal: string | null | undefined;
}) {
    const min = Math.min(lastClose, predictedClose);
    const max = Math.max(lastClose, predictedClose);
    const span = max - min || 1;
    const y0 = 14 - ((lastClose - min) / span) * 12;
    const y1 = 14 - ((predictedClose - min) / span) * 12;
    const color = signalStrokeVar(signal);
    return (
        <svg width="34" height="18" viewBox="0 0 34 18">
            <line
                x1="1"
                y1={y0}
                x2="33"
                y2={y1}
                stroke={color}
                strokeWidth="1.6"
                strokeLinecap="round"
            />
            <circle cx="33" cy={y1} r="2" fill={color} />
        </svg>
    );
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

                                <div className="watchlist-panel mb-4">
                                    <div className="toolbar">
                                        <div>
                                            <h2 className="mb-0">Mi cartera</h2>
                                            {!trendsUnavailable && (
                                                <p className="summary mb-0">
                                                    {rows.length}{' '}
                                                    {rows.length === 1
                                                        ? 'acción'
                                                        : 'acciones'}{' '}
                                                    · <b>{upCount} en alza</b>{' '}
                                                    de {withTrend.length} con
                                                    datos disponibles, a{' '}
                                                    {withTrend[0]?.trend
                                                        ?.horizon_days ??
                                                        5}{' '}
                                                    ruedas
                                                    {refreshingTrends
                                                        ? ' · actualizando…'
                                                        : ''}
                                                </p>
                                            )}
                                            {portfolioPnl &&
                                                portfolioPnl.total_invested >
                                                    0 && (
                                                    <p className="summary mb-0">
                                                        P&L de la cartera:{' '}
                                                        <b
                                                            style={{
                                                                color:
                                                                    portfolioPnl.total_pnl_amount >=
                                                                    0
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
                                                )}
                                        </div>
                                        <div className="d-flex gap-2">
                                            <button
                                                className="btn btn-outline-theme"
                                                onClick={() =>
                                                    setShowEstimacion(true)
                                                }
                                            >
                                                Estimación Black-Litterman →
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() =>
                                                    setIsBuilderOpen(true)
                                                }
                                            >
                                                Editar mi cartera
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="watchlist">
                                            <thead>
                                                <tr>
                                                    <th>Ticker</th>
                                                    <th></th>
                                                    <th>Cant.</th>
                                                    <th>
                                                        P&L
                                                        <InfoTip label="P&L">
                                                            Ganancia o pérdida
                                                            frente al precio de
                                                            entrada cargado.
                                                            Necesita el precio
                                                            de entrada para
                                                            calcularse.
                                                        </InfoTip>
                                                    </th>
                                                    <th>Último</th>
                                                    <th>
                                                        RSI
                                                        <InfoTip label="RSI (14)">
                                                            Índice de fuerza
                                                            relativa a 14
                                                            ruedas. Arriba de 70
                                                            sugiere sobrecompra,
                                                            abajo de 30
                                                            sobreventa.
                                                        </InfoTip>
                                                    </th>
                                                    <th>
                                                        Señal
                                                        <InfoTip label="Señal">
                                                            Alza o baja si el
                                                            modelo proyecta un
                                                            retorno mayor a ±1%
                                                            al horizonte
                                                            indicado; si no,
                                                            neutral.
                                                        </InfoTip>
                                                    </th>
                                                    <th>
                                                        Modelo · fecha
                                                        <InfoTip label="Modelo · fecha">
                                                            Qué modelo de ML
                                                            generó esta
                                                            predicción y con qué
                                                            cierre se calculó.
                                                        </InfoTip>
                                                    </th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.map((row) => {
                                                    const available =
                                                        row.trend?.available ??
                                                        false;
                                                    return (
                                                        <tr
                                                            key={row.ticker}
                                                            className={
                                                                available
                                                                    ? rowStateClass(
                                                                          row
                                                                              .trend
                                                                              ?.signal,
                                                                      )
                                                                    : ''
                                                            }
                                                            onClick={() =>
                                                                setSelectedTicker(
                                                                    row.ticker,
                                                                )
                                                            }
                                                        >
                                                            <td className="t-ticker">
                                                                {row.ticker}
                                                            </td>
                                                            <td>
                                                                {available &&
                                                                    row.trend
                                                                        ?.last_close !=
                                                                        null &&
                                                                    row.trend
                                                                        ?.predicted_close !=
                                                                        null && (
                                                                        <MiniProjection
                                                                            lastClose={
                                                                                row
                                                                                    .trend
                                                                                    .last_close
                                                                            }
                                                                            predictedClose={
                                                                                row
                                                                                    .trend
                                                                                    .predicted_close
                                                                            }
                                                                            signal={
                                                                                row
                                                                                    .trend
                                                                                    .signal
                                                                            }
                                                                        />
                                                                    )}
                                                            </td>
                                                            <td className="t-qty">
                                                                {row.quantity}
                                                            </td>
                                                            <td className="t-pnl">
                                                                {row.pnlAmount !=
                                                                null ? (
                                                                    <span
                                                                        className="num"
                                                                        style={{
                                                                            color:
                                                                                row.pnlAmount >=
                                                                                0
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
                                                                {available &&
                                                                row.trend
                                                                    ?.last_close !=
                                                                    null ? (
                                                                    <span className="num">
                                                                        $
                                                                        {row.trend.last_close.toLocaleString(
                                                                            'es-AR',
                                                                        )}
                                                                    </span>
                                                                ) : (
                                                                    <span className="dash">
                                                                        —
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="rsi-cell">
                                                                {available &&
                                                                row.trend
                                                                    ?.rsi !=
                                                                    null ? (
                                                                    <>
                                                                        <span className="rsi-bar">
                                                                            <i
                                                                                style={{
                                                                                    width: `${row.trend.rsi}%`,
                                                                                }}
                                                                            />
                                                                        </span>
                                                                        <span className="num">
                                                                            {row.trend.rsi.toFixed(
                                                                                0,
                                                                            )}
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <span className="dash">
                                                                        —
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {available ? (
                                                                    <span
                                                                        className={`pill ${pillClass(row.trend?.signal)}`}
                                                                    >
                                                                        {row
                                                                            .trend
                                                                            ?.signal ??
                                                                            'neutral'}
                                                                    </span>
                                                                ) : (
                                                                    <span
                                                                        className="pill pill-neutral"
                                                                        title={
                                                                            row
                                                                                .trend
                                                                                ?.reason ??
                                                                            ''
                                                                        }
                                                                    >
                                                                        Preparando
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="t-model">
                                                                {available
                                                                    ? `${row.trend?.model ?? '—'} · ${row.trend?.as_of ?? ''}`
                                                                    : 'sin cobertura'}
                                                            </td>
                                                            <td className="chev">
                                                                ›
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
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