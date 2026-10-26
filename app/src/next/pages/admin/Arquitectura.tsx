import { useState } from 'react';
import { useRemote } from '../../data/useRemote';
import { getAdminHealthEndpoint } from '../../../api/next/endpoints';
import { Card, PageHead } from '../../ui/Blocks';
import {
    ARCH_ENDPOINTS,
    type ArchGroup,
    type ArchItem,
    type Field,
} from './archEndpoints';

interface Node {
    x: number;
    y: number;
    t: string;
    s: string;
    d: string;
    health?: string;
}

const ARCH: Record<string, Node> = {
    src1: {
        x: 20,
        y: 140,
        t: 'BYMA · Rava',
        s: 'tickers del Merval',
        d: 'Fuentes de la lista de acciones. data-colector refresca la lista de BYMA cada 60 min y la clasificación de Rava cada 10 h.',
    },
    src2: {
        x: 20,
        y: 40,
        t: 'Yahoo Finance',
        s: 'velas diarias OHLC',
        d: 'data-colector guarda 10 años de velas diarias por ticker (intervalo D1), y oro y petróleo cada 6 h. api-ml también baja de acá los históricos que usan los modelos.',
    },
    src3: {
        x: 20,
        y: 240,
        t: 'ArgentinaDatos',
        s: 'dólares · riesgo país',
        d: 'CCL, MEP, blue y riesgo país. Se piden a demanda y se cachean.',
    },
    src4: {
        x: 20,
        y: 340,
        t: 'BCRA · tasas EE.UU.',
        s: 'tasas y reservas',
        d: 'TPM, BADLAR, reservas, tipo de cambio mayorista y base monetaria (BCRA). Las tasas de los bonos del Tesoro de EE.UU. (^IRX, ^FVX, ^TNX, ^TYX) salen de Yahoo, no del Tesoro directo.',
    },
    dc: {
        x: 290,
        y: 150,
        t: 'data-colector',
        s: 'Rust · axum',
        health: 'data-colector',
        d: 'Recolecta y guarda precios, velas, series macro y tasas, y se las sirve a los otros servicios.',
    },
    db: {
        x: 290,
        y: 330,
        t: 'PostgreSQL',
        s: 'precios · macro',
        d: 'Históricos de precios, lista de tickers, series macro y tasas que guarda data-colector.',
    },
    ml: {
        x: 540,
        y: 60,
        t: 'api-ml',
        s: 'Python · FastAPI',
        health: 'api-ml',
        d: 'Modelos (LSTM, XGBoost, Transformer, ARIMA, Contexto, Macro), consenso, GARCH, explicaciones SHAP, historial de señales y Black-Litterman. Le pide a data-colector la lista de tickers, las series macro y las tasas.',
    },
    modal: {
        x: 790,
        y: 20,
        t: 'Modal',
        s: 'modelos remotos',
        health: 'modal',
        d: 'Versiones de LSTM, XGBoost, Transformer, ARIMA, SVM y GARCH que corren en Modal, una por ticker. Las consultan backend-website y api-ml.',
    },
    be: {
        x: 540,
        y: 240,
        t: 'backend-website',
        s: 'Rust · axum',
        health: 'backend-website',
        d: 'Login, registro, 2FA, carteras, P&L, alertas diarias y mail semanal de los lunes. Le pide precios a data-colector, predicciones a api-ml y a Modal.',
    },
    bedb: {
        x: 540,
        y: 350,
        t: 'PostgreSQL',
        s: 'usuarios · carteras',
        d: 'Usuarios, carteras, suscripciones a alertas y cachés de tendencias y de la comparación de modelos.',
    },
    mail: {
        x: 790,
        y: 340,
        t: 'SMTP',
        s: 'alertas · resumen',
        d: 'Mails de verificación, recupero de contraseña, alerta de cambio de señal y resumen semanal.',
    },
    fe: {
        x: 790,
        y: 180,
        t: 'Frontend',
        s: 'React · Vite',
        d: 'Esta interfaz. Habla con backend-website; para la ficha de cada acción también consulta a data-colector.',
    },
};
const WIRES: Array<[string, string]> = [
    ['src1', 'dc'],
    ['src2', 'dc'],
    ['src3', 'dc'],
    ['src4', 'dc'],
    ['src2', 'ml'],
    ['dc', 'db'],
    ['dc', 'ml'],
    ['dc', 'be'],
    ['dc', 'fe'],
    ['ml', 'modal'],
    ['ml', 'be'],
    ['be', 'modal'],
    ['be', 'bedb'],
    ['be', 'fe'],
    ['be', 'mail'],
];
const NW = 170;
const NH = 58;

export default function Arquitectura() {
    const [sel, setSel] = useState('ml');
    const [q, setQ] = useState('');
    const [open, setOpen] = useState<string | null>(null);
    const health = useRemote('admin-health', getAdminHealthEndpoint);
    const statusOf = (n: Node): boolean | null => {
        if (!n.health) return null;
        const s = health.data?.services.find((x) =>
            x.name.toLowerCase().includes(n.health!),
        );
        return s && s.status !== 'not_configured' ? s.status === 'up' : null;
    };
    const c = (k: string) => [ARCH[k].x + NW / 2, ARCH[k].y + NH / 2];
    const node = ARCH[sel];
    const st = statusOf(node);

    return (
        <>
            <PageHead
                eyebrow="Administración · Arquitectura"
                title="Cómo está armado FinanciAr"
                sub="Tres microservicios, dos bases de datos, modelos en Modal y varias fuentes externas. Los puntitos que viajan son los datos. Tocá cualquier caja."
            />
            <div className="nx-grid">
                <Card span="s8 nx-arch" i={1}>
                    <div style={{ overflowX: 'auto' }}>
                        <svg
                            viewBox="0 0 980 420"
                            style={{ minWidth: 560 }}
                            role="img"
                            aria-label="Diagrama de arquitectura"
                        >
                            {WIRES.map(([a, b], k) => {
                                const [x1, y1] = c(a);
                                const [x2, y2] = c(b);
                                const mx = (x1 + x2) / 2;
                                const d =
                                    Math.abs(x1 - x2) < 10
                                        ? `M${x1},${y1 + NH / 2}L${x2},${y2 - NH / 2}`
                                        : `M${x1 + NW / 2},${y1}C${mx},${y1} ${mx},${y2} ${x2 - NW / 2},${y2}`;
                                return (
                                    <g key={k}>
                                        <path
                                            id={`nx-w${k}`}
                                            className="wire"
                                            d={d}
                                        />
                                        <circle
                                            r={3.5}
                                            fill="var(--nx-accent-2)"
                                        >
                                            <animateMotion
                                                dur={`${2 + (k % 4) * 0.6}s`}
                                                repeatCount="indefinite"
                                                begin={`${k * 0.3}s`}
                                            >
                                                <mpath href={`#nx-w${k}`} />
                                            </animateMotion>
                                        </circle>
                                    </g>
                                );
                            })}
                            {Object.entries(ARCH).map(([k, n]) => {
                                const ok = statusOf(n);
                                return (
                                    <g
                                        key={k}
                                        className={`nd ${sel === k ? 'sel' : ''}`}
                                        transform={`translate(${n.x},${n.y})`}
                                        onClick={() => {
                                            setSel(k);
                                            setQ('');
                                            setOpen(null);
                                        }}
                                        role="button"
                                        aria-label={n.t}
                                    >
                                        <rect width={NW} height={NH} rx={12} />
                                        {ok !== null && (
                                            <circle
                                                cx={NW - 14}
                                                cy={14}
                                                r={4}
                                                fill={
                                                    ok
                                                        ? 'var(--nx-up)'
                                                        : 'var(--nx-down)'
                                                }
                                            />
                                        )}
                                        <text x={14} y={25}>
                                            {n.t}
                                        </text>
                                        <text className="s" x={14} y={43}>
                                            {n.s}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                </Card>
                <Card span="s4" i={2}>
                    <div className="nx-eyebrow">{node.s}</div>
                    <h2 style={{ fontSize: 24, marginBottom: 10 }}>{node.t}</h2>
                    <p style={{ fontSize: 13.5, lineHeight: 1.9 }}>{node.d}</p>
                    {node.health && (
                        <div className="nx-sys-row" style={{ marginTop: 14 }}>
                            <span className="nx-muted">Estado</span>
                            <span>
                                <span
                                    className={`nx-dot ${st === null ? 'off' : st ? '' : 'err'}`}
                                />{' '}
                                {st === null
                                    ? 'sin dato'
                                    : st
                                      ? 'funcionando'
                                      : 'con problemas'}
                            </span>
                        </div>
                    )}
                </Card>
                {(ARCH_ENDPOINTS[sel] ?? []).length > 0 && (
                    <Card span="s12" i={3}>
                        <Endpoints
                            node={node.t}
                            groups={ARCH_ENDPOINTS[sel] ?? []}
                            q={q}
                            setQ={setQ}
                            open={open}
                            setOpen={setOpen}
                        />
                    </Card>
                )}
            </div>
        </>
    );
}

function Endpoints({
    node,
    groups,
    q,
    setQ,
    open,
    setOpen,
}: {
    node: string;
    groups: ArchGroup[];
    q: string;
    setQ: (v: string) => void;
    open: string | null;
    setOpen: (v: string | null) => void;
}) {
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    if (!total) return null;
    const needle = q.trim().toLowerCase();
    const shown = groups
        .map((g) => ({
            ...g,
            items: g.items.filter(
                (it) =>
                    !needle ||
                    `${it.m} ${it.path} ${it.d}`.toLowerCase().includes(needle),
            ),
        }))
        .filter((g) => g.items.length);
    const kind = groups[0].items[0].m;
    const label =
        kind === 'TABLA'
            ? 'tablas'
            : kind === 'MAIL'
              ? 'mails'
              : kind === 'PÁG'
                ? 'pantallas'
                : 'endpoints';

    return (
        <div className="nx-arch-eps">
            <div className="nx-arch-eps-head">
                <h3>
                    {node}: {total} {label}
                    <small>
                        Tocá uno para ver qué recibe, qué devuelve y para qué se
                        usa.
                    </small>
                </h3>
                {total > 6 && (
                    <input
                        type="search"
                        placeholder="Buscar…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        aria-label={`Buscar ${label}`}
                    />
                )}
            </div>
            {shown.map((g) => (
                <div key={g.title} className="nx-arch-eps-group">
                    <div className="nx-eyebrow">{g.title}</div>
                    {g.items.map((it) => {
                        const id = `${g.title}${it.m}${it.path}`;
                        const isOpen = open === id;
                        return (
                            <div
                                key={id}
                                className={`nx-arch-ep ${isOpen ? 'open' : ''}`}
                            >
                                <button
                                    type="button"
                                    className="top"
                                    aria-expanded={isOpen}
                                    onClick={() => setOpen(isOpen ? null : id)}
                                >
                                    <span
                                        className={`m m-${it.m.split(' ')[0].toLowerCase()}`}
                                    >
                                        {it.m}
                                    </span>
                                    <code>{it.path}</code>
                                </button>
                                {isOpen && <EndpointDetail it={it} />}
                            </div>
                        );
                    })}
                </div>
            ))}
            {!shown.length && (
                <p className="nx-muted">Nada coincide con “{q}”.</p>
            )}
        </div>
    );
}

function FieldTable({ title, rows }: { title: string; rows: Field[] }) {
    return (
        <div className="nx-arch-fields">
            <b>{title}</b>
            <table>
                <tbody>
                    {rows.map(([name, type, desc]) => (
                        <tr key={name}>
                            <td>
                                <code>{name}</code>
                                <small>{type}</small>
                            </td>
                            <td>{desc}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function EndpointDetail({ it }: { it: ArchItem }) {
    return (
        <div className="d">
            <p>{it.d}</p>
            {it.auth && <p className="by">Pide: {it.auth}</p>}
            {it.by && <p className="by">Lo usa: {it.by}</p>}
            {it.req && <FieldTable title="Recibe" rows={it.req} />}
            {it.res && <FieldTable title="Devuelve" rows={it.res} />}
            {it.uso && (
                <p className="uso">
                    <b>Para qué se usa:</b> {it.uso}
                </p>
            )}
        </div>
    );
}
