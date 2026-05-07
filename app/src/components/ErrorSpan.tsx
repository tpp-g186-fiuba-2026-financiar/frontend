interface ErrorSpanProps {
    errorMsg: string;
    condition: boolean;
}

function ErrorSpan({ errorMsg, condition }: ErrorSpanProps) {
    return (
        <>
            {!condition && (
                <span className="form-text text-danger">{errorMsg}</span>
            )}
        </>
    );
}

export default ErrorSpan;
