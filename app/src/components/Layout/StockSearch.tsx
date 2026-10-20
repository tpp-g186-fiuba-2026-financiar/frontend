import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
    type ReactNode,
} from 'react';
import type { ShareTrend } from '../../api/userShares/getUserSharesTrendsEndpoint';
import { pillClass, signalLabel } from '../../utils/modelInsights';
import {
    cachedNames,
    cachedQuote,
    loadQuotes,
    loadShareTickers,
    searchShares,
    type ShareMatch,
    type ShareQuote,
} from '../../utils/shareDirectory';

interface StockSearchProps {
    // Acciones de la cartera del usuario, con la señal que muestra la tabla
    portfolio: { ticker: string; trend: ShareTrend | null }[];
    onSelect: (ticker: string) => void;
    onOpenChange?: (open: boolean) => void;
}

const LIST_ID = 'stock-search-list';

function optionId(ticker: string): string {
    return `stock-search-opt-${ticker}`;
}

function formatPrice(value: number): string {
    return `$${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
}

function formatChange(value: number): { text: string; color: string } {
    const rounded = Math.round(value * 10) / 10;
    const abs = Math.abs(rounded).toLocaleString('es-AR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
    if (rounded === 0) return { text: `${abs}%`, color: 'var(--ink-3)' };
    return rounded > 0
        ? { text: `+${abs}%`, color: 'var(--up)' }
        : { text: `−${abs}%`, color: 'var(--down)' };
}

function highlight(text: string, hit: [number, number] | null): ReactNode {
    if (!hit) return text;
    return (
        <>
            {text.slice(0, hit[0])}
            <mark className="stock-search-hit">
                {text.slice(hit[0], hit[1])}
            </mark>
            {text.slice(hit[1])}
        </>
    );
}

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return (
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    );
}

function SearchIcon() {
    return (
        <svg
            className="stock-search-icon"
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
        >
            <circle
                cx="7"
                cy="7"
                r="4.8"
                stroke="currentColor"
                strokeWidth="1.6"
            />
            <path
                d="M10.6 10.6L14 14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
            />
        </svg>
    );
}

function StockSearch({ portfolio, onSelect, onOpenChange }: StockSearchProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [focused, setFocused] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [tickers, setTickers] = useState<string[]>([]);
    const [names, setNames] = useState<Record<string, string>>(cachedNames);
    const [quotes, setQuotes] = useState<Record<string, ShareQuote | null>>({});
    const [quotesRequested, setQuotesRequested] = useState(false);

    const open = focused && !dismissed && query.trim() !== '';

    useEffect(() => {
        let cancelled = false;
        loadShareTickers()
            .then((list) => {
                if (!cancelled) setTickers(list);
            })
            .catch(() => {
                // Sin la lista igual se puede buscar entre las de la cartera
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        onOpenChange?.(open);
    }, [open, onOpenChange]);

    // "/" enfoca el buscador desde cualquier lado, salvo que se este escribiendo
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
            if (isTypingTarget(e.target)) return;
            e.preventDefault();
            inputRef.current?.focus();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, []);

    const allTickers = useMemo(
        () =>
            Array.from(
                new Set([...portfolio.map((row) => row.ticker), ...tickers]),
            ),
        [portfolio, tickers],
    );

    const trendByTicker = useMemo(
        () => new Map(portfolio.map((row) => [row.ticker, row.trend])),
        [portfolio],
    );
    const matches = useMemo(
        () => searchShares(allTickers, names, query),
        [allTickers, names, query],
    );
    const owned = matches.filter((m) => trendByTicker.has(m.ticker));
    const others = matches.filter((m) => !trendByTicker.has(m.ticker));
    // Mismo orden que en pantalla, para moverse con las flechas
    const ordered = [...owned, ...others];
    const active = open ? ordered[activeIndex] : undefined;
    const loadingQuotes =
        quotesRequested && allTickers.some((ticker) => !(ticker in quotes));

    // Los nombres y precios se piden recien la primera vez que se usa el
    // buscador; lo que ya estaba en la cache del modulo aparece al instante.
    const requestQuotes = () => {
        if (quotesRequested) return;
        setQuotesRequested(true);
        loadShareTickers()
            .catch(() => [] as string[])
            .then((list) => {
                const all = Array.from(new Set([...allTickers, ...list]));
                const initial: Record<string, ShareQuote | null> = {};
                all.forEach((ticker) => {
                    const quote = cachedQuote(ticker);
                    if (quote) initial[ticker] = quote;
                });
                setQuotes((current) => ({ ...initial, ...current }));
                return loadQuotes(
                    all.filter((ticker) => !(ticker in initial)),
                    (ticker, quote) => {
                        setQuotes((current) => ({
                            ...current,
                            [ticker]: quote,
                        }));
                        const name = quote?.name;
                        if (!name) return;
                        setNames((current) =>
                            current[ticker] === name
                                ? current
                                : { ...current, [ticker]: name },
                        );
                    },
                );
            });
    };

    const changeQuery = (value: string) => {
        setQuery(value);
        setActiveIndex(0);
        setDismissed(false);
    };

    const choose = (ticker: string) => {
        setQuery('');
        setActiveIndex(0);
        inputRef.current?.blur();
        onSelect(ticker);
    };

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            if (open) setDismissed(true);
            else inputRef.current?.blur();
            return;
        }
        if (!open || ordered.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((index) => (index + 1) % ordered.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(
                (index) => (index - 1 + ordered.length) % ordered.length,
            );
        } else if (e.key === 'Enter' && active) {
            e.preventDefault();
            choose(active.ticker);
        }
    };

    const renderOption = (match: ShareMatch) => {
        const index = ordered.indexOf(match);
        const isActive = index === activeIndex;
        const quote = quotes[match.ticker];
        const quoteLoading = !(match.ticker in quotes);
        const trend = trendByTicker.get(match.ticker);
        const change =
            quote?.dayChangePct != null
                ? formatChange(quote.dayChangePct)
                : null;
        return (
            <div
                key={match.ticker}
                id={optionId(match.ticker)}
                role="option"
                aria-selected={isActive}
                className={`stock-search-option${isActive ? ' is-active' : ''}`}
                // mousedown cancelado: el input no pierde el foco antes del click
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(match.ticker)}
            >
                <span className="t-ticker">
                    {highlight(match.ticker, match.tickerHit)}
                </span>
                <span className="stock-search-name">
                    {match.name ? (
                        <span className="stock-search-name-text">
                            {highlight(match.name, match.nameHit)}
                        </span>
                    ) : (
                        quoteLoading && (
                            <span className="skel" aria-hidden="true" />
                        )
                    )}
                    {trend?.available && (
                        <span className={`pill ${pillClass(trend.signal)}`}>
                            {signalLabel(trend.signal, trend.horizon_days)}
                        </span>
                    )}
                </span>
                <span className="stock-search-quote">
                    {quote?.lastClose != null ? (
                        <span className="num stock-search-price">
                            {formatPrice(quote.lastClose)}
                        </span>
                    ) : quoteLoading ? (
                        <span className="skel" aria-hidden="true" />
                    ) : (
                        <span className="dash">—</span>
                    )}
                    {change ? (
                        <span
                            className="num stock-search-change"
                            style={{ color: change.color }}
                        >
                            {change.text}
                        </span>
                    ) : (
                        quoteLoading && (
                            <span
                                className="skel stock-search-skel-sm"
                                aria-hidden="true"
                            />
                        )
                    )}
                </span>
                {isActive && (
                    <span className="stock-search-enter" aria-hidden="true">
                        ↵
                    </span>
                )}
            </div>
        );
    };

    const renderGroup = (id: string, label: string, items: ShareMatch[]) =>
        items.length > 0 && (
            <div role="group" aria-labelledby={id}>
                <div id={id} className="stock-search-group" role="presentation">
                    {label}
                </div>
                {items.map(renderOption)}
            </div>
        );

    return (
        <div className={`stock-search${open ? ' is-open' : ''}`} role="search">
            <SearchIcon />
            <input
                ref={inputRef}
                type="text"
                className="stock-search-input"
                placeholder="Buscar acción o empresa"
                aria-label="Buscar acción por ticker o empresa"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls={LIST_ID}
                aria-activedescendant={
                    active ? optionId(active.ticker) : undefined
                }
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                    setFocused(true);
                    setDismissed(false);
                    requestQuotes();
                }}
                onBlur={() => setFocused(false)}
            />
            {query ? (
                <button
                    type="button"
                    className="stock-search-clear"
                    aria-label="Borrar búsqueda"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                        changeQuery('');
                        inputRef.current?.focus();
                    }}
                >
                    ✕
                </button>
            ) : (
                <kbd className="stock-search-kbd" aria-hidden="true">
                    /
                </kbd>
            )}
            <div
                id={LIST_ID}
                role="listbox"
                aria-label="Resultados de búsqueda"
                className="stock-search-panel"
                hidden={!open}
            >
                {open && (
                    <>
                        {ordered.length === 0 ? (
                            <p className="stock-search-empty">
                                No encontramos acciones para “{query.trim()}”.
                            </p>
                        ) : (
                            <div className="stock-search-results">
                                {renderGroup(
                                    'stock-search-owned',
                                    'En tu cartera',
                                    owned,
                                )}
                                {renderGroup(
                                    'stock-search-others',
                                    'Otras acciones del Merval',
                                    others,
                                )}
                            </div>
                        )}
                        <div className="stock-search-foot">
                            <span>
                                <kbd>↑</kbd> <kbd>↓</kbd> moverte
                            </span>
                            <span>
                                <kbd>Enter</kbd> abrir el detalle
                            </span>
                            <span>
                                <kbd>Esc</kbd> cerrar
                            </span>
                            {loadingQuotes && (
                                <span className="stock-search-loading">
                                    cargando precios…
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default StockSearch;
