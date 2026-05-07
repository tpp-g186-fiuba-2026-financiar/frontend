import SignInInput from './SignInInput';

interface EmailInputProps {
    field: string;
    setField: Function;
}

function EmailInput({ field, setField }: EmailInputProps) {
    return (
        <>
            <SignInInput
                text="Email"
                type="email"
                placeholder="you@example.com"
                field={field}
                fieldSetter={setField}
            />
        </>
    );
}
export default EmailInput;
