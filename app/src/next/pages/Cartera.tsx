import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../data/PortfolioContext';
import { useUi } from '../data/UiContext';
import { useHoldingsView, type HoldingView } from '../data/useHoldingsView';
import {
    Card,
    ConfidenceBadge,
    Empty,
    Explain,
    Legal,
    PageHead,
    Seg,
    SignalPill,
    Tip,
    type Signal,
} from '../ui/Blocks';
import Icon from '../ui/Icon';
import Sparkline from '../../components/SharesTable/Sparkline';
import { pct, pct1, tone, usd } from '../format';
import { modelLabel } from '../finance';

type Filter = 'todas' | Signal;
type Sort = 'peso' | 'prob' | 'pnl' | 'sem';

const SORT_KEY: Record<Sort, (h: HoldingView) => number> = {
    peso: (h) => h.share,
    prob: (h) => h.prob ?? -1,
    pnl: (h) => h.pnlPercentage ?? -Infinity,
    sem: (h) => h.week ?? -Infinity,
};

const SIGNAL_COLOR: Record<Signal, string> = {
    alza: 'var(--nx-up)',
    baja: 'var(--nx-down)',
    neutral: 'var(--nx-neu)',
};

export default function Cartera() {
    const navigate = useNavigate();
    const ui = useUi();
    const { loading, trendsLoading, error } = usePortfolio();
    const { rows } = useHoldingsView();
    const [filter, setFilter] = useState<Filter>('todas');
    const [sort, setSort] = useState<Sort>('peso');
    const [q, setQ] = useState('');

    const shown = rows
        .filter(
            (h) =>
                (filter === 'todas' || h.signal === filter) &&
                h.ticker.toLowerCase().includes(q.toLowerCase()),
        )
        .sort((a, b) => SORT_KEY[sort](b) - SORT_KEY[sort](a));

    return (
        <>
            <PageHead
                eyebrow={`Cartera · ${rows.length} ${rows.length === 1 ? 'posición' : 'posiciones'}`}
                title="Tus acciones"
                sub="Hacé click en cualquier fila para ver el análisis completo de esa acción."
                actions={
                    <>
                        <button
                            type="button"
                            className="nx-btn"
                            onClick={() => window.print()}
                        >
                            <Icon name="download" /> Informe PDF
                        </button>
                        <button
                            type="button"
                            className="nx-btn primary"
                            onClick={() => ui.setBuilderOpen(true)}
                        >
                            <Icon name="plus" /> Editar cartera
                        </button>
                    </>
                }
            />
            <Legal />
            <Explain title="Cómo leer la tabla">
                <ul>
                    <li>
                        <b>Señal</b> <Tip k="senal" />: Alza, Neutral o Baja
                        según el modelo que elegiste en Ajustes (por defecto, el
                        que mejor le acertó a cada acción).
                    </li>
                    <li>
                        <b>Prob. suba</b> <Tip k="prob" />: qué tan probable es
                        que suba en 20 ruedas. Ojo: en pesos, con inflación, una
                        acción sube "normalmente" unas 6 de cada 10 veces. Por
                        eso se muestra al lado <b>lo normal</b> para esa acción
                        (la rayita de la barra): lo que importa es cuánto se
                        aleja de eso.
                    </li>
                    <li>
                        <b>Neutral es lo más común</b>: los modelos solo dan
                        Alza o Baja cuando la señal es clara, en una minoría de
                        los casos. El resto del tiempo prefieren no apostar.
                    </li>
                    <li>
                        <b>Confianza</b> <Tip k="confsenal" />: qué tan firme es
                        la señal. Mientras más barritas, más seguros están los
                        modelos.
                    </li>
                    <li>
                        <b>P&L</b> <Tip k="pnl" /> y <b>Peso</b>{' '}
                        <Tip k="peso" />: cuánto ganaste en esa acción y qué
                        parte de tu cartera es.
                    </li>
                </ul>
            </Explain>
            <Card i={1}>
                <div className="nx-card-head">
                    <div className="nx-ctl">
                        <span className="nx-ctl-lbl">Mostrar</span>
                        <Seg
                            label="Filtrar por señal"
                            options={[
                                ['todas', 'Todas'],
                                ['alza', 'Alza'],
                                ['neutral', 'Neutral'],
                                ['baja', 'Baja'],
                            ]}
                            value={filter}
                            onChange={setFilter}
                        />
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                        }}
                    >
                        <label className="nx-field">
                            <input
                                type="search"
                                aria-label="Filtrar ticker"
                                placeholder="Filtrar ticker…"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                style={{ width: 160 }}
                            />
                        </label>
                        <span className="nx-ctl-lbl">Ordenar por</span>
                        <Seg
                            label="Ordenar por"
                            options={[
                                ['peso', 'Peso'],
                                ['prob', 'Prob. suba'],
                                ['pnl', 'Ganancia'],
                                ['sem', 'Semana'],
                            ]}
                            value={sort}
                            onChange={setSort}
                        />
                    </div>
                </div>
                {loading ? (
                    <Empty>Cargando tu cartera…</Empty>
                ) : error ? (
                    <Empty>{error}</Empty>
                ) : rows.length === 0 ? (
                    <Empty>
                        Todavía no cargaste acciones.{' '}
                        <button
                            type="button"
                            className="nx-btn sm primary"
                            onClick={() => ui.setBuilderOpen(true)}
                        >
                            Armar mi cartera
                        </button>
                    </Empty>
                ) : (
                    <div className="nx-table-wrap">
                        <table className="nx-table">
                            <thead>
                                <tr>
                                    <th>Acción</th>
                                    <th className="r">Último cierre</th>
                                    <th className="r">Semana</th>
                                    <th>30 ruedas</th>
                                    <th>
                                        Señal <Tip k="senal" />
                                    </th>
                                    <th>
                                        Confianza <Tip k="confsenal" />
                                    </th>
                                    <th>
                                        Prob. suba <Tip k="prob" />
                                    </th>
                                    <th className="r">
                                        Ganancia <Tip k="pnl" />
                                    </th>
                                    <th className="r">
                                        Peso <Tip k="peso" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {shown.map((h) => (
                                    <tr
                                        key={h.ticker}
                                        tabIndex={0}
                                        onClick={() =>
                                            navigate(`/accion/${h.ticker}`)
                                        }
                                        onKeyDown={(e) =>
                                            e.key === 'Enter' &&
                                            navigate(`/accion/${h.ticker}`)
                                        }
                                    >
                                        <td>
                                            <div className="nx-tk">
                                                <div className="nx-logo">
                                                    {h.ticker.slice(0, 4)}
                                                </div>
                                                <div>
                                                    <b>{h.ticker}</b>
                                                    <span>
                                                        {h.quantity}{' '}
                                                        {h.quantity === 1
                                                            ? 'acción'
                                                            : 'acciones'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="r nx-mono nx-ink">
                                            {h.price != null
                                                ? usd(h.price)
                                                : '—'}
                                        </td>
                                        <td
                                            className={`r nx-mono ${h.week != null ? tone(h.week) : 'nx-muted'}`}
                                        >
                                            {h.week != null ? pct(h.week) : '—'}
                                        </td>
                                        <td>
                                            {h.closes.length > 2 ? (
                                                <Sparkline
                                                    closes={h.closes.slice(-30)}
                                                    signal={h.trend?.signal}
                                                    label={h.ticker}
                                                />
                                            ) : (
                                                <span className="nx-muted">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {trendsLoading && !h.trend ? (
                                                <span className="nx-muted">
                                                    …
                                                </span>
                                            ) : (
                                                <>
                                                    <SignalPill
                                                        signal={h.signal}
                                                    />
                                                    {h.model && (
                                                        <div className="nx-cell-sub">
                                                            {modelLabel(
                                                                h.model,
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                        <td>
                                            <ConfidenceBadge level={h.conf} />
                                        </td>
                                        <td>
                                            {h.prob != null ? (
                                                <>
                                                    <span
                                                        className="nx-probbar"
                                                        title={
                                                            h.base != null
                                                                ? `Lo normal para ${h.ticker}: sube ${Math.round(h.base * 100)}% de las veces en 20 ruedas`
                                                                : undefined
                                                        }
                                                    >
                                                        <i
                                                            style={{
                                                                width: `${h.prob * 100}%`,
                                                                background:
                                                                    SIGNAL_COLOR[
                                                                        h.signal ??
                                                                            'neutral'
                                                                    ],
                                                            }}
                                                        />
                                                        {h.base != null && (
                                                            <b
                                                                className="nx-probbar-base"
                                                                style={{
                                                                    left: `${h.base * 100}%`,
                                                                }}
                                                            />
                                                        )}
                                                    </span>
                                                    <span
                                                        className="nx-mono nx-ink"
                                                        style={{
                                                            marginLeft: 8,
                                                        }}
                                                    >
                                                        {Math.round(
                                                            h.prob * 100,
                                                        )}
                                                        %
                                                    </span>
                                                    <div className="nx-cell-sub">
                                                        {h.base != null &&
                                                            `normal ${Math.round(h.base * 100)}%`}
                                                        {h.probModel &&
                                                            h.probModel !==
                                                                (h.model
                                                                    ? modelLabel(
                                                                          h.model,
                                                                      )
                                                                    : null) &&
                                                            ` · según ${h.probModel}`}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="nx-muted">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td
                                            className={`r nx-mono ${h.pnlPercentage != null ? tone(h.pnlPercentage) : 'nx-muted'}`}
                                        >
                                            {h.pnlPercentage != null
                                                ? pct(h.pnlPercentage)
                                                : '—'}
                                            {h.entryPrice != null && (
                                                <div className="nx-cell-sub">
                                                    compraste a{' '}
                                                    {usd(h.entryPrice)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="r nx-mono">
                                            {pct1(h.share * 100)}
                                        </td>
                                    </tr>
                                ))}
                                {shown.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="nx-muted"
                                            style={{
                                                textAlign: 'center',
                                                padding: 30,
                                            }}
                                        >
                                            Ninguna acción coincide con el
                                            filtro.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </>
    );
}
