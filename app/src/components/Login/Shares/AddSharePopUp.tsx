import { useState, useEffect } from 'react';
import { getAllSharesEndpoint } from '../../../api/shares/getAllSharesEndpoint';
import {
    addUserShareEndpoint,
    type AddUserShareRequest,
} from '../../../api/userShares/postUserShare';

interface Share {
    id: number;
    ticker: string;
}

interface AddSharePopUpProps {
    isOpen: boolean;
    onClose: () => void;
}

function AddSharePopUp({ isOpen, onClose }: AddSharePopUpProps) {
    const [ticker, setTicker] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [allTickers, setAllTickers] = useState<Share[]>([]);
    const [showDropdown, setShowDropdown] = useState<boolean>(false);
    // const [response, setResponse] = useState<AddUserShareResponse | null>(null);

    const canSubmit = ticker !== '' && quantity > 0;

    useEffect(() => {
        if (!isOpen) return;
        const fetchTickers = async () => {
            const r = await getAllSharesEndpoint();
            setAllTickers(r.shares);
        };
        fetchTickers();
    }, [isOpen]);

    const closePopUp = () => {
        setTicker('');
        setQuantity(1);
        setShowDropdown(false);
        onClose();
    };

    const handleSubmit = async () => {
        const request: AddUserShareRequest = {
            ticker: ticker,
            quantity: quantity,
        };
        const r = await addUserShareEndpoint(request);
        // setResponse(r);
        if (r) {
            try {
                if (r.id) {
                    closePopUp();
                }
            } catch {
                // Post failed
            }
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="modal-backdrop fade show" onClick={closePopUp} />
            <div className="modal d-block fade show" role="dialog">
                <div
                    className="modal-dialog modal-dialog-centered"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Add Share</h5>
                            <button
                                className="btn-close"
                                onClick={closePopUp}
                                aria-label="Close"
                            />
                        </div>
                        <div className="modal-body">
                            <div className="mb-3 position-relative">
                                <label className="form-label">Ticker</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search ticker..."
                                    value={ticker}
                                    onChange={(e) => {
                                        setTicker(e.target.value.toUpperCase());
                                        setShowDropdown(true);
                                    }}
                                    onFocus={() => setShowDropdown(true)}
                                    onBlur={() =>
                                        setTimeout(
                                            () => setShowDropdown(false),
                                            150,
                                        )
                                    }
                                />
                                {showDropdown && allTickers.length > 0 && (
                                    <ul
                                        className="list-group position-absolute w-100"
                                        style={{
                                            zIndex: 1000,
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                        }}
                                    >
                                        {allTickers.map((s) => (
                                            <li
                                                key={s.id}
                                                className="list-group-item list-group-item-action"
                                                style={{ cursor: 'pointer' }}
                                                onMouseDown={() => {
                                                    setTicker(s.ticker);
                                                    setShowDropdown(false);
                                                }}
                                            >
                                                {s.ticker}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Quantity</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    min={1}
                                    value={quantity}
                                    onChange={(e) =>
                                        setQuantity(Number(e.target.value))
                                    }
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={closePopUp}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default AddSharePopUp;
