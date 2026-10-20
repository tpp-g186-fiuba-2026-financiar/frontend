interface StrengthInput {
    signal: string | null | undefined;
    last_close: number | null | undefined;
    predicted_close: number | null | undefined;
    probability_up?: number | null;
}

// Qué tan marcada es la señal, de 1 a 3. Con probabilidad (modelo Contexto) se
// mide qué tan lejos queda del 50%; sin ella, por el tamaño del movimiento
// proyectado. No es una probabilidad de acierto.
export function signalStrength(trend: StrengthInput): 0 | 1 | 2 | 3 {
    if (trend.signal !== 'alza' && trend.signal !== 'baja') return 0;
    if (trend.probability_up != null) {
        const conviction = Math.abs(trend.probability_up - 0.5);
        return conviction >= 0.35 ? 3 : conviction >= 0.25 ? 2 : 1;
    }
    if (!trend.last_close || trend.predicted_close == null) return 1;
    const move = Math.abs(trend.predicted_close / trend.last_close - 1);
    return move >= 0.05 ? 3 : move >= 0.02 ? 2 : 1;
}

export function signalLabel(
    signal: string | null | undefined,
    horizonDays: number | null | undefined,
): string {
    if (signal === 'alza' || signal === 'baja') {
        return horizonDays ? `${signal} · ${horizonDays}r` : signal;
    }
    return 'sin vista';
}

// Clase de la pill de señal: alza y baja con su color, el resto neutral.
export function pillClass(signal: string | null | undefined): string {
    switch (signal) {
        case 'alza':
            return 'pill-up';
        case 'baja':
            return 'pill-down';
        default:
            return 'pill-neutral';
    }
}

// Rango típico de la proyección: ±1 desvío de la volatilidad diaria de los
// últimos 60 cierres, escalado al horizonte (raíz del tiempo). No es una
// probabilidad de acierto del modelo, solo cuánto suele moverse el precio.
export function projectionBand(
    history: { close: number }[],
    predictedClose: number,
    horizonDays: number | null | undefined,
): { low: number; high: number } | null {
    const closes = history.slice(-61).map((point) => point.close);
    if (closes.length < 20 || !horizonDays) return null;
    const returns = closes
        .slice(1)
        .map((close, i) => Math.log(close / closes[i]))
        .filter((value) => Number.isFinite(value));
    if (returns.length < 10) return null;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
        returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1);
    const sigma = Math.sqrt(variance) * Math.sqrt(horizonDays);
    return {
        low: predictedClose * Math.exp(-sigma),
        high: predictedClose * Math.exp(sigma),
    };
}
