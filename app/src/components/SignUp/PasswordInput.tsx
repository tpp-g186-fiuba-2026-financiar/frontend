import SignInInput from './SignInInput';

interface PasswordInputProps {
    field: string;
    setField: Function;
}

function PasswordInput({ field, setField }: PasswordInputProps) {
    return (
        <>
            <SignInInput
                text="Password"
                type="password"
                placeholder="••••••••"
                field={field}
                fieldSetter={setField}
            />
        </>
    );
}
export default PasswordInput;
