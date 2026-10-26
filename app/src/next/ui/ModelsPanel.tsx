import { useState } from 'react';
import type {
    CompareTrendsResponse,
    ModelPrediction,
} from '../../api/userShares/getShareTrendCompareEndpoint';
import {
    MIN_RELIABLE_CASES,
    pickClearWinner,
    toBacktestAccuracy,
    type BacktestAccuracy,
} from '../../utils/backtestConfidence';
import { Card, CardHead, Empty, Seg, SignalPill, Tip } from './Blocks';
import { LineChart } from './Charts';
import { pct, pct1, shortDate, tone, usd } from '../format';
import { modelLabel, normalizeSignal, probabilityOf } from '../finance';

const CONDITION: Record<string, string> = {
    sobrecompra: 'Subió mucho',
    sobreventa: 'Cayó mucho',
    neutral: 'Normal',
};

function displayName(key: string): string {
    return key.endsWith('-modal')
        ? `${modelLabel(key)} (nube)`
        : modelLabel(key);
}

function friendlyReason(p: ModelPrediction): string {
    const r = (p.reason ?? '').toLowerCase();
    if (
        r.includes('no se pudo contactar') ||
        r.includes('error sending') ||
        r.includes('timeout')
    ) {
        return 'No respondió ahora. Puede estar arrancando: probá de nuevo en un rato.';
    }
    if (
        r.includes('insuficient') ||
        r.includes('suficiente') ||
        r.includes('not enough')
    ) {
        return 'Todavía no hay suficientes precios de esta acción para este modelo.';
    }
    return p.reason || 'No disponible para esta acción.';
}

function volatilityText(key: string, p: ModelPrediction): string | null {
    const fc = p.volatility_forecast;
    if (!fc || !fc.length) return null;
    const last = fc[fc.length - 1];
    return `No predice si sube o baja: estima cuánto se puede mover. ${pct1(fc[0].volatility_pct)} en un día${
        fc.length > 1
            ? ` y ${pct1(last.volatility_pct)} por día a ${last.horizon_days} ruedas`
            : ''
    }${key.startsWith('garch-ann') ? ' (versión con red neuronal)' : ''}.`;
}

export default function ModelsPanel({
    compare,
    loading,
}: {
    compare: CompareTrendsResponse | undefined;
    loading: boolean;
}) {
    const [view, setView] = useState<'pred' | 'res'>('pred');
    const [chartPick, setChartPick] = useState<string | null>(null);

    if (!compare) {
        return (
            <Card i={5}>
                <CardHead title="Qué predice cada modelo" />
                <Empty>
                    {loading
                        ? 'Consultando a los modelos…'
                        : 'No hay predicciones disponibles para esta acción.'}
                </Empty>
            </Card>
        );
    }

    const entries = Object.entries(compare.predictions).sort(([a], [b]) =>
        a.localeCompare(b),
    );
    const measured: Array<[string, BacktestAccuracy]> = [];
    entries.forEach(([k, p]) => {
        const m = p.available ? toBacktestAccuracy(p.backtest) : null;
        if (m) measured.push([k, m]);
    });
    const winner = pickClearWinner(measured);
    // Los que no respondieron se juntan en una sola fila al final.
    const isDown = ([key, p]: [string, ModelPrediction]) =>
        !(p.available && p.predicted_close != null) &&
        !volatilityText(key, p) &&
        friendlyReason(p).startsWith('No respondió');
    const predEntries = entries.filter((e) => !isDown(e));
    const downNames = entries.filter(isDown).map(([k]) => displayName(k));
    const withSeries = entries
        .filter(([, p]) => (p.backtest?.series?.length ?? 0) > 1)
        .map(([k]) => k);
    const byAcc = [...measured]
        .sort((a, b) => b[1].accuracy - a[1].accuracy)
        .map(([k]) => k);
    const chartModel =
        chartPick && withSeries.includes(chartPick)
            ? chartPick
            : (byAcc.find((k) => withSeries.includes(k)) ?? withSeries[0]);
    const series = chartModel
        ? compare.predictions[chartModel].backtest!.series!
        : [];

    return (
        <Card i={5}>
            <CardHead
                title={
                    view === 'pred'
                        ? 'Qué predice cada modelo'
                        : 'Qué tan bien predijeron'
                }
                hint={
                    view === 'pred'
                        ? 'Todos los modelos sobre esta acción, lado a lado. Cada uno mira un plazo distinto.'
                        : 'Comparamos lo que predijo cada modelo en el pasado con lo que pasó después.'
                }
                right={
                    <Seg
                        label="Vista"
                        options={[
                            ['pred', 'Predicción'],
                            ['res', 'Resultados'],
                        ]}
                        value={view}
                        onChange={setView}
                    />
                }
            />
            {view === 'pred' ? (
                <div className="nx-table-wrap">
                    <table className="nx-table nx-models-table">
                        <thead>
                            <tr>
                                <th>Modelo</th>
                                <th>
                                    Señal <Tip k="senal" />
                                </th>
                                <th className="r">
                                    Prob. suba <Tip k="prob" />
                                </th>
                                <th className="r">
                                    RSI <Tip k="rsi" />
                                </th>
                                <th>Condición</th>
                                <th className="r">
                                    Horizonte <Tip k="horizonte" />
                                </th>
                                <th className="r">Último cierre</th>
                                <th className="r">Proyectado</th>
                                <th className="r">Δ%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {predEntries.map(([key, p]) => {
                                const delta =
                                    p.available &&
                                    p.last_close &&
                                    p.predicted_close != null
                                        ? ((p.predicted_close - p.last_close) /
                                              p.last_close) *
                                          100
                                        : null;
                                const pu = probabilityOf(p);
                                const vol = volatilityText(key, p);
                                const abstains =
                                    pu != null &&
                                    normalizeSignal(p.signal) === 'neutral' &&
                                    p.predicted_close === p.last_close;
                                return (
                                    <tr
                                        key={key}
                                        style={{ cursor: 'default' }}
                                        className={
                                            p.available &&
                                            p.predicted_close != null
                                                ? ''
                                                : 'is-off'
                                        }
                                    >
                                        <td>
                                            <b className="nx-ink">
                                                {displayName(key)}
                                            </b>
                                            {key === winner && (
                                                <span
                                                    className="nx-best"
                                                    style={{ marginLeft: 8 }}
                                                >
                                                    EL QUE MÁS ACIERTA
                                                </span>
                                            )}
                                        </td>
                                        {p.available &&
                                        p.predicted_close != null ? (
                                            <>
                                                <td>
                                                    <SignalPill
                                                        signal={normalizeSignal(
                                                            p.signal,
                                                        )}
                                                    />
                                                </td>
                                                <td className="r nx-mono">
                                                    {pu != null ? (
                                                        `${Math.round(pu * 100)}%`
                                                    ) : (
                                                        <span
                                                            className="nx-muted"
                                                            title="Este modelo predice un precio, no una probabilidad."
                                                        >
                                                            no aplica
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="r nx-mono">
                                                    {p.rsi != null
                                                        ? Math.round(p.rsi)
                                                        : '—'}
                                                </td>
                                                <td>
                                                    {p.condition
                                                        ? (CONDITION[
                                                              p.condition
                                                          ] ?? p.condition)
                                                        : '—'}
                                                </td>
                                                <td className="r nx-mono">
                                                    {p.horizon_days != null
                                                        ? `${p.horizon_days} ruedas`
                                                        : '—'}
                                                </td>
                                                <td className="r nx-mono">
                                                    {p.last_close != null
                                                        ? usd(p.last_close)
                                                        : '—'}
                                                </td>
                                                {abstains ? (
                                                    <td
                                                        colSpan={2}
                                                        className="r nx-muted"
                                                        title="Solo proyecta un precio cuando la probabilidad está entre sus casos más claros."
                                                    >
                                                        sin señal: no alcanza el
                                                        umbral
                                                    </td>
                                                ) : (
                                                    <>
                                                        <td className="r nx-mono nx-ink">
                                                            {usd(
                                                                p.predicted_close,
                                                            )}
                                                        </td>
                                                        <td
                                                            className={`r nx-mono ${delta != null ? tone(delta) : ''}`}
                                                        >
                                                            {delta != null
                                                                ? pct(delta, 1)
                                                                : '—'}
                                                        </td>
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <td
                                                colSpan={8}
                                                className="nx-muted"
                                            >
                                                {vol ?? friendlyReason(p)}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                            {downNames.length > 0 && (
                                <tr className="is-off">
                                    <td colSpan={9} className="nx-muted">
                                        <b className="nx-ink">
                                            No respondieron ahora:
                                        </b>{' '}
                                        {downNames.join(', ')}. Pueden estar
                                        arrancando; probá de nuevo en un rato.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <>
                    <p
                        className="nx-muted"
                        style={{ fontSize: 12.5, margin: '0 0 12px' }}
                    >
                        {winner
                            ? `${displayName(winner)} es el que mejor acertó con esta acción, con un margen claro sobre el azar y sobre el resto.`
                            : measured.length
                              ? 'Ningún modelo se destaca con claridad: con los casos que hay, sus aciertos no se distinguen del azar o entre sí.'
                              : 'Todavía no hay resultados medidos para esta acción.'}
                    </p>
                    <div className="nx-res-grid">
                        {entries.map(([key, p]) => {
                            const m = p.available
                                ? toBacktestAccuracy(p.backtest)
                                : null;
                            const mae = p.backtest?.mae;
                            const err =
                                mae == null || probabilityOf(p) != null
                                    ? null
                                    : key.startsWith('arima') && p.last_close
                                      ? (mae / p.last_close) * 100
                                      : mae * 100;
                            const strat = m
                                ? p.backtest?.avg_strategy_return_pct
                                : null;
                            const hold = p.backtest?.avg_buy_hold_return_pct;
                            return (
                                <div
                                    key={key}
                                    className={`nx-res-card ${key === winner ? 'is-best' : ''}`}
                                >
                                    <div className="nx-sys-row">
                                        <b className="nx-ink">
                                            {displayName(key)}
                                        </b>
                                        {key === winner && (
                                            <span className="nx-best">
                                                ★ MEJOR
                                            </span>
                                        )}
                                    </div>
                                    {m ? (
                                        <>
                                            <div className="nx-res-score">
                                                {Math.round(m.accuracy * 100)}%
                                            </div>
                                            <div className="nx-res-txt">
                                                acertó si subía o bajaba en{' '}
                                                {Math.round(m.accuracy * 100)}{' '}
                                                de cada 100 casos
                                                {p.backtest?.cases &&
                                                p.backtest.cases >
                                                    m.observations
                                                    ? ` en que opinó (opinó en ${m.observations} de ${p.backtest.cases})`
                                                    : ''}
                                            </div>
                                            <div
                                                className="nx-bar-track"
                                                style={{
                                                    height: 6,
                                                    margin: '8px 0 6px',
                                                    position: 'relative',
                                                }}
                                            >
                                                <div
                                                    className="nx-bar-fill"
                                                    style={{
                                                        width: `${m.accuracy * 100}%`,
                                                        background:
                                                            m.low > 0.5
                                                                ? 'var(--nx-up)'
                                                                : 'var(--nx-accent)',
                                                    }}
                                                />
                                                <div
                                                    className="nx-bar-mark"
                                                    style={{
                                                        left: '50%',
                                                        background:
                                                            'var(--nx-ink-3)',
                                                    }}
                                                />
                                            </div>
                                            <div className="nx-res-small">
                                                Con {m.observations} casos, lo
                                                real está entre{' '}
                                                {Math.round(m.low * 100)}% y{' '}
                                                {Math.round(m.high * 100)}%
                                                {m.observations <
                                                MIN_RELIABLE_CASES
                                                    ? ' · pocos casos, orientativo'
                                                    : ''}
                                            </div>
                                            <div className="nx-res-small">
                                                {p.backtest?.scope ===
                                                'oos_global'
                                                    ? 'Medido al entrenar, con datos que el modelo no había visto, sobre todas las acciones juntas.'
                                                    : 'Medido con casos posteriores a su entrenamiento.'}
                                            </div>
                                        </>
                                    ) : (
                                        <div
                                            className="nx-res-txt"
                                            style={{ margin: '8px 0' }}
                                        >
                                            {(p.backtest?.cases ?? 0) > 0 &&
                                            !p.backtest?.observations
                                                ? `En los últimos ${p.backtest!.cases} casos no dio ninguna señal: solo opina en sus casos más claros.`
                                                : p.volatility_forecast?.length
                                                  ? 'Mide cuánto se mueve, no si sube o baja: no tiene acierto de dirección.'
                                                  : p.available
                                                    ? 'Todavía sin resultados medidos.'
                                                    : 'Sin datos: el modelo no respondió.'}
                                        </div>
                                    )}
                                    {err != null && (
                                        <div className="nx-res-small">
                                            Se equivocó en promedio {pct1(err)}{' '}
                                            en el precio
                                        </div>
                                    )}
                                    {strat != null && hold != null && (
                                        <div className="nx-res-small">
                                            Siguiendo su señal: {pct(strat)} vs.
                                            comprar y mantener: {pct(hold)}{' '}
                                            (promedio por señal)
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {chartModel && series.length > 1 ? (
                        <div style={{ marginTop: 16 }}>
                            <CardHead
                                title={`Lo que predijo ${displayName(chartModel)} vs. lo que pasó`}
                                hint="Cada punto es una predicción del pasado y el precio real de ese día."
                                right={
                                    withSeries.length > 1 && (
                                        <label className="nx-field">
                                            <select
                                                aria-label="Modelo del gráfico"
                                                value={chartModel}
                                                onChange={(e) =>
                                                    setChartPick(e.target.value)
                                                }
                                            >
                                                {withSeries.map((k) => (
                                                    <option key={k} value={k}>
                                                        {displayName(k)}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    )
                                }
                            />
                            <div className="nx-legend">
                                <span>
                                    <i
                                        style={{
                                            background: 'var(--nx-accent)',
                                        }}
                                    />
                                    Predijo
                                </span>
                                <span>
                                    <i
                                        style={{ background: 'var(--nx-ink)' }}
                                    />
                                    Pasó
                                </span>
                            </div>
                            <LineChart
                                ariaLabel="Predicciones del pasado contra el precio real"
                                height={240}
                                labels={series.map((s) => s.date)}
                                xFmt={shortDate}
                                yFmt={(v) => usd(v, 0)}
                                series={[
                                    {
                                        label: 'Predijo',
                                        values: series.map((s) => s.predicted),
                                        color: 'var(--nx-accent)',
                                        dash: '5 4',
                                    },
                                    {
                                        label: 'Pasó',
                                        values: series.map((s) => s.actual),
                                        color: 'var(--nx-ink)',
                                    },
                                ]}
                            />
                        </div>
                    ) : (
                        <p
                            className="nx-muted"
                            style={{ fontSize: 12.5, marginTop: 14 }}
                        >
                            El gráfico de predicho contra real aparece cuando
                            algún modelo tiene su historial guardado.
                        </p>
                    )}
                </>
            )}
        </Card>
    );
}
