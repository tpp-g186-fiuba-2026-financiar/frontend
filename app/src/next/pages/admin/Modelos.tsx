import { useEffect, useState } from 'react';
import { useRemote } from '../../data/useRemote';
import {
    hiddenModels,
    hideModelEndpoint,
    showModelEndpoint,
} from '../../../api/hiddenModels';
import { getAdminModelsEndpoint } from '../../../api/next/endpoints';
import { Card, CardHead, Empty, PageHead, Tip } from '../../ui/Blocks';
import { longDate, num, pct1 } from '../../format';
import { MODEL_KEYS, modelFullLabel, modelLabel } from '../../finance';

const ARCH: Record<string, string> = {
    ensemble: 'Promedio de los modelos',
    lstm: 'Red recurrente LSTM sobre ventanas de precios',
    xgboost: 'Árboles de gradiente con precio + contexto macro',
    transformer: 'Transformer con atención sobre la serie',
    arima: 'Modelo estadístico ARIMA, ajustado a demanda',
    contexto: 'Regresión con variables del mercado argentino',
};

const OOS_LABEL: Record<string, string> = {
    oos_auc: 'AUC',
    oos_up_rate: 'Veces que subió (base)',
    oos_alza_hit_rate: 'Acierto de señales de alza',
    oos_baja_hit_rate: 'Acierto de señales de baja',
    oos_samples: 'Casos evaluados',
    oos_alza_samples: 'Señales de alza',
    oos_baja_samples: 'Señales de baja',
};

function fmtMetric(key: string, v: number): string {
    if (key.endsWith('samples')) return Math.round(v).toLocaleString('es-AR');
    if (key.endsWith('rate')) return pct1(v * 100);
    return num(v, 3);
}

/** El admin elige que modelos ven los usuarios (los ocultos no aparecen en ninguna pantalla). */
function VisibleModels() {
    const [hidden, setHidden] = useState<Set<string> | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        let vivo = true;
        hiddenModels().then((h) => vivo && setHidden(new Set(h)));
        return () => {
            vivo = false;
        };
    }, []);
    const keys = [...new Set([...MODEL_KEYS, ...(hidden ?? [])])];

    const toggle = async (key: string) => {
        if (!hidden) return;
        setBusy(key);
        setError(false);
        try {
            const list = hidden.has(key)
                ? await showModelEndpoint(key)
                : await hideModelEndpoint(key);
            setHidden(new Set(list));
        } catch {
            setError(true);
        } finally {
            setBusy(null);
        }
    };

    return (
        <Card i={0}>
            <CardHead
                title="Qué modelos ven los usuarios"
                hint="Apagá un modelo para ocultarlo en todas las pantallas (señal, gráfico, historial, ajustes). No se borra nada: lo podés volver a prender."
            />
            {!hidden ? (
                <Empty>Cargando…</Empty>
            ) : (
                <div className="nx-visible-models">
                    {keys.map((key) => {
                        const on = !hidden.has(key);
                        return (
                            <label key={key} className={on ? '' : 'off'}>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={on}
                                    aria-label={`Mostrar ${modelFullLabel(key)}`}
                                    className="nx-switch"
                                    disabled={busy === key}
                                    onClick={() => toggle(key)}
                                />
                                <span>
                                    <b>{modelFullLabel(key)}</b>
                                    <small>{on ? 'visible' : 'oculto'}</small>
                                </span>
                            </label>
                        );
                    })}
                </div>
            )}
            {error && (
                <p className="nx-why" role="alert">
                    No se pudo guardar el cambio. Probá de nuevo.
                </p>
            )}
        </Card>
    );
}

export default function Modelos() {
    const diag = useRemote('admin-models', getAdminModelsEndpoint);
    const results = Object.entries(diag.data?.results ?? {});
    const oos = Object.entries(diag.data?.xgboost_oos ?? {}).filter(
        ([k]) => !k.endsWith('disabled'),
    );

    return (
        <>
            <PageHead
                eyebrow="Administración · Modelos"
                title="Diagnóstico de los modelos"
                sub="Métricas técnicas de la evaluación walk-forward. Solo para administradores."
            />
            {diag.loading && <Empty>Cargando métricas…</Empty>}
            {diag.error && (
                <Empty>No se pudieron leer las métricas de los modelos.</Empty>
            )}
            <div className="nx-grid">
                <VisibleModels />
                {results.length > 0 && (
                    <Card i={1}>
                        <CardHead
                            title="Estado de cada modelo"
                            hint={
                                diag.data?.run_at
                                    ? `Última evaluación: ${longDate(diag.data.run_at)}`
                                    : undefined
                            }
                        />
                        <div className="nx-table-wrap">
                            <table className="nx-table">
                                <thead>
                                    <tr>
                                        <th>Modelo</th>
                                        <th>Arquitectura</th>
                                        <th className="r">Predicciones</th>
                                        <th className="r">
                                            Accuracy <Tip k="accuracy" />
                                        </th>
                                        <th className="r">
                                            Acierto de señales
                                        </th>
                                        <th className="r">Neutrales</th>
                                        <th className="r">MAE (log)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map(([k, r]) => {
                                        const o = r.overall ?? {};
                                        return (
                                            <tr
                                                key={k}
                                                style={{ cursor: 'default' }}
                                            >
                                                <td>
                                                    <b className="nx-ink">
                                                        {k === 'ensemble'
                                                            ? 'Todos juntos'
                                                            : modelLabel(k)}
                                                    </b>
                                                </td>
                                                <td className="nx-muted">
                                                    {ARCH[k] ?? '—'}
                                                </td>
                                                <td className="r nx-mono">
                                                    {o.n_predictions ?? '—'}
                                                </td>
                                                <td className="r nx-mono nx-ink">
                                                    {o.directional_accuracy !=
                                                    null
                                                        ? pct1(
                                                              o.directional_accuracy *
                                                                  100,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td className="r nx-mono">
                                                    {o.signal_hit_rate != null
                                                        ? pct1(
                                                              o.signal_hit_rate *
                                                                  100,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td className="r nx-mono">
                                                    {o.neutral_rate != null
                                                        ? pct1(
                                                              o.neutral_rate *
                                                                  100,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td className="r nx-mono">
                                                    {o.mae_logret != null
                                                        ? num(o.mae_logret, 4)
                                                        : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
                <Card span="s7" i={2}>
                    <CardHead
                        title="Esquema walk-forward"
                        hint="Entrenamiento que crece con el tiempo, prueba sobre el período siguiente y una pausa en el medio para que no se filtre información del futuro"
                        right={
                            <div className="nx-legend">
                                <span>
                                    <i
                                        style={{
                                            background: 'var(--nx-accent)',
                                            opacity: 0.5,
                                        }}
                                    />
                                    Entrena
                                </span>
                                <span>
                                    <i
                                        style={{ background: 'var(--nx-warn)' }}
                                    />
                                    Pausa
                                </span>
                                <span>
                                    <i
                                        style={{
                                            background: 'var(--nx-accent-2)',
                                        }}
                                    />
                                    Prueba
                                </span>
                            </div>
                        }
                    />
                    {Array.from({ length: 8 }, (_, k) => {
                        const tr = 40 + k * 7;
                        const delay = { animationDelay: `${k * 90}ms` };
                        return (
                            <div className="nx-fold" key={k}>
                                <span>fold {k + 1}</span>
                                <div className="nx-fold-track">
                                    <i
                                        style={{
                                            ...delay,
                                            left: 0,
                                            width: `${tr}%`,
                                            background:
                                                'color-mix(in oklab, var(--nx-accent) 45%, transparent)',
                                        }}
                                    />
                                    <i
                                        style={{
                                            ...delay,
                                            left: `${tr + 0.5}%`,
                                            width: '1.2%',
                                            background: 'var(--nx-warn)',
                                        }}
                                    />
                                    <i
                                        style={{
                                            ...delay,
                                            left: `${tr + 2.2}%`,
                                            width: '6%',
                                            background: 'var(--nx-accent-2)',
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </Card>
                <Card span="s5" i={3}>
                    <CardHead
                        title="XGBoost fuera de muestra"
                        hint="Métricas del artefacto entrenado, medidas sobre datos que no vio"
                    />
                    {oos.length ? (
                        <div className="nx-stat-grid">
                            {oos.map(([k, v]) => (
                                <div className="nx-stat" key={k}>
                                    <div className="k">
                                        {OOS_LABEL[k] ?? k.replace(/_/g, ' ')}
                                    </div>
                                    <div className="v">{fmtMetric(k, v)}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Empty>Sin métricas del artefacto.</Empty>
                    )}
                </Card>
            </div>
        </>
    );
}
