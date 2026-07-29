import SignInInput from './SignInInput';

interface EmailInputProps {
    field: string;
    setField: (value: string) => void;
}

function EmailInput({ field, setField }: EmailInputProps) {
    return (
        <>
            <SignInInput
                text="Email"
                type="email"
                placeholder="vos@ejemplo.com"
                field={field}
                fieldSetter={setField}
            />
        </>
    );
}
export default EmailInput;
