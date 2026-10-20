import { getAllSharesEndpoint } from '../api/shares/getAllSharesEndpoint';
import {
    shareInfoEndpoint,
    type ShareInfoResponse,
} from '../api/shares/getShareInfo';

// Directorio de acciones para el buscador de la topbar: tickers, nombre de la
// empresa, ultimo cierre y variacion del dia. Los nombres salen del historico
// del collector (~500 KB por ticker), asi que se piden recien cuando se abre
// el buscador, de a pocos a la vez, y quedan cacheados: los precios en memoria
// durante la sesion y los nombres en localStorage (casi nunca cambian).

export interface ShareQuote {
    name: string | null;
    lastClose: number | null;
    dayChangePct: number | null;
}

export interface ShareMatch {
    ticker: string;
    name: string | null;
    // [inicio, fin) de la parte que coincide, sobre el texto original
    tickerHit: [number, number] | null;
    nameHit: [number, number] | null;
}

const NAMES_KEY = 'shareNames';
const QUOTE_CONCURRENCY = 4;

let tickersPromise: Promise<string[]> | null = null;
const quoteCache = new Map<string, ShareQuote>();
const pendingQuotes = new Map<string, Promise<ShareQuote | null>>();

export function loadShareTickers(): Promise<string[]> {
    if (!tickersPromise) {
        tickersPromise = getAllSharesEndpoint()
            .then((res) => res.shares.map((share) => share.ticker))
            .catch((error) => {
                // Sin cachear el error: el proximo intento vuelve a pedirla
                tickersPromise = null;
                throw error;
            });
    }
    return tickersPromise;
}

export function cachedNames(): Record<string, string> {
    try {
        const raw = localStorage.getItem(NAMES_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object'
            ? (parsed as Record<string, string>)
            : {};
    } catch {
        return {};
    }
}

function saveName(ticker: string, name: string) {
    try {
        const names = cachedNames();
        if (names[ticker] === name) return;
        localStorage.setItem(
            NAMES_KEY,
            JSON.stringify({ ...names, [ticker]: name }),
        );
    } catch {
        // Sin localStorage el nombre solo vive en memoria
    }
}

export function quoteFromInfo(res: ShareInfoResponse): ShareQuote {
    // El collector manda los montos como texto aunque el tipo diga number
    const closes = [...(res.data ?? [])]
        .sort((a, b) => a.ts - b.ts)
        .map((day) => Number(day.close_amount))
        .filter((close) => Number.isFinite(close) && close > 0);
    const last = closes.length > 0 ? closes[closes.length - 1] : null;
    const prev = closes.length > 1 ? closes[closes.length - 2] : null;
    return {
        name: res.ticker_info?.nombre_corto?.trim() || null,
        lastClose: last,
        dayChangePct:
            last != null && prev != null ? ((last - prev) / prev) * 100 : null,
    };
}

export function cachedQuote(ticker: string): ShareQuote | undefined {
    return quoteCache.get(ticker);
}

export function fetchQuote(ticker: string): Promise<ShareQuote | null> {
    const cached = quoteCache.get(ticker);
    if (cached) return Promise.resolve(cached);
    const pending = pendingQuotes.get(ticker);
    if (pending) return pending;
    const request = shareInfoEndpoint({ share: ticker })
        .then((res) => {
            const quote = quoteFromInfo(res);
            quoteCache.set(ticker, quote);
            if (quote.name) saveName(ticker, quote.name);
            return quote;
        })
        .catch(() => null)
        .finally(() => pendingQuotes.delete(ticker));
    pendingQuotes.set(ticker, request);
    return request;
}

// Pide las cotizaciones de a QUOTE_CONCURRENCY y avisa por cada una que llega
// (null si fallo), asi el desplegable se completa de a poco.
export async function loadQuotes(
    tickers: string[],
    onQuote: (ticker: string, quote: ShareQuote | null) => void,
): Promise<void> {
    const queue = [...tickers];
    const worker = async () => {
        for (let ticker = queue.shift(); ticker; ticker = queue.shift()) {
            onQuote(ticker, await fetchQuote(ticker));
        }
    };
    await Promise.all(
        Array.from({ length: Math.min(QUOTE_CONCURRENCY, queue.length) }, () =>
            worker(),
        ),
    );
}

// Minusculas y sin tildes, caracter por caracter para poder mapear la
// coincidencia de vuelta al texto original.
function foldChar(char: string): string {
    return char.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function normalizeText(text: string): string {
    return Array.from(text, foldChar).join('');
}

export function findMatch(
    text: string,
    query: string,
): [number, number] | null {
    const needle = normalizeText(query.trim());
    if (!needle) return null;
    let folded = '';
    const origin: number[] = [];
    let offset = 0;
    for (const char of Array.from(text)) {
        const part = foldChar(char);
        for (let i = 0; i < part.length; i++) origin.push(offset);
        folded += part;
        offset += char.length;
    }
    origin.push(offset);
    const at = folded.indexOf(needle);
    if (at < 0) return null;
    return [origin[at], origin[at + needle.length]];
}

// Busca por ticker y por nombre. Primero los que coinciden por ticker (y entre
// esos los que empiezan con la busqueda), despues los que coinciden por nombre;
// a igual rango, en orden alfabetico.
export function searchShares(
    tickers: string[],
    names: Record<string, string | null | undefined>,
    query: string,
): ShareMatch[] {
    if (!normalizeText(query.trim())) return [];
    return tickers
        .map((ticker) => {
            const name = names[ticker] ?? null;
            const tickerHit = findMatch(ticker, query);
            const nameHit = name ? findMatch(name, query) : null;
            const rank = tickerHit ? (tickerHit[0] === 0 ? 0 : 1) : 2;
            return { ticker, name, tickerHit, nameHit, rank };
        })
        .filter((match) => match.tickerHit || match.nameHit)
        .sort((a, b) => a.rank - b.rank || a.ticker.localeCompare(b.ticker))
        .map(({ ticker, name, tickerHit, nameHit }) => ({
            ticker,
            name,
            tickerHit,
            nameHit,
        }));
}

// Solo para tests: vacia las caches del modulo.
export function resetShareDirectory() {
    tickersPromise = null;
    quoteCache.clear();
    pendingQuotes.clear();
}
