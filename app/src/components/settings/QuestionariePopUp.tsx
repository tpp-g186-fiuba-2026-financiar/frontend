import Questionnaire from '../SignUp/InversionQuestionarie';
import { questions } from '../SignUp/questions';
import {
    updateProfileEndpoint,
    type ProfileUpdateRequest,
} from '../../api/user/updateProfile';

interface QuestionariePopUpProps {
    isOpen: boolean;
    onClose: () => void;
}

function QuestionariePopUp({ isOpen, onClose }: QuestionariePopUpProps) {
    const closePopUp = () => {
        onClose();
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
        const r = await updateProfileEndpoint(request);
        if (r && r.code == 200) {
            closePopUp();
        }
    };
    return (
        <>
            {isOpen && (
                <>
                    <div
                        className="modal-backdrop fade show"
                        onClick={closePopUp}
                    />

                    <div className="modal d-block fade show" role="dialog">
                        <div
                            className="modal-dialog modal-dialog-centered"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        Editar perfil de riesgo
                                    </h5>
                                    <button
                                        className="btn-close"
                                        onClick={closePopUp}
                                        aria-label="Close"
                                    />
                                </div>
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
