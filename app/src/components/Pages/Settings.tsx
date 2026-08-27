import { useNavigate } from 'react-router-dom';
import ColorModeSetting from '../settings/ColorModeSetting';
import RetakeRiskQuizSetting from '../settings/RetakeRiskQuizSetting';

// Pagina de ajustes con ruta propia (/ajustes) en vez de modal. La idea es
// poder ir sumando mas secciones de configuracion aca adentro sin que Home
// termine cargando con toda esa logica.
function Settings() {
    const navigate = useNavigate();

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

                <ColorModeSetting />
                <RetakeRiskQuizSetting />
            </div>
        </div>
    );
}

export default Settings;
