import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import { Empty, LEGAL_TEXT } from '../ui/Blocks';
import { usePortfolio } from '../data/PortfolioContext';
import { useUi } from '../data/UiContext';
import { ADMIN_NAV, USER_NAV } from './nav';
import { BYMA, NYSE } from './marketClock';
import CommandPalette from './CommandPalette';
import GuideTour from './GuideTour';
import NotificationsDrawer from './NotificationsDrawer';
import Report from './Report';
import RiskProfileGate from '../../components/settings/RiskProfileGate';
import PortfolioBuilder from '../../components/Portfolio/PortfolioBuilder';
import { pct1 } from '../format';

const RISK_LABEL: Record<string, string> = {
    conservative: 'Conservador',
    moderate: 'Moderado',
    aggressive: 'Agresivo',
};

function initials(name: string): string {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join('') || 'FA'
    );
}

function Clocks() {
    const [, tick] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => tick((t) => t + 1), 20_000);
        return () => window.clearInterval(id);
    }, []);
    const b = BYMA();
    const n = NYSE();
    return (
        <>
            <div
                className="nx-clock"
                aria-label={`BYMA ${b.isOpen ? 'abierto' : 'cerrado'}`}
            >
                <b>BYMA</b> {b.time} · {b.message}
            </div>
            <div
                className="nx-clock"
                aria-label={`NYSE ${n.isOpen ? 'abierto' : 'cerrado'}`}
            >
                <b>NYSE</b> {n.time} · {n.message}
            </div>
        </>
    );
}

function Tape() {
    const { holdings, history } = usePortfolio();
    const items = holdings
        .map((h) => {
            const closes = history[h.ticker]?.map((p) => p.close) ?? [];
            const last = h.currentPrice ?? closes[closes.length - 1] ?? null;
            const prev = closes.length > 5 ? closes[closes.length - 6] : null;
            const chg =
                last != null && prev ? ((last - prev) / prev) * 100 : null;
            return { t: h.ticker, last, chg };
        })
        .filter((i) => i.last != null);
    if (items.length === 0) return null;
    const row = (suffix: string) =>
        items.map((i) => (
            <span className="nx-tape-item" key={i.t + suffix}>
                <b>{i.t}</b>
                <span>
                    {i.last!.toLocaleString('es-AR', {
                        maximumFractionDigits: 2,
                    })}
                </span>
                {i.chg != null && (
                    <span className={i.chg >= 0 ? 'nx-up' : 'nx-down'}>
                        {i.chg >= 0 ? '▲' : '▼'} {pct1(Math.abs(i.chg))}
                    </span>
                )}
            </span>
        ));
    return (
        <div className="nx-tape" aria-label="Cotizaciones al último cierre">
            <div className="nx-tape-lbl">ÚLTIMO CIERRE · SEMANA</div>
            <div className="nx-tape-win">
                <div className="nx-tape-track">
                    {row('a')}
                    {row('b')}
                </div>
            </div>
        </div>
    );
}

export default function AppShell({ admin = false }: { admin?: boolean }) {
    const { user, userError, retryUser, patchUser, reload } = usePortfolio();
    const ui = useUi();
    const { setTourOpen } = ui;
    const navigate = useNavigate();
    const [sideOpen, setSideOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [drawer, setDrawer] = useState<'notifs' | 'legal' | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen((o) => !o);
            }
            if (e.key === 'Escape') {
                setTourOpen(false);
                setPaletteOpen(false);
                setDrawer(null);
                setMenuOpen(false);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [setTourOpen]);

    useEffect(() => {
        if (!menuOpen) return;
        const close = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node))
                setMenuOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [menuOpen]);

    const nav = admin ? ADMIN_NAV : USER_NAV;
    const role = useMemo(() => (admin ? 'admin' : 'user'), [admin]);

    if (admin && user && !isAdmin) return <Navigate to="/home" replace />;

    if (!user) {
        return (
            <div className="container py-4">
                <div className="panel connection-state">
                    <h2 className="mb-2">
                        {userError
                            ? 'No pudimos conectar con el servidor'
                            : 'Cargando tu cuenta…'}
                    </h2>
                    <p className="mb-3" style={{ color: 'var(--ink-3)' }}>
                        {userError
                            ? 'Puede estar reiniciándose. Volveremos a intentar automáticamente.'
                            : 'Esto puede demorar unos segundos.'}
                    </p>
                    {userError && (
                        <button className="btn btn-primary" onClick={retryUser}>
                            Reintentar ahora
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const logout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <div
            className={`nx-shell ${ui.guide ? '' : 'nx-guide-off'}`}
            data-view={role}
        >
            <div className="nx-bg-glow" />
            <div className="nx-bg-grid" />
            <div className="nx-scan" />
            <aside
                className={`nx-sidebar ${sideOpen ? 'open' : ''}`}
                aria-label="Secciones"
            >
                <button
                    type="button"
                    className="nx-brand"
                    onClick={() =>
                        navigate(admin ? '/admin/arquitectura' : '/home')
                    }
                >
                    <span className="nx-brand-mark">
                        <Icon name="trend" />
                    </span>
                    <span className="nx-brand-name">
                        Financi<b>Ar</b>
                    </span>
                </button>
                <nav id="nx-nav">
                    {nav.map((g) => (
                        <div key={g.group}>
                            <div className="nx-nav-label">{g.group}</div>
                            {g.items.map((it) => (
                                <NavLink
                                    key={it.to}
                                    to={it.to}
                                    onClick={() => setSideOpen(false)}
                                    className={({ isActive }) =>
                                        `nx-nav-item ${isActive ? 'active' : ''}`
                                    }
                                >
                                    <Icon name={it.icon} />
                                    <span>{it.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>
            </aside>
            {sideOpen && (
                <div className="nx-scrim" onClick={() => setSideOpen(false)} />
            )}
            <div className="nx-main">
                <header className="nx-topbar">
                    <button
                        type="button"
                        className="nx-icon-btn nx-hamb"
                        aria-label="Menú"
                        onClick={() => setSideOpen(true)}
                    >
                        <Icon name="menu" />
                    </button>
                    <button
                        type="button"
                        id="nx-search"
                        className="nx-search"
                        onClick={() => setPaletteOpen(true)}
                    >
                        <Icon name="search" size={16} />
                        <span>Buscar acción, sección o comando…</span>
                        <span className="nx-kbd">⌘K</span>
                    </button>
                    <div className="nx-spacer" />
                    {!admin && <Clocks />}
                    {admin && <span className="nx-admin-badge">ADMIN</span>}
                    <button
                        type="button"
                        id="nx-guide"
                        className={`nx-guide-btn ${ui.guide ? 'on' : ''}`}
                        aria-pressed={ui.guide}
                        title="Mostrar u ocultar las explicaciones"
                        onClick={() => ui.setGuide(!ui.guide)}
                    >
                        <Icon name="book" size={15} />
                        <span>Guía {ui.guide ? 'ON' : 'OFF'}</span>
                    </button>
                    <button
                        type="button"
                        className={`nx-icon-btn ${ui.theme === 'terminal' ? 'on' : ''}`}
                        aria-label="Modo terminal"
                        title="Modo terminal"
                        onClick={() =>
                            ui.setTheme(
                                ui.theme === 'terminal' ? 'dark' : 'terminal',
                            )
                        }
                    >
                        <Icon name="term" />
                    </button>
                    <button
                        type="button"
                        className="nx-icon-btn"
                        aria-label="Cambiar tema claro u oscuro"
                        onClick={() =>
                            ui.setTheme(ui.theme === 'light' ? 'dark' : 'light')
                        }
                    >
                        <Icon name={ui.theme === 'light' ? 'moon' : 'sun'} />
                    </button>
                    <button
                        type="button"
                        id="nx-tour-btn"
                        className="nx-icon-btn"
                        aria-label="Guía de uso"
                        title="Guía de uso: recorrido por la app"
                        onClick={() => ui.setTourOpen(true)}
                    >
                        <Icon name="help" />
                    </button>
                    <button
                        type="button"
                        className="nx-icon-btn"
                        aria-label="Notificaciones"
                        onClick={() => setDrawer('notifs')}
                    >
                        <Icon name="bell" />
                    </button>
                    <div style={{ position: 'relative' }} ref={menuRef}>
                        <button
                            type="button"
                            className="nx-avatar"
                            aria-label={user.full_name}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen((o) => !o)}
                        >
                            {initials(user.full_name)}
                        </button>
                        {menuOpen && (
                            <div className="nx-menu" role="menu">
                                <div className="nx-menu-head">
                                    <b>{user.full_name}</b>
                                    <span>
                                        perfil{' '}
                                        {RISK_LABEL[user.risk_profile] ??
                                            user.risk_profile}
                                    </span>
                                </div>
                                {isAdmin && (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        className="nx-menu-item"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            navigate(
                                                admin
                                                    ? '/home'
                                                    : '/admin/arquitectura',
                                            );
                                        }}
                                    >
                                        <Icon name={admin ? 'home' : 'nodes'} />
                                        {admin
                                            ? 'Ver como usuario'
                                            : 'Panel de administración'}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="nx-menu-item"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        navigate('/ajustes');
                                    }}
                                >
                                    <Icon name="gear" />
                                    Ajustes
                                </button>
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="nx-menu-item"
                                    onClick={logout}
                                >
                                    <Icon name="logout" />
                                    Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>
                </header>
                {!admin && <Tape />}
                <div className="nx-legal-strip" id="nx-legal-strip" role="note">
                    <Icon name="alert" size={14} />
                    <span>
                        <b>Información estimativa.</b> No es una recomendación
                        de inversión ni asesoramiento financiero.
                        <button
                            type="button"
                            onClick={() => setDrawer('legal')}
                        >
                            Leer aviso legal
                        </button>
                    </span>
                </div>
                <main className="nx-view">
                    <Suspense fallback={<Empty>Cargando…</Empty>}>
                        <Outlet />
                    </Suspense>
                </main>
                {!admin && <Report />}
            </div>
            {paletteOpen && (
                <CommandPalette
                    admin={admin}
                    isAdmin={isAdmin}
                    onClose={() => setPaletteOpen(false)}
                />
            )}
            {drawer && (
                <>
                    <div className="nx-scrim" onClick={() => setDrawer(null)} />
                    <aside
                        className="nx-drawer"
                        aria-label={
                            drawer === 'legal'
                                ? 'Aviso legal'
                                : 'Notificaciones'
                        }
                    >
                        <div className="nx-card-head">
                            <h3>
                                {drawer === 'legal'
                                    ? 'Aviso legal'
                                    : 'Notificaciones'}
                            </h3>
                            <button
                                type="button"
                                className="nx-icon-btn"
                                aria-label="Cerrar"
                                onClick={() => setDrawer(null)}
                            >
                                <Icon name="x" />
                            </button>
                        </div>
                        {drawer === 'legal' ? (
                            <p style={{ fontSize: 13.5 }}>
                                {LEGAL_TEXT} Ningún modelo puede anticipar el
                                mercado con certeza. Antes de tomar una decisión
                                de inversión, consultá con un asesor financiero
                                matriculado.
                            </p>
                        ) : (
                            <NotificationsDrawer
                                onGoAlerts={() => {
                                    setDrawer(null);
                                    navigate('/alertas');
                                }}
                            />
                        )}
                    </aside>
                </>
            )}
            {ui.tourOpen && <GuideTour onClose={() => ui.setTourOpen(false)} />}
            <PortfolioBuilder
                isOpen={ui.builderOpen}
                onClose={() => ui.setBuilderOpen(false)}
                onSaved={reload}
            />
            <RiskProfileGate
                reason={
                    user.has_to_redo_risk_profile
                        ? user.risk_profile
                            ? 'expired'
                            : 'required'
                        : null
                }
                onCompleted={(risk) => {
                    patchUser({
                        risk_profile: risk,
                        has_to_redo_risk_profile: false,
                    });
                    void reload();
                }}
            />
        </div>
    );
}
