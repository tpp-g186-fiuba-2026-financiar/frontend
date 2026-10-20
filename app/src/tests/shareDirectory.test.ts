import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/shares/getAllSharesEndpoint', () => ({
    getAllSharesEndpoint: vi.fn(),
}));
vi.mock('../api/shares/getShareInfo', () => ({ shareInfoEndpoint: vi.fn() }));

import { getAllSharesEndpoint } from '../api/shares/getAllSharesEndpoint';
import {
    shareInfoEndpoint,
    type ShareInfoResponse,
} from '../api/shares/getShareInfo';
import {
    cachedNames,
    cachedQuote,
    fetchQuote,
    findMatch,
    loadQuotes,
    loadShareTickers,
    normalizeText,
    quoteFromInfo,
    resetShareDirectory,
    searchShares,
} from '../utils/shareDirectory';

function info(
    closes: (number | string)[],
    name: string | null = 'Transportadora de Gas del Sur',
): ShareInfoResponse {
    return {
        cached: true,
        status: 200,
        data: closes.map((close, i) => ({
            close_amount: close as number,
            close_unadj_amount: close as number,
            high_amount: 0,
            low_amount: 0,
            open_amount: 0,
            ticker: 'TGSU2',
            ts: 1000 + i,
        })),
        ticker_info: (name
            ? { descripcion: '', nombre_corto: name, nombre_largo: 'Trans' }
            : null) as ShareInfoResponse['ticker_info'],
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetShareDirectory();
});

describe('busqueda', () => {
    it('normaliza mayusculas y tildes', () => {
        expect(normalizeText('Pampa Energía')).toBe('pampa energia');
    });

    it('devuelve el rango de la coincidencia sobre el texto original', () => {
        expect(findMatch('Pampa Energía', 'ENERGIA')).toEqual([6, 13]);
        expect(findMatch('Metrogas S.A.', 'ga')).toEqual([5, 7]);
        expect(findMatch('GGAL', 'x')).toBeNull();
        expect(findMatch('GGAL', '  ')).toBeNull();
    });

    it('ordena por ticker primero y despues por nombre', () => {
        const names = {
            TGSU2: 'Transportadora de Gas del Sur',
            METR: 'Metrogas S.A.',
            GGAL: 'Grupo Financiero Galicia',
            ECOG: null,
        };
        const result = searchShares(
            ['TGSU2', 'METR', 'GGAL', 'ECOG', 'YPFD'],
            names,
            'ga',
        );
        expect(result.map((m) => m.ticker)).toEqual(['GGAL', 'METR', 'TGSU2']);
        expect(result[0].tickerHit).toEqual([1, 3]);
        expect(result[0].nameHit).toEqual([17, 19]);
        expect(result[1].tickerHit).toBeNull();
    });

    it('prioriza los tickers que empiezan con la busqueda', () => {
        const result = searchShares(['AGRO', 'GGAL', 'GAMA'], {}, 'g');
        expect(result.map((m) => m.ticker)).toEqual(['GAMA', 'GGAL', 'AGRO']);
    });

    it('sin texto no devuelve nada', () => {
        expect(searchShares(['GGAL'], {}, ' ')).toEqual([]);
    });
});

describe('cotizaciones', () => {
    it('calcula ultimo cierre y variacion con montos como texto', () => {
        expect(quoteFromInfo(info(['100', '110']))).toEqual({
            name: 'Transportadora de Gas del Sur',
            lastClose: 110,
            dayChangePct: 10,
        });
    });

    it('tolera tickers sin nombre ni historico', () => {
        expect(quoteFromInfo(info([], null))).toEqual({
            name: null,
            lastClose: null,
            dayChangePct: null,
        });
        expect(quoteFromInfo(info([50])).dayChangePct).toBeNull();
    });

    it('cachea la cotizacion y guarda el nombre en localStorage', async () => {
        vi.mocked(shareInfoEndpoint).mockResolvedValue(info([100, 101]));
        const [first, second] = await Promise.all([
            fetchQuote('TGSU2'),
            fetchQuote('TGSU2'),
        ]);
        expect(first).toBe(second);
        expect(await fetchQuote('TGSU2')).toBe(first);
        expect(shareInfoEndpoint).toHaveBeenCalledTimes(1);
        expect(cachedQuote('TGSU2')?.lastClose).toBe(101);
        expect(cachedNames()).toEqual({
            TGSU2: 'Transportadora de Gas del Sur',
        });
    });

    it('si falla devuelve null y deja reintentar', async () => {
        vi.mocked(shareInfoEndpoint).mockRejectedValueOnce(new Error('x'));
        expect(await fetchQuote('METR')).toBeNull();
        vi.mocked(shareInfoEndpoint).mockResolvedValueOnce(info([1, 2]));
        expect((await fetchQuote('METR'))?.lastClose).toBe(2);
    });

    it('carga de a pocos y avisa por cada ticker', async () => {
        let inFlight = 0;
        let maxInFlight = 0;
        vi.mocked(shareInfoEndpoint).mockImplementation(async () => {
            inFlight++;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await new Promise((resolve) => setTimeout(resolve, 1));
            inFlight--;
            return info([10, 20]);
        });
        const seen: string[] = [];
        const tickers = ['A', 'B', 'C', 'D', 'E', 'F'];
        await loadQuotes(tickers, (ticker) => seen.push(ticker));
        expect(seen.sort()).toEqual(tickers);
        expect(maxInFlight).toBeLessThanOrEqual(4);
    });

    it('ignora un localStorage roto', () => {
        localStorage.setItem('shareNames', '{roto');
        expect(cachedNames()).toEqual({});
    });
});

describe('tickers', () => {
    it('pide la lista una vez y reintenta si fallo', async () => {
        vi.mocked(getAllSharesEndpoint).mockRejectedValueOnce(new Error('x'));
        await expect(loadShareTickers()).rejects.toThrow('x');
        vi.mocked(getAllSharesEndpoint).mockResolvedValue({
            shares: [{ id: 1, ticker: 'GGAL', predictable: true }],
        });
        expect(await loadShareTickers()).toEqual(['GGAL']);
        expect(await loadShareTickers()).toEqual(['GGAL']);
        expect(getAllSharesEndpoint).toHaveBeenCalledTimes(2);
    });
});
