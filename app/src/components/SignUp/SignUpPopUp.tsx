import { useState } from 'react';
import {
    registerEndpoint,
    type RegisterRequest,
    type RegisterResponse,
} from '../../api/register';
import { useNavigate } from 'react-router-dom';
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
        email != '' && password != '' && passwordsMatch && name != '';
    // riskType != '';
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
    const getRiskType = (answers: Record<number, number>): string => {
        const totalScore = Object.values(answers).reduce(
            (sum, score) => sum + score,
            0,
        );
        console.log(totalScore);
        if (totalScore <= 9) {
            return 'conservative';
        } else if (totalScore <= 18) {
            return 'moderate';
        } else {
            return 'aggressive';
        }
    };

    const handleSubmit = async (answers: Record<number, number>) => {
        const riskType = getRiskType(answers);
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
    const [step, setStep] = useState<string>('form');
    const finishForm = () => {
        setStep('questionarie');
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
        finishForm: finishForm,
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
                            <h5 className="modal-title">Sign up</h5>
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
                                handleSubmit={handleSubmit}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
export default SignUpPopUp;

//  return (
//         <>
//             <div className="modal-backdrop fade show" onClick={closePopUp} />
//             <div className="modal d-block fade show" role="dialog">
//                 <div
//                     className="modal-dialog modal-dialog-centered"
//                     onClick={(e) => e.stopPropagation()}
//                 >
//                     <div className="modal-content">
//                         <div className="modal-header">
//                             <h5 className="modal-title">
//                                 {step === 'form' ? 'Sign up' : `Question ${currentQuestion + 1} of ${questions.length}`}
//                             </h5>
//                             <button
//                                 className="btn-close"
//                                 onClick={closePopUp}
//                                 aria-label="Close"
//                             />
//                         </div>

//                         <div className="modal-body text-start">
//                             {step === 'form' && (
//                                 <>
//                                     <NameInput field={name} setField={setName} />
//                                     <RiskSelector value={riskType} setField={setRiskType} />
//                                     <EmailInput field={email} setField={setEmail} />
//                                     <PasswordInput field={password} setField={setPassword} />
//                                     <ConfirmPasswordInput
//                                         field={passwordConfirmation}
//                                         setField={setPasswordConfirmation}
//                                     />
//                                     <SignInErrorSpan
//                                         passwordsMatch={passwordsMatch}
//                                         response={response}
//                                     />
//                                 </>
//                             )}

//                             {step === 'questionnaire' && (
//                                 <>
//                                     <p className="text-secondary mb-3">
//                                         {questions[currentQuestion].text}
//                                     </p>
//                                     <div className="d-flex flex-column gap-2">
//                                         {questions[currentQuestion].options.map((option) => (
//                                             <button
//                                                 key={option}
//                                                 className={`btn ${answers[questions[currentQuestion].id] === option ? 'btn-primary' : 'btn-outline-secondary'}`}
//                                                 onClick={() => handleSelectAnswer(option)}
//                                             >
//                                                 {option}
//                                             </button>
//                                         ))}
//                                     </div>
//                                 </>
//                             )}
//                         </div>

//                         <div className="modal-footer">
//                             {step === 'form' ? (
//                                 <>
//                                     <button className="btn btn-secondary" onClick={closePopUp}>
//                                         Cancel
//                                     </button>
//                                     <button
//                                         className="btn btn-primary"
//                                         onClick={() => setStep('questionnaire')}
//                                         disabled={!canSubmit}
//                                     >
//                                         Next
//                                     </button>
//                                 </>
//                             ) : (
//                                 <>
//                                     <button
//                                         className="btn btn-secondary"
//                                         onClick={() => currentQuestion === 0 ? setStep('form') : setCurrentQuestion((prev) => prev - 1)}
//                                     >
//                                         Back
//                                     </button>
//                                     <button
//                                         className="btn btn-primary"
//                                         onClick={handleNext}
//                                         disabled={!answers[questions[currentQuestion].id]}
//                                     >
//                                         {currentQuestion === questions.length - 1 ? 'Confirm' : 'Next'}
//                                     </button>
//                                 </>
//                             )}
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </>
//     );
