import type { RegisterResponse } from '../../schemas/register';
import ErrorSpan from '../ErrorSpan';

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
                    errorMsg="Passwords do not match."
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
