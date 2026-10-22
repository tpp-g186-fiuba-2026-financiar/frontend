import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon, { type IconName } from '../ui/Icon';
import { usePortfolio } from '../data/PortfolioContext';
import { useUi } from '../data/UiContext';
import { ADMIN_NAV, USER_NAV } from './nav';

interface Command {
    group: string;
    label: string;
    icon: IconName;
    run: () => void;
}

// Buscador ⌘K: secciones, acciones de la cartera y comandos rápidos.
export default function CommandPalette({
    admin,
    isAdmin,
    onClose,
}: {
    admin: boolean;
    isAdmin: boolean;
    onClose: () => void;
}) {
    const navigate = useNavigate();
    const { holdings } = usePortfolio();
    const ui = useUi();
    const [q, setQ] = useState('');
    const [sel, setSel] = useState(0);

    const commands = useMemo<Command[]>(() => {
        const go = (to: string) => () => navigate(to);
        const nav = (admin ? ADMIN_NAV : USER_NAV).flatMap((g) =>
            g.items.map((it) => ({
                group: 'Ir a',
                label: it.label,
                icon: it.icon,
                run: go(it.to),
            })),
        );
        const tickers = admin
            ? []
            : holdings.map((h) => ({
                  group: 'Acciones',
                  label: h.ticker,
                  icon: 'candle' as const,
                  run: go(`/accion/${h.ticker}`),
              }));
        const extra: Command[] = [
            {
                group: 'Comandos',
                label: 'Modo terminal',
                icon: 'term',
                run: () =>
                    ui.setTheme(ui.theme === 'terminal' ? 'dark' : 'terminal'),
            },
            {
                group: 'Comandos',
                label: 'Cambiar tema claro/oscuro',
                icon: 'sun',
                run: () => ui.setTheme(ui.theme === 'light' ? 'dark' : 'light'),
            },
            {
                group: 'Comandos',
                label: 'Mostrar u ocultar explicaciones',
                icon: 'book',
                run: () => ui.setGuide(!ui.guide),
            },
            {
                group: 'Comandos',
                label: 'Ver la guía de uso',
                icon: 'help',
                run: () => ui.setTourOpen(true),
            },
        ];
        if (isAdmin)
            extra.push({
                group: 'Comandos',
                label: admin ? 'Ver como usuario' : 'Panel de administración',
                icon: 'nodes',
                run: go(admin ? '/home' : '/admin/arquitectura'),
            });
        return [...nav, ...tickers, ...extra];
    }, [admin, isAdmin, holdings, navigate, ui]);

    const items = commands.filter((c) =>
        c.label.toLowerCase().includes(q.toLowerCase()),
    );
    const pick = (c: Command | undefined) => {
        if (!c) return;
        onClose();
        c.run();
    };

    return (
        <>
            <div className="nx-scrim" onClick={onClose} />
            <div className="nx-palette" role="dialog" aria-label="Buscador">
                <input
                    autoFocus
                    placeholder="Escribí un ticker, una sección o un comando…"
                    value={q}
                    onChange={(e) => {
                        setQ(e.target.value);
                        setSel(0);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setSel((s) => Math.min(items.length - 1, s + 1));
                        } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setSel((s) => Math.max(0, s - 1));
                        } else if (e.key === 'Enter') {
                            e.preventDefault();
                            pick(items[sel]);
                        }
                    }}
                />
                <div className="nx-pal-list" role="listbox">
                    {items.length === 0 && (
                        <div className="nx-empty">Sin resultados</div>
                    )}
                    {items.map((c, k) => (
                        <button
                            key={c.group + c.label}
                            type="button"
                            role="option"
                            aria-selected={k === sel}
                            className="nx-pal-item"
                            onMouseEnter={() => setSel(k)}
                            onClick={() => pick(c)}
                        >
                            <Icon name={c.icon} size={16} />
                            <span>{c.label}</span>
                            <span
                                className="nx-muted"
                                style={{ marginLeft: 'auto', fontSize: 11 }}
                            >
                                {c.group}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}
