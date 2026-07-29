import SignInInput from './SignInInput';

interface NameInputProps {
    field: string;
    setField: (value: string) => void;
}

function NameInput({ field, setField }: NameInputProps) {
    return (
        <>
            <SignInInput
                text="Nombre"
                type=""
                placeholder="Juan Pérez"
                field={field}
                fieldSetter={setField}
            />
        </>
    );
}
export default NameInput;
