import { useNavigate } from 'react-router-dom';
import EmailInput from '../SignUp/EmailInput';
import PasswordInput from '../SignUp/PasswordInput';
import {
    loginEndpoint,
    type LoginRequest,
    type LoginResponse,
} from '../../schemas/login';
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
    const canSubmit = email != '' && password != '';
    const [response, setResponse] = useState<LoginResponse | null>(null);
    const closePopUp = () => {
        setEmail('');
        setPassword('');
        setResponse(null);
        onClose();
    };

    const handleSubmit = async () => {
        const request: LoginRequest = {
            email: email,
            password: password,
        };
        const r = await loginEndpoint(request);
        setResponse(r);
        if (r && r.code == 200) {
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
                            <h5 className="modal-title">Login</h5>
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
                            <LoginErrorSpan response={response} />
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={closePopUp}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
export default LoginPopUp;
