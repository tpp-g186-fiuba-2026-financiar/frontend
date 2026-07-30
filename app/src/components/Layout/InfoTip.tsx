import { type ReactNode } from 'react';

interface InfoTipProps {
    label: string;
    children: ReactNode;
}

// Tooltip accesible (hover + foco + touch) para explicar como se calcula
// una metrica. Se para el click para que no dispare el onClick de la fila
// que lo contiene (ej: las filas de la watchlist navegan al detalle).
function InfoTip({ label, children }: InfoTipProps) {
    return (
        <span className="info-tip">
            <button
                type="button"
                className="info-tip-trigger"
                aria-label={`Cómo se calcula: ${label}`}
                onClick={(e) => e.stopPropagation()}
            >
                i
            </button>
            <span className="info-tip-card" role="tooltip">
                <b>{label}</b>
                <span>{children}</span>
            </span>
        </span>
    );
}

export default InfoTip;
