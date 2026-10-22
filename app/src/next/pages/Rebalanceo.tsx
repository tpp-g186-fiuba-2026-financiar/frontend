import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../data/PortfolioContext';
import { useHoldingsView } from '../data/useHoldingsView';
import { useRemote } from '../data/useRemote';
import {
    getBlackLittermanEndpoint,
    type BlDetalle,
} from '../../api/next/endpoints';
import { Card, CardHead, Empty, Legal, PageHead, Seg, Tip } from '../ui/Blocks';
import { colorOf } from '../ui/palette';
import { pct, pct1, tone, usd, usd0 } from '../format';
import { logReturns, mean } from '../finance';
import { HOLD_THRESHOLD } from '../../utils/blRebalance';

const RISK_LABEL: Record<string, string> = {
    conservative: 'Conservador',
    moderate: 'Moderado',
    aggressive: 'Agresivo',
};
const YEAR = 252;
const CAP = 0.2;

type Ancla = 'propia' | 'equal_weight';

interface Row {
    ticker: string;
    cur: number;
    est: number;
    d: number;
    price: number | null;
    det: BlDetalle | null;
}

// Volatilidad anual de un reparto con la covarianza de los retornos diarios.
function portfolioVol(
    weights: Record<string, number>,
    rets: Record<string, number[]>,
): number | null {
    const tickers = Object.keys(weights).filter((t) => weights[t] > 0);
    if (tickers.some((t) => !rets[t] || rets[t].length < 30)) return null;
    const n = Math.min(...tickers.map((t) => rets[t].length));
    const r = tickers.map((t) => rets[t].slice(-n));
    const m = r.map(mean);
    let v = 0;
    for (let i = 0; i < tickers.length; i++) {
        for (let j = 0; j < tickers.length; j++) {
            let c = 0;
            for (let k = 0; k < n; k++)
                c += (r[i][k] - m[i]) * (r[j][k] - m[j]);
            v += weights[tickers[i]] * weights[tickers[j]] * (c / (n - 1));
        }
    }
    return Math.sqrt(Math.max(0, v) * YEAR);
}

export default function Rebalanceo() {
    const navigate = useNavigate();
    const { user, history } = usePortfolio();
    const { rows: holdings, totalValue } = useHoldingsView();
    const [ancla, setAncla] = useState<Ancla>('propia');
    const bl = useRemote(
        holdings.length
            ? `bl:${ancla}:${holdings.map((h) => h.ticker).join(',')}`
            : null,
        () => getBlackLittermanEndpoint(ancla),
    );
    const [pick, setPick] = useState<string | null>(null);

    const rows = useMemo<Row[]>(() => {
        if (!bl.data) return [];
        const det = new Map((bl.data.detalle ?? []).map((d) => [d.ticker, d]));
        const cur = new Map(holdings.map((h) => [h.ticker, h]));
        const tickers = new Set([
            ...Object.keys(bl.data.pesos_recomendados),
            ...holdings.map((h) => h.ticker),
        ]);
        return [...tickers]
            .map((t) => {
                const h = cur.get(t);
                const d = det.get(t) ?? null;
                const c = d?.peso_actual ?? h?.share ?? 0;
                const e =
                    bl.data!.pesos_recomendados[t] ?? d?.peso_recomendado ?? 0;
                return {
                    ticker: t,
                    cur: c,
                    est: e,
                    d: e - c,
                    price: h?.price ?? null,
                    det: d,
                };
            })
            .filter((r) => r.cur > 0.0005 || r.est > 0.0005)
            .sort((a, b) => b.est - a.est);
    }, [bl.data, holdings]);

    const rets = useMemo(() => {
        const out: Record<string, number[]> = {};
        Object.entries(history).forEach(
            ([t, pts]) =>
                (out[t] = logReturns(pts.map((p) => p.close).slice(-260))),
        );
        return out;
    }, [history]);

    if (holdings.length === 0)
        return (
            <Empty>
                Cargá acciones en tu cartera para ver cómo podría reacomodarse.
            </Empty>
        );

    const orders = rows
        .filter((r) => Math.abs(r.d) >= HOLD_THRESHOLD)
        .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    const kept = rows.length - orders.length;
    const moved =
        (rows.reduce((s, r) => s + Math.abs(r.d), 0) / 2) * totalValue;
    const hasDet = rows.some((r) => r.det);
    const expRet = (w: (r: Row) => number) =>
        rows.reduce((s, r) => s + w(r) * (r.det?.mu_bl ?? 0), 0) * YEAR;
    const r0 = hasDet ? expRet((r) => r.cur) : null;
    const r1 = hasDet ? expRet((r) => r.est) : null;
    const v0 = portfolioVol(
        Object.fromEntries(rows.map((r) => [r.ticker, r.cur])),
        rets,
    );
    const v1 = portfolioVol(
        Object.fromEntries(rows.map((r) => [r.ticker, r.est])),
        rets,
    );
    const risk = user?.risk_profile ?? 'moderate';
    const selected =
        rows.find((r) => r.ticker === pick) ?? orders[0] ?? rows[0];
    const excluded = Object.entries(bl.data?.tickers_excluidos ?? {});

    const reason = (r: Row) => {
        if (r.det) {
            const above = r.det.q > r.det.pi;
            if (r.d > 0)
                return above
                    ? 'Los modelos esperan para ella un rendimiento mayor al normal.'
                    : 'Reparte mejor el riesgo entre tus acciones.';
            return !above
                ? 'Los modelos esperan para ella un rendimiento menor al normal.'
                : `Hoy pesa mucho en tu cartera${r.cur > CAP ? ' y supera el tope del 20%' : ''}.`;
        }
        return r.d > 0
            ? 'El cálculo le asigna más peso que hoy.'
            : 'El cálculo le asigna menos peso que hoy.';
    };

    const scrollToSteps = (t: string) => {
        setPick(t);
        document
            .getElementById('nx-steps')
            ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    };

    const ex = (r: Row | undefined) =>
        r ? (
            <em>
                {' '}
                Ej.: {r.ticker} pasa de {pct1(r.cur * 100)} a{' '}
                {pct1(r.est * 100)}.
            </em>
        ) : null;
    // ejemplos que cumplen la regla: más que lo normal y crece / menos y se achica
    const gap = (r: Row) => r.det!.q - r.det!.pi;
    const withDet = rows.filter((r) => r.det);
    const upEx = withDet
        .filter((r) => gap(r) > 0 && r.d >= HOLD_THRESHOLD)
        .sort((a, b) => b.d - a.d)[0];
    const downEx = withDet
        .filter((r) => gap(r) < 0 && r.d <= -HOLD_THRESHOLD)
        .sort((a, b) => a.d - b.d)[0];

    return (
        <>
            <PageHead
                eyebrow="Rebalanceo"
                title="¿Cómo podría reacomodarse tu cartera?"
                sub={
                    <>
                        Rebalancear es{' '}
                        <b className="nx-ink">
                            reacomodar la plata entre tus acciones
                        </b>
                        , sin poner plata nueva. Acá ves una{' '}
                        <b className="nx-ink">estimación matemática</b> de cómo
                        quedaría tu cartera según los modelos y tu perfil.
                    </>
                }
            />
            <Legal full />
            {bl.loading && (
                <Empty>
                    Calculando el reparto estimado… puede tardar unos segundos.
                </Empty>
            )}
            {bl.error && (
                <Empty>
                    No pudimos hacer el cálculo ahora. Probá de nuevo en un
                    rato.
                </Empty>
            )}
            {bl.data && (
                <>
                    <Card className="nx-reb-hero" i={1}>
                        <div className="nx-eyebrow">Estimación del modelo</div>
                        <h2>
                            {orders.length ? (
                                <>
                                    Según el cálculo, un reparto con{' '}
                                    <span className="nx-up">
                                        {orders.length} cambio
                                        {orders.length > 1 ? 's' : ''}
                                    </span>{' '}
                                    {r0 != null && r1 != null && r1 > r0
                                        ? 'tendría un rendimiento esperado algo mayor'
                                        : 'quedaría más equilibrado'}
                                    {v0 != null &&
                                    v1 != null &&
                                    v1 - v0 <= 0.003
                                        ? ' sin sumar riesgo'
                                        : ''}
                                    .
                                </>
                            ) : (
                                'Según el cálculo, tu reparto actual ya está cerca del estimado para tu perfil.'
                            )}
                        </h2>
                        <p className="nx-muted">
                            Con tu perfil{' '}
                            <b className="nx-ink">{RISK_LABEL[risk] ?? risk}</b>
                            {r0 != null && r1 != null && (
                                <>
                                    , el rendimiento esperado a un año pasaría
                                    de{' '}
                                    <b className="nx-ink">{pct1(r0 * 100)}</b> a{' '}
                                    <b className="nx-ink">{pct1(r1 * 100)}</b>
                                </>
                            )}
                            . Abajo te mostramos{' '}
                            <b className="nx-ink">de dónde sale cada número</b>.
                            Son estimaciones con datos del pasado: no son una
                            promesa ni una recomendación.
                        </p>
                        <div
                            className="nx-grid"
                            style={{ gap: 10, marginTop: 16 }}
                        >
                            {r0 != null && r1 != null && (
                                <div className="nx-stat s4">
                                    <div className="k">
                                        Rendimiento esperado a un año{' '}
                                        <Tip k="rfinal" />
                                    </div>
                                    <div className="v">
                                        {pct1(r0 * 100)}{' '}
                                        <span className="nx-muted">→</span>{' '}
                                        <span
                                            className={
                                                r1 >= r0 ? 'nx-up' : 'nx-down'
                                            }
                                        >
                                            {pct1(r1 * 100)}
                                        </span>
                                    </div>
                                    <div className="d nx-muted">
                                        estimado, puede no cumplirse
                                    </div>
                                </div>
                            )}
                            {v0 != null && v1 != null && (
                                <div className="nx-stat s4">
                                    <div className="k">
                                        Cuánto puede subir o bajar en un año
                                    </div>
                                    <div className="v">
                                        ±{pct1(v0 * 100)}{' '}
                                        <span className="nx-muted">→</span>{' '}
                                        <span
                                            className={
                                                Math.abs(v1 - v0) <= 0.003
                                                    ? 'nx-ink'
                                                    : v1 < v0
                                                      ? 'nx-up'
                                                      : 'nx-down'
                                            }
                                        >
                                            ±{pct1(v1 * 100)}
                                        </span>
                                    </div>
                                    <div className="d nx-muted">
                                        {Math.abs(v1 - v0) <= 0.003
                                            ? 'prácticamente igual'
                                            : 'más bajo = más tranquilo'}
                                    </div>
                                </div>
                            )}
                            <div className="nx-stat s4">
                                <div className="k">
                                    Plata que se movería <Tip k="movida" />
                                </div>
                                <div className="v">{usd0(moved)}</div>
                                <div className="d nx-muted">
                                    se vende un poco de unas para comprar otras
                                    (
                                    {pct1(
                                        totalValue > 0
                                            ? (moved / totalValue) * 100
                                            : 0,
                                    )}{' '}
                                    del total)
                                </div>
                            </div>
                        </div>
                    </Card>
                    <div className="nx-grid" style={{ marginTop: 16 }}>
                        <Card span="s7" i={2}>
                            <CardHead
                                title="Cambios que surgen del cálculo"
                                hint="Más peso = tener más plata en esa acción. Menos peso = tener menos. Es el resultado de un modelo matemático, no una orden ni un consejo: la app no compra ni vende nada."
                            />
                            {orders.length ? (
                                orders.map((o, k) => {
                                    const amount = Math.abs(o.d) * totalValue;
                                    const n = o.price
                                        ? Math.round(amount / o.price)
                                        : null;
                                    return (
                                        <div
                                            className="nx-order"
                                            key={o.ticker}
                                            style={{
                                                animationDelay: `${k * 70}ms`,
                                            }}
                                        >
                                            <span
                                                className={`nx-pill ${o.d > 0 ? 'alza' : 'baja'}`}
                                            >
                                                {o.d > 0
                                                    ? 'Más peso'
                                                    : 'Menos peso'}
                                            </span>
                                            <div>
                                                <div className="what">
                                                    {o.ticker}{' '}
                                                    {n != null && n > 0 && (
                                                        <span
                                                            className="nx-mono"
                                                            style={{
                                                                fontSize: 13,
                                                            }}
                                                        >
                                                            {o.d > 0
                                                                ? '+'
                                                                : '−'}
                                                            {n} acciones
                                                        </span>
                                                    )}
                                                    {o.cur === 0 && (
                                                        <span
                                                            className="nx-muted"
                                                            style={{
                                                                fontSize: 12.5,
                                                                fontWeight: 400,
                                                            }}
                                                        >
                                                            {' '}
                                                            · hoy no la tenés
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="why2">
                                                    {reason(o)}
                                                </div>
                                                {o.det && (
                                                    <button
                                                        type="button"
                                                        className="nx-see"
                                                        onClick={() =>
                                                            scrollToSteps(
                                                                o.ticker,
                                                            )
                                                        }
                                                    >
                                                        Ver la cuenta →
                                                    </button>
                                                )}
                                            </div>
                                            <div className="amt">
                                                ≈ {usd0(amount)}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="nx-muted">
                                    El cálculo no muestra cambios relevantes.
                                </p>
                            )}
                            {kept > 0 && orders.length > 0 && (
                                <div className="nx-keep">
                                    Las otras {kept} acciones{' '}
                                    <b className="nx-ink">no cambian</b>: la
                                    diferencia sería menor al 1% y las
                                    comisiones se comerían cualquier mejora.
                                </div>
                            )}
                        </Card>
                        <Card span="s5" i={3}>
                            <CardHead
                                title="Tu cartera hoy y el reparto estimado"
                                hint="Cada color es una acción. El ancho es cuánta plata hay en ella."
                            />
                            {(['cur', 'est'] as const).map((k) => (
                                <div className="nx-alloc-row" key={k}>
                                    <div className="k">
                                        {k === 'cur' ? 'Hoy' : 'Estimado'}
                                    </div>
                                    <div className="nx-alloc-bar">
                                        {rows.map((r, i) => (
                                            <i
                                                key={r.ticker}
                                                title={`${r.ticker}: ${pct1(r[k] * 100)}`}
                                                style={{
                                                    flexGrow: r[k],
                                                    background: colorOf(i),
                                                }}
                                            >
                                                {r[k] > 0.07 ? r.ticker : ''}
                                            </i>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="nx-alloc-leg">
                                {rows.map((r, i) => (
                                    <span key={r.ticker}>
                                        <i style={{ background: colorOf(i) }} />
                                        {r.ticker}
                                    </span>
                                ))}
                            </div>
                            {orders.length > 0 && (
                                <>
                                    <div
                                        className="nx-label"
                                        style={{ margin: '18px 0 4px' }}
                                    >
                                        Lo que cambia
                                    </div>
                                    <div className="nx-list">
                                        {orders.map((o) => (
                                            <div
                                                className="nx-li"
                                                key={o.ticker}
                                                style={{
                                                    padding: '7px 0',
                                                    fontSize: 13,
                                                }}
                                            >
                                                <i
                                                    style={{
                                                        width: 9,
                                                        height: 9,
                                                        borderRadius: 3,
                                                        background: colorOf(
                                                            rows.indexOf(o),
                                                        ),
                                                    }}
                                                />
                                                <b className="nx-ink nx-grow">
                                                    {o.ticker}
                                                </b>
                                                <span className="nx-mono nx-muted">
                                                    {pct1(o.cur * 100)}
                                                </span>
                                                <span className="nx-muted">
                                                    →
                                                </span>
                                                <b
                                                    className={`nx-mono ${tone(o.d)}`}
                                                >
                                                    {pct1(o.est * 100)}
                                                </b>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </Card>
                        <Card i={4}>
                            <CardHead title="¿Qué hace este cálculo?" />
                            <p className="nx-bl-intro">
                                Imaginá que tenés que repartir tu plata entre
                                tus acciones. Este cálculo, llamado{' '}
                                <b>Black-Litterman</b> <Tip k="bl" />,{' '}
                                <b>no arma una cartera nueva</b>: parte de la
                                tuya y la corrige un poco según lo que estiman
                                los modelos de cada acción, cuidando de no sumar
                                riesgo de más. Por eso los cambios suelen ser
                                chicos.
                            </p>
                            <b
                                className="nx-ink"
                                style={{ display: 'block', marginBottom: 10 }}
                            >
                                ¿Por qué una barra sube o baja?
                            </b>
                            <div className="nx-rules">
                                <div className="nx-rule">
                                    <div
                                        className="ic"
                                        style={{
                                            color: 'var(--nx-up)',
                                            background:
                                                'color-mix(in oklab, var(--nx-up) 14%, transparent)',
                                        }}
                                    >
                                        ▲
                                    </div>
                                    <div>
                                        <b>
                                            Los modelos esperan más que lo
                                            normal
                                        </b>
                                        <p>
                                            Su rendimiento estimado queda por
                                            encima de lo normal, y su barra
                                            tiende a crecer.{ex(upEx)}
                                        </p>
                                    </div>
                                </div>
                                <div className="nx-rule">
                                    <div
                                        className="ic"
                                        style={{
                                            color: 'var(--nx-down)',
                                            background:
                                                'color-mix(in oklab, var(--nx-down) 14%, transparent)',
                                        }}
                                    >
                                        ▼
                                    </div>
                                    <div>
                                        <b>Esperan menos que lo normal</b>
                                        <p>
                                            Su rendimiento estimado queda por
                                            debajo de lo normal, y su barra
                                            tiende a achicarse.{ex(downEx)}
                                        </p>
                                    </div>
                                </div>
                                <div className="nx-rule">
                                    <div
                                        className="ic"
                                        style={{
                                            color: 'var(--nx-neu)',
                                            background:
                                                'color-mix(in oklab, var(--nx-neu) 14%, transparent)',
                                        }}
                                    >
                                        ≈
                                    </div>
                                    <div>
                                        <b>
                                            Si esperan algo parecido a lo
                                            normal, casi no cambia
                                        </b>
                                        <p>
                                            Los modelos no tienen una opinión
                                            clara, así que el cálculo la deja
                                            parecida a como está.
                                        </p>
                                    </div>
                                </div>
                                <div className="nx-rule">
                                    <div
                                        className="ic"
                                        style={{
                                            color: 'var(--nx-warn)',
                                            background:
                                                'color-mix(in oklab, var(--nx-warn) 14%, transparent)',
                                        }}
                                    >
                                        ⛔
                                    </div>
                                    <div>
                                        <b>Hay límites para no exagerar</b>
                                        <p>
                                            Ninguna acción puede pasar del 20%
                                            de la cartera. Si varias se mueven
                                            juntas (como los bancos), no se las
                                            sube a todas a la vez. Y el cálculo
                                            mira las acciones más grandes de la
                                            bolsa argentina, así que a veces
                                            puede sumar alguna que hoy no tenés.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                        {hasDet && selected?.det && (
                            <Card i={5}>
                                <div id="nx-steps" />
                                <CardHead
                                    title="La cuenta, paso a paso"
                                    hint="Elegí una acción y mirá de dónde sale cada número"
                                />
                                <div
                                    className="nx-chips"
                                    style={{ marginBottom: 6 }}
                                >
                                    {rows
                                        .filter((r) => r.det)
                                        .map((r) => (
                                            <button
                                                key={r.ticker}
                                                type="button"
                                                aria-pressed={
                                                    r.ticker === selected.ticker
                                                }
                                                onClick={() =>
                                                    setPick(r.ticker)
                                                }
                                            >
                                                {r.ticker}
                                            </button>
                                        ))}
                                </div>
                                <Steps row={selected} totalValue={totalValue} />
                            </Card>
                        )}
                        {hasDet && (
                            <Card i={6}>
                                <CardHead
                                    title="La misma cuenta para todas las acciones"
                                    hint="Tocá una fila para verla paso a paso"
                                />
                                <div className="nx-table-wrap">
                                    <table className="nx-table">
                                        <thead>
                                            <tr>
                                                <th>Acción</th>
                                                <th className="r">
                                                    Rendimiento normal{' '}
                                                    <Tip k="rnormal" />
                                                </th>
                                                <th className="r">
                                                    Estimación de los modelos{' '}
                                                    <Tip k="ajuste" />
                                                </th>
                                                <th className="r">
                                                    Rendimiento estimado{' '}
                                                    <Tip k="rfinal" />
                                                </th>
                                                <th className="r">
                                                    Hoy → estimado{' '}
                                                    <Tip k="peso" />
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows
                                                .filter((r) => r.det)
                                                .map((r) => (
                                                    <tr
                                                        key={r.ticker}
                                                        className={
                                                            r.ticker ===
                                                            selected?.ticker
                                                                ? 'sel'
                                                                : ''
                                                        }
                                                        onClick={() =>
                                                            scrollToSteps(
                                                                r.ticker,
                                                            )
                                                        }
                                                    >
                                                        <td>
                                                            <b className="nx-ink">
                                                                {r.ticker}
                                                            </b>
                                                        </td>
                                                        <td className="r nx-mono">
                                                            {pct1(
                                                                r.det!.pi *
                                                                    YEAR *
                                                                    100,
                                                            )}
                                                        </td>
                                                        <td
                                                            className={`r nx-mono ${r.det!.q > r.det!.pi ? 'nx-up' : r.det!.q < r.det!.pi ? 'nx-down' : ''}`}
                                                        >
                                                            {pct1(
                                                                r.det!.q *
                                                                    YEAR *
                                                                    100,
                                                            )}
                                                        </td>
                                                        <td className="r nx-mono nx-ink">
                                                            {pct1(
                                                                r.det!.mu_bl *
                                                                    YEAR *
                                                                    100,
                                                            )}
                                                        </td>
                                                        <td className="r nx-mono">
                                                            {pct1(r.cur * 100)}{' '}
                                                            →{' '}
                                                            <b
                                                                className={
                                                                    Math.abs(
                                                                        r.d,
                                                                    ) <
                                                                    HOLD_THRESHOLD
                                                                        ? ''
                                                                        : tone(
                                                                              r.d,
                                                                          )
                                                                }
                                                            >
                                                                {pct1(
                                                                    r.est * 100,
                                                                )}
                                                            </b>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                        <Card i={7}>
                            <details className="nx-adv">
                                <summary>
                                    Opciones avanzadas{' '}
                                    <span>
                                        cambiar desde dónde parte el cálculo
                                    </span>
                                </summary>
                                <div className="nx-setting">
                                    <div>
                                        <b>
                                            Tu perfil <Tip k="perfil" />
                                        </b>
                                        <span>
                                            Se cambia solo desde Ajustes. Con un
                                            perfil más conservador, los cambios
                                            son más chicos.
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                        }}
                                    >
                                        <b className="nx-ink">
                                            {RISK_LABEL[risk] ?? risk}
                                        </b>
                                        <button
                                            type="button"
                                            className="nx-btn sm"
                                            onClick={() => navigate('/ajustes')}
                                        >
                                            Ir a Ajustes
                                        </button>
                                    </div>
                                </div>
                                <div className="nx-setting">
                                    <div>
                                        <b>
                                            Desde dónde partir <Tip k="ancla" />
                                        </b>
                                        <span>
                                            Por defecto, desde tu cartera de hoy
                                        </span>
                                    </div>
                                    <Seg
                                        label="Cartera de partida"
                                        options={[
                                            ['propia', 'Mi cartera'],
                                            ['equal_weight', 'Igual peso'],
                                        ]}
                                        value={ancla}
                                        onChange={setAncla}
                                    />
                                </div>
                                {excluded.length > 0 && (
                                    <div className="nx-setting">
                                        <div>
                                            <b>
                                                Acciones que quedaron afuera del
                                                cálculo
                                            </b>
                                            <span>
                                                {excluded
                                                    .map(
                                                        ([t, why]) =>
                                                            `${t}: ${why}`,
                                                    )
                                                    .join(' · ')}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </details>
                        </Card>
                    </div>
                </>
            )}
        </>
    );
}

function Steps({ row, totalValue }: { row: Row; totalValue: number }) {
    const d = row.det!;
    const pi = d.pi * YEAR;
    const q = d.q * YEAR;
    const mu = d.mu_bl * YEAR;
    const h = d.horizon_days ?? 20;
    const qH = Math.exp(d.q * h) - 1;
    const mx = Math.max(row.cur, row.est, 0.01);
    const why5 =
        Math.abs(row.d) < HOLD_THRESHOLD ? (
            <>
                El cambio es menor al 1%: en la práctica,{' '}
                <b>no conviene tocarla</b>.
            </>
        ) : row.d > 0 ? (
            <>
                Su parte <b>crece</b> porque su rendimiento estimado quedó mejor
                que el de varias de tus otras acciones
                {row.est >= CAP - 0.0005 ? ', hasta tocar el tope del 20%' : ''}
                .
            </>
        ) : (
            <>
                Su parte <b>se achica</b> porque otras acciones quedaron mejor
                posicionadas
                {row.cur > CAP ? ' y además hoy supera el tope del 20%' : ''}.
            </>
        );
    const steps: Array<[ReactNode, ReactNode, ReactNode]> = [
        [
            'Lo que tenés hoy',
            <>
                {row.cur > 0 ? (
                    <>
                        Hoy tenés {usd0(row.cur * totalValue)} en {row.ticker}.
                        Es el <b>{pct1(row.cur * 100)}</b> de tu cartera.
                    </>
                ) : (
                    <>
                        Hoy no tenés {row.ticker}, pero el cálculo la mira
                        porque es una de las acciones más grandes de la bolsa.
                    </>
                )}
            </>,
            <>
                {pct1(row.cur * 100)}
                <small>de tu cartera</small>
            </>,
        ],
        [
            <>
                Lo que se espera "normalmente" <Tip k="rnormal" />
            </>,
            <>
                Antes de escuchar a los modelos, se estima cuánto debería rendir{' '}
                {row.ticker} por año solo por el riesgo que tiene y por cuánto
                pesa en la cartera de partida.
            </>,
            <>
                {pct1(pi * 100)}
                <small>por año, rendimiento normal</small>
            </>,
        ],
        [
            <>
                Lo que estiman los modelos <Tip k="ajuste" />
            </>,
            <>
                Los modelos estiman que {row.ticker} podría moverse{' '}
                <b>{pct(qH * 100)}</b> en unas {h} ruedas. Llevado a un año, eso
                es un rendimiento de <b>{pct1(q * 100)}</b>.
                <br />
                <span className="eq">
                    {pct(qH * 100)} en {h} ruedas → {pct1(q * 100)} por año
                </span>
            </>,
            <>
                {pct1(q * 100)}
                <small>por año, según los modelos</small>
            </>,
        ],
        [
            <>
                La mezcla <Tip k="rfinal" />
            </>,
            <>
                El cálculo <b>no le cree todo a los modelos</b>: mezcla lo
                normal con lo que estiman, dándoles un peso parecido a los dos.
                Como además mira cómo se mueve {row.ticker} junto con las demás
                acciones, lo que se espera de las otras también la corre un
                poco. Por eso el resultado no es exactamente el promedio.
                <br />
                <span className="eq">
                    normal {pct1(pi * 100)} · modelos {pct1(q * 100)} → estimado{' '}
                    {pct1(mu * 100)}
                </span>
            </>,
            <>
                {pct1(mu * 100)}
                <small>rendimiento estimado por año</small>
            </>,
        ],
        [
            'El nuevo reparto',
            <>
                Hace esta misma cuenta con todas las acciones y busca el reparto
                que da <b>más rendimiento por cada unidad de riesgo</b>, sin
                pasar del 20% en ninguna y sin cargar de más acciones que se
                mueven juntas. {why5}
            </>,
            <div className="mini-bars">
                <div>
                    hoy
                    <i style={{ width: `${(row.cur / mx) * 100}%` }} />
                    {pct1(row.cur * 100)}
                </div>
                <div>
                    estimado
                    <i
                        className="b"
                        style={{ width: `${(row.est / mx) * 100}%` }}
                    />
                    {pct1(row.est * 100)}
                </div>
            </div>,
        ],
    ];
    return (
        <div className="nx-steps">
            {steps.map(([t, p, big], k) => (
                <div
                    className="cs"
                    key={k}
                    style={{ animationDelay: `${k * 80}ms` }}
                >
                    <div className="n">{k + 1}</div>
                    <div>
                        <div className="t">{t}</div>
                        <p>{p}</p>
                    </div>
                    <div className="big2">{big}</div>
                </div>
            ))}
            {row.price != null && (
                <p className="nx-muted" style={{ fontSize: 12 }}>
                    Precio de referencia: {usd(row.price)}
                </p>
            )}
        </div>
    );
}
