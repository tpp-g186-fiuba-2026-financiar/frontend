import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthFrame from '../Layout/AuthFrame';
import { resetPasswordEndpoint } from '../../api/passwordReset';
import PasswordInput from '../SignUp/PasswordInput';
import ConfirmPasswordInput from '../SignUp/ConfirmPasswordInput';
import ErrorSpan from '../SignUp/ErrorSpan';
import type { LandingState } from './App';

const INVALID_TOKEN_MESSAGE = 'Invalid or expired reset token';

// Mensajes del back (en ingles) que se le muestran al usuario.
const BACKEND_MESSAGES: Record<string, string> = {
    'Password must be at least 8 characters long':
        'La contraseña debe tener al menos 8 caracteres.',
    'Password must contain at least one uppercase letter':
        'La contraseña debe tener al menos una mayúscula.',
    'Password must contain at least one lowercase letter':
        'La contraseña debe tener al menos una minúscula.',
    'Password must contain at least one digit':
        'La contraseña debe tener al menos un número.',
    'Password must contain at least one special character':
        'La contraseña debe tener al menos un carácter especial (por ejemplo !, @, # o $).',
};

const GENERIC_ERROR =
    'No se pudo actualizar la contraseña. Intentá de nuevo más tarde.';

// Destino del link que llega por mail (/restore-password?token=...). Pide la
// nueva contraseña y, si el back la acepta, vuelve al inicio con el login
// abierto.
function RestorePassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';
    const [password, setPassword] = useState<string>('');
    const [passwordConfirmation, setPasswordConfirmation] =
        useState<string>('');
    const [invalidToken, setInvalidToken] = useState<boolean>(!token);
    const [error, setError] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);
    const passwordsMatch = password === passwordConfirmation;
    const canSubmit =
        password !== '' &&
        passwordConfirmation !== '' &&
        passwordsMatch &&
        !submitting;

    // Despues de cambiarla se va a /home: si no hay sesion, RequireAuth
    // redirige al inicio con este mismo estado y se abre el login.
    const goTo = (path: string, state: LandingState) =>
        navigate(path, { replace: true, state });

    // Con sesion el inicio redirige a /home, asi que el nuevo link se pide
    // desde Ajustes; sin sesion, desde el popup de login.
    const requestNewLink = () => {
        if (localStorage.getItem('token')) {
            navigate('/ajustes', { replace: true });
        } else {
            goTo('/', { login: 'forgot' });
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError('');
        const result = await resetPasswordEndpoint(token, password);
        setSubmitting(false);
        if (result.ok) {
            goTo('/home', { login: 'login', passwordRestored: true });
        } else if (result.message === INVALID_TOKEN_MESSAGE) {
            setInvalidToken(true);
        } else {
            setError(BACKEND_MESSAGES[result.message] ?? GENERIC_ERROR);
        }
    };

    return (
        <AuthFrame title="Restablecer contraseña">
            {invalidToken ? (
                <>
                    <p>
                        El link para restablecer la contraseña no es válido o ya
                        venció. Recordá que vence en 1 hora y solo se puede usar
                        una vez.
                    </p>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={requestNewLink}
                    >
                        Pedir un nuevo link
                    </button>
                </>
            ) : (
                <>
                    <p>Elegí una nueva contraseña para tu cuenta.</p>
                    <PasswordInput field={password} setField={setPassword} />
                    <ConfirmPasswordInput
                        field={passwordConfirmation}
                        setField={setPasswordConfirmation}
                    />
                    <div className="mb-3">
                        <ErrorSpan
                            errorMsg="Las contraseñas no coinciden."
                            condition={passwordsMatch}
                        />
                        <ErrorSpan errorMsg={error} condition={!error} />
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                    >
                        Cambiar contraseña
                    </button>
                </>
            )}
        </AuthFrame>
    );
}

export default RestorePassword;
