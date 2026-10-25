import { useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STEPS: Array<[string | null, string, string]> = [
    [
        null,
        'Guía de FinanciAr',
        'Te mostramos la app en 30 segundos. Podés salir cuando quieras.',
    ],
    [
        '#nx-nav',
        'Todas las secciones',
        'Acá está todo: tu cartera, el análisis de cada acción, cómo podría reacomodarse tu plata, el historial de señales y el contexto del mercado.',
    ],
    [
        '.nx-mini',
        'Tus números principales',
        'Cuánto vale tu cartera, cómo le fue en la semana y cuántas acciones tienen señal de suba.',
    ],
    [
        '.nx-view .info-tip-trigger',
        'La "i" explica todo',
        'Cada vez que veas una "i", pasá el mouse o tocala: te explica qué significa ese número en palabras simples.',
    ],
    [
        '#nx-guide',
        'Explicaciones',
        'Con este botón prendés o apagás los recuadros que explican qué estás viendo en cada pantalla.',
    ],
    [
        '#nx-search',
        'Buscá cualquier cosa',
        'Escribí un ticker como GGAL o el nombre de una sección. También funciona con ⌘K o Ctrl+K.',
    ],
    [
        '#nx-tour-btn',
        'Esta guía',
        'Podés volver a ver este recorrido cuando quieras desde este botón.',
    ],
    [
        '#nx-legal-strip',
        'Importante',
        'Todo lo que ves son estimaciones de modelos matemáticos. No son recomendaciones de inversión: las decisiones son siempre tuyas.',
    ],
];

function visible(sel: string | null): boolean {
    if (!sel) return true;
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return (
        r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth
    );
}

export default function GuideTour({ onClose }: { onClose: () => void }) {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [measured, setRect] = useState<DOMRect | null>(null);
    const [steps, setSteps] = useState(STEPS);

    useEffect(() => {
        navigate('/home');
        const t = window.setTimeout(
            () => setSteps(STEPS.filter(([sel]) => visible(sel))),
            300,
        );
        return () => window.clearTimeout(t);
    }, [navigate]);

    const current = steps[Math.min(step, steps.length - 1)];

    const sel = current?.[0] ?? null;
    useLayoutEffect(() => {
        if (!sel) return;
        const el = document.querySelector(sel);
        el?.scrollIntoView?.({ block: 'nearest' });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRect(el ? el.getBoundingClientRect() : null);
    }, [sel]);

    if (!current) return null;
    const rect = sel ? measured : null;
    const [, title, text] = current;
    const last = step >= steps.length - 1;
    const pad = 8;
    const cardTop = rect
        ? rect.bottom + 16 + 200 < window.innerHeight
            ? rect.bottom + 16
            : Math.max(16, rect.top - 216)
        : window.innerHeight / 2 - 100;
    const cardLeft = rect
        ? Math.min(Math.max(16, rect.left), window.innerWidth - 356)
        : window.innerWidth / 2 - 170;

    return (
        <div role="dialog" aria-label="Guía de uso">
            <div
                className="nx-tour-ring"
                style={
                    rect
                        ? {
                              left: rect.left - pad,
                              top: rect.top - pad,
                              width: rect.width + pad * 2,
                              height: rect.height + pad * 2,
                          }
                        : {
                              left: '50%',
                              top: '50%',
                              width: 0,
                              height: 0,
                              borderWidth: 0,
                          }
                }
            />
            <div
                className="nx-tour-card"
                style={{ top: cardTop, left: cardLeft }}
            >
                <div className="nx-eyebrow">
                    Paso {Math.min(step, steps.length - 1) + 1} de{' '}
                    {steps.length}
                </div>
                <h3>{title}</h3>
                <p style={{ fontSize: 13.5, margin: 0 }}>{text}</p>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 8,
                        marginTop: 16,
                    }}
                >
                    <button
                        type="button"
                        className="nx-btn sm"
                        onClick={onClose}
                    >
                        {last ? 'Cerrar' : 'Salir'}
                    </button>
                    {!last ? (
                        <button
                            type="button"
                            className="nx-btn sm primary"
                            onClick={() => setStep((s) => s + 1)}
                        >
                            Siguiente
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="nx-btn sm primary"
                            onClick={onClose}
                        >
                            ¡Listo!
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
