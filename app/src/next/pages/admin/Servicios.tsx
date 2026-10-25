import { useEffect, useState } from 'react';
import {
    getAdminHealthEndpoint,
    type ServiceHealth,
} from '../../../api/next/endpoints';
import { Card, CardHead, Empty, PageHead } from '../../ui/Blocks';

const FREQ: Array<[string, string, string]> = [
    ['cada 60 min', 'Lista de tickers de BYMA', 'data-colector'],
    [
        'lotes de 8, cada 2–4 min',
        'Velas diarias (OHLC) de Yahoo Finance, 10 años. Si no hay pendientes, duerme 5 h.',
        'data-colector',
    ],
    ['cada 6 h', 'Oro y petróleo', 'data-colector'],
    [
        'cada 10 h',
        'Clasificación de Rava (tickers del Merval)',
        'data-colector',
    ],
    [
        'a pedido (con caché)',
        'Dólares, riesgo país, tasas BCRA y EE.UU.',
        'data-colector',
    ],
    ['cada 24 h', 'Job de alertas por cambio de señal', 'backend-website'],
    ['lunes', 'Mail de resumen semanal', 'backend-website'],
];

const STATUS: Record<string, string> = {
    up: 'OK',
    down: 'caído',
    not_configured: 'sin configurar',
};

function latency(ms: number | null): string {
    if (ms == null) return '—';
    return ms > 999
        ? `${(ms / 1000).toFixed(1).replace('.', ',')} s`
        : `${Math.round(ms)} ms`;
}

export default function Servicios() {
    const [services, setServices] = useState<ServiceHealth[] | null>(null);
    const [error, setError] = useState(false);
    const [log, setLog] = useState<
        Array<{ at: string; text: string; ok: boolean }>
    >([]);

    useEffect(() => {
        let alive = true;
        const check = () =>
            getAdminHealthEndpoint().then(
                (r) => {
                    if (!alive) return;
                    setServices(r.services);
                    setError(false);
                    const at = new Date().toLocaleTimeString('es-AR');
                    setLog((l) =>
                        [
                            ...r.services.map((s) => ({
                                at,
                                ok: s.status === 'up',
                                text: `${s.name} ${STATUS[s.status] ?? s.status} ${latency(s.latency_ms)}${s.error ? ' · ' + s.error : ''}`,
                            })),
                            ...l,
                        ].slice(0, 40),
                    );
                },
                () => alive && setError(true),
            );
        void check();
        const id = window.setInterval(check, 15_000);
        return () => {
            alive = false;
            window.clearInterval(id);
        };
    }, []);

    return (
        <>
            <PageHead
                eyebrow="Administración · Servicios"
                title="Estado de los servicios"
                sub="Salud de cada microservicio (se vuelve a chequear cada 15 segundos) y cada cuánto se actualizan los datos."
            />
            {error && (
                <Empty>No se pudo consultar el estado de los servicios.</Empty>
            )}
            {!services && !error && <Empty>Chequeando servicios…</Empty>}
            {services && (
                <div className="nx-grid" style={{ marginBottom: 16 }}>
                    {services.map((s, k) => (
                        <Card span="s3" i={k} key={s.name}>
                            <div className="nx-svc">
                                <div className="nm">
                                    <span
                                        className={`nx-dot ${s.status === 'up' ? ((s.latency_ms ?? 0) > 1000 ? 'warn' : '') : s.status === 'down' ? 'err' : 'off'}`}
                                    />
                                    {s.name}
                                </div>
                                <div
                                    className="nx-stat-grid"
                                    style={{ marginTop: 8 }}
                                >
                                    <div className="nx-stat">
                                        <div className="k">Estado</div>
                                        <div
                                            className={`v ${s.status === 'up' ? 'nx-up' : s.status === 'down' ? 'nx-down' : ''}`}
                                        >
                                            {STATUS[s.status] ?? s.status}
                                        </div>
                                    </div>
                                    <div className="nx-stat">
                                        <div className="k">Latencia</div>
                                        <div
                                            className={`v ${(s.latency_ms ?? 0) > 500 ? 'nx-down' : ''}`}
                                        >
                                            {latency(s.latency_ms)}
                                        </div>
                                    </div>
                                </div>
                                {s.error && (
                                    <div
                                        className="nx-muted nx-mono"
                                        style={{ fontSize: 10.5 }}
                                    >
                                        {s.error}
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            <div className="nx-grid">
                <Card span="s7" i={5}>
                    <CardHead
                        title="Últimos chequeos"
                        hint="Resultado de cada consulta de salud"
                    />
                    <div className="nx-log">
                        {log.length === 0 && (
                            <span className="nx-muted">
                                Sin chequeos todavía.
                            </span>
                        )}
                        {log.map((l, k) => (
                            <div key={k}>
                                <span className="nx-muted">{l.at}</span>{' '}
                                <span className={l.ok ? 'nx-up' : 'nx-down'}>
                                    ●
                                </span>{' '}
                                {l.text}
                            </div>
                        ))}
                    </div>
                </Card>
                <Card span="s5" i={6}>
                    <CardHead
                        title="Frecuencia de recolección"
                        hint="Cada cuánto se actualiza cada fuente de datos"
                    />
                    <div className="nx-timeline">
                        {FREQ.map(([w, t, f]) => (
                            <div className="nx-tl-item" key={t}>
                                <div className="when">{w}</div>
                                {t}
                                <div
                                    className="nx-mono nx-muted"
                                    style={{ fontSize: 10.5 }}
                                >
                                    {f}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </>
    );
}
