interface SingInInputProps {
    text: string;
    type: string;
    placeholder: string;
    field: string;
    fieldSetter: Function;
}

function SignInInput({
    text,
    type,
    placeholder,
    field,
    fieldSetter,
}: SingInInputProps) {
    return (
        <>
            <div className="mb-2">
                <label className="form-label">{text}</label>
                <input
                    className="form-control"
                    type={type}
                    placeholder={placeholder}
                    value={field}
                    onChange={(e) => fieldSetter(e.target.value)}
                />
            </div>
        </>
    );
}
export default SignInInput;
