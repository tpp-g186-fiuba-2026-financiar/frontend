import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

// Preferencias de interfaz del shell: tema, guía de explicaciones y vista de
// administrador. El tema se guarda en la misma clave que usaba useTheme para
// no perder la elección de los usuarios actuales.

export type Theme = 'dark' | 'light' | 'terminal';

interface UiState {
    theme: Theme;
    setTheme: (t: Theme) => void;
    guide: boolean;
    setGuide: (on: boolean) => void;
    adminView: boolean;
    setAdminView: (on: boolean) => void;
    tourOpen: boolean;
    setTourOpen: (on: boolean) => void;
    builderOpen: boolean;
    setBuilderOpen: (on: boolean) => void;
}

const UiContext = createContext<UiState | null>(null);

function read<T extends string>(
    key: string,
    allowed: readonly T[],
    fallback: T,
): T {
    try {
        const v = window.localStorage.getItem(key);
        return (allowed as readonly string[]).includes(v ?? '')
            ? (v as T)
            : fallback;
    } catch {
        return fallback;
    }
}

export function UiProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() =>
        read('theme', ['dark', 'light', 'terminal'] as const, 'dark'),
    );
    const [guide, setGuide] = useState<boolean>(
        () => read('guide', ['on', 'off'] as const, 'on') === 'on',
    );
    const [adminView, setAdminView] = useState(false);
    const [tourOpen, setTourOpen] = useState(false);
    const [builderOpen, setBuilderOpen] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            window.localStorage.setItem('theme', theme);
        } catch {
            /* modo privado: el tema vale solo para esta sesión */
        }
    }, [theme]);

    useEffect(() => {
        try {
            window.localStorage.setItem('guide', guide ? 'on' : 'off');
        } catch {
            /* idem */
        }
    }, [guide]);

    const value = useMemo(
        () => ({
            theme,
            setTheme,
            guide,
            setGuide,
            adminView,
            setAdminView,
            tourOpen,
            setTourOpen,
            builderOpen,
            setBuilderOpen,
        }),
        [theme, guide, adminView, tourOpen, builderOpen],
    );
    return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUi(): UiState {
    const ctx = useContext(UiContext);
    if (!ctx) throw new Error('useUi debe usarse dentro de UiProvider');
    return ctx;
}
