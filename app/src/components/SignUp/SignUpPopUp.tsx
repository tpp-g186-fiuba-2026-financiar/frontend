import { useState } from 'react';
import {
    registerEndpoint,
    type RegisterRequest,
    type RegisterResponse,
} from '../../api/register';
import SignUpForm, { type SignUpFormFields } from './SignUpForm';
import Questionnaire from './InversionQuestionarie';
import { questions } from './questions';
import TermsAndConditions from './TermsAndConditions';

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
    const [step, setStep] = useState<string>('questionarie');

    const closePopUp = () => {
        setName('');
        setRiskType('');
        setEmail('');
        setPassword('');
        setPasswordConfirmation('');
        setResponse(null);
        setStep('questionarie');
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
            const request: RegisterRequest = {
                email: email,
                password: password,
                full_name: name,
                risk_profile: riskType,
            };
            const r = await registerEndpoint(request);
            setResponse(r);
            if (r && r.code == 200) {
                setStep('verify');
            }
        }
    };
    const finishQuestionarie = (answers: Record<number, number>) => {
        setRiskType(getRiskType(answers));
        setStep('terms');
    };
    const finishTerms = () => {
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
                        {step === 'questionarie' && (
                            <Questionnaire
                                questions={questions}
                                finishQuestionarie={finishQuestionarie}
                            />
                        )}
                        {step === 'terms' && (
                            <TermsAndConditions
                                onAccept={finishTerms}
                                onBack={() => setStep('questionarie')}
                            />
                        )}
                        {step === 'form' && (
                            <SignUpForm formFields={signUpFormFields} />
                        )}
                        {step === 'verify' && (
                            <>
                                <div className="modal-body">
                                    <p className="mb-2">
                                        ¡Tu cuenta fue creada! Te enviamos un
                                        mail a <strong>{email}</strong> para
                                        verificarla.
                                    </p>
                                    <p className="mb-0">
                                        Abrí el link del mail para poder
                                        ingresar. Vence en 24 horas.
                                    </p>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        className="btn btn-primary"
                                        onClick={closePopUp}
                                    >
                                        Entendido
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
export default SignUpPopUp;
