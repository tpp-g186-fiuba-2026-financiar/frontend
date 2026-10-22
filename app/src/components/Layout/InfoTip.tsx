import {
    type ReactNode,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

interface InfoTipProps {
    label: string;
    children: ReactNode;
}

const GAP = 8;
const MARGIN = 8;

// Tooltip accesible (hover + foco + touch) para explicar como se calcula
// que lo contiene (ej: las filas de la watchlist navegan al detalle).
function InfoTip({ label, children }: InfoTipProps) {
    const id = useId();
    const trigger = useRef<HTMLButtonElement>(null);
    const card = useRef<HTMLSpanElement>(null);
    const [open, setOpen] = useState(false);

    useLayoutEffect(() => {
        const el = card.current;
        const t = trigger.current?.getBoundingClientRect();
        if (!open || !el || !t) return;
        const c = el.getBoundingClientRect();
        const below = t.bottom + GAP;
        const above = t.top - GAP - c.height;
        const top =
            below + c.height > window.innerHeight - MARGIN && above > MARGIN
                ? above
                : below;
        const centered = t.left + t.width / 2 - c.width / 2;
        const left = Math.min(
            Math.max(MARGIN, centered),
            window.innerWidth - c.width - MARGIN,
        );
        el.style.top = `${top}px`;
        el.style.left = `${left}px`;
        el.style.visibility = 'visible';
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const close = () => setOpen(false);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [open]);

    return (
        <span
            className="info-tip"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <button
                ref={trigger}
                type="button"
                className="info-tip-trigger"
                aria-label={`Cómo se calcula: ${label}`}
                aria-describedby={open ? id : undefined}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(true);
                }}
            >
                i
            </button>
            {open &&
                createPortal(
                    <span
                        ref={card}
                        id={id}
                        className="info-tip-float"
                        role="tooltip"
                        style={{ top: 0, left: 0, visibility: 'hidden' }}
                    >
                        <b>{label}</b>
                        <span>{children}</span>
                    </span>,
                    document.body,
                )}
        </span>
    );
}

export default InfoTip;
