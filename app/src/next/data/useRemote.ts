import { useEffect, useState } from 'react';

// Carga un recurso una vez y lo comparte entre páginas (caché en memoria por
// clave). Si falla, `error` queda en true y la página muestra un estado vacío.

const cache = new Map<string, unknown>();

export function clearRemoteCache() {
    cache.clear();
}

// Olvida un recurso para que la próxima pantalla lo vuelva a pedir.
export function forgetRemote(key: string) {
    cache.delete(key);
}

export function useRemote<T>(key: string | null, load: () => Promise<T>) {
    const [, setVersion] = useState(0);
    const [errorKey, setErrorKey] = useState<string | null>(null);

    useEffect(() => {
        if (!key || cache.has(key)) return;
        let cancelled = false;
        load().then(
            (data) => {
                cache.set(key, data);
                if (!cancelled) setVersion((v) => v + 1);
            },
            () => {
                if (!cancelled) setErrorKey(key);
            },
        );
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const data = key && cache.has(key) ? (cache.get(key) as T) : null;
    const error = !!key && data == null && errorKey === key;
    return { data, error, loading: !!key && data == null && !error };
}
