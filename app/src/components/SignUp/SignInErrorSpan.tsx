import type { RegisterResponse } from '../../api/register';
import ErrorSpan from './ErrorSpan';

const SUCESSFUL_REQUEST = 200;
interface ErrorSpanProps {
    passwordsMatch: boolean;
    response: RegisterResponse | null;
}

function SignInErrorSpan({ passwordsMatch, response }: ErrorSpanProps) {
    if (!passwordsMatch) {
        return (
            <>
                <ErrorSpan
                    errorMsg="Las contraseñas no coinciden."
                    condition={passwordsMatch}
                />
            </>
        );
    }
    if (response) {
        switch (response.code) {
            case SUCESSFUL_REQUEST:
                return <></>;
            default:
                return (
                    <>
                        <ErrorSpan
                            errorMsg={response.message}
                            condition={false}
                        />
                    </>
                );
        }
    }
    return <></>;
}

export default SignInErrorSpan;
