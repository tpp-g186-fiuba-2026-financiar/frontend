import { useRef, useState, type UIEvent } from 'react';

interface TermsAndConditionsProps {
    onAccept: () => void;
    onBack?: () => void;
}

// Placeholder: reemplazar por el texto real de términos y condiciones.
const TERMS_TEXT =
    'Este es un texto de ejemplo de los términos y condiciones. Reemplazar por el contenido real.';

function TermsAndConditions({ onAccept, onBack }: TermsAndConditionsProps) {
    const [hasReachedBottom, setHasReachedBottom] = useState<boolean>(false);
    const [accepted, setAccepted] = useState<boolean>(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const checkIfBottomReached = (el: HTMLDivElement) => {
        const { scrollTop, scrollHeight, clientHeight } = el;
        // Margen de tolerancia por redondeos de píxeles
        const reachedBottom = scrollTop + clientHeight >= scrollHeight - 2;
        if (reachedBottom) {
            setHasReachedBottom(true);
        }
    };

    const handleScroll = (e: UIEvent<HTMLDivElement>) => {
        checkIfBottomReached(e.currentTarget);
    };

    // Cubre el caso en que el contenido entra sin necesidad de scroll
    // (texto corto o pantallas grandes): no debe bloquear al usuario.
    const handleContentRef = (node: HTMLDivElement | null) => {
        if (node && node.scrollHeight <= node.clientHeight) {
            setHasReachedBottom(true);
        }
    };

    return (
        <div className="modal-body">
            <p className="mb-2">
                Para continuar, leé los términos y condiciones hasta el
                final.
            </p>
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="border rounded p-3 mb-3"
                style={{ height: '220px', overflowY: 'auto' }}
            >
                <div ref={handleContentRef}>
                    <p style={{ whiteSpace: 'pre-line' }}>{TERMS_TEXT}</p>
                </div>
            </div>

            <div className="form-check mb-3">
                <input
                    className="form-check-input"
                    type="checkbox"
                    id="acceptTermsCheckbox"
                    checked={accepted}
                    disabled={!hasReachedBottom}
                    onChange={(e) => setAccepted(e.target.checked)}
                />
                <label
                    className="form-check-label"
                    htmlFor="acceptTermsCheckbox"
                >
                    {hasReachedBottom
                        ? 'Acepto los términos y condiciones'
                        : 'Debés leer los términos y condiciones hasta el final para poder aceptarlos'}
                </label>
            </div>

            <div className="modal-footer px-0 pb-0 border-0">
                {onBack && (
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={onBack}
                    >
                        Volver
                    </button>
                )}
                <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!accepted}
                    onClick={onAccept}
                >
                    Continuar
                </button>
            </div>
        </div>
    );
}

export default TermsAndConditions;