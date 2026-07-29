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
                    <h3>Varios modelos</h3>
                    <p>
                        LSTM, XGBoost, Transformer y ARIMA corren en paralelo
                        sobre cada acción del Merval.
                    </p>
                </div>
                <div className="feature">
                    <h3>Señales claras</h3>
                    <p>
                        Alza, baja, sobrecompra o sobreventa por ticker — sin
                        caja negra.
                    </p>
                </div>
                <div className="feature">
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

            <p
                className="mt-3"
                style={{ color: 'var(--ink-3)', fontSize: '13px' }}
            >
                {introduction?.message}
            </p>

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
