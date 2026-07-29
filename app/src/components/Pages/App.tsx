import { useEffect, useState } from 'react';
import '../../css/App.css';
import SignUpPopUp from '../SignUp/SignUpPopUp';
import { helloEndpoint, type Introduction } from '../../api/hello';
import LoginPopUp from '../Login/LoginPopUp';

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
        <>
            <div className="p-1"></div>
            <div className="container">
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
                <p style={{ color: 'var(--ink-3)', maxWidth: '60ch' }}>
                    Plataforma informativa de señales de tendencia (alza/baja,
                    sobrecompra/sobreventa) para acciones del S&amp;P Merval.
                    Trabajo Profesional de Ingeniería en Informática, FIUBA —
                    Grupo 186.
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
            <div className="p-1"></div>
            <div className="container">
                <h3>{introduction?.message}</h3>
            </div>
        </>
    );
}

export default App;
