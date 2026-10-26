import { useState } from 'react';
import { Card, PageHead } from '../../ui/Blocks';
import { DECISIONES, type Decision } from './fichasData';

const TAGS: Array<[Decision['tag'] | 'todas', string]> = [
    ['todas', 'Todas'],
    ['modelos', 'Modelos'],
    ['señal', 'Señal'],
    ['cartera', 'Cartera'],
    ['datos', 'Datos'],
    ['producto', 'Producto'],
];

export default function Decisiones() {
    const [tag, setTag] = useState<Decision['tag'] | 'todas'>('todas');
    const lista = DECISIONES.filter((d) => tag === 'todas' || d.tag === tag);

    return (
        <>
            <PageHead
                eyebrow="Administración · Decisiones"
                title="Qué decidimos y por qué"
                sub="Cada decisión de diseño con el problema que resolvía, qué probamos y los números que la respaldan."
            />
            <div className="nx-chips" style={{ marginBottom: 14 }}>
                {TAGS.map(([k, label]) => (
                    <button
                        key={k}
                        type="button"
                        aria-pressed={tag === k}
                        onClick={() => setTag(k)}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <div className="nx-grid">
                {lista.map((d, i) => (
                    <Card key={d.titulo} span="s6" i={i % 6}>
                        <div className="nx-decision">
                            <div className="nx-decision-head">
                                <span className="nx-mono nx-muted">
                                    {d.fecha}
                                </span>
                                <span className="nx-decision-tag">{d.tag}</span>
                            </div>
                            <h3>{d.titulo}</h3>
                            <dl>
                                <dt>Problema</dt>
                                <dd>{d.problema}</dd>
                                {d.probamos !== '—' && (
                                    <>
                                        <dt>Qué probamos</dt>
                                        <dd>{d.probamos}</dd>
                                    </>
                                )}
                                <dt>Decisión</dt>
                                <dd className="nx-ink">{d.decision}</dd>
                                <dt>Evidencia</dt>
                                <dd className="nx-decision-ev">
                                    {d.evidencia}
                                </dd>
                            </dl>
                        </div>
                    </Card>
                ))}
            </div>
        </>
    );
}
