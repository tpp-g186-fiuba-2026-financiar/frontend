import { useEffect, useMemo, useState } from 'react';
import type { SignalHistoryRow } from '../../api/next/endpoints';
import { hiddenModels } from '../../api/hiddenModels';
import type { PricePoint } from '../data/PortfolioContext';
import { modelLabel } from '../finance';
import { Card, CardHead, Empty, Seg } from './Blocks';

const W = 760;
const H = 260;
const PAD = { l: 58, r: 16, t: 18, b: 26 };
const DAY = 86_400_000;

const pct = (v: number) =>
    `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toLocaleString('es-AR', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
    })}%`;
const money = (v: number) =>
    '$' + v.toLocaleString('es-AR', { maximumFractionDigits: 0 });
const day = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
    });
// Las copias de Modal se llaman igual que las locales: se marcan aparte.
const nameOf = (key: string) =>
    modelLabel(key) + (key.endsWith('-modal') ? ' (nube)' : '');
const ts = (iso: string) => new Date(iso + 'T12:00:00').getTime();

const PERIODOS: Array<[string, string]> = [
    ['90', '3 meses'],
    ['365', '1 año'],
    ['1825', '5 años'],
    ['0', 'todo'],
];

/** Predicciones simuladas (walk-forward) que arma ``public/simulado``. */
interface Simulado {
    desde: string;
    precios: Array<[string, number]>;
    modelos: Record<
        string,
        Array<[string, string, number, number, number, string]>
    >;
}

function simRows(ticker: string, sim: Simulado): SignalHistoryRow[] {
    return Object.entries(sim.modelos).flatMap(([model, list]) =>
        list.map(([as_of, signal, last, pred, real, resolved]) => ({
            symbol: ticker,
            model,
            model_version: 'simulado',
            as_of,
            signal,
            horizon_days: 20,
            last_close: last,
            predicted_close: pred,
            realized_close: real,
            hit:
                signal === 'neutral'
                    ? null
                    : signal === 'alza'
                      ? real > last
                      : real < last,
            resolved_at: resolved,
        })),
    );
}

interface Case {
    row: SignalHistoryRow;
    predRet: number;
    realRet: number;
    /** Acerto la direccion (sube/baja) aunque la senal haya sido neutral. */
    sameWay: boolean;
}

function outcome(c: Case): { text: string; tone: 'up' | 'down' | 'neu' } {
    if (c.row.hit === true) return { text: 'Acertó', tone: 'up' };
    if (c.row.hit === false) return { text: 'Falló', tone: 'down' };
    return {
        text: 'Neutral: no opinó, no cuenta',
        tone: 'neu',
    };
}

/**
 * "Repetir el pasado": por modelo, cada prediccion ya resuelta de la accion
 * sobre el precio real. Al elegir una se dibuja hacia donde dijo que iba
 * (flecha punteada) y por donde fue de verdad (tramo resaltado).
 */
export default function PredictionReplay({
    ticker,
    rows,
    closes,
    preferred,
}: {
    ticker: string;
    rows: SignalHistoryRow[];
    closes: PricePoint[];
    preferred?: string | null;
}) {
    const [fuente, setFuente] = useState<'real' | 'sim'>('real');
    const [periodo, setPeriodo] = useState('0');
    const [sim, setSim] = useState<{ ticker: string; data: Simulado | null }>();
    useEffect(() => {
        if (fuente !== 'sim' || sim?.ticker === ticker) return;
        let vivo = true;
        fetch(`/simulado/${ticker}.json`)
            .then((r) => (r.ok ? (r.json() as Promise<Simulado>) : null))
            .then(async (data) => {
                if (!data) return null;
                const hidden = await hiddenModels();
                for (const k of hidden) delete data.modelos[k];
                return data;
            })
            .catch(() => null)
            .then((data) => vivo && setSim({ ticker, data }));
        return () => {
            vivo = false;
        };
    }, [fuente, ticker, sim?.ticker]);
    const simData = sim?.ticker === ticker ? sim.data : null;
    const usados = useMemo(
        () =>
            fuente === 'sim' ? (simData ? simRows(ticker, simData) : []) : rows,
        [fuente, simData, rows, ticker],
    );
    const precios = useMemo(
        () =>
            fuente === 'sim'
                ? (simData?.precios ?? []).map(([d, close]) => ({
                      ts: ts(d),
                      close,
                  }))
                : closes,
        [fuente, simData, closes],
    );

    const byModel = useMemo(() => {
        const out = new Map<string, Case[]>();
        for (const row of usados) {
            if (
                row.symbol !== ticker ||
                row.realized_close == null ||
                !row.resolved_at ||
                row.model.startsWith('consensus')
            )
                continue;
            const predRet = row.predicted_close / row.last_close - 1;
            const realRet = row.realized_close / row.last_close - 1;
            const list = out.get(row.model) ?? [];
            list.push({
                row,
                predRet,
                realRet,
                sameWay: Math.sign(predRet) === Math.sign(realRet),
            });
            out.set(row.model, list);
        }
        for (const list of out.values())
            list.sort((a, b) => a.row.as_of.localeCompare(b.row.as_of));
        return out;
    }, [usados, ticker]);

    const modelKeys = [...byModel.keys()].sort(
        (a, b) => byModel.get(b)!.length - byModel.get(a)!.length,
    );
    const initial =
        preferred && byModel.has(preferred) ? preferred : modelKeys[0];
    const [model, setModel] = useState<string | undefined>(initial);
    const active = model && byModel.has(model) ? model : initial;
    const cases = useMemo(() => {
        const todos = active ? (byModel.get(active) ?? []) : [];
        const dias = Number(periodo);
        if (!dias || !todos.length) return todos;
        const desde = ts(todos[todos.length - 1].row.as_of) - dias * DAY;
        return todos.filter((k) => ts(k.row.as_of) >= desde);
    }, [byModel, active, periodo]);
    const [idx, setIdx] = useState<number | null>(null);
    const [playing, setPlaying] = useState(false);
    const sel = cases.length
        ? Math.min(idx ?? cases.length - 1, cases.length - 1)
        : -1;

    useEffect(() => {
        if (!playing || cases.length < 2) return;
        const t = setInterval(() => {
            setIdx((i) => {
                const next = (i ?? cases.length - 1) + 1;
                if (next >= cases.length) {
                    setPlaying(false);
                    return cases.length - 1;
                }
                return next;
            });
        }, 1300);
        return () => clearInterval(t);
    }, [playing, cases.length]);

    const filtros = (
        <div className="nx-replay-filters">
            <Seg
                label="De dónde salen las predicciones"
                options={[
                    ['real', 'en vivo (desde jul-2026)'],
                    ['sim', 'simuladas 2011–2026'],
                ]}
                value={fuente}
                onChange={(v) => {
                    setFuente(v);
                    setPeriodo(v === 'sim' ? '365' : '0');
                    setIdx(null);
                    setPlaying(false);
                }}
            />
            <Seg
                label="Período"
                options={PERIODOS}
                value={periodo}
                onChange={(v) => {
                    setPeriodo(v);
                    setIdx(null);
                    setPlaying(false);
                }}
            />
        </div>
    );

    if (!modelKeys.length || !active || !cases.length)
        return (
            <Card i={4}>
                <CardHead title="Lo que predijo vs lo que pasó" />
                {filtros}
                <Empty>
                    {fuente === 'sim'
                        ? sim?.ticker === ticker
                            ? `No hay predicciones simuladas para ${ticker}: solo se simularon las acciones líderes.`
                            : 'Cargando predicciones simuladas…'
                        : `Todavía no hay predicciones resueltas para ${ticker}. Cada día se guarda lo que dice cada modelo y, cuando se cumple el plazo, se compara con el precio real.`}
                </Empty>
            </Card>
        );

    const first = ts(cases[0].row.as_of) - 7 * DAY;
    const last = ts(cases[cases.length - 1].row.resolved_at!) + 3 * DAY;
    const path = precios.filter((c) => c.ts >= first && c.ts <= last);
    const values = [
        ...path.map((c) => c.close),
        ...cases.flatMap((c) => [c.row.predicted_close, c.row.realized_close!]),
    ];
    const lo = Math.min(...values) * 0.985;
    const hi = Math.max(...values) * 1.015;
    const x = (t: number) =>
        PAD.l + ((t - first) / (last - first)) * (W - PAD.l - PAD.r);
    // Con años de inflación el precio se multiplica: en escala logarítmica
    // cada tramo se ve con la misma forma, sea de 2012 o de 2025.
    const log = hi / lo > 4;
    const scale = (v: number) => (log ? Math.log(v) : v);
    const y = (v: number) =>
        PAD.t +
        (1 - (scale(v) - scale(lo)) / (scale(hi) - scale(lo))) *
            (H - PAD.t - PAD.b);
    const line = path
        .map(
            (c, k) =>
                `${k ? 'L' : 'M'}${x(c.ts).toFixed(1)},${y(c.close).toFixed(1)}`,
        )
        .join('');

    const c = cases[sel];
    const t0 = ts(c.row.as_of);
    const t1 = ts(c.row.resolved_at!);
    const real = path.filter(
        (p) => p.ts >= t0 - DAY / 2 && p.ts <= t1 + DAY / 2,
    );
    const realLine = [
        `M${x(t0)},${y(c.row.last_close)}`,
        ...real.map((p) => `L${x(p.ts)},${y(p.close)}`),
        `L${x(t1)},${y(c.row.realized_close!)}`,
    ].join('');
    const res = outcome(c);
    const color = {
        up: 'var(--nx-up)',
        down: 'var(--nx-down)',
        neu: 'var(--nx-neu)',
    };
    const counted = cases.filter((k) => k.row.hit != null);
    const hits = counted.filter((k) => k.row.hit).length;
    const subio = cases.filter((k) => k.realRet > 0).length;
    // Lo que habria acertado tirando la moneda cargada con lo normal: una
    // senal de alza "acierta" tanto como sube el precio en general.
    const tasa = subio / cases.length;
    const base = counted.length
        ? counted.reduce(
              (acc, k) => acc + (k.row.signal === 'alza' ? tasa : 1 - tasa),
              0,
          ) / counted.length
        : tasa;
    const ticks = [lo, log ? Math.sqrt(lo * hi) : (lo + hi) / 2, hi];

    return (
        <Card i={4} className="nx-replay">
            <CardHead
                title="Lo que predijo vs lo que pasó"
                hint="Cada punto es una predicción vieja. Tocá uno (o dale play) y mirá hacia dónde dijo que iba el precio y por dónde fue de verdad."
            />
            {filtros}
            <div className="nx-chips" aria-label="Modelo">
                {modelKeys.map((k) => (
                    <button
                        key={k}
                        type="button"
                        aria-pressed={k === active}
                        onClick={() => {
                            setModel(k);
                            setIdx(null);
                            setPlaying(false);
                        }}
                    >
                        {nameOf(k)}
                    </button>
                ))}
            </div>
            <div className="nx-replay-score">
                <div>
                    <b>
                        {counted.length ? `${hits} de ${counted.length}` : '—'}
                    </b>
                    <span>señales de alza o baja que acertaron</span>
                </div>
                <div>
                    <b>
                        {counted.length
                            ? `${Math.round((hits / counted.length) * 100)}% vs ${Math.round(base * 100)}%`
                            : `${Math.round((subio / cases.length) * 100)}%`}
                    </b>
                    <span>
                        {counted.length
                            ? 'aciertos del modelo vs lo que se acertaba sin modelo (lo normal)'
                            : `de las veces subió en el plazo (${subio} de ${cases.length})`}
                    </span>
                </div>
            </div>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="nx-replay-chart"
                role="img"
                aria-label={`Predicciones de ${nameOf(active)} para ${ticker} contra el precio real`}
            >
                {ticks.map((v) => (
                    <g key={v}>
                        <line
                            x1={PAD.l}
                            x2={W - PAD.r}
                            y1={y(v)}
                            y2={y(v)}
                            stroke="var(--nx-line)"
                            strokeDasharray="2 4"
                        />
                        <text
                            x={PAD.l - 8}
                            y={y(v) + 4}
                            textAnchor="end"
                            fontSize="11"
                            fill="var(--nx-ink-3)"
                        >
                            {money(v)}
                        </text>
                    </g>
                ))}
                <rect
                    x={x(t0)}
                    y={PAD.t}
                    width={Math.max(2, x(t1) - x(t0))}
                    height={H - PAD.t - PAD.b}
                    fill="var(--nx-ink-3)"
                    opacity={0.08}
                />
                <path
                    d={line}
                    fill="none"
                    stroke="var(--nx-ink-3)"
                    strokeWidth={1.5}
                />
                <g key={`${active}-${sel}`} className="nx-replay-draw">
                    <path
                        d={realLine}
                        fill="none"
                        stroke="var(--nx-accent)"
                        strokeWidth={3}
                        strokeLinecap="round"
                        className="real"
                    />
                    <line
                        x1={x(t0)}
                        y1={y(c.row.last_close)}
                        x2={x(t1)}
                        y2={y(c.row.predicted_close)}
                        stroke={color[res.tone]}
                        strokeWidth={2.5}
                        strokeDasharray="6 5"
                        className="pred"
                    />
                    <circle
                        cx={x(t1)}
                        cy={y(c.row.predicted_close)}
                        r={5}
                        fill="none"
                        stroke={color[res.tone]}
                        strokeWidth={2}
                    />
                    <circle
                        cx={x(t1)}
                        cy={y(c.row.realized_close!)}
                        r={5.5}
                        fill="var(--nx-accent)"
                    />
                    <circle
                        cx={x(t0)}
                        cy={y(c.row.last_close)}
                        r={4}
                        fill="var(--nx-ink)"
                    />
                </g>
                {cases.map((k, i) => (
                    <circle
                        key={k.row.as_of + i}
                        cx={x(ts(k.row.as_of))}
                        cy={H - PAD.b + 10}
                        r={i === sel ? 6 : cases.length > 80 ? 2.5 : 4}
                        fill={
                            k.row.hit === true
                                ? 'var(--nx-up)'
                                : k.row.hit === false
                                  ? 'var(--nx-down)'
                                  : 'var(--nx-neu)'
                        }
                        stroke={i === sel ? 'var(--nx-ink)' : 'none'}
                        strokeWidth={1.5}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                            setIdx(i);
                            setPlaying(false);
                        }}
                    >
                        <title>{`${day(k.row.as_of)}: ${pct(k.predRet)} predicho, ${pct(k.realRet)} real`}</title>
                    </circle>
                ))}
            </svg>
            <div className="nx-replay-controls">
                <button
                    type="button"
                    className="nx-btn"
                    aria-label="Predicción anterior"
                    disabled={sel <= 0}
                    onClick={() => {
                        setPlaying(false);
                        setIdx(Math.max(0, sel - 1));
                    }}
                >
                    ◀
                </button>
                <button
                    type="button"
                    className="nx-btn"
                    onClick={() => {
                        if (!playing && sel >= cases.length - 1) setIdx(0);
                        setPlaying((p) => !p);
                    }}
                >
                    {playing ? '❚❚ Pausa' : '▶ Repetir todo'}
                </button>
                <button
                    type="button"
                    className="nx-btn"
                    aria-label="Predicción siguiente"
                    disabled={sel >= cases.length - 1}
                    onClick={() => {
                        setPlaying(false);
                        setIdx(Math.min(cases.length - 1, sel + 1));
                    }}
                >
                    ▶
                </button>
                <input
                    type="range"
                    min={0}
                    max={cases.length - 1}
                    value={sel}
                    aria-label="Elegir predicción"
                    onChange={(e) => {
                        setPlaying(false);
                        setIdx(Number(e.target.value));
                    }}
                />
            </div>
            <div className="nx-replay-case" aria-live="polite">
                <div>
                    <span className="k">
                        El {day(c.row.as_of)}, a {money(c.row.last_close)},{' '}
                        {nameOf(active)} dijo
                    </span>
                    <b style={{ color: color[res.tone] }}>
                        {money(c.row.predicted_close)} ({pct(c.predRet)})
                    </b>
                    <span className="k">para el {day(c.row.resolved_at!)}</span>
                </div>
                <div>
                    <span className="k">Pasó</span>
                    <b style={{ color: 'var(--nx-accent)' }}>
                        {money(c.row.realized_close!)} ({pct(c.realRet)})
                    </b>
                    <span className="k">
                        le erró por{' '}
                        {Math.abs((c.realRet - c.predRet) * 100).toFixed(1)}{' '}
                        puntos
                    </span>
                </div>
                <div>
                    <span className="k">Resultado</span>
                    <b style={{ color: color[res.tone] }}>{res.text}</b>
                    <span className="k">
                        Señal: {c.row.signal}
                        {c.row.model_version ? ` · ${c.row.model_version}` : ''}
                    </span>
                </div>
            </div>
            <div className="nx-legend">
                <span>
                    <i style={{ background: 'var(--nx-ink-3)' }} />
                    Precio real
                </span>
                <span>
                    <i style={{ background: 'var(--nx-accent)', height: 3 }} />
                    Lo que pasó en el plazo
                </span>
                <span>
                    <i
                        style={{
                            background:
                                'repeating-linear-gradient(90deg, var(--nx-neu) 0 5px, transparent 5px 9px)',
                            height: 2,
                        }}
                    />
                    Lo que predijo
                </span>
                <span>
                    <i
                        style={{ background: 'var(--nx-up)', borderRadius: 9 }}
                    />
                    Acertó
                </span>
                <span>
                    <i
                        style={{
                            background: 'var(--nx-down)',
                            borderRadius: 9,
                        }}
                    />
                    Falló
                </span>
                <span>
                    <i
                        style={{ background: 'var(--nx-neu)', borderRadius: 9 }}
                    />
                    Neutral (no cuenta)
                </span>
            </div>
        </Card>
    );
}
