import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

function useWidth<T extends HTMLElement>(fallback = 600) {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(fallback);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => setWidth(el.clientWidth || fallback);
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [fallback]);
    return [ref, width] as const;
}

function pathOf(
    values: Array<number | null>,
    x: (i: number) => number,
    y: (v: number) => number,
): string {
    let d = '';
    let pen = false;
    values.forEach((v, i) => {
        if (v == null) {
            pen = false;
            return;
        }
        d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
        pen = true;
    });
    return d;
}

// Fraccion del ancho que ocupa la proyeccion a la derecha de HOY.
// En pantallas chicas se le da mas lugar para que entren las etiquetas.
const projectionShare = (width: number) => (width < 560 ? 0.4 : 0.26);

export interface LineSeries {
    label: string;
    values: Array<number | null>;
    color: string;
    area?: boolean;
    dash?: string;
    width?: number;
}

export interface Band {
    lo: Array<number | null>;
    hi: Array<number | null>;
    color: string;
    opacity?: number;
}

// Lo que predijo cada modelo, dibujado a partir de HOY: un rayo por modelo
// hasta su precio objetivo en su propio plazo, y una flecha con la lectura
// combinada. Las etiquetas de los modelos van en una columna a la derecha.
export interface ForecastRay {
    label: string;
    short: string;
    h: number;
    v: number;
    color: string;
}

export interface Forecast {
    from: number;
    start: number;
    rays: ForecastRay[];
    main?: {
        h: number;
        v: number;
        color: string;
        label: string;
        sublabel: string;
    };
    thresholds?: { up: number; down: number };
}

const GUTTER = 118;
const GUTTER_NARROW = 70;
const gutterFor = (width: number) => (width < 560 ? GUTTER_NARROW : GUTTER);

function forecastValues(f?: Forecast): number[] {
    if (!f) return [];
    const out = [f.start, ...f.rays.map((r) => r.v)];
    if (f.main) out.push(f.main.v);
    if (f.thresholds) out.push(f.thresholds.up, f.thresholds.down);
    return out;
}

// Reparte las etiquetas en vertical sin que se pisen, lo mas cerca posible
// de la altura de su punto.
function ladder(ys: number[], gap: number, top: number, bottom: number) {
    const order = ys.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    const placed = order.map(([v]) => v);
    for (let k = 0; k < placed.length; k++) {
        placed[k] = Math.max(placed[k], top, k ? placed[k - 1] + gap : top);
    }
    for (let k = placed.length - 1; k >= 0; k--) {
        const limit = k === placed.length - 1 ? bottom : placed[k + 1] - gap;
        placed[k] = Math.min(placed[k], limit);
    }
    const out = new Array<number>(ys.length);
    order.forEach(([, i], k) => (out[i] = placed[k]));
    return out;
}

function ForecastLayer({
    f,
    x,
    y,
    top,
    bottom,
    plotRight,
    narrow,
}: {
    f: Forecast;
    x: (i: number) => number;
    y: (v: number) => number;
    top: number;
    bottom: number;
    plotRight: number;
    narrow: boolean;
}) {
    const x0 = x(f.from);
    const y0 = y(f.start);
    const ends = f.rays.map((r) => ({ ...r, ex: x(f.from + r.h), ey: y(r.v) }));
    const labelYs = ladder(
        ends.map((r) => r.ey),
        13,
        top + 6,
        bottom - 2,
    );
    const lx = plotRight + 10;
    const main = f.main
        ? { ...f.main, ex: x(f.from + f.main.h), ey: y(f.main.v) }
        : null;
    const angle = main ? Math.atan2(main.ey - y0, main.ex - x0) : 0;
    const head = (dx: number, dy: number) =>
        `${main!.ex + dx * Math.cos(angle) - dy * Math.sin(angle)},${main!.ey + dx * Math.sin(angle) + dy * Math.cos(angle)}`;
    const labelAbove = main ? main.ey <= y0 : true;
    return (
        <g className="nx-forecast">
            {f.thresholds &&
                (
                    [
                        [f.thresholds.up, 'var(--nx-up)', 'umbral de alza'],
                        [f.thresholds.down, 'var(--nx-down)', 'umbral de baja'],
                    ] as const
                ).map(([v, color, text]) => (
                    <g key={text} opacity={0.75}>
                        <line
                            x1={x0}
                            x2={plotRight}
                            y1={y(v)}
                            y2={y(v)}
                            stroke={color}
                            strokeDasharray="3 5"
                        />
                        {!narrow && (
                            <text
                                x={x0 + 6}
                                y={v >= f.start ? y(v) - 5 : y(v) + 12}
                                fill={color}
                                fontSize="10"
                            >
                                {text}
                            </text>
                        )}
                    </g>
                ))}
            {ends.map((r, k) => (
                <g key={r.label}>
                    <line
                        x1={x0}
                        y1={y0}
                        x2={r.ex}
                        y2={r.ey}
                        stroke={r.color}
                        strokeWidth={1.5}
                        opacity={0.6}
                    />
                    <circle
                        cx={r.ex}
                        cy={r.ey}
                        r={3.5}
                        fill={r.color}
                        stroke="var(--nx-panel-solid)"
                        strokeWidth={1.5}
                    />
                    <path
                        d={`M${r.ex + 4},${r.ey}L${lx - 4},${labelYs[k]}`}
                        stroke={r.color}
                        opacity={0.3}
                        fill="none"
                    />
                    <text
                        x={lx}
                        y={labelYs[k] + 3.5}
                        fill={r.color}
                        fontSize={narrow ? 9.5 : 10.5}
                        fontWeight={600}
                    >
                        {narrow ? r.short : r.label}
                    </text>
                </g>
            ))}
            {main && (
                <g className="nx-forecast-main">
                    <line
                        x1={x0}
                        y1={y0}
                        x2={main.ex}
                        y2={main.ey}
                        stroke={main.color}
                        strokeWidth={3.5}
                        strokeLinecap="round"
                    />
                    <polygon
                        points={`${head(4, 0)} ${head(-9, -6)} ${head(-9, 6)}`}
                        fill={main.color}
                    />
                    <circle cx={x0} cy={y0} r={4.5} fill={main.color} />
                    <text
                        x={main.ex}
                        y={labelAbove ? main.ey - 26 : main.ey + 22}
                        textAnchor="middle"
                        fill={main.color}
                        fontSize="13"
                        fontWeight={800}
                        letterSpacing="0.06em"
                        paintOrder="stroke"
                        stroke="var(--nx-panel-solid)"
                        strokeWidth={5}
                    >
                        {main.label}
                    </text>
                    <text
                        x={main.ex}
                        y={labelAbove ? main.ey - 12 : main.ey + 36}
                        textAnchor="middle"
                        fill={main.color}
                        fontSize="11"
                        fontWeight={600}
                        paintOrder="stroke"
                        stroke="var(--nx-panel-solid)"
                        strokeWidth={5}
                    >
                        {main.sublabel}
                    </text>
                </g>
            )}
        </g>
    );
}

export function LineChart({
    labels,
    series,
    bands = [],
    forecast,
    height = 260,
    yFmt = (v) => v.toFixed(2),
    xFmt = (l) => l,
    tipFmt,
    vline,
    vlineLabel,
    hline,
    splitAt,
    ariaLabel,
}: {
    labels: string[];
    series: LineSeries[];
    bands?: Band[];
    forecast?: Forecast;
    height?: number;
    yFmt?: (v: number) => string;
    xFmt?: (label: string) => string;
    tipFmt?: (label: string) => string;
    vline?: number;
    vlineLabel?: string;
    hline?: number;
    splitAt?: number;
    ariaLabel: string;
}) {
    const [ref, W] = useWidth<HTMLDivElement>();
    const [hover, setHover] = useState<number | null>(null);
    const gid = useId().replace(/:/g, '');
    const n = labels.length;
    const all: number[] = [];
    series.forEach((s) => s.values.forEach((v) => v != null && all.push(v)));
    bands.forEach((b) => {
        b.lo.forEach((v) => v != null && all.push(v));
        b.hi.forEach((v) => v != null && all.push(v));
    });
    if (all.length) all.push(...forecastValues(forecast));
    if (n < 2 || all.length === 0) {
        return (
            <div className="nx-empty" ref={ref}>
                Sin datos suficientes para graficar.
            </div>
        );
    }
    const H = height;
    const pad = { l: 56, r: forecast ? gutterFor(W) : 10, t: 10, b: 26 };
    let mn = Math.min(...all);
    let mx = Math.max(...all);
    const sp = mx - mn || 1;
    mn -= sp * 0.08;
    mx += sp * 0.1;
    // Con `splitAt`, lo que viene despues de ese indice (la proyeccion) ocupa
    // siempre projectionShare del ancho, sin importar cuanto historico haya.
    const plotW = W - pad.l - pad.r;
    const split =
        splitAt != null && splitAt > 0 && splitAt < n - 1 ? splitAt : null;
    const sx =
        split != null ? pad.l + (1 - projectionShare(W)) * plotW : W - pad.r;
    const x = (i: number) =>
        split == null
            ? pad.l + (i / (n - 1)) * plotW
            : i <= split
              ? pad.l + (i / split) * (sx - pad.l)
              : sx + ((i - split) / (n - 1 - split)) * (W - pad.r - sx);
    const indexAt = (px: number) =>
        split == null
            ? ((px - pad.l) / plotW) * (n - 1)
            : px <= sx
              ? ((px - pad.l) / (sx - pad.l)) * split
              : split + ((px - sx) / (W - pad.r - sx)) * (n - 1 - split);
    const y = (v: number) =>
        pad.t + (1 - (v - mn) / (mx - mn)) * (H - pad.t - pad.b);
    const ticks = Math.min(W < 520 ? 3 : 6, n);
    const xTicks = Array.from({ length: ticks }, (_, k) =>
        Math.round((k * (n - 1)) / (ticks - 1)),
    );
    const onMove = (e: React.PointerEvent<SVGRectElement>) => {
        const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
        const mxp = ((e.clientX - r.left) / r.width) * W;
        const i = Math.round(indexAt(mxp));
        setHover(Math.max(0, Math.min(n - 1, i)));
    };
    return (
        <div className="nx-chart" ref={ref}>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                height={H}
                role="img"
                aria-label={ariaLabel}
            >
                <defs>
                    {series.map((s, si) => (
                        <linearGradient
                            key={si}
                            id={`${gid}-${si}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0"
                                stopColor={s.color}
                                stopOpacity=".3"
                            />
                            <stop
                                offset="1"
                                stopColor={s.color}
                                stopOpacity="0"
                            />
                        </linearGradient>
                    ))}
                </defs>
                <g className="nx-axis">
                    {[0, 1, 2, 3, 4].map((k) => {
                        const v = mn + ((mx - mn) * k) / 4;
                        return (
                            <g key={k}>
                                <line
                                    className="nx-gridline"
                                    x1={pad.l}
                                    x2={W - pad.r}
                                    y1={y(v)}
                                    y2={y(v)}
                                />
                                <text
                                    x={pad.l - 8}
                                    y={y(v) + 3}
                                    textAnchor="end"
                                >
                                    {yFmt(v)}
                                </text>
                            </g>
                        );
                    })}
                    {xTicks.map((i, k) => (
                        <text
                            key={k}
                            x={x(i)}
                            y={H - 6}
                            textAnchor={
                                k === 0
                                    ? 'start'
                                    : k === ticks - 1
                                      ? 'end'
                                      : 'middle'
                            }
                        >
                            {xFmt(labels[i])}
                        </text>
                    ))}
                </g>
                {bands.map((b, bi) => {
                    const idx = b.lo
                        .map((v, i) => (v != null && b.hi[i] != null ? i : -1))
                        .filter((i) => i >= 0);
                    if (idx.length < 2) return null;
                    const d =
                        idx
                            .map(
                                (i, k) =>
                                    `${k ? 'L' : 'M'}${x(i)},${y(b.hi[i]!)}`,
                            )
                            .join('') +
                        [...idx]
                            .reverse()
                            .map((i) => `L${x(i)},${y(b.lo[i]!)}`)
                            .join('') +
                        'Z';
                    return (
                        <path
                            key={bi}
                            d={d}
                            fill={b.color}
                            opacity={b.opacity ?? 0.15}
                        />
                    );
                })}
                {vline != null && (
                    <g>
                        <line
                            x1={x(vline)}
                            x2={x(vline)}
                            y1={pad.t}
                            y2={H - pad.b}
                            stroke="var(--nx-ink-3)"
                            strokeDasharray="2 4"
                        />
                        {vlineLabel && (
                            <text
                                x={x(vline) - 6}
                                y={pad.t + 10}
                                textAnchor="end"
                                className="nx-axis"
                                fill="var(--nx-ink-3)"
                                fontSize="10"
                            >
                                {vlineLabel}
                            </text>
                        )}
                    </g>
                )}
                {hline != null && (
                    <line
                        x1={pad.l}
                        x2={W - pad.r}
                        y1={y(hline)}
                        y2={y(hline)}
                        stroke="var(--nx-ink-3)"
                        strokeDasharray="4 4"
                    />
                )}
                {series.map((s, si) => {
                    const d = pathOf(s.values, x, y);
                    const idx = s.values
                        .map((v, i) => (v != null ? i : -1))
                        .filter((i) => i >= 0);
                    return (
                        <g key={si}>
                            {s.area && idx.length > 1 && (
                                <path
                                    d={`${d}L${x(idx[idx.length - 1])},${H - pad.b}L${x(idx[0])},${H - pad.b}Z`}
                                    fill={`url(#${gid}-${si})`}
                                />
                            )}
                            <path
                                d={d}
                                fill="none"
                                stroke={s.color}
                                strokeWidth={s.width ?? 2}
                                strokeDasharray={s.dash}
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            />
                        </g>
                    );
                })}
                {forecast && (
                    <ForecastLayer
                        f={forecast}
                        x={x}
                        y={y}
                        top={pad.t}
                        bottom={H - pad.b}
                        plotRight={W - pad.r}
                        narrow={W < 560}
                    />
                )}
                {hover != null && (
                    <g>
                        <line
                            x1={x(hover)}
                            x2={x(hover)}
                            y1={pad.t}
                            y2={H - pad.b}
                            stroke="var(--nx-ink-3)"
                            strokeDasharray="3 3"
                        />
                        {series.map((s, si) => {
                            const v = s.values[hover];
                            return v == null ? null : (
                                <circle
                                    key={si}
                                    cx={x(hover)}
                                    cy={y(v)}
                                    r={4}
                                    fill={s.color}
                                    stroke="var(--nx-panel-solid)"
                                    strokeWidth={2}
                                />
                            );
                        })}
                    </g>
                )}
                <rect
                    x={pad.l}
                    y={0}
                    width={Math.max(0, W - pad.l - pad.r)}
                    height={H}
                    fill="transparent"
                    onPointerMove={onMove}
                    onPointerLeave={() => setHover(null)}
                />
            </svg>
            {hover != null && (
                <div
                    className="nx-tt"
                    style={
                        x(hover) > W * 0.6
                            ? { right: W - x(hover) + 14 }
                            : { left: x(hover) + 14 }
                    }
                >
                    <div className="nx-muted" style={{ fontSize: 11 }}>
                        {(tipFmt ?? xFmt)(labels[hover])}
                    </div>
                    {series.map((s) =>
                        s.values[hover] == null ? null : (
                            <div key={s.label}>
                                <span style={{ color: s.color }}>●</span>{' '}
                                {s.label}: <b>{yFmt(s.values[hover]!)}</b>
                            </div>
                        ),
                    )}
                </div>
            )}
        </div>
    );
}

export interface Candle {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export function CandleChart({
    candles,
    height = 320,
    projection,
    forecast,
    ariaLabel,
}: {
    candles: Candle[];
    height?: number;
    projection?: {
        lo: number[];
        hi: number[];
        coneColor?: string;
    };
    forecast?: Forecast;
    ariaLabel: string;
}) {
    const [ref, W] = useWidth<HTMLDivElement>();
    const [hover, setHover] = useState<number | null>(null);
    if (candles.length < 2) {
        return (
            <div className="nx-empty" ref={ref}>
                Sin velas disponibles para esta acción.
            </div>
        );
    }
    const P = Math.max(
        projection?.lo.length ?? 0,
        ...(forecast?.rays.map((r) => r.h) ?? []),
        forecast?.main?.h ?? 0,
    );
    const H = height;
    const pad = { l: 56, r: forecast ? gutterFor(W) : 10, t: 10, b: 26 };
    const volH = H * 0.16;
    const all = candles
        .flatMap((c) => [c.high, c.low])
        .concat(projection?.lo ?? [], projection?.hi ?? [])
        .concat(forecastValues(forecast));
    let mn = Math.min(...all);
    let mx = Math.max(...all);
    const sp = mx - mn || 1;
    mn -= sp * 0.05;
    mx += sp * 0.08;
    const plotW = W - pad.l - pad.r;
    const histW = P ? (1 - projectionShare(W)) * plotW : plotW;
    const cw = histW / candles.length;
    const x = (i: number) =>
        i < candles.length
            ? pad.l + (i + 0.5) * cw
            : pad.l +
              (candles.length - 0.5) * cw +
              ((i - (candles.length - 1)) / Math.max(1, P)) *
                  (plotW - histW + cw / 2);
    const ph = H - pad.b - volH - 8;
    const y = (v: number) => pad.t + (1 - (v - mn) / (mx - mn)) * (ph - pad.t);
    const vmax = Math.max(...candles.map((c) => c.volume), 1);
    const bw = Math.max(1.5, cw * 0.62);
    const last = candles.length - 1;
    const proj = projection
        ? {
              lo: [candles[last].close, ...projection.lo],
              hi: [candles[last].close, ...projection.hi],
          }
        : null;
    const px = (k: number) => x(last + k);
    const onMove = (e: React.PointerEvent<SVGRectElement>) => {
        const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
        const mxp = ((e.clientX - r.left) / r.width) * W;
        setHover(
            Math.max(
                0,
                Math.min(candles.length - 1, Math.floor((mxp - pad.l) / cw)),
            ),
        );
    };
    const h = hover != null ? candles[hover] : null;
    return (
        <div className="nx-chart" ref={ref}>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                height={H}
                role="img"
                aria-label={ariaLabel}
            >
                <g className="nx-axis">
                    {[0, 1, 2, 3, 4].map((k) => {
                        const v = mn + ((mx - mn) * k) / 4;
                        return (
                            <g key={k}>
                                <line
                                    className="nx-gridline"
                                    x1={pad.l}
                                    x2={W - pad.r}
                                    y1={y(v)}
                                    y2={y(v)}
                                />
                                <text
                                    x={pad.l - 8}
                                    y={y(v) + 3}
                                    textAnchor="end"
                                >
                                    ${v.toFixed(v > 100 ? 0 : 1)}
                                </text>
                            </g>
                        );
                    })}
                </g>
                {proj && (
                    <g>
                        <path
                            d={
                                proj.hi
                                    .map(
                                        (v, k) =>
                                            `${k ? 'L' : 'M'}${px(k)},${y(v)}`,
                                    )
                                    .join('') +
                                [...proj.lo]
                                    .reverse()
                                    .map(
                                        (v, k) =>
                                            `L${px(proj.lo.length - 1 - k)},${y(v)}`,
                                    )
                                    .join('') +
                                'Z'
                            }
                            fill={projection?.coneColor ?? 'var(--nx-accent-2)'}
                            opacity={0.16}
                        />
                    </g>
                )}
                {candles.map((c, i) => {
                    const col =
                        c.close >= c.open ? 'var(--nx-up)' : 'var(--nx-down)';
                    const yo = y(c.open);
                    const yc = y(c.close);
                    const vh = (c.volume / vmax) * volH;
                    return (
                        <g key={i}>
                            <line
                                x1={x(i)}
                                x2={x(i)}
                                y1={y(c.high)}
                                y2={y(c.low)}
                                stroke={col}
                            />
                            <rect
                                x={x(i) - bw / 2}
                                y={Math.min(yo, yc)}
                                width={bw}
                                height={Math.max(1, Math.abs(yc - yo))}
                                fill={col}
                                rx={1}
                            />
                            <rect
                                x={x(i) - bw / 2}
                                y={H - pad.b - vh}
                                width={bw}
                                height={vh}
                                fill={col}
                                opacity={0.35}
                            />
                        </g>
                    );
                })}
                {forecast && (
                    <ForecastLayer
                        f={forecast}
                        x={x}
                        y={y}
                        top={pad.t}
                        bottom={ph}
                        plotRight={W - pad.r}
                        narrow={W < 560}
                    />
                )}
                <rect
                    x={pad.l}
                    y={0}
                    width={Math.max(0, W - pad.l - pad.r)}
                    height={H}
                    fill="transparent"
                    onPointerMove={onMove}
                    onPointerLeave={() => setHover(null)}
                />
            </svg>
            {h && (
                <div
                    className="nx-tt"
                    style={
                        x(hover!) > W * 0.6
                            ? { right: W - x(hover!) + 14 }
                            : { left: x(hover!) + 14 }
                    }
                >
                    <div className="nx-muted" style={{ fontSize: 11 }}>
                        {h.date}
                    </div>
                    <div>
                        Abrió <b>{h.open.toFixed(2)}</b>
                    </div>
                    <div>
                        Máximo <b>{h.high.toFixed(2)}</b>
                    </div>
                    <div>
                        Mínimo <b>{h.low.toFixed(2)}</b>
                    </div>
                    <div>
                        Cerró <b>{h.close.toFixed(2)}</b>
                    </div>
                </div>
            )}
        </div>
    );
}

export interface PredictionRow {
    label: string;
    ret: number;
    h: number;
    color: string;
}

const fmtPct = (v: number) =>
    (v >= 0 ? '+' : '−') +
    Math.abs(v * 100)
        .toFixed(1)
        .replace('.', ',') +
    '%';

// Una fila por modelo con el retorno que predice, sobre un eje con las zonas
// de baja / neutral / alza que define el perfil. Abajo, la lectura combinada.
export function PredictionStrip({
    rows,
    combined,
    thresholds,
    ariaLabel,
}: {
    rows: PredictionRow[];
    combined?: { ret: number; h: number; color: string; verdict: string };
    thresholds?: { buy: number; sell: number };
    ariaLabel: string;
}) {
    const [ref, W] = useWidth<HTMLDivElement>();
    if (!rows.length && !combined) {
        return (
            <div className="nx-empty" ref={ref}>
                Los modelos todavía no respondieron para esta acción.
            </div>
        );
    }
    const narrow = W < 520;
    const labelW = narrow ? 86 : 132;
    const rowH = 26;
    const head = 26;
    const all = [
        ...rows.map((r) => Math.abs(r.ret)),
        Math.abs(combined?.ret ?? 0),
        Math.abs(thresholds?.buy ?? 0),
        Math.abs(thresholds?.sell ?? 0),
    ];
    const span = Math.max(0.02, Math.max(...all) * 1.25);
    const left = labelW;
    const right = W - (narrow ? 44 : 64);
    const x = (v: number) => left + ((v + span) / (2 * span)) * (right - left);
    const n = rows.length + (combined ? 1 : 0);
    const H = head + n * rowH + (combined ? 10 : 0) + 22;
    const bottom = H - 22;
    const zones = thresholds
        ? [
              [-span, thresholds.sell, 'var(--nx-down)', 'BAJA'],
              [thresholds.sell, thresholds.buy, 'var(--nx-neu)', 'NEUTRAL'],
              [thresholds.buy, span, 'var(--nx-up)', 'ALZA'],
          ]
        : [];
    const ticks = [-span, -span / 2, 0, span / 2, span];
    return (
        <div className="nx-chart nx-strip" ref={ref}>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                height={H}
                role="img"
                aria-label={ariaLabel}
            >
                {zones.map(([a, b, color, name]) => (
                    <g key={name as string}>
                        <rect
                            x={x(a as number)}
                            y={head - 6}
                            width={Math.max(0, x(b as number) - x(a as number))}
                            height={bottom - head + 6}
                            fill={color as string}
                            opacity={name === 'NEUTRAL' ? 0.07 : 0.1}
                            rx={4}
                        />
                        <text
                            x={(x(a as number) + x(b as number)) / 2}
                            y={head - 11}
                            textAnchor="middle"
                            fill={color as string}
                            fontSize="10"
                            fontWeight={700}
                            letterSpacing="0.1em"
                        >
                            {name === 'BAJA'
                                ? '◀ BAJA'
                                : name === 'ALZA'
                                  ? 'ALZA ▶'
                                  : 'NEUTRAL'}
                        </text>
                    </g>
                ))}
                <line
                    x1={x(0)}
                    x2={x(0)}
                    y1={head - 6}
                    y2={bottom}
                    stroke="var(--nx-ink-3)"
                />
                <g className="nx-axis">
                    {ticks.map((t) => (
                        <text key={t} x={x(t)} y={H - 6} textAnchor="middle">
                            {t === 0 ? '0%' : fmtPct(t)}
                        </text>
                    ))}
                </g>
                {rows.map((r, k) => {
                    const cy = head + k * rowH + rowH / 2;
                    const cx = x(r.ret);
                    return (
                        <g key={r.label}>
                            <line
                                x1={left}
                                x2={right}
                                y1={cy}
                                y2={cy}
                                stroke="var(--nx-line)"
                            />
                            <text
                                x={8}
                                y={cy + 4}
                                fill="var(--nx-ink)"
                                fontSize="12"
                            >
                                {r.label}
                            </text>
                            {!narrow && (
                                <text
                                    x={labelW - 10}
                                    y={cy + 4}
                                    textAnchor="end"
                                    fill="var(--nx-ink-3)"
                                    fontSize="10"
                                >
                                    {r.h} ruedas
                                </text>
                            )}
                            <line
                                x1={x(0)}
                                x2={cx}
                                y1={cy}
                                y2={cy}
                                stroke={r.color}
                                strokeWidth={2}
                                opacity={0.6}
                            />
                            <circle
                                cx={cx}
                                cy={cy}
                                r={5.5}
                                fill={r.color}
                                stroke="var(--nx-panel-solid)"
                                strokeWidth={2}
                            />
                            <text
                                x={right + 8}
                                y={cy + 4}
                                fill={r.color}
                                fontSize="11.5"
                                fontWeight={700}
                            >
                                {fmtPct(r.ret)}
                            </text>
                        </g>
                    );
                })}
                {combined &&
                    (() => {
                        const cy = head + rows.length * rowH + 10 + rowH / 2;
                        const cx = x(combined.ret);
                        const dir = combined.ret >= 0 ? 1 : -1;
                        return (
                            <g className="nx-strip-combined">
                                <line
                                    x1={left - labelW + 4}
                                    x2={W - 4}
                                    y1={cy - rowH / 2 - 5}
                                    y2={cy - rowH / 2 - 5}
                                    stroke="var(--nx-line-2, var(--nx-line))"
                                />
                                <text
                                    x={8}
                                    y={cy + 4}
                                    fill={combined.color}
                                    fontSize="12.5"
                                    fontWeight={800}
                                >
                                    {narrow ? 'Combinada' : 'Lectura combinada'}
                                </text>
                                <line
                                    x1={x(0)}
                                    x2={cx - dir * 6}
                                    y1={cy}
                                    y2={cy}
                                    stroke={combined.color}
                                    strokeWidth={6}
                                    strokeLinecap="round"
                                />
                                <polygon
                                    points={`${cx + dir * 4},${cy} ${cx - dir * 8},${cy - 8} ${cx - dir * 8},${cy + 8}`}
                                    fill={combined.color}
                                />
                                <text
                                    x={right + 8}
                                    y={cy + 4}
                                    fill={combined.color}
                                    fontSize="12"
                                    fontWeight={800}
                                >
                                    {fmtPct(combined.ret)}
                                </text>
                            </g>
                        );
                    })()}
            </svg>
        </div>
    );
}

export function Gauge({
    p,
    label = 'PROB. SUBA',
    signal,
}: {
    p: number;
    label?: string;
    signal?: 'alza' | 'baja' | 'neutral';
}) {
    const size = 200;
    const r = size * 0.4;
    const cx = size / 2;
    const cy = size * 0.52;
    const col =
        signal === 'alza'
            ? 'var(--nx-up)'
            : signal === 'baja'
              ? 'var(--nx-down)'
              : 'var(--nx-ink)';
    const gid = useId().replace(/:/g, '');
    const arc = `M${cx - r},${cy}A${r},${r} 0 0 1 ${cx + r},${cy}`;
    const len = Math.PI * r;
    const ang = Math.PI + p * Math.PI;
    return (
        <svg
            viewBox={`0 0 ${size} ${size * 0.8}`}
            style={{
                width: '100%',
                maxWidth: 260,
                display: 'block',
                margin: 'auto',
            }}
            role="img"
            aria-label={`Probabilidad de suba ${Math.round(p * 100)}%`}
        >
            <defs>
                <linearGradient id={gid} x1="0" x2="1">
                    <stop offset="0" stopColor="var(--nx-down)" />
                    <stop offset=".5" stopColor="var(--nx-neu)" />
                    <stop offset="1" stopColor="var(--nx-up)" />
                </linearGradient>
            </defs>
            <path
                d={arc}
                stroke="var(--nx-line-2)"
                strokeWidth={12}
                fill="none"
                strokeLinecap="round"
            />
            <path
                d={arc}
                stroke={`url(#${gid})`}
                strokeWidth={12}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={len}
                strokeDashoffset={len * (1 - p)}
            />
            <line
                x1={cx}
                y1={cy}
                x2={cx + (r - 16) * Math.cos(ang)}
                y2={cy + (r - 16) * Math.sin(ang)}
                stroke="var(--nx-ink)"
                strokeWidth={2.5}
                strokeLinecap="round"
            />
            <circle
                cx={cx}
                cy={cy}
                r={6}
                fill="var(--nx-panel-solid)"
                stroke={col}
                strokeWidth={3}
            />
            <text
                x={cx}
                y={cy + size * 0.17}
                textAnchor="middle"
                style={{
                    font: `600 26px var(--nx-display)`,
                    fill: 'var(--nx-ink)',
                }}
            >
                {Math.round(p * 100)}%
            </text>
            <text
                x={cx}
                y={cy + size * 0.26}
                textAnchor="middle"
                style={{
                    font: '500 10px var(--nx-mono)',
                    fill: col,
                    letterSpacing: '.1em',
                }}
            >
                {signal ? `${label} · ${signal.toUpperCase()}` : label}
            </text>
        </svg>
    );
}

export function Donut({
    items,
    center,
    label = 'Composición de la cartera',
}: {
    items: Array<{ v: number; color: string }>;
    center: ReactNode;
    label?: string;
}) {
    const size = 140;
    const r = size * 0.38;
    const c = 2 * Math.PI * r;
    const offsets = items.reduce<number[]>(
        (acc, _it, k) => [
            ...acc,
            k === 0 ? 0 : acc[k - 1] + items[k - 1].v * c,
        ],
        [],
    );
    return (
        <svg
            viewBox={`0 0 ${size} ${size}`}
            style={{
                width: '100%',
                maxWidth: size,
                display: 'block',
                margin: 'auto',
            }}
            role="img"
            aria-label={label}
        >
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="var(--nx-line)"
                strokeWidth={18}
            />
            {items.map((it, k) => {
                const len = it.v * c;
                return (
                    <circle
                        key={k}
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke={it.color}
                        strokeWidth={18}
                        strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                        strokeDashoffset={-offsets[k]}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                );
            })}
            <text
                x={size / 2}
                y={size / 2 + 6}
                textAnchor="middle"
                style={{
                    font: '600 20px var(--nx-display)',
                    fill: 'var(--nx-ink)',
                }}
            >
                {center}
            </text>
        </svg>
    );
}
