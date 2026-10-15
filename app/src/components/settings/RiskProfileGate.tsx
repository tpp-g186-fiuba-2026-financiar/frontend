import { useEffect, useState } from 'react';
import QuestionariePopUp from './QuestionariePopUp';
import {
    RISK_PROFILE_EVENT,
    type RiskProfileReason,
} from '../../api/authFetch';

const COPY: Record<RiskProfileReason, { title: string; description: string }> =
    {
        expired: {
            title: 'Tu perfil de inversor venció',
            description:
                'El perfil de riesgo tiene una vigencia de un año. Respondé de nuevo el cuestionario para seguir viendo las proyecciones y recomendaciones.',
        },
        required: {
            title: 'Completá tu perfil de inversor',
            description:
                'Necesitamos tu perfil de riesgo para mostrarte las proyecciones y recomendaciones. Respondé el cuestionario para continuar.',
        },
    };

interface RiskProfileGateProps {
    // Motivo ya conocido al cargar (p. ej. desde /user); si no, se abre
    // cuando alguna llamada al back responde que falta el perfil.
    reason?: RiskProfileReason | null;
    onCompleted?: (risk: string) => void;
}

function RiskProfileGate({ reason = null, onCompleted }: RiskProfileGateProps) {
    const [eventReason, setEventReason] = useState<RiskProfileReason | null>(
        null,
    );
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        const handler = (event: Event) => {
            setCompleted(false);
            setEventReason((event as CustomEvent<RiskProfileReason>).detail);
        };
        window.addEventListener(RISK_PROFILE_EVENT, handler);
        return () => window.removeEventListener(RISK_PROFILE_EVENT, handler);
    }, []);

    const activeReason = completed ? null : (eventReason ?? reason);
    if (!activeReason) return null;

    return (
        <QuestionariePopUp
            isOpen={true}
            onClose={() => {
                setCompleted(true);
                setEventReason(null);
            }}
            title={COPY[activeReason].title}
            description={COPY[activeReason].description}
            dismissible={false}
            onCompleted={onCompleted}
        />
    );
}

export default RiskProfileGate;
