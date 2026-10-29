// Pestaña "Patrones de diseño" de De punta a punta: cada patrón con un
// diagrama interactivo y sus usos en cada servicio (patronesUsos.ts).
// Los nombres de clases, rutas y campos son los reales del código.

import { useState, type ReactNode } from 'react';
import { Card } from '../../ui/Blocks';
import { USOS, type Uso } from './patronesUsos';

type Clave = 'strategy' | 'adapter' | 'composite' | 'factory' | 'micro';

const LISTA: Array<[Clave, string, string]> = [
    ['strategy', 'Strategy', 'Comportamiento'],
    ['adapter', 'Adapter', 'Estructural'],
    ['composite', 'Composite', 'Estructural'],
    ['factory', 'Factory', 'Creacional'],
    ['micro', 'Microservicios', 'Arquitectura'],
];

export default function PatronesDiseno() {
    const [sel, setSel] = useState<Clave>('strategy');
    return (
        <>
            <p className="nx-pt-intro">
                FinanciAr aplica cuatro patrones de diseño (Strategy, Adapter,
                Composite y Factory) en sus cuatro servicios, y está organizado
                como una arquitectura de microservicios. Cada patrón tiene un
                diagrama interactivo y, abajo, dónde se usa en cada servicio con
                el código real.
            </p>
            <div className="nx-pt-picker" role="tablist">
                {LISTA.map(([k, nombre, familia]) => (
                    <button
                        key={k}
                        type="button"
                        role="tab"
                        aria-selected={sel === k}
                        onClick={() => setSel(k)}
                    >
                        <small>{familia}</small>
                        {nombre}
                    </button>
                ))}
            </div>
            {sel === 'strategy' && <Strategy />}
            {sel === 'adapter' && <Adapter />}
            {sel === 'composite' && <Composite />}
            {sel === 'factory' && <Factory />}
            {sel === 'micro' && <Microservicios />}
        </>
    );
}

function Patron({
    nombre,
    problema,
    solucion,
    diagrama,
    usos,
}: {
    nombre: string;
    problema: string;
    solucion: string;
    diagrama: ReactNode;
    usos: Uso[];
}) {
    const [i, setI] = useState(0);
    const uso = usos[Math.min(i, usos.length - 1)];
    return (
        <div className="nx-grid">
            <Card span="s12" i={0}>
                <div className="nx-pt-ps">
                    <div>
                        <span className="nx-eyebrow">El problema</span>
                        <p>{problema}</p>
                    </div>
                    <span className="arrow" aria-hidden>
                        →
                    </span>
                    <div>
                        <span className="nx-eyebrow">
                            Cómo lo resuelve {nombre}
                        </span>
                        <p>{solucion}</p>
                    </div>
                </div>
            </Card>
            <Card span="s12" i={1}>
                {diagrama}
            </Card>
            <Card span="s12" i={2}>
                <span className="nx-eyebrow">Dónde lo usamos</span>
                <div
                    className="nx-pt-usos"
                    role="tablist"
                    aria-label={`Usos de ${nombre}`}
                >
                    {usos.map((u, k) => (
                        <button
                            key={u.servicio + u.titulo}
                            type="button"
                            role="tab"
                            aria-selected={uso === u}
                            onClick={() => setI(k)}
                        >
                            <small>{u.servicio}</small>
                            {u.titulo}
                        </button>
                    ))}
                </div>
                <div className="nx-pt-uso" key={uso.titulo}>
                    <div>
                        <p>{uso.que}</p>
                        <code className="file">{uso.archivo}</code>
                    </div>
                    <pre className="nx-pt-code">{uso.codigo}</pre>
                </div>
            </Card>
        </div>
    );
}

// ------------------------------------------------------------------ Strategy

const ESTRATEGIAS: Array<{
    id: string;
    clase: string;
    como: string;
    salida: [string, string, string];
}> = [
    {
        id: 'lstm',
        clase: 'TrendModel',
        como: 'red LSTM sobre una ventana de 30 ruedas',
        salida: ['neutral', '5', '8.412'],
    },
    {
        id: 'xgboost',
        clase: 'XGBTrendModel',
        como: 'árboles de gradiente + ranking contra las 20 líderes',
        salida: ['alza', '20', '8.910'],
    },
    {
        id: 'transformer',
        clase: 'TransformerTrendModel',
        como: 'encoder con atención sobre la ventana',
        salida: ['neutral', '5', '8.380'],
    },
    {
        id: 'contexto',
        clase: 'ContextTrendModel',
        como: 'HistGradientBoosting con contexto de mercado',
        salida: ['baja', '20', '8.020'],
    },
    {
        id: 'arima',
        clase: 'ArimaTrendModel',
        como: 'ARIMA ajustado al vuelo con el precio',
        salida: ['neutral', '5', '8.401'],
    },
];

function Strategy() {
    const [elegido, setElegido] = useState(1);
    const e = ESTRATEGIAS[elegido];
    const yImpl = (k: number) => 18 + k * 56;
    return (
        <Patron
            nombre="Strategy"
            problema="El sistema tiene varias formas intercambiables de hacer lo mismo: 8 modelos que predicen, 3 fuentes de tasas de interés y un modelo distinto por acción según lo que elige cada usuario. Con un if por variante, cada caso nuevo obligaría a tocar todo el código que las usa."
            solucion="Cada variante cumple el mismo contrato y el código que la usa la elige por nombre en tiempo de ejecución. En api-ml el contrato es TrendPredictor (predict_df y version): el diagrama muestra cómo el registry cambia de modelo sin cambiar nada más."
            diagrama={
                <div>
                    <div className="nx-pt-dhead">
                        <b>Tocá un modelo:</b> cambia la estrategia, el resto
                        del código no.
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <svg
                            className="nx-pt-svg"
                            viewBox="0 0 720 300"
                            style={{ minWidth: 600 }}
                            role="img"
                            aria-label="Diagrama del patrón Strategy"
                        >
                            <g className="box client">
                                <rect
                                    x={10}
                                    y={115}
                                    width={160}
                                    height={70}
                                    rx={10}
                                />
                                <text
                                    x={90}
                                    y={140}
                                    textAnchor="middle"
                                    className="t"
                                >
                                    TrendRegistry
                                </text>
                                <text
                                    x={90}
                                    y={158}
                                    textAnchor="middle"
                                    className="s"
                                >
                                    compare(ticker)
                                </text>
                                <text
                                    x={90}
                                    y={173}
                                    textAnchor="middle"
                                    className="s"
                                >
                                    consensus · paper trading
                                </text>
                            </g>
                            <g className="box iface">
                                <rect
                                    x={240}
                                    y={105}
                                    width={190}
                                    height={90}
                                    rx={10}
                                />
                                <text
                                    x={335}
                                    y={128}
                                    textAnchor="middle"
                                    className="s"
                                >
                                    «interfaz»
                                </text>
                                <text
                                    x={335}
                                    y={147}
                                    textAnchor="middle"
                                    className="t"
                                >
                                    TrendPredictor
                                </text>
                                <line x1={252} y1={156} x2={418} y2={156} />
                                <text
                                    x={335}
                                    y={172}
                                    textAnchor="middle"
                                    className="s"
                                >
                                    predict_df(df) → dict
                                </text>
                                <text
                                    x={335}
                                    y={187}
                                    textAnchor="middle"
                                    className="s"
                                >
                                    version: str
                                </text>
                            </g>
                            <path
                                id="nx-pt-s1"
                                className="flow on"
                                d="M170,150 L240,150"
                            />
                            {ESTRATEGIAS.map((s, k) => {
                                const y = yImpl(k);
                                const on = k === elegido;
                                return (
                                    <g key={s.id}>
                                        <path
                                            id={`nx-pt-s2-${k}`}
                                            className={`flow impl ${on ? 'on' : ''}`}
                                            d={`M430,150 C480,150 480,${y + 22} 520,${y + 22}`}
                                        />
                                        <g
                                            className={`box pick ${on ? 'sel' : ''}`}
                                            onClick={() => setElegido(k)}
                                            role="button"
                                            aria-label={`Usar ${s.id}`}
                                        >
                                            <rect
                                                x={520}
                                                y={y}
                                                width={190}
                                                height={44}
                                                rx={9}
                                            />
                                            <text
                                                x={534}
                                                y={y + 19}
                                                className="t"
                                            >
                                                {s.id}
                                            </text>
                                            <text
                                                x={534}
                                                y={y + 35}
                                                className="s"
                                            >
                                                {s.clase}
                                            </text>
                                        </g>
                                    </g>
                                );
                            })}
                            <circle key={`a${elegido}`} r={5} className="dot">
                                <animateMotion dur="0.6s" fill="freeze">
                                    <mpath href="#nx-pt-s1" />
                                </animateMotion>
                            </circle>
                            <circle
                                key={`b${elegido}`}
                                r={5}
                                className="dot"
                                opacity={0}
                            >
                                <set
                                    attributeName="opacity"
                                    to="1"
                                    begin="0.6s"
                                />
                                <animateMotion
                                    dur="0.7s"
                                    begin="0.6s"
                                    fill="freeze"
                                >
                                    <mpath href={`#nx-pt-s2-${elegido}`} />
                                </animateMotion>
                            </circle>
                            <text
                                x={335}
                                y={225}
                                textAnchor="middle"
                                className="s"
                            >
                                cada modelo «implementa» la interfaz
                            </text>
                            <text
                                x={335}
                                y={241}
                                textAnchor="middle"
                                className="s"
                            >
                                y devuelve el mismo formato
                            </text>
                        </svg>
                    </div>
                    <div className="nx-pt-out" key={e.id}>
                        <div>
                            <small>Estrategia elegida</small>
                            <b>{e.id}</b>
                            <span>{e.como}</span>
                        </div>
                        <div>
                            <small>
                                Devuelve siempre las mismas claves (ejemplo)
                            </small>
                            <code>
                                {`{ signal: "${e.salida[0]}", horizon_days: ${e.salida[1]}, predicted_close: ${e.salida[2]}, rsi, condition, as_of, model_version }`}
                            </code>
                        </div>
                    </div>
                </div>
            }
            usos={USOS.strategy}
        />
    );
}

// ------------------------------------------------------------------- Adapter

const ADAPTACIONES: Record<
    'svm' | 'arima',
    {
        modelo: string;
        fn: string;
        entrada: string[];
        filas: Array<[string, string, string]>;
    }
> = {
    svm: {
        modelo: 'svm-modal',
        fn: 'translate_modal_svm_response',
        entrada: [
            '{',
            '  "prediction": "Buy",',
            '  "backtest": {...},',
            '  "model_version": "svm-…"',
            '}',
        ],
        filas: [
            ['prediction: "Buy"', 'signal: "alza"', 'Buy → alza, Sell → baja'],
            [
                '(no existe)',
                'horizon_days: 1',
                'el SVM predice el día siguiente',
            ],
            [
                '(no existe)',
                'predicted_close: null',
                'clasificador: no da precio',
            ],
            [
                '(no existe)',
                'condition: "indeterminado"',
                'sin cierres no hay RSI',
            ],
            ['(no existe)', 'as_of: hoy', 'Modal no manda la fecha'],
            ['backtest', 'backtest', 'se conserva para competir'],
        ],
    },
    arima: {
        modelo: 'arima-modal',
        fn: 'translate_modal_arima_response',
        entrada: [
            '{',
            '  "prediction": [8350, 8371, …],',
            '  "valor_actual": 8320,',
            '  "cant_predicciones": 5',
            '}',
        ],
        filas: [
            ['valor_actual', 'last_close', 'renombra'],
            [
                'prediction[-1]',
                'predicted_close',
                'último valor del pronóstico',
            ],
            [
                'log(pred / actual)',
                'signal',
                'alza / baja si pasa la banda de ±1%',
            ],
            ['cant_predicciones', 'horizon_days', 'renombra'],
            ['(no existe)', 'rsi: null', 'no manda el histórico'],
        ],
    },
};

function Adapter() {
    const [cual, setCual] = useState<'svm' | 'arima'>('svm');
    const [paso, setPaso] = useState(-1);
    const a = ADAPTACIONES[cual];
    const traducir = () => {
        setPaso(-1);
        a.filas.forEach((_, k) => setTimeout(() => setPaso(k), 120 + k * 260));
    };
    return (
        <Patron
            nombre="Adapter"
            problema="Los datos llegan de fuentes con formatos ajenos: cada modelo de Modal responde distinto, Yahoo, BYMA y Rava entregan las velas en estructuras diferentes, y el JWT trae claims que los handlers no deberían interpretar."
            solucion="Un adaptador por fuente convierte al formato interno antes de que el resto del código lo vea. El diagrama muestra el caso de Modal: RemoteTrendService aplica un traductor por modelo y entrega un TrendResponse igual al de los modelos locales."
            diagrama={
                <div>
                    <div className="nx-pt-dhead">
                        <div className="nx-seg">
                            {(['svm', 'arima'] as const).map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    aria-pressed={cual === k}
                                    onClick={() => {
                                        setCual(k);
                                        setPaso(-1);
                                    }}
                                >
                                    {ADAPTACIONES[k].modelo}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            className="nx-pt-btn"
                            onClick={traducir}
                        >
                            ▶ Traducir respuesta
                        </button>
                    </div>
                    <div className="nx-pt-adapter">
                        <div className="col">
                            <small>Lo que responde Modal ({a.modelo})</small>
                            <pre>{a.entrada.join('\n')}</pre>
                        </div>
                        <div className="mid">
                            <div className="gear" data-on={paso >= 0}>
                                <small>RemoteTrendService</small>
                                <b>{a.fn}()</b>
                                <span>
                                    call_modal → traducir → validar campos
                                </span>
                            </div>
                        </div>
                        <div className="col">
                            <small>
                                Lo que espera el comparador (TrendResponse)
                            </small>
                            <table>
                                <tbody>
                                    {a.filas.map(([de, a2, nota], k) => (
                                        <tr
                                            key={de + a2}
                                            className={paso >= k ? 'on' : ''}
                                        >
                                            <td>
                                                <code>{de}</code>
                                            </td>
                                            <td className="ar">→</td>
                                            <td>
                                                <code>{a2}</code>
                                                <small>{nota}</small>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            }
            usos={USOS.adapter}
        />
    );
}

// ----------------------------------------------------------------- Composite

const HOJAS: Array<{ id: string; ret: number }> = [
    { id: 'lstm', ret: 0.004 },
    { id: 'xgboost', ret: 0.031 },
    { id: 'transformer', ret: -0.006 },
];

const RUTAS: Array<{
    ruta: string;
    camino: string[];
    capas: string[];
    falla: string;
}> = [
    {
        ruta: 'POST /login',
        camino: ['root', 'publicas'],
        capas: [
            'CORS',
            'Sesión (tower-sessions)',
            'login_logic: argon2 + código 2FA',
        ],
        falla: 'Credenciales mal o falta el código TOTP → 401 con two_factor_required.',
    },
    {
        ruta: 'GET /shares',
        camino: ['root', 'publicas'],
        capas: ['CORS', 'Sesión (tower-sessions)', 'handler'],
        falla: 'Pública: no pide token.',
    },
    {
        ruta: 'GET /user',
        camino: ['root', 'protected', 'auth'],
        capas: [
            'CORS',
            'Sesión (tower-sessions)',
            'require_auth: valida el JWT',
            'handler',
        ],
        falla: 'Sin token o vencido → 401; el frontend borra la sesión y vuelve al inicio.',
    },
    {
        ruta: 'GET /user/shares/trends',
        camino: ['root', 'protected', 'perfil'],
        capas: [
            'CORS',
            'Sesión (tower-sessions)',
            'require_auth: valida el JWT',
            'require_profile: perfil de riesgo vigente',
            'handler',
        ],
        falla: 'Sin perfil o con más de un año → 403 RISK_PROFILE_REQUIRED / EXPIRED; el frontend abre el cuestionario.',
    },
    {
        ruta: 'GET /admin/health',
        camino: ['root', 'protected', 'admin'],
        capas: [
            'CORS',
            'Sesión (tower-sessions)',
            'require_auth: valida el JWT',
            'require_admin: role = admin en la base',
            'handler',
        ],
        falla: 'Usuario sin rol admin → 403.',
    },
    {
        ruta: 'GET /retro/api/board',
        camino: ['root', 'retro'],
        capas: ['CORS', 'Sesión (tower-sessions)', 'handler'],
        falla: 'Herramienta interna del equipo, sin JWT.',
    },
];

const NODOS: Record<string, { x: number; y: number; t: string; s: string }> = {
    root: { x: 390, y: 34, t: 'Router raíz', s: 'CORS · sesiones' },
    publicas: { x: 110, y: 134, t: 'normal_routes + /login', s: 'públicas' },
    retro: { x: 290, y: 134, t: 'retro_routes', s: 'retro del equipo' },
    protected: { x: 560, y: 134, t: 'protected', s: 'require_auth' },
    auth: { x: 400, y: 234, t: 'auth_only', s: 'cuenta, cartera, 2FA' },
    perfil: { x: 560, y: 234, t: 'profile_gated', s: 'require_profile' },
    admin: { x: 720, y: 234, t: 'admin_routes', s: 'require_admin' },
};
const ARISTAS: Array<[string, string]> = [
    ['root', 'publicas'],
    ['root', 'retro'],
    ['root', 'protected'],
    ['protected', 'auth'],
    ['protected', 'perfil'],
    ['protected', 'admin'],
];

function RouterDiagrama() {
    const [sel, setSel] = useState(3);
    const r = RUTAS[sel];
    const en = (k: string) => r.camino.includes(k);
    const W = 150;
    const H = 48;
    return (
        <div>
            <div className="nx-pt-dhead">
                <b>Elegí un pedido:</b> se marca el camino por el árbol de
                routers y las capas que atraviesa antes del handler.
            </div>
            <div className="nx-pt-routes">
                {RUTAS.map((x, k) => (
                    <button
                        key={x.ruta}
                        type="button"
                        aria-pressed={sel === k}
                        onClick={() => setSel(k)}
                    >
                        <code>{x.ruta}</code>
                    </button>
                ))}
            </div>
            <div style={{ overflowX: 'auto' }}>
                <svg
                    className="nx-pt-svg"
                    viewBox="0 0 800 280"
                    style={{ minWidth: 620 }}
                    role="img"
                    aria-label="Árbol de routers del backend"
                >
                    {ARISTAS.map(([a, b]) => {
                        const A = NODOS[a];
                        const B = NODOS[b];
                        const on = en(a) && en(b);
                        return (
                            <path
                                key={a + b}
                                className={`flow ${on ? 'impl on' : ''}`}
                                d={`M${A.x},${A.y + H / 2} C${A.x},${A.y + 60} ${B.x},${B.y - 50} ${B.x},${B.y - H / 2}`}
                            />
                        );
                    })}
                    {Object.entries(NODOS).map(([k, n]) => (
                        <g key={k} className={`box ${en(k) ? 'sel' : ''}`}>
                            <rect
                                x={n.x - W / 2}
                                y={n.y - H / 2}
                                width={W}
                                height={H}
                                rx={9}
                            />
                            <text
                                x={n.x}
                                y={n.y - 3}
                                textAnchor="middle"
                                className="t"
                            >
                                {n.t}
                            </text>
                            <text
                                x={n.x}
                                y={n.y + 14}
                                textAnchor="middle"
                                className="s"
                            >
                                {n.s}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
            <div className="nx-pt-layers" key={r.ruta}>
                {r.capas.map((c, k) => (
                    <span key={c} style={{ animationDelay: `${k * 120}ms` }}>
                        {c}
                    </span>
                ))}
            </div>
            <p className="nx-pt-note">
                <b>Si no pasa:</b> {r.falla}
            </p>
        </div>
    );
}

function Composite() {
    const [vista, setVista] = useState<'router' | 'ensamble'>('router');
    return (
        <Patron
            nombre="Composite"
            problema="Hay estructuras que se arman con partes del mismo tipo: la API es un conjunto de grupos de rutas con reglas de acceso distintas, una predicción puede venir de un modelo o de un promedio de modelos, y la interfaz es un layout que contiene páginas."
            solucion="Las partes y el todo exponen la misma interfaz y se combinan en un árbol. Quien usa la estructura no distingue una hoja de un compuesto: el servidor sirve un Router, el registry consulta un modelo."
            diagrama={
                <div>
                    <div className="nx-seg" style={{ marginBottom: 12 }}>
                        <button
                            type="button"
                            aria-pressed={vista === 'router'}
                            onClick={() => setVista('router')}
                        >
                            backend-website · routers
                        </button>
                        <button
                            type="button"
                            aria-pressed={vista === 'ensamble'}
                            onClick={() => setVista('ensamble')}
                        >
                            api-ml · ensamble
                        </button>
                    </div>
                    {vista === 'router' ? (
                        <RouterDiagrama />
                    ) : (
                        <EnsambleDiagrama />
                    )}
                </div>
            }
            usos={USOS.composite}
        />
    );
}

function EnsambleDiagrama() {
    const [pesos, setPesos] = useState([0.1, 0.8, 0.1]);
    const total = pesos.reduce((s, p) => s + p, 0) || 1;
    const prom = HOJAS.reduce((s, h, k) => s + h.ret * pesos[k], 0) / total;
    const senal = prom > 0.01 ? 'alza' : prom < -0.01 ? 'baja' : 'neutral';
    const pct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
    const xs = [130, 360, 590];
    return (
        <div>
            <div className="nx-pt-dhead">
                <b>Mové los pesos:</b> el ensamble recalcula su retorno y su
                señal igual que lo hace el código. Retornos de ejemplo.
            </div>
            <div style={{ overflowX: 'auto' }}>
                <svg
                    className="nx-pt-svg"
                    viewBox="0 0 720 250"
                    style={{ minWidth: 560 }}
                    role="img"
                    aria-label="Diagrama del patrón Composite"
                >
                    <g className="box iface">
                        <rect x={225} y={10} width={270} height={74} rx={10} />
                        <text x={360} y={32} textAnchor="middle" className="s">
                            EnsembleTrendService (compuesto)
                        </text>
                        <text x={360} y={54} textAnchor="middle" className="t">
                            {pct(prom)} → {senal}
                        </text>
                        <text x={360} y={72} textAnchor="middle" className="s">
                            np.average(retornos, weights)
                        </text>
                    </g>
                    {HOJAS.map((h, k) => {
                        const w = pesos[k] / total;
                        return (
                            <g key={h.id}>
                                <path
                                    className="flow on"
                                    style={{ strokeWidth: 1 + w * 9 }}
                                    d={`M${xs[k]},160 C${xs[k]},120 360,120 360,84`}
                                />
                                <text
                                    x={(xs[k] + 360) / 2}
                                    y={124}
                                    textAnchor="middle"
                                    className="s"
                                >
                                    peso {Math.round(w * 100)}%
                                </text>
                                <g className="box">
                                    <rect
                                        x={xs[k] - 95}
                                        y={160}
                                        width={190}
                                        height={56}
                                        rx={9}
                                    />
                                    <text
                                        x={xs[k]}
                                        y={183}
                                        textAnchor="middle"
                                        className="t"
                                    >
                                        {h.id}
                                    </text>
                                    <text
                                        x={xs[k]}
                                        y={202}
                                        textAnchor="middle"
                                        className="s"
                                    >
                                        TrendService (hoja) · {pct(h.ret)}
                                    </text>
                                </g>
                            </g>
                        );
                    })}
                    <text x={360} y={242} textAnchor="middle" className="s">
                        Hojas y compuesto exponen lo mismo: predict_on(df,
                        symbol), is_loaded, version
                    </text>
                </svg>
            </div>
            <div className="nx-pt-sliders">
                {HOJAS.map((h, k) => (
                    <label key={h.id}>
                        <span>{h.id}</span>
                        <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={pesos[k]}
                            aria-label={`Peso de ${h.id}`}
                            onChange={(ev) => {
                                const v = Number(ev.target.value);
                                setPesos((p) =>
                                    p.map((x, j) => (j === k ? v : x)),
                                );
                            }}
                        />
                        <code>{pesos[k].toFixed(2)}</code>
                    </label>
                ))}
            </div>
            <p className="nx-pt-note">
                Resultado real: ningún juego de pesos le ganó a XGBoost solo (el
                mejor, 0,8 / 0,1 / 0,1, empató: 62,4% contra 62,3%), y cada
                predicción costaba correr 3 modelos. Por eso el ensamble existe
                y está testeado, pero no se registra en producción.
            </p>
        </div>
    );
}

// ------------------------------------------------------------------- Factory

type Fila = {
    nombre: string;
    tipo: string;
    loader: string;
    ok: boolean;
    nota: string;
};

function filasFactory(modal: boolean, viejo: boolean): Fila[] {
    const base: Fila[] = [
        {
            nombre: 'lstm',
            tipo: 'TrendService',
            loader: 'TrendModel.load(lstm.pt)',
            ok: true,
            nota: modal ? 'cargado' : 'default',
        },
        {
            nombre: 'xgboost',
            tipo: 'TrendService',
            loader: 'XGBTrendModel.load(xgb.pkl)',
            ok: !viejo,
            nota: viejo
                ? 'StaleArtifactError: variables distintas → no cargado'
                : 'cargado',
        },
        {
            nombre: 'xgboost-5',
            tipo: 'TrendService',
            loader: 'XGBTrendModel.load(xgb5.pkl)',
            ok: true,
            nota: 'mismo loader, otro artefacto',
        },
        {
            nombre: 'transformer',
            tipo: 'PanelTrendService',
            loader: 'TransformerV2Model.load',
            ok: true,
            nota: 'respaldo: transformer-v1',
        },
        {
            nombre: 'contexto',
            tipo: 'TrendService',
            loader: 'ContextTrendModel.load',
            ok: true,
            nota: 'cargado',
        },
        {
            nombre: 'arima',
            tipo: 'OnDemandTrendService',
            loader: 'ArimaTrendModel()',
            ok: true,
            nota: 'sin artefacto',
        },
    ];
    if (!modal) return base;
    return [
        ...base,
        ...['lstm-modal', 'xgboost-modal', 'arima-modal', 'svm-modal'].map(
            (n) => ({
                nombre: n,
                tipo: 'RemoteTrendService',
                loader: 'URL de Modal',
                ok: true,
                nota: n === 'lstm-modal' ? 'pasa a ser default' : 'remoto',
            }),
        ),
    ];
}

function Factory() {
    const [modal, setModal] = useState(true);
    const [viejo, setViejo] = useState(false);
    const [corrida, setCorrida] = useState(0);
    const filas = filasFactory(modal, viejo);
    return (
        <Patron
            nombre="Factory"
            problema="Construir ciertos objetos exige decisiones que no le corresponden a quien los usa: qué artefacto leer y cómo validarlo, con qué timeout armar un cliente HTTP, qué hacer si no hay SMTP, cómo abrir sesión en BYMA o cómo agregar el token a cada pedido."
            solucion="Una función o método fábrica construye el objeto listo para usar y oculta los detalles. El diagrama muestra el arranque de api-ml: build_registry decide qué servicios crear según la configuración y cada clase de modelo se construye con su load(path)."
            diagrama={
                <div>
                    <div className="nx-pt-dhead">
                        <label className="nx-pt-toggle">
                            <input
                                type="checkbox"
                                checked={modal}
                                onChange={(e) => setModal(e.target.checked)}
                            />
                            URLs de Modal configuradas
                        </label>
                        <label className="nx-pt-toggle">
                            <input
                                type="checkbox"
                                checked={viejo}
                                onChange={(e) => setViejo(e.target.checked)}
                            />
                            xgb.pkl entrenado con otras variables
                        </label>
                        <button
                            type="button"
                            className="nx-pt-btn"
                            onClick={() => setCorrida((c) => c + 1)}
                        >
                            ▶ Arrancar api-ml
                        </button>
                    </div>
                    <div className="nx-pt-factory">
                        <div className="stage">
                            <small>1 · configuración</small>
                            <code>settings (.env)</code>
                            <span>rutas de artefactos, URLs de Modal</span>
                        </div>
                        <span className="ar">→</span>
                        <div className="stage">
                            <small>2 · fábrica</small>
                            <code>build_registry()</code>
                            <span>decide qué crear y con qué loader</span>
                        </div>
                        <span className="ar">→</span>
                        <div className="stage">
                            <small>3 · load_all()</small>
                            <code>Clase.load(path)</code>
                            <span>lee, valida variables, construye</span>
                        </div>
                    </div>
                    <div
                        className="nx-pt-reg"
                        key={`${corrida}-${modal}-${viejo}`}
                    >
                        {filas.map((f, k) => (
                            <div
                                key={f.nombre}
                                className={f.ok ? '' : 'bad'}
                                style={{ animationDelay: `${k * 110}ms` }}
                            >
                                <b>{f.nombre}</b>
                                <span className="tipo">{f.tipo}</span>
                                <code>{f.loader}</code>
                                <span className="nota">
                                    {f.ok ? '● ' : '○ '}
                                    {f.nota}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            }
            usos={USOS.factory}
        />
    );
}

// ------------------------------------------------------------ Microservicios

const SERVICIOS: Record<
    string,
    {
        x: number;
        y: number;
        t: string;
        s: string;
        cae: string[];
        sigue: string[];
    }
> = {
    fe: {
        x: 20,
        y: 120,
        t: 'Frontend',
        s: 'React · Render',
        cae: ['No hay interfaz web.'],
        sigue: [
            'Los crons siguen entrenando y precalculando.',
            'La API del backend sigue respondiendo.',
        ],
    },
    be: {
        x: 230,
        y: 120,
        t: 'backend-website',
        s: 'Rust · Postgres propio',
        cae: [
            'Login, carteras y todas las pantallas (es la única puerta de la web).',
            'Alertas y resumen semanal por mail.',
        ],
        sigue: [
            'api-ml, Modal y data-colector siguen vivos.',
            'Reentrenos y paper trading (GitHub Actions) no dependen de él.',
        ],
    },
    ml: {
        x: 470,
        y: 40,
        t: 'api-ml',
        s: 'Python · Render',
        cae: [
            'Comparador sin los modelos locales, Black-Litterman, consenso y explicaciones.',
        ],
        sigue: [
            'Login, cartera, P&L y alertas.',
            'Los modelos de Modal en el comparador.',
        ],
    },
    md: {
        x: 470,
        y: 200,
        t: 'Modal',
        s: 'modelos remotos',
        cae: [
            'Los modelos -modal se marcan "no disponible".',
            'Tendencias del inicio con lstm-modal (cada acción falla sola, no la lista).',
        ],
        sigue: [
            'Comparador con los 7 modelos locales de api-ml.',
            'Todo lo demás.',
        ],
    },
    dc: {
        x: 700,
        y: 120,
        t: 'data-colector',
        s: 'Rust · Postgres propio',
        cae: [
            'Modelo Macro (sus series solo están acá).',
            'Modal (baja sus datos de acá).',
            'Agregar acciones a la cartera (valida el ticker).',
        ],
        sigue: [
            'api-ml corta en 5 min sin reintentar y baja las velas de Yahoo (circuit breaker).',
            'Login, cartera y comparador local.',
        ],
    },
};

const CONEXIONES: Array<[string, string, string]> = [
    ['fe', 'be', 'JWT'],
    ['be', 'ml', 'HTTP'],
    ['be', 'md', 'HTTP'],
    ['be', 'dc', 'HTTP'],
    ['ml', 'dc', 'HTTP'],
    ['ml', 'md', 'HTTP'],
    ['md', 'dc', 'HTTP'],
];

function Microservicios() {
    const [caido, setCaido] = useState<string | null>('dc');
    const NW = 170;
    const NH = 60;
    const c = (k: string) => [SERVICIOS[k].x + NW / 2, SERVICIOS[k].y + NH / 2];
    const sel = caido ? SERVICIOS[caido] : null;
    return (
        <Patron
            nombre="Microservicios"
            problema="Recolectar datos de mercado (scrapers que corren todo el día), entrenar y servir modelos de ML (Python, mucha memoria) y atender la web (usuarios, sesiones, mails) tienen ritmos, lenguajes y fallas muy distintos."
            solucion="Cada responsabilidad es un servicio aparte, con su repo, su lenguaje, su base de datos y su deploy, y se comunican solo por HTTP. Es un patrón de arquitectura: organiza el sistema completo, mientras que los otros cuatro organizan el código dentro de cada servicio."
            diagrama={
                <div>
                    <div className="nx-pt-dhead">
                        <b>Tirá un servicio:</b> tocá una caja para ver qué se
                        rompe y qué sigue andando.
                        <button
                            type="button"
                            className="nx-pt-btn"
                            onClick={() => setCaido(null)}
                        >
                            Levantar todo
                        </button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <svg
                            className="nx-pt-svg micro"
                            viewBox="0 0 900 290"
                            style={{ minWidth: 640 }}
                            role="img"
                            aria-label="Diagrama de microservicios con simulación de caída"
                        >
                            {CONEXIONES.map(([a, b, lbl], k) => {
                                const [x1, y1] = c(a);
                                const [x2, y2] = c(b);
                                const roto = caido === a || caido === b;
                                return (
                                    <g key={k}>
                                        <path
                                            id={`nx-pt-m${k}`}
                                            className={`flow ${roto ? 'broken' : 'on'}`}
                                            d={`M${x1},${y1} L${x2},${y2}`}
                                        />
                                        {!roto && (
                                            <circle r={3.5} className="dot">
                                                <animateMotion
                                                    dur={`${1.6 + (k % 3) * 0.5}s`}
                                                    repeatCount="indefinite"
                                                >
                                                    <mpath
                                                        href={`#nx-pt-m${k}`}
                                                    />
                                                </animateMotion>
                                            </circle>
                                        )}
                                        <text
                                            x={(x1 + x2) / 2}
                                            y={(y1 + y2) / 2 - 6}
                                            textAnchor="middle"
                                            className="s lbl"
                                        >
                                            {lbl}
                                        </text>
                                    </g>
                                );
                            })}
                            {Object.entries(SERVICIOS).map(([k, s]) => (
                                <g
                                    key={k}
                                    className={`box pick ${caido === k ? 'down' : ''}`}
                                    onClick={() =>
                                        setCaido(caido === k ? null : k)
                                    }
                                    role="button"
                                    aria-label={`Tirar ${s.t}`}
                                >
                                    <rect
                                        x={s.x}
                                        y={s.y}
                                        width={NW}
                                        height={NH}
                                        rx={10}
                                    />
                                    <text
                                        x={s.x + 14}
                                        y={s.y + 25}
                                        className="t"
                                    >
                                        {s.t}
                                    </text>
                                    <text
                                        x={s.x + 14}
                                        y={s.y + 44}
                                        className="s"
                                    >
                                        {caido === k ? '✕ caído' : s.s}
                                    </text>
                                </g>
                            ))}
                        </svg>
                    </div>
                    {sel ? (
                        <div className="nx-pt-fail">
                            <div className="bad">
                                <small>Si se cae {sel.t}, deja de andar</small>
                                <ul>
                                    {sel.cae.map((x) => (
                                        <li key={x}>{x}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="good">
                                <small>Y sigue funcionando</small>
                                <ul>
                                    {sel.sigue.map((x) => (
                                        <li key={x}>{x}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <p className="nx-pt-note">
                            Todo arriba. Tocá una caja para simular su caída.
                        </p>
                    )}
                    <div className="nx-pt-check">
                        <span className="nx-eyebrow">Cómo lo aplicamos</span>
                        <ul>
                            <li>
                                Cada servicio tiene su repo, su CI y su deploy:
                                un contenedor por servicio en Render, y los
                                modelos remotos en Modal.
                            </li>
                            <li>
                                Cada servicio es dueño de sus datos:
                                data-colector y backend-website tienen su propio
                                PostgreSQL y ninguno lee la base del otro.
                            </li>
                            <li>
                                Se comunican solo por HTTP con contratos
                                documentados (ver Arquitectura y el Swagger del
                                backend).
                            </li>
                            <li>
                                Cada uno usa el lenguaje que le conviene: Rust
                                para la concurrencia de scrapers y API, Python
                                para las librerías de ML.
                            </li>
                            <li>
                                backend-website es la única puerta de entrada de
                                la web (Backend for Frontend): junta las
                                respuestas de los demás en un solo pedido.
                            </li>
                            <li>
                                Las llamadas son síncronas, así que cada cliente
                                tiene timeout, reintentos en 5xx y, en api-ml,
                                un circuit breaker que corta el pedido al
                                data-colector cuando no responde.
                            </li>
                        </ul>
                    </div>
                </div>
            }
            usos={USOS.micro}
        />
    );
}
