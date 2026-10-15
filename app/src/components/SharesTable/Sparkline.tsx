import { useId } from 'react';

// Últimos cierres de la acción: línea con relleno suave y un punto en el valor
// actual. El color sigue la señal del modelo (verde alza, rojo baja, gris sin vista).
function Sparkline({
    closes,
    signal,
    label,
}: {
    closes: number[];
    signal: string | null | undefined;
    label: string;
}) {
    const gradientId = useId();
    const W = 88;
    const H = 28;
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const points = closes.map((close, i) => ({
        x: 2 + (i / Math.max(1, closes.length - 1)) * (W - 4),
        y: H - 4 - ((close - min) / span) * (H - 8),
    }));
    const line = points
        .map(
            (p, i) =>
                `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
        )
        .join(' ');
    const last = points[points.length - 1];
    const color =
        signal === 'alza'
            ? 'var(--up)'
            : signal === 'baja'
              ? 'var(--down)'
              : 'var(--neutral-sig)';
    return (
        <svg
            className="sparkline"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={label}
        >
            <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor={color} stopOpacity="0.3" />
                    <stop offset="1" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d={`${line} L${W - 2} ${H} L2 ${H} Z`}
                fill={`url(#${gradientId})`}
            />
            <path
                d={line}
                fill="none"
                stroke={color}
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx={last.x} cy={last.y} r="2.4" fill={color} />
        </svg>
    );
}

export default Sparkline;
