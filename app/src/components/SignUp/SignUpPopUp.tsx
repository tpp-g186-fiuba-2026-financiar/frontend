import { useState } from 'react';
import {
    registerEndpoint,
    type RegisterRequest,
    type RegisterResponse,
} from '../../api/register';
import SignUpForm, { type SignUpFormFields } from './SignUpForm';
import Questionnaire from './InversionQuestionarie';
import { questions } from './questions';

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
    const closePopUp = () => {
        setName('');
        setRiskType('');
        setEmail('');
        setPassword('');
        setPasswordConfirmation('');
        setResponse(null);
        onClose();
    };
    const getRiskType = (answers: Record<number, number>): string => {
        const totalScore = Object.values(answers).reduce(
            (sum, score) => sum + score,
            0,
        );
        if (totalScore <= 9) {
            return 'conservative';
        } else if (totalScore <= 18) {
            return 'moderate';
        } else {
            return 'aggressive';
        }
    };

    const handleSubmit = async () => {
        if (email) {
            console.log('Entra');
            const request: RegisterRequest = {
                email: email,
                password: password,
                full_name: name,
                risk_profile: riskType,
            };
            const r = await registerEndpoint(request);
            setResponse(r);
            if (r && r.code == 200) {
                closePopUp();
            }
        }
    };
    const [step, setStep] = useState<string>('questionarie');
    const finishQuestionarie = (answers: Record<number, number>) => {
        setRiskType(getRiskType(answers));
        setStep('form');
    };

    const signUpFormFields: SignUpFormFields = {
        name: name,
        setName: setName,
        riskType: riskType,
        setRiskType: setRiskType,
        email: email,
        setEmail: setEmail,
        password: password,
        setPassword: setPassword,
        passwordConfirmation: passwordConfirmation,
        setPasswordConfirmation: setPasswordConfirmation,
        passwordsMatch: passwordsMatch,
        response: response,
        closePopUp: closePopUp,
        handleSubmit: handleSubmit,
        canSubmit: canSubmit,
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
                            <h5 className="modal-title">Crear cuenta</h5>
                            <button
                                className="btn-close"
                                onClick={closePopUp}
                                aria-label="Close"
                            />
                        </div>
                        {step === 'form' && (
                            <SignUpForm formFields={signUpFormFields} />
                        )}
                        {step === 'questionarie' && (
                            <Questionnaire
                                questions={questions}
                                finishQuestionarie={finishQuestionarie}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
export default SignUpPopUp;
