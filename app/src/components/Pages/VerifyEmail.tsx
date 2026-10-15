import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmailEndpoint } from '../../api/verifyEmail';

type VerificationStatus = 'loading' | 'success' | 'error';

// Destino del link que llega por mail (/verificar-email?token=...). Confirma
// la cuenta contra el back y avisa si ya se puede ingresar.
function VerifyEmail() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';
    const [status, setStatus] = useState<VerificationStatus>(
        token ? 'loading' : 'error',
    );
    // El token es de un solo uso: evita que StrictMode lo mande dos veces.
    const requested = useRef(false);

    useEffect(() => {
        if (!token || requested.current) return;
        requested.current = true;
        verifyEmailEndpoint(token).then((result) =>
            setStatus(result.ok ? 'success' : 'error'),
        );
    }, [token]);

    return (
        <div className="container py-4">
            <div className="topbar">
                <button
                    type="button"
                    className="wordmark wordmark-link"
                    onClick={() => navigate('/')}
                >
                    Financi<span className="accent">Ar</span>
                </button>
            </div>

            <div className="panel">
                <h2 className="mb-3">Verificación de cuenta</h2>
                {status === 'loading' && <p>Verificando tu cuenta...</p>}
                {status === 'success' && (
                    <p>
                        ¡Listo! Tu cuenta quedó verificada. Ya podés ingresar
                        con tu mail y contraseña.
                    </p>
                )}
                {status === 'error' && (
                    <p>
                        El link de verificación no es válido o ya venció. Si ya
                        verificaste tu cuenta, podés ingresar normalmente; si
                        no, intentá ingresar y pedí un nuevo mail de
                        verificación.
                    </p>
                )}
                {status !== 'loading' && (
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => navigate('/')}
                    >
                        Ir al inicio
                    </button>
                )}
            </div>
        </div>
    );
}

export default VerifyEmail;
