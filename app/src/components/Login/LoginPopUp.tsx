import { useNavigate } from 'react-router-dom';
import EmailInput from '../SignUp/EmailInput';
import PasswordInput from '../SignUp/PasswordInput';
import {
    loginEndpoint,
    type LoginRequest,
    type LoginResponse,
} from '../../api/login';
import LoginErrorSpan from './LoginErrorSpan';
import { resendVerificationEndpoint } from '../../api/verifyEmail';
import { forgotPasswordEndpoint } from '../../api/passwordReset';
import { useState } from 'react';

// 'forgot' muestra el formulario para pedir el mail de reseteo de contrasena.
export type LoginMode = 'login' | 'forgot';

interface LoginPopUpProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: LoginMode;
    // Aviso que se muestra arriba del formulario (p. ej. despues de cambiar
    // la contrasena).
    notice?: string;
}

function LoginPopUp({
    isOpen,
    onClose,
    initialMode = 'login',
    notice,
}: LoginPopUpProps) {
    // const [response, setResponse] = useState<RegisterResponse | null>(null);
    const navigate = useNavigate();
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [response, setResponse] = useState<LoginResponse | null>(null);
    const [totpCode, setTotpCode] = useState<string>('');
    const twoFactorRequired = response?.two_factor_required === true;
    const emailVerificationRequired =
        response?.email_verification_required === true;
    const [resendStatus, setResendStatus] = useState<'idle' | 'sent' | 'error'>(
        'idle',
    );
    const [mode, setMode] = useState<LoginMode>(initialMode);
    const [noticeVisible, setNoticeVisible] = useState<boolean>(!!notice);
    const [forgotStatus, setForgotStatus] = useState<
        'idle' | 'sending' | 'sent' | 'error'
    >('idle');
    const canSubmit =
        email != '' && password != '' && (!twoFactorRequired || totpCode != '');
    const canRequestReset =
        email.trim() != '' &&
        forgotStatus !== 'sending' &&
        forgotStatus !== 'sent';
    const closePopUp = () => {
        setEmail('');
        setPassword('');
        setTotpCode('');
        setResponse(null);
        setResendStatus('idle');
        setMode('login');
        setNoticeVisible(false);
        setForgotStatus('idle');
        onClose();
    };

    const switchMode = (next: LoginMode) => {
        setMode(next);
        setResponse(null);
        setPassword('');
        setTotpCode('');
        setNoticeVisible(false);
        setForgotStatus('idle');
    };

    const handleForgot = async () => {
        setForgotStatus('sending');
        const ok = await forgotPasswordEndpoint(email.trim());
        setForgotStatus(ok ? 'sent' : 'error');
    };

    const handleResend = async () => {
        const ok = await resendVerificationEndpoint(email.trim());
        setResendStatus(ok ? 'sent' : 'error');
    };

    const handleSubmit = async () => {
        const request: LoginRequest = {
            email: email,
            password: password,
            ...(twoFactorRequired ? { totp_code: totpCode.trim() } : {}),
        };
        const r = await loginEndpoint(request);
        setResponse(r);
        if (r && r.code == 200) {
            localStorage.setItem('token', r.token);
            closePopUp();
            navigate('/home');
        }
    };

    if (!isOpen) return null;
    return (
        <>
            <div className="modal-backdrop fade show" onClick={closePopUp} />

            <div className="modal d-block fade show" role="dialog">
                <div
                    className="modal-dialog modal-dialog-centered"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                {mode === 'forgot'
                                    ? 'Recuperar contraseña'
                                    : 'Ingresar'}
                            </h5>
                            <button
                                className="btn-close"
                                onClick={closePopUp}
                                aria-label="Close"
                            />
                        </div>
                        {mode === 'forgot' ? (
                            <div className="modal-body">
                                <p className="form-text">
                                    Ingresá el mail de tu cuenta y te enviamos
                                    un link para elegir una nueva contraseña.
                                </p>
                                <EmailInput field={email} setField={setEmail} />
                                {forgotStatus === 'sent' && (
                                    <span className="form-text d-block">
                                        Si hay una cuenta con ese mail, te
                                        enviamos un link para restablecer la
                                        contraseña. Revisá tu bandeja de entrada
                                        (y la carpeta de spam); el link vence en
                                        1 hora.
                                    </span>
                                )}
                                {forgotStatus === 'error' && (
                                    <span className="form-text text-danger d-block">
                                        No se pudo enviar el mail. Intentá de
                                        nuevo más tarde.
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="modal-body">
                                {noticeVisible && (
                                    <div className="alert alert-info py-2">
                                        {notice}
                                    </div>
                                )}
                                <EmailInput field={email} setField={setEmail} />
                                <PasswordInput
                                    field={password}
                                    setField={setPassword}
                                />
                                <button
                                    type="button"
                                    className="btn btn-link p-0 mb-2"
                                    onClick={() => switchMode('forgot')}
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                                {twoFactorRequired && (
                                    <div className="mb-3">
                                        <label
                                            htmlFor="totp-code"
                                            className="form-label"
                                        >
                                            Código de verificación
                                        </label>
                                        <input
                                            id="totp-code"
                                            className="form-control"
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            maxLength={6}
                                            placeholder="123456"
                                            value={totpCode}
                                            onChange={(e) =>
                                                setTotpCode(e.target.value)
                                            }
                                        />
                                        <span className="form-text">
                                            Ingresá el código de 6 dígitos de tu
                                            app autenticadora.
                                        </span>
                                    </div>
                                )}
                                {emailVerificationRequired ? (
                                    <div className="mb-3">
                                        <span className="form-text text-danger d-block">
                                            Tenés que verificar tu mail antes de
                                            ingresar. Revisá tu bandeja de
                                            entrada (y la carpeta de spam).
                                        </span>
                                        {resendStatus === 'sent' ? (
                                            <span className="form-text d-block">
                                                Te enviamos un nuevo mail de
                                                verificación.
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                className="btn btn-link p-0"
                                                onClick={handleResend}
                                            >
                                                Reenviar mail de verificación
                                            </button>
                                        )}
                                        {resendStatus === 'error' && (
                                            <span className="form-text text-danger d-block">
                                                No se pudo reenviar el mail.
                                                Intentá de nuevo más tarde.
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <LoginErrorSpan response={response} />
                                )}
                            </div>
                        )}
                        {mode === 'forgot' ? (
                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => switchMode('login')}
                                >
                                    Volver
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleForgot}
                                    disabled={!canRequestReset}
                                >
                                    Enviar link
                                </button>
                            </div>
                        ) : (
                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={closePopUp}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSubmit}
                                    disabled={!canSubmit}
                                >
                                    Ingresar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
export default LoginPopUp;
