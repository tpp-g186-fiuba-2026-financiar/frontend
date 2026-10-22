// Formatos numéricos en es-AR usados en toda la interfaz nueva.

export function usd(v: number, decimals = 2): string {
    return (
        '$' +
        v.toLocaleString('es-AR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        })
    );
}

export function usd0(v: number): string {
    return '$' + Math.round(v).toLocaleString('es-AR');
}

// Porcentaje con signo: +1,23%
export function pct(v: number, decimals = 2): string {
    return (
        (v >= 0 ? '+' : '−') +
        Math.abs(v).toFixed(decimals).replace('.', ',') +
        '%'
    );
}

// Porcentaje sin signo: 12,3%
export function pct1(v: number): string {
    return v.toFixed(1).replace('.', ',') + '%';
}

export function num(v: number, decimals = 2): string {
    return v.toFixed(decimals).replace('.', ',');
}

export function arrow(v: number): string {
    return v >= 0 ? '▲' : '▼';
}

export function tone(v: number): 'nx-up' | 'nx-down' {
    return v >= 0 ? 'nx-up' : 'nx-down';
}

// "2026-09-28" sola se interpreta como medianoche UTC, que en Argentina es el
// día anterior: se toma el mediodía para que la fecha no se corra.
function toDate(d: Date | string): Date {
    if (typeof d !== 'string') return d;
    return new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00` : d);
}

export function shortDate(d: Date | string): string {
    const date = toDate(d);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

export function longDate(d: Date | string): string {
    const date = toDate(d);
    return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
    });
}

// Explica por qué una probabilidad alta puede dar "neutral": el modelo solo
// opina en los extremos donde, medido con datos que no vio, le gana a lo normal.
export function signalRule(
    alzaFrom: number | null,
    bajaTo: number | null,
): string {
    const share = (p: number) => `${Math.round(p * 100)}%`;
    const parts = [
        alzaFrom != null ? `"alza" desde ${share(alzaFrom)}` : null,
        bajaTo != null ? `"baja" hasta ${share(bajaTo)}` : null,
    ].filter(Boolean);
    if (!parts.length)
        return 'Por ahora el modelo no emite señales: queda en neutral.';
    return `El modelo solo opina en los casos extremos: dice ${parts.join(' y ')}. En el medio queda en neutral, porque ahí no acierta más que lo normal.`;
}

// Por qué un 70% de XGBoost no es "alza": la probabilidad y la señal
// son dos cosas distintas. El 70% es "en situaciones parecidas, subió
// 7 de cada 10 veces"; la señal solo se enciende en los extremos.
export function xgbProbabilityNote(
    p: number,
    signal: 'alza' | 'baja' | 'neutral',
    horizon: number,
    alzaFrom: number | null,
    bajaTo: number | null,
): string {
    const share = `${Math.round(p * 100)}%`;
    const head =
        `XGBoost es el único modelo que responde "¿qué tan probable es que suba?". ` +
        `Miró miles de ruedas pasadas de acciones argentinas. En situaciones ` +
        `parecidas a la de hoy, el ${share} de las veces la acción terminó más ` +
        `arriba en ${horizon} ruedas.`;
    if (signal === 'alza') {
        return `${head} Como llega al umbral, emite alza.`;
    }
    if (signal === 'baja') {
        return `${head} Como queda por debajo del umbral, emite baja.`;
    }
    const surprise =
        p >= 0.55
            ? ' Eso suena alto, pero no es una señal de alza. '
            : p <= 0.45
              ? ' Eso suena bajo, pero no es una señal de baja. '
              : ' ';
    const rule =
        alzaFrom == null && bajaTo == null
            ? 'El modelo solo opina en los extremos; en el medio queda en neutral.'
            : signalRule(alzaFrom, bajaTo);
    return `${head}${surprise}${rule}`;
}

// Valor de una variable del modelo en palabras (unit viene de api-ml).
export function featureValue(value: number | null, unit?: string): string {
    if (value == null) return 'sin dato';
    const signed = (v: number, d = 1) =>
        `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('es-AR', { maximumFractionDigits: d, minimumFractionDigits: d })}`;
    switch (unit) {
        case 'pct':
            return `${signed(value * 100)}%`;
        case 'rank':
            return `mayor que el ${Math.round(value * 100)}% de las acciones`;
        case 'flag':
            return value >= 0.5 ? 'sí' : 'no';
        case 'days':
            return `${Math.round(value)} ${Math.round(value) === 1 ? 'rueda' : 'ruedas'}`;
        case 'index':
            return Math.round(value).toString();
        default:
            return signed(value, 2);
    }
}
