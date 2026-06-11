import type { RegisterResponse } from '../../api/register';
import ErrorSpan from '../SignUp/ErrorSpan';

const SUCESSFUL_REQUEST = 200;
interface LoginErrorSpanProps {
    response: RegisterResponse | null;
}

function LoginErrorSpan({ response }: LoginErrorSpanProps) {
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

export default LoginErrorSpan;
