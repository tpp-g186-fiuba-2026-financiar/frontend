import SignInInput from './SignInInput';

interface NameInputProps {
    field: string;
    setField: Function;
}

function NameInput({ field, setField }: NameInputProps) {
    return (
        <>
            <SignInInput
                text="Name"
                type=""
                placeholder="John Smith"
                field={field}
                fieldSetter={setField}
            />
        </>
    );
}
export default NameInput;
