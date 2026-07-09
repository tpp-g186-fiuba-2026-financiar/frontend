import { useState } from 'react';
import type { Question } from './questions';

interface QuestionnaireProps {
    questions: Question[];
    handleSubmit: (answers: Record<number, number>) => void;
}

function Questionnaire({ questions, handleSubmit }: QuestionnaireProps) {
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});

    const currentQuestion = questions[currentIndex];
    const isLast = currentIndex === questions.length - 1;

    const handleSelect = (score: number) => {
        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: score }));
    };

    const handleNext = () => {
        if (isLast) {
            handleSubmit(answers);
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
        <div>
            <p className="text-secondary mb-1">
                Pregunta {currentIndex + 1} de {questions.length}
            </p>
            <h5 className="mb-3">{currentQuestion.text}</h5>

            <div className="d-flex flex-column gap-2 mb-4">
                {currentQuestion.options.map((option) => (
                    <button
                        key={option.text}
                        className={`btn ${answers[currentQuestion.id] === option.score ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => handleSelect(option.score)}
                    >
                        {option.text}
                    </button>
                ))}
            </div>

            <div className="d-flex justify-content-end gap-3">
                <button
                    className="btn btn-secondary"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                >
                    Previous
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handleNext}
                    disabled={answers[currentQuestion.id] === undefined}
                >
                    {isLast ? 'Finish' : 'Next'}
                </button>
            </div>
        </div>
    );
}

export default Questionnaire;
