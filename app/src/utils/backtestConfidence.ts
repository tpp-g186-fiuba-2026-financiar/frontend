// Cuanta confianza dar a una accuracy medida sobre pocos casos. Con ~24 casos,
// 67% y 52% no se distinguen: recién se declara "mejor" a un modelo cuando su
// intervalo de confianza queda por encima del de todos los demás.

export const MIN_RELIABLE_CASES = 30;

export interface BacktestAccuracy {
    accuracy: number;
    observations: number;
    low: number;
    high: number;
}

// Intervalo de Wilson al 95%.
export function wilsonInterval(accuracy: number, n: number): [number, number] {
    if (n <= 0) return [0, 1];
    const z = 1.96;
    const denom = 1 + (z * z) / n;
    const center = (accuracy + (z * z) / (2 * n)) / denom;
    const half =
        (z *
            Math.sqrt(
                (accuracy * (1 - accuracy)) / n + (z * z) / (4 * n * n),
            )) /
        denom;
    return [Math.max(0, center - half), Math.min(1, center + half)];
}

export function toBacktestAccuracy(
    backtest:
        | {
              directional_accuracy?: number | null;
              observations?: number | null;
              accuracy_low?: number | null;
              accuracy_high?: number | null;
          }
        | null
        | undefined,
): BacktestAccuracy | null {
    const accuracy = backtest?.directional_accuracy;
    const observations = backtest?.observations;
    if (accuracy == null || !observations) return null;
    const [low, high] =
        backtest?.accuracy_low != null && backtest?.accuracy_high != null
            ? [backtest.accuracy_low, backtest.accuracy_high]
            : wilsonInterval(accuracy, observations);
    return { accuracy, observations, low, high };
}

// Devuelve el modelo ganador solo si es claramente mejor que el azar y que el resto.
export function pickClearWinner(
    models: Array<[string, BacktestAccuracy]>,
): string | null {
    if (models.length === 0) return null;
    const sorted = [...models].sort((a, b) => b[1].accuracy - a[1].accuracy);
    const [name, top] = sorted[0];
    if (top.low <= 0.5) return null;
    const runnerUp = sorted[1]?.[1];
    if (runnerUp && top.low <= runnerUp.high) return null;
    return name;
}
