import { useEffect, useState } from 'react';
import { usePortfolio } from '../data/PortfolioContext';
import { useHoldingsView } from '../data/useHoldingsView';
import { getUserAlertSubscriptionsEndpoint } from '../../api/subscriptions/getUserAlertSubscriptions';
import {
    subscribeToPortfolioAlertsEndpoint,
    unsubscribeFromPortfolioAlertsEndpoint,
} from '../../api/subscriptions/portfolioAlertSubscription';
import {
    subscribeToTickerAlertEndpoint,
    unsubscribeFromTickerAlertEndpoint,
} from '../../api/subscriptions/tickerAlertSubscription';
import { Card, CardHead, Empty, Explain, PageHead } from '../ui/Blocks';
import { forgetRemote } from '../data/useRemote';
import Icon from '../ui/Icon';
import { pct, tone, usd, usd0 } from '../format';

function Switch({
    on,
    label,
    busy,
    onToggle,
}: {
    on: boolean;
    label: string;
    busy?: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            className="nx-switch"
            disabled={busy}
            onClick={onToggle}
        />
    );
}

export default function Alertas() {
    const { user, holdings } = usePortfolio();
    const { rows, totalValue } = useHoldingsView();
    const [portfolio, setPortfolio] = useState(false);
    const [tickers, setTickers] = useState<Set<string>>(new Set());
    const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
    const [busy, setBusy] = useState<string | null>(null);
    const [msg, setMsg] = useState<string | null>(null);
    const [pick, setPick] = useState('');

    useEffect(() => {
        getUserAlertSubscriptionsEndpoint().then(
            (s) => {
                setPortfolio(s.portfolio);
                setTickers(new Set(s.tickers));
                setState('ok');
            },
            () => setState('error'),
        );
    }, []);

    const toggleTicker = async (t: string) => {
        const on = tickers.has(t);
        setBusy(t);
        setMsg(null);
        try {
            await (on
                ? unsubscribeFromTickerAlertEndpoint(t)
                : subscribeToTickerAlertEndpoint(t));
            forgetRemote('alert-subs');
            setTickers((s) => {
                const n = new Set(s);
                if (on) n.delete(t);
                else n.add(t);
                return n;
            });
            setMsg(`Alerta de ${t} ${on ? 'pausada' : 'activada'}.`);
        } catch {
            setMsg('No pudimos guardar el cambio. Probá de nuevo.');
        } finally {
            setBusy(null);
        }
    };

    const togglePortfolio = async () => {
        setBusy('__portfolio');
        setMsg(null);
        try {
            await (portfolio
                ? unsubscribeFromPortfolioAlertsEndpoint()
                : subscribeToPortfolioAlertsEndpoint());
            setPortfolio(!portfolio);
            setMsg(
                `Alertas de toda la cartera ${portfolio ? 'pausadas' : 'activadas'}.`,
            );
        } catch {
            setMsg('No pudimos guardar el cambio. Probá de nuevo.');
        } finally {
            setBusy(null);
        }
    };

    const available = holdings
        .map((h) => h.ticker)
        .filter((t) => !tickers.has(t));
    const firstName = user?.full_name.split(/\s+/)[0] ?? '';

    return (
        <>
            <PageHead
                eyebrow="Alertas"
                title="Que FinanciAr te avise"
                sub="Te mandamos un mail cuando un modelo cambia de opinión sobre una de tus acciones, y un resumen todos los lunes."
            />
            <Explain title="Cómo funcionan">
                <p>
                    Todos los días revisamos las acciones que seguís y{' '}
                    <b>
                        comparamos lo que dicen los modelos hoy con lo que
                        decían ayer
                    </b>
                    . Si cambió la señal (por ejemplo, de Neutral a Alza), te
                    mandamos un mail. Además, <b>los lunes</b> te llega un
                    resumen de tu cartera.
                </p>
            </Explain>
            {msg && (
                <p className="nx-why" role="status">
                    {msg}
                </p>
            )}
            <div className="nx-grid">
                <Card span="s5" i={1}>
                    <CardHead title="Nueva alerta" />
                    <div className="nx-form-grid">
                        <label
                            className="nx-field"
                            style={{ gridColumn: '1 / -1' }}
                        >
                            Acción
                            <select
                                value={pick}
                                onChange={(e) => setPick(e.target.value)}
                            >
                                <option value="">Elegí una acción…</option>
                                {available.map((t) => (
                                    <option key={t}>{t}</option>
                                ))}
                            </select>
                        </label>
                        <div
                            className="nx-muted"
                            style={{ gridColumn: '1 / -1', fontSize: 12.5 }}
                        >
                            Te avisamos cuando{' '}
                            <b className="nx-ink">cambia la señal</b> de esa
                            acción.
                        </div>
                    </div>
                    <button
                        type="button"
                        className="nx-btn primary"
                        style={{
                            marginTop: 16,
                            width: '100%',
                            justifyContent: 'center',
                        }}
                        disabled={!pick || busy != null}
                        onClick={async () => {
                            await toggleTicker(pick);
                            setPick('');
                        }}
                    >
                        <Icon name="plus" /> Crear alerta
                    </button>
                </Card>
                <Card span="s7" i={2}>
                    <CardHead
                        title="Tus alertas"
                        hint="Activá o pausá cada una"
                    />
                    {state === 'loading' && <Empty>Cargando…</Empty>}
                    {state === 'error' && (
                        <Empty>No pudimos cargar tus alertas.</Empty>
                    )}
                    {state === 'ok' && (
                        <div className="nx-list">
                            <div className="nx-li">
                                <Switch
                                    on={portfolio}
                                    label="Alertas de toda la cartera"
                                    busy={busy === '__portfolio'}
                                    onToggle={togglePortfolio}
                                />
                                <div className="nx-grow">
                                    <b className="nx-ink">Toda la cartera</b> ·
                                    cambia la señal de cualquier acción
                                    <div
                                        className="nx-muted"
                                        style={{ fontSize: 11.5 }}
                                    >
                                        por mail
                                    </div>
                                </div>
                            </div>
                            {[...tickers].sort().map((t) => (
                                <div className="nx-li" key={t}>
                                    <Switch
                                        on
                                        label={`Alerta de ${t}`}
                                        busy={busy === t}
                                        onToggle={() => toggleTicker(t)}
                                    />
                                    <div className="nx-grow">
                                        <b className="nx-ink">{t}</b> · cambia
                                        la señal
                                        <div
                                            className="nx-muted"
                                            style={{ fontSize: 11.5 }}
                                        >
                                            por mail
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {tickers.size === 0 && (
                                <p
                                    className="nx-muted"
                                    style={{ marginTop: 10 }}
                                >
                                    Todavía no seguís ninguna acción en
                                    particular.
                                </p>
                            )}
                        </div>
                    )}
                </Card>
                <Card span="s6" i={3}>
                    <CardHead title="¿Cuándo te avisamos?" />
                    <div className="nx-timeline">
                        {[
                            [
                                'Cada mañana',
                                'Revisamos las acciones que seguís',
                            ],
                            ['', 'Vemos qué dicen los modelos hoy'],
                            ['', 'Lo comparamos con lo que decían ayer'],
                            [
                                'Si cambió',
                                'Te mandamos un mail con la nueva señal',
                            ],
                            [
                                'Los lunes',
                                'Además, te llega el resumen semanal',
                            ],
                        ].map(([w, t]) => (
                            <div className="nx-tl-item" key={t}>
                                {w && <div className="when">{w}</div>}
                                {t}
                            </div>
                        ))}
                    </div>
                </Card>
                <Card span="s6" i={4}>
                    <CardHead
                        title="Mail del lunes"
                        hint="Así se ve el resumen semanal"
                    />
                    <div
                        style={{
                            border: '1px solid var(--nx-line)',
                            borderRadius: 12,
                            padding: 14,
                            background: 'var(--nx-panel-2)',
                            fontSize: 12.5,
                        }}
                    >
                        <div
                            className="nx-muted nx-mono"
                            style={{ fontSize: 11 }}
                        >
                            De: FinanciAr · Asunto: tu resumen semanal de
                            inversiones
                        </div>
                        <div
                            className="nx-ink"
                            style={{ margin: '10px 0 8px' }}
                        >
                            Hola {firstName}, así cerró tu semana:
                        </div>
                        {rows.slice(0, 5).map((r) => (
                            <div
                                className="nx-sys-row nx-mono"
                                key={r.ticker}
                                style={{ fontSize: 11.5 }}
                            >
                                <span>
                                    {r.ticker} × {r.quantity}
                                </span>
                                <span>
                                    {r.price != null ? usd(r.price) : '—'}
                                </span>
                                <span
                                    className={
                                        r.week != null ? tone(r.week) : ''
                                    }
                                >
                                    {r.week != null ? pct(r.week) : '—'}
                                </span>
                            </div>
                        ))}
                        <div className="nx-muted" style={{ marginTop: 6 }}>
                            {rows.length > 5
                                ? `… y ${rows.length - 5} acciones más · `
                                : ''}
                            Total {usd0(totalValue)}
                        </div>
                    </div>
                </Card>
            </div>
        </>
    );
}
