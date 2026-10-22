import { useState } from 'react';
import { useRemote } from '../../data/useRemote';
import { getAdminHealthEndpoint } from '../../../api/next/endpoints';
import { Card, PageHead } from '../../ui/Blocks';

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
        y: 40,
        t: 'BYMA · Rava',
        s: 'tickers del Merval',
        d: 'Fuentes de la lista de acciones. data-colector refresca la lista de BYMA cada 60 min y la clasificación de Rava cada 10 h.',
    },
    src2: {
        x: 20,
        y: 140,
        t: 'Yahoo Finance',
        s: 'velas diarias OHLC',
        d: '10 años de velas diarias por ticker (intervalo D1). Oro y petróleo cada 6 h.',
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
        t: 'BCRA · Tesoro EE.UU.',
        s: 'tasas y reservas',
        d: 'TPM, BADLAR, reservas, tipo de cambio mayorista y base monetaria (BCRA), y bonos del Tesoro de EE.UU. (^IRX, ^FVX, ^TNX).',
    },
    dc: {
        x: 290,
        y: 150,
        t: 'data-colector',
        s: 'Rust · axum',
        health: 'data-colector',
        d: 'Recolecta y guarda precios, velas, series macro y tasas. Endpoints /historical-data, /macro/argdatos, /interest-rate, /available-tickers, /health.',
    },
    db: {
        x: 290,
        y: 330,
        t: 'PostgreSQL',
        s: 'precios · usuarios',
        d: 'Base compartida: históricos de precios, tickers, usuarios, carteras, suscripciones a alertas y caché de tendencias.',
    },
    ml: {
        x: 540,
        y: 60,
        t: 'api-ml',
        s: 'Python · FastAPI',
        health: 'api-ml',
        d: 'Modelos (LSTM, XGBoost, Transformer, ARIMA, Contexto), consenso, GARCH, explicaciones SHAP, historial de señales y Black-Litterman.',
    },
    modal: {
        x: 790,
        y: 20,
        t: 'Modal',
        s: 'GPU remota',
        health: 'modal',
        d: 'Versiones remotas de los modelos para inferencia pesada sin tener GPU local.',
    },
    be: {
        x: 540,
        y: 240,
        t: 'backend-website',
        s: 'Rust · axum',
        health: 'backend-website',
        d: 'Login, registro, 2FA, carteras, P&L, alertas diarias y mail semanal de los lunes. Es la puerta entre el frontend y los otros servicios.',
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
        d: 'Esta interfaz. Habla solamente con backend-website.',
    },
};
const WIRES: Array<[string, string]> = [
    ['src1', 'dc'],
    ['src2', 'dc'],
    ['src3', 'dc'],
    ['src4', 'dc'],
    ['dc', 'db'],
    ['dc', 'ml'],
    ['ml', 'modal'],
    ['ml', 'be'],
    ['be', 'db'],
    ['be', 'fe'],
    ['be', 'mail'],
];
const NW = 170;
const NH = 58;

export default function Arquitectura() {
    const [sel, setSel] = useState('ml');
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
                sub="Tres microservicios, una base de datos y varias fuentes externas. Los puntitos que viajan son los datos. Tocá cualquier caja."
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
                                        onClick={() => setSel(k)}
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
            </div>
        </>
    );
}
