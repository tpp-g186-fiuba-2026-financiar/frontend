import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePortfolio } from '../data/PortfolioContext';
import { useUi, type Theme } from '../data/UiContext';
import { clearRemoteCache } from '../data/useRemote';
import { Card, CardHead, PageHead, Seg, Tip } from '../ui/Blocks';
import DefaultModelsSettings from '../../components/settings/DefaultModelsSettings';
import ChangePasswordSetting from '../../components/settings/ChangePasswordSetting';
import TwoFactorSetting from '../../components/settings/TwoFactorSetting';
import QuestionariePopUp from '../../components/settings/QuestionariePopUp';

const RISK_LABEL: Record<string, string> = {
    conservative: 'Conservador',
    moderate: 'Moderado',
    aggressive: 'Agresivo',
};

function Setting({
    title,
    desc,
    children,
}: {
    title: ReactNode;
    desc?: string;
    children: ReactNode;
}) {
    return (
        <div className="nx-setting">
            <div>
                <b>{title}</b>
                {desc && <span>{desc}</span>}
            </div>
            {children}
        </div>
    );
}

export default function Ajustes() {
    const ui = useUi();
    const { user, patchUser, refreshModelConfig } = usePortfolio();
    const [quiz, setQuiz] = useState(false);
    const [saved, setSaved] = useState<string | null>(null);
    const risk = user?.risk_profile ?? '';

    // al salir de Ajustes, la cartera vuelve a leer el modelo elegido
    const refresh = useRef(refreshModelConfig);
    useEffect(() => {
        refresh.current = refreshModelConfig;
    });
    useEffect(() => () => refresh.current(), []);

    return (
        <>
            <PageHead
                eyebrow="Ajustes"
                title="Tu FinanciAr"
                sub={`${user?.full_name ?? ''} · perfil ${RISK_LABEL[risk] ?? risk}${user?.is_active ? ' · cuenta verificada' : ''}`}
            />
            <div className="nx-grid">
                <Card span="s6" i={1}>
                    <CardHead title="Apariencia" />
                    <Setting
                        title="Tema"
                        desc="Terminal = verde fósforo con líneas de monitor viejo"
                    >
                        <Seg<Theme>
                            label="Tema"
                            options={[
                                ['dark', 'Oscuro'],
                                ['light', 'Claro'],
                                ['terminal', 'Terminal'],
                            ]}
                            value={ui.theme}
                            onChange={ui.setTheme}
                        />
                    </Setting>
                    <Setting
                        title="Explicaciones"
                        desc='Los recuadros "¿qué estoy viendo?" de cada pantalla'
                    >
                        <button
                            type="button"
                            role="switch"
                            aria-checked={ui.guide}
                            aria-label="Explicaciones"
                            className="nx-switch"
                            onClick={() => ui.setGuide(!ui.guide)}
                        />
                    </Setting>
                    <Setting
                        title="Guía de uso"
                        desc="Un recorrido corto por la app. También está en el botón ? de arriba."
                    >
                        <button
                            type="button"
                            className="nx-btn sm"
                            onClick={() => ui.setTourOpen(true)}
                        >
                            Ver la guía
                        </button>
                    </Setting>
                </Card>
                <Card span="s6" i={2}>
                    <CardHead
                        title="Perfil de inversor"
                        hint="Es el único lugar donde se cambia. Afecta las estimaciones de Rebalanceo y el umbral de las señales."
                    />
                    <Setting
                        title={
                            <>
                                Tu perfil <Tip k="perfil" />
                            </>
                        }
                        desc="Sale del cuestionario de riesgo"
                    >
                        <b className="nx-ink" style={{ fontSize: 18 }}>
                            {RISK_LABEL[risk] ?? '—'}
                        </b>
                    </Setting>
                    <Setting
                        title="Cuestionario de riesgo"
                        desc="Respondé de nuevo si cambió tu situación"
                    >
                        <button
                            type="button"
                            className="nx-btn sm"
                            onClick={() => setQuiz(true)}
                        >
                            Rehacer
                        </button>
                    </Setting>
                    {saved && (
                        <p className="nx-why" role="status">
                            {saved}
                        </p>
                    )}
                </Card>
                <Card span="s6" i={3}>
                    <CardHead
                        title="Modelos por defecto"
                        hint="Qué señal se muestra en la Cartera para cada acción"
                    />
                    <div className="nx-legacy">
                        <DefaultModelsSettings />
                    </div>
                </Card>
                <Card span="s6" i={4}>
                    <CardHead title="Seguridad" />
                    <div className="nx-legacy">
                        <ChangePasswordSetting />
                        <TwoFactorSetting />
                    </div>
                </Card>
            </div>
            <QuestionariePopUp
                isOpen={quiz}
                onClose={() => setQuiz(false)}
                onCompleted={(r) => {
                    patchUser({
                        risk_profile: r,
                        has_to_redo_risk_profile: false,
                    });
                    clearRemoteCache();
                    setSaved(`Perfil actualizado: ${RISK_LABEL[r] ?? r}.`);
                }}
            />
        </>
    );
}
