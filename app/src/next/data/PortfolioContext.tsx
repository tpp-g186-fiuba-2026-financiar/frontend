import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
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
    type PortfolioPnlSummary,
    type SharePnlItem,
} from '../../api/userShares/getUserSharesPnlEndpoint';
import {
    getShareTrendCompareEndpoint,
    type CompareTrendsResponse,
} from '../../api/userShares/getShareTrendCompareEndpoint';
import { getShareHistoryEndpoint } from '../../api/userShares/getShareHistoryEndpoint';
import {
    getUserSharesBalanceHistoryEndpoint,
    type DailyBalancePoint,
} from '../../api/userShares/getUserSharesBalanceHistoryEndpoint';
import {
    loadConfig,
    resolveDefaultModel,
    type DefaultModelsConfig,
} from '../../utils/defaultModels';

// Estado de la cartera compartido por todas las páginas del shell: se carga
// una sola vez y se refresca con reload() (por ejemplo, al editar la cartera).
// Cada servicio puede fallar sin bloquear al resto: la tabla aparece apenas
// llegan las acciones y lo demás se completa a medida que responde.

export interface Holding {
    ticker: string;
    shareId: number;
    quantity: number;
    entryPrice: number | null;
    currentPrice: number | null;
    pnlAmount: number | null;
    pnlPercentage: number | null;
    weight: number | null;
    // tendencia del modelo elegido por el usuario (o la del backend)
    trend: ShareTrend | null;
}

export interface PricePoint {
    ts: number;
    close: number;
}

interface PortfolioState {
    user: UserResponse | null;
    userError: boolean;
    holdings: Holding[];
    pnl: PortfolioPnlSummary | null;
    compare: Record<string, CompareTrendsResponse>;
    history: Record<string, PricePoint[]>;
    balanceHistory: DailyBalancePoint[];
    modelConfig: DefaultModelsConfig | null;
    loading: boolean;
    trendsLoading: boolean;
    error: string | null;
    reload: () => Promise<void>;
    retryUser: () => void;
    patchUser: (patch: Partial<UserResponse>) => void;
    // vuelve a leer qué modelo eligió el usuario en Ajustes
    refreshModelConfig: () => void;
}

const PortfolioContext = createContext<PortfolioState | null>(null);

// Los modelos se calculan al pedir la pantalla y a veces tardan mucho: pasado
// este tiempo esa acción queda "sin datos" en vez de quedar esperando.
const COMPARE_TIMEOUT_MS = 90_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), ms);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            },
        );
    });
}

function toHoldings(
    shares: UserShareItem[],
    trends: ShareTrend[] | null,
    pnl: Record<string, SharePnlItem> | null,
): Holding[] {
    const byTicker = new Map((trends ?? []).map((t) => [t.ticker, t]));
    return shares.map((s) => {
        const p = pnl?.[s.ticker];
        return {
            ticker: s.ticker,
            shareId: s.id,
            quantity: s.quantity,
            entryPrice: s.entry_price,
            currentPrice: p?.current_price ?? null,
            pnlAmount: p?.pnl_amount ?? null,
            pnlPercentage: p?.pnl_percentage ?? null,
            weight: p?.weight_percentage ?? null,
            trend: byTicker.get(s.ticker) ?? null,
        };
    });
}

// Reemplaza la tendencia por la del modelo que eligió el usuario en Ajustes.
function withPreferred(
    h: Holding,
    config: DefaultModelsConfig | null,
    compare: CompareTrendsResponse | undefined,
): Holding {
    if (!config || !compare) return h;
    const model = resolveDefaultModel(config, h.ticker, compare);
    const p = model ? compare.predictions[model] : undefined;
    if (!model || !p || !p.available) return h;
    return {
        ...h,
        trend: {
            ...(h.trend ?? { ticker: h.ticker, retryable: false }),
            ticker: h.ticker,
            available: true,
            signal: p.signal,
            condition: p.condition,
            rsi: p.rsi,
            horizon_days: p.horizon_days,
            last_close: p.last_close,
            predicted_close: p.predicted_close,
            as_of: p.as_of,
            model,
            model_version: p.model_version,
            reason: p.reason,
            probability_up:
                (p as { probability_up?: number | null }).probability_up ??
                null,
        },
    };
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [userError, setUserError] = useState(false);
    const [userAttempt, setUserAttempt] = useState(0);
    const [base, setBase] = useState<Holding[]>([]);
    const [pnl, setPnl] = useState<PortfolioPnlSummary | null>(null);
    const [compare, setCompare] = useState<
        Record<string, CompareTrendsResponse>
    >({});
    const [history, setHistory] = useState<Record<string, PricePoint[]>>({});
    const [balanceHistory, setBalanceHistory] = useState<DailyBalancePoint[]>(
        [],
    );
    const [modelConfig, setModelConfig] = useState<DefaultModelsConfig | null>(
        null,
    );
    const [loading, setLoading] = useState(true);
    const [trendsLoading, setTrendsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        let timer: number | undefined;
        getUserEndpoint().then(
            (u) => {
                if (cancelled) return;
                setUser(u);
                setUserError(false);
            },
            () => {
                if (cancelled) return;
                setUserError(true);
                timer = window.setTimeout(
                    () => setUserAttempt((a) => a + 1),
                    10_000,
                );
            },
        );
        return () => {
            cancelled = true;
            if (timer) window.clearTimeout(timer);
        };
    }, [userAttempt]);

    const reload = useCallback(async () => {
        try {
            const shares = await getUserSharesEndpoint();
            setBase(toHoldings(shares.shares, null, null));
            setError(null);
            setLoading(false);
            setTrendsLoading(true);
            const [pnlRes, trendsRes] = await Promise.allSettled([
                getUserSharesPnlEndpoint(),
                getUserSharesTrendsEndpoint(),
            ]);
            const pnlByTicker: Record<string, SharePnlItem> | null =
                pnlRes.status === 'fulfilled'
                    ? Object.fromEntries(
                          pnlRes.value.shares.map((s) => [s.ticker, s]),
                      )
                    : null;
            setPnl(
                pnlRes.status === 'fulfilled' ? pnlRes.value.portfolio : null,
            );
            setBase(
                toHoldings(
                    shares.shares,
                    trendsRes.status === 'fulfilled'
                        ? trendsRes.value.trends
                        : null,
                    pnlByTicker,
                ),
            );
            setTrendsLoading(false);
            getUserSharesBalanceHistoryEndpoint().then(setBalanceHistory, () =>
                setBalanceHistory([]),
            );
        } catch {
            setError('No se pudo cargar tu cartera.');
            setLoading(false);
            setTrendsLoading(false);
        }
    }, []);

    useEffect(() => {
        // carga inicial: reload() pide la cartera y actualiza el estado al llegar
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void reload();
    }, [reload]);

    const tickersKey = base.map((h) => h.ticker).join(',');

    // Comparación de modelos e historial de precios: en segundo plano.
    useEffect(() => {
        if (!tickersKey) return;
        let cancelled = false;
        const tickers = tickersKey.split(',');
        loadConfig().then((c) => !cancelled && setModelConfig(c));
        // Cada acción se muestra apenas llega su comparación: una que tarde (o
        // que el servidor deje colgada) no traba a las demás.
        tickers.forEach((t) => {
            withTimeout(
                getShareTrendCompareEndpoint(t),
                COMPARE_TIMEOUT_MS,
            ).then(
                (res) => {
                    if (!cancelled) setCompare((c) => ({ ...c, [t]: res }));
                },
                () => undefined,
            );
        });
        Promise.allSettled(tickers.map((t) => getShareHistoryEndpoint(t))).then(
            (res) => {
                if (cancelled) return;
                const out: Record<string, PricePoint[]> = {};
                res.forEach((r, i) => {
                    if (r.status === 'fulfilled')
                        out[tickers[i]] = r.value.prices;
                });
                setHistory(out);
            },
        );
        return () => {
            cancelled = true;
        };
    }, [tickersKey]);

    const holdings = useMemo(
        () => base.map((h) => withPreferred(h, modelConfig, compare[h.ticker])),
        [base, modelConfig, compare],
    );

    const value = useMemo<PortfolioState>(
        () => ({
            user,
            userError,
            holdings,
            pnl,
            compare,
            history,
            balanceHistory,
            modelConfig,
            loading,
            trendsLoading,
            error,
            reload,
            retryUser: () => setUserAttempt((a) => a + 1),
            patchUser: (patch: Partial<UserResponse>) =>
                setUser((u) => (u ? { ...u, ...patch } : u)),
            refreshModelConfig: () =>
                void loadConfig().then(setModelConfig, () => undefined),
        }),
        [
            user,
            userError,
            holdings,
            pnl,
            compare,
            history,
            balanceHistory,
            modelConfig,
            loading,
            trendsLoading,
            error,
            reload,
        ],
    );

    return (
        <PortfolioContext.Provider value={value}>
            {children}
        </PortfolioContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePortfolio(): PortfolioState {
    const ctx = useContext(PortfolioContext);
    if (!ctx)
        throw new Error('usePortfolio debe usarse dentro de PortfolioProvider');
    return ctx;
}
