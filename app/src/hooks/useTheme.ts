import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function readStoredTheme(): Theme {
    if (typeof window === 'undefined') return 'light';
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'dark' ? 'dark' : 'light';
}

// Antes el estado del tema vivia solo en Home. Ahora que Ajustes es su
// propia ruta, lo sacamos a un hook para que ambas paginas lean/escriban
// el mismo localStorage y apliquen el mismo atributo en <html>, sin
// depender de que el usuario haya pasado por Home primero.
export function useTheme() {
    const [theme, setTheme] = useState<Theme>(readStoredTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        window.localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
    };

    return { theme, toggleTheme };
}
