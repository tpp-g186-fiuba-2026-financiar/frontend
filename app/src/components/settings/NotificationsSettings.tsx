import { useEffect, useState } from 'react';
import { getUserSharesEndpoint } from '../../api/userShares/getUserSharesEndpoint';
import { getUserAlertSubscriptionsEndpoint } from '../../api/subscriptions/getUserAlertSubscriptions';
import {
    subscribeToPortfolioAlertsEndpoint,
    unsubscribeFromPortfolioAlertsEndpoint,
} from '../../api/subscriptions/portfolioAlertSubscription';
import {
    subscribeToTickerAlertEndpoint,
    unsubscribeFromTickerAlertEndpoint,
} from '../../api/subscriptions/tickerAlertSubscription';

interface TickerRow {
    ticker: string;
    subscribed: boolean;
}

function NotificationsSettings() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [portfolioSubscribed, setPortfolioSubscribed] = useState(false);
    const [savingPortfolio, setSavingPortfolio] = useState(false);
    const [rows, setRows] = useState<TickerRow[]>([]);
    const [savingTicker, setSavingTicker] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const [shares, subscriptions] = await Promise.all([
                    getUserSharesEndpoint(),
                    getUserAlertSubscriptionsEndpoint(),
                ]);
                if (cancelled) return;
                const s = shares.shares;
                const subscribedTickers = new Set(subscriptions.tickers);
                setRows(
                    s.map((share) => ({
                        ticker: share.ticker,
                        subscribed: subscribedTickers.has(share.ticker),
                    })),
                );
                setPortfolioSubscribed(subscriptions.portfolio);
            } catch {
                if (!cancelled)
                    setError('No pudimos cargar tus notificaciones.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    async function handlePortfolioToggle() {
        const next = !portfolioSubscribed;
        setSavingPortfolio(true);
        setError(null);
        setPortfolioSubscribed(next);
        try {
            if (next) {
                await subscribeToPortfolioAlertsEndpoint();
            } else {
                await unsubscribeFromPortfolioAlertsEndpoint();
            }
        } catch {
            setPortfolioSubscribed(!next);
            setError('No pudimos actualizar la subscripción general.');
        } finally {
            setSavingPortfolio(false);
        }
    }

    async function handleTickerToggle(ticker: string) {
        const row = rows.find((r) => r.ticker === ticker);
        if (!row) return;
        const next = !row.subscribed;

        setSavingTicker(ticker);
        setError(null);
        setRows((prev) =>
            prev.map((r) =>
                r.ticker === ticker ? { ...r, subscribed: next } : r,
            ),
        );

        try {
            if (next) {
                await subscribeToTickerAlertEndpoint(ticker);
            } else {
                await unsubscribeFromTickerAlertEndpoint(ticker);
            }
        } catch {
            setRows((prev) =>
                prev.map((r) =>
                    r.ticker === ticker ? { ...r, subscribed: !next } : r,
                ),
            );
            setError(`No pudimos actualizar la subscripción de ${ticker}.`);
        } finally {
            setSavingTicker(null);
        }
    }

    if (loading) {
        return <p className="settings-row-label">Cargando notificaciones...</p>;
    }

    return (
        <div className="notifications-settings">
            {error && <p className="text-danger">{error}</p>}

            <div className="settings-row">
                <div className="settings-row-label">
                    <b>Alertas de portfolio</b>
                    <span>
                        {portfolioSubscribed
                            ? 'Vas a recibir mails de todas tus acciones'
                            : 'No vas a recibir mails de tus acciones'}
                    </span>
                </div>
                <button
                    type="button"
                    className={`theme-toggle${portfolioSubscribed ? ' is-on' : ''}`}
                    onClick={handlePortfolioToggle}
                    disabled={savingPortfolio}
                    role="switch"
                    aria-checked={portfolioSubscribed}
                    aria-label="Activar o desactivar notificaciones de portfolio"
                >
                    <span className="theme-toggle-thumb" />
                </button>
            </div>

            {rows.length === 0 ? (
                <p className="settings-row-label notifications-settings-sublist">
                    No tenés acciones cargadas todavía.
                </p>
            ) : (
                <div className="notifications-settings-sublist">
                    {rows.map((row) => (
                        <div
                            className="settings-row settings-row-sub"
                            key={row.ticker}
                        >
                            <div className="settings-row-label">
                                <b>{row.ticker}</b>
                                <span>
                                    {row.subscribed
                                        ? 'Subscripto'
                                        : 'No subscripto'}
                                </span>
                            </div>
                            <button
                                type="button"
                                className={`theme-toggle${row.subscribed ? ' is-on' : ''}`}
                                onClick={() => handleTickerToggle(row.ticker)}
                                disabled={savingTicker === row.ticker}
                                role="switch"
                                aria-checked={row.subscribed}
                                aria-label={`Activar o desactivar notificaciones de ${row.ticker}`}
                            >
                                <span className="theme-toggle-thumb" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default NotificationsSettings;
