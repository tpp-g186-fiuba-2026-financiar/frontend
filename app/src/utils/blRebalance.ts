// Cálculos del rebalanceo sugerido por Black-Litterman (puros, sin UI).

export interface PesoRow {
    ticker: string;
    peso: number;
    // Peso actual en cartera (0-1); null si no hay precio actual.
    actual: number | null;
}

// Diferencias menores a este umbral (en puntos de cartera) se muestran como
// "mantener": rebalancear por menos que eso no vale los costos de operar.
export const HOLD_THRESHOLD = 0.01;

export function buildRows(
    pesos: Record<string, number>,
    actuales: Record<string, number | null>,
): PesoRow[] {
    // Si se pudieron leer los pesos de la cartera, una acción recomendada que
    // el usuario no tiene pesa 0 hoy (hay que agregarla), no "desconocido".
    const pnlLoaded = Object.values(actuales).some((v) => v != null);
    return Object.entries(pesos)
        .map(([ticker, peso]) => ({
            ticker,
            peso,
            actual: actuales[ticker] ?? (pnlLoaded ? 0 : null),
        }))
        .sort((a, b) => b.peso - a.peso);
}

// Para el gráfico 3D: las N de mayor peso (sugerido o actual) y el resto
// agrupado en "Otros", así la escena sigue siendo legible con muchos activos.
export function topWithOthers(rows: PesoRow[], n = 8): PesoRow[] {
    if (rows.length <= n) return rows;
    const ranked = [...rows].sort(
        (a, b) =>
            Math.max(b.peso, b.actual ?? 0) - Math.max(a.peso, a.actual ?? 0),
    );
    const head = ranked.slice(0, n);
    const tail = ranked.slice(n);
    const others: PesoRow = {
        ticker: 'Otros',
        peso: tail.reduce((acc, r) => acc + r.peso, 0),
        actual: tail.some((r) => r.actual != null)
            ? tail.reduce((acc, r) => acc + (r.actual ?? 0), 0)
            : null,
    };
    return [...head, others];
}

export function diffOf(row: PesoRow): number | null {
    return row.actual == null ? null : row.peso - row.actual;
}

export function actionOf(
    diff: number | null,
): 'aumentar' | 'reducir' | 'mantener' | null {
    if (diff == null) return null;
    if (Math.abs(diff) < HOLD_THRESHOLD) return 'mantener';
    return diff > 0 ? 'aumentar' : 'reducir';
}

// Rotación: qué parte de la cartera habría que mover para llegar a la
// distribución sugerida (la mitad de la suma de diferencias absolutas).
export function turnoverOf(rows: PesoRow[]): number | null {
    if (rows.length === 0 || rows.some((row) => row.actual == null))
        return null;
    return (
        rows.reduce(
            (acc, row) => acc + Math.abs(row.peso - (row.actual ?? 0)),
            0,
        ) / 2
    );
}
