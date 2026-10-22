import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePortfolio } from '../data/PortfolioContext';
import { useHoldingsView, type HoldingView } from '../data/useHoldingsView';
import {
    getBlackLittermanEndpoint,
    getCandlesEndpoint,
    getMarketSeriesEndpoint,
    getSignalHistoryEndpoint,
    getAdminHealthEndpoint,
} from '../../api/next/endpoints';
import { getShareTrendCompareEndpoint } from '../../api/userShares/getShareTrendCompareEndpoint';
import { Card, CardHead, Explain, PageHead } from '../ui/Blocks';
import { num, pct, pct1, shortDate, usd } from '../format';
import {
    accuracyOf,
    consensusParts,
    directionalModels,
    expectedReturn,
    logReturns,
    modelLabel,
    normalizeSignal,
    portfolioSeries,
    valueAtRisk,
    type Signal,
} from '../finance';
import { bestModelOf } from '../../utils/defaultModels';

type Kind = '' | 'hd' | 'ok' | 'err' | 'dim' | 'cmd' | 'w';
type Seg = string | { t: string; k: Kind };
type Line = { k: Kind; segs: Seg[] };

const L = (k: Kind, ...segs: Seg[]): Line => ({ k, segs });
const S = (t: string, k: Kind): Seg => ({ t, k });
const pad = (s: string | number, n: number, right = false) =>
    right ? String(s).padStart(n) : String(s).padEnd(n);
const sigSeg = (s: Signal | null) =>
    S(
        pad(s ? s.toUpperCase() : 'SIN DATOS', 9),
        s === 'alza' ? 'ok' : s === 'baja' ? 'err' : 'dim',
    );
const spark = (vals: number[]) => {
    const b = '▁▂▃▄▅▆▇█';
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    return vals
        .map((v) => b[Math.round(((v - mn) / (mx - mn || 1)) * 7)])
        .join('');
};

const HELP: Array<[string, string]> = [
    ['cartera', 'tus acciones, cuánto ganaste y qué señal tiene cada una'],
    ['precio GGAL', 'último cierre y cómo se movió en el último mes'],
    ['velas YPF', 'apertura, máximo, mínimo y cierre de las últimas 10 ruedas'],
    ['predict GGAL', 'qué esperan los modelos, todos juntos'],
    ['compare PAMP', 'qué dice cada modelo por separado y cuánto acierta'],
    ['bl', 'reparto estimado por el modelo Black-Litterman'],
    ['historial GGAL', 'si acertaron las últimas señales'],
    ['riesgo', 'cuánto podrías perder en un día malo'],
    ['macro', 'dólar, riesgo país y tasas'],
    ['go riesgo', 'te lleva a otra pestaña'],
    ['clear', 'limpia la pantalla'],
];

const PAGES = [
    'home',
    'cartera',
    'accion',
    'rebalanceo',
    'historial',
    'riesgo',
    'mercado',
    'alertas',
    'ajustes',
];

const session: { lines: Line[]; hist: string[] } = { lines: [], hist: [] };

interface Ctx {
    rows: HoldingView[];
    history: Record<string, Array<{ ts: number; close: number }>>;
    totalValue: number;
    totalCost: number;
    isAdmin: boolean;
    go: (to: string) => void;
}

async function run(
    cmd: string,
    arg: string | undefined,
    ctx: Ctx,
): Promise<Line[]> {
    const t = arg?.toUpperCase();
    const row = t ? ctx.rows.find((r) => r.ticker === t) : undefined;
    const needT = (example: string) => [L('err', `probá con: ${example}`)];
    switch (cmd) {
        case 'help':
            return [
                L('hd', 'QUÉ PODÉS ESCRIBIR'),
                ...HELP.map(([c, d]) => L('', '  ', S(pad(c, 15), 'ok'), d)),
                ...(ctx.isAdmin
                    ? [
                          L(
                              '',
                              '  ',
                              S(pad('health', 15), 'ok'),
                              'estado de los servicios (admin)',
                          ),
                      ]
                    : []),
                L('', ' '),
                L(
                    'dim',
                    '  ↑/↓ repite comandos anteriores · Tab completa el ticker',
                ),
            ];
        case 'cartera': {
            const out = [
                L('dim', '# tus posiciones al último cierre'),
                L(
                    'hd',
                    pad('ACCIÓN', 8) +
                        pad('CANT', 6, true) +
                        pad('CIERRE', 13, true) +
                        pad('GANANCIA', 10, true) +
                        pad('PESO', 8, true) +
                        '  SEÑAL',
                ),
            ];
            ctx.rows.forEach((r) =>
                out.push(
                    L(
                        '',
                        pad(r.ticker, 8) +
                            pad(r.quantity, 6, true) +
                            pad(r.price != null ? usd(r.price) : '—', 13, true),
                        S(
                            pad(
                                r.pnlPercentage != null
                                    ? pct(r.pnlPercentage)
                                    : '—',
                                10,
                                true,
                            ),
                            (r.pnlPercentage ?? 0) >= 0 ? 'ok' : 'err',
                        ),
                        pad(pct1(r.share * 100), 8, true) + '  ',
                        sigSeg(r.signal),
                    ),
                ),
            );
            const tp =
                ctx.totalCost > 0
                    ? ((ctx.totalValue - ctx.totalCost) / ctx.totalCost) * 100
                    : 0;
            out.push(
                L('dim', '─'.repeat(58)),
                L(
                    '',
                    `TOTAL ${usd(ctx.totalValue)}   ganancia `,
                    S(pct(tp), tp >= 0 ? 'ok' : 'err'),
                ),
            );
            return out;
        }
        case 'precio': {
            if (!t) return needT('precio GGAL');
            const closes = ctx.history[t]?.map((p) => p.close) ?? [];
            if (!closes.length) return [L('err', `no tengo precios de ${t}`)];
            const w =
                closes.length > 5
                    ? (closes[closes.length - 1] / closes[closes.length - 6] -
                          1) *
                      100
                    : 0;
            return [
                L('dim', `# cómo viene ${t}`),
                L('hd', t),
                L(
                    '',
                    `cierre ${usd(closes[closes.length - 1])}   semana `,
                    S(pct(w), w >= 0 ? 'ok' : 'err'),
                ),
                L('ok', 'último mes ' + spark(closes.slice(-30))),
            ];
        }
        case 'velas': {
            if (!t) return needT('velas YPF');
            const { candles } = await getCandlesEndpoint(t);
            const out = [
                L('dim', `# las últimas 10 ruedas de ${t}`),
                L(
                    'hd',
                    pad('FECHA', 10) +
                        pad('ABRIÓ', 10, true) +
                        pad('MÁXIMO', 10, true) +
                        pad('MÍNIMO', 10, true) +
                        pad('CERRÓ', 10, true) +
                        pad('VOLUMEN', 9, true),
                ),
            ];
            candles
                .slice(-10)
                .forEach((c) =>
                    out.push(
                        L(
                            '',
                            pad(shortDate(c.date), 10) +
                                pad(c.open.toFixed(2), 10, true) +
                                pad(c.high.toFixed(2), 10, true) +
                                pad(c.low.toFixed(2), 10, true),
                            S(
                                pad(c.close.toFixed(2), 10, true),
                                c.close >= c.open ? 'ok' : 'err',
                            ),
                            pad((c.volume / 1e6).toFixed(1) + 'M', 9, true),
                        ),
                    ),
                );
            return out;
        }
        case 'predict': {
            if (!t) return needT('predict GGAL');
            const cmp = await getShareTrendCompareEndpoint(t);
            const { score } = consensusParts(cmp);
            const cls = cmp.consensus?.classification;
            const sig: Signal =
                cls === 'sobrecompra'
                    ? 'alza'
                    : cls === 'sobreventa'
                      ? 'baja'
                      : 'neutral';
            const rsi =
                row?.trend?.rsi ??
                directionalModels(cmp).find(([, p]) => p.rsi != null)?.[1]
                    .rsi ??
                null;
            const out = [
                L('dim', `# qué esperan los modelos de ${t}`),
                L('hd', `${t} · opinión combinada`),
            ];
            if (row?.prob != null) {
                const k = Math.round(row.prob * 30);
                out.push(
                    L(
                        '',
                        `prob. de suba  [${'█'.repeat(k)}${'░'.repeat(30 - k)}] ${Math.round(row.prob * 100)}%`,
                    ),
                );
            }
            if (score != null)
                out.push(
                    L(
                        '',
                        'movimiento esperado  ',
                        S(pct(score * 100), score >= 0 ? 'ok' : 'err'),
                    ),
                );
            out.push(L('', 'señal          ', sigSeg(sig)));
            if (rsi != null)
                out.push(
                    L(
                        '',
                        `RSI            ${Math.round(rsi)}  ${rsi > 70 ? '(subió mucho y rápido)' : rsi < 30 ? '(cayó mucho y rápido)' : '(normal)'}`,
                    ),
                );
            const c = cmp.consensus;
            if (
                c?.confidence_min != null &&
                c.aggregate_confidence < c.confidence_min
            )
                out.push(
                    L(
                        'dim',
                        `los modelos aciertan en promedio ${pct1(c.aggregate_confidence * 100)}, menos que el mínimo (${pct1(c.confidence_min * 100)}): la lectura queda neutral`,
                    ),
                );
            out.push(L('dim', `tip: compare ${t} para ver cada modelo`));
            return out;
        }
        case 'compare': {
            if (!t) return needT('compare PAMP');
            const cmp = await getShareTrendCompareEndpoint(t);
            const best = bestModelOf(cmp);
            const out = [
                L('dim', `# qué dice cada modelo de ${t}`),
                L(
                    'hd',
                    pad('MODELO', 13) +
                        pad('MIRA', 8, true) +
                        pad('ESPERA', 9, true) +
                        '  ' +
                        pad('SEÑAL', 8) +
                        pad('ACERTÓ', 8, true),
                ),
            ];
            directionalModels(cmp).forEach(([k, p]) => {
                const r = expectedReturn(p);
                const a = accuracyOf(p);
                out.push(
                    L(
                        '',
                        pad(modelLabel(k), 13) +
                            pad(`${p.horizon_days ?? '—'} r.`, 8, true),
                        S(
                            pad(r != null ? pct(r * 100, 1) : '—', 9, true),
                            (r ?? 0) >= 0 ? 'ok' : 'err',
                        ),
                        '  ',
                        sigSeg(normalizeSignal(p.signal)),
                        pad(a != null ? pct1(a * 100) : '—', 8, true),
                        ...(k === best
                            ? [S('  ★ el que más acierta', 'w')]
                            : []),
                    ),
                );
            });
            return out;
        }
        case 'bl': {
            const res = await getBlackLittermanEndpoint();
            const cur = new Map(ctx.rows.map((r) => [r.ticker, r.share]));
            const tickers = [
                ...new Set([
                    ...Object.keys(res.pesos_recomendados),
                    ...cur.keys(),
                ]),
            ];
            const out = [
                L(
                    'dim',
                    '# reparto estimado por el modelo (no es una recomendación)',
                ),
                L(
                    'hd',
                    pad('ACCIÓN', 8) +
                        pad('HOY', 8, true) +
                        pad('ESTIMADO', 10, true) +
                        '   CAMBIO',
                ),
            ];
            tickers
                .map((tk) => ({
                    tk,
                    a: cur.get(tk) ?? 0,
                    b: res.pesos_recomendados[tk] ?? 0,
                }))
                .filter((x) => x.a > 0.0005 || x.b > 0.0005)
                .sort((x, y) => y.b - x.b)
                .forEach(({ tk, a, b }) => {
                    const d = (b - a) * 100;
                    out.push(
                        L(
                            '',
                            pad(tk, 8) +
                                pad(pct1(a * 100), 8, true) +
                                pad(pct1(b * 100), 10, true) +
                                '   ',
                            Math.abs(d) < 1
                                ? S('sin cambio', 'dim')
                                : d > 0
                                  ? S(`más peso (+${num(d, 1)} pts)`, 'ok')
                                  : S(
                                        `menos peso (−${num(Math.abs(d), 1)} pts)`,
                                        'err',
                                    ),
                        ),
                    );
                });
            out.push(
                L(
                    'w',
                    '⚠ estimación matemática. NO es una recomendación de inversión.',
                ),
            );
            return out;
        }
        case 'historial': {
            const { rows } = await getSignalHistoryEndpoint();
            const ev = rows.filter(
                (r) =>
                    r.hit != null &&
                    normalizeSignal(r.signal) !== 'neutral' &&
                    (!t || r.symbol === t),
            );
            const acc = ev.filter((r) => r.hit).length / (ev.length || 1);
            return [
                L('dim', `# ¿acertaron las señales${t ? ' de ' + t : ''}?`),
                L(
                    'hd',
                    pad('FECHA', 8) +
                        pad('ACCIÓN', 7) +
                        pad('SEÑAL', 9) +
                        '  RESULTADO',
                ),
                ...ev
                    .sort((a, b) => b.as_of.localeCompare(a.as_of))
                    .slice(0, 10)
                    .map((r) =>
                        L(
                            '',
                            pad(shortDate(r.as_of), 8) + pad(r.symbol, 7),
                            sigSeg(normalizeSignal(r.signal)),
                            ' ',
                            r.hit
                                ? S('✓ acertó', 'ok')
                                : S('✗ no acertó', 'err'),
                        ),
                    ),
                L(
                    '',
                    'aciertos: ',
                    S(pct1(acc * 100), 'ok'),
                    ` de ${ev.length} señales`,
                ),
            ];
        }
        case 'riesgo': {
            const { values } = portfolioSeries(ctx.rows, ctx.history);
            const rets = logReturns(values);
            const v = valueAtRisk(rets);
            if (!v)
                return [
                    L(
                        'err',
                        'todavía no hay suficientes precios para calcular el riesgo',
                    ),
                ];
            let pk = -Infinity;
            const mdd = Math.min(
                ...values.map((p) => ((pk = Math.max(pk, p)), p / pk - 1)),
            );
            return [
                L('dim', '# cuánto podrías perder'),
                L('hd', 'RIESGO DE TU CARTERA (último año)'),
                L(
                    '',
                    'día malo (1 de cada 20)   ',
                    S(`-${usd(v.var95 * ctx.totalValue, 0)}`, 'err'),
                    `  (${pct1(v.var95 * 100)})`,
                ),
                L('', 'peor caída desde un pico  ', S(pct1(mdd * 100), 'err')),
                L(
                    '',
                    `movimientos diarios       ${spark(rets.slice(-60).map(Math.abs))}`,
                ),
            ];
        }
        case 'macro': {
            const { series } = await getMarketSeriesEndpoint();
            const names: Record<string, string> = {
                CCL: 'dólar CCL',
                MEP: 'dólar MEP',
                RIESGO_PAIS: 'riesgo país',
                TPM: 'tasa BCRA',
                BADLAR: 'BADLAR',
                TNX: 'bono EE.UU.',
            };
            const out = [L('dim', '# cómo está el contexto económico')];
            series
                .filter((s) => names[s.key] && s.points.length)
                .forEach((s) => {
                    const v = s.points.map((p) => p.value);
                    const last = v[v.length - 1];
                    const prev = v.length > 1 ? v[v.length - 2] : last;
                    const c = prev ? (last / prev - 1) * 100 : 0;
                    out.push(
                        L(
                            '',
                            pad(names[s.key], 14) +
                                pad(
                                    last.toLocaleString('es-AR', {
                                        maximumFractionDigits: 2,
                                    }),
                                    12,
                                    true,
                                ) +
                                '  ',
                            S(
                                `${c >= 0 ? '▲' : '▼'} ${pct1(Math.abs(c))}`,
                                c >= 0 ? 'ok' : 'err',
                            ),
                        ),
                    );
                });
            return out;
        }
        case 'health': {
            if (!ctx.isAdmin)
                return [L('err', 'ese comando es solo para administradores')];
            const { services } = await getAdminHealthEndpoint();
            return services.map((s) =>
                L(
                    '',
                    pad(s.name, 18),
                    S(
                        s.status === 'up'
                            ? '● ok'
                            : s.status === 'not_configured'
                              ? '● sin configurar'
                              : '● caído',
                        s.status === 'up'
                            ? 'ok'
                            : s.status === 'down'
                              ? 'err'
                              : 'dim',
                    ),
                    s.latency_ms != null ? `  ${s.latency_ms} ms` : '',
                ),
            );
        }
        case 'go': {
            const v = (arg ?? '').toLowerCase();
            if (!PAGES.includes(v))
                return [L('err', 'pestañas: ' + PAGES.join(' · '))];
            window.setTimeout(() => ctx.go('/' + v), 200);
            return [L('ok', `abriendo ${v}…`)];
        }
        default:
            return [
                L(
                    'err',
                    `no conozco "${cmd}" — escribí help para ver qué podés hacer`,
                ),
            ];
    }
}

export default function Terminal() {
    const navigate = useNavigate();
    const location = useLocation();
    const { history, user } = usePortfolio();
    const { rows, totalValue, totalCost } = useHoldingsView();
    const [lines, setLines] = useState<Line[]>(() =>
        session.lines.length
            ? session.lines
            : [
                  L('hd', 'FinanciAr · terminal'),
                  L('dim', 'escribí "help" para ver qué podés hacer'),
                  L('', ' '),
              ],
    );
    const [value, setValue] = useState('');
    const [hi, setHi] = useState(-1);
    const [busy, setBusy] = useState(false);
    const out = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const first = (user?.full_name.split(/\s+/)[0] ?? 'usuario').toLowerCase();
    const prompt = `${first}@financiar:~$`;

    useEffect(() => {
        session.lines = lines;
        if (out.current) out.current.scrollTop = out.current.scrollHeight;
    }, [lines]);

    const queue = useRef<Promise<void>>(Promise.resolve());
    const exec = (raw: string) => {
        queue.current = queue.current.then(() => execOne(raw));
        return queue.current;
    };
    const execOne = async (raw: string) => {
        const [c, a] = raw.trim().split(/\s+/);
        const cmd = (c ?? '').toLowerCase();
        if (raw.trim()) session.hist.unshift(raw);
        setHi(-1);
        const echo = L('cmd', S(prompt, 'ok'), ' ' + raw);
        if (cmd === 'clear') {
            setLines([]);
            return;
        }
        if (!cmd) {
            setLines((l) => [...l, echo]);
            return;
        }
        setBusy(true);
        let res: Line[];
        try {
            res = await run(cmd, a, {
                rows,
                history,
                totalValue,
                totalCost,
                isAdmin: user?.role === 'admin',
                go: navigate,
            });
        } catch {
            res = [
                L(
                    'err',
                    'no pude traer esos datos ahora, probá de nuevo en un rato',
                ),
            ];
        }
        setBusy(false);
        setLines((l) => [...l, echo, ...res, L('', ' ')]);
    };

    const initial = (location.state as { cmd?: string } | null)?.cmd;
    useEffect(() => {
        if (initial) {
            void exec(initial);
            navigate('.', { replace: true, state: null });
        }
        window.setTimeout(
            () => input.current?.focus({ preventScroll: true }),
            50,
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            void exec(value);
            setValue('');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const n = Math.min(session.hist.length - 1, hi + 1);
            setHi(n);
            setValue(session.hist[n] ?? '');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const n = Math.max(-1, hi - 1);
            setHi(n);
            setValue(session.hist[n] ?? '');
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const [c, a] = value.split(' ');
            if (a !== undefined) {
                const m = rows.find((r) =>
                    r.ticker.startsWith(a.toUpperCase()),
                );
                if (m) setValue(`${c} ${m.ticker}`);
            } else {
                const m = [...HELP.map(([h]) => h.split(' ')[0]), 'help'].find(
                    (k) => k.startsWith(c),
                );
                if (m) setValue(m + ' ');
            }
        }
    };

    return (
        <>
            <PageHead
                eyebrow="Herramientas"
                title="Terminal"
                sub="Para los que prefieren el teclado: consultá tu cartera, las predicciones y el mercado escribiendo comandos, como en las terminales financieras profesionales."
            />
            <Explain title="¿Cómo se usa?">
                <p>
                    Escribí un comando y apretá Enter. Por ejemplo{' '}
                    <code>predict GGAL</code> te dice qué esperan los modelos de
                    Galicia, y <code>bl</code> el reparto que estima el modelo.
                    En la lista de comandos tenés todos: tocá cualquiera para
                    probarlo.
                </p>
            </Explain>
            <div className="nx-grid">
                <section className="s8 nx-rv" style={{ minWidth: 0 }}>
                    <div
                        className="nx-term"
                        onClick={(e) =>
                            !(e.target as HTMLElement).closest('input') &&
                            input.current?.focus({ preventScroll: true })
                        }
                    >
                        <div className="nx-term-bar">
                            <i style={{ background: '#ff5f57' }} />
                            <i style={{ background: '#febc2e' }} />
                            <i style={{ background: '#28c840' }} />
                            <span style={{ marginLeft: 8 }}>
                                financiar — terminal
                            </span>
                        </div>
                        <div
                            className="nx-term-out"
                            ref={out}
                            aria-live="polite"
                            data-testid="term-out"
                        >
                            {lines.map((l, k) => (
                                <div key={k} className={l.k}>
                                    {l.segs.map((s, j) =>
                                        typeof s === 'string' ? (
                                            <span key={j}>{s}</span>
                                        ) : (
                                            <span key={j} className={s.k}>
                                                {s.t}
                                            </span>
                                        ),
                                    )}
                                </div>
                            ))}
                            {busy && <div className="dim">…</div>}
                        </div>
                        <div className="nx-term-in">
                            <label htmlFor="nx-term-input">{prompt}</label>
                            <input
                                id="nx-term-input"
                                ref={input}
                                autoComplete="off"
                                spellCheck={false}
                                placeholder="escribí help"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                onKeyDown={onKey}
                            />
                        </div>
                    </div>
                </section>
                <Card span="s4" i={3}>
                    <CardHead title="Comandos" hint="Tocá uno para probarlo" />
                    <div className="nx-list nx-cmdlist">
                        {HELP.filter(([c]) => c !== 'clear').map(([c, d]) => (
                            <button
                                type="button"
                                className="nx-li"
                                key={c}
                                onClick={() => void exec(c)}
                            >
                                <div>
                                    <b>{c}</b>
                                    <br />
                                    <span>{d}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>
            </div>
        </>
    );
}
