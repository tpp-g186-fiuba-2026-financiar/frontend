import SignInInput from './SignInInput';

interface ConfirmPasswordInputProps {
    field: string;
    setField: (value: string) => void;
}

function ConfirmPasswordInput({ field, setField }: ConfirmPasswordInputProps) {
    return (
        <>
            <SignInInput
                text="Confirmar contraseña"
                type="password"
                placeholder="••••••••"
                field={field}
                fieldSetter={setField}
            />
        </>
    );
}
export default ConfirmPasswordInput;
