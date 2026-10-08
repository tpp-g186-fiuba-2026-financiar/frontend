// Banda de volatilidad a partir del pronostico de GARCH. GARCH no predice
// direccion: da el desvio diario esperado de los retornos logaritmicos (en %)
// para cada una de las proximas ruedas. Para el rango a h ruedas se acumulan
// las varianzas (los retornos diarios se suman en log) y se proyecta el
// precio con exp(±z·σ) alrededor del ultimo cierre.

export interface VolatilityPoint {
    horizon_days: number;
    volatility_pct: number;
}

export interface GarchBandPoint {
    days: number;
    sigmaPct: number;
    low: number;
    high: number;
}

// ±1σ: el precio deberia quedar dentro de la banda ~68% de las veces.
export const GARCH_BAND_SIGMAS = 1;

export function buildGarchBand(
    basePrice: number | null | undefined,
    forecast: VolatilityPoint[] | null | undefined,
    sigmas: number = GARCH_BAND_SIGMAS,
): GarchBandPoint[] {
    if (basePrice == null || basePrice <= 0 || !forecast) return [];
    const points = forecast
        .filter(
            (point) =>
                Number.isFinite(point.horizon_days) &&
                point.horizon_days > 0 &&
                Number.isFinite(point.volatility_pct) &&
                point.volatility_pct >= 0,
        )
        .sort((a, b) => a.horizon_days - b.horizon_days);
    if (points.length === 0) return [];

    const band: GarchBandPoint[] = [
        { days: 0, sigmaPct: 0, low: basePrice, high: basePrice },
    ];
    let variance = 0;
    let previousDay = 0;
    for (const point of points) {
        // Si faltan ruedas intermedias se asume la misma volatilidad diaria
        const gap = point.horizon_days - previousDay;
        variance += gap * point.volatility_pct ** 2;
        previousDay = point.horizon_days;
        const sigmaPct = Math.sqrt(variance);
        const move = (sigmas * sigmaPct) / 100;
        band.push({
            days: point.horizon_days,
            sigmaPct,
            low: basePrice * Math.exp(-move),
            high: basePrice * Math.exp(move),
        });
    }
    return band;
}
