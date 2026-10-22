import { useState } from 'react';
import type { Question } from './questions';

interface QuestionnaireProps {
    questions: Question[];
    finishQuestionarie: (answers: Record<number, number>) => void;
}

function Questionnaire({ questions, finishQuestionarie }: QuestionnaireProps) {
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});

    const currentQuestion = questions[currentIndex];
    const isLast = currentIndex === questions.length - 1;
    const progress = ((currentIndex + 1) / questions.length) * 100;

    const handleSelect = (score: number) => {
        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: score }));
    };

    const handleNext = () => {
        if (isLast) {
            finishQuestionarie(answers);
        } else {
            setCurrentIndex((prev) => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex((prev) => prev - 1);
        }
    };

    return (
        <div className="modal-body nx-quiz">
            <div className="nx-quiz-top">
                <span>
                    Pregunta {currentIndex + 1} de {questions.length}
                </span>
                <span>Tu perfil de inversor</span>
            </div>
            <div className="nx-quiz-bar" aria-hidden="true">
                <i style={{ width: `${progress}%` }} />
            </div>
            <h5 className="nx-quiz-q">{currentQuestion.text}</h5>

            <div className="nx-quiz-opts" role="radiogroup" aria-label={currentQuestion.text}>
                {currentQuestion.options.map((option) => {
                    const selected = answers[currentQuestion.id] === option.score;
                    return (
                        <button
                            key={option.text}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            className={`nx-quiz-opt ${selected ? 'on' : ''}`}
                            onClick={() => handleSelect(option.score)}
                        >
                            <span className="nx-quiz-radio" />
                            {option.text}
                        </button>
                    );
                })}
            </div>

            <div className="nx-quiz-nav">
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                >
                    Anterior
                </button>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleNext}
                    disabled={answers[currentQuestion.id] === undefined}
                >
                    {isLast ? 'Finalizar' : 'Siguiente'}
                </button>
            </div>
        </div>
    );
}

export default Questionnaire;
