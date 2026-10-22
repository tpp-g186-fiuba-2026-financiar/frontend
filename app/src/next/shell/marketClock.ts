export interface MarketStatus {
    isOpen: boolean;
    time: string;
    message: string;
}

export function marketStatus(
    timeZone: string,
    open: [number, number],
    close: [number, number],
    now: Date = new Date(),
): MarketStatus {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short',
        hour12: false,
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
    const h = Number(get('hour')) % 24;
    const m = Number(get('minute'));
    const minutes = h * 60 + m;
    const o = open[0] * 60 + open[1];
    const c = close[0] * 60 + close[1];
    const weekday = !['Sat', 'Sun'].includes(get('weekday'));
    const isOpen = weekday && minutes >= o && minutes < c;
    const fmt = (d: number) =>
        `${Math.floor(d / 60)}h ${String(d % 60).padStart(2, '0')}m`;
    return {
        isOpen,
        time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        message: isOpen
            ? `cierra en ${fmt(c - minutes)}`
            : weekday && minutes < o
              ? `abre en ${fmt(o - minutes)}`
              : 'cerrado',
    };
}

export const BYMA = (now?: Date) =>
    marketStatus('America/Argentina/Buenos_Aires', [11, 0], [17, 0], now);
export const NYSE = (now?: Date) =>
    marketStatus('America/New_York', [9, 30], [16, 0], now);
