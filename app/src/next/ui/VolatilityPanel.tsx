// Panel de volatilidad de Análisis de acción: régimen de hoy, cómo se espera
// que evolucione, cuánto puede moverse la posición del usuario, qué tan grande
// es la predicción frente al ruido y cómo le fue a GARCH con esta acción.
// Datos: GET /user/shares/{ticker}/volatility (GARCH de api-ml).

import { useState } from 'react';
import type { VolatilityForecast } from '../../api/next/endpoints';
import { Card, CardHead, Tip } from './Blocks';
import { num, pct1, usd0 } from '../format';

const Z = { 68: 1, 95: 1.96 } as const;

const NIVEL: Record<string, string> = {
    baja: 'Tranquila',
    normal: 'Normal',
    alta: 'Agitada',
};

export default function VolatilityPanel({
    vol,
    last,
    position,
    view,
}: {
    vol: VolatilityForecast;
    last: number;
    position: number | null;
    view: { name: string; ret: number; h: number } | null;
}) {
    const [conf, setConf] = useState<68 | 95>(68);
    const daily = vol.daily_volatility_pct.map((v) => v / 100);
    const h = vol.horizon_days;
    const sigmaAt = (k: number) =>
        Math.sqrt(
            daily
                .slice(0, Math.max(1, Math.min(k, daily.length)))
                .reduce((s, d) => s + d * d, 0),
        );
    const sigma = vol.cumulative_volatility_pct / 100;
    const z = Z[conf];
    const lo = Math.exp(-z * sigma);
    const hi = Math.exp(z * sigma);
    const reg = vol.regime;
    const bt = vol.backtest;

    // Sin precio esperado (clasificadores en neutral: ret = 0) no hay magnitud
    // que comparar.
    const ratio =
        view && view.ret !== 0
            ? Math.abs(Math.log(1 + view.ret)) / sigmaAt(view.h)
            : null;
    const ruido =
        ratio == null
            ? null
            : ratio < 0.25
              ? 'chica frente a lo que se mueve: el resultado lo va a definir el ruido'
              : ratio < 0.6
                ? 'moderada: menor que el movimiento normal de la acción'
                : 'grande comparada con el movimiento normal';

    return (
        <Card span="s12" i={5} className="nx-vol">
            <CardHead
                title={
                    <>
                        Volatilidad <Tip k="garch" />
                    </>
                }
                hint="La dirección casi no se puede predecir; cuánto se mueve una acción, sí. GARCH(1,1) ajustado con el histórico de esta acción."
            />
            <div className="nx-vol-grid">
                <section>
                    <div className="nx-eyebrow">Hoy</div>
                    {reg?.percentile != null ? (
                        <>
                            <div className={`nx-vol-level lv-${reg.level}`}>
                                {NIVEL[reg.level ?? 'normal']}
                            </div>
                            <div
                                className="nx-vol-gauge"
                                role="img"
                                aria-label={`Percentil ${Math.round(reg.percentile)} de sus últimos dos años`}
                            >
                                <span style={{ left: `${reg.percentile}%` }} />
                            </div>
                            <div className="nx-vol-scale">
                                <span>tranquila</span>
                                <span>agitada</span>
                            </div>
                            <p>
                                Se espera que se mueva{' '}
                                <b>±{pct1(reg.daily_pct)}</b> por día, más que
                                el {Math.round(reg.percentile)}% de los días de
                                sus últimos dos años.
                                {reg.long_run_daily_pct != null && (
                                    <>
                                        {' '}
                                        Su nivel habitual es ±
                                        {pct1(reg.long_run_daily_pct)}.
                                    </>
                                )}
                            </p>
                        </>
                    ) : (
                        <p>
                            ±{pct1(vol.daily_volatility_pct[0])} por día
                            esperado para la próxima rueda.
                        </p>
                    )}
                </section>

                <section>
                    <div className="nx-eyebrow">Próximas {h} ruedas</div>
                    <PathChart
                        daily={vol.daily_volatility_pct}
                        longRun={reg?.long_run_daily_pct ?? null}
                    />
                    <p>
                        {reg?.long_run_daily_pct != null &&
                        vol.daily_volatility_pct[0] > reg.long_run_daily_pct
                            ? 'Viene de un período agitado: GARCH espera que el movimiento diario baje hacia su nivel habitual.'
                            : 'GARCH espera que el movimiento diario vuelva de a poco a su nivel habitual.'}
                    </p>
                </section>

                <section>
                    <div className="nx-vol-head">
                        <div className="nx-eyebrow">
                            {position != null ? 'Tu posición' : 'Precio'} en {h}{' '}
                            ruedas
                        </div>
                        <div className="nx-seg">
                            {([68, 95] as const).map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    aria-pressed={conf === c}
                                    onClick={() => setConf(c)}
                                >
                                    {c}%
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="nx-vol-range">
                        <b>{usd0((position ?? last) * lo)}</b>
                        <span>a</span>
                        <b>{usd0((position ?? last) * hi)}</b>
                    </div>
                    <p>
                        Con {conf}% de probabilidad según GARCH
                        {position != null ? (
                            <>
                                : hoy vale {usd0(position)}, podría perder hasta{' '}
                                <b className="nx-down">
                                    {usd0(position * (1 - lo))}
                                </b>{' '}
                                o ganar{' '}
                                <b className="nx-up">
                                    {usd0(position * (hi - 1))}
                                </b>
                                .
                            </>
                        ) : (
                            <> (precio hoy {usd0(last)}).</>
                        )}
                    </p>
                    {ratio != null && view && (
                        <p className="nx-vol-noise">
                            La predicción de {view.name} (
                            {view.ret >= 0 ? '+' : ''}
                            {pct1(view.ret * 100)} en {view.h} ruedas) equivale
                            a <b>{num(ratio)} desvíos</b>: es {ruido}.
                        </p>
                    )}
                </section>
            </div>
            {bt && <Backtest bt={bt} />}
        </Card>
    );
}

function PathChart({
    daily,
    longRun,
}: {
    daily: number[];
    longRun: number | null;
}) {
    const W = 320;
    const H = 110;
    const P = 8;
    const vals = longRun != null ? [...daily, longRun] : daily;
    const max = Math.max(...vals) * 1.15;
    const min = Math.min(...vals) * 0.85;
    const x = (i: number) =>
        P + (i / Math.max(daily.length - 1, 1)) * (W - 2 * P);
    const y = (v: number) =>
        H - P - ((v - min) / (max - min || 1)) * (H - 2 * P);
    const d = daily.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('');
    return (
        <svg
            className="nx-vol-path"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="Volatilidad diaria esperada para cada una de las próximas ruedas"
        >
            {longRun != null && (
                <>
                    <line
                        className="lr"
                        x1={P}
                        x2={W - P}
                        y1={y(longRun)}
                        y2={y(longRun)}
                    />
                    <text x={W - P} y={y(longRun) - 4} textAnchor="end">
                        habitual ±{pct1(longRun)}
                    </text>
                </>
            )}
            <path className="ln" d={d} />
            <circle cx={x(0)} cy={y(daily[0])} r={3.5} />
            <text x={x(0) + 6} y={y(daily[0]) - 6}>
                ±{pct1(daily[0])}
            </text>
            <text x={W - P} y={H - 1} textAnchor="end">
                rueda {daily.length}
            </text>
        </svg>
    );
}

function Backtest({ bt }: { bt: NonNullable<VolatilityForecast['backtest']> }) {
    const [sel, setSel] = useState<number | null>(null);
    const w = bt.windows;
    const W = 720;
    const H = 170;
    const P = 22;
    const max =
        Math.max(
            ...w.map((x) =>
                Math.max(1.96 * x.forecast_pct, Math.abs(x.return_pct)),
            ),
        ) * 1.08;
    const y = (v: number) => H / 2 - (v / max) * (H / 2 - 12);
    const step = (W - 2 * P) / w.length;
    const cur = sel != null ? w[sel] : null;
    return (
        <div className="nx-vol-bt">
            <div className="nx-vol-head">
                <div>
                    <div className="nx-eyebrow">
                        Cómo le fue a GARCH con esta acción
                    </div>
                    <p>
                        Las últimas {w.length} ventanas de {bt.horizon_days}{' '}
                        ruedas. En cada una, GARCH se ajustó solo con los datos
                        anteriores: la franja es el rango que pronosticó y el
                        punto, lo que hizo el precio. Tocá una ventana.
                    </p>
                </div>
                <div className="nx-vol-kpis">
                    <div>
                        <b>{pct1(bt.inside_68_pct)}</b>
                        <span>dentro de ±1 desvío (esperado 68%)</span>
                    </div>
                    <div>
                        <b>{pct1(bt.inside_95_pct)}</b>
                        <span>dentro de ±1,96 (esperado 95%)</span>
                    </div>
                </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    style={{ minWidth: 520 }}
                    role="img"
                    aria-label="Rango pronosticado por GARCH contra el movimiento real en cada ventana"
                >
                    <line
                        className="zero"
                        x1={P}
                        x2={W - P}
                        y1={y(0)}
                        y2={y(0)}
                    />
                    {w.map((x, i) => {
                        const cx = P + step * (i + 0.5);
                        const out = Math.abs(x.return_pct) > x.forecast_pct;
                        return (
                            <g
                                key={x.as_of}
                                className={`win ${sel === i ? 'sel' : ''}`}
                                onClick={() => setSel(sel === i ? null : i)}
                                role="button"
                                aria-label={`Ventana desde ${x.as_of}`}
                            >
                                <rect
                                    className="hit"
                                    x={cx - step / 2}
                                    y={0}
                                    width={step}
                                    height={H}
                                />
                                <rect
                                    className="b95"
                                    x={cx - step * 0.32}
                                    width={step * 0.64}
                                    y={y(1.96 * x.forecast_pct)}
                                    height={
                                        y(-1.96 * x.forecast_pct) -
                                        y(1.96 * x.forecast_pct)
                                    }
                                    rx={2}
                                />
                                <rect
                                    className="b68"
                                    x={cx - step * 0.32}
                                    width={step * 0.64}
                                    y={y(x.forecast_pct)}
                                    height={
                                        y(-x.forecast_pct) - y(x.forecast_pct)
                                    }
                                    rx={2}
                                />
                                <circle
                                    className={out ? 'out' : 'in'}
                                    cx={cx}
                                    cy={y(x.return_pct)}
                                    r={3.6}
                                />
                            </g>
                        );
                    })}
                </svg>
            </div>
            <div className="nx-vol-foot">
                {cur ? (
                    <span>
                        Desde el {cur.as_of}: GARCH esperaba ±
                        {pct1(cur.forecast_pct)}, la acción hizo{' '}
                        {cur.return_pct >= 0 ? '+' : ''}
                        {pct1(cur.return_pct)} (se movió ±
                        {pct1(cur.realized_pct)}).
                    </span>
                ) : (
                    <span>
                        Error medio del pronóstico: {pct1(bt.mae_garch_pct)}{' '}
                        (GARCH) contra {pct1(bt.mae_naive_pct)} usando solo la
                        volatilidad de las últimas 20 ruedas.
                    </span>
                )}
            </div>
            <p className="nx-vol-note">
                Sobre las 20 líderes, 2021-2026: a 20 ruedas el precio quedó
                dentro del rango de GARCH el 72% de las veces (±1 desvío) y el
                94% (±1,96), cerca de lo esperado. Con solo la volatilidad de
                las últimas 20 ruedas, 60% y 88%: subestima los movimientos
                grandes.
            </p>
        </div>
    );
}
