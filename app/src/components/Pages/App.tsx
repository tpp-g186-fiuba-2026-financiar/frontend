import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../../css/App.css';
import SignUpPopUp from '../SignUp/SignUpPopUp';
import { helloEndpoint, type Introduction } from '../../api/hello';
import LoginPopUp, { type LoginMode } from '../Login/LoginPopUp';
import { getAllSharesEndpoint } from '../../api/shares/getAllSharesEndpoint';
import { shareInfoEndpoint } from '../../api/shares/getShareInfo';
import Icon, { type IconName } from '../../next/ui/Icon';
import { LEGAL_TEXT } from '../../next/ui/Blocks';
import { questions } from '../SignUp/questions';

const HeroMonitor = lazy(() => import('../../next/ui/HeroMonitor'));

// Estado con el que otras paginas (p. ej. /restore-password) vuelven al inicio
// para abrir el login directamente.
export interface LandingState {
    login?: LoginMode;
    passwordRestored?: boolean;
    sessionExpired?: boolean;
}

function landingNotice(state: LandingState): string | undefined {
    if (state.passwordRestored) {
        return 'Tu contraseña se actualizó. Ya podés ingresar con la nueva.';
    }
    if (state.sessionExpired) {
        return 'Tu sesión venció. Volvé a ingresar para continuar.';
    }
    return undefined;
}

// Acciones que se muestran en la portada (cotizaciones del ultimo cierre).
const LEADERS = ['GGAL', 'YPFD', 'PAMP', 'BMA', 'TXAR', 'CEPU'];

interface Quote {
    ticker: string;
    closes: number[];
}

const STEPS: Array<[string, string]> = [
    ['Contás cómo invertís', `${questions.length} preguntas cortas definen tu perfil: conservador, moderado o agresivo.`],
    ['Cargás tu cartera', 'Elegís las acciones del Merval que tenés y cuántas. Se puede cambiar cuando quieras.'],
    ['Mirás qué estiman los modelos', 'Para cada acción ves si los modelos esperan suba o baja, con qué confianza y por qué.'],
];

const FEATURES: Array<[IconName, string, string]> = [
    ['home', 'Resumen de tu cartera', 'Cuánto vale, cuánto ganaste y cómo te fue contra un plazo fijo o el dólar.'],
    ['candle', 'Análisis de cada acción', 'Precio, proyección con su rango probable y qué dice cada modelo, explicado.'],
    ['scale', 'Rebalanceo', 'Cómo podría reacomodarse tu plata según Black-Litterman, con la cuenta paso a paso.'],
    ['list', 'Historial de señales', 'Qué dijeron los modelos en el pasado y si acertaron. Sin esconder los errores.'],
    ['shield', 'Riesgo', 'Cuánto podrías perder en un día malo y qué acciones se mueven juntas.'],
    ['bell', 'Alertas por mail', 'Te avisamos cuando un modelo cambia de opinión sobre una acción que seguís.'],
];

const MODELS = ['LSTM', 'XGBoost', 'Transformer', 'ARIMA', 'Contexto', 'Macro', 'GARCH'];

function useLandingTheme() {
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        try {
            return window.localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
        } catch {
            return 'dark';
        }
    });
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            window.localStorage.setItem('theme', theme);
        } catch {
            /* modo privado */
        }
    }, [theme]);
    return [theme, setTheme] as const;
}

function App() {
    const location = useLocation();
    const navigate = useNavigate();
    // Se lee una sola vez: el popup arranca abierto pero el estado no debe
    // sobrevivir a un refresh.
    const [landingState] = useState<LandingState>(
        () => (location.state as LandingState | null) ?? {},
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [introduction, setIntroduction] = useState<Introduction | null>(null);
    const [isSignUpOpen, setIsSignUpOpen] = useState<boolean>(false);
    const [isLoginOpen, setIsLoginOpen] = useState<boolean>(
        landingState.login !== undefined,
    );
    const [tickers, setTickers] = useState<string[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [theme, setTheme] = useLandingTheme();

    useEffect(() => {
        helloEndpoint(setIntroduction, setError, setLoading);
        getAllSharesEndpoint().then(
            (res) => setTickers(res.shares.map((s) => s.ticker).filter(Boolean)),
            () => setTickers([]),
        );
        Promise.allSettled(LEADERS.map((t) => shareInfoEndpoint({ share: t }))).then((res) => {
            const out: Quote[] = [];
            res.forEach((r, k) => {
                if (r.status !== 'fulfilled') return;
                const closes = (r.value.data ?? [])
                    .map((d) => Number(d.close_amount))
                    .filter((v) => Number.isFinite(v) && v > 0);
                if (closes.length > 5) out.push({ ticker: LEADERS[k], closes });
            });
            setQuotes(out);
        });
    }, []);

    useEffect(() => {
        if (location.state) {
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location, navigate]);

    const tape = quotes.length
        ? quotes.map((q) => {
              const last = q.closes[q.closes.length - 1];
              const prev = q.closes[q.closes.length - 6];
              return { t: q.ticker, last, chg: ((last - prev) / prev) * 100 };
          })
        : tickers.map((t) => ({ t, last: null as number | null, chg: null as number | null }));
    const tapeRow = (suffix: string) =>
        tape.map((i) => (
            <span className="nx-tape-item" key={i.t + suffix}>
                <b>{i.t}</b>
                {i.last != null && <span>{i.last.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>}
                {i.chg != null && (
                    <span className={i.chg >= 0 ? 'nx-up' : 'nx-down'}>
                        {i.chg >= 0 ? '▲' : '▼'} {Math.abs(i.chg).toFixed(1).replace('.', ',')}%
                    </span>
                )}
            </span>
        ));

    const status = loading ? 'Conectando…' : error ? 'Servidor sin respuesta' : (introduction?.message ?? 'En línea');

    return (
        <div className="nx-landing">
            <div className="nx-bg-glow" />
            <div className="nx-bg-grid" />
            <header className="nx-land-top">
                <span className="nx-brand">
                    <span className="nx-brand-mark">
                        <Icon name="trend" />
                    </span>
                    <span className="nx-brand-name">
                        Financi<b>Ar</b>
                    </span>
                </span>
                <nav className="nx-land-nav" aria-label="Secciones de la portada">
                    <a href="#como-funciona">Cómo funciona</a>
                    <a href="#que-vas-a-ver">Qué vas a ver</a>
                    <a href="#modelos">Los modelos</a>
                </nav>
                <div className="nx-spacer" />
                <button
                    type="button"
                    className="nx-icon-btn"
                    aria-label="Cambiar tema claro u oscuro"
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                >
                    <Icon name={theme === 'light' ? 'moon' : 'sun'} />
                </button>
                <button type="button" className="nx-btn" onClick={() => setIsLoginOpen(true)}>
                    Ingresar
                </button>
                <button type="button" className="nx-btn primary" onClick={() => setIsSignUpOpen(true)}>
                    Crear cuenta
                </button>
            </header>

            {tape.length > 0 && (
                <div className="nx-tape" aria-label="Acciones del Merval">
                    <div className="nx-tape-lbl">{quotes.length ? 'ÚLTIMO CIERRE · SEMANA' : 'S&P MERVAL'}</div>
                    <div className="nx-tape-win">
                        <div className="nx-tape-track">
                            {tapeRow('a')}
                            {tapeRow('b')}
                        </div>
                    </div>
                </div>
            )}

            <main className="nx-land-main">
                <section className="nx-card nx-hero nx-land-hero nx-rv">
                    <Suspense fallback={<div className="nx-hero-orb" />}>
                        <HeroMonitor series={quotes.length ? quotes.map((q) => ({ name: q.ticker, closes: q.closes })) : LEADERS.map((t) => ({ name: t, closes: [] }))} />
                    </Suspense>
                    <div className="nx-hero-txt">
                        <div className="nx-eyebrow">Trabajo Profesional · Ingeniería en Informática · FIUBA</div>
                        <h1>Señales de tendencia para el S&amp;P Merval</h1>
                        <p>
                            FinanciAr cruza precios históricos, indicadores técnicos y el contexto del mercado argentino con varios
                            modelos de machine learning para mostrarte, acción por acción, qué esperan los modelos y qué tan seguido
                            acertaron en el pasado.
                        </p>
                        <div className="nx-actions">
                            <button type="button" className="nx-btn primary" onClick={() => setIsSignUpOpen(true)}>
                                <Icon name="plus" /> Crear cuenta gratis
                            </button>
                            <button type="button" className="nx-btn" onClick={() => setIsLoginOpen(true)}>
                                Ya tengo cuenta
                            </button>
                        </div>
                    </div>
                </section>

                <section id="como-funciona" className="nx-land-sec">
                    <div className="nx-eyebrow">Cómo funciona</div>
                    <h2>En tres pasos</h2>
                    <div className="nx-grid">
                        {STEPS.map(([t, d], k) => (
                            <article className="nx-card s4 nx-rv nx-land-step" key={t}>
                                <span className="nx-land-num">{k + 1}</span>
                                <h3>{t}</h3>
                                <p>{d}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section id="que-vas-a-ver" className="nx-land-sec">
                    <div className="nx-eyebrow">Qué vas a ver</div>
                    <h2>Todo explicado, sin caja negra</h2>
                    <p className="nx-land-lead">
                        Cada número tiene una "i" que explica qué significa en palabras simples. No hace falta saber de finanzas.
                    </p>
                    <div className="nx-grid">
                        {FEATURES.map(([icon, t, d]) => (
                            <article className="nx-card s4 nx-rv nx-land-feat" key={t}>
                                <span className="nx-land-ic">
                                    <Icon name={icon} />
                                </span>
                                <h3>{t}</h3>
                                <p>{d}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section id="modelos" className="nx-land-sec">
                    <div className="nx-grid">
                        <article className="nx-card s7 nx-rv">
                            <div className="nx-eyebrow">Los modelos</div>
                            <h2>Varios modelos, una lectura combinada</h2>
                            <p className="nx-land-lead">
                                Cada modelo mira la acción de una forma distinta. Después se combinan, pesando más a los que mejor
                                acertaron con esa acción en el pasado.
                            </p>
                            <div className="nx-chips">
                                {MODELS.map((m) => (
                                    <span className="nx-chip" key={m}>
                                        {m}
                                    </span>
                                ))}
                            </div>
                        </article>
                        <article className="nx-card s5 nx-rv">
                            <div className="nx-eyebrow">Con los pies en la tierra</div>
                            <h2>Medimos cuánto aciertan</h2>
                            <p className="nx-land-lead">
                                Antes de mostrar una señal, cada modelo se prueba contra el pasado, como si no supiera qué pasó
                                después. Predecir la bolsa es difícil: por eso te mostramos la probabilidad y el historial de
                                aciertos, no solo una palabra.
                            </p>
                        </article>
                    </div>
                </section>

                <div className="nx-legal" role="note">
                    <Icon name="alert" size={22} />
                    <div>
                        <b className="t">No es una recomendación de inversión.</b>
                        {LEGAL_TEXT}
                    </div>
                </div>
            </main>

            <footer className="nx-land-foot">
                <div>
                    <b>FinanciAr</b> — Trabajo Profesional de Ingeniería en Informática, FIUBA · Grupo 186
                    <br />
                    Amigo Rey · Torres · Valsagna Indri · Morales — Director: Ing. Diego García Jaime
                </div>
                <span className="nx-land-status">
                    <span className={`nx-dot ${error ? 'err' : loading ? 'off' : ''}`} />
                    {status}
                </span>
            </footer>

            <SignUpPopUp isOpen={isSignUpOpen} onClose={() => setIsSignUpOpen(false)} />
            <LoginPopUp
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
                initialMode={landingState.login}
                notice={landingNotice(landingState)}
            />
        </div>
    );
}

export default App;
