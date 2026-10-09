import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ColorModeSetting from '../settings/ColorModeSetting';
import RetakeRiskQuizSetting from '../settings/RetakeRiskQuizSetting';
import TwoFactorSetting from '../settings/TwoFactorSetting';
import NotificationsSettings from '../settings/NotificationsSettings';
import DefaultModelsSettings from '../settings/DefaultModelsSettings';
import RiskProfileGate from '../settings/RiskProfileGate';
// import DefaultModelsSettings from '../settings/DefaultModelsSettings';

// Pagina de ajustes con ruta propia (/ajustes) en vez de modal. La idea es
// poder ir sumando mas secciones de configuracion aca adentro sin que Home
// termine cargando con toda esa logica.
type SettingsTab = 'general' | 'notificaciones' | 'modelos predeterminados';

function Settings() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    // Al rehacer el perfil vencido se remonta la seccion para que recargue
    // lo que el back habia rechazado.
    const [profileVersion, setProfileVersion] = useState(0);

    return (
        <div className="container py-4">
            <div className="topbar">
                <button
                    type="button"
                    className="wordmark wordmark-link"
                    onClick={() => navigate('/home')}
                >
                    Financi<span className="accent">Ar</span>
                </button>
            </div>

            <div className="panel settings-page">
                <div className="settings-page-header">
                    <h2 className="mb-0">Ajustes</h2>
                    <button
                        type="button"
                        className="btn btn-outline-theme"
                        onClick={() => navigate('/home')}
                    >
                        ← Volver
                    </button>
                </div>

                <ul className="nav nav-tabs settings-tabs">
                    <li className="nav-item">
                        <button
                            type="button"
                            className={`nav-link${activeTab === 'general' ? ' active' : ''}`}
                            onClick={() => setActiveTab('general')}
                        >
                            General
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            type="button"
                            className={`nav-link${activeTab === 'notificaciones' ? ' active' : ''}`}
                            onClick={() => setActiveTab('notificaciones')}
                        >
                            Notificaciones
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            type="button"
                            className={`nav-link${activeTab === 'modelos predeterminados' ? ' active' : ''}`}
                            onClick={() =>
                                setActiveTab('modelos predeterminados')
                            }
                        >
                            Modelos predeterminados
                        </button>
                    </li>
                </ul>

                {activeTab === 'general' && (
                    <>
                        <ColorModeSetting />
                        <RetakeRiskQuizSetting />
                        <TwoFactorSetting />
                    </>
                )}

                {activeTab === 'notificaciones' && (
                    <NotificationsSettings key={profileVersion} />
                )}
                {activeTab === 'modelos predeterminados' && (
                    <DefaultModelsSettings key={profileVersion} />
                )}
            </div>
            <RiskProfileGate
                onCompleted={() => setProfileVersion((version) => version + 1)}
            />
        </div>
    );
}

export default Settings;
