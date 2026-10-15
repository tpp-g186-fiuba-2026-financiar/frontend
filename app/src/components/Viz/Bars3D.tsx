import { useEffect, useRef, useState } from 'react';

export interface Bars3DItem {
    label: string;
    values: number[]; // una por serie, en las mismas unidades
}

interface Bars3DProps {
    items: Bars3DItem[];
    seriesLabels?: string[];
    height?: number; // alto máximo de una barra, en px
    interactive?: boolean;
    ariaLabel: string;
    formatValue?: (value: number) => string;
}

const SERIES_COLORS = ['var(--accent)', 'var(--up)', 'var(--warn)'];
const BAR = 24;
const GAP = 8;
const GROUP_GAP = 30;

// Columnas en 3D hechas con CSS (sin librerías): el escenario gira solo con un
// vaivén suave y sigue al puntero cuando está encima. Respeta
// `prefers-reduced-motion` (queda quieto en un ángulo fijo).
function Bars3D({
    items,
    seriesLabels = [],
    height = 130,
    interactive = true,
    ariaLabel,
    formatValue = (v) => `${Math.round(v * 100)}%`,
}: Bars3DProps) {
    const sceneRef = useRef<HTMLDivElement>(null);
    const [rz, setRz] = useState(-28);
    const [rx, setRx] = useState(58);
    const hovering = useRef(false);
    const [fit, setFit] = useState(1);

    useEffect(() => {
        const reduce = window.matchMedia?.(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        if (reduce) return;
        let raf = 0;
        const frame = (now: number) => {
            if (!hovering.current) {
                setRz(-28 + Math.sin(now / 2600) * 14);
            }
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);

    const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!interactive) return;
        const box = sceneRef.current?.getBoundingClientRect();
        if (!box) return;
        const nx = (e.clientX - box.left) / box.width - 0.5;
        const ny = (e.clientY - box.top) / box.height - 0.5;
        hovering.current = true;
        setRz(-28 + nx * 46);
        setRx(58 + ny * -18);
    };
    const onLeave = () => {
        hovering.current = false;
        setRx(58);
    };

    const series = Math.max(1, ...items.map((i) => i.values.length));
    const max = Math.max(0.0001, ...items.flatMap((i) => i.values));
    const groupWidth = series * BAR + (series - 1) * GAP;
    const stageWidth =
        items.length * groupWidth + Math.max(0, items.length - 1) * GROUP_GAP;
    const stageDepth = BAR + 40;

    // Achica la escena si no entra en el contenedor (muchas barras).
    useEffect(() => {
        const el = sceneRef.current;
        if (!el) return;
        const update = () => {
            const room = el.clientWidth * 0.86;
            setFit(room > 0 ? Math.min(1, room / (stageWidth + 40)) : 1);
        };
        update();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, [stageWidth]);

    return (
        <div
            ref={sceneRef}
            className="b3-scene"
            style={{ height: height + 130 }}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            role="img"
            aria-label={ariaLabel}
        >
            <div
                className="b3-stage"
                style={{
                    width: stageWidth,
                    height: stageDepth,
                    transform: `translate(-50%, -30%) scale(${fit}) rotateX(${rx}deg) rotateZ(${rz}deg)`,
                    ['--rx' as string]: `${rx}deg`,
                    ['--rz' as string]: `${rz}deg`,
                }}
            >
                <div
                    className="b3-floor"
                    style={{ width: stageWidth + 40, height: stageDepth + 30 }}
                />
                {items.map((item, gi) => {
                    const gx = gi * (groupWidth + GROUP_GAP);
                    return (
                        <div
                            key={item.label}
                            className="b3-group"
                            style={{ left: gx, width: groupWidth, height: BAR }}
                        >
                            {item.values.map((value, si) => {
                                const h = Math.max(2, (value / max) * height);
                                return (
                                    <div
                                        key={si}
                                        className="b3-bar"
                                        title={`${item.label}${seriesLabels[si] ? ` · ${seriesLabels[si]}` : ''}: ${formatValue(value)}`}
                                        style={{
                                            left: si * (BAR + GAP),
                                            width: BAR,
                                            height: BAR,
                                            ['--c' as string]:
                                                SERIES_COLORS[
                                                    si % SERIES_COLORS.length
                                                ],
                                            ['--h' as string]: `${h}px`,
                                            ['--delay' as string]: `${gi * 70 + si * 40}ms`,
                                        }}
                                    >
                                        <i className="b3-face b3-top" />
                                        <i className="b3-face b3-front" />
                                        <i className="b3-face b3-right" />
                                        <span className="b3-value">
                                            {formatValue(value)}
                                        </span>
                                    </div>
                                );
                            })}
                            <span className="b3-label">{item.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Bars3D;
