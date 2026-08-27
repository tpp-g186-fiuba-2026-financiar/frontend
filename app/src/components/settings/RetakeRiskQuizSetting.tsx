import { useState } from 'react';
import QuestionariePopUp from './QuestionariePopUp';

function RetakeRiskQuizSetting() {
    const [isQuestionarieOpen, setIsQuestionarieOpen] =
        useState<boolean>(false);
    return (
        <>
            <div className="settings-row">
                <div className="settings-row-label">
                    <b>Editar perfil de riesgo</b>
                </div>
                <button
                    type="button"
                    className="btn btn-outline-theme"
                    onClick={() => setIsQuestionarieOpen(true)}
                >
                    Realizar cuestionario
                </button>
            </div>
            <QuestionariePopUp
                isOpen={isQuestionarieOpen}
                onClose={() => setIsQuestionarieOpen(false)}
            />
        </>
    );
}
export default RetakeRiskQuizSetting;
