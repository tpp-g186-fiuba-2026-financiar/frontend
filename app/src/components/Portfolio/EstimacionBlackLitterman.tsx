import { useCallback, useEffect, useMemo, useState } from 'react';
import { getPortfolioRecomendacionEndpoint } from '../../api/userShares/getPortfolioRecomendacionEndpoint';
import { getUserSharesPnlEndpoint } from '../../api/userShares/getUserSharesPnlEndpoint';
import AnimatedNumber from '../Layout/AnimatedNumber';
import Bars3D from '../Viz/Bars3D';
import {
    HOLD_THRESHOLD,
    actionOf,
    buildRows,
    diffOf,
    topWithOthers,
    turnoverOf,
    type PesoRow,
} from '../../utils/blRebalance';

interface ApiErrorResponse {
    message?: string;
}

type SortKey = 'peso' | 'diferencia';

function extractErrorMessage(err: unknown): string {
    const maybeAxiosError = err as {
        response?: { data?: ApiErrorResponse };
    };
    return (
        maybeAxiosError.response?.data?.message ??
        'No se pudo calcular la estimación. Intentá de nuevo en unos minutos.'
    );
}

const pp = (value: number) =>
    `${value >= 0 ? '+' : '-'}${Math.abs(value * 100).toFixed(1)} pp`;

interface EstimacionBlackLittermanProps {
    onBack: () => void;
}

function EstimacionBlackLitterman({ onBack }: EstimacionBlackLittermanProps) {
    const [rows, setRows] = useState<PesoRow[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('peso');
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await getPortfolioRecomendacionEndpoint();
                // Los pesos actuales son complementarios: si fallan, se
                // muestra igual la recomendación.
                const actuales: Record<string, number | null> = {};
                try {
                    const pnl = await getUserSharesPnlEndpoint();
                    pnl.shares.forEach((s) => {
                        actuales[s.ticker] =
                            s.weight_percentage != null
                                ? s.weight_percentage / 100
                                : null;
                    });
                } catch {
                    // sin pesos actuales
                }
                if (!cancelled) {
                    setRows(buildRows(res.pesos_recomendados, actuales));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(extractErrorMessage(err));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [attempt]);

    const sorted = useMemo(() => {
        if (!rows) return [];
        if (sortKey === 'peso') return rows;
        return [...rows].sort(
            (a, b) => Math.abs(diffOf(b) ?? 0) - Math.abs(diffOf(a) ?? 0),
        );
    }, [rows, sortKey]);

    const stats = useMemo(() => {
        if (!rows || rows.length === 0) return null;
        const withDiff = rows
            .map((row) => ({ row, diff: diffOf(row) }))
            .filter((x): x is { row: PesoRow; diff: number } => x.diff != null);
        const up = [...withDiff].sort((a, b) => b.diff - a.diff)[0];
        const down = [...withDiff].sort((a, b) => a.diff - b.diff)[0];
        return {
            turnover: turnoverOf(rows),
            up: up && up.diff >= HOLD_THRESHOLD ? up : null,
            down: down && down.diff <= -HOLD_THRESHOLD ? down : null,
        };
    }, [rows]);

    const retry = useCallback(() => setAttempt((n) => n + 1), []);
    const hasActual = !!rows?.some((row) => row.actual != null);

    return (
        <div className="watchlist-panel mb-4 reveal">
            <div className="toolbar">
                <div>
                    <h2 className="mb-0">Estimación Black-Litterman</h2>
                    {!loading && !error && rows && (
                        <p className="summary mb-0">
                            Distribución sugerida sobre {rows.length}{' '}
                            {rows.length === 1 ? 'activo' : 'activos'}
                        </p>
                    )}
                </div>
                <button
                    className="btn btn-outline-light btn-outline-theme"
                    onClick={onBack}
                >
                    ← Volver a mi cartera
                </button>
            </div>

            {loading && (
                <div
                    className="bl-skeleton"
                    role="status"
                    aria-label="Calculando estimación"
                >
                    <div className="bl-kpis">
                        {[0, 1, 2].map((i) => (
                            <span key={i} className="skel bl-skel-kpi" />
                        ))}
                    </div>
                    <span className="skel bl-skel-chart" />
                    <p className="estimacion-loading">
                        Calculando estimación...
                    </p>
                </div>
            )}

            {!loading && error && (
                <div className="px-3 pb-3">
                    <p className="text-danger mb-2">{error}</p>
                    <button className="btn btn-primary" onClick={retry}>
                        Reintentar
                    </button>
                </div>
            )}

            {!loading && !error && rows && rows.length === 0 && (
                <div className="px-3 pb-3">
                    <p className="mb-0">No hay recomendación disponible.</p>
                </div>
            )}

            {!loading && !error && rows && rows.length > 0 && (
                <>
                    {stats && (
                        <div className="bl-kpis">
                            <div className="bl-kpi">
                                <span>Activos</span>
                                <b className="num">
                                    <AnimatedNumber value={rows.length} />
                                </b>
                            </div>
                            <div className="bl-kpi">
                                <span>Rotación sugerida</span>
                                <b className="num">
                                    {stats.turnover != null ? (
                                        <AnimatedNumber
                                            value={stats.turnover * 100}
                                            decimals={1}
                                            suffix="%"
                                        />
                                    ) : (
                                        '—'
                                    )}
                                </b>
                                <small>de la cartera a mover</small>
                            </div>
                            <div className="bl-kpi">
                                <span>Mayor aumento</span>
                                <b className="num up">
                                    {stats.up
                                        ? `${stats.up.row.ticker} ${pp(stats.up.diff)}`
                                        : '—'}
                                </b>
                            </div>
                            <div className="bl-kpi">
                                <span>Mayor reducción</span>
                                <b className="num down">
                                    {stats.down
                                        ? `${stats.down.row.ticker} ${pp(stats.down.diff)}`
                                        : '—'}
                                </b>
                            </div>
                        </div>
                    )}

                    <div className="bl-3d">
                        <div className="bl-3d-head">
                            <span>Cartera actual vs. sugerida</span>
                            <span className="bl-legend">
                                {hasActual && (
                                    <span>
                                        <i
                                            style={{
                                                background: 'var(--accent)',
                                            }}
                                        />
                                        Actual
                                    </span>
                                )}
                                <span>
                                    <i style={{ background: 'var(--up)' }} />
                                    Sugerida
                                </span>
                            </span>
                        </div>
                        <Bars3D
                            items={topWithOthers(rows).map((row) => ({
                                label: row.ticker,
                                values: hasActual
                                    ? [row.actual ?? 0, row.peso]
                                    : [row.peso],
                            }))}
                            seriesLabels={
                                hasActual
                                    ? ['Actual', 'Sugerida']
                                    : ['Sugerida']
                            }
                            ariaLabel={`Pesos de la cartera por acción: ${rows
                                .map(
                                    (row) =>
                                        `${row.ticker} sugerido ${(row.peso * 100).toFixed(1)}%`,
                                )
                                .join(', ')}`}
                        />
                        <p className="bl-hint">
                            Mové el mouse para rotar la escena.
                        </p>
                    </div>

                    <div className="bl-sort" role="group" aria-label="Ordenar">
                        <button
                            type="button"
                            className={sortKey === 'peso' ? 'is-active' : ''}
                            onClick={() => setSortKey('peso')}
                        >
                            Por peso sugerido
                        </button>
                        <button
                            type="button"
                            className={
                                sortKey === 'diferencia' ? 'is-active' : ''
                            }
                            onClick={() => setSortKey('diferencia')}
                            disabled={!hasActual}
                        >
                            Por cambio
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="watchlist">
                            <thead>
                                <tr>
                                    <th>Ticker</th>
                                    <th>Actual</th>
                                    <th>Recomendado</th>
                                    <th>Diferencia</th>
                                    <th>Sugerencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((row, i) => {
                                    const diff = diffOf(row);
                                    const action = actionOf(diff);
                                    return (
                                        <tr
                                            key={row.ticker}
                                            className="row-in"
                                            style={{ ['--i' as string]: i }}
                                        >
                                            <td className="t-ticker">
                                                {row.ticker}
                                            </td>
                                            <td className="num">
                                                {row.actual != null
                                                    ? `${(row.actual * 100).toFixed(1)}%`
                                                    : '—'}
                                            </td>
                                            <td className="rsi-cell">
                                                <span className="rsi-bar bl-bar">
                                                    <i
                                                        style={{
                                                            width: `${(row.peso * 100).toFixed(1)}%`,
                                                        }}
                                                    />
                                                </span>
                                                <span className="num">
                                                    {(row.peso * 100).toFixed(
                                                        1,
                                                    )}
                                                    %
                                                </span>
                                            </td>
                                            <td
                                                className="num"
                                                style={{
                                                    color:
                                                        diff == null ||
                                                        action === 'mantener'
                                                            ? undefined
                                                            : diff > 0
                                                              ? 'var(--up)'
                                                              : 'var(--down)',
                                                }}
                                            >
                                                {diff != null ? pp(diff) : '—'}
                                            </td>
                                            <td>
                                                {action ? (
                                                    <span
                                                        className={`pill ${
                                                            action ===
                                                            'aumentar'
                                                                ? 'pill-up'
                                                                : action ===
                                                                    'reducir'
                                                                  ? 'pill-down'
                                                                  : 'pill-neutral'
                                                        }`}
                                                    >
                                                        {action}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="bl-note">
                        Distribución que propone el modelo Black-Litterman a
                        partir de las señales. Es una estimación informativa, no
                        una recomendación de inversión. Cambios menores a{' '}
                        {(HOLD_THRESHOLD * 100).toFixed(0)} pp se marcan como
                        «mantener».
                    </p>
                </>
            )}
        </div>
    );
}

export default EstimacionBlackLitterman;
