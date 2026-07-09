import type { RegisterResponse } from '../../api/register';
import ConfirmPasswordInput from './ConfirmPasswordInput';
import EmailInput from './EmailInput';
import NameInput from './NameInput';
import PasswordInput from './PasswordInput';
import SignInErrorSpan from './SignInErrorSpan';

export interface SignUpFormFields {
    name: string;
    setName: (value: string) => void;
    riskType: string;
    setRiskType: (value: string) => void;
    email: string;
    setEmail: (value: string) => void;
    password: string;
    setPassword: (value: string) => void;
    passwordConfirmation: string;
    setPasswordConfirmation: (value: string) => void;
    passwordsMatch: boolean;
    response: RegisterResponse | null;
    closePopUp: () => void;
    finishForm: () => void;
    canSubmit: boolean;
}
interface SignUpFormProps {
    formFields: SignUpFormFields;
}

function SignUpForm({ formFields }: SignUpFormProps) {
    return (
        <div className="modal-body">
            <NameInput field={formFields.name} setField={formFields.setName} />
            {/* <RiskSelector
                                value={formFields.riskType}
                                setField={formFields.setRiskType}
                            /> */}
            <EmailInput
                field={formFields.email}
                setField={formFields.setEmail}
            />
            <PasswordInput
                field={formFields.password}
                setField={formFields.setPassword}
            />
            <ConfirmPasswordInput
                field={formFields.passwordConfirmation}
                setField={formFields.setPasswordConfirmation}
            />
            <SignInErrorSpan
                passwordsMatch={formFields.passwordsMatch}
                response={formFields.response}
            />
            <div className="modal-footer">
                <button
                    className="btn btn-secondary"
                    onClick={formFields.closePopUp}
                >
                    Cancel
                </button>
                <button
                    className="btn btn-primary"
                    onClick={formFields.finishForm}
                    disabled={!formFields.canSubmit}
                >
                    Confirm
                </button>
            </div>
        </div>
    );
}

export default SignUpForm;
