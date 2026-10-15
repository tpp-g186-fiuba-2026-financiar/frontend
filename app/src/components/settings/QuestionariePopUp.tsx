import { useState } from 'react';
import Questionnaire from '../SignUp/InversionQuestionarie';
import { questions } from '../SignUp/questions';
import {
    updateProfileEndpoint,
    type ProfileUpdateRequest,
} from '../../api/user/updateProfile';

interface QuestionariePopUpProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    // Sin cerrar con la X ni el fondo: el usuario tiene que completarlo.
    dismissible?: boolean;
    onCompleted?: (risk: string) => void;
}

function QuestionariePopUp({
    isOpen,
    onClose,
    title = 'Editar perfil de riesgo',
    description,
    dismissible = true,
    onCompleted,
}: QuestionariePopUpProps) {
    const [error, setError] = useState<string | null>(null);
    const closePopUp = () => {
        setError(null);
        onClose();
    };
    const dismiss = () => {
        if (dismissible) closePopUp();
    };
    const getRiskType = (answers: Record<number, number>): string => {
        const totalScore = Object.values(answers).reduce(
            (sum, score) => sum + score,
            0,
        );
        if (totalScore <= 9) {
            return 'conservative';
        } else if (totalScore <= 18) {
            return 'moderate';
        } else {
            return 'aggressive';
        }
    };
    const finishQuestionarie = (answers: Record<number, number>) => {
        const risk = getRiskType(answers);
        handleSubmit(risk);
    };
    const handleSubmit = async (risk: string) => {
        const request: ProfileUpdateRequest = { risk_profile: risk };
        try {
            const r = await updateProfileEndpoint(request);
            if (r && r.code == 200) {
                onCompleted?.(risk);
                closePopUp();
                return;
            }
        } catch {
            // se informa abajo
        }
        setError('No se pudo guardar tu perfil. Intentá de nuevo.');
    };
    return (
        <>
            {isOpen && (
                <>
                    <div
                        className="modal-backdrop fade show"
                        onClick={dismiss}
                    />

                    <div className="modal d-block fade show" role="dialog">
                        <div
                            className="modal-dialog modal-dialog-centered"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">{title}</h5>
                                    {dismissible && (
                                        <button
                                            className="btn-close"
                                            onClick={closePopUp}
                                            aria-label="Close"
                                        />
                                    )}
                                </div>
                                {description && (
                                    <p className="px-3 pt-3 mb-0">
                                        {description}
                                    </p>
                                )}
                                {error && (
                                    <div
                                        className="alert alert-danger mx-3 mt-3 mb-0"
                                        role="alert"
                                    >
                                        {error}
                                    </div>
                                )}
                                <Questionnaire
                                    questions={questions}
                                    finishQuestionarie={finishQuestionarie}
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
export default QuestionariePopUp;
