import { useState } from 'react';
import { Card, CardHead, PageHead } from '../../ui/Blocks';
import { FICHAS, type Ficha } from './fichasData';

const ESTADO: Record<Ficha['estado'], string> = {
    principal: 'principal',
    activo: 'activo',
    débil: 'débil (casi azar)',
    oculto: 'oculto a los usuarios',
};

export default function Fichas() {
    const [sel, setSel] = useState(FICHAS[0].key);
    const f = FICHAS.find((x) => x.key === sel) ?? FICHAS[0];

    return (
        <>
            <PageHead
                eyebrow="Administración · Cómo funciona cada modelo"
                title="Qué usa y cómo decide cada modelo"
                sub="Qué predice, con qué datos y variables, cómo arma la señal, cada cuánto se entrena y qué tan bien anduvo. Tocá una fila."
            />
            <div className="nx-grid">
                <Card span="s12" i={1}>
                    <CardHead
                        title="Todos los modelos"
                        hint="Medido con datos que el modelo no vio al entrenar (walk-forward) o en vivo (paper trading)."
                    />
                    <div className="nx-table-wrap">
                        <table className="nx-table nx-fichas">
                            <thead>
                                <tr>
                                    <th>Modelo</th>
                                    <th>Predice</th>
                                    <th>Plazo</th>
                                    <th>Algoritmo</th>
                                    <th>Corre en</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {FICHAS.map((x) => (
                                    <tr
                                        key={x.key}
                                        className={`click ${x.key === sel ? 'sel' : ''}`}
                                        onClick={() => setSel(x.key)}
                                        tabIndex={0}
                                        onKeyDown={(e) =>
                                            e.key === 'Enter' && setSel(x.key)
                                        }
                                        aria-label={`Ver ${x.nombre}`}
                                    >
                                        <td>
                                            <b className="nx-ink">{x.nombre}</b>
                                        </td>
                                        <td>{x.tipo}</td>
                                        <td className="nx-mono">{x.plazo}</td>
                                        <td>{x.algoritmo.split(/[.(:]/)[0]}</td>
                                        <td>{x.corre}</td>
                                        <td>
                                            <span
                                                className={`nx-ficha-estado e-${x.estado === 'débil' ? 'debil' : x.estado}`}
                                            >
                                                {ESTADO[x.estado]}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
                <Card span="s12" i={2} className="nx-ficha">
                    <div className="nx-eyebrow">
                        {f.tipo} · {f.plazo} · {f.corre}
                    </div>
                    <h2>{f.nombre}</h2>
                    <div className="nx-ficha-grid">
                        <section>
                            <h4>Qué predice</h4>
                            <p>{f.predice}</p>
                            <h4>Algoritmo</h4>
                            <p>{f.algoritmo}</p>
                            <h4>Datos que usa</h4>
                            <ul>
                                {f.datos.map((d) => (
                                    <li key={d}>{d}</li>
                                ))}
                            </ul>
                        </section>
                        <section>
                            <h4>Variables (features)</h4>
                            {f.variables.map((v) => (
                                <div key={v.grupo} className="nx-ficha-var">
                                    <b>
                                        {v.grupo}
                                        {v.cuantas != null && (
                                            <span className="nx-mono">
                                                {' '}
                                                · {v.cuantas}
                                            </span>
                                        )}
                                    </b>
                                    <p>{v.ejemplos}</p>
                                </div>
                            ))}
                        </section>
                        <section>
                            <h4>Cómo arma la señal</h4>
                            <p>{f.senal}</p>
                            <h4>Entrenamiento</h4>
                            <p>{f.entrenamiento}</p>
                            <h4>Qué tan bien anduvo</h4>
                            <p className="nx-ficha-medido">{f.medido}</p>
                        </section>
                    </div>
                </Card>
            </div>
        </>
    );
}
