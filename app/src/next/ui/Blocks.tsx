import { type ReactNode, type CSSProperties } from 'react';
import InfoTip from '../../components/Layout/InfoTip';
import { GLOSSARY, type GlossaryKey } from '../glossary';
import Icon from './Icon';

// Piezas chicas reutilizadas por todas las páginas nuevas.

export function Tip({ k }: { k: GlossaryKey }) {
    const [title, text] = GLOSSARY[k];
    return <InfoTip label={title}>{text}</InfoTip>;
}

export function Card({
    span = 's12',
    className = '',
    i = 0,
    children,
}: {
    span?: string;
    className?: string;
    i?: number;
    children: ReactNode;
}) {
    return (
        <section
            className={`nx-card nx-rv ${span} ${className}`}
            style={{ '--i': i } as CSSProperties}
        >
            {children}
        </section>
    );
}

export function CardHead({
    title,
    hint,
    right,
}: {
    title: ReactNode;
    hint?: ReactNode;
    right?: ReactNode;
}) {
    return (
        <div className="nx-card-head">
            <div>
                <h3>{title}</h3>
                {hint && <div className="nx-hint">{hint}</div>}
            </div>
            {right}
        </div>
    );
}

export function PageHead({
    eyebrow,
    title,
    sub,
    actions,
}: {
    eyebrow: string;
    title: string;
    sub?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <div className="nx-head nx-rv">
            <div>
                <div className="nx-eyebrow">{eyebrow}</div>
                <h1>{title}</h1>
                {sub && <p>{sub}</p>}
            </div>
            {actions && <div className="nx-actions">{actions}</div>}
        </div>
    );
}

// Recuadro "¿qué estoy viendo?". Se oculta entero cuando el usuario apaga la
// guía desde la barra superior (clase nx-guide-off en el shell).
export function Explain({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <details className="nx-explain nx-rv" open>
            <summary>
                <Icon name="book" />
                {title}
                <span className="nx-muted">¿qué estoy viendo?</span>
            </summary>
            <div className="nx-explain-body">{children}</div>
        </details>
    );
}

export const LEGAL_TEXT =
    'FinanciAr es un proyecto académico de la Facultad de Ingeniería de la UBA (FIUBA). Las estimaciones salen de modelos matemáticos entrenados con datos del pasado y pueden equivocarse. No constituyen asesoramiento financiero, recomendación de inversión ni oferta de ningún tipo. Cualquier decisión de inversión es responsabilidad exclusiva del usuario.';

export function Legal({ full = false }: { full?: boolean }) {
    return (
        <div
            className={`nx-legal nx-rv ${full ? '' : 'sm'}`}
            role={full ? 'alert' : 'note'}
        >
            <Icon name="alert" size={full ? 22 : 18} />
            <div>
                <b className="t">No es una recomendación de inversión.</b>
                {full
                    ? LEGAL_TEXT
                    : 'Son estimaciones de modelos matemáticos y pueden fallar. Vos decidís qué hacer con tu plata.'}
            </div>
        </div>
    );
}

export type Signal = 'alza' | 'baja' | 'neutral';
const SIGNAL_LABEL: Record<Signal, string> = {
    alza: 'Alza',
    baja: 'Baja',
    neutral: 'Neutral',
};

export function SignalPill({ signal }: { signal: Signal | null }) {
    if (!signal) return <span className="nx-pill nodata">Sin datos</span>;
    return <span className={`nx-pill ${signal}`}>{SIGNAL_LABEL[signal]}</span>;
}

const SIGNAL_HERO: Record<Signal, { arrow: string; line: string }> = {
    alza: { arrow: '▲', line: 'Los modelos juntos esperan que suba.' },
    baja: { arrow: '▼', line: 'Los modelos juntos esperan que baje.' },
    neutral: {
        arrow: '●',
        line: 'Los modelos juntos no se juegan por un lado.',
    },
};

// Señal grande para no tener que recorrer toda la pantalla.
export function SignalBanner({
    signal,
    detail,
}: {
    signal: Signal | null;
    detail?: string;
}) {
    if (!signal) {
        return (
            <div className="nx-signal-hero nodata">
                <span className="nx-signal-arrow" aria-hidden>
                    ·
                </span>
                <div>
                    <div className="nx-signal-word">Sin lectura</div>
                    <div className="nx-signal-line">
                        Los modelos todavía no respondieron para esta acción.
                    </div>
                </div>
            </div>
        );
    }
    const copy = SIGNAL_HERO[signal];
    return (
        <div className={`nx-signal-hero ${signal}`}>
            <span className="nx-signal-arrow" aria-hidden>
                {copy.arrow}
            </span>
            <div>
                <div className="nx-signal-word">{SIGNAL_LABEL[signal]}</div>
                <div className="nx-signal-line">{detail ?? copy.line}</div>
            </div>
        </div>
    );
}

const CONF_LABEL = { 1: 'Baja', 2: 'Media', 3: 'Alta' } as const;

export function ConfidenceBadge({ level }: { level: 1 | 2 | 3 }) {
    return (
        <span
            className={`nx-conf c${level}`}
            aria-label={`Confianza ${CONF_LABEL[level].toLowerCase()}`}
        >
            <i />
            <i />
            <i />
            <em>{CONF_LABEL[level]}</em>
        </span>
    );
}

export function Seg<T extends string | number>({
    options,
    value,
    onChange,
    label,
}: {
    options: Array<[T, string]>;
    value: T;
    onChange: (v: T) => void;
    label: string;
}) {
    return (
        <div className="nx-seg" role="group" aria-label={label}>
            {options.map(([v, l]) => (
                <button
                    key={String(v)}
                    type="button"
                    aria-pressed={v === value}
                    onClick={() => onChange(v)}
                >
                    {l}
                </button>
            ))}
        </div>
    );
}

export function Empty({ children }: { children: ReactNode }) {
    return <div className="nx-empty">{children}</div>;
}
