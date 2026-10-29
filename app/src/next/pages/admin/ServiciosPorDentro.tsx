// Pestaña "Servicios por dentro" de De punta a punta: cómo está construido
// cada servicio (estructura, flujos, seguridad, tareas y datos). Sacado del
// código de backend-website, data-colector, api-ml y frontend.

import { useState } from 'react';
import { Card, CardHead } from '../../ui/Blocks';

interface Paso {
    t: string;
    d: string;
}
interface Flujo {
    titulo: string;
    hint: string;
    pasos: Paso[];
}
interface Servicio {
    id: string;
    nombre: string;
    rol: string;
    stack: string[];
    corre: string;
    estructura: Array<[string, string]>;
    flujos: Flujo[];
    bloques: Array<{ titulo: string; items: Array<[string, string]> }>;
    tablas?: string[];
}

const SERVICIOS: Servicio[] = [
    {
        id: 'backend',
        nombre: 'backend-website',
        rol: 'Única puerta de entrada de la web: usuarios, seguridad, carteras, cachés, alertas y mails. Junta en un solo pedido lo que responden api-ml, Modal y data-colector.',
        stack: [
            'Rust',
            'axum 0.8',
            'tokio',
            'sqlx',
            'PostgreSQL',
            'argon2',
            'jsonwebtoken',
            'totp-rs',
            'lettre',
            'utoipa (Swagger)',
        ],
        corre: 'Render (Docker) + PostgreSQL propio. Swagger en /swagger.',
        estructura: [
            [
                'src/lib.rs',
                'Arma el árbol de routers y sus capas de seguridad.',
            ],
            [
                'src/auth/',
                'jwt.rs (emitir y validar), middleware.rs (require_auth), profile.rs (require_profile), admin.rs (require_admin).',
            ],
            [
                'src/endpoints/',
                'Un módulo por área (user, user_share, share, market, admin, alert_subscription); un *_logic.rs por caso de uso.',
            ],
            [
                'src/endpoints/upstream.rs',
                'Clientes con timeout y reintentos hacia api-ml y data-colector.',
            ],
            [
                'src/alerts/ · src/reports/',
                'Tareas en segundo plano: alertas de cambio de señal y resumen semanal.',
            ],
            [
                'src/mail/',
                'Envío por SMTP (lettre) con plantillas de cada mail.',
            ],
            [
                'migrations/',
                '18 migraciones sqlx: el esquema se versiona con el código.',
            ],
        ],
        flujos: [
            {
                titulo: 'Ciclo de vida de una cuenta',
                hint: 'Tocá cada paso para ver qué hace el backend y cómo se protege.',
                pasos: [
                    {
                        t: 'Registro',
                        d: 'POST /register valida el mail y la contraseña (8 caracteres o más, con mayúscula, minúscula, número y símbolo) y guarda solo el hash argon2 con sal aleatoria (OsRng). La contraseña nunca se guarda ni se loguea.',
                    },
                    {
                        t: 'Verificación de mail',
                        d: 'Se manda un link con un token aleatorio. En la base queda solo su hash SHA-256 y vence a las 24 h. Reenviar tiene 60 s de espera. Hasta verificar, el login responde 403 "Email not verified".',
                    },
                    {
                        t: 'Login',
                        d: 'POST /login compara contra el hash argon2. Si el usuario tiene 2FA y no mandó el código, responde 401 con two_factor_required y el frontend pide el código.',
                    },
                    {
                        t: 'Segundo factor (TOTP)',
                        d: 'En /user/2fa/setup se genera un secreto y un QR otpauth:// para Google Authenticator o Authy; se activa recién cuando el usuario confirma un código válido. Desde ahí el login exige el código de 6 dígitos.',
                    },
                    {
                        t: 'JWT',
                        d: 'Con todo correcto se emite un JWT HS256 firmado con JWT_SECRET (sub = id, email, iat, exp), que vence a las 24 h (JWT_EXPIRATION_HOURS). El frontend lo manda en Authorization: Bearer.',
                    },
                    {
                        t: 'Pedido protegido',
                        d: 'require_auth valida firma y vencimiento y deja un AuthUser en el request. Las rutas de análisis pasan además por require_profile (perfil de riesgo de menos de un año) y las de admin por require_admin (role = admin en la base, no en el token).',
                    },
                    {
                        t: 'Recupero de contraseña',
                        d: 'POST /forgot-password responde siempre el mismo mensaje exista o no la cuenta, para no revelar qué mails están registrados. El token se guarda hasheado, vence en 60 min y se usa una sola vez.',
                    },
                ],
            },
            {
                titulo: 'Un pedido de comparación',
                hint: 'GET /user/shares/{ticker}/trends/compare',
                pasos: [
                    {
                        t: 'Capas',
                        d: 'CORS (solo los orígenes permitidos), sesión, require_auth y require_profile.',
                    },
                    {
                        t: 'Caché',
                        d: 'Busca en ticker_compare_cache una comparación del día (hora de Buenos Aires). Completa vale todo el día; con algún modelo caído, 15 minutos.',
                    },
                    {
                        t: 'Fan-out',
                        d: 'Si no hay, lanza en paralelo con tokio::join! los pedidos a api-ml (timeout 75 s), al consenso y a cada modelo de Modal.',
                    },
                    {
                        t: 'Adaptar',
                        d: 'Traduce las respuestas de Modal (fetch_svm, fetch_garch) al formato común.',
                    },
                    {
                        t: 'Guardar y responder',
                        d: 'Guarda la comparación marcando si respondieron todos y devuelve un JSON único.',
                    },
                ],
            },
        ],
        bloques: [
            {
                titulo: 'Tareas en segundo plano',
                items: [
                    [
                        'Alertas',
                        'Cada 24 h revisa si cambió la señal de las acciones de cada cartera, manda el mail y deja al día ticker_trend_cache.',
                    ],
                    [
                        'Resumen semanal',
                        'Los lunes manda el resumen de la cartera.',
                    ],
                    [
                        'Sesiones',
                        'Cada hora borra las sesiones vencidas de la tabla de tower-sessions.',
                    ],
                    [
                        'Sin SMTP',
                        'Si no hay SMTP configurado, las tareas corren igual (para mantener las cachés) y no mandan mails.',
                    ],
                ],
            },
            {
                titulo: 'Integración con los otros servicios',
                items: [
                    [
                        'Timeouts',
                        'Cada llamada tiene su timeout: 20 s Modal por acción, 75 s api-ml, 90 s data-colector.',
                    ],
                    [
                        'Reintentos',
                        'send_with_retry repite hasta 3 veces si falla el transporte o el servicio responde 5xx.',
                    ],
                    [
                        'Errores',
                        'Una acción que falla vuelve marcada como no disponible: no tira abajo la lista entera.',
                    ],
                ],
            },
        ],
        tablas: [
            'users',
            'shares',
            'user_shares',
            'user_share_operations',
            'user_investing_profile',
            'user_preferences',
            'alert_subscriptions',
            'ticker_trend_cache',
            'ticker_compare_cache',
            'hidden_models',
            'retro_*',
            'tower_sessions',
        ],
    },
    {
        id: 'dc',
        nombre: 'data-colector',
        rol: 'Recolecta, corrige y guarda los datos de mercado, y se los sirve a los otros servicios. Ningún otro servicio habla con BYMA, Rava ni el BCRA.',
        stack: [
            'Rust',
            'axum',
            'tokio',
            'sqlx',
            'PostgreSQL',
            'yfinance-rs',
            'reqwest',
        ],
        corre: 'Render (Docker) + PostgreSQL propio.',
        estructura: [
            [
                'src/main.rs',
                'Conecta la base, corre las migraciones, lanza las tareas en segundo plano y levanta la API.',
            ],
            [
                'src/site_scrappers/',
                'BYMA (tickers, ofertas, históricos, con sesión y cookies), Rava (clasificación de tickers) y sectores.',
            ],
            [
                'src/commodities_scrapper/',
                'Oro (GC=F) y petróleo (CL=F) desde Yahoo.',
            ],
            [
                'src/interest_rates/',
                'Un cliente por fuente: us_client (Yahoo), ar_client (BCRA) y argentinadatos_client.',
            ],
            [
                'src/history_corrections.rs',
                'Reconstruye las series que Yahoo trae mal (A3, CARC, ECOG, GAMI, RICH, DOME) con BYMA + Rava y limpia saltos (SEMI, CEPU, VALO).',
            ],
            [
                'src/persistence/',
                'Repositorios: todo el SQL de tickers e históricos (ticker_repository) y de tasas (interest_rate_repository).',
            ],
            [
                'src/endpoints/',
                'Históricos, tickers disponibles y listos para modelos, sectores, tasas y series macro.',
            ],
        ],
        flujos: [
            {
                titulo: 'Un pedido de histórico',
                hint: 'POST /historical-data/{ticker}',
                pasos: [
                    {
                        t: 'Buscar en la base',
                        d: 'Lee las velas guardadas del ticker y la fecha de su última actualización.',
                    },
                    {
                        t: '¿Vigente?',
                        d: 'Si se actualizó hace menos de 5 días responde desde la base (cached: true).',
                    },
                    {
                        t: 'Bajar de Yahoo',
                        d: 'Si no, pide 10 años de velas diarias a Yahoo con yfinance-rs.',
                    },
                    {
                        t: 'Corregir',
                        d: 'Aplica las correcciones del ticker, si tiene (reconstrucción con BYMA + Rava, recorte de inicio, saltos).',
                    },
                    {
                        t: 'Guardar y responder',
                        d: 'Reemplaza la serie, marca la fecha de actualización y suma el ticker al catálogo si no estaba.',
                    },
                ],
            },
        ],
        bloques: [
            {
                titulo: 'Tareas en segundo plano (tokio::spawn)',
                items: [
                    [
                        'Tickers de BYMA',
                        'Cada 60 min: lista de acciones, ofertas y precios.',
                    ],
                    [
                        'Históricos',
                        'De a 8 tickers con más de 5 días sin actualizar, con 2 a 4 min al azar entre tandas para no saturar a Yahoo; si no queda ninguno, espera 5 h.',
                    ],
                    ['Rava', 'Cada 10 h: clasificación de los tickers.'],
                    ['Commodities', 'Cada 6 h: oro y petróleo.'],
                    [
                        'Sectores',
                        'Arranca a los 2 min y completa el sector de cada ticker.',
                    ],
                ],
            },
            {
                titulo: 'Series macro y tasas',
                items: [
                    [
                        'Fuentes',
                        'Bonos del Tesoro de EE.UU. (Yahoo), TPM, BADLAR, reservas y base monetaria (BCRA), dólares y riesgo país (ArgentinaDatos).',
                    ],
                    [
                        'Caché',
                        'Se piden a demanda, se guardan y se registra cuándo se consultó cada serie (interest_rate_fetches) para no reescribir si no hay datos nuevos.',
                    ],
                ],
            },
        ],
        tablas: [
            'available_tickers_byma',
            'ticker_history_data_cached_yf',
            'bidoffers',
            'rava_tickers',
            'rava_historical_price',
            'tickers_sector',
            'interest_rate_cached',
            'interest_rate_fetches',
        ],
    },
    {
        id: 'ml',
        nombre: 'api-ml',
        rol: 'Los modelos y las finanzas: predicción, comparación, consenso, Black-Litterman, volatilidad GARCH, explicaciones SHAP, precio estimado por regresión, historial de señales y paper trading.',
        stack: [
            'Python 3.12',
            'FastAPI',
            'Pydantic',
            'PyTorch',
            'XGBoost',
            'scikit-learn',
            'statsmodels',
            'pandas',
        ],
        corre: 'Render (Docker, plan free). Sin base de datos: los artefactos y el ledger viajan en el repo.',
        estructura: [
            [
                'src/main.py',
                'Endpoints; valida con Pydantic (schemas.py) y convierte los errores del dominio en códigos HTTP.',
            ],
            [
                'src/registry.py',
                'Registro de modelos, comparación con caché y lock por ticker.',
            ],
            ['src/*_trend.py · src/panel/', 'Un módulo por modelo.'],
            [
                'src/data.py · macro_data.py',
                'Históricos con caché, circuit breaker y respaldo de Yahoo.',
            ],
            [
                'src/train_*.py · retrain_guard.py',
                'Entrenamiento y control de promoción, corridos por GitHub Actions.',
            ],
            [
                'src/paper_trading.py · compare_snapshot.py',
                'Señales del día al ledger y snapshot del comparador.',
            ],
        ],
        flujos: [
            {
                titulo: 'Arranque',
                hint: 'Lo que pasa cuando Render levanta el contenedor.',
                pasos: [
                    {
                        t: 'build_registry',
                        d: 'Registra los modelos según la configuración (los -modal solo si hay URL).',
                    },
                    {
                        t: 'load_all',
                        d: 'Cada modelo se construye desde su artefacto; uno roto o viejo queda "no cargado" y el resto arranca igual.',
                    },
                    {
                        t: '/health',
                        d: 'Responde el estado y la versión de cada modelo; Render lo usa como health check.',
                    },
                ],
            },
        ],
        bloques: [
            {
                titulo: 'Errores del dominio',
                items: [
                    [
                        'DataUnavailableError',
                        '502: no se pudieron conseguir los datos.',
                    ],
                    [
                        'NotEnoughDataError',
                        '422: hay datos pero no alcanzan (poca historia, serie estancada).',
                    ],
                    ['UnknownModelError', '404: modelo inexistente.'],
                    [
                        'ModelNotLoadedError',
                        '503: el modelo existe pero su artefacto no cargó.',
                    ],
                    [
                        'StaleArtifactError',
                        'Al arrancar: artefacto entrenado con otras variables, el modelo queda sin cargar.',
                    ],
                ],
            },
        ],
    },
    {
        id: 'fe',
        nombre: 'frontend',
        rol: 'La interfaz de usuario y de administración. Solo habla con backend-website, salvo la ficha pública de una acción, que lee del data-colector.',
        stack: [
            'React',
            'TypeScript',
            'Vite',
            'React Router',
            'axios',
            'Vitest',
            'MSW',
            'Playwright',
            'Cucumber',
        ],
        corre: 'Render (sitio estático).',
        estructura: [
            [
                'src/next/routes.tsx',
                'Árbol de rutas: usuario y admin dentro del mismo shell; cada página se carga recién cuando se abre (React.lazy).',
            ],
            ['src/next/pages/', 'Una página por pantalla.'],
            [
                'src/next/data/',
                'PortfolioContext y UiContext (estado compartido), useRemote (pedidos con caché en memoria).',
            ],
            [
                'src/next/shell/',
                'AppShell, paleta de comandos, notificaciones, guía y PageErrorBoundary.',
            ],
            [
                'src/api/',
                'Un módulo por endpoint; authFetch.ts con la instancia autenticada.',
            ],
        ],
        flujos: [
            {
                titulo: 'Sesión en el navegador',
                hint: 'Cómo se maneja el JWT de punta a punta.',
                pasos: [
                    {
                        t: 'Login',
                        d: 'Si el backend pide 2FA (two_factor_required), el formulario muestra el campo del código y reintenta.',
                    },
                    {
                        t: 'Token',
                        d: 'El JWT se guarda en el navegador y RequireAuth no deja entrar a rutas privadas sin él.',
                    },
                    {
                        t: 'Interceptor',
                        d: 'authAxios agrega Authorization: Bearer a cada pedido.',
                    },
                    {
                        t: '401',
                        d: 'Si el backend responde 401 (token vencido o inválido), se borra el token y se emite el evento financiar:session-expired.',
                    },
                    {
                        t: 'Evento',
                        d: 'RequireAuth está suscripto a ese evento y vuelve al inicio con el login abierto. Con un 403 de perfil de riesgo se emite otro evento que abre el cuestionario.',
                    },
                ],
            },
        ],
        bloques: [
            {
                titulo: 'Robustez',
                items: [
                    [
                        'Error boundary',
                        'Si una página rompe, PageErrorBoundary muestra un error en esa página y el resto del shell sigue andando.',
                    ],
                    [
                        'Servidor dormido',
                        'Si el backend no responde (Render lo duerme), se muestra "No pudimos conectar" y se reintenta solo.',
                    ],
                    [
                        'Modelos ocultos',
                        'Las pantallas leen /models/hidden y no muestran los modelos que ocultó el admin.',
                    ],
                ],
            },
            {
                titulo: 'Tests',
                items: [
                    [
                        'Unitarios y de pantallas',
                        'Vitest + Testing Library, con el backend simulado por MSW y cobertura con v8.',
                    ],
                    [
                        'De punta a punta',
                        'Playwright contra un backend simulado (login, logout, landing, pantallas principales).',
                    ],
                    [
                        'Escenarios',
                        'Cucumber con features en castellano (login, cartera).',
                    ],
                ],
            },
        ],
    },
];

const ENTREGA: Array<[string, string]> = [
    [
        'CI',
        'Cada repo tiene su workflow de GitHub Actions: lint, formato y tests en cada push y pull request.',
    ],
    [
        'Deploy',
        'Render construye la imagen Docker de cada servicio al mergear a main; el frontend se publica como sitio estático.',
    ],
    [
        'Modelos',
        'GitHub Actions reentrena y commitea los artefactos que pasan el control; Modal reentrena las copias remotas con sus propios crons.',
    ],
    [
        'Esquema',
        'Las migraciones de sqlx corren al arrancar backend-website y data-colector: la base siempre coincide con el código desplegado.',
    ],
    [
        'Documentación',
        'Swagger generado desde el código en backend-website (utoipa) y endpoints documentados en la solapa Arquitectura.',
    ],
];

export default function ServiciosPorDentro() {
    const [sel, setSel] = useState(0);
    const s = SERVICIOS[sel];
    return (
        <div className="nx-grid">
            <Card span="s12" i={0}>
                <div
                    className="nx-pt-picker"
                    role="tablist"
                    style={{ marginBottom: 0 }}
                >
                    {SERVICIOS.map((x, k) => (
                        <button
                            key={x.id}
                            type="button"
                            role="tab"
                            aria-selected={sel === k}
                            onClick={() => setSel(k)}
                        >
                            <small>{x.stack[0]}</small>
                            {x.nombre}
                        </button>
                    ))}
                </div>
            </Card>
            <Servicio key={s.id} s={s} />
            <Card span="s12" i={6}>
                <CardHead title="Calidad y entrega (todos los servicios)" />
                <div className="nx-pj-layers">
                    {ENTREGA.map(([k, v]) => (
                        <div key={k}>
                            <b>{k}</b>
                            <span>{v}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

function Servicio({ s }: { s: Servicio }) {
    return (
        <>
            <Card span="s12" i={1}>
                <div className="nx-sv-head">
                    <div>
                        <h3>{s.nombre}</h3>
                        <p>{s.rol}</p>
                        <small>Corre en: {s.corre}</small>
                    </div>
                    <div className="nx-sv-stack">
                        {s.stack.map((x) => (
                            <span key={x}>{x}</span>
                        ))}
                    </div>
                </div>
            </Card>
            {s.flujos.map((f, k) => (
                <Card key={f.titulo} span="s12" i={2 + k}>
                    <FlujoInteractivo f={f} />
                </Card>
            ))}
            <Card span="s6" i={3}>
                <CardHead title="Cómo está organizado el código" />
                <div className="nx-pj-layers">
                    {s.estructura.map(([k, v]) => (
                        <div key={k}>
                            <b>
                                <code>{k}</code>
                            </b>
                            <span>{v}</span>
                        </div>
                    ))}
                </div>
            </Card>
            <Card span="s6" i={4}>
                {s.bloques.map((b) => (
                    <div key={b.titulo} className="nx-sv-block">
                        <CardHead title={b.titulo} />
                        <dl>
                            {b.items.map(([k, v]) => (
                                <div key={k}>
                                    <dt>{k}</dt>
                                    <dd>{v}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                ))}
                {s.tablas && (
                    <div className="nx-sv-block">
                        <CardHead
                            title={`Tablas propias (${s.tablas.length})`}
                        />
                        <div className="nx-sv-stack">
                            {s.tablas.map((t) => (
                                <code key={t}>{t}</code>
                            ))}
                        </div>
                    </div>
                )}
            </Card>
        </>
    );
}

function FlujoInteractivo({ f }: { f: Flujo }) {
    const [i, setI] = useState(0);
    const p = f.pasos[i];
    return (
        <div>
            <CardHead title={f.titulo} hint={f.hint} />
            <div className="nx-sv-flow" role="tablist" aria-label={f.titulo}>
                {f.pasos.map((x, k) => (
                    <button
                        key={x.t}
                        type="button"
                        role="tab"
                        aria-selected={i === k}
                        className={k < i ? 'done' : ''}
                        onClick={() => setI(k)}
                    >
                        <span className="n">{k + 1}</span>
                        {x.t}
                    </button>
                ))}
            </div>
            <div className="nx-sv-step" key={p.t}>
                <b>{p.t}</b>
                <p>{p.d}</p>
                <div className="nav">
                    <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => setI(i - 1)}
                    >
                        ← Anterior
                    </button>
                    <button
                        type="button"
                        disabled={i === f.pasos.length - 1}
                        onClick={() => setI(i + 1)}
                    >
                        Siguiente →
                    </button>
                </div>
            </div>
        </div>
    );
}
