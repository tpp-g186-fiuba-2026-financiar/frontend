import { useEffect, useState } from 'react';
import { getAllSharesEndpoint } from '../../api/shares/getAllSharesEndpoint';
import { getUserSharesEndpoint } from '../../api/userShares/getUserSharesEndpoint';
import { addUserShareEndpoint } from '../../api/userShares/postUserShare';
import { updateUserShareEndpoint } from '../../api/userShares/putUserShare';
import { deleteUserShareEndpoint } from '../../api/userShares/deleteUserShare';

interface Share {
    id: number;
    ticker: string;
}

interface OwnedShare {
    id: number;
    quantity: number;
}

interface PortfolioBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

function PortfolioBuilder({ isOpen, onClose, onSaved }: PortfolioBuilderProps) {
    const [allShares, setAllShares] = useState<Share[]>([]);
    const [owned, setOwned] = useState<Record<string, OwnedShare>>({});
    const [selected, setSelected] = useState<Record<string, number>>({});
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
                userShares.shares.forEach((s) => {
                    ownedMap[s.ticker] = { id: s.id, quantity: s.quantity };
                    selectedMap[s.ticker] = s.quantity;
                });
                setOwned(ownedMap);
                setSelected(selectedMap);
                setError(null);
            })
            .catch(() => setError('No se pudo cargar la lista de acciones.'))
            .finally(() => setLoading(false));
    }, [isOpen]);

    const toggleShare = (ticker: string) => {
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

    const closePopUp = () => {
        setSearch('');
        setError(null);
        onClose();
    };

    const hasInvalidQuantity = Object.values(selected).some(
        (q) => !q || q <= 0,
    );

    const handleSave = async () => {
        if (hasInvalidQuantity) {
            setError(
                'La cantidad tiene que ser mayor a 0 en cada acción marcada.',
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
                if (isSelected && !wasOwned) {
                    ops.push(
                        addUserShareEndpoint({
                            ticker: share.ticker,
                            quantity: selected[share.ticker],
                        }),
                    );
                } else if (isSelected && wasOwned) {
                    if (
                        selected[share.ticker] !== owned[share.ticker].quantity
                    ) {
                        ops.push(
                            updateUserShareEndpoint(owned[share.ticker].id, {
                                quantity: selected[share.ticker],
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

    if (!isOpen) return null;

    const filtered = allShares.filter((s) =>
        s.ticker.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <>
            <div className="modal-backdrop fade show" onClick={closePopUp} />
            <div className="modal d-block fade show" role="dialog">
                <div
                    className="modal-dialog modal-dialog-centered modal-lg"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Mi cartera</h5>
                            <button
                                className="btn-close"
                                onClick={closePopUp}
                                aria-label="Close"
                            />
                        </div>
                        <div className="modal-body">
                            <p className="text-secondary small">
                                Marcá las acciones que tenés y cuántas comprate.
                                Desmarcá una para sacarla de tu cartera.
                            </p>
                            <input
                                type="text"
                                className="form-control mb-3"
                                placeholder="Buscar ticker..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {loading && <p>Cargando...</p>}
                            {error && (
                                <p className="text-danger small">{error}</p>
                            )}
                            {!loading && (
                                <div
                                    className="list-group"
                                    style={{
                                        maxHeight: '360px',
                                        overflowY: 'auto',
                                    }}
                                >
                                    {filtered.map((share) => {
                                        const isSelected =
                                            share.ticker in selected;
                                        return (
                                            <div
                                                key={share.id}
                                                className="list-group-item d-flex align-items-center gap-3"
                                            >
                                                <div className="form-check flex-grow-1 mb-0">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id={`share-${share.id}`}
                                                        checked={isSelected}
                                                        onChange={() =>
                                                            toggleShare(
                                                                share.ticker,
                                                            )
                                                        }
                                                    />
                                                    <label
                                                        className="form-check-label"
                                                        htmlFor={`share-${share.id}`}
                                                    >
                                                        {share.ticker}
                                                    </label>
                                                </div>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    style={{ width: '110px' }}
                                                    min={1}
                                                    disabled={!isSelected}
                                                    value={
                                                        selected[
                                                            share.ticker
                                                        ] ?? ''
                                                    }
                                                    onChange={(e) =>
                                                        setQuantity(
                                                            share.ticker,
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                />
                                            </div>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <p className="text-secondary small mt-2">
                                            No hay tickers que coincidan.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
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
            </div>
        </>
    );
}

export default PortfolioBuilder;
