import { useEffect, useMemo, useState } from 'react';
import { getUserSharesEndpoint } from '../../api/userShares/getUserSharesEndpoint';
import { getTrendsCompareEndpoint } from '../../api/userShares/getShareTrendsCompare';
import {
    DEFAULT_CONFIG,
    bestModelOf,
    fmtPct,
    getAccuracy,
    loadConfig,
    saveConfig,
    type DefaultModelsConfig,
} from '../../utils/defaultModels';

type CompareTrendsResponse = Awaited<
    ReturnType<typeof getTrendsCompareEndpoint>
>;

interface ModelOption {
    key: string;
    accuracy: number | null;
    available: boolean;
    reason?: string | null;
}

interface ModelListProps {
    groupName: string;
    models: ModelOption[];
    value: string | null;
    onChange: (model: string) => void;
    disabled?: boolean;
}

function ModelList({
    groupName,
    models,
    value,
    onChange,
    disabled,
}: ModelListProps) {
    return (
        <div className="notifications-settings-sublist" role="radiogroup">
            {models.map((m) => (
                <label
                    key={m.key}
                    className="settings-row settings-row-sub"
                    style={{
                        cursor:
                            disabled || !m.available ? 'default' : 'pointer',
                        opacity: disabled || !m.available ? 0.5 : 1,
                    }}
                >
                    <div className="settings-row-label">
                        <b>{m.key}</b>
                        <span>
                            {m.available
                                ? `Precisión direccional: ${fmtPct(m.accuracy)}`
                                : (m.reason ?? 'No disponible')}
                        </span>
                    </div>
                    <input
                        type="radio"
                        name={groupName}
                        value={m.key}
                        checked={value === m.key}
                        disabled={disabled || !m.available}
                        onChange={() => onChange(m.key)}
                    />
                </label>
            ))}
        </div>
    );
}

interface ExpandableCardProps {
    title: string;
    subtitle: string;
    expanded: boolean;
    onToggle: () => void;
    dimmed?: boolean;
    children: React.ReactNode;
}

function ExpandableCard({
    title,
    subtitle,
    expanded,
    onToggle,
    dimmed,
    children,
}: ExpandableCardProps) {
    return (
        <div
            style={{
                opacity: dimmed ? 0.6 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
            }}
        >
            <button
                type="button"
                className="settings-row"
                onClick={onToggle}
                aria-expanded={expanded}
                style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'inherit',
                }}
            >
                <div className="settings-row-label">
                    <b>{title}</b>
                    <span>{subtitle}</span>
                </div>
                <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
            </button>
            {expanded && children}
        </div>
    );
}

const ALL_KEY = '__all__';

function DefaultModelsSettings() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [config, setConfig] = useState<DefaultModelsConfig>(DEFAULT_CONFIG);
    const [tickers, setTickers] = useState<string[]>([]);
    const [data, setData] = useState<Record<string, CompareTrendsResponse>>({});
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const [shares, saved] = await Promise.all([
                    getUserSharesEndpoint(),
                    loadConfig(),
                ]);
                const list = shares.shares.map((s) => s.ticker);

                const results = await Promise.allSettled(
                    list.map((t) => getTrendsCompareEndpoint(t)),
                );
                if (cancelled) return;

                const byTicker: Record<string, CompareTrendsResponse> = {};
                results.forEach((r, i) => {
                    if (r.status === 'fulfilled') byTicker[list[i]] = r.value;
                });

                setTickers(list);
                setData(byTicker);
                setConfig(saved);
            } catch {
                if (!cancelled) setError('No pudimos cargar los modelos.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    function update(patch: Partial<DefaultModelsConfig>) {
        const next = { ...config, ...patch };
        setConfig(next);
        setError(null);
        saveConfig(next).catch(() =>
            setError('No pudimos guardar tu configuración.'),
        );
    }

    function toggleExpanded(key: string) {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    // Toggles globales: mutuamente excluyentes, y NO tocan perTicker.
    function handleUseBest() {
        const next = !config.useBest;
        update({ useBest: next, useSame: next ? false : config.useSame });
    }

    function handleUseSame() {
        const next = !config.useSame;
        update({ useSame: next, useBest: next ? false : config.useBest });
    }

    // Lista de modelos para la card "mismo para todos": promedio entre acciones.
    const sameModels: ModelOption[] = useMemo(() => {
        const acc: Record<
            string,
            { sum: number; n: number; available: boolean }
        > = {};
        Object.values(data).forEach((d) => {
            Object.entries(d.predictions).forEach(([key, p]) => {
                const entry = (acc[key] ??= { sum: 0, n: 0, available: false });
                if (p.available) entry.available = true;
                const a = getAccuracy(p);
                if (a != null) {
                    entry.sum += a <= 1 ? a * 100 : a;
                    entry.n += 1;
                }
            });
        });
        return Object.entries(acc).map(([key, v]) => ({
            key,
            accuracy: v.n ? v.sum / v.n : null,
            available: v.available,
        }));
    }, [data]);

    if (loading) {
        return <p className="settings-row-label">Cargando modelos...</p>;
    }

    const perTickerDisabled = config.useBest || config.useSame;

    return (
        <div className="notifications-settings">
            {error && <p className="text-danger">{error}</p>}

            {/* 1. Toggle: mejor modelo para cada acción */}
            <div className="settings-row">
                <div className="settings-row-label">
                    <b>Usar el mejor modelo para cada acción</b>
                    <span>
                        {config.useBest
                            ? 'Se muestra el modelo con mejor precisión de cada acción'
                            : 'Se usa la elección de cada acción'}
                    </span>
                </div>
                <button
                    type="button"
                    className={`theme-toggle${config.useBest ? ' is-on' : ''}`}
                    onClick={handleUseBest}
                    role="switch"
                    aria-checked={config.useBest}
                    aria-label="Usar el mejor modelo para cada acción"
                >
                    <span className="theme-toggle-thumb" />
                </button>
            </div>

            {/* 2. Card: mismo modelo para todas */}
            <div className="settings-row">
                <div className="settings-row-label">
                    <b>Usar el mismo modelo para todas</b>
                    <span>
                        {config.useSame
                            ? `Todas las acciones usan ${config.sameModel ?? '(elegí un modelo)'}`
                            : 'Desactivado'}
                    </span>
                </div>
                <button
                    type="button"
                    className={`theme-toggle${config.useSame ? ' is-on' : ''}`}
                    onClick={handleUseSame}
                    role="switch"
                    aria-checked={config.useSame}
                    aria-label="Usar el mismo modelo para todas las acciones"
                >
                    <span className="theme-toggle-thumb" />
                </button>
            </div>
            <ExpandableCard
                title="Modelo para todas las acciones"
                subtitle="Precisión promedio entre tus acciones"
                expanded={expanded.has(ALL_KEY)}
                onToggle={() => toggleExpanded(ALL_KEY)}
                dimmed={!config.useSame}
            >
                <ModelList
                    groupName="model-all"
                    models={sameModels}
                    value={config.sameModel}
                    onChange={(m) => update({ sameModel: m })}
                    disabled={!config.useSame}
                />
            </ExpandableCard>

            {/* 3. Lista por acción */}
            {tickers.length === 0 ? (
                <p className="settings-row-label notifications-settings-sublist">
                    No tenés acciones cargadas todavía.
                </p>
            ) : (
                <div className="notifications-settings-sublist">
                    {tickers.map((ticker) => {
                        const d = data[ticker];
                        const best = bestModelOf(d);
                        const shown = config.perTicker[ticker] ?? best;
                        const models: ModelOption[] = d
                            ? Object.entries(d.predictions).map(([key, p]) => ({
                                  key,
                                  accuracy: getAccuracy(p),
                                  available: p.available,
                                  reason: p.reason,
                              }))
                            : [];

                        return (
                            <ExpandableCard
                                key={ticker}
                                title={ticker}
                                subtitle={
                                    d
                                        ? `Elegido: ${shown ?? '—'}${
                                              shown && shown === best
                                                  ? ' (mejor)'
                                                  : ''
                                          }`
                                        : 'No pudimos cargar los modelos'
                                }
                                expanded={expanded.has(ticker)}
                                onToggle={() => toggleExpanded(ticker)}
                                dimmed={perTickerDisabled}
                            >
                                <ModelList
                                    groupName={`model-${ticker}`}
                                    models={models}
                                    value={shown}
                                    onChange={(m) =>
                                        update({
                                            perTicker: {
                                                ...config.perTicker,
                                                [ticker]: m,
                                            },
                                        })
                                    }
                                    disabled={perTickerDisabled}
                                />
                            </ExpandableCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default DefaultModelsSettings;
