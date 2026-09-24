import { useNavigate } from 'react-router-dom';
import EmailInput from '../SignUp/EmailInput';
import PasswordInput from '../SignUp/PasswordInput';
import {
    loginEndpoint,
    type LoginRequest,
    type LoginResponse,
} from '../../api/login';
import LoginErrorSpan from './LoginErrorSpan';
import { useState } from 'react';

interface LoginPopUpProps {
    isOpen: boolean;
    onClose: () => void;
}

function LoginPopUp({ isOpen, onClose }: LoginPopUpProps) {
    // const [response, setResponse] = useState<RegisterResponse | null>(null);
    const navigate = useNavigate();
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [response, setResponse] = useState<LoginResponse | null>(null);
    const [totpCode, setTotpCode] = useState<string>('');
    const twoFactorRequired = response?.two_factor_required === true;
    const canSubmit =
        email != '' && password != '' && (!twoFactorRequired || totpCode != '');
    const closePopUp = () => {
        setEmail('');
        setPassword('');
        setTotpCode('');
        setResponse(null);
        onClose();
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
                            <h5 className="modal-title">Ingresar</h5>
                            <button
                                className="btn-close"
                                onClick={closePopUp}
                                aria-label="Close"
                            />
                        </div>
                        <div className="modal-body">
                            <EmailInput field={email} setField={setEmail} />
                            <PasswordInput
                                field={password}
                                setField={setPassword}
                            />
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
                                        Ingresá el código de 6 dígitos de tu app
                                        autenticadora.
                                    </span>
                                </div>
                            )}
                            <LoginErrorSpan response={response} />
                        </div>
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
                    </div>
                </div>
            </div>
        </>
    );
}
export default LoginPopUp;
