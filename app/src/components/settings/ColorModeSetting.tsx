import { useTheme } from '../../hooks/useTheme';

function ColorModeSetting() {
    const { theme, toggleTheme } = useTheme();
    return (
        <div className="settings-row">
            <div className="settings-row-label">
                <b>Apariencia</b>
                <span>{theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}</span>
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
    );
}
export default ColorModeSetting;
