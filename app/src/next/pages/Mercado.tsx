import { useNavigate } from 'react-router-dom';
import { useHoldingsView } from '../data/useHoldingsView';
import { useRemote } from '../data/useRemote';
import {
    getMarketSeriesEndpoint,
    type MarketSeriesKey,
} from '../../api/next/endpoints';
import { Card, CardHead, Empty, Explain, PageHead, Tip } from '../ui/Blocks';
import type { GlossaryKey } from '../glossary';
import Sparkline from '../../components/SharesTable/Sparkline';
import { arrow, num, pct, tone } from '../format';
import { BYMA } from '../shell/marketClock';

interface MarketSeries {
    key: MarketSeriesKey;
    name: string;
    unit: string;
    tip: GlossaryKey;
    decimals: number;
    source: string;
    usedBy: string | null;
}

const SERIES: MarketSeries[] = [
    {
        key: 'CCL',
        name: 'Dólar CCL',
        unit: '$ por USD',
        tip: 'ccl',
        decimals: 2,
        source: 'ArgentinaDatos',
        usedBy: 'Macro',
    },
    {
        key: 'MEP',
        name: 'Dólar MEP',
        unit: '$ por USD',
        tip: 'mep',
        decimals: 2,
        source: 'ArgentinaDatos',
        usedBy: 'Macro',
    },
    {
        key: 'RIESGO_PAIS',
        name: 'Riesgo país',
        unit: 'puntos básicos',
        tip: 'riesgopais',
        decimals: 0,
        source: 'ArgentinaDatos',
        usedBy: 'Macro',
    },
    {
        key: 'TPM',
        name: 'Tasa BCRA (TPM)',
        unit: '% anual',
        tip: 'tpm',
        decimals: 2,
        source: 'BCRA',
        usedBy: null,
    },
    {
        key: 'BADLAR',
        name: 'BADLAR',
        unit: '% anual',
        tip: 'badlar',
        decimals: 2,
        source: 'BCRA',
        usedBy: 'Macro',
    },
    {
        key: 'RESERVAS',
        name: 'Reservas BCRA',
        unit: 'millones de USD',
        tip: 'reservas',
        decimals: 0,
        source: 'BCRA',
        usedBy: 'Macro',
    },
    {
        key: 'TNX',
        name: 'Bono EE.UU. 10 años',
        unit: '%',
        tip: 'tnx',
        decimals: 2,
        source: 'Yahoo Finance',
        usedBy: 'LSTM y Transformer',
    },
    {
        key: 'GOLD',
        name: 'Oro',
        unit: 'USD por onza',
        tip: 'oro',
        decimals: 2,
        source: 'Yahoo Finance',
        usedBy: null,
    },
    {
        key: 'OIL',
        name: 'Petróleo WTI',
        unit: 'USD por barril',
        tip: 'wti',
        decimals: 2,
        source: 'Yahoo Finance',
        usedBy: null,
    },
];

function fmt(v: number, d: number): string {
    return d === 0
        ? Math.round(v).toLocaleString('es-AR')
        : v.toLocaleString('es-AR', {
              minimumFractionDigits: d,
              maximumFractionDigits: d,
          });
}

export default function Mercado() {
    const navigate = useNavigate();
    const market = useRemote('market-series', getMarketSeriesEndpoint);
    const { rows } = useHoldingsView();
    const by = BYMA();
    const tiles = [...rows].sort((a, b) => b.share - a.share);

    return (
        <>
            <PageHead
                eyebrow="Mercado · contexto"
                title="Lo que pasa alrededor de tus acciones"
                sub="Una acción argentina no se mueve sola: depende del dólar, del riesgo país y de las tasas. En cada dato te decimos de dónde sale y qué modelo lo usa."
            />
            <Explain title="Por qué importa el contexto">
                <p>
                    Al probar los modelos,{' '}
                    <b>
                        lo que más mejoró las predicciones fue sumarles el
                        contexto del mercado
                    </b>
                    , no solo el precio de cada acción. El modelo <b>Macro</b>{' '}
                    usa el dólar, el riesgo país, las reservas y la BADLAR de
                    esta pantalla. <b>Contexto</b> y <b>XGBoost</b> miran cómo
                    viene el mercado (una canasta de las acciones líderes) y
                    cómo le va a cada acción frente a las demás.
                </p>
                <p>
                    <b>De dónde salen:</b> dólares y riesgo país de
                    ArgentinaDatos; tasas y reservas de la API del BCRA; bono de
                    EE.UU., oro, petróleo y los precios de las acciones de Yahoo
                    Finance (las acciones, tal como cotizan en BYMA, en pesos).
                    Se actualizan <b>una vez por día</b>: no son cotizaciones en
                    tiempo real.
                </p>
            </Explain>
            <div className="nx-grid" style={{ marginBottom: 16 }}>
                <Card span="s12 nx-kpi" i={0}>
                    <div className="nx-label">BYMA · Buenos Aires</div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            marginTop: 8,
                            flexWrap: 'wrap',
                        }}
                    >
                        <span className={`nx-dot ${by.isOpen ? '' : 'off'}`} />
                        <b className="nx-ink" style={{ fontSize: 22 }}>
                            {by.isOpen ? 'Abierto' : 'Cerrado'}
                        </b>
                        <span className="nx-muted nx-mono">
                            {by.time} · {by.message}
                        </span>
                    </div>
                    <div className="nx-plain">
                        Se opera de 11:00 a 17:00 (hora argentina), de lunes a
                        viernes. Todos los precios de FinanciAr son los de BYMA,
                        en pesos, al cierre de cada rueda.
                    </div>
                </Card>
            </div>
            {market.error && (
                <Empty>
                    No pudimos traer los datos del mercado. Probá de nuevo más
                    tarde.
                </Empty>
            )}
            {market.loading && <Empty>Cargando datos del mercado…</Empty>}
            {market.data && (
                <div className="nx-grid" style={{ marginBottom: 16 }}>
                    {SERIES.map((m, k) => {
                        const { key, name, unit, tip, decimals: d } = m;
                        const s = market.data!.series.find(
                            (x) => x.key === key,
                        );
                        const vals = s?.points.map((p) => p.value) ?? [];
                        const lastV = vals[vals.length - 1];
                        const prev =
                            vals.length > 5 ? vals[vals.length - 6] : null;
                        const c =
                            lastV != null && prev
                                ? ((lastV - prev) / prev) * 100
                                : null;
                        return (
                            <Card span="s3 nx-kpi" i={k + 2} key={key}>
                                <div className="nx-label">
                                    {name} <Tip k={tip} />
                                </div>
                                <div
                                    className="nx-muted"
                                    style={{ fontSize: 11 }}
                                >
                                    {unit}
                                </div>
                                <div
                                    className="nx-value"
                                    style={{ fontSize: 22 }}
                                >
                                    {lastV != null ? fmt(lastV, d) : '—'}
                                </div>
                                {c != null && (
                                    <div className="nx-delta">
                                        <span
                                            className={`nx-chip-d ${tone(c)}`}
                                        >
                                            {arrow(c)} {pct(c)}
                                        </span>
                                        <span className="nx-muted">semana</span>
                                    </div>
                                )}
                                {vals.length > 2 && (
                                    <div style={{ marginTop: 6 }}>
                                        <Sparkline
                                            closes={vals.slice(-60)}
                                            signal={
                                                c != null && c >= 0
                                                    ? 'alza'
                                                    : 'baja'
                                            }
                                            label={name}
                                        />
                                    </div>
                                )}
                                <div className="nx-src">
                                    Fuente: {m.source} ·{' '}
                                    {m.usedBy
                                        ? `lo usa el modelo ${m.usedBy}`
                                        : 'solo contexto, ningún modelo lo usa'}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
            <div className="nx-grid">
                <Card i={13}>
                    <CardHead
                        title="Mapa de tu cartera"
                        hint="Tamaño = cuánto pesa en tu cartera. Color = cuánto se movió en la semana. Click para analizarla."
                    />
                    {tiles.length ? (
                        <div className="nx-sector-map">
                            {tiles.map((x, k) => {
                                const c = x.week ?? 0;
                                const span =
                                    x.share > 0.12
                                        ? {
                                              gridColumn: 'span 2',
                                              gridRow: 'span 2',
                                          }
                                        : x.share > 0.07
                                          ? { gridColumn: 'span 2' }
                                          : {};
                                return (
                                    <button
                                        type="button"
                                        key={x.ticker}
                                        className="nx-tile"
                                        onClick={() =>
                                            navigate(`/accion/${x.ticker}`)
                                        }
                                        style={{
                                            ...span,
                                            animationDelay: `${k * 40}ms`,
                                            background: `color-mix(in oklab, ${c >= 0 ? 'var(--nx-up)' : 'var(--nx-down)'} ${Math.round(15 + Math.min(1, Math.abs(c) / 6) * 50)}%, var(--nx-panel-2))`,
                                        }}
                                    >
                                        <span>
                                            {x.ticker}
                                            <br />
                                            <small
                                                className="nx-muted"
                                                style={{ fontWeight: 400 }}
                                            >
                                                {num(x.share * 100, 1)}% de la
                                                cartera
                                            </small>
                                        </span>
                                        <small>
                                            {x.week != null ? pct(x.week) : '—'}
                                        </small>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <Empty>Sin posiciones.</Empty>
                    )}
                </Card>
            </div>
        </>
    );
}
