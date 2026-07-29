import { useEffect, useState } from 'react';
import '../../css/App.css';
import SignUpPopUp from '../SignUp/SignUpPopUp';
import { helloEndpoint, type Introduction } from '../../api/hello';
import LoginPopUp from '../Login/LoginPopUp';
import TickerTape from '../Layout/TickerTape';

function App() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [introduction, setIntroduction] = useState<Introduction | null>(null);
    const [isSignUpOpen, setIsSignUpOpen] = useState<boolean>(false);
    const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);

    useEffect(() => {
        helloEndpoint(setIntroduction, setError, setLoading);
    }, []);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;
    return (
        <div className="container py-4">
            <TickerTape />

            <div className="row align-items-center mb-4">
                <div className="col">
                    <span className="wordmark">
                        Financi<span className="accent">Ar</span>
                    </span>
                </div>
                <div className="col-auto">
                    <button
                        className="btn btn-primary me-2"
                        onClick={() => setIsSignUpOpen(true)}
                    >
                        Crear cuenta
                    </button>
                    <button
                        className="btn btn-outline-light"
                        onClick={() => setIsLoginOpen(true)}
                    >
                        Ingresar
                    </button>
                </div>
            </div>

            <h1 className="mb-3" style={{ fontSize: '32px' }}>
                Señales de tendencia para el S&amp;P Merval
            </h1>
            <p
                className="mb-4"
                style={{ color: 'var(--ink-3)', maxWidth: '65ch' }}
            >
                FinanciAr cruza precios históricos e indicadores técnicos con
                varios modelos de machine learning para mostrarte, acción por
                acción, si está en alza, en baja, en sobrecompra o en
                sobreventa. Trabajo Profesional de Ingeniería en Informática,
                FIUBA — Grupo 186.
            </p>

            <div className="feature-row mb-4">
                <div className="feature">
                    <div className="feature-icon">
                        <svg width="18" height="18" viewBox="0 0 20 20">
                            <rect
                                x="1"
                                y="10"
                                width="4"
                                height="9"
                                rx="1"
                                fill="var(--accent)"
                            />
                            <rect
                                x="8"
                                y="5"
                                width="4"
                                height="14"
                                rx="1"
                                fill="var(--accent-2)"
                            />
                            <rect
                                x="15"
                                y="8"
                                width="4"
                                height="11"
                                rx="1"
                                fill="var(--accent)"
                            />
                        </svg>
                    </div>
                    <h3>Varios modelos</h3>
                    <p>
                        LSTM, XGBoost, Transformer y ARIMA corren en paralelo
                        sobre cada acción del Merval.
                    </p>
                </div>
                <div className="feature">
                    <div className="feature-icon">
                        <svg width="18" height="18" viewBox="0 0 20 20">
                            <path
                                d="M2 14 L7 8 L11 11 L18 3"
                                fill="none"
                                stroke="var(--up)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M13 3 H18 V8"
                                fill="none"
                                stroke="var(--up)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <h3>Señales claras</h3>
                    <p>
                        Alza, baja, sobrecompra o sobreventa por ticker — sin
                        caja negra.
                    </p>
                </div>
                <div className="feature">
                    <div className="feature-icon">
                        <svg width="18" height="18" viewBox="0 0 20 20">
                            <circle
                                cx="10"
                                cy="10"
                                r="8"
                                fill="none"
                                stroke="var(--accent)"
                                strokeWidth="2"
                            />
                            <circle
                                cx="10"
                                cy="10"
                                r="3"
                                fill="var(--accent-2)"
                            />
                        </svg>
                    </div>
                    <h3>Tu cartera, tu perfil</h3>
                    <p>
                        Declarás qué acciones tenés y tu perfil de riesgo una
                        sola vez.
                    </p>
                </div>
            </div>

            <p style={{ color: 'var(--ink-3)', fontSize: '13px' }}>
                FinanciAr es una herramienta informativa. No constituye
                asesoramiento financiero ni una recomendación de inversión.
            </p>

            <footer className="site-footer">
                <div>
                    <b>FinanciAr</b> — Trabajo Profesional de Ingeniería en
                    Informática, FIUBA
                    <br />
                    Amigo Rey · Torres · Valsagna Indri · Morales — Director:
                    Ing. Diego García Jaime
                </div>
                <span className="status-dot">
                    <span className="livedot" />
                    {introduction?.message}
                </span>
            </footer>

            <SignUpPopUp
                isOpen={isSignUpOpen}
                onClose={() => setIsSignUpOpen(false)}
            />
            <LoginPopUp
                isOpen={isLoginOpen}
                onClose={() => setIsLoginOpen(false)}
            />
        </div>
    );
}

export default App;
