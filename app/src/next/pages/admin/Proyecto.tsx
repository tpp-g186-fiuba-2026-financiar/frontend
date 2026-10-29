import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHead, PageHead } from '../../ui/Blocks';
import PatronesDiseno from './PatronesDiseno';
import ServiciosPorDentro from './ServiciosPorDentro';
import {
    DIA,
    ENTRENAMIENTOS,
    PASOS,
    SECUENCIA,
    SEQ_ACTORES,
    VALIDACION,
} from './proyectoData';

type Tab =
    | 'recorrido'
    | 'entrenamiento'
    | 'datos'
    | 'prediccion'
    | 'servicios'
    | 'patrones';

const TABS: Array<[Tab, string]> = [
    ['recorrido', 'Recorrido'],
    ['entrenamiento', 'Entrenamiento'],
    ['datos', 'División de datos'],
    ['prediccion', 'Qué pasa al predecir'],
    ['servicios', 'Servicios por dentro'],
    ['patrones', 'Patrones de diseño'],
];

export default function Proyecto() {
    const [tab, setTab] = useState<Tab>('recorrido');
    return (
        <>
            <PageHead
                eyebrow="Administración · De punta a punta"
                title="Cómo está hecho FinanciAr"
                sub="Desde que se baja una vela hasta que aparece una señal en pantalla: cómo se entrena cada modelo, cada cuánto, con qué datos, cómo se valida y qué pasa en cada pedido."
            />
            <div className="nx-seg nx-pj-tabs" role="tablist">
                {TABS.map(([k, label]) => (
                    <button
                        key={k}
                        type="button"
                        role="tab"
                        aria-selected={tab === k}
                        aria-pressed={tab === k}
                        onClick={() => setTab(k)}
                    >
                        {label}
                    </button>
                ))}
            </div>
            {tab === 'recorrido' && <Recorrido />}
            {tab === 'entrenamiento' && <Entrenamiento />}
            {tab === 'datos' && <Datos />}
            {tab === 'prediccion' && <Prediccion />}
            {tab === 'servicios' && <ServiciosPorDentro />}
            {tab === 'patrones' && <Patrones />}
        </>
    );
}

function Recorrido() {
    return (
        <div className="nx-grid">
            <Card span="s12" i={0}>
                <CardHead
                    title="El recorrido de un dato"
                    hint="Seis etapas. Las tres primeras pasan fuera de horario (crons); las otras, cuando alguien abre la web."
                />
                <ol className="nx-pj-steps">
                    {PASOS.map((p, k) => (
                        <li key={p.t}>
                            <span className="n">{k + 1}</span>
                            <div>
                                <b>{p.t}</b>
                                <small>{p.quien}</small>
                                <p>{p.d}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </Card>
            <Card span="s12" i={1}>
                <CardHead
                    title="Un día hábil, hora de Buenos Aires"
                    hint="BYMA cierra a las 17. Todo lo que entrena o precalcula corre después del cierre."
                />
                <div className="nx-pj-day">
                    {DIA.map((d) => (
                        <div key={d.h + d.t} className={`it k-${d.k}`}>
                            <code>{d.h}</code>
                            <div>
                                <b>{d.t}</b>
                                <small>{d.d}</small>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            <Card span="s12" i={2}>
                <p className="nx-muted" style={{ margin: 0, fontSize: 13 }}>
                    Para el detalle de cada pieza:{' '}
                    <Link to="/admin/arquitectura">Arquitectura</Link>{' '}
                    (servicios y endpoints),{' '}
                    <Link to="/admin/fichas">cada modelo</Link>,{' '}
                    <Link to="/admin/black-litterman">
                        cómo se arma la cartera
                    </Link>
                    , <Link to="/admin/decisiones">decisiones</Link> y{' '}
                    <Link to="/admin/confiabilidad">confiabilidad</Link>.
                </p>
            </Card>
        </div>
    );
}

function Entrenamiento() {
    return (
        <div className="nx-grid">
            <Card span="s12" i={0}>
                <CardHead
                    title="Quién entrena qué, cuándo y cómo"
                    hint="El entrenamiento es automático: GitHub Actions (api-ml) y Modal (repo models) lo programan. Un modelo nuevo reemplaza al vigente solo si pasa su control."
                />
                <div className="nx-pj-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Modelo</th>
                                <th>Dónde / mediante qué</th>
                                <th>Cada cuánto</th>
                                <th>Datos</th>
                                <th>Cuándo se acepta el nuevo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ENTRENAMIENTOS.map((e) => (
                                <tr key={e.modelo}>
                                    <td>
                                        <b>{e.modelo}</b>
                                        <small>{e.algo}</small>
                                    </td>
                                    <td>
                                        {e.donde}
                                        <small>
                                            <code>{e.archivo}</code>
                                        </small>
                                    </td>
                                    <td>{e.cuando}</td>
                                    <td>{e.datos}</td>
                                    <td>{e.gate}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Card span="s6" i={1}>
                <CardHead title="El control de promoción (champion / challenger)" />
                <ol className="nx-pj-list">
                    <li>
                        El cron entrena un modelo candidato con los datos hasta
                        ayer.
                    </li>
                    <li>
                        Lo mide sobre datos que no vio: accuracy direccional
                        walk-forward en las últimas 60 ruedas (LSTM,
                        Transformer), AUC fuera de muestra (XGBoost, Contexto) o
                        IC (Transformer V2).
                    </li>
                    <li>
                        Si no le gana al vigente (o no supera el piso, ej. AUC ≥
                        0,52), se descarta y queda el de antes. Si gana, se
                        guarda el artefacto y su puntaje (
                        <code>*.score.json</code>).
                    </li>
                    <li>
                        En api-ml el bot hace commit de <code>models/</code>;
                        Render redespliega y el modelo nuevo carga al arrancar.
                        En Modal se guarda en un volumen y lo lee el endpoint.
                    </li>
                </ol>
            </Card>
            <Card span="s6" i={2}>
                <CardHead title="Criterios de frecuencia" />
                <ul className="nx-pj-list">
                    <li>
                        Un modelo reentrenado no es mejor por ser más nuevo: con
                        datos ruidosos un reentreno puede salir peor, y el
                        control evita que empeore solo.
                    </li>
                    <li>
                        Los modelos de panel (XGBoost, Contexto, Macro,
                        Transformer V2) se reentrenan una vez por mes: cambian
                        poco día a día y entrenarlos cuesta más.
                    </li>
                    <li>
                        LSTM y Transformer v1 son chicos y se reentrenan todos
                        los días hábiles.
                    </li>
                    <li>
                        ARIMA no tiene artefacto: se ajusta al vuelo con la
                        serie de esa acción en cada pedido.
                    </li>
                </ul>
            </Card>
        </div>
    );
}

function Datos() {
    return (
        <div className="nx-grid">
            <Card span="s12" i={0}>
                <CardHead
                    title="Walk-forward con purga (XGBoost, Contexto, Macro)"
                    hint="Las fechas se cortan en orden, nunca al azar: el modelo siempre se mide sobre días posteriores a los que vio."
                />
                <WalkForward />
                <div className="nx-pj-legend">
                    <span className="tr">entrena</span>
                    <span className="pu">
                        purga ({'='} horizonte, 20 ruedas)
                    </span>
                    <span className="te">mide</span>
                </div>
            </Card>
            {VALIDACION.map((v, k) => (
                <Card key={v.t} span="s6" i={k + 1}>
                    <CardHead title={v.t} />
                    <p className="nx-pj-p">{v.d}</p>
                </Card>
            ))}
        </div>
    );
}

function WalkForward() {
    const W = 900;
    const x0 = 120;
    const span = W - x0 - 20;
    const first = 0.75;
    const folds = 4;
    const purge = 0.02;
    const rows = Array.from({ length: folds }, (_, k) => {
        const start = first + ((1 - first) * k) / folds;
        const end = first + ((1 - first) * (k + 1)) / folds;
        return { start, end };
    });
    const X = (f: number) => x0 + f * span;
    return (
        <div style={{ overflowX: 'auto' }}>
            <svg
                className="nx-pj-wf"
                viewBox={`0 0 ${W} ${40 + folds * 34 + 40}`}
                style={{ minWidth: 560 }}
                role="img"
                aria-label="Esquema de división walk-forward en 4 tramos con purga"
            >
                <text className="ax" x={X(0)} y={18}>
                    2016
                </text>
                <text className="ax" x={X(first)} y={18} textAnchor="middle">
                    75% de las fechas
                </text>
                <text className="ax" x={X(1)} y={18} textAnchor="end">
                    hoy
                </text>
                {rows.map((r, k) => {
                    const y = 34 + k * 34;
                    return (
                        <g key={k}>
                            <text className="lb" x={10} y={y + 15}>
                                tramo {k + 1}
                            </text>
                            <rect
                                className="tr"
                                x={X(0)}
                                y={y}
                                width={X(r.start - purge) - X(0)}
                                height={20}
                                rx={4}
                            />
                            <rect
                                className="pu"
                                x={X(r.start - purge)}
                                y={y}
                                width={X(r.start) - X(r.start - purge)}
                                height={20}
                            />
                            <rect
                                className="te"
                                x={X(r.start)}
                                y={y}
                                width={X(r.end) - X(r.start)}
                                height={20}
                                rx={4}
                            />
                        </g>
                    );
                })}
                <text className="ax" x={X(0)} y={40 + folds * 34 + 12}>
                    Las predicciones de los 4 tramos juntas dan las métricas
                    fuera de muestra (AUC, % de aciertos de alza y baja)
                </text>
                <text className="ax" x={X(0)} y={40 + folds * 34 + 28}>
                    y calibran los cortes de la señal.
                </text>
            </svg>
        </div>
    );
}

function Prediccion() {
    const actores = SEQ_ACTORES;
    const W = 980;
    const colW = (W - 40) / actores.length;
    const xOf = (id: string) =>
        20 + colW * (actores.findIndex((a) => a.id === id) + 0.5);
    const top = 64;
    const step = 46;
    const H = top + SECUENCIA.length * step + 30;
    return (
        <div className="nx-grid">
            <Card span="s12 nx-pj-seqcard" i={0}>
                <CardHead
                    title="Diagrama de secuencia: abrir el comparador de una acción"
                    hint="Pantalla Análisis de acción → GET /user/shares/{ticker}/trends/compare. Las flechas punteadas son respuestas; las grises, atajos de caché."
                />
                <div style={{ overflowX: 'auto' }}>
                    <svg
                        className="nx-pj-seq"
                        viewBox={`0 0 ${W} ${H}`}
                        style={{ minWidth: 760 }}
                        role="img"
                        aria-label="Diagrama de secuencia de una predicción"
                    >
                        <defs>
                            <marker
                                id="nx-pj-arr"
                                viewBox="0 0 10 10"
                                refX="9"
                                refY="5"
                                markerWidth="7"
                                markerHeight="7"
                                orient="auto-start-reverse"
                            >
                                <path d="M0,0L10,5L0,10z" className="hd" />
                            </marker>
                        </defs>
                        {actores.map((a) => {
                            const x = xOf(a.id);
                            return (
                                <g key={a.id}>
                                    <rect
                                        className="box"
                                        x={x - colW / 2 + 8}
                                        y={8}
                                        width={colW - 16}
                                        height={40}
                                        rx={10}
                                    />
                                    <text
                                        className="t"
                                        x={x}
                                        y={26}
                                        textAnchor="middle"
                                    >
                                        {a.t}
                                    </text>
                                    <text
                                        className="s"
                                        x={x}
                                        y={41}
                                        textAnchor="middle"
                                    >
                                        {a.s}
                                    </text>
                                    <line
                                        className="life"
                                        x1={x}
                                        y1={48}
                                        x2={x}
                                        y2={H - 10}
                                    />
                                </g>
                            );
                        })}
                        {SECUENCIA.map((m, k) => {
                            const y = top + k * step + 16;
                            const x1 = xOf(m.de);
                            const x2 = xOf(m.a);
                            const self = m.de === m.a;
                            const cls = `msg ${m.tipo ?? ''}`;
                            const lx = self ? x1 + 12 : (x1 + x2) / 2;
                            return (
                                <g key={k} className={cls}>
                                    {self ? (
                                        <path
                                            d={`M${x1},${y - 8}h34v16h-32`}
                                            markerEnd="url(#nx-pj-arr)"
                                        />
                                    ) : (
                                        <line
                                            x1={x1}
                                            y1={y}
                                            x2={x2 + (x2 > x1 ? -3 : 3)}
                                            y2={y}
                                            markerEnd="url(#nx-pj-arr)"
                                        />
                                    )}
                                    <text
                                        className="lbl"
                                        x={self ? x1 + 42 : lx}
                                        y={self ? y + 4 : y - 7}
                                        textAnchor={self ? 'start' : 'middle'}
                                    >
                                        {k + 1}. {m.t}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </Card>
            <Card span="s12" i={1}>
                <CardHead title="Paso a paso" />
                <ol className="nx-pj-list">
                    {SECUENCIA.map((m, k) => (
                        <li key={k}>
                            <b>{m.t}.</b> {m.d}
                        </li>
                    ))}
                </ol>
            </Card>
            <Card span="s6" i={2}>
                <CardHead title="Dónde está el costo de una predicción" />
                <p className="nx-pj-p">
                    Correr un modelo ya entrenado tarda milisegundos (XGBoost
                    unos 2 s la primera vez, porque arma el ranking de las 20
                    líderes). Lo caro es conseguir los datos: el histórico de la
                    acción y, para los modelos de panel, el de las 20 líderes.
                    Por eso hay caché en cada capa y el snapshot de las 18 hs:
                    el primer pedido del día paga la descarga, el resto sale de
                    memoria o de la base.
                </p>
            </Card>
            <Card span="s6" i={3}>
                <CardHead title="Tolerancia a la caída del data-colector" />
                <p className="nx-pj-p">
                    api-ml le da 5 s para conectar y 15 s para responder. Si no
                    contesta, no le vuelve a pegar por 5 minutos (circuit
                    breaker) y baja el histórico directo de Yahoo. Así, con el
                    colector caído, el primer compare tarda ~30 s y los
                    siguientes menos de 1 s. Solo el modelo Macro queda sin
                    responder, porque sus series (CCL, riesgo país, BADLAR) solo
                    las tiene el colector.
                </p>
            </Card>
        </div>
    );
}

function Patrones() {
    return <PatronesDiseno />;
}
