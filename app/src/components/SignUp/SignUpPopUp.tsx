import { useState } from 'react';
import PasswordInput from './PasswordInput';
import ConfirmPasswordInput from './ConfirmPasswordInput';
import EmailInput from './EmailInput';
import RiskSelector from './RiskSelector';
import NameInput from './NameInput';
import {
    registerEndpoint,
    type RegisterRequest,
    type RegisterResponse,
} from '../../api/register';
// import { parseRegisterResponse, registerEndpoint, RegisterResponses } from "../schemas/register";
import SignInErrorSpan from './../SignUp/SignInErrorSpan';
import { useNavigate } from 'react-router-dom';

interface SignUpProps {
    isOpen: boolean;
    onClose: () => void;
}

function SignUpPopUp({ isOpen, onClose }: SignUpProps) {
    const [name, setName] = useState<string>('');
    const [riskType, setRiskType] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [passwordConfirmation, setPasswordConfirmation] =
        useState<string>('');
    const passwordsMatch = password === passwordConfirmation;
    const canSubmit =
        email != '' &&
        password != '' &&
        passwordsMatch &&
        name != '' &&
        riskType != '';
    const [response, setResponse] = useState<RegisterResponse | null>(null);
    const navigate = useNavigate();
    const closePopUp = () => {
        setName('');
        setRiskType('');
        setEmail('');
        setPassword('');
        setPasswordConfirmation('');
        setResponse(null);
        onClose();
    };

    const handleSubmit = async () => {
        if (email) {
            const request: RegisterRequest = {
                email: email,
                password: password,
                full_name: name,
                risk_profile: riskType,
            };
            const r = await registerEndpoint(request);
            setResponse(r);
            if (r && r.code == 200) {
                navigate('/home');
            }
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
                            <h5 className="modal-title">Sign up</h5>
                            <button
                                className="btn-close"
                                onClick={closePopUp}
                                aria-label="Close"
                            />
                        </div>
                        <div className="modal-body">
                            <NameInput field={name} setField={setName} />
                            <RiskSelector
                                value={riskType}
                                setField={setRiskType}
                            />
                            <EmailInput field={email} setField={setEmail} />
                            <PasswordInput
                                field={password}
                                setField={setPassword}
                            />
                            <ConfirmPasswordInput
                                field={passwordConfirmation}
                                setField={setPasswordConfirmation}
                            />
                            <SignInErrorSpan
                                passwordsMatch={passwordsMatch}
                                response={response}
                            />
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
export default SignUpPopUp;
