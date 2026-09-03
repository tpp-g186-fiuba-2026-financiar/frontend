import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ColorModeSetting from '../settings/ColorModeSetting';
import RetakeRiskQuizSetting from '../settings/RetakeRiskQuizSetting';
import NotificationsSettings from '../settings/NotificationsSettings';

// Pagina de ajustes con ruta propia (/ajustes) en vez de modal. La idea es
// poder ir sumando mas secciones de configuracion aca adentro sin que Home
// termine cargando con toda esa logica.
type SettingsTab = 'general' | 'notificaciones';

function Settings() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

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
                </ul>

                {activeTab === 'general' && (
                    <>
                        <ColorModeSetting />
                        <RetakeRiskQuizSetting />
                    </>
                )}

                {activeTab === 'notificaciones' && <NotificationsSettings />}
            </div>
        </div>
    );
}

export default Settings;
