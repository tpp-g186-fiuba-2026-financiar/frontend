import { useEffect, useRef, useState } from 'react';

// Anima un número de su valor anterior al nuevo (easing de salida). Con
// `prefers-reduced-motion` salta directo al valor final.
export function useCountUp(target: number, durationMs = 900): number {
    const [value, setValue] = useState(target);
    const fromRef = useRef(target);

    useEffect(() => {
        const reduce =
            typeof window !== 'undefined' &&
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        const from = fromRef.current;
        if (reduce || from === target) {
            fromRef.current = target;
            setValue(target);
            return;
        }
        const start = performance.now();
        let raf = 0;
        const frame = (now: number) => {
            const t = Math.min(1, (now - start) / durationMs);
            const eased = 1 - Math.pow(1 - t, 3);
            const next = from + (target - from) * eased;
            fromRef.current = next;
            setValue(next);
            if (t < 1) raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, [target, durationMs]);

    return value;
}
