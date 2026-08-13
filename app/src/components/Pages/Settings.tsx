import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';

// Pagina de ajustes con ruta propia (/ajustes) en vez de modal. La idea es
// poder ir sumando mas secciones de configuracion aca adentro sin que Home
// termine cargando con toda esa logica.
function Settings() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

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

                <div className="settings-row">
                    <div className="settings-row-label">
                        <b>Apariencia</b>
                        <span>
                            {theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}
                        </span>
                    </div>
                    <button
                        type="button"
                        className={`theme-toggle${theme === 'dark' ? ' is-on' : ''}`}
                        onClick={toggleTheme}
                        role="switch"
                        aria-checked={theme === 'dark'}
                        aria-label="Cambiar entre modo claro y oscuro"
                    >
                        <span className="theme-toggle-thumb" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Settings;
