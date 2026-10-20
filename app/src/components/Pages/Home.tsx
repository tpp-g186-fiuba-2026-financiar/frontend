import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUserEndpoint, type UserResponse } from '../../api/user/getUser';
import {
    getUserSharesEndpoint,
    type UserShareItem,
} from '../../api/userShares/getUserSharesEndpoint';
import {
    getUserSharesTrendsEndpoint,
    type ShareTrend,
} from '../../api/userShares/getUserSharesTrendsEndpoint';
import { getShareHistoryEndpoint } from '../../api/userShares/getShareHistoryEndpoint';
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
import { getTrendsCompareEndpoint } from '../../api/userShares/getShareTrendsCompare';
import {
    loadConfig,
    resolveDefaultModel,
    type DefaultModelsConfig,
} from '../../utils/defaultModels';
import TopBar from '../Layout/Topbar';
import RiskProfileGate from '../settings/RiskProfileGate';
import SharesTable from '../SharesTable/SharesTable';
import ChartBar from '../Portfolio/ChartBar';
import BalanceHistoryChart from '../Portfolio/BalanceHistoryChart';
import StockSearch from '../Layout/StockSearch';

interface PortfolioRow {
    ticker: string;
    quantity: number;
    trend: ShareTrend | null;
    entryPrice: number | null;
    currentPrice: number | null;
    pnlAmount: number | null;
    pnlPercentage: number | null;
    weightPercentage: number | null;
}

type CompareTrendsResponse = Awaited<
    ReturnType<typeof getTrendsCompareEndpoint>
>;

const RISK_PROFILE_LABEL: Record<string, string> = {
    conservative: 'Conservador',
    moderate: 'Moderado',
    aggressive: 'Agresivo',
};

function riskProfileLabel(value: string): string {
    return RISK_PROFILE_LABEL[value] ?? value;
}

function selectedTickerFromState(state: unknown): string | null {
    if (
        typeof state !== 'object' ||
        state === null ||
        !('selectedTicker' in state)
    ) {
        return null;
    }
    return typeof state.selectedTicker === 'string'
        ? state.selectedTicker
        : null;
}

// Reemplaza los datos de la tendencia por los del modelo que el usuario
// eligió en Ajustes. Si algo falta (config, comparación o el modelo elegido
// no está disponible) deja la fila tal cual venía del endpoint principal.
function withPreferredModel(
    row: PortfolioRow,
    config: DefaultModelsConfig | null,
    compareByTicker: Record<string, CompareTrendsResponse>,
): PortfolioRow {
    const compare = compareByTicker[row.ticker];
    if (!config || !compare) return row;
    const model = resolveDefaultModel(config, row.ticker, compare);
    const p = model
        ? compare.predictions[model as keyof typeof compare.predictions]
        : undefined;
    if (!model || !p || !p.available) return row;
    // Si el endpoint principal de tendencias no respondió (row.trend nulo), la
    // comparación igual alcanza para mostrar la señal del modelo elegido.
    const base: ShareTrend = row.trend ?? {
        ticker: row.ticker,
        available: false,
        signal: null,
        condition: null,
        rsi: null,
        horizon_days: null,
        last_close: null,
        predicted_close: null,
        as_of: null,
        model: null,
        model_version: null,
        reason: null,
    };
    return {
        ...row,
        trend: {
            ...base,
            available: p.available,
            signal: p.signal,
            rsi: p.rsi,
            horizon_days: p.horizon_days,
            last_close: p.last_close,
            predicted_close: p.predicted_close,
            as_of: p.as_of,
            model,
            reason: p.reason,
            probability_up: p.probability_up ?? null,
        } as ShareTrend,
    };
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
            weightPercentage: pnl?.weight_percentage ?? null,
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

function Home() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState<UserResponse | null>(null);
    const [userError, setUserError] = useState(false);
    const [userAttempt, setUserAttempt] = useState(0);
    const [rows, setRows] = useState<PortfolioRow[]>([]);
    const [portfolioPnl, setPortfolioPnl] =
        useState<PortfolioPnlSummary | null>(null);
    const [loadingPortfolio, setLoadingPortfolio] = useState<boolean>(true);
    const [pnlLoading, setPnlLoading] = useState<boolean>(false);
    const [trendsLoading, setTrendsLoading] = useState<boolean>(false);
    const [historyByTicker, setHistoryByTicker] = useState<
        Record<string, number[]>
    >({});
    const [trendsUnavailable, setTrendsUnavailable] = useState<boolean>(false);
    const [portfolioError, setPortfolioError] = useState<string | null>(null);
    const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);
    const selectedTicker = selectedTickerFromState(location.state);
    const [showEstimacion, setShowEstimacion] = useState<boolean>(false);
    const [refreshingTrends, setRefreshingTrends] = useState(false);
    // Se incrementa en cada recarga de la cartera para que el grafico de
    // evolucion vuelva a pedir el historial.
    const [portfolioVersion, setPortfolioVersion] = useState(0);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    // Acción que el builder abre ya tildada ("Agregar a mi cartera")
    const [builderTicker, setBuilderTicker] = useState<string | null>(null);
    // Ticker fuera de la cartera cuya comparación de modelos ya respondió
    const [exploreLoadedTicker, setExploreLoadedTicker] = useState<
        string | null
    >(null);
    // Solo para aplicar el tema guardado al cargar Home; cambiarlo se hace
    // desde /ajustes.
    useTheme();
    const userMenuRef = useRef<HTMLDivElement>(null);
    const [modelConfig, setModelConfig] = useState<DefaultModelsConfig | null>(
        null,
    );
    const [compareByTicker, setCompareByTicker] = useState<
        Record<string, CompareTrendsResponse>
    >({});
    const [appliedModels, setAppliedModels] = useState<
        Record<string, ShareTrend>
    >({});
    // `rows` guarda lo que devuelve el endpoint principal; `displayRows` es lo
    // que se muestra, con el modelo preferido del usuario aplicado encima.
    const displayRows = useMemo(
        () =>
            rows.map((row) => {
                const preferred = withPreferredModel(
                    row,
                    modelConfig,
                    compareByTicker,
                );
                const appliedTrend = appliedModels[row.ticker];
                return appliedTrend
                    ? { ...preferred, trend: appliedTrend }
                    : preferred;
            }),
        [rows, modelConfig, compareByTicker, appliedModels],
    );
    const portfolioChartRef = useRef<HTMLCanvasElement>(null);
    const selectedRow =
        displayRows.find((row) => row.ticker === selectedTicker) ?? null;
    // Acción elegida en el buscador que no está en la cartera: se muestra el
    // mismo detalle, sin cantidad, con la señal sacada de la comparación.
    const exploreTicker =
        selectedTicker && !loadingPortfolio && !portfolioError && !selectedRow
            ? selectedTicker
            : null;
    const exploreRow = useMemo(() => {
        if (!exploreTicker) return null;
        const row = withPreferredModel(
            {
                ticker: exploreTicker,
                quantity: 0,
                trend: null,
                entryPrice: null,
                currentPrice: null,
                pnlAmount: null,
                pnlPercentage: null,
                weightPercentage: null,
            },
            modelConfig,
            compareByTicker,
        );
        const appliedTrend = appliedModels[exploreTicker];
        return appliedTrend ? { ...row, trend: appliedTrend } : row;
    }, [exploreTicker, modelConfig, compareByTicker, appliedModels]);
    const detailRow = selectedRow ?? exploreRow;
    const tickersKey = rows.map((row) => row.ticker).join(',');
    const openTicker = (ticker: string) =>
        navigate('/home', { state: { selectedTicker: ticker } });

    const loadPortfolio = async () => {
        try {
            const sharesRes = await getUserSharesEndpoint();
            const { byTicker: pnlByTicker, portfolio: pnlSummary } =
                await fetchPnl();
            setPortfolioPnl(pnlSummary);
            setPortfolioVersion((version) => version + 1);
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
        // Carga progresiva: la cartera aparece apenas llega la lista de
        // acciones; precios/P&L y señales se completan cuando responde cada
        // servicio (cualquiera de los dos puede tardar o fallar sin bloquear).
        const fetchInitialPortfolio = async () => {
            try {
                const sharesRes = await getUserSharesEndpoint();
                if (cancelled) return;
                setRows(buildRows(sharesRes.shares, null, null));
                setPortfolioError(null);
                setLoadingPortfolio(false);
                setPnlLoading(true);
                setTrendsLoading(true);

                const pnlPromise = fetchPnl().then(
                    ({ byTicker, portfolio }) => {
                        if (cancelled) return;
                        setPortfolioPnl(portfolio);
                        setRows((current) =>
                            current.map((row) => {
                                const pnl = byTicker?.[row.ticker];
                                return {
                                    ...row,
                                    currentPrice: pnl?.current_price ?? null,
                                    pnlAmount: pnl?.pnl_amount ?? null,
                                    pnlPercentage: pnl?.pnl_percentage ?? null,
                                    weightPercentage:
                                        pnl?.weight_percentage ?? null,
                                };
                            }),
                        );
                        setPnlLoading(false);
                    },
                );
                const trendsPromise = getUserSharesTrendsEndpoint().then(
                    (trendsRes) => {
                        if (cancelled) return;
                        const byTicker = new Map(
                            trendsRes.trends.map((t) => [t.ticker, t]),
                        );
                        setRows((current) =>
                            current.map((row) => ({
                                ...row,
                                trend: byTicker.get(row.ticker) ?? null,
                            })),
                        );
                        setTrendsUnavailable(false);
                    },
                    () => {
                        if (!cancelled) setTrendsUnavailable(true);
                    },
                );
                await Promise.all([pnlPromise, trendsPromise]);
            } catch {
                if (!cancelled) {
                    setPortfolioError('No se pudo cargar tu cartera.');
                    setLoadingPortfolio(false);
                }
            } finally {
                if (!cancelled) {
                    setPnlLoading(false);
                    setTrendsLoading(false);
                }
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

    // Carga en segundo plano la preferencia de modelo y la comparación de
    // cada acción. La tabla se ve primero con el modelo por defecto del
    // backend y se actualiza cuando esto llega.
    useEffect(() => {
        if (!tickersKey) return;
        let cancelled = false;
        const tickers = tickersKey.split(',');
        (async () => {
            const [config, results] = await Promise.all([
                loadConfig(),
                Promise.allSettled(
                    tickers.map((t) => getTrendsCompareEndpoint(t)),
                ),
            ]);
            if (cancelled) return;
            const byTicker: Record<string, CompareTrendsResponse> = {};
            results.forEach((r, i) => {
                if (r.status === 'fulfilled') byTicker[tickers[i]] = r.value;
            });
            setCompareByTicker((current) => ({ ...current, ...byTicker }));
            setModelConfig(config);
        })();
        return () => {
            cancelled = true;
        };
    }, [tickersKey]);

    // Para una acción fuera de la cartera no hay tendencia del endpoint
    // principal: se arma con la comparación y el modelo preferido.
    useEffect(() => {
        if (!exploreTicker) return;
        let cancelled = false;
        Promise.all([loadConfig(), getTrendsCompareEndpoint(exploreTicker)])
            .then(([config, compare]) => {
                if (cancelled) return;
                setModelConfig((current) => current ?? config);
                setCompareByTicker((current) => ({
                    ...current,
                    [exploreTicker]: compare,
                }));
            })
            .catch(() => {
                // Sin comparación el detalle queda sin señal ("Sin datos")
            })
            .finally(() => {
                if (!cancelled) setExploreLoadedTicker(exploreTicker);
            });
        return () => {
            cancelled = true;
        };
    }, [exploreTicker]);

    // Últimos 30 cierres de cada acción para el minigráfico de la tabla. Se
    // piden en segundo plano; mientras tanto la tabla usa la línea de proyección.
    useEffect(() => {
        if (!tickersKey) return;
        let cancelled = false;
        const tickers = tickersKey.split(',');
        Promise.allSettled(tickers.map((t) => getShareHistoryEndpoint(t))).then(
            (results) => {
                if (cancelled) return;
                const byTicker: Record<string, number[]> = {};
                results.forEach((r, i) => {
                    if (r.status !== 'fulfilled') return;
                    const closes = r.value.prices
                        .slice(-30)
                        .map((point) => point.close);
                    if (closes.length >= 5) byTicker[tickers[i]] = closes;
                });
                setHistoryByTicker(byTicker);
            },
        );
        return () => {
            cancelled = true;
        };
    }, [tickersKey]);

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
        if (selectedTicker || !portfolioChartRef.current || rows.length === 0) {
            return;
        }
        const chart = buildPortfolioChart(
            portfolioChartRef.current,
            rows.map(({ ticker, quantity, currentPrice }) => ({
                ticker,
                quantity,
                currentPrice,
            })),
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

    const withTrend = displayRows.filter((r) => r.trend?.available);
    const upCount = withTrend.filter((r) => r.trend?.signal === 'alza').length;

    // Todas las acciones declaradas, no solo las que tienen prediccion —
    // asi la cinta no "pierde" tickers sin cobertura de los modelos.
    const tapeItems: TapeItem[] = displayRows.map((r) => ({
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
            {isSearchOpen && (
                <div className="stock-search-scrim" aria-hidden="true" />
            )}
            <div className={`topbar${isSearchOpen ? ' is-searching' : ''}`}>
                <button
                    type="button"
                    className="wordmark wordmark-link"
                    onClick={() => navigate('/home')}
                >
                    Financi<span className="accent">Ar</span>
                </button>
                <StockSearch
                    portfolio={displayRows}
                    onSelect={openTicker}
                    onOpenChange={setIsSearchOpen}
                />
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
            {detailRow ? (
                <TickerDetail
                    row={detailRow}
                    owned={selectedRow !== null}
                    trendLoading={
                        !selectedRow &&
                        !detailRow.trend &&
                        exploreLoadedTicker !== detailRow.ticker
                    }
                    onAddToPortfolio={() => {
                        setBuilderTicker(detailRow.ticker);
                        setIsBuilderOpen(true);
                    }}
                    onBack={() => navigate(-1)}
                    onModelApplied={(trend) =>
                        setAppliedModels((current) => ({
                            ...current,
                            [trend.ticker]: trend,
                        }))
                    }
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

                                <div className="watchlist-panel mb-4 reveal">
                                    <TopBar
                                        trendsUnavailable={trendsUnavailable}
                                        rows={displayRows}
                                        trendsLoading={trendsLoading}
                                        upCount={upCount}
                                        withTrend={withTrend}
                                        refreshingTrends={refreshingTrends}
                                        portfolioPnl={portfolioPnl}
                                        setShowEstimacion={setShowEstimacion}
                                        setIsBuilderOpen={setIsBuilderOpen}
                                    />
                                    <SharesTable
                                        rows={displayRows}
                                        setSelectedTicker={openTicker}
                                        pnlLoading={pnlLoading}
                                        trendsLoading={trendsLoading}
                                        historyByTicker={historyByTicker}
                                    />
                                </div>
                                <BalanceHistoryChart
                                    reloadKey={portfolioVersion}
                                />
                                <ChartBar
                                    ref={portfolioChartRef}
                                    tickers={rows.map(({ ticker }) => ticker)}
                                />
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
                initialTicker={builderTicker}
                onClose={() => {
                    setIsBuilderOpen(false);
                    setBuilderTicker(null);
                }}
                onSaved={loadPortfolio}
            />

            <RiskProfileGate
                reason={
                    user.has_to_redo_risk_profile
                        ? user.risk_profile
                            ? 'expired'
                            : 'required'
                        : null
                }
                onCompleted={(risk) => {
                    setUser((current) =>
                        current
                            ? {
                                  ...current,
                                  risk_profile: risk,
                                  has_to_redo_risk_profile: false,
                              }
                            : current,
                    );
                    loadPortfolio();
                }}
            />
        </div>
    );
}

export default Home;
