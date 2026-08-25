import { useEffect, useState } from 'react';
import { getAllSharesEndpoint } from '../../api/shares/getAllSharesEndpoint';
import { getUserSharesEndpoint } from '../../api/userShares/getUserSharesEndpoint';
import { addUserShareEndpoint } from '../../api/userShares/postUserShare';
import { updateUserShareEndpoint } from '../../api/userShares/putUserShare';
import { deleteUserShareEndpoint } from '../../api/userShares/deleteUserShare';

interface Share {
    id: number;
    ticker: string;
    predictable: boolean;
}

interface OwnedShare {
    id: number;
    quantity: number;
    entryPrice: number | null;
}

interface PortfolioBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

const AVATAR_CLASSES = [
    'avatar-0',
    'avatar-1',
    'avatar-2',
    'avatar-3',
    'avatar-4',
    'avatar-5',
];

function avatarClass(ticker: string): string {
    const code = ticker.charCodeAt(0) + ticker.charCodeAt(ticker.length - 1);
    return AVATAR_CLASSES[code % AVATAR_CLASSES.length];
}

function PortfolioBuilder({ isOpen, onClose, onSaved }: PortfolioBuilderProps) {
    const [allShares, setAllShares] = useState<Share[]>([]);
    const [owned, setOwned] = useState<Record<string, OwnedShare>>({});
    const [selected, setSelected] = useState<Record<string, number>>({});
    const [entryPrices, setEntryPrices] = useState<Record<string, string>>({});
    const [search, setSearch] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        Promise.all([getAllSharesEndpoint(), getUserSharesEndpoint()])
            .then(([shares, userShares]) => {
                setAllShares(shares.shares);
                const ownedMap: Record<string, OwnedShare> = {};
                const selectedMap: Record<string, number> = {};
                const entryPriceMap: Record<string, string> = {};
                userShares.shares.forEach((s) => {
                    ownedMap[s.ticker] = {
                        id: s.id,
                        quantity: s.quantity,
                        entryPrice: s.entry_price,
                    };
                    selectedMap[s.ticker] = s.quantity;
                    entryPriceMap[s.ticker] =
                        s.entry_price != null ? String(s.entry_price) : '';
                });
                setOwned(ownedMap);
                setSelected(selectedMap);
                setEntryPrices(entryPriceMap);
                setError(null);
            })
            .catch(() => setError('No se pudo cargar la lista de acciones.'))
            .finally(() => setLoading(false));
    }, [isOpen]);

    const toggleShare = (ticker: string) => {
        const share = allShares.find((item) => item.ticker === ticker);
        if (share && !share.predictable && !(ticker in owned)) return;
        setSelected((prev) => {
            const next = { ...prev };
            if (ticker in next) {
                delete next[ticker];
            } else {
                next[ticker] = owned[ticker]?.quantity ?? 1;
            }
            return next;
        });
    };

    const setQuantity = (ticker: string, quantity: number) => {
        setSelected((prev) => ({ ...prev, [ticker]: quantity }));
    };

    const setEntryPrice = (ticker: string, value: string) => {
        setEntryPrices((prev) => ({ ...prev, [ticker]: value }));
    };

    const closePopUp = () => {
        setSearch('');
        setError(null);
        onClose();
    };

    const hasInvalidQuantity = Object.values(selected).some(
        (q) => !q || q <= 0,
    );

    const parseEntryPrice = (ticker: string): number | undefined => {
        const raw = entryPrices[ticker]?.trim();
        if (!raw) return undefined;
        const value = Number(raw);
        return Number.isNaN(value) ? undefined : value;
    };

    const hasInvalidEntryPrice = Object.keys(selected).some((ticker) => {
        const raw = entryPrices[ticker]?.trim();
        if (!raw) return false;
        const value = Number(raw);
        return Number.isNaN(value) || value <= 0;
    });

    const handleSave = async () => {
        if (hasInvalidQuantity) {
            setError(
                'La cantidad tiene que ser mayor a 0 en cada acción marcada.',
            );
            return;
        }
        if (hasInvalidEntryPrice) {
            setError(
                'El precio de entrada tiene que ser mayor a 0 en cada acción marcada.',
            );
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const ops: Promise<unknown>[] = [];
            allShares.forEach((share) => {
                const wasOwned = share.ticker in owned;
                const isSelected = share.ticker in selected;
                const entryPrice = parseEntryPrice(share.ticker);
                if (isSelected && !wasOwned) {
                    ops.push(
                        addUserShareEndpoint({
                            ticker: share.ticker,
                            quantity: selected[share.ticker],
                            entry_price: entryPrice,
                        }),
                    );
                } else if (isSelected && wasOwned) {
                    const quantityChanged =
                        selected[share.ticker] !== owned[share.ticker].quantity;
                    const entryPriceChanged =
                        entryPrice !== undefined &&
                        entryPrice !== owned[share.ticker].entryPrice;
                    if (quantityChanged || entryPriceChanged) {
                        ops.push(
                            updateUserShareEndpoint(owned[share.ticker].id, {
                                quantity: selected[share.ticker],
                                entry_price: entryPrice,
                            }),
                        );
                    }
                } else if (!isSelected && wasOwned) {
                    ops.push(deleteUserShareEndpoint(owned[share.ticker].id));
                }
            });
            await Promise.all(ops);
            onSaved();
            closePopUp();
        } catch {
            setError('No se pudo guardar la cartera. Probá de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    const handleClearPortfolio = async () => {
        const positions = Object.values(owned);
        if (positions.length === 0) return;
        if (
            !window.confirm(
                '¿Querés eliminar todas las acciones de tu cartera? Esta acción no se puede deshacer.',
            )
        ) {
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await Promise.all(
                positions.map((position) =>
                    deleteUserShareEndpoint(position.id),
                ),
            );
            setOwned({});
            setSelected({});
            onSaved();
            closePopUp();
        } catch {
            setError('No se pudo vaciar la cartera. Probá de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const filtered = allShares.filter((s) =>
        s.ticker.toLowerCase().includes(search.toLowerCase()),
    );
    const filteredSelected = filtered.filter((s) => s.ticker in selected);
    const filteredRest = filtered.filter((s) => !(s.ticker in selected));
    const selectedCount = Object.keys(selected).length;

    const renderRow = (share: Share) => {
        const isSelected = share.ticker in selected;
        const disabled = !share.predictable && !(share.ticker in owned);
        const qty = selected[share.ticker];
        return (
            <div
                key={share.id}
                className={`builder-row${isSelected ? ' is-checked' : ''}`}
            >
                <label className="builder-check">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={disabled}
                        onChange={() => toggleShare(share.ticker)}
                    />
                    <span
                        className={`builder-avatar ${avatarClass(share.ticker)}`}
                    >
                        {share.ticker.slice(0, 2)}
                    </span>
                    <span className="builder-ticker-label">{share.ticker}</span>
                    {!share.predictable && (
                        <span className="builder-hint">
                            Sin histórico suficiente
                        </span>
                    )}
                </label>
                <div className="qty-stepper">
                    <button
                        type="button"
                        disabled={disabled || !isSelected || (qty ?? 0) <= 1}
                        onClick={() =>
                            setQuantity(
                                share.ticker,
                                Math.max(1, (qty ?? 1) - 1),
                            )
                        }
                        aria-label={`Restar una unidad de ${share.ticker}`}
                    >
                        −
                    </button>
                    <input
                        type="number"
                        className="builder-qty"
                        min={1}
                        disabled={disabled || !isSelected}
                        value={qty ?? ''}
                        onChange={(e) =>
                            setQuantity(share.ticker, Number(e.target.value))
                        }
                    />
                    <button
                        type="button"
                        disabled={disabled || !isSelected}
                        onClick={() =>
                            setQuantity(share.ticker, (qty ?? 0) + 1)
                        }
                        aria-label={`Sumar una unidad de ${share.ticker}`}
                    >
                        +
                    </button>
                </div>
                <div className="entry-price-field">
                    <span className="entry-price-prefix">$</span>
                    <input
                        type="number"
                        className="builder-entry-price"
                        placeholder="Precio de entrada"
                        min={0}
                        step="0.01"
                        disabled={disabled || !isSelected}
                        value={entryPrices[share.ticker] ?? ''}
                        onChange={(e) =>
                            setEntryPrice(share.ticker, e.target.value)
                        }
                    />
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="builder-backdrop" onClick={closePopUp} />
            <div className="builder-modal-wrap" role="dialog" aria-modal="true">
                <div
                    className="builder-modal"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="builder-header">
                        <h2 className="mb-0">Mi cartera</h2>
                        <button
                            className="builder-close"
                            onClick={closePopUp}
                            aria-label="Cerrar"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="builder-body">
                        <p className="builder-hint mb-0">
                            Marcá las acciones que tenés y cuántas comprate.
                            Desmarcá una para sacarla de tu cartera.
                        </p>
                        <div className="builder-search-row">
                            <svg
                                className="builder-search-icon"
                                width="14"
                                height="14"
                                viewBox="0 0 20 20"
                                fill="none"
                            >
                                <circle
                                    cx="9"
                                    cy="9"
                                    r="6.5"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                />
                                <path
                                    d="M14 14L18 18"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <input
                                type="text"
                                className="builder-search"
                                placeholder="Buscar ticker..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {selectedCount > 0 && (
                                <span className="chip builder-count">
                                    {selectedCount}{' '}
                                    {selectedCount === 1
                                        ? 'seleccionada'
                                        : 'seleccionadas'}
                                </span>
                            )}
                        </div>
                        {error && <p className="builder-error mb-0">{error}</p>}
                        {loading ? (
                            <p className="builder-empty mb-0">Cargando…</p>
                        ) : (
                            <div className="builder-list">
                                {filteredSelected.length > 0 && (
                                    <div className="builder-section">
                                        Tu cartera
                                    </div>
                                )}
                                {filteredSelected.map(renderRow)}
                                {filteredRest.length > 0 && (
                                    <div className="builder-section">
                                        {filteredSelected.length > 0
                                            ? 'Todas las acciones'
                                            : 'Acciones disponibles'}
                                    </div>
                                )}
                                {filteredRest.map(renderRow)}
                                {filtered.length === 0 && (
                                    <p className="builder-empty mb-0">
                                        No hay tickers que coincidan.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="builder-footer">
                        <button
                            className="btn-ghost"
                            onClick={handleClearPortfolio}
                            disabled={saving || Object.keys(owned).length === 0}
                            style={{
                                color: 'var(--down)',
                                marginRight: 'auto',
                            }}
                        >
                            Vaciar cartera
                        </button>
                        <button
                            className="btn-ghost"
                            onClick={closePopUp}
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saving || loading}
                        >
                            {saving ? 'Guardando...' : 'Guardar cartera'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default PortfolioBuilder;
